import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BriefcaseBusiness,
  CalendarClock,
  Car,
  CircleDollarSign,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { bookingLocations } from "../../content/siteContent";
import { createDriverRide, getDriverDashboardData } from "../../lib/api";
import { formatCurrency, formatDateTime } from "../../lib/format";
import {
  getProviderBookings,
  getProviderProfile,
  getProviderReviews,
  getProviderTransactions,
  getServiceCatalog,
  updateBookingStatusByProvider,
  upsertProviderProfile,
} from "../../lib/platformApi";
import { supportedCities, type SupportedCity } from "../../lib/cities";
import { providerProfileSchema, rideSchema, type ProviderProfileInput, type RideInput as RideFormInput } from "../../lib/validation";
import { supabase } from "../../lib/supabase";
import { toast } from "../../lib/toast";
import { useAuthStore } from "../../store/useAuthStore";
import type { Booking, DriverDashboardData, Provider, Review, Service, Transaction } from "../../types";
import { Button, ButtonLink } from "../ui/Button";
import { RatingStars } from "./RatingStars";
import { StatCard } from "./StatCard";

const emptyDashboard: DriverDashboardData = {
  application: null,
  vehicles: [],
  rides: [],
  bookings: [],
  provider: null,
};

const defaultProviderValues: ProviderProfileInput = {
  headline: "",
  bio: "",
  service_radius_km: 12,
  response_time_min: 8,
  availability_status: "offline",
};

const defaultRideValues: RideFormInput = {
  service_id: null,
  origin_name: "",
  origin_lat: 0,
  origin_lng: 0,
  destination_name: "",
  destination_lat: 0,
  destination_lng: 0,
  city: "Bangalore",
  departure_time: "",
  seats_total: 4,
  fare_per_seat: 180,
};

function getNextStatusActions(status: Booking["status"]) {
  if (status === "pending" || status === "confirmed") {
    return ["accepted", "cancelled"] as const;
  }

  if (status === "accepted") {
    return ["arriving", "cancelled"] as const;
  }

  if (status === "arriving") {
    return ["ongoing", "cancelled"] as const;
  }

  if (status === "ongoing" || status === "in_progress") {
    return ["completed", "cancelled"] as const;
  }

  return [] as const;
}

