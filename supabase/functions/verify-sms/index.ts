import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? ""
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? ""
const twilioVerifySid = Deno.env.get("TWILIO_VERIFY_SID") ?? ""

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

    const { phone, code, purpose = "verify", use_twilio_verify = false } = body

    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Phone and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rateLimitResult = await rateLimit(supabase, user.id, "verify-sms", 10, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let verified = false

    if (use_twilio_verify && twilioVerifySid) {
      const result = await checkTwilioVerify(phone, code)
      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      verified = result.valid ?? false
    } else {
      const { data, error } = await supabase.rpc("verify_phone_code", {
        p_user_id: user.id,
        p_phone: phone,
        p_code: code,
        p_purpose: purpose,
      })

      if (error) {
        throw error
      }
      verified = data ?? false
    }

    await logEvent(supabase, "sms_verified", {
      user_id: user.id,
      phone,
      purpose,
      provider: use_twilio_verify ? "twilio_verify" : "custom",
      verified,
    })

    if (!verified) {
      return new Response(JSON.stringify({ 
        success: false, 
        verified: false, 
        error: "Invalid or expired code" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (purpose === "verify" || purpose === "login") {
      await supabase
        .from("profiles")
        .update({ 
          is_phone_verified: true,
          phone: phone,
        })
        .eq("id", user.id)
    }

    return new Response(JSON.stringify({ success: true, verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("verify-sms error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})