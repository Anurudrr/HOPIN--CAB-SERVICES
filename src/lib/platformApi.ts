import { supabase } from "./supabase";
import { getErrorMessage, logDevError, mapApiErrorMessage } from "./errors";
import type {
  AdminDashboardData,
  Booking,
  BookingReceipt,
  NotificationItem,
  Profile,
  Provider,
  ProviderAvailabilityStatus,
  Review,
  SavedLocation,
  Service,
  Transaction,
} from "../types";

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
