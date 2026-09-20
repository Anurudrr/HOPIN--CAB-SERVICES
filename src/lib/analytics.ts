import { isFeatureEnabled } from "./platformApi";
import env from "./env";

type AnalyticsProvider = "mixpanel" | "amplitude" | "custom";

interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  userId?: string
  timestamp?: number
}

class Analytics {
  private initialized = false
  private provider: AnalyticsProvider = "custom"
  private mixpanelToken: string | null = null
  private amplitudeApiKey: string | null = null
  private customEndpoint: string | null = null
  private queue: AnalyticsEvent[] = []
  private userId: string | null = null
  private superProperties: Record<string, unknown> = {}

  init(config: {
    provider?: AnalyticsProvider
    mixpanelToken?: string
    amplitudeApiKey?: string
    customEndpoint?: string
  }) {
    if (this.initialized) return

    this.provider = config.provider ?? "custom"
    this.mixpanelToken = config.mixpanelToken ?? env.MIXPANEL_TOKEN ?? null
    this.amplitudeApiKey = config.amplitudeApiKey ?? env.AMPLITUDE_API_KEY ?? null
    this.customEndpoint = config.customEndpoint ?? env.ANALYTICS_ENDPOINT ?? null

    if (typeof window !== "undefined") {
      this.loadProviderScript()
    }

    this.initialized = true
    this.flushQueue()
  }

  private loadProviderScript() {
    if (this.provider === "mixpanel" && this.mixpanelToken) {
      const script = document.createElement("script")
      script.src = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"
      script.async = true
      script.onload = () => {
        if (window.mixpanel) {
          window.mixpanel.init(this.mixpanelToken!, { debug: env.NODE_ENV === "development" })
          this.flushQueue()
        }
      }
      document.head.appendChild(script)
    } else if (this.provider === "amplitude" && this.amplitudeApiKey) {
      const script = document.createElement("script")
      script.src = "https://cdn.amplitude.com/libs/analytics-browser-2.0.0-min.js.gz"
      script.async = true
      script.onload = () => {
        if (window.amplitude) {
          window.amplitude.init(this.amplitudeApiKey!, { defaultTracking: false })
          this.flushQueue()
        }
      }
      document.head.appendChild(script)
    }
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    this.userId = userId
    this.setSuperProperties({ user_id: userId, ...traits })

    if (this.provider === "mixpanel" && window.mixpanel) {
      window.mixpanel.identify(userId)
      if (traits) window.mixpanel.people.set(traits)
    } else if (this.provider === "amplitude" && window.amplitude) {
      window.amplitude.setUserId(userId)
      if (traits) window.amplitude.setUserProperties(traits)
    }
  }

  setSuperProperties(props: Record<string, unknown>) {
    this.superProperties = { ...this.superProperties, ...props }
  }

  track(event: string, properties?: Record<string, unknown>) {
    const payload: AnalyticsEvent = {
      event,
      properties: { ...this.superProperties, ...properties },
      userId: this.userId,
      timestamp: Date.now(),
    }

    if (!this.initialized) {
      this.queue.push(payload)
      return
    }

    this.sendEvent(payload)
  }

  page(viewName: string, properties?: Record<string, unknown>) {
    this.track("$pageview", { page: viewName, ...properties })
  }

  private sendEvent(payload: AnalyticsEvent) {
    const { event, properties, userId } = payload

    if (this.provider === "mixpanel" && window.mixpanel) {
      window.mixpanel.track(event, properties)
    } else if (this.provider === "amplitude" && window.amplitude) {
      window.amplitude.track(event, properties)
    } else if (this.customEndpoint) {
      fetch(this.customEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [payload] }),
        keepalive: true,
      }).catch(console.error)
    }

    if (env.NODE_ENV === "development") {
      console.log("[Analytics]", event, properties)
    }
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      this.sendEvent(this.queue.shift()!)
    }
  }

  reset() {
    this.userId = null
    this.superProperties = {}
    if (this.provider === "mixpanel" && window.mixpanel) {
      window.mixpanel.reset()
    } else if (this.provider === "amplitude" && window.amplitude) {
      window.amplitude.setUserId(null)
      window.amplitude.clearUserProperties()
    }
  }
}

export const analytics = new Analytics()

export function initAnalytics(userId?: string) {
  const provider = (env.ANALYTICS_PROVIDER as AnalyticsProvider) ?? "custom"
  
  analytics.init({
    provider,
    mixpanelToken: env.MIXPANEL_TOKEN,
    amplitudeApiKey: env.AMPLITUDE_API_KEY,
    customEndpoint: env.ANALYTICS_ENDPOINT,
  })

  if (userId) {
    analytics.identify(userId)
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).VITE_ENABLE_ANALYTICS === "true") {
    analytics.track(event, properties)
  }
}

export function trackPageView(page: string, properties?: Record<string, unknown>) {
  trackEvent("$pageview", { page, ...properties })
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  analytics.identify(userId, traits)
}

export function resetAnalytics() {
  analytics.reset()
}

export const Events = {
  SIGN_UP: "sign_up",
  LOGIN: "login",
  LOGOUT: "logout",
  BOOKING_STARTED: "booking_started",
  BOOKING_COMPLETED: "booking_completed",
  BOOKING_CANCELLED: "booking_cancelled",
  RIDE_REQUESTED: "ride_requested",
  RIDE_MATCHED: "ride_matched",
  RIDE_STARTED: "ride_started",
  RIDE_COMPLETED: "ride_completed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
  PAYMENT_FAILED: "payment_failed",
  DRIVER_APPLICATION_STARTED: "driver_application_started",
  DRIVER_APPLICATION_SUBMITTED: "driver_application_submitted",
  DRIVER_APPROVED: "driver_approved",
  RIDE_PUBLISHED: "ride_published",
  SOS_TRIGGERED: "sos_triggered",
  TRIP_SHARED: "trip_shared",
  REFERRAL_USED: "referral_used",
  PROMO_APPLIED: "promo_applied",
  SCHEDULED_RIDE_CREATED: "scheduled_ride_created",
  MULTI_STOP_ADDED: "multi_stop_added",
  FEATURE_FLAG_EVALUATED: "feature_flag_evaluated",
} as const

export type EventName = typeof Events[keyof typeof Events]

declare global {
  interface Window {
    mixpanel: any
    amplitude: any
    VITE_ENABLE_ANALYTICS: string
  }
}