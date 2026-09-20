import { supabase } from "./supabase";
import { getErrorMessage, logDevError, mapApiErrorMessage } from "./errors";
import type {
  AdminDashboardData,
  Booking,
  BookingReceipt,
  ChatMessage,
  DriverLocation,
  NotificationItem,
  PaymentIntent,
  Profile,
  Provider,
  ProviderAvailabilityStatus,
  Review,
  RideRequest,
  SavedLocation,
  Service,
  Transaction,
} from "../types";

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

const activeBookingStatuses: Booking["status"][] = [
  "pending",
  "accepted",
  "arriving",
  "ongoing",
  "confirmed",
  "in_progress",
];

const serviceSelect = "*";
const providerSelect = `
  *,
  profile:profiles(id,full_name,avatar_url,city)
`;
const bookingSelect = `
  *,
  service:services(*),
  provider:providers(
    *,
    profile:profiles(id,full_name,avatar_url,city)
  ),
  rider:profiles!bookings_rider_id_fkey(id,full_name,avatar_url,phone)
`;

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  return user.id;
}

export async function getServiceCatalog(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select(serviceSelect)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    logDevError("platform.getServiceCatalog", error);
    throw new Error(mapApiErrorMessage(error, "loading services"));
  }

  return (data ?? []) as Service[];
}

export async function getSavedLocations(): Promise<SavedLocation[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("saved_locations")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as SavedLocation[];
  } catch (error) {
    logDevError("platform.getSavedLocations", error);
    throw new Error(getErrorMessage(error, "Could not load saved locations."));
  }
}

export async function saveLocation(input: Omit<SavedLocation, "id" | "created_at" | "user_id">) {
  try {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("saved_locations")
      .insert({
        user_id: userId,
        label: input.label,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        is_default: input.is_default,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as SavedLocation;
  } catch (error) {
    logDevError("platform.saveLocation", error);
    throw new Error(getErrorMessage(error, "Could not save that location."));
  }
}

export async function deleteSavedLocation(locationId: string) {
  try {
    const { error } = await supabase.from("saved_locations").delete().eq("id", locationId);

    if (error) {
      throw error;
    }
  } catch (error) {
    logDevError("platform.deleteSavedLocation", error);
    throw new Error(getErrorMessage(error, "Could not remove that saved location."));
  }
}

export async function getNotifications(limit = 20): Promise<NotificationItem[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as NotificationItem[];
  } catch (error) {
    logDevError("platform.getNotifications", error);
    throw new Error(getErrorMessage(error, "Could not load notifications."));
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    if (error) {
      throw error;
    }
  } catch (error) {
    logDevError("platform.markNotificationRead", error);
    throw new Error(getErrorMessage(error, "Could not update that notification."));
  }
}

export async function markAllNotificationsRead() {
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) {
      throw error;
    }
  } catch (error) {
    logDevError("platform.markAllNotificationsRead", error);
    throw new Error(getErrorMessage(error, "Could not mark notifications as read."));
  }
}

export async function getUserBookings(): Promise<Booking[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("rider_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as Booking[];
  } catch (error) {
    logDevError("platform.getUserBookings", error);
    throw new Error(getErrorMessage(error, "Could not load booking history."));
  }
}

export async function getBookingReceipt(bookingId: string): Promise<BookingReceipt> {
  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("id", bookingId)
      .single();

    if (bookingError) {
      throw bookingError;
    }

    const [providerResult, transactionResult] = await Promise.all([
      booking?.provider_id
        ? supabase.from("providers").select(providerSelect).eq("id", booking.provider_id).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("transactions").select("*").eq("booking_id", bookingId).maybeSingle(),
    ]);

    if (providerResult.error) {
      throw providerResult.error;
    }

    if (transactionResult.error) {
      throw transactionResult.error;
    }

    return {
      booking: booking as Booking,
      service: (booking as Booking).service ?? null,
      provider: (providerResult.data as Provider | null) ?? null,
      transaction: (transactionResult.data as Transaction | null) ?? null,
    };
  } catch (error) {
    logDevError("platform.getBookingReceipt", error);
    throw new Error(getErrorMessage(error, "Could not load that booking receipt."));
  }
}

export async function getProviderProfile(): Promise<Provider | null> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("providers")
      .select(providerSelect)
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as Provider | null) ?? null;
  } catch (error) {
    logDevError("platform.getProviderProfile", error);
    throw new Error(getErrorMessage(error, "Could not load the provider profile."));
  }
}

