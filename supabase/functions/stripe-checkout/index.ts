import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.0.0"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { verifyAuth } from "../_shared/auth.ts"
import { rateLimit } from "../_shared/rateLimit.ts"
import { logEvent } from "../_shared/observability.ts"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
})

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { user, supabase } = await verifyAuth(req)
    const body = await req.json()

    const { booking_id, amount_cents, currency = "inr", success_url, cancel_url, metadata = {} } = body

    if (!booking_id || !amount_cents) {
      return new Response(JSON.stringify({ error: "booking_id and amount_cents are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rateLimitResult = await rateLimit(supabase, user.id, "stripe-checkout", 10, 60)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, rider:profiles!bookings_rider_id_fkey(email, full_name)")
      .eq("id", booking_id)
      .eq("rider_id", user.id)
      .single()

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (booking.status === "completed" || booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Booking cannot be paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: existingIntent } = await supabase
      .from("payment_intents")
      .select("stripe_payment_intent_id, status")
      .eq("booking_id", booking_id)
      .eq("user_id", user.id)
      .in("status", ["created", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let stripeIntentId: string

    if (existingIntent?.stripe_payment_intent_id && !existingIntent.stripe_payment_intent_id.startsWith("pi_pending_")) {
      stripeIntentId = existingIntent.stripe_payment_intent_id
    } else {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          booking_id,
          user_id: user.id,
          rider_email: booking.rider?.email ?? "",
          ...metadata,
        },
        receipt_email: booking.rider?.email,
      })

      stripeIntentId = paymentIntent.id

      if (existingIntent) {
        await supabase
          .from("payment_intents")
          .update({
            stripe_payment_intent_id: stripeIntentId,
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingIntent.id)
      } else {
        await supabase.rpc("create_payment_intent", {
          p_user_id: user.id,
          p_booking_id: booking_id,
          p_amount_cents: amount_cents,
          p_currency: currency,
          p_metadata: { booking_id, user_id: user.id, ...metadata },
        })
        await supabase.rpc("link_stripe_payment_intent", {
          p_local_id: (await supabase.from("payment_intents").select("id").eq("booking_id", booking_id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single()).data?.id,
          p_stripe_intent_id: stripeIntentId,
        })
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          booking_id,
          user_id: user.id,
          ...metadata,
        },
      },
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `HopIn Booking - ${booking.service?.name ?? "Ride"}`,
              description: `${booking.pickup_address} → ${booking.dest_address}`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: success_url ?? `${new URL(req.url).origin}/dashboard?payment=success&booking=${booking_id}`,
      cancel_url: cancel_url ?? `${new URL(req.url).origin}/dashboard?payment=cancelled&booking=${booking_id}`,
      customer_email: booking.rider?.email,
      metadata: {
        booking_id,
        user_id: user.id,
        stripe_payment_intent_id: stripeIntentId,
        ...metadata,
      },
    })

    await logEvent(supabase, "stripe_checkout_created", {
      user_id: user.id,
      booking_id,
      session_id: session.id,
      payment_intent_id: stripeIntentId,
    })

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      url: session.url,
      payment_intent_id: stripeIntentId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("stripe-checkout error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})