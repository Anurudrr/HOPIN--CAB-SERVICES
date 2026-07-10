import * as React from "react";

import {
  getAdminBookingQueue,
  getAdminRideQueue,
  getBackendJobRuns,
  getDriverApplicationQueue,
  getNewsletterSubscribers,
  getSupportChatEvents,
  getSupportInbox,
  reviewDriverApplication,
} from "../lib/api";
import { formatCurrency, formatDateTime } from "../lib/format";
import type {
  BackendJobRun,
  Booking,
  ContactMessage,
  DriverApplication,
  NewsletterSubscription,
  Ride,
  SupportChatEvent,
} from "../types";
import { Button, ButtonLink } from "../components/ui/Button";
import { toast } from "../lib/toast";

type AdminTab = "applications" | "support" | "newsletter" | "rides" | "bookings";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "applications", label: "Applications" },
  { id: "support", label: "Support" },
  { id: "newsletter", label: "Newsletter" },
  { id: "rides", label: "Rides" },
  { id: "bookings", label: "Bookings" },
];

function getExpireRideHealth(jobRuns: BackendJobRun[]) {
  const latestSuccess = jobRuns.find((run) => run.job_name === "expire-rides" && run.status === "success") ?? null;

  if (!latestSuccess) {
    return { healthy: false, lastRunLabel: "No successful expire-rides run recorded yet." };
  }

  const lastCompletedAt = latestSuccess.completed_at ?? latestSuccess.started_at;
  const lastRunTime = new Date(lastCompletedAt).getTime();
  const isHealthy = Number.isFinite(lastRunTime) && Date.now() - lastRunTime <= 30 * 60 * 1000;

  return {
    healthy: isHealthy,
    lastRunLabel: `Last success ${formatDateTime(lastCompletedAt)}`,
  };
}

