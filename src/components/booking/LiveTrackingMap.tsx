import * as React from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getMapboxTileUrl } from "../../lib/mapbox";
import { supportedCities } from "../../lib/cities";
import { type Location, useBookingStore } from "../../store/useBookingStore";
import { subscribeToDriverLocation, getDriverLocationForBooking, getNearbyDrivers } from "../../lib/platformApi";
import type { DriverLocation } from "../../types";
import { supabase } from "../../lib/supabase";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as typeof L.Icon.Default.prototype & { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type City = (typeof supportedCities)[number];

const cityCenters: Record<City, [number, number]> = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
};

const mapboxTileUrl = getMapboxTileUrl();
const usesMapboxTiles = Boolean(mapboxTileUrl);
const tileUrl = mapboxTileUrl ?? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const tileAttribution = mapboxTileUrl
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const createCustomIcon = (background: string, border: string, size = 24) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${background};width:${size}px;height:${size}px;border-radius:999px;border:2px solid ${border};box-shadow:0 0 0 1px rgba(0,0,0,0.45),0 10px 24px rgba(0,0,0,0.28);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const pickupIcon = createCustomIcon("#FFFFFF", "#000000", 22);
const destinationIcon = createCustomIcon("#9CA3AF", "#FFFFFF", 22);
const providerIcon = createCustomIcon("#000000", "#FFFFFF", 24);
const nearbyDriverIcon = createCustomIcon("#10B981", "#FFFFFF", 20);

const RecenterMap = ({
  city,
  pickup,
  destination,
  providerPosition,
  routeGeometry,
}: {
  city: City;
  pickup?: Location;
  destination?: Location;
  providerPosition?: [number, number] | null;
  routeGeometry?: Array<[number, number]>;
}) => {
  const map = useMap();

  React.useEffect(() => {
    const points = [
      ...(routeGeometry ?? []),
      pickup ? ([pickup.lat, pickup.lng] as [number, number]) : null,
      destination ? ([destination.lat, destination.lng] as [number, number]) : null,
      providerPosition ?? null,
    ].filter(Boolean) as [number, number][];

    if (points.length >= 2) {
      map.fitBounds(points, { padding: [50, 50] });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    } else {
      map.setView(cityCenters[city], 12);
    }
  }, [city, destination, map, pickup, providerPosition, routeGeometry]);

  return null;
};

interface LiveTrackingMapProps {
  city: City;
  routeGeometry?: Array<[number, number]>;
  bookingId?: string;
  showNearbyDrivers?: boolean;
  pickup?: Location;
  destination?: Location;
}