export const DriverDashboard = () => {
  const profile = useAuthStore((state) => state.profile);
  const [dashboard, setDashboard] = React.useState<DriverDashboardData>(emptyDashboard);
  const [providerProfile, setProviderProfile] = React.useState<Provider | null>(null);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncingRide, setSyncingRide] = React.useState(false);
  const [syncingProvider, setSyncingProvider] = React.useState(false);
  const [actingBookingId, setActingBookingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register: registerProvider,
    handleSubmit: handleProviderSubmit,
    reset: resetProviderForm,
    formState: { errors: providerErrors },
  } = useForm<ProviderProfileInput>({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: defaultProviderValues,
  });

  const {
    register: registerRide,
    handleSubmit: handleRideSubmit,
    reset: resetRideForm,
    setValue: setRideValue,
    watch: watchRide,
    formState: { errors: rideErrors },
  } = useForm<RideFormInput>({
    resolver: zodResolver(rideSchema),
    defaultValues: defaultRideValues,
  });

  const watchedOrigin = watchRide("origin_name");
  const watchedDestination = watchRide("destination_name");
  const providerCity =
    profile?.city && supportedCities.includes(profile.city as SupportedCity)
      ? (profile.city as SupportedCity)
      : "Bangalore";
  const cityLocations = React.useMemo(
    () => bookingLocations.filter((location) => location.city === profile?.city),
    [profile?.city],
  );

  const hydrateDashboard = React.useCallback(async () => {
    if (!profile?.id) {
      setDashboard(emptyDashboard);
      setProviderProfile(null);
      setBookings([]);
      setTransactions([]);
      setReviews([]);
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        dashboardData,
        providerData,
        providerBookings,
        providerTransactions,
        providerReviews,
        serviceCatalog,
      ] = await Promise.all([
        getDriverDashboardData(),
        getProviderProfile(),
        getProviderBookings(),
        getProviderTransactions(),
        getProviderReviews(),
        getServiceCatalog(),
      ]);

      setDashboard({
        ...dashboardData,
        bookings: providerBookings,
        provider: providerData,
      });
      setProviderProfile(providerData);
      setBookings(providerBookings);
      setTransactions(providerTransactions);
      setReviews(providerReviews);
      setServices(serviceCatalog);

      resetProviderForm({
        headline: providerData?.headline ?? "",
        bio: providerData?.bio ?? "",
        service_radius_km: providerData?.service_radius_km ?? 12,
        response_time_min: providerData?.response_time_min ?? 8,
        availability_status: providerData?.availability_status ?? "offline",
      });

      if (profile.city && cityLocations.length) {
        resetRideForm({
          ...defaultRideValues,
          city: providerCity,
          origin_name: cityLocations[0]?.address ?? "",
          destination_name: cityLocations[1]?.address ?? cityLocations[0]?.address ?? "",
          service_id: serviceCatalog[0]?.id ?? null,
        });
      }
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error
          ? dashboardError.message
          : "Could not load the provider dashboard.",
      );
      setDashboard(emptyDashboard);
      setProviderProfile(null);
      setBookings([]);
      setTransactions([]);
      setReviews([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [cityLocations, profile?.city, profile?.id, providerCity, resetProviderForm, resetRideForm]);

  React.useEffect(() => {
    void hydrateDashboard();
  }, [hydrateDashboard]);

  React.useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const channel = supabase
      .channel(`provider-dashboard-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rides",
          filter: `driver_id=eq.${profile.id}`,
        },
        () => {
          void hydrateDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `driver_id=eq.${profile.id}`,
        },
        () => {
          void hydrateDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "providers",
          filter: `profile_id=eq.${profile.id}`,
        },
        () => {
          void hydrateDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hydrateDashboard, profile?.id]);

  const handleSaveProviderProfile = async (values: ProviderProfileInput) => {
    setSyncingProvider(true);
    setError(null);

    try {
      await upsertProviderProfile({
        headline: values.headline || null,
        bio: values.bio || null,
        availability_status: values.availability_status,
        is_available: values.availability_status !== "offline",
        service_radius_km: values.service_radius_km,
        response_time_min: values.response_time_min,
      });
      toast.success("Provider settings updated.");
      await hydrateDashboard();
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Could not save provider settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSyncingProvider(false);
    }
  };

  const handleCreateRide = async (values: RideFormInput) => {
    if (!profile?.city) {
      setError("Complete onboarding before publishing a service route.");
      return;
    }

    if (!dashboard.application) {
      setError("Submit a provider application before publishing live inventory.");
      return;
    }

    if (dashboard.application.status !== "approved") {
      setError("Your provider application must be approved before rides can go live.");
      return;
    }

    const origin = cityLocations.find((location) => location.address === values.origin_name);
    const destination = cityLocations.find((location) => location.address === values.destination_name);

    if (!origin || !destination || origin.address === destination.address) {
      setError("Choose two different route points inside your city corridor.");
      return;
    }

    setSyncingRide(true);
    setError(null);

    try {
      await createDriverRide({
        ...values,
        service_id: values.service_id,
        city: providerCity,
        origin_name: origin.address,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        departure_time: new Date(values.departure_time).toISOString(),
      });
      toast.success("Route published.");
      resetRideForm({
        ...defaultRideValues,
        city: providerCity,
        origin_name: origin.address,
        destination_name: destination.address,
        service_id: values.service_id,
      });
      await hydrateDashboard();
    } catch (rideError) {
      const message = rideError instanceof Error ? rideError.message : "Could not publish that route.";
      setError(message);
      toast.error(message);
    } finally {
      setSyncingRide(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: Booking["status"]) => {
    setActingBookingId(bookingId);
    setError(null);

    try {
      await updateBookingStatusByProvider(bookingId, status);
      toast.success(`Booking marked ${status}.`);
      await hydrateDashboard();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Could not update that booking.";
      setError(message);
      toast.error(message);
    } finally {
      setActingBookingId(null);
    }
  };

  const upcomingRides = dashboard.rides.filter((ride) => ride.status === "scheduled");
  const activeBookings = bookings.filter((booking) =>
    ["pending", "accepted", "arriving", "ongoing", "confirmed", "in_progress"].includes(booking.status),
  );
  const totalEarnings = transactions
    .filter((transaction) => transaction.status === "paid")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  if (loading) {
    return (
      <div className="panel flex items-center gap-4 px-6 py-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="text-sm font-medium text-black/60">Loading provider operations.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="panel-dark flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white">
            Provider operations
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-white">
            Manage live inventory, booking progress, and earnings from one surface.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white">
            This is now a real provider console backed by Supabase bookings, transactions, reviews,
            and role-aware availability controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/driver-signup" variant="outline">
            Update application
          </ButtonLink>
          <span className="route-chip !border-white !bg-white !text-black">
            {providerProfile?.availability_status || "offline"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Application" value={dashboard.application?.status ?? "missing"} icon={ShieldCheck} />
        <StatCard label="Availability" value={providerProfile?.availability_status ?? "offline"} icon={BriefcaseBusiness} color="bg-white text-black" />
        <StatCard label="Active bookings" value={String(activeBookings.length)} icon={Route} />
        <StatCard label="Paid earnings" value={formatCurrency(totalEarnings)} icon={CircleDollarSign} color="bg-white text-black" />
      </div>

      {error ? (
        <div className="panel px-5 py-4 text-sm text-black">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="grid gap-6">
          <form onSubmit={handleProviderSubmit(handleSaveProviderProfile)} className="panel p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                  Provider profile
                </p>
                <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                  Availability and service fit
                </h3>
              </div>
              <TimerReset className="text-black/60" size={22} />
            </div>

            <div className="mt-8 grid gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Headline
                </label>
                <input
                  {...registerProvider("headline")}
                  className="field-shell"
                  placeholder="Verified campus and city transfer specialist"
                />
                {providerErrors.headline ? <p className="text-sm text-black">{providerErrors.headline.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Bio
                </label>
                <textarea
                  {...registerProvider("bio")}
                  rows={4}
                  className="field-shell"
                  placeholder="Share your operating zone, service style, and reliability promise."
                />
                {providerErrors.bio ? <p className="text-sm text-black">{providerErrors.bio.message}</p> : null}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Radius km
                  </label>
                  <input
                    {...registerProvider("service_radius_km", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    max={50}
                    className="field-shell"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Response min
                  </label>
                  <input
                    {...registerProvider("response_time_min", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    max={120}
                    className="field-shell"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Status
                  </label>
                  <select {...registerProvider("availability_status")} className="field-shell">
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-6" disabled={syncingProvider}>
              {syncingProvider ? "Saving settings" : "Save provider settings"}
            </Button>
          </form>

          <form onSubmit={handleRideSubmit(handleCreateRide)} className="panel p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                  Publish inventory
                </p>
                <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                  Create a live service route
                </h3>
              </div>
              <CalendarClock className="text-black/60" size={22} />
            </div>

            <div className="mt-8 grid gap-5">
              {!cityLocations.length ? (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black">
                  Complete onboarding with a primary city before publishing rides.{" "}
                  <ButtonLink to="/onboarding" variant="ghost" size="sm" className="!px-0 !py-0 align-baseline">
                    Go to onboarding
                  </ButtonLink>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Service
                </label>
                <select {...registerRide("service_id")} className="field-shell">
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Origin
                  </label>
                  <select
                    {...registerRide("origin_name")}
                    className="field-shell"
                    onChange={(event) => setRideValue("origin_name", event.target.value)}
                  >
                    {cityLocations.map((location) => (
                      <option key={location.address} value={location.address}>
                        {location.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Destination
                  </label>
                  <select
                    {...registerRide("destination_name")}
                    className="field-shell"
                    onChange={(event) => setRideValue("destination_name", event.target.value)}
                  >
                    {cityLocations.map((location) => (
                      <option key={location.address} value={location.address}>
                        {location.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Departure
                  </label>
                  <input
                    {...registerRide("departure_time")}
                    type="datetime-local"
                    className="field-shell"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Seats
                  </label>
                  <input
                    {...registerRide("seats_total", { valueAsNumber: true })}
                    type="number"
                    min={2}
                    max={8}
                    className="field-shell"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Fare per seat
                  </label>
                  <input
                    {...registerRide("fare_per_seat", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    className="field-shell"
                  />
                </div>
              </div>

              {(rideErrors.origin_name || rideErrors.destination_name || rideErrors.departure_time) ? (
                <p className="text-sm text-black">
                  {rideErrors.origin_name?.message ||
                    rideErrors.destination_name?.message ||
                    rideErrors.departure_time?.message}
                </p>
              ) : null}

              {watchedOrigin && watchedDestination ? (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  Publishing {watchedOrigin} to {watchedDestination}.
                </div>
              ) : null}
            </div>

            <Button type="submit" className="mt-6" disabled={syncingRide}>
              {syncingRide ? "Publishing route" : "Publish route"}
            </Button>
          </form>
        </div>

        <div className="grid gap-6">
          <div className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                  Live booking queue
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  Accept and progress jobs
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                <Route size={18} />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {bookings.length ? (
                bookings.slice(0, 8).map((booking) => {
                  const actions = getNextStatusActions(booking.status);

                  return (
                    <div key={booking.id} className="border-2 border-black bg-gray-100 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                            {booking.service?.name || "Service booking"} / {booking.status}
                          </p>
                          <p className="mt-2 text-sm text-black/60">
                            {booking.rider?.full_name || "Customer"} / {booking.pickup_address} to {booking.dest_address}
                          </p>
                        </div>
                        <div className="text-sm text-black/60 md:text-right">
                          <p>{formatCurrency(booking.fare_total)}</p>
                          <p className="mt-1">{formatDateTime(booking.created_at)}</p>
                        </div>
                      </div>

                      {actions.length ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {actions.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === "cancelled" ? "outline" : "primary"}
                              disabled={actingBookingId === booking.id}
                              onClick={() => void handleBookingAction(booking.id, status)}
                            >
                              {actingBookingId === booking.id ? "Updating" : status.replace("_", " ")}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  No provider-assigned bookings yet. Publish inventory and wait for riders to confirm.
                </div>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Provider health
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="border-2 border-black bg-gray-100 p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">Vehicles</p>
                <p className="mt-2 text-sm text-black/60">{dashboard.vehicles.length} linked vehicle records</p>
              </div>
              <div className="border-2 border-black bg-gray-100 p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">Scheduled routes</p>
                <p className="mt-2 text-sm text-black/60">{upcomingRides.length} upcoming live routes</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {dashboard.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="border-2 border-black bg-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                        {vehicle.color} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="mt-1 text-sm text-black/60">
                        {vehicle.license_plate} / {vehicle.year} / {vehicle.capacity} seats
                      </p>
                    </div>
                    <Car size={18} className="text-black/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Earnings and reviews
            </p>
            <div className="mt-5 grid gap-3">
              <div className="border-2 border-black bg-gray-100 p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">Paid earnings</p>
                <p className="mt-2 text-3xl font-black uppercase tracking-tight text-black">
                  {formatCurrency(totalEarnings)}
                </p>
              </div>
              <div className="border-2 border-black bg-gray-100 p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">Average rating</p>
                <div className="mt-2">
                  <RatingStars rating={providerProfile?.rating ?? 0} />
                </div>
              </div>
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-2 border-black bg-gray-100 p-4">
                  <RatingStars rating={review.rating} />
                  <p className="mt-3 text-sm leading-6 text-black/60">
                    {review.comment || "Customer left a star rating without additional notes."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