export async function upsertProviderProfile(input: Partial<Provider>) {
  try {
    const userId = await getCurrentUserId();
    const payload = {
      profile_id: userId,
      headline: input.headline ?? null,
      bio: input.bio ?? null,
      availability_status: input.availability_status ?? "offline",
      is_available: input.is_available ?? false,
      service_radius_km: input.service_radius_km ?? 12,
      response_time_min: input.response_time_min ?? 8,
      current_lat: input.current_lat ?? null,
      current_lng: input.current_lng ?? null,
      current_address: input.current_address ?? null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("providers")
      .upsert(payload, { onConflict: "profile_id" })
      .select(providerSelect)
      .single();

    if (error) {
      throw error;
    }

    return data as Provider;
  } catch (error) {
    logDevError("platform.upsertProviderProfile", error);
    throw new Error(getErrorMessage(error, "Could not save the provider profile."));
  }
}

export async function updateProviderAvailability(status: ProviderAvailabilityStatus) {
  const availabilityMap = {
    available: true,
    busy: true,
    offline: false,
  } satisfies Record<ProviderAvailabilityStatus, boolean>;

  return upsertProviderProfile({
    availability_status: status,
    is_available: availabilityMap[status],
  });
}

export async function getProviderBookings(): Promise<Booking[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("driver_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as Booking[];
  } catch (error) {
    logDevError("platform.getProviderBookings", error);
    throw new Error(getErrorMessage(error, "Could not load provider bookings."));
  }
}

export async function updateBookingStatusByProvider(bookingId: string, status: Booking["status"], providerNotes?: string) {
  try {
    const { error } = await supabase.rpc("provider_set_booking_status", {
      p_booking_id: bookingId,
      p_status: status,
      p_provider_notes: providerNotes?.trim() || null,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logDevError("platform.updateBookingStatusByProvider", error);
    throw new Error(getErrorMessage(error, "Could not update that booking status."));
  }
}

export async function getProviderTransactions(): Promise<Transaction[]> {
  try {
    const provider = await getProviderProfile();

    if (!provider) {
      return [];
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as Transaction[];
  } catch (error) {
    logDevError("platform.getProviderTransactions", error);
    throw new Error(getErrorMessage(error, "Could not load provider transactions."));
  }
}

export async function getProviderReviews(): Promise<Review[]> {
  try {
    const provider = await getProviderProfile();

    if (!provider) {
      return [];
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as Review[];
  } catch (error) {
    logDevError("platform.getProviderReviews", error);
    throw new Error(getErrorMessage(error, "Could not load provider reviews."));
  }
}

export async function createReview(input: { bookingId: string; providerId: string; rating: number; comment?: string }) {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: input.bookingId,
        reviewer_id: userId,
        provider_id: input.providerId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Review;
  } catch (error) {
    logDevError("platform.createReview", error);
    throw new Error(getErrorMessage(error, "Could not submit that review."));
  }
}

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardData> {
  try {
    const [
      usersResult,
      providersResult,
      bookingsResult,
      servicesResult,
      reviewsResult,
      transactionsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("providers").select(providerSelect).order("created_at", { ascending: false }),
      supabase.from("bookings").select(bookingSelect).order("created_at", { ascending: false }).limit(200),
      supabase.from("services").select(serviceSelect).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (providersResult.error) throw providersResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (reviewsResult.error) throw reviewsResult.error;
    if (transactionsResult.error) throw transactionsResult.error;

    const users = (usersResult.data ?? []) as Profile[];
    const providers = (providersResult.data ?? []) as Provider[];
    const bookings = (bookingsResult.data ?? []) as Booking[];
    const services = (servicesResult.data ?? []) as Service[];
    const reviews = (reviewsResult.data ?? []) as Review[];
    const transactions = (transactionsResult.data ?? []) as Transaction[];

    const totalRevenue = transactions
      .filter((transaction) => transaction.status === "paid")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const activeBookings = bookings.filter((booking) =>
      activeBookingStatuses.includes(booking.status),
    ).length;

    const averageRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
        : 0;

    return {
      metrics: {
        totalUsers: users.length,
        totalProviders: providers.length,
        totalBookings: bookings.length,
        totalRevenue,
        activeBookings,
        averageRating,
      },
      recentBookings: bookings.slice(0, 10),
      services,
      providers,
      users: users.slice(0, 100),
      reviews,
      transactions,
      notifications: [],
    };
  } catch (error) {
    logDevError("platform.getAdminDashboardSnapshot", error);
    throw new Error(getErrorMessage(error, "Could not load admin analytics."));
  }
}

export async function updateDriverLocation(input: {
  lat: number
  lng: number
  heading?: number
  speed_kmh?: number
  accuracy_meters?: number
  ride_id?: string | null
  is_online?: boolean
}): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke<{ location_id: string }>("driver-location", {
      body: input,
    })

    if (error) {
      logDevError("platform.updateDriverLocation", error)
      throw new Error(getErrorMessage(error, "Could not update driver location."))
    }

    return data?.location_id ?? ""
  } catch (error) {
    logDevError("platform.updateDriverLocation", error)
    throw new Error(getErrorMessage(error, "Could not update driver location."))
  }
}

export async function getNearbyDrivers(input: {
  lat: number
  lng: number
  radius_km?: number
  limit?: number
}): Promise<DriverLocation[]> {
  try {
    const { data, error } = await supabase.functions.invoke<{ drivers: DriverLocation[] }>("nearby-drivers", {
      body: input,
    })

    if (error) {
      logDevError("platform.getNearbyDrivers", error)
      throw new Error(getErrorMessage(error, "Could not find nearby drivers."))
    }

    return data?.drivers ?? []
  } catch (error) {
    logDevError("platform.getNearbyDrivers", error)
    throw new Error(getErrorMessage(error, "Could not find nearby drivers."))
  }
}

export async function getDriverLocationForBooking(bookingId: string): Promise<DriverLocation | null> {
  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("driver_id")
      .eq("id", bookingId)
      .single()

    if (bookingError || !booking?.driver_id) {
      return null
    }

    const { data, error } = await supabase
      .from("driver_locations")
      .select("*")
      .eq("driver_id", booking.driver_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logDevError("platform.getDriverLocationForBooking", error)
      return null
    }

    return (data as DriverLocation) ?? null
  } catch (error) {
    logDevError("platform.getDriverLocationForBooking", error)
    return null
  }
}

export function subscribeToDriverLocation(
  driverId: string,
  callback: (location: DriverLocation) => void
) {
  const channel = supabase
    .channel(`driver-location-${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as DriverLocation)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function createRideRequest(input: {
  city: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dest_address: string
  dest_lat: number
  dest_lng: number
  service_id?: string | null
  seats_requested?: number
  max_fare_per_seat?: number | null
  max_wait_minutes?: number
  preferred_departure?: string
  latest_departure?: string
}): Promise<{ request_id: string; expires_at: string }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ request_id: string; expires_at: string }>("ride-pooling", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.createRideRequest", error)
      throw new Error(getErrorMessage(error, "Could not create ride request."))
    }

    return data ?? { request_id: "", expires_at: "" }
  } catch (error) {
    logDevError("platform.createRideRequest", error)
    throw new Error(getErrorMessage(error, "Could not create ride request."))
  }
}

export async function getRideRequestStatus(requestId: string): Promise<{
  status: string
  matched: boolean
  ride_id: string | null
  request: RideRequest
}> {
  try {
    const { data, error } = await supabase.functions.invoke("ride-pooling", {
      body: { request_id: requestId },
      method: "GET",
    })

    if (error) {
      logDevError("platform.getRideRequestStatus", error)
      throw new Error(getErrorMessage(error, "Could not get ride request status."))
    }

    return data ?? { status: "searching", matched: false, ride_id: null, request: null as any }
  } catch (error) {
    logDevError("platform.getRideRequestStatus", error)
    throw new Error(getErrorMessage(error, "Could not get ride request status."))
  }
}

export async function cancelRideRequest(requestId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("ride-pooling", {
      body: { request_id: requestId },
      method: "DELETE",
    })

    if (error) {
      logDevError("platform.cancelRideRequest", error)
      throw new Error(getErrorMessage(error, "Could not cancel ride request."))
    }
  } catch (error) {
    logDevError("platform.cancelRideRequest", error)
    throw new Error(getErrorMessage(error, "Could not cancel ride request."))
  }
}

export function subscribeToRideRequest(
  requestId: string,
  callback: (request: RideRequest) => void
) {
  const channel = supabase
    .channel(`ride-request-${requestId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as RideRequest)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function createStripeCheckoutSession(input: {
  booking_id: string
  amount_cents: number
  currency?: string
  success_url?: string
  cancel_url?: string
  metadata?: Record<string, unknown>
}): Promise<{ session_id: string; url: string; payment_intent_id: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.createStripeCheckoutSession", error)
      throw new Error(getErrorMessage(error, "Could not create checkout session."))
    }

    return data ?? { session_id: "", url: "", payment_intent_id: "" }
  } catch (error) {
    logDevError("platform.createStripeCheckoutSession", error)
    throw new Error(getErrorMessage(error, "Could not create checkout session."))
  }
}

export async function getPaymentIntents(bookingId?: string): Promise<PaymentIntent[]> {
  try {
    let query = supabase
      .from("payment_intents")
      .select("*")
      .order("created_at", { ascending: false })

    if (bookingId) {
      query = query.eq("booking_id", bookingId)
    }

    const { data, error } = await query

    if (error) {
      logDevError("platform.getPaymentIntents", error)
      throw new Error(getErrorMessage(error, "Could not load payment intents."))
    }

    return (data ?? []) as PaymentIntent[]
  } catch (error) {
    logDevError("platform.getPaymentIntents", error)
    throw new Error(getErrorMessage(error, "Could not load payment intents."))
  }
}

export async function getPaymentIntentById(paymentIntentId: string): Promise<PaymentIntent | null> {
  try {
    const { data, error } = await supabase
      .from("payment_intents")
      .select("*")
      .eq("id", paymentIntentId)
      .single()

    if (error) {
      logDevError("platform.getPaymentIntentById", error)
      return null
    }

    return data as PaymentIntent
  } catch (error) {
    logDevError("platform.getPaymentIntentById", error)
    return null
  }
}

export async function subscribeToPushNotifications(subscription: PushSubscription): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("push-notifications", {
      body: subscription,
      method: "POST",
    })

    if (error) {
      logDevError("platform.subscribeToPushNotifications", error)
      throw new Error(getErrorMessage(error, "Could not subscribe to push notifications."))
    }
  } catch (error) {
    logDevError("platform.subscribeToPushNotifications", error)
    throw new Error(getErrorMessage(error, "Could not subscribe to push notifications."))
  }
}