export const LiveTrackingMap = ({
  city,
  routeGeometry = [],
  bookingId,
  showNearbyDrivers = false,
  pickup,
  destination,
}: LiveTrackingMapProps) => {
  const { activeRide, currentRequest, selectedRide } = useBookingStore();
  const [driverLocation, setDriverLocation] = React.useState<DriverLocation | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = React.useState<DriverLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const defaultPos = cityCenters[city];
  const effectivePickup = pickup ?? currentRequest.pickup;
  const effectiveDestination = destination ?? currentRequest.destination;

  const pathGeometry = React.useMemo(() => {
    if (routeGeometry.length >= 2) {
      return routeGeometry;
    }

    if (!effectivePickup || !effectiveDestination) {
      return [];
    }

    return [
      [effectivePickup.lat, effectivePickup.lng] as [number, number],
      [effectiveDestination.lat, effectiveDestination.lng] as [number, number],
    ];
  }, [effectiveDestination, effectivePickup, routeGeometry]);

  React.useEffect(() => {
    let mounted = true;

    const loadInitialLocation = async () => {
      if (bookingId) {
        const location = await getDriverLocationForBooking(bookingId);
        if (mounted && location) {
          setDriverLocation(location);
        }
      }
      setIsLoading(false);
    };

    loadInitialLocation();

    if (bookingId) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("driver_id, status")
        .eq("id", bookingId)
        .single();

      if (booking?.driver_id && ["accepted", "arriving", "ongoing", "in_progress", "confirmed"].includes(booking.status)) {
        const unsubscribe = subscribeToDriverLocation(booking.driver_id, (location) => {
          if (mounted) {
            setDriverLocation(location);
          }
        });

        return () => {
          mounted = false;
          unsubscribe();
        };
      }
    }

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  React.useEffect(() => {
    if (!showNearbyDrivers || !effectivePickup) return;

    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    const fetchNearby = async () => {
      try {
        const { getNearbyDrivers } = await import("../../lib/platformApi");
        const drivers = await getNearbyDrivers({
          lat: effectivePickup.lat,
          lng: effectivePickup.lng,
          radius_km: 5,
          limit: 10,
        });
        if (mounted) {
          setNearbyDrivers(drivers);
        }
      } catch (error) {
        console.error("Failed to fetch nearby drivers:", error);
      }
    };

    fetchNearby();
    interval = setInterval(fetchNearby, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showNearbyDrivers, effectivePickup]);

  const providerPosition = driverLocation
    ? ([driverLocation.lat, driverLocation.lng] as [number, number])
    : null;

  const isActive = activeRide && bookingId && ["accepted", "arriving", "ongoing", "in_progress", "confirmed"].includes(activeRide.status);

  return (
    <MapContainer
      center={defaultPos}
      zoom={12}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution={tileAttribution}
        url={tileUrl}
        tileSize={usesMapboxTiles ? 512 : 256}
        zoomOffset={usesMapboxTiles ? -1 : 0}
      />
      <ZoomControl position="bottomright" />

      {effectivePickup ? (
        <>
          <Marker position={[effectivePickup.lat, effectivePickup.lng]} icon={pickupIcon}>
            <Popup>Pickup: {effectivePickup.address}</Popup>
          </Marker>
          <Circle
            center={[effectivePickup.lat, effectivePickup.lng]}
            radius={110}
            pathOptions={{ color: "#FFFFFF", weight: 1, fillOpacity: 0.08 }}
          />
        </>
      ) : null}

      {effectiveDestination ? (
        <Marker position={[effectiveDestination.lat, effectiveDestination.lng]} icon={destinationIcon}>
          <Popup>Destination: {effectiveDestination.address}</Popup>
        </Marker>
      ) : null}

      {pathGeometry.length >= 2 ? (
        <>
          <Polyline
            positions={pathGeometry}
            color="#FFFFFF"
            weight={4}
            opacity={0.85}
            dashArray={isActive ? undefined : "10, 10"}
          />
          <Polyline
            positions={pathGeometry}
            color="#000000"
            weight={8}
            opacity={0.15}
          />
        </>
      ) : null}

      {providerPosition ? (
        <Marker position={providerPosition} icon={providerIcon}>
          <Popup>
            {isActive ? "🚗 Your driver" : "Provider preview"}
            {driverLocation?.full_name ? ` - ${driverLocation.full_name}` : ""}
            {driverLocation?.vehicle_make && ` · ${driverLocation.vehicle_color} ${driverLocation.vehicle_make} ${driverLocation.vehicle_model}`}
            {driverLocation?.vehicle_plate && ` · ${driverLocation.vehicle_plate}`}
            {driverLocation?.heading !== null && driverLocation?.speed_kmh !== null && (
              <>
                <br />
                Heading: {Math.round(driverLocation.heading)}° · {Math.round(driverLocation.speed_kmh)} km/h
              </>
            )}
            {driverLocation?.accuracy_meters && (
              <br />Accuracy: ±{Math.round(driverLocation.accuracy_meters)}m
            )}
            <br />
            Updated: {new Date(driverLocation.updated_at).toLocaleTimeString()}
          </Popup>
        </Marker>
      ) : null}

      {showNearbyDrivers && nearbyDrivers.map((driver) => (
        <Marker
          key={driver.driver_id}
          position={[driver.lat, driver.lng]}
          icon={nearbyDriverIcon}
        >
          <Popup>
            🚗 {driver.full_name || "Available driver"}
            {driver.vehicle_make && ` · ${driver.vehicle_color} ${driver.vehicle_make} ${driver.vehicle_model}`}
            {driver.distance_km !== undefined && <br />{driver.distance_km.toFixed(1)} km away}
            <br />
            Updated: {new Date(driver.updated_at).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}

      <RecenterMap
        city={city}
        pickup={effectivePickup}
        destination={effectiveDestination}
        providerPosition={providerPosition}
        routeGeometry={pathGeometry}
      />
    </MapContainer>
  );
};

export { LiveTrackingMap };