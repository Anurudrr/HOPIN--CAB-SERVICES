import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? ""
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? ""
const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@hopin.app"
const fromName = Deno.env.get("FROM_NAME") ?? "HopIn"

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resendApiKey) {
    return { success: false, error: "Resend not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message ?? "Resend error" }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

async function sendViaSendGrid(to: string, subject: string, html: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!sendgridApiKey) {
    return { success: false, error: "SendGrid not configured" }
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject,
        }],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.errors?.[0]?.message ?? "SendGrid error" }
    }

    const messageId = response.headers.get("X-Message-Id") ?? ""
    return { success: true, messageId }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabase } = await verifyAuth(req)
    const body = await req.json()

    const { template_key, to, variables = {}, user_id } = body

    if (!template_key || !to) {
      return new Response(JSON.stringify({ error: "template_key and to are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const targetUserId = user_id ?? user.id

    const rateLimitResult = await rateLimit(supabase, targetUserId, "send-email", 20, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("subject, html_content, text_content")
      .eq("key", template_key)
      .eq("is_active", true)
      .single()

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const subject = renderTemplate(template.subject, variables)
    const html = renderTemplate(template.html_content, variables)
    const text = template.text_content ? renderTemplate(template.text_content, variables) : ""

    let result: { success: boolean; messageId?: string; error?: string }

    if (resendApiKey) {
      result = await sendViaResend(to, subject, html, text)
    } else if (sendgridApiKey) {
      result = await sendViaSendGrid(to, subject, html, text)
    } else {
      result = { success: false, error: "No email provider configured" }
    }

    await supabase.rpc("log_email", {
      p_user_id: targetUserId,
      p_template_key: template_key,
      p_to_email: to,
      p_subject: subject,
      p_status: result.success ? "sent" : "failed",
      p_provider: resendApiKey ? "resend" : "sendgrid",
      p_provider_message_id: result.messageId ?? null,
      p_error_message: result.error ?? null,
    })

    await logEvent(supabase, "email_sent", {
      user_id: targetUserId,
      template_key,
      to,
      success: result.success,
      provider: resendApiKey ? "resend" : "sendgrid",
    })

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error ?? "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, message_id: result.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("send-email error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})