export async function unsubscribeFromPushNotifications(endpoint: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("push-notifications", {
      body: { endpoint },
      method: "DELETE",
    })

    if (error) {
      logDevError("platform.unsubscribeFromPushNotifications", error)
      throw new Error(getErrorMessage(error, "Could not unsubscribe from push notifications."))
    }
  } catch (error) {
    logDevError("platform.unsubscribeFromPushNotifications", error)
    throw new Error(getErrorMessage(error, "Could not unsubscribe from push notifications."))
  }
}

export async function getPushSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  try {
    const { data, error } = await supabase.functions.invoke("push-notifications", {
      method: "GET",
    })

    if (error) {
      logDevError("platform.getPushSubscriptions", error)
      throw new Error(getErrorMessage(error, "Could not get push subscriptions."))
    }

    return (data?.subscriptions ?? []) as { endpoint: string; p256dh: string; auth: string }[]
  } catch (error) {
    logDevError("platform.getPushSubscriptions", error)
    throw new Error(getErrorMessage(error, "Could not get push subscriptions."))
  }
}

export async function sendPushNotification(input: {
  user_id: string
  template_key: string
  data?: Record<string, unknown>
}): Promise<{ sent: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.sendPushNotification", error)
      throw new Error(getErrorMessage(error, "Could not send push notification."))
    }

    return data ?? { sent: 0 }
  } catch (error) {
    logDevError("platform.sendPushNotification", error)
    throw new Error(getErrorMessage(error, "Could not send push notification."))
  }
}

