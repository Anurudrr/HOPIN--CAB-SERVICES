import * as React from "react";
import {
  Clock3,
  LocateFixed,
  MapPinned,
  Navigation,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PlaceAutocompleteInput } from "../components/booking/PlaceAutocompleteInput";
import { LazyMap } from "../components/LazyMap";
import { Button, ButtonLink } from "../components/ui/Button";
import { supportedCities, type SupportedCity } from "../lib/cities";
import { getAvailableRides } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { getRouteEstimate } from "../lib/mapbox";
import { getSavedLocations, getServiceCatalog } from "../lib/platformApi";
import { calculateBookingQuote, buildFallbackRouteEstimate } from "../lib/quote";
import { buildRideShareUrl, getRequestedRideId } from "../lib/rideShare";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { useBookingStore, type Location } from "../store/useBookingStore";
import type { Ride, SavedLocation, Service } from "../types";

const defaultCity: SupportedCity = supportedCities[0];

function isSupportedCity(value: string | null): value is SupportedCity {
  return value !== null && supportedCities.includes(value as SupportedCity);
}

function getRequestedCity(value: string | null): SupportedCity {
  return isSupportedCity(value) ? value : defaultCity;
}

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeRide,
    bookingError,
    cancelSearch,
    clearBookingError,
    currentRequest,
    isSearching,
    reset,
    selectRide,
    selectedRide,
    setDestination,
    setPickup,
    setQuoteDetails,
    setSeats,
    setSpecialInstructions,
    startSearch,
  } = useBookingStore();

  const [selectedCity, setSelectedCity] = React.useState<SupportedCity>(() =>
    getRequestedCity(searchParams.get("city")),
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
  const [searchFilter, setSearchFilter] = React.useState("");
  const [departureFilter, setDepartureFilter] = React.useState<"today" | "week" | "all">("all");
  const [sortBy, setSortBy] = React.useState<"earliest" | "lowest-fare" | "most-seats">("earliest");
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([]);
  const [loadingRides, setLoadingRides] = React.useState(true);
  const [estimatingRoute, setEstimatingRoute] = React.useState(false);
  const [loadingExtras, setLoadingExtras] = React.useState(true);
  const [ridesError, setRidesError] = React.useState<string | null>(null);
  const [sharedRideNotice, setSharedRideNotice] = React.useState<string | null>(null);
  const [quoteSummary, setQuoteSummary] = React.useState<ReturnType<typeof calculateBookingQuote> | null>(null);
  const [routeGeometry, setRouteGeometry] = React.useState<Array<[number, number]>>([]);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const requestedRideId = getRequestedRideId(searchParams.get("ride"));

  const selectedService =
    services.find((service) => service.id === (selectedServiceId || currentRequest.serviceId || selectedRide?.service_id || null)) ??
    null;

  React.useEffect(() => {
    const requestedCity = getRequestedCity(searchParams.get("city"));

    if (requestedCity !== selectedCity) {
      setSelectedCity(requestedCity);
      reset();
    }
  }, [reset, searchParams, selectedCity]);

  React.useEffect(() => {
    let active = true;
    setLoadingExtras(true);

    Promise.all([getServiceCatalog(), getSavedLocations().catch(() => [] as SavedLocation[])])
      .then(([serviceCatalog, savedLocationRows]) => {
        if (!active) {
          return;
        }

        setServices(serviceCatalog);
        setSavedLocations(savedLocationRows);
        setSelectedServiceId((current) => current ?? serviceCatalog[0]?.id ?? null);
      })
      .catch(() => {
        if (active) {
          setServices([]);
          setSavedLocations([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingExtras(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadRides = async () => {
      setLoadingRides(true);
      setRidesError(null);

      try {
        const data = await getAvailableRides(selectedCity);
        if (!isMounted) return;
        setRides(data);
      } catch (error) {
        if (!isMounted) return;
        setRides([]);
        setRidesError(error instanceof Error ? error.message : "Could not load live services.");
      } finally {
        if (isMounted) {
          setLoadingRides(false);
        }
      }
    };

    void loadRides();

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  React.useEffect(() => {
    if (loadingRides) {
      return;
    }

    if (!requestedRideId) {
      setSharedRideNotice(null);
      return;
    }

    const requestedRide = rides.find((ride) => ride.id === requestedRideId);

    if (!requestedRide) {
      setSharedRideNotice("That shared route is no longer live. Choose another service from the list.");
      return;
    }

    setSharedRideNotice(null);
    setSelectedServiceId(requestedRide.service_id ?? selectedServiceId);

    if (selectedRide?.id !== requestedRide.id) {
      selectRide(requestedRide);
    }
  }, [loadingRides, requestedRideId, rides, selectRide, selectedRide?.id, selectedServiceId]);

  React.useEffect(() => {
    if (!selectedRide) {
      setQuoteSummary(null);
      setRouteGeometry([]);
      return;
    }

    if (!currentRequest.pickup || !currentRequest.destination) {
      setPickup({
        address: selectedRide.origin_name,
        lat: selectedRide.origin_lat,
        lng: selectedRide.origin_lng,
        city: selectedRide.city as SupportedCity,
      });
      setDestination({
        address: selectedRide.destination_name,
        lat: selectedRide.destination_lat,
        lng: selectedRide.destination_lng,
        city: selectedRide.city as SupportedCity,
      });
    }
  }, [currentRequest.destination, currentRequest.pickup, selectedRide, setDestination, setPickup]);

  React.useEffect(() => {
    if (!currentRequest.pickup || !currentRequest.destination) {
      setQuoteSummary(null);
      setRouteGeometry([]);
      setQuoteDetails(null);
      return;
    }

    let active = true;
    setEstimatingRoute(true);

    const origin = { lat: currentRequest.pickup.lat, lng: currentRequest.pickup.lng };
    const destination = { lat: currentRequest.destination.lat, lng: currentRequest.destination.lng };

    void getRouteEstimate(origin, destination)
      .catch(() => buildFallbackRouteEstimate(origin, destination))
      .then((estimate) => {
        if (!active) {
          return;
        }

        const quote = calculateBookingQuote(selectedService, estimate, currentRequest.seats ?? 1);
        setQuoteSummary(quote);
        setRouteGeometry(estimate.geometry);
        setQuoteDetails(quote);
      })
      .finally(() => {
        if (active) {
          setEstimatingRoute(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    currentRequest.destination,
    currentRequest.pickup,
    currentRequest.seats,
    selectedService,
    setQuoteDetails,
  ]);

  const filteredRides = React.useMemo(() => {
    const normalizedSearch = searchFilter.trim().toLowerCase();
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const nextRides = rides
      .filter((ride) => !selectedServiceId || !ride.service_id || ride.service_id === selectedServiceId)
      .filter((ride) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${ride.origin_name} ${ride.destination_name}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .filter((ride) => {
        if (departureFilter === "all") {
          return true;
        }

        const departureTime = new Date(ride.departure_time).getTime();
        if (!Number.isFinite(departureTime)) {
          return false;
        }

        if (departureFilter === "today") {
          return departureTime >= now.getTime() && departureTime <= endOfToday.getTime();
        }

        return departureTime >= now.getTime() && departureTime <= endOfWeek.getTime();
      });

    nextRides.sort((left, right) => {
      if (sortBy === "lowest-fare") {
        return left.fare_per_seat - right.fare_per_seat;
      }

      if (sortBy === "most-seats") {
        return right.seats_available - left.seats_available;
      }

      return new Date(left.departure_time).getTime() - new Date(right.departure_time).getTime();
    });

    return nextRides;
  }, [departureFilter, rides, searchFilter, selectedServiceId, sortBy]);

  const stage = isSearching ? "matching" : activeRide ? "active" : selectedRide ? "ready" : "select";
  const routeSummaryCards = [
    `${filteredRides.length} live routes in ${selectedCity}`,
    selectedService?.name || "Choose a service",
    quoteSummary
      ? `${quoteSummary.distanceKm} km / ${quoteSummary.durationMin} min`
      : stage === "matching"
        ? "Calculating route"
        : "Route estimate pending",
  ];

  const handleBooking = async () => {
    clearBookingError();
    const booking = await startSearch();

    if (booking) {
      navigate("/dashboard");
    }
  };

  const handleCityChange = (city: SupportedCity) => {
    if (city === selectedCity) {
      return;
    }

    const nextParams = new URLSearchParams();
    nextParams.set("city", city);
    setSearchParams(nextParams, { replace: true });
  };

  const handleRideSelect = (ride: Ride) => {
    selectRide(ride);
    setSelectedServiceId(ride.service_id ?? selectedServiceId);

    const nextParams = new URLSearchParams();
    nextParams.set("city", ride.city);
    nextParams.set("ride", ride.id);
    setSearchParams(nextParams, { replace: true });
  };

  const handleReset = () => {
    reset();
    setQuoteSummary(null);
    setRouteGeometry([]);
    setQuoteDetails(null);

    const nextParams = new URLSearchParams();
    nextParams.set("city", selectedCity);
    setSearchParams(nextParams, { replace: true });
  };

  const handleShareRide = async (ride: Ride) => {
    const shareUrl = buildRideShareUrl(window.location.origin, ride);
    const shareTitle = `${ride.origin_name} to ${ride.destination_name}`;
    const shareText = `Service leaving ${new Date(ride.departure_time).toLocaleString()} with ${ride.seats_available} seats open.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `HopIn service: ${shareTitle}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Route link copied.");
        return;
      }

      throw new Error("Sharing is not supported in this browser.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error(error instanceof Error ? error.message : "Could not share that route.");
    }
  };

  const applySavedLocation = (location: SavedLocation, type: "pickup" | "destination") => {
    const nextLocation: Location = {
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      city: selectedCity,
    };

    if (type === "pickup") {
      setPickup(nextLocation);
    } else {
      setDestination(nextLocation);
    }
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: Location = {
          address: "Current location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          city: selectedCity,
        };
        setPickup(nextLocation);
        setLocationLoading(false);
        toast.success("Current location applied.");
      },
      () => {
        setLocationLoading(false);
        toast.error("Location permission was denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="section-shell pt-6">
      <div className="section-frame">
        <div className="grid gap-6 xl:grid-cols-[0.44fr_0.56fr]">
          <aside className="panel flex flex-col gap-8 p-6 md:p-8">
            <div className="space-y-5">
              <div className="eyebrow">Book a service</div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
                Compare live routes, lock your pickup, and confirm faster.
              </h1>
              <p className="text-sm leading-7 text-black/60">
                This booking flow now uses real service inventory, live route selection, current-location
                support, and fare breakdowns backed by your Supabase data model.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {supportedCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleCityChange(city)}
                  aria-pressed={selectedCity === city}
                  className={cn(
                    "route-chip",
                    selectedCity === city ? "bg-black text-white shadow-premium" : "",
                  )}
                >
                  {city}
                </button>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Service type
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {loadingExtras ? (
                  <div className="border-2 border-black bg-gray-100 px-4 py-3 text-sm text-black/60">
                    Loading services.
                  </div>
                ) : (
                  services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      className={cn(
                        "border-2 px-4 py-3 text-left shadow-soft",
                        selectedServiceId === service.id
                          ? "border-black bg-black text-white"
                          : "border-black bg-white text-black",
                      )}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]">{service.name}</p>
                      <p className="mt-1 text-xs opacity-70">{service.accent_label || service.category}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 rounded-none border-2 border-black bg-gray-100 p-5 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Search route
                  </label>
                  <input
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    className="field-shell"
                    placeholder="Origin or destination"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Departure window
                  </label>
                  <select
                    value={departureFilter}
                    onChange={(event) => setDepartureFilter(event.target.value as "today" | "week" | "all")}
                    className="field-shell"
                  >
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="all">All departures</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Sort rides
                  </label>
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as "earliest" | "lowest-fare" | "most-seats")
                    }
                    className="field-shell"
                  >
                    <option value="earliest">Earliest departure</option>
                    <option value="lowest-fare">Lowest fare</option>
                    <option value="most-seats">Most seats</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Live routes
                </p>
                <div className="mt-3 grid gap-3">
                  {loadingRides ? (
                    <div className="rounded-none border-2 border-black bg-gray-100 p-5 text-sm text-black/60">
                      Loading live services for {selectedCity}.
                    </div>
                  ) : filteredRides.length ? (
                    filteredRides.map((ride) => {
                      const isSelected = selectedRide?.id === ride.id;
                      const rideService =
                        services.find((service) => service.id === ride.service_id) ?? selectedService;

                      return (
                        <article
                          key={ride.id}
                          className={cn(
                            "rounded-none border-2 p-5 transition-colors shadow-soft",
                            isSelected
                              ? "border-black bg-white shadow-premium"
                              : "border-black bg-gray-100 hover:border-black",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleRideSelect(ride)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-black">
                                  {ride.origin_name} to {ride.destination_name}
                                </p>
                                <p className="mt-2 text-sm text-black/60">
                                  {new Date(ride.departure_time).toLocaleString()}
                                </p>
                                <p className="mt-2 text-sm text-black/60">
                                  {rideService?.name || "Live service"} / {ride.driver?.full_name || "HopIn provider"}
                                </p>
                              </div>
                              <div className="text-right text-sm text-black/60">
                                <p>{formatCurrency(ride.fare_per_seat)} / seat</p>
                                <p className="mt-2">{ride.seats_available} seats open</p>
                              </div>
                            </div>
                          </button>
                          <div className="mt-4 flex justify-between gap-3">
                            <span className="route-chip">{rideService?.accent_label || ride.city}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => void handleShareRide(ride)}
                            >
                              <Share2 size={16} />
                              Share
                            </Button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-none border-2 border-black bg-gray-100 p-5 text-sm text-black/60">
                      No live services are currently published in {selectedCity} for this category.
                    </div>
                  )}
                </div>
              </div>

              {selectedRide ? (
                <div className="rounded-none border-2 border-black bg-gray-100 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                        Selected route
                      </p>
                      <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-black">
                        {selectedService?.name || "Live service route"}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-black/60">
                        Departure {new Date(selectedRide.departure_time).toLocaleString()} / Provider{" "}
                        {selectedRide.driver?.full_name || "HopIn provider"} / Vehicle{" "}
                        {selectedRide.vehicle
                          ? `${selectedRide.vehicle.color} ${selectedRide.vehicle.make} ${selectedRide.vehicle.model}`
                          : "Details shared after booking"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 self-start"
                      onClick={() => void handleShareRide(selectedRide)}
                    >
                      <Share2 size={16} />
                      Share route
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5">
                <PlaceAutocompleteInput
                  label="Pickup"
                  city={selectedCity}
                  value={currentRequest.pickup}
                  placeholder="Search pickup point"
                  onSelect={setPickup}
                  onUseCurrentLocation={requestCurrentLocation}
                />
                <PlaceAutocompleteInput
                  label="Destination"
                  city={selectedCity}
                  value={currentRequest.destination}
                  placeholder="Search destination"
                  onSelect={setDestination}
                />
              </div>

              {savedLocations.length ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Saved places
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {savedLocations.slice(0, 6).map((location) => (
                      <div key={location.id} className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => applySavedLocation(location, "pickup")}
                          className="route-chip"
                        >
                          Pickup / {location.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => applySavedLocation(location, "destination")}
                          className="route-chip"
                        >
                          Drop / {location.label}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="booking-seats"
                    className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60"
                  >
                    Seats requested
                  </label>
                  <input
                    id="booking-seats"
                    type="number"
                    min={1}
                    max={selectedRide?.seats_available ?? 8}
                    value={currentRequest.seats ?? 1}
                    onChange={(event) => setSeats(Number(event.target.value))}
                    className="field-shell"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="booking-notes"
                    className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60"
                  >
                    Booking note
                  </label>
                  <input
                    id="booking-notes"
                    type="text"
                    maxLength={240}
                    value={currentRequest.specialInstructions ?? ""}
                    onChange={(event) => setSpecialInstructions(event.target.value)}
                    className="field-shell"
                    placeholder="Gate number, landmark, timing note"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-none border-2 border-black bg-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                      Estimated total
                    </p>
                    <p className="mt-2 text-4xl font-black uppercase tracking-tight text-black">
                      {formatCurrency(currentRequest.fareEstimate ?? 0)}
                    </p>
                    <p className="mt-2 text-sm text-black/60">
                      Live quote using service rates, route distance, ETA, and seat count.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                    <Users size={20} />
                  </div>
                </div>
                {quoteSummary ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="border-2 border-black bg-white p-4 text-sm">
                      <p className="font-black uppercase tracking-[0.14em] text-black/50">Subtotal</p>
                      <p className="mt-2 font-black uppercase tracking-[0.08em] text-black">
                        {formatCurrency(quoteSummary.subtotal)}
                      </p>
                    </div>
                    <div className="border-2 border-black bg-white p-4 text-sm">
                      <p className="font-black uppercase tracking-[0.14em] text-black/50">Fees + tax</p>
                      <p className="mt-2 font-black uppercase tracking-[0.08em] text-black">
                        {formatCurrency(quoteSummary.platformFee + quoteSummary.taxAmount)}
                      </p>
                    </div>
                    <div className="border-2 border-black bg-white p-4 text-sm">
                      <p className="font-black uppercase tracking-[0.14em] text-black/50">ETA</p>
                      <p className="mt-2 font-black uppercase tracking-[0.08em] text-black">
                        {quoteSummary.durationMin} min
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {ridesError ? (
                <div className="rounded-none border-2 border-black bg-gray-100 px-5 py-4 text-sm text-black">
                  {ridesError}
                </div>
              ) : null}

              {sharedRideNotice ? (
                <div className="rounded-none border-2 border-black bg-gray-100 px-5 py-4 text-sm text-black">
                  {sharedRideNotice}
                </div>
              ) : null}

              {bookingError ? (
                <div className="rounded-none border-2 border-black bg-gray-100 px-5 py-4 text-sm text-black">
                  {bookingError}
                </div>
              ) : null}

              {stage === "active" ? (
                <div className="rounded-none border-2 border-black bg-black p-5 text-white shadow-premium">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white">
                    Booking confirmed
                  </p>
                  <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
                    Your HopIn service is live
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white">
                    Booking {activeRide?.booking_code || activeRide?.id} / {activeRide?.pickup_address} to{" "}
                    {activeRide?.dest_address}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {stage === "active" ? (
                  <>
                    <Button size="lg" className="flex-1" onClick={() => void cancelSearch()}>
                      Cancel booking
                    </Button>
                    <ButtonLink to="/dashboard" variant="outline" size="lg" className="flex-1">
                      Open dashboard
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={() => void handleBooking()}
                      disabled={!selectedRide || isSearching || loadingRides || estimatingRoute}
                    >
                      {isSearching ? "Confirming booking" : "Confirm booking"}
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1" onClick={handleReset}>
                      Reset flow
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 rounded-none border-2 border-black bg-gray-100 p-5">
              <div className="flex items-center gap-3 text-sm text-black">
                <Clock3 size={16} className="text-black" />
                Live quotes update against route distance, ETA, and selected seat count.
              </div>
              <div className="flex items-center gap-3 text-sm text-black">
                <ShieldCheck size={16} className="text-black" />
                Provider identity, service type, and seat context stay visible during selection.
              </div>
              <div className="flex items-center gap-3 text-sm text-black">
                <MapPinned size={16} className="text-black" />
                Current location, saved places, and manual destination search all feed the same flow.
              </div>
            </div>
          </aside>

          <section className="panel relative min-h-[680px] overflow-hidden p-3">
            <div className="grid gap-3 px-3 pb-3 md:hidden">
              <div className="rounded-none border-2 border-black bg-white p-5 shadow-soft">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Route preview
                </p>
                <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-black">
                  {selectedCity} live service map
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/60">
                  Review the corridor context while comparing service inventory and custom pickup anchors.
                </p>
              </div>
              {routeSummaryCards.map((card) => (
                <div
                  key={card}
                  className="rounded-none border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-black shadow-soft"
                >
                  {card}
                </div>
              ))}
            </div>

            <div className="absolute left-8 top-8 z-20 hidden max-w-sm rounded-none border-2 border-black bg-white p-5 shadow-soft md:block">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Live route canvas
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-black">
                {selectedCity} service preview
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/60">
                The map reacts to your pickup, destination, and service selection while preserving the
                route context around the provider corridor.
              </p>
            </div>

            <div className="absolute right-8 top-8 z-20 hidden gap-3 md:grid">
              {routeSummaryCards.map((card) => (
                <div
                  key={card}
                  className="rounded-none border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-black shadow-soft"
                >
                  {card}
                </div>
              ))}
            </div>

            <div className="absolute bottom-8 left-8 right-8 z-20 hidden gap-3 md:grid md:grid-cols-3">
              <div className="rounded-none border-2 border-black bg-white px-4 py-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <Navigation size={16} />
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">
                    Route ETA
                  </p>
                </div>
                <p className="mt-3 text-lg font-black uppercase tracking-tight text-black">
                  {estimatingRoute ? "Updating..." : quoteSummary ? `${quoteSummary.durationMin} min` : "Pending"}
                </p>
              </div>
              <div className="rounded-none border-2 border-black bg-white px-4 py-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <LocateFixed size={16} />
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">
                    Pickup source
                  </p>
                </div>
                <p className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-black">
                  {locationLoading
                    ? "Locating..."
                    : currentRequest.pickup?.address || selectedRide?.origin_name || "Choose pickup"}
                </p>
              </div>
              <div className="rounded-none border-2 border-black bg-white px-4 py-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} />
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">
                    Quote status
                  </p>
                </div>
                <p className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-black">
                  {quoteSummary ? "Live and ready" : "Choose endpoints"}
                </p>
              </div>
            </div>

            <div className="min-h-[520px] md:h-full">
              <LazyMap city={selectedCity} routeGeometry={routeGeometry} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
