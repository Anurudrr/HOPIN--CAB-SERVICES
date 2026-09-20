import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

interface RideRequestInput {
  city: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dest_address: string
  dest_lat: number
  dest_lng: number
  service_id?: string | null
  seats_requested: number
  max_fare_per_seat?: number | null
  max_wait_minutes?: number
  preferred_departure?: string | null
  latest_departure?: string | null
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabase } = await verifyAuth(req)

    if (req.method === "POST") {
      const body: RideRequestInput = await req.json()

      const {
        city,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dest_address,
        dest_lat,
        dest_lng,
        service_id,
        seats_requested = 1,
        max_fare_per_seat,
        max_wait_minutes = 10,
        preferred_departure,
        latest_departure,
      } = body

      if (!city || !pickup_address || typeof pickup_lat !== "number" || typeof pickup_lng !== "number" ||
          !dest_address || typeof dest_lat !== "number" || typeof dest_lng !== "number") {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const rateLimitResult = await rateLimit(supabase, user.id, "ride-request", 20, 60)
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

      const { data: requestId, error } = await supabase.rpc("create_ride_request", {
        p_rider_id: user.id,
        p_city: city,
        p_pickup_address: pickup_address,
        p_pickup_lat: pickup_lat,
        p_pickup_lng: pickup_lng,
        p_dest_address: dest_address,
        p_dest_lat: dest_lat,
        p_dest_lng: dest_lng,
        p_service_id: service_id ?? null,
        p_seats_requested: seats_requested,
        p_max_fare_per_seat: max_fare_per_seat ?? null,
        p_max_wait_minutes: max_wait_minutes,
        p_preferred_departure: preferred_departure ?? new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        p_latest_departure: latest_departure ?? new Date(now.getTime() + (max_wait_minutes + 5) * 60 * 1000).toISOString(),
      })

      if (error) {
        await logEvent(supabase, "ride_request_create_error", { user_id: user.id, error: error.message })
        throw error
      }

      await logEvent(supabase, "ride_request_created", {
        user_id: user.id,
        request_id: requestId,
        city,
        seats_requested,
      })

      return new Response(JSON.stringify({
        success: true,
        request_id: requestId,
        expires_at: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "GET") {
      const url = new URL(req.url)
      const requestId = url.searchParams.get("request_id")

      if (!requestId) {
        return new Response(JSON.stringify({ error: "request_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: request, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", requestId)
        .eq("rider_id", user.id)
        .single()

      if (error) {
        throw error
      }

      if (request.status === "searching") {
        const { data: matchData } = await supabase.rpc("match_ride_request", {
          p_request_id: requestId,
        })

        if (matchData) {
          const { data: updatedRequest } = await supabase
            .from("ride_requests")
            .select("*")
            .eq("id", requestId)
            .single()

          return new Response(JSON.stringify({
            status: "matched",
            matched: true,
            ride_id: matchData,
            request: updatedRequest,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

      return new Response(JSON.stringify({
        status: request.status,
        matched: request.status === "matched" || request.status === "confirmed",
        ride_id: request.matched_ride_id,
        request,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url)
      const requestId = url.searchParams.get("request_id")

      if (!requestId) {
        return new Response(JSON.stringify({ error: "request_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
        .eq("rider_id", user.id)
        .in("status", ["searching", "matched"])

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("ride-pooling error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})