export async function getChatMessages(bookingId: string, limit = 100): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase.rpc("get_chat_messages", {
      p_booking_id: bookingId,
      p_limit: limit,
    })

    if (error) {
      logDevError("platform.getChatMessages", error)
      throw new Error(getErrorMessage(error, "Could not load chat messages."))
    }

    return (data ?? []) as ChatMessage[]
  } catch (error) {
    logDevError("platform.getChatMessages", error)
    throw new Error(getErrorMessage(error, "Could not load chat messages."))
  }
}

export async function sendChatMessage(input: {
  booking_id: string
  message: string
  message_type?: "text" | "image" | "location" | "system"
  metadata?: Record<string, unknown>
}): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("send_chat_message", {
      p_booking_id: input.booking_id,
      p_message: input.message,
      p_message_type: input.message_type ?? "text",
      p_metadata: input.metadata ?? {},
    })

    if (error) {
      logDevError("platform.sendChatMessage", error)
      throw new Error(getErrorMessage(error, "Could not send message."))
    }

    return data as string
  } catch (error) {
    logDevError("platform.sendChatMessage", error)
    throw new Error(getErrorMessage(error, "Could not send message."))
  }
}

export async function markChatMessagesRead(bookingId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("mark_chat_messages_read", {
      p_booking_id: bookingId,
    })

    if (error) {
      logDevError("platform.markChatMessagesRead", error)
      throw new Error(getErrorMessage(error, "Could not mark messages as read."))
    }
  } catch (error) {
    logDevError("platform.markChatMessagesRead", error)
    throw new Error(getErrorMessage(error, "Could not mark messages as read."))
  }
}

