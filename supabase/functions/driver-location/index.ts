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

    const { lat, lng, heading, speed_kmh, accuracy_meters, ride_id, is_online = true } = body

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rateLimitResult = await rateLimit(supabase, user.id, "driver-location", 30, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: locationId, error } = await supabase.rpc("upsert_driver_location", {
      p_driver_id: user.id,
      p_ride_id: ride_id ?? null,
      p_lat: lat,
      p_lng: lng,
      p_heading: heading ?? null,
      p_speed_kmh: speed_kmh ?? null,
      p_accuracy_meters: accuracy_meters ?? null,
      p_is_online: is_online,
    })

    if (error) {
      await logEvent(supabase, "driver_location_error", { user_id: user.id, error: error.message })
      throw error
    }

    await logEvent(supabase, "driver_location_updated", {
      user_id: user.id,
      ride_id: ride_id ?? null,
      lat,
      lng,
    })

    return new Response(JSON.stringify({ success: true, location_id: locationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("driver-location error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})