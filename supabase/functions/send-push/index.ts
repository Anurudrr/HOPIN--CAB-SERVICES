import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/http.ts"
import { logEvent } from "../_shared/observability.ts"

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@hopin.app"

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(vapidPrivateKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const audience = new URL(subscription.endpoint).origin
  const expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60

  const token = {
    aud: audience,
    exp: expires,
    sub: vapidSubject,
  }

  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  const claims = btoa(JSON.stringify(token))
  const signature = await crypto.subtle.sign("ES256", key, encoder.encode(`${header}.${claims}`))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))

  const authHeader = `vapid t=${header}.${claims}.${signatureB64}, k=${vapidPublicKey}`

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(subscription.p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  )

  const authKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(subscription.auth),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const prk = await crypto.subtle.deriveBits(
    { name: "ECDH", public: cryptoKey },
    encoder.encode(subscription.p256dh),
    256
  )

  const ikm = encoder.encode(`WebPush: salt=${btoa(String.fromCharCode(...salt))}`)
  const contentEncryptionKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: ikm, length: 256 },
    encoder.encode(prk),
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt"]
  )

  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encodedPayload = encoder.encode(payload)
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentEncryptionKey,
    encodedPayload
  )

  const body = new Uint8Array(encrypted)
  const headers = new Headers()
  headers.set("Content-Type", "application/octet-stream")
  headers.set("Content-Encoding", "aes128gcm")
  headers.set("Authorization", authHeader)
  headers.set("Crypto-Key", `key=${vapidPublicKey}; salt=${btoa(String.fromCharCode(...salt))}`)
  headers.set("TTL", "86400")

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body,
    })
    return response.ok
  } catch {
    return false
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = await req.json()
    const { user_id, template_key, data = {} } = body

    if (!user_id || !template_key) {
      return new Response(JSON.stringify({ error: "user_id and template_key are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: template, error: templateError } = await supabase
      .from("notification_templates")
      .select("title, body")
      .eq("key", template_key)
      .single()

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id)

    if (subError) {
      throw subError
    }

    let sentCount = 0

    for (const sub of subscriptions ?? []) {
      const title = template.title.replace(/{{\s*(\w+)\s*}}/g, (_, key) => data[key] ?? "")
      const body_text = template.body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => data[key] ?? "")

      const payload = JSON.stringify({
        title,
        body: body_text,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        data: { ...data, template: template_key },
        actions: [
          { action: "open", title: "Open" },
          { action: "dismiss", title: "Dismiss" },
        ],
      })

      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      )

      if (success) sentCount++

      await supabase.from("notifications").insert({
        receiver_id: user_id,
        title,
        body: body_text,
        kind: "system",
        metadata: { push: true, template: template_key, data },
      })
    }

    await logEvent(supabase, "push_notifications_sent", { user_id, template_key, sentCount })

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("send-push error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})