export function subscribeToChatMessages(
  bookingId: string,
  callback: (message: ChatMessage) => void
) {
  const channel = supabase
    .channel(`chat-${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as ChatMessage)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function sendPhoneVerification(input: {
  phone: string
  purpose?: "verify" | "login" | "2fa" | "password_reset"
  use_twilio_verify?: boolean
  channel?: "sms" | "call"
}): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.sendPhoneVerification", error)
      throw new Error(getErrorMessage(error, "Could not send verification code."))
    }

    return data ?? { success: false }
  } catch (error) {
    logDevError("platform.sendPhoneVerification", error)
    throw new Error(getErrorMessage(error, "Could not send verification code."))
  }
}

export async function verifyPhoneCode(input: {
  phone: string
  code: string
  purpose?: "verify" | "login" | "2fa" | "password_reset"
  use_twilio_verify?: boolean
}): Promise<{ success: boolean; verified: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-sms", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.verifyPhoneCode", error)
      throw new Error(getErrorMessage(error, "Could not verify code."))
    }

    return data ?? { success: false, verified: false }
  } catch (error) {
    logDevError("platform.verifyPhoneCode", error)
    throw new Error(getErrorMessage(error, "Could not verify code."))
  }
}

export async function getEmergencyContacts(): Promise<{
  id: string
  user_id: string
  name: string
  phone: string
  relationship: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}[]> {
  try {
    const { data, error } = await supabase
      .from("user_emergency_contacts")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      logDevError("platform.getEmergencyContacts", error)
      throw new Error(getErrorMessage(error, "Could not load emergency contacts."))
    }

    return (data ?? []) as any[]
  } catch (error) {
    logDevError("platform.getEmergencyContacts", error)
    throw new Error(getErrorMessage(error, "Could not load emergency contacts."))
  }
}

export async function addEmergencyContact(input: {
  name: string
  phone: string
  relationship?: string
  is_primary?: boolean
}): Promise<any> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    if (input.is_primary) {
      await supabase
        .from("user_emergency_contacts")
        .update({ is_primary: false })
        .eq("user_id", user.id)
    }

    const { data, error } = await supabase
      .from("user_emergency_contacts")
      .insert({
        user_id: user.id,
        name: input.name,
        phone: input.phone,
        relationship: input.relationship ?? null,
        is_primary: input.is_primary ?? false,
      })
      .select("*")
      .single()

    if (error) {
      logDevError("platform.addEmergencyContact", error)
      throw new Error(getErrorMessage(error, "Could not add emergency contact."))
    }

    return data
  } catch (error) {
    logDevError("platform.addEmergencyContact", error)
    throw new Error(getErrorMessage(error, "Could not add emergency contact."))
  }
}

export async function updateEmergencyContact(contactId: string, updates: {
  name?: string
  phone?: string
  relationship?: string
  is_primary?: boolean
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    if (updates.is_primary) {
      await supabase
        .from("user_emergency_contacts")
        .update({ is_primary: false })
        .eq("user_id", user.id)
    }

    const { error } = await supabase
      .from("user_emergency_contacts")
      .update(updates)
      .eq("id", contactId)
      .eq("user_id", user.id)

    if (error) {
      logDevError("platform.updateEmergencyContact", error)
      throw new Error(getErrorMessage(error, "Could not update emergency contact."))
    }
  } catch (error) {
    logDevError("platform.updateEmergencyContact", error)
    throw new Error(getErrorMessage(error, "Could not update emergency contact."))
  }
}

export async function deleteEmergencyContact(contactId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_emergency_contacts")
      .delete()
      .eq("id", contactId)

    if (error) {
      logDevError("platform.deleteEmergencyContact", error)
      throw new Error(getErrorMessage(error, "Could not delete emergency contact."))
    }
  } catch (error) {
    logDevError("platform.deleteEmergencyContact", error)
    throw new Error(getErrorMessage(error, "Could not delete emergency contact."))
  }
}

export async function triggerSOS(input: {
  booking_id?: string | null
  lat: number
  lng: number
  address?: string
}): Promise<{ alert_id: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { data, error } = await supabase
      .from("sos_alerts")
      .insert({
        user_id: user.id,
        booking_id: input.booking_id ?? null,
        lat: input.lat,
        lng: input.lng,
        address: input.address ?? null,
      })
      .select("id")
      .single()

    if (error) {
      logDevError("platform.triggerSOS", error)
      throw new Error(getErrorMessage(error, "Could not trigger SOS."))
    }

    const contacts = await getEmergencyContacts()
    const primaryContacts = contacts.filter(c => c.is_primary)

    if (primaryContacts.length > 0 && twilioPhoneNumber) {
      const message = `🚨 EMERGENCY ALERT: ${user.user_metadata?.full_name ?? "A user"} triggered SOS. Location: ${input.address ?? `https://maps.google.com/?q=${input.lat},${input.lng}`}`
      
      for (const contact of primaryContacts.slice(0, 3)) {
        await sendTwilioSms(contact.phone, message)
      }
    }

    return { alert_id: data.id }
  } catch (error) {
    logDevError("platform.triggerSOS", error)
    throw new Error(getErrorMessage(error, "Could not trigger SOS."))
  }
}

export async function getSOSAlerts(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      logDevError("platform.getSOSAlerts", error)
      return []
    }

    return (data ?? []) as any[]
  } catch (error) {
    logDevError("platform.getSOSAlerts", error)
    return []
  }
}

export function subscribeToSOSAlerts(
  userId: string,
  callback: (alert: any) => void
) {
  const channel = supabase
    .channel(`sos-alerts-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sos_alerts",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function sendEmail(input: {
  template_key: string
  to: string
  variables?: Record<string, string>
  user_id?: string
}): Promise<{ success: boolean; message_id?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: input,
      method: "POST",
    })

    if (error) {
      logDevError("platform.sendEmail", error)
      throw new Error(getErrorMessage(error, "Could not send email."))
    }

    return data ?? { success: false }
  } catch (error) {
    logDevError("platform.sendEmail", error)
    throw new Error(getErrorMessage(error, "Could not send email."))
  }
}

