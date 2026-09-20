import * as React from "react";
import { supabase } from "../../lib/supabase";
import { Search, Clock, MapPin, Users, ShieldCheck, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { getServiceCatalog } from "../../lib/platformApi";
import { createRideRequest, getRideRequestStatus, cancelRideRequest, subscribeToRideRequest } from "../../lib/platformApi";
import { supportedCities, type SupportedCity } from "../../lib/cities";
import { toast } from "../../lib/toast";
import { cn } from "../../lib/utils";
import type { Service } from "../../types";
import { Button, ButtonLink } from "../ui/Button";

const poolSearchSchema = z.object({
  service_id: z.string().min(1, "Select a service"),
  pickup_address: z.string().min(3, "Enter pickup location"),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  dest_address: z.string().min(3, "Enter destination"),
  dest_lat: z.number(),
  dest_lng: z.number(),
  seats_requested: z.number().min(1).max(4),
  max_fare_per_seat: z.number().optional().nullable(),
  max_wait_minutes: z.number().min(1).max(30).default(10),
});

type PoolSearchInput = z.infer<typeof poolSearchSchema>;

interface PoolSearchProps {
  city: SupportedCity;
  onPickupSelect: (location: { address: string; lat: number; lng: number }) => void;
  onDestSelect: (location: { address: string; lat: number; lng: number }) => void;
  currentPickup?: { address: string; lat: number; lng: number } | null;
  currentDest?: { address: string; lat: number; lng: number } | null;
}

export const PoolSearch = ({
  city,
  onPickupSelect,
  onDestSelect,
  currentPickup,
  currentDest,
}: PoolSearchProps) => {
  const [services, setServices] = React.useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [requestStatus, setRequestStatus] = React.useState<"searching" | "matched" | "expired" | "cancelled" | null>(null);
  const [matchedRide, setMatchedRide] = React.useState<{
    ride_id: string;
    driver_name: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    vehicle_plate: string | null;
    seats_available: number;
    fare_per_seat: number;
    departure_time: string;
    pickup_distance_km: number;
    dropoff_distance_km: number;
    detour_minutes: number;
  } | null>(null);
  const [countdown, setCountdown] = React.useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PoolSearchInput>({
    resolver: zodResolver(poolSearchSchema),
    defaultValues: {
      seats_requested: 1,
      max_wait_minutes: 10,
    },
  });

  const watchedServiceId = watch("service_id");
  const watchedPickup = watch("pickup_address");
  const watchedDest = watch("dest_address");

  React.useEffect(() => {
    let active = true;
    getServiceCatalog()
      .then((data) => {
        if (active) {
          setServices(data);
          if (data[0]?.id) setValue("service_id", data[0].id);
        }
      })
      .finally(() => active && setLoadingServices(false));
    return () => { active = false; };
  }, [setValue]);

  React.useEffect(() => {
    if (currentPickup) {
      setValue("pickup_address", currentPickup.address);
      setValue("pickup_lat", currentPickup.lat);
      setValue("pickup_lng", currentPickup.lng);
    }
  }, [currentPickup, setValue]);

  React.useEffect(() => {
    if (currentDest) {
      setValue("dest_address", currentDest.address);
      setValue("dest_lat", currentDest.lat);
      setValue("dest_lng", currentDest.lng);
    }
  }, [currentDest, setValue]);

  React.useEffect(() => {
    if (!requestId) return;

    let active = true;
    let interval: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const result = await getRideRequestStatus(requestId);
        if (!active) return;

        setRequestStatus(result.status);

        if (result.matched && result.ride_id && !matchedRide) {
          const { data: ride } = await supabase
            .from("rides")
            .select("*, driver:profiles(full_name), vehicle:vehicles(make,model,color,license_plate)")
            .eq("id", result.ride_id)
            .single();

          if (ride) {
            setMatchedRide({
              ride_id: ride.id,
              driver_name: ride.driver?.full_name ?? null,
              vehicle_make: ride.vehicle?.make ?? null,
              vehicle_model: ride.vehicle?.model ?? null,
              vehicle_color: ride.vehicle?.color ?? null,
              vehicle_plate: ride.vehicle?.license_plate ?? null,
              seats_available: ride.seats_available,
              fare_per_seat: ride.fare_per_seat,
              departure_time: ride.departure_time,
              pickup_distance_km: 0,
              dropoff_distance_km: 0,
              detour_minutes: 0,
            });
            toast.success("🎉 Found a match! Driver assigned.");
          }
        }

        if (result.status === "expired" || result.status === "cancelled") {
          setRequestId(null);
          setRequestStatus(null);
          setMatchedRide(null);
          if (result.status === "expired") toast.error("Search expired. Try again with wider criteria.");
        }
      } catch (error) {
        console.error("Status check failed:", error);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);

    const unsubscribe = subscribeToRideRequest(requestId, (request) => {
      if (!active) return;
      setRequestStatus(request.status);
      if (request.status === "matched" && request.matched_ride_id && !matchedRide) {
        checkStatus();
      }
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [requestId, matchedRide]);

  React.useEffect(() => {
    if (!requestId || requestStatus !== "searching") return;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [requestId, requestStatus]);

  const onSearch = handleSubmit(async (values) => {
    setSearching(true);
    try {
      const result = await createRideRequest({
        city,
        ...values,
        preferred_departure: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        latest_departure: new Date(Date.now() + (values.max_wait_minutes + 5) * 60 * 1000).toISOString(),
      });
      setRequestId(result.request_id);
      setRequestStatus("searching");
      setMatchedRide(null);
      toast.success("Searching for shared rides...");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  });

  const onCancel = async () => {
    if (!requestId) return;
    try {
      await cancelRideRequest(requestId);
      setRequestId(null);
      setRequestStatus(null);
      setMatchedRide(null);
      toast.success("Search cancelled");
    } catch (error) {
      toast.error("Could not cancel search");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Pool Search
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
            Find shared rides & save up to 40%
          </h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
          <Users size={20} />
        </div>
      </div>

      {requestId && requestStatus === "searching" ? (
        <div className="space-y-4 border-2 border-black bg-yellow-50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <div>
                <p className="font-black text-black">Searching for matches...</p>
                <p className="text-sm text-black/60">We&apos;re finding drivers on your route</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums text-black">{formatTime(countdown)}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">Time remaining</p>
            </div>
          </div>
          <Button variant="outline" onClick={onCancel} className="w-full">
            <X size={16} className="mr-2" /> Cancel search
          </Button>
        </div>
      ) : matchedRide ? (
        <div className="space-y-4 border-2 border-black bg-green-50 p-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 text-green-900">
            <ShieldCheck size={24} />
            <div>
              <p className="font-black text-black">Match found!</p>
              <p className="text-sm text-black/70">Your driver has been assigned</p>
            </div>
          </div>
          <div className="border-2 border-black bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/50">Driver</p>
                <p className="font-black text-black">{matchedRide.driver_name || "Assigned"}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/50">Vehicle</p>
                <p className="font-black text-black">
                  {matchedRide.vehicle_color} {matchedRide.vehicle_make} {matchedRide.vehicle_model}
                </p>
                <p className="text-sm text-black/60">{matchedRide.vehicle_plate}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/50">Fare</p>
                <p className="text-2xl font-black text-black">{matchedRide.fare_per_seat}/seat</p>
                <p className="text-sm text-black/60">{matchedRide.seats_available} seats left</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-black/60">
              Departing: {new Date(matchedRide.departure_time).toLocaleString()}
            </p>
          </div>
          <Button className="w-full" onClick={() => { setRequestId(null); setMatchedRide(null); }}>
            Search again
          </Button>
        </div>
      ) : (
        <form onSubmit={onSearch} className="space-y-5">
          {loadingServices ? (
            <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
              Loading services...
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Service type
              </label>
              <select {...register("service_id")} className="field-shell">
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
              {errors.service_id && <p className="text-sm text-black">{errors.service_id.message}</p>}
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Pickup
              </label>
              <input
                {...register("pickup_address")}
                className="field-shell"
                placeholder="Search pickup point"
                readOnly
                value={watchedPickup || ""}
                onClick={() => onPickupSelect({ address: watchedPickup, lat: watch("pickup_lat"), lng: watch("pickup_lng") })}
              />
              <input type="hidden" {...register("pickup_lat")} />
              <input type="hidden" {...register("pickup_lng")} />
              {errors.pickup_address && <p className="text-sm text-black">{errors.pickup_address.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Destination
              </label>
              <input
                {...register("dest_address")}
                className="field-shell"
                placeholder="Search destination"
                readOnly
                value={watchedDest || ""}
                onClick={() => onDestSelect({ address: watchedDest, lat: watch("dest_lat"), lng: watch("dest_lng") })}
              />
              <input type="hidden" {...register("dest_lat")} />
              <input type="hidden" {...register("dest_lng")} />
              {errors.dest_address && <p className="text-sm text-black">{errors.dest_address.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Seats
              </label>
              <select {...register("seats_requested", { valueAsNumber: true })} className="field-shell">
                <option value={1}>1 seat</option>
                <option value={2}>2 seats</option>
                <option value={3}>3 seats</option>
                <option value={4}>4 seats</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Max wait
              </label>
              <select {...register("max_wait_minutes", { valueAsNumber: true })} className="field-shell">
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Max fare/seat (₹)
              </label>
              <input
                {...register("max_fare_per_seat", { valueAsNumber: true })}
                type="number"
                min={1}
                className="field-shell"
                placeholder="Optional"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={searching || !watchedPickup || !watchedDest}>
            <Search size={16} className="mr-2" />
            {searching ? "Searching..." : "Find shared ride"}
          </Button>

          <div className="grid gap-3 rounded-none border-2 border-black bg-gray-100 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">How it works</p>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              <li className="flex items-center gap-2"><MapPin size={14} /> We match you with drivers already on your route</li>
              <li className="flex items-center gap-2"><Clock size={14} /> Max wait: {watch("max_wait_minutes") || 10} min</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} /> Only approved drivers with verified vehicles</li>
              <li className="flex items-center gap-2"><Users size={14} /> Save up to 40% vs solo booking</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  );
};