export default function Admin() {
  const [activeTab, setActiveTab] = React.useState<AdminTab>("applications");
  const [applications, setApplications] = React.useState<DriverApplication[]>([]);
  const [supportInbox, setSupportInbox] = React.useState<ContactMessage[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = React.useState<NewsletterSubscription[]>([]);
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [supportChatEvents, setSupportChatEvents] = React.useState<SupportChatEvent[]>([]);
  const [backendJobRuns, setBackendJobRuns] = React.useState<BackendJobRun[]>([]);
  const [reviewNotes, setReviewNotes] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actingApplicationId, setActingApplicationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const hydrate = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [
        applicationRows,
        supportRows,
        newsletterRows,
        rideRows,
        bookingRows,
        supportEventRows,
        backendRunRows,
      ] = await Promise.all([
        getDriverApplicationQueue(),
        getSupportInbox(),
        getNewsletterSubscribers(),
        getAdminRideQueue(),
        getAdminBookingQueue(),
        getSupportChatEvents(20),
        getBackendJobRuns(20),
      ]);

      setApplications(applicationRows);
      setSupportInbox(supportRows);
      setNewsletterSubscribers(newsletterRows);
      setRides(rideRows);
      setBookings(bookingRows);
      setSupportChatEvents(supportEventRows);
      setBackendJobRuns(backendRunRows);
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : "Could not load admin operations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleReview = async (applicationId: string, status: "approved" | "rejected") => {
    setActingApplicationId(applicationId);
    setError(null);

    try {
      await reviewDriverApplication(applicationId, status, reviewNotes[applicationId]?.trim() || undefined);
      toast.success(`Application ${status}.`);
      await hydrate("refresh");
    } catch (reviewError) {
      const message =
        reviewError instanceof Error ? reviewError.message : "Could not review that application.";
      setError(message);
      toast.error(message);
    } finally {
      setActingApplicationId(null);
    }
  };

  const pendingApplications = applications.filter((application) => application.status === "pending").length;
  const expireRideHealth = getExpireRideHealth(backendJobRuns);

  if (loading) {
    return (
      <div className="section-shell pt-6">
        <div className="section-frame">
          <div className="panel flex items-center gap-4 px-6 py-5">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-sm font-medium text-black/60">Loading admin operations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell pt-6">
      <div className="section-frame space-y-6">
        <header className="panel-dark grid gap-5 p-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white">Admin operations</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter text-white">
              Review applications, monitor support, and inspect live platform queues.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white">
              This page is the production operations surface for approvals, inbox triage, newsletter
              growth, and ride or booking inspection.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="border-2 border-black bg-white p-4 text-black shadow-soft">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
                Pending driver applications
              </p>
              <p className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                {pendingApplications}
              </p>
            </div>
            <div className="border-2 border-black bg-white p-4 text-black shadow-soft">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
                expire-rides health
              </p>
              <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-black">
                {expireRideHealth.healthy ? "Healthy" : "Needs attention"}
              </p>
              <p className="mt-2 text-sm text-black/60">{expireRideHealth.lastRunLabel}</p>
            </div>
          </div>
        </header>

        {error ? <div className="panel px-5 py-4 text-sm text-black">{error}</div> : null}

        <div className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id ? "route-chip bg-black text-white shadow-premium" : "route-chip"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void hydrate("refresh")} disabled={refreshing}>
              {refreshing ? "Refreshing" : "Refresh data"}
            </Button>
            <ButtonLink to="/dashboard" variant="ghost">
              Back to dashboard
            </ButtonLink>
          </div>
        </div>

        {activeTab === "applications" ? (
          <section className="grid gap-4">
            {applications.length ? (
              applications.map((application) => (
                <article key={application.id} className="panel p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                        Driver application
                      </p>
                      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                        {application.license_number}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-black/60">
                        Applicant {application.user_id} / Submitted {formatDateTime(application.created_at)} /
                        License expires {formatDateTime(application.license_expiry)}
                      </p>
                    </div>
                    <span className="route-chip">{application.status}</span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                    <textarea
                      rows={3}
                      value={reviewNotes[application.id] ?? application.review_notes ?? ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      className="field-shell min-h-28"
                      placeholder="Optional review note for the driver."
                    />
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => void handleReview(application.id, "approved")}
                        disabled={actingApplicationId === application.id}
                      >
                        {actingApplicationId === application.id ? "Saving" : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleReview(application.id, "rejected")}
                        disabled={actingApplicationId === application.id}
                      >
                        {actingApplicationId === application.id ? "Saving" : "Reject"}
                      </Button>
                    </div>
                  </div>

                  {application.reviewed_at ? (
                    <p className="mt-4 text-sm text-black/60">
                      Reviewed {formatDateTime(application.reviewed_at)} by {application.reviewed_by || "unknown"}.
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="panel p-6 text-sm text-black/60">No driver applications are waiting for review.</div>
            )}
          </section>
        ) : null}

        {activeTab === "support" ? (
          <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Contact inbox
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                    Recent support requests
                  </h2>
                </div>
                <span className="route-chip">{supportInbox.length}</span>
              </div>

              <div className="mt-5 grid gap-3">
                {supportInbox.length ? (
                  supportInbox.map((message) => (
                    <article key={message.id} className="border-2 border-black bg-gray-100 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                            {message.topic}
                          </p>
                          <p className="mt-2 text-sm text-black/60">
                            {message.name} / {message.email}
                          </p>
                        </div>
                        <p className="text-sm text-black/60">{formatDateTime(message.created_at)}</p>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-black/70">{message.message}</p>
                    </article>
                  ))
                ) : (
                  <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                    No contact form submissions yet.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="panel p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                      AI support audit
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                      Recent chat events
                    </h2>
                  </div>
                  <span className="route-chip">{supportChatEvents.length}</span>
                </div>

                <div className="mt-5 grid gap-3">
                  {supportChatEvents.length ? (
                    supportChatEvents.map((event) => (
                      <article key={event.id} className="border-2 border-black bg-gray-100 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                              {event.status} / {event.model || "unknown model"}
                            </p>
                            <p className="mt-2 text-sm text-black/60">
                              User {event.user?.full_name || event.user?.email || event.user_id || "anonymous"} /
                              Messages {event.message_count}
                            </p>
                          </div>
                          <p className="text-sm text-black/60">{formatDateTime(event.created_at)}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                      No AI support audit rows yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="panel p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                      Cron health
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                      Backend job runs
                    </h2>
                  </div>
                  <span className={expireRideHealth.healthy ? "route-chip" : "route-chip bg-black text-white"}>
                    {expireRideHealth.healthy ? "Healthy" : "Alert"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {backendJobRuns.length ? (
                    backendJobRuns.map((run) => (
                      <article key={run.id} className="border-2 border-black bg-gray-100 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                              {run.job_name} / {run.status}
                            </p>
                            <p className="mt-2 text-sm text-black/60">
                              Started {formatDateTime(run.started_at)}
                              {run.completed_at ? ` / Completed ${formatDateTime(run.completed_at)}` : ""}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                      No backend job runs have been recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "newsletter" ? (
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Newsletter growth
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  Subscribers
                </h2>
              </div>
              <span className="route-chip">{newsletterSubscribers.length}</span>
            </div>

            <div className="mt-5 overflow-hidden border-2 border-black">
              {newsletterSubscribers.length ? (
                newsletterSubscribers.map((subscriber) => (
                  <div
                    key={`${subscriber.email}-${subscriber.created_at}`}
                    className="grid gap-2 border-b border-black/10 bg-white px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_auto]"
                  >
                    <span className="font-black uppercase tracking-[0.08em] text-black">{subscriber.email}</span>
                    <span className="text-black/60">{formatDateTime(subscriber.created_at)}</span>
                  </div>
                ))
              ) : (
                <div className="bg-gray-100 px-4 py-5 text-sm text-black/60">
                  No newsletter subscribers yet.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "rides" ? (
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">Ride queue</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  All live and historical rides
                </h2>
              </div>
              <span className="route-chip">{rides.length}</span>
            </div>

            <div className="mt-5 grid gap-3">
              {rides.length ? (
                rides.map((ride) => (
                  <article key={ride.id} className="border-2 border-black bg-gray-100 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                          {ride.origin_name} to {ride.destination_name}
                        </p>
                        <p className="mt-2 text-sm text-black/60">
                          {ride.city} / Driver {ride.driver?.full_name || ride.driver_id || "unassigned"}
                        </p>
                      </div>
                      <div className="text-sm text-black/60 md:text-right">
                        <p>{formatCurrency(ride.fare_per_seat)} / seat</p>
                        <p className="mt-1">{formatDateTime(ride.departure_time)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="route-chip">{ride.status}</span>
                      <span className="route-chip">Seats {ride.seats_available}/{ride.seats_total}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  No rides found.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "bookings" ? (
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Booking queue
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                  All bookings
                </h2>
              </div>
              <span className="route-chip">{bookings.length}</span>
            </div>

            <div className="mt-5 grid gap-3">
              {bookings.length ? (
                bookings.map((booking) => (
                  <article key={booking.id} className="border-2 border-black bg-gray-100 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                          {booking.booking_code || booking.id} / {booking.status}
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="route-chip">Seats {booking.seats}</span>
                      <span className="route-chip">Driver {booking.driver_name || booking.driver_id || "pending"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                  No bookings found.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