export async function sendTransactionalEmail(input: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; message_id?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        template_key: "custom",
        to: input.to,
        variables: {
          subject: input.subject,
          html: input.html,
          text: input.text ?? "",
        },
      },
      method: "POST",
    })

    if (error) {
      logDevError("platform.sendTransactionalEmail", error)
      throw new Error(getErrorMessage(error, "Could not send email."))
    }

    return data ?? { success: false }
  } catch (error) {
    logDevError("platform.sendTransactionalEmail", error)
    throw new Error(getErrorMessage(error, "Could not send email."))
  }
}

export async function getEmailLogs(limit = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      logDevError("platform.getEmailLogs", error)
      throw new Error(getErrorMessage(error, "Could not load email logs."))
    }

    return (data ?? []) as any[]
  } catch (error) {
    logDevError("platform.getEmailLogs", error)
    throw new Error(getErrorMessage(error, "Could not load email logs."))
  }
}

export async function getReferralCode(): Promise<{ code: string; total_referrals: number; total_rewards_earned: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("referral_codes")
      .select("code, total_referrals, total_rewards_earned")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      logDevError("platform.getReferralCode", error)
      return null
    }

    return data as any
  } catch (error) {
    logDevError("platform.getReferralCode", error)
    return null
  }
}

export async function generateReferralCode(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { data, error } = await supabase.rpc("generate_referral_code", {
      p_user_id: user.id,
    })

    if (error) {
      logDevError("platform.generateReferralCode", error)
      throw new Error(getErrorMessage(error, "Could not generate referral code."))
    }

    return data as string
  } catch (error) {
    logDevError("platform.generateReferralCode", error)
    throw new Error(getErrorMessage(error, "Could not generate referral code."))
  }
}

export async function applyReferralCode(code: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { error } = await supabase.rpc("apply_referral_code", {
      p_referred_id: user.id,
      p_code: code,
    })

    if (error) {
      logDevError("platform.applyReferralCode", error)
      throw new Error(getErrorMessage(error, "Could not apply referral code."))
    }
  } catch (error) {
    logDevError("platform.applyReferralCode", error)
    throw new Error(getErrorMessage(error, "Could not apply referral code."))
  }
}

export async function getReferrals(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("referrals")
      .select("*, referred:profiles!referrals_referred_id_fkey(full_name, email, avatar_url)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      logDevError("platform.getReferrals", error)
      return []
    }

    return (data ?? []) as any[]
  } catch (error) {
    logDevError("platform.getReferrals", error)
    return []
  }
}

export async function validatePromoCode(input: {
  code: string
  booking_amount: number
  service_id?: string | null
  city?: string | null
}): Promise<{
  valid: boolean
  promo_code_id: string
  discount_type: string
  discount_value: number
  discount_amount: number
  error_message: string | null
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { data, error } = await supabase.rpc("validate_promo_code", {
      p_code: input.code,
      p_user_id: user.id,
      p_booking_amount: input.booking_amount,
      p_service_id: input.service_id ?? null,
      p_city: input.city ?? null,
    })

    if (error) {
      logDevError("platform.validatePromoCode", error)
      throw new Error(getErrorMessage(error, "Could not validate promo code."))
    }

    return (data?.[0] ?? { valid: false, promo_code_id: null, discount_type: '', discount_value: 0, discount_amount: 0, error_message: 'Validation failed' }) as any
  } catch (error) {
    logDevError("platform.validatePromoCode", error)
    throw new Error(getErrorMessage(error, "Could not validate promo code."))
  }
}

export async function usePromoCode(input: {
  promo_code_id: string
  booking_id: string
  discount_applied: number
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { error } = await supabase.rpc("use_promo_code", {
      p_promo_code_id: input.promo_code_id,
      p_user_id: user.id,
      p_booking_id: input.booking_id,
      p_discount_applied: input.discount_applied,
    })

    if (error) {
      logDevError("platform.usePromoCode", error)
      throw new Error(getErrorMessage(error, "Could not apply promo code."))
    }
  } catch (error) {
    logDevError("platform.usePromoCode", error)
    throw new Error(getErrorMessage(error, "Could not apply promo code."))
  }
}

export async function getPromoCodes(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", new Date().toISOString())
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      logDevError("platform.getPromoCodes", error)
      return []
    }

    return (data ?? []) as any[]
  } catch (error) {
    logDevError("platform.getPromoCodes", error)
    return []
  }
}

