import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, Compass, MapPin, Receipt, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";

import { createReview, getBookingReceipt, getNotifications, getSavedLocations, getServiceCatalog, getUserBookings } from "../../lib/platformApi";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { reviewSchema, type ReviewInput } from "../../lib/validation";
import { supabase } from "../../lib/supabase";
import { toast } from "../../lib/toast";
import type { Booking, BookingReceipt, NotificationItem, Profile, SavedLocation, Service } from "../../types";
import { Button, ButtonLink } from "../ui/Button";
import { BookingReceiptCard } from "./BookingReceiptCard";
import { BookingTimelineCard } from "./BookingTimelineCard";

interface RiderDashboardProps {
  profile: Profile | null;
}

const activeBookingStatuses: Booking["status"][] = [
  "pending",
  "accepted",
  "arriving",
  "ongoing",
  "confirmed",
  "in_progress",
];

export const RiderDashboard = ({ profile }: RiderDashboardProps) => {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<BookingReceipt | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [receiptLoading, setReceiptLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = React.useState(false);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: "",
    },
  });

  const ratingValue = watch("rating");

  const loadDashboard = React.useCallback(async () => {
    if (!profile?.id) {
      setBookings([]);
      setSavedLocations([]);
      setNotifications([]);
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [bookingRows, locationRows, notificationRows, serviceRows] = await Promise.all([
        getUserBookings(),
        getSavedLocations(),
        getNotifications(12),
        getServiceCatalog(),
      ]);

      setBookings(bookingRows);
      setSavedLocations(locationRows);
      setNotifications(notificationRows);
      setServices(serviceRows);
      setSelectedBookingId((current) => current ?? bookingRows[0]?.id ?? null);
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error
          ? dashboardError.message
          : "Could not load the customer dashboard.",
      );
      setBookings([]);
      setSavedLocations([]);
      setNotifications([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const channel = supabase
      .channel(`user-dashboard-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `rider_id=eq.${profile.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_locations",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard, profile?.id]);

  React.useEffect(() => {
    if (!selectedBookingId) {
      setReceipt(null);
      return;
    }

    let active = true;
    setReceiptLoading(true);

    void getBookingReceipt(selectedBookingId)
      .then((data) => {
        if (active) {
          setReceipt(data);
        }
      })
      .catch(() => {
        if (active) {
          setReceipt(null);
        }
      })
      .finally(() => {
        if (active) {
          setReceiptLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBookingId]);

  const activeBooking =
    bookings.find((booking) => activeBookingStatuses.includes(booking.status)) ??
    bookings[0] ??
    null;
  const completedBookings = bookings.filter((booking) => booking.status === "completed");
  const unreadNotifications = notifications.filter((notification) => !notification.is_read).length;
  const highlightedServices = services.filter((service) => service.is_featured).slice(0, 3);
  const selectedBooking =
    bookings.find((booking) => booking.id === selectedBookingId) ?? activeBooking ?? null;
  const canReview =
    selectedBooking?.status === "completed" && Boolean(selectedBooking.provider_id);

  const onSubmitReview = async (values: ReviewInput) => {
    if (!selectedBooking?.provider_id) {
      return;
    }

    setSubmittingReview(true);

    try {
      await createReview({
        bookingId: selectedBooking.id,
        providerId: selectedBooking.provider_id,
        rating: values.rating,
        comment: values.comment,
      });
      toast.success("Review submitted.");
      reset({ rating: 5, comment: "" });
      await loadDashboard();
    } catch (reviewError) {
      toast.error(reviewError instanceof Error ? reviewError.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="panel flex items-center gap-4 px-6 py-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="text-sm font-medium text-black/60">Loading your customer dashboard.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="panel p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Customer command center
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-black">
              Ready for the next move, {profile?.full_name?.split(" ")[0] || "there"}?
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60">
              Your booking flow, invoices, recommendations, and saved pickup anchors now live in one
              place instead of being split across disconnected screens.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/book" variant="outline">
              New booking
            </ButtonLink>
            <ButtonLink to="/profile">Account settings</ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">Bookings</p>
          <p className="mt-4 text-4xl font-black uppercase tracking-tight text-black">{bookings.length}</p>
          <p className="mt-3 text-sm text-black/60">Total bookings stored on your profile.</p>
        </div>
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">Completed</p>
          <p className="mt-4 text-4xl font-black uppercase tracking-tight text-black">{completedBookings.length}</p>
          <p className="mt-3 text-sm text-black/60">Trips finished and ready for review or rebook.</p>
        </div>
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">Saved places</p>
          <p className="mt-4 text-4xl font-black uppercase tracking-tight text-black">{savedLocations.length}</p>
          <p className="mt-3 text-sm text-black/60">Fast-fill anchors for pickup and destination.</p>
        </div>
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">Alerts</p>
          <p className="mt-4 text-4xl font-black uppercase tracking-tight text-black">{unreadNotifications}</p>
          <p className="mt-3 text-sm text-black/60">Unread updates from your latest booking activity.</p>
        </div>
      </div>

      {error ? (
        <div className="panel px-5 py-4 text-sm text-black">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          {activeBooking ? (
            <BookingTimelineCard booking={activeBooking} title="Live trip tracker" />
          ) : (
            <div className="panel p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Live trip tracker
              </p>
              <div className="mt-5 border-2 border-black bg-gray-100 p-5">
                <p className="text-base font-semibold text-black">No active booking yet</p>
                <p className="mt-2 text-sm leading-7 text-black/60">
                  Once you confirm a booking, the route timeline and live progress will appear here.
                </p>
              </div>
            </div>
          )}

          <div className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Booking history
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  Recent orders
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                <Clock3 size={18} />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {bookings.length ? (
                bookings.slice(0, 6).map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className={`border-2 p-4 text-left ${
                      selectedBookingId === booking.id ? "border-black bg-white shadow-premium" : "border-black bg-gray-100"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                          {booking.service?.name || "Service booking"} / {booking.status}
                        </p>
                        <p className="mt-2 text-sm text-black/60">
                          {booking.pickup_address} to {booking.dest_address}
                        </p>
                      </div>
                      <div className="text-sm text-black/60 md:text-right">
                        <p>{formatCurrency(booking.fare_total)}</p>
                        <p className="mt-1">{formatDateTime(booking.created_at)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <ButtonLink
                        to={`/book?city=${encodeURIComponent(booking.city)}`}
                        size="sm"
                        variant="outline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Rebook
                      </ButtonLink>
                    </div>
                  </button>
                ))
              ) : (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  No bookings on file yet. Book your first service to unlock invoices, QR confirmation,
                  and live status tracking.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {receiptLoading ? (
            <div className="panel animate-pulse p-6">
              <div className="h-4 w-32 bg-black/10" />
              <div className="mt-3 h-8 w-48 bg-black/10" />
              <div className="mt-6 h-48 bg-black/10" />
            </div>
          ) : receipt ? (
            <BookingReceiptCard receipt={receipt} />
          ) : null}

          <div className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Smart recommendations
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  Continue where you left off
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {highlightedServices.map((service) => (
                <div key={service.id} className="border-2 border-black bg-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                        {service.name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/60">{service.description}</p>
                    </div>
                    <span className="route-chip">{service.accent_label || service.category}</span>
                  </div>
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-black/50">
                    From {formatCurrency(service.base_fare)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Saved locations
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  Reuse your anchors
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                <MapPin size={18} />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {savedLocations.length ? (
                savedLocations.map((location) => (
                  <div key={location.id} className="border-2 border-black bg-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                        {location.label}
                      </p>
                      {location.is_default ? <span className="route-chip">Default</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-black/60">{location.address}</p>
                  </div>
                ))
              ) : (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  Save pickup anchors from your profile page to speed up repeat booking flows.
                </div>
              )}
            </div>
          </div>

          {canReview ? (
            <form onSubmit={handleSubmit(onSubmitReview)} className="panel p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Ratings and reviews
                  </p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                    Review the latest completed booking
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                  <Receipt size={18} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("rating", value)}
                    className={`border-2 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${
                      ratingValue === value ? "border-black bg-black text-white" : "border-black bg-white text-black"
                    }`}
                  >
                    {value} star
                  </button>
                ))}
              </div>
              {errors.rating ? (
                <p className="mt-3 text-sm text-black">{errors.rating.message}</p>
              ) : null}

              <div className="mt-5 space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Review note
                </label>
                <textarea
                  {...register("comment")}
                  rows={4}
                  className="field-shell"
                  placeholder="Call out provider reliability, timing, and overall experience."
                />
                {errors.comment ? (
                  <p className="text-sm text-black">{errors.comment.message}</p>
                ) : null}
              </div>

              <Button type="submit" className="mt-5" disabled={submittingReview}>
                {submittingReview ? "Submitting review" : "Submit review"}
              </Button>
            </form>
          ) : (
            <div className="panel p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Recently booked services
                  </p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                    Your repeat intent
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
                  <Compass size={18} />
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {Array.from(new Set(bookings.map((booking) => booking.service?.name).filter(Boolean)))
                  .slice(0, 4)
                  .map((name) => (
                    <div key={name} className="border-2 border-black bg-gray-100 p-4">
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-black">{name}</p>
                    </div>
                  ))}
                {!bookings.length ? (
                  <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                    Service history will appear here once you start booking through the live platform.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
