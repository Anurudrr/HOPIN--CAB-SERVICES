import * as React from "react";
import { CalendarClock, Car, CheckCircle2, Route, ShieldCheck } from "lucide-react";

import { bookingLocations } from "../../content/siteContent";
import {
  cancelDriverRide,
  completeDriverRide,
  createDriverRide,
  getDriverDashboardData,
  startDriverRide,
} from "../../lib/api";
import { getErrorMessage, logDevError } from "../../lib/errors";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import type { DriverDashboardData, Ride } from "../../types";
import { Button, ButtonLink } from "../ui/Button";
import { StatCard } from "./StatCard";

const emptyDashboard: DriverDashboardData = {
  application: null,
  vehicles: [],
  rides: [],
};

export const DriverDashboard = () => {
  const profile = useAuthStore((state) => state.profile);
  const [dashboard, setDashboard] = React.useState<DriverDashboardData>(emptyDashboard);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [actingRideId, setActingRideId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const cityLocations = React.useMemo(
    () => bookingLocations.filter((location) => location.city === profile?.city),
    [profile?.city],
  );
  const [rideForm, setRideForm] = React.useState({
    origin: "",
    destination: "",
    departure_time: "",
    seats_total: "4",
    fare_per_seat: "180",
  });

  const loadDashboard = React.useCallback(async () => {
    if (!profile?.id) {
      setDashboard(emptyDashboard);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getDriverDashboardData();
      setDashboard(data);
    } catch (dashboardError) {
      logDevError("DriverDashboard.load", dashboardError);
      setError(getErrorMessage(dashboardError, "Could not load the driver dashboard."));
      setDashboard(emptyDashboard);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('driver-rides-' + profile.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `driver_id=eq.${profile.id}`,
      }, () => { void loadDashboard() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `driver_id=eq.${profile.id}`,
      }, () => { void loadDashboard() })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [profile?.id, loadDashboard])

  React.useEffect(() => {
    if (!cityLocations.length) {
      return;
    }

    setRideForm((current) => ({
      origin: current.origin || cityLocations[0]?.address || "",
      destination: current.destination || cityLocations[1]?.address || cityLocations[0]?.address || "",
      departure_time: current.departure_time,
      seats_total: current.seats_total,
      fare_per_seat: current.fare_per_seat,
    }));
  }, [cityLocations]);

  const handleCreateRide = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.city) {
      setError("Complete onboarding before publishing a ride.");
      return;
    }

    if (!dashboard.application) {
      setError("Submit a driver application before publishing rides.");
      return;
    }

    if (dashboard.application.status !== "approved") {
      setError("Your driver application must be approved before you can publish rides.");
      return;
    }

    const origin = cityLocations.find((location) => location.address === rideForm.origin);
    const destination = cityLocations.find((location) => location.address === rideForm.destination);

    if (!origin || !destination || origin.address === destination.address) {
      setError("Choose two different route points in your city.");
      return;
    }

    if (!rideForm.departure_time) {
      setError("Add a departure time before publishing.");
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      await createDriverRide({
        origin_name: origin.address,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        city: profile.city,
        departure_time: new Date(rideForm.departure_time).toISOString(),
        seats_total: Number(rideForm.seats_total) || 4,
        fare_per_seat: Number(rideForm.fare_per_seat) || 0,
      });

      setRideForm((current) => ({
        ...current,
        departure_time: "",
      }));
      await loadDashboard();
    } catch (submissionError) {
      logDevError("DriverDashboard.createRide", submissionError);
      setError(getErrorMessage(submissionError, "Could not publish that ride."));
    } finally {
      setSyncing(false);
    }
  };

  const handleRideAction = async (ride: Ride, action: "start" | "complete" | "cancel") => {
    setActingRideId(ride.id);
    setError(null);

    try {
      if (action === "start") {
        await startDriverRide(ride.id);
      } else if (action === "complete") {
        await completeDriverRide(ride.id);
      } else {
        await cancelDriverRide(ride.id);
      }

      await loadDashboard();
    } catch (actionError) {
      logDevError(`DriverDashboard.${action}Ride`, actionError);
      setError(getErrorMessage(actionError, "Could not update that ride."));
    } finally {
      setActingRideId(null);
    }
  };

  const upcomingRides = dashboard.rides.filter((ride) => ride.status === "scheduled");
  const completedRides = dashboard.rides.filter((ride) => ride.status === "completed");
  const openSeats = upcomingRides.reduce((total, ride) => total + ride.seats_available, 0);
  const applicationStatus = dashboard.application?.status ?? "missing";
  const canPublishRide = applicationStatus === "approved";

  if (loading) {
    return (
      <div className="panel flex items-center gap-4 px-6 py-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="text-sm font-medium text-black/60">Loading driver operations.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="panel-dark flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white">
            Driver operations
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-white">
            Publish corridor rides from your {profile?.city || "assigned"} network.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white">
            Your application, vehicle record, and ride operations now flow through the
            Supabase backend and its server-side function layer.
          </p>
        </div>
        <ButtonLink to="/driver-signup" variant="outline">
          Update driver details
        </ButtonLink>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Application" value={applicationStatus} icon={ShieldCheck} />
        <StatCard label="Vehicles" value={String(dashboard.vehicles.length)} icon={Car} color="bg-white text-black" />
        <StatCard label="Scheduled rides" value={String(upcomingRides.length)} icon={Route} />
        <StatCard label="Open seats" value={String(openSeats)} icon={CheckCircle2} color="bg-white text-black" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                Publish a ride
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Schedule a shared route
              </h3>
            </div>
            <CalendarClock className="text-black/60" size={22} />
          </div>

          {!profile?.city ? (
            <div className="mt-8 rounded-none border-2 border-black bg-gray-100 p-5">
              <p className="text-sm text-black/60">
                Complete onboarding and add a primary city before publishing rides.
              </p>
            </div>
          ) : !dashboard.application ? (
            <div className="mt-8 rounded-none border-2 border-black bg-gray-100 p-5">
              <p className="text-sm text-black/60">
                Submit a driver application before publishing rides from this account.
              </p>
            </div>
          ) : !canPublishRide ? (
            <div className="mt-8 rounded-none border-2 border-black bg-gray-100 p-5">
              <p className="text-sm text-black/60">
                Driver application status: {applicationStatus}. Ride publishing stays locked until
                the application is approved and your account is activated as a driver.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateRide} className="mt-8 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="ride-origin" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Origin
                  </label>
                  <select
                    id="ride-origin"
                    value={rideForm.origin}
                    onChange={(event) => setRideForm((current) => ({ ...current, origin: event.target.value }))}
                    className="field-shell"
                  >
                    <option value="">Select an origin</option>
                    {cityLocations.map((location) => (
                      <option key={location.address} value={location.address}>
                        {location.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="ride-destination" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Destination
                  </label>
                  <select
                    id="ride-destination"
                    value={rideForm.destination}
                    onChange={(event) => setRideForm((current) => ({ ...current, destination: event.target.value }))}
                    className="field-shell"
                  >
                    <option value="">Select a destination</option>
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
                  <label htmlFor="ride-departure" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Departure time
                  </label>
                  <input
                    id="ride-departure"
                    type="datetime-local"
                    value={rideForm.departure_time}
                    onChange={(event) => setRideForm((current) => ({ ...current, departure_time: event.target.value }))}
                    className="field-shell"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="ride-seats" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Seats
                  </label>
                  <input
                    id="ride-seats"
                    type="number"
                    min={1}
                    max={8}
                    value={rideForm.seats_total}
                    onChange={(event) => setRideForm((current) => ({ ...current, seats_total: event.target.value }))}
                    className="field-shell"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="ride-fare" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Fare per seat
                  </label>
                  <input
                    id="ride-fare"
                    type="number"
                    min={1}
                    value={rideForm.fare_per_seat}
                    onChange={(event) => setRideForm((current) => ({ ...current, fare_per_seat: event.target.value }))}
                    className="field-shell"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" disabled={syncing}>
                {syncing ? "Publishing ride" : "Publish ride"}
              </Button>
            </form>
          )}

          {error ? <p className="mt-5 text-sm font-medium text-black">{error}</p> : null}
        </div>

        <div className="grid gap-6">
          <div className="panel p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Vehicles
            </p>
            <div className="mt-5 grid gap-3">
              {dashboard.vehicles.length ? (
                dashboard.vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="rounded-none border-2 border-black bg-gray-100 p-5"
                  >
                    <p className="text-sm font-semibold text-black">
                      {vehicle.color} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {vehicle.license_plate} / {vehicle.year} / {vehicle.capacity} seats
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-none border-2 border-black bg-gray-100 p-5">
                  <p className="text-sm text-black/60">
                    No vehicle records are attached yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="panel p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Ride inventory
            </p>
            <div className="mt-5 grid gap-3">
              {dashboard.rides.length ? (
                dashboard.rides.map((ride: Ride) => (
                  <div
                    key={ride.id}
                    className="rounded-none border-2 border-black bg-gray-100 p-5"
                  >
                    <p className="text-sm font-semibold text-black">
                      {ride.origin_name} to {ride.destination_name}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {new Date(ride.departure_time).toLocaleString()} / {ride.status} /{" "}
                      {ride.seats_available} seats open
                    </p>
                    {ride.started_at ? (
                      <p className="mt-1 text-sm text-black/60">
                        Started: {new Date(ride.started_at).toLocaleString()}
                      </p>
                    ) : null}
                    {ride.completed_at ? (
                      <p className="mt-1 text-sm text-black/60">
                        Completed: {new Date(ride.completed_at).toLocaleString()}
                      </p>
                    ) : null}
                    {ride.cancelled_at ? (
                      <p className="mt-1 text-sm text-black/60">
                        Cancelled: {new Date(ride.cancelled_at).toLocaleString()}
                        {ride.cancel_reason ? ` / ${ride.cancel_reason}` : ""}
                      </p>
                    ) : null}
                    {ride.status === "scheduled" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          disabled={actingRideId === ride.id}
                          onClick={() => void handleRideAction(ride, "start")}
                        >
                          {actingRideId === ride.id ? "Updating ride" : "Start ride"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actingRideId === ride.id}
                          onClick={() => void handleRideAction(ride, "cancel")}
                        >
                          Cancel ride
                        </Button>
                      </div>
                    ) : null}
                    {ride.status === "active" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          disabled={actingRideId === ride.id}
                          onClick={() => void handleRideAction(ride, "complete")}
                        >
                          {actingRideId === ride.id ? "Updating ride" : "Complete ride"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actingRideId === ride.id}
                          onClick={() => void handleRideAction(ride, "cancel")}
                        >
                          Cancel ride
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-none border-2 border-black bg-gray-100 p-5">
                  <p className="text-sm text-black/60">
                    No rides have been published from this account yet.
                  </p>
                </div>
              )}
              {completedRides.length ? (
                <p className="text-sm text-black/60">
                  Completed rides on file: {completedRides.length}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