export interface ScheduledRide {
  id: string
  rider_id: string
  service_id: string | null
  city: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dest_address: string
  dest_lat: number
  dest_lng: number
  stops: any[]
  scheduled_for: string
  recurrence: "once" | "daily" | "weekdays" | "weekly" | "monthly" | null
  recurrence_end: string | null
  seats: number
  special_instructions: string | null
  status: "scheduled" | "searching" | "matched" | "confirmed" | "active" | "completed" | "cancelled" | "failed"
  matched_ride_id: string | null
  matched_booking_id: string | null
  estimated_fare: number | null
  created_at: string
  updated_at: string
}

export interface BookingStop {
  id: string
  booking_id: string
  stop_order: number
  address: string
  lat: number
  lng: number
  stop_type: "pickup" | "dropoff" | "waypoint"
  estimated_arrival: string | null
  actual_arrival: string | null
  wait_time_minutes: number
  created_at: string
}

export async function createScheduledRide(input: {
  service_id: string | null
  city: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dest_address: string
  dest_lat: number
  dest_lng: number
  stops?: any[]
  scheduled_for: string
  recurrence?: "once" | "daily" | "weekdays" | "weekly" | "monthly"
  recurrence_end?: string | null
  seats?: number
  special_instructions?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("create_scheduled_ride", {
      p_rider_id: (await supabase.auth.getUser()).data.user?.id,
      p_service_id: input.service_id,
      p_city: input.city,
      p_pickup_address: input.pickup_address,
      p_pickup_lat: input.pickup_lat,
      p_pickup_lng: input.pickup_lng,
      p_dest_address: input.dest_address,
      p_dest_lat: input.dest_lat,
      p_dest_lng: input.dest_lng,
      p_stops: input.stops ?? [],
      p_scheduled_for: input.scheduled_for,
      p_recurrence: input.recurrence ?? "once",
      p_recurrence_end: input.recurrence_end ?? null,
      p_seats: input.seats ?? 1,
      p_special_instructions: input.special_instructions ?? null,
    })

    if (error) {
      logDevError("platform.createScheduledRide", error)
      throw new Error(getErrorMessage(error, "Could not create scheduled ride."))
    }

    return data as string
  } catch (error) {
    logDevError("platform.createScheduledRide", error)
    throw new Error(getErrorMessage(error, "Could not create scheduled ride."))
  }
}

export async function getScheduledRides(): Promise<ScheduledRide[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.rpc("get_scheduled_rides_for_rider", {
      p_rider_id: user.id,
    })

    if (error) {
      logDevError("platform.getScheduledRides", error)
      return []
    }

    return (data ?? []) as ScheduledRide[]
  } catch (error) {
    logDevError("platform.getScheduledRides", error)
    return []
  }
}

export async function cancelScheduledRide(rideId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("scheduled_rides")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", rideId)

    if (error) {
      logDevError("platform.cancelScheduledRide", error)
      throw new Error(getErrorMessage(error, "Could not cancel scheduled ride."))
    }
  } catch (error) {
    logDevError("platform.cancelScheduledRide", error)
    throw new Error(getErrorMessage(error, "Could not cancel scheduled ride."))
  }
}

export async function getBookingStops(bookingId: string): Promise<BookingStop[]> {
  try {
    const { data, error } = await supabase.rpc("get_booking_stops", {
      p_booking_id: bookingId,
    })

    if (error) {
      logDevError("platform.getBookingStops", error)
      return []
    }

    return (data ?? []) as BookingStop[]
  } catch (error) {
    logDevError("platform.getBookingStops", error)
    return []
  }
}

export async function addBookingStop(input: {
  booking_id: string
  stop_order: number
  address: string
  lat: number
  lng: number
  stop_type?: "pickup" | "dropoff" | "waypoint"
}): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("add_booking_stop", {
      p_booking_id: input.booking_id,
      p_stop_order: input.stop_order,
      p_address: input.address,
      p_lat: input.lat,
      p_lng: input.lng,
      p_stop_type: input.stop_type ?? "waypoint",
    })

    if (error) {
      logDevError("platform.addBookingStop", error)
      throw new Error(getErrorMessage(error, "Could not add stop."))
    }

    return data as string
  } catch (error) {
    logDevError("platform.addBookingStop", error)
    throw new Error(getErrorMessage(error, "Could not add stop."))
  }
}

export async function reorderBookingStops(bookingId: string, stops: any[]): Promise<void> {
  try {
    const { error } = await supabase.rpc("reorder_booking_stops", {
      p_booking_id: bookingId,
      p_stops: stops,
    })

    if (error) {
      logDevError("platform.reorderBookingStops", error)
      throw new Error(getErrorMessage(error, "Could not reorder stops."))
    }
  } catch (error) {
    logDevError("platform.reorderBookingStops", error)
    throw new Error(getErrorMessage(error, "Could not reorder stops."))
  }
}

