import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? ""
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? ""
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? ""
const twilioVerifySid = Deno.env.get("TWILIO_VERIFY_SID") ?? ""

async function sendTwilioSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { success: false, error: "Twilio not configured" }
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
  
  const params = new URLSearchParams()
  params.append("To", to)
  params.append("From", twilioPhoneNumber)
  params.append("Body", body)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message ?? "Twilio error" }
    }

    return { success: true, sid: data.sid }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

async function sendTwilioVerify(to: string, channel: "sms" | "call" = "sms"): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    return { success: false, error: "Twilio Verify not configured" }
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
  const url = `https://verify.twilio.com/v2/Services/${twilioVerifySid}/Verifications`
  
  const params = new URLSearchParams()
  params.append("To", to)
  params.append("Channel", channel)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message ?? "Twilio Verify error" }
    }

    return { success: true, sid: data.sid }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

async function checkTwilioVerify(to: string, code: string): Promise<{ success: boolean; valid?: boolean; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioVerifySid) {
    return { success: false, error: "Twilio Verify not configured" }
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
  const url = `https://verify.twilio.com/v2/Services/${twilioVerifySid}/VerificationCheck`
  
  const params = new URLSearchParams()
  params.append("To", to)
  params.append("Code", code)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.message ?? "Twilio Verify error" }
    }

    return { success: true, valid: data.status === "approved" }
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

    const { phone, purpose = "verify", use_twilio_verify = false, channel = "sms" } = body

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rateLimitResult = await rateLimit(supabase, user.id, "send-sms", 5, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let result: { success: boolean; sid?: string; error?: string }

    if (use_twilio_verify && twilioVerifySid) {
      result = await sendTwilioVerify(phone, channel)
    } else {
      const code = await supabase.rpc("send_phone_verification", {
        p_user_id: user.id,
        p_phone: phone,
        p_purpose: purpose,
      })

      if (code.error) {
        throw code.error
      }

      const message = `Your HopIn verification code is: ${code.data}. Valid for 10 minutes.`
      result = await sendTwilioSms(phone, message)
    }

    await logEvent(supabase, "sms_sent", {
      user_id: user.id,
      phone,
      purpose,
      provider: use_twilio_verify ? "twilio_verify" : "twilio_sms",
      success: result.success,
    })

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error ?? "Failed to send SMS" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, provider: use_twilio_verify ? "twilio_verify" : "twilio_sms" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("send-sms error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})