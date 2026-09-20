import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabase } = await verifyAuth(req)
    const body = await req.json()

    const { lat, lng, radius_km = 5, limit = 20 } = body

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rateLimitResult = await rateLimit(supabase, user.id, "nearby-drivers", 10, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: drivers, error } = await supabase.rpc("get_nearby_drivers", {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius_km,
      p_limit: limit,
    })

    if (error) {
      await logEvent(supabase, "nearby_drivers_error", { user_id: user.id, error: error.message })
      throw error
    }

    await logEvent(supabase, "nearby_drivers_queried", {
      user_id: user.id,
      lat,
      lng,
      count: drivers?.length ?? 0,
    })

    return new Response(JSON.stringify({ drivers: drivers ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("nearby-drivers error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})