export async function deleteBookingStop(stopId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("booking_stops")
      .delete()
      .eq("id", stopId)

    if (error) {
      logDevError("platform.deleteBookingStop", error)
      throw new Error(getErrorMessage(error, "Could not delete stop."))
    }
  } catch (error) {
    logDevError("platform.deleteBookingStop", error)
    throw new Error(getErrorMessage(error, "Could not delete stop."))
  }
}

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rollout_percentage: number
  targeting: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("key", { ascending: true })

    if (error) {
      logDevError("platform.getFeatureFlags", error)
      return []
    }

    return (data ?? []) as FeatureFlag[]
  } catch (error) {
    logDevError("platform.getFeatureFlags", error)
    return []
  }
}

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled, rollout_percentage, targeting")
      .eq("key", key)
      .single()

    if (error || !data) return false

    if (!data.enabled) return false

    if (data.rollout_percentage < 100 && userId) {
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${key}:${userId}`))
      const hashArray = new Uint8Array(hash)
      const hashInt = hashArray[0] + (hashArray[1] << 8) + (hashArray[2] << 16) + (hashArray[3] << 24)
      const bucket = Math.abs(hashInt) % 100
      if (bucket >= data.rollout_percentage) return false
    }

    return true
  } catch (error) {
    logDevError("platform.isFeatureEnabled", error)
    return false
  }
}

export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("key", key)
      .single()

    if (error) return null
    return data as FeatureFlag
  } catch (error) {
    return null
  }
}

export interface AuditLog {
  id: string
  user_id: string | null
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export async function logAudit(input: {
  user_id?: string
  actor_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase.rpc("log_audit", {
      p_user_id: input.user_id ?? user?.id ?? null,
      p_actor_id: input.actor_id ?? user?.id ?? null,
      p_action: input.action,
      p_resource_type: input.resource_type,
      p_resource_id: input.resource_id ?? null,
      p_old_values: input.old_values ?? null,
      p_new_values: input.new_values ?? null,
      p_metadata: input.metadata ?? {},
    })

    if (error) {
      logDevError("platform.logAudit", error)
      return ""
    }

    return data as string
  } catch (error) {
    logDevError("platform.logAudit", error)
    return ""
  }
}

export async function getAuditLogs(filters?: {
  user_id?: string
  actor_id?: string
  action?: string
  resource_type?: string
  limit?: number
}): Promise<AuditLog[]> {
  try {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.user_id) query = query.eq("user_id", filters.user_id)
    if (filters?.actor_id) query = query.eq("actor_id", filters.actor_id)
    if (filters?.action) query = query.eq("action", filters.action)
    if (filters?.resource_type) query = query.eq("resource_type", filters.resource_type)
    if (filters?.limit) query = query.limit(filters.limit)

    const { data, error } = await query

    if (error) {
      logDevError("platform.getAuditLogs", error)
      return []
    }

    return (data ?? []) as AuditLog[]
  } catch (error) {
    logDevError("platform.getAuditLogs", error)
    return []
  }
}

export interface GDPRRequest {
  id: string
  user_id: string
  request_type: "export" | "delete" | "rectification" | "restrict" | "portability"
  status: "pending" | "processing" | "completed" | "rejected" | "cancelled"
  requested_data: Record<string, unknown> | null
  completed_data: Record<string, unknown> | null
  error_message: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export async function submitGDPRRequest(requestType: GDPRRequest["request_type"], requestedData?: Record<string, unknown>): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { data, error } = await supabase.rpc("submit_gdpr_request", {
      p_user_id: user.id,
      p_request_type: requestType,
      p_requested_data: requestedData ?? {},
    })

    if (error) {
      logDevError("platform.submitGDPRRequest", error)
      throw new Error(getErrorMessage(error, "Could not submit GDPR request."))
    }

    return data as string
  } catch (error) {
    logDevError("platform.submitGDPRRequest", error)
    throw new Error(getErrorMessage(error, "Could not submit GDPR request."))
  }
}

export async function getGDPRRequests(): Promise<GDPRRequest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("gdpr_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      logDevError("platform.getGDPRRequests", error)
      return []
    }

    return (data ?? []) as GDPRRequest[]
  } catch (error) {
    logDevError("platform.getGDPRRequests", error)
    return []
  }
}

export async function exportUserData(): Promise<Record<string, unknown>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated.")

    const { data, error } = await supabase.rpc("get_user_data_export", {
      p_user_id: user.id,
    })

    if (error) {
      logDevError("platform.exportUserData", error)
      throw new Error(getErrorMessage(error, "Could not export data."))
    }

    return data as Record<string, unknown>
  } catch (error) {
    logDevError("platform.exportUserData", error)
    throw new Error(getErrorMessage(error, "Could not export data."))
  }
}

export async function downloadUserDataExport(): Promise<void> {
  try {
    const data = await exportUserData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hopin-data-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    logDevError("platform.downloadUserDataExport", error)
    throw new Error(getErrorMessage(error, "Could not download data export."))
  }
}

const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? ""

async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? ""
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? ""
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return false
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
    return response.ok
  } catch {
    return false
  }
}
