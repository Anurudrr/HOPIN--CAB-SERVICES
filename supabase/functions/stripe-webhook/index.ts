import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.0.0"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { logEvent } from "../_shared/observability.ts"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    await logEvent(supabase, "stripe_webhook_received", {
      event_type: event.type,
      event_id: event.id,
    })

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSucceeded(supabase, intent)
        break
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(supabase, intent)
        break
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(supabase, charge)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("stripe-webhook error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  const paymentIntentId = session.payment_intent as string

  if (!bookingId) return

  const { data: paymentIntent } = await supabase
    .from("payment_intents")
    .select("id, amount_cents")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()

  if (paymentIntent) {
    await supabase
      .from("payment_intents")
      .update({
        status: "succeeded",
        payment_method_id: session.payment_method as string,
        payment_method_type: "card",
        updated_at: new Date().toISOString(),
        succeeded_at: new Date().toISOString(),
      })
      .eq("id", paymentIntent.id)
  }

  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  await supabase.from("transactions").insert({
    booking_id: bookingId,
    user_id: session.metadata?.user_id,
    amount: (paymentIntent?.amount_cents ?? 0) / 100,
    platform_fee: 0,
    tax_amount: 0,
    payment_method: "card",
    status: "paid",
    receipt_url: session.receipt_url,
  })

  await supabase.from("notifications").insert({
    receiver_id: session.metadata?.user_id,
    title: "Payment successful",
    body: `Your booking ${bookingId.slice(0, 8)} has been confirmed.`,
    kind: "payment",
    metadata: { booking_id: bookingId, payment_intent_id: paymentIntentId },
  })

  await logEvent(supabase, "payment_succeeded", { booking_id: bookingId, payment_intent_id: paymentIntentId })
}

async function handlePaymentSucceeded(supabase: any, intent: Stripe.PaymentIntent) {
  const { data: paymentIntent } = await supabase
    .from("payment_intents")
    .select("id, booking_id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle()

  if (paymentIntent) {
    await supabase
      .from("payment_intents")
      .update({
        status: "succeeded",
        payment_method_id: intent.payment_method as string,
        payment_method_type: "card",
        updated_at: new Date().toISOString(),
        succeeded_at: new Date().toISOString(),
      })
      .eq("id", paymentIntent.id)
  }
}

async function handlePaymentFailed(supabase: any, intent: Stripe.PaymentIntent) {
  const { data: paymentIntent } = await supabase
    .from("payment_intents")
    .select("id, booking_id, user_id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle()

  if (paymentIntent) {
    await supabase
      .from("payment_intents")
      .update({
        status: "failed",
        error_message: intent.last_payment_error?.message ?? "Payment failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentIntent.id)

    if (paymentIntent.user_id) {
      await supabase.from("notifications").insert({
        receiver_id: paymentIntent.user_id,
        title: "Payment failed",
        body: `Your payment for booking ${paymentIntent.booking_id?.slice(0, 8)} could not be processed.`,
        kind: "payment",
        metadata: { booking_id: paymentIntent.booking_id, error: intent.last_payment_error?.message },
      })
    }
  }
}

async function handleRefund(supabase: any, charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string
  const { data: paymentIntent } = await supabase
    .from("payment_intents")
    .select("id, booking_id, user_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()

  if (paymentIntent) {
    await supabase
      .from("payment_intents")
      .update({
        status: "refunded",
        updated_at: new Date().toISOString(),
        refunded_at: new Date().toISOString(),
      })
      .eq("id", paymentIntent.id)

    await supabase
      .from("transactions")
      .update({ status: "refunded" })
      .eq("booking_id", paymentIntent.booking_id)
      .eq("status", "paid")

    if (paymentIntent.user_id) {
      await supabase.from("notifications").insert({
        receiver_id: paymentIntent.user_id,
        title: "Refund processed",
        body: `Your payment for booking ${paymentIntent.booking_id?.slice(0, 8)} has been refunded.`,
        kind: "payment",
        metadata: { booking_id: paymentIntent.booking_id, refund_amount: charge.amount_refunded / 100 },
      })
    }
  }
}