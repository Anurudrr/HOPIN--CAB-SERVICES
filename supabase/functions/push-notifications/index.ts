import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabase } = await verifyAuth(req)
    const body = await req.json()

    if (req.method === "POST" && body.endpoint) {
      const subscription = body as PushSubscription

      const rateLimitResult = await rateLimit(supabase, user.id, "push-subscribe", 5, 60)
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: req.headers.get("user-agent") ?? "",
        }, {
          onConflict: "user_id,endpoint",
        })

      if (error) {
        throw error
      }

      await logEvent(supabase, "push_subscription_created", { user_id: user.id })

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "DELETE" && body.endpoint) {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", body.endpoint)

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ subscriptions: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("push-notifications error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})