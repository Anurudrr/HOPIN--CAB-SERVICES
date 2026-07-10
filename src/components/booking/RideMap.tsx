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
const providerIcon = createCustomIcon("#000000", "#FFFFFF", 18);

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

function interpolatePosition(
  routeGeometry: Array<[number, number]>,
  progress = 0,
): [number, number] | null {
  if (routeGeometry.length < 2) {
    return null;
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const segments = routeGeometry.slice(1).map((point, index) => {
    const start = routeGeometry[index];
    const distance = Math.hypot(point[0] - start[0], point[1] - start[1]);

    return {
      start,
      end: point,
      distance,
    };
  });
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);

  if (totalDistance === 0) {
    return routeGeometry[0];
  }

  const targetDistance = totalDistance * clampedProgress;
  let coveredDistance = 0;

  for (const segment of segments) {
    const nextDistance = coveredDistance + segment.distance;

    if (targetDistance <= nextDistance) {
      const segmentProgress =
        segment.distance === 0 ? 0 : (targetDistance - coveredDistance) / segment.distance;
      const lat = segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress;
      const lng = segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress;

      return [lat, lng];
    }

    coveredDistance = nextDistance;
  }

  return routeGeometry[routeGeometry.length - 1];
}

export const RideMap = ({
  city,
  routeGeometry = [],
}: {
  city: City;
  routeGeometry?: Array<[number, number]>;
}) => {
  const { activeRide, currentRequest, selectedRide } = useBookingStore();
  const { pickup, destination } = currentRequest;
  const [progress, setProgress] = React.useState(0.15);
  const defaultPos = cityCenters[city];
  const pathGeometry = React.useMemo(() => {
    if (routeGeometry.length >= 2) {
      return routeGeometry;
    }

    if (!pickup || !destination) {
      return [];
    }

    return [
      [pickup.lat, pickup.lng] as [number, number],
      [destination.lat, destination.lng] as [number, number],
    ];
  }, [destination, pickup, routeGeometry]);

  React.useEffect(() => {
    if (!pickup || !destination || !selectedRide) {
      setProgress(0.15);
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const step = activeRide ? 0.035 : 0.02;
        const next = current + step;
        return next >= 0.92 ? 0.12 : next;
      });
    }, activeRide ? 1800 : 2400);

    return () => window.clearInterval(interval);
  }, [activeRide, destination, pickup, selectedRide]);

  const providerPosition = interpolatePosition(pathGeometry, progress);

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

      {pickup ? (
        <>
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Pickup: {pickup.address}</Popup>
          </Marker>
          <Circle
            center={[pickup.lat, pickup.lng]}
            radius={110}
            pathOptions={{ color: "#FFFFFF", weight: 1, fillOpacity: 0.08 }}
          />
        </>
      ) : null}

      {destination ? (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>Destination: {destination.address}</Popup>
        </Marker>
      ) : null}

      {pathGeometry.length >= 2 ? (
        <>
          <Polyline
            positions={pathGeometry}
            color="#FFFFFF"
            weight={4}
            opacity={0.85}
            dashArray={activeRide ? undefined : "10, 10"}
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
            {activeRide ? "Live provider tracking" : "Provider preview"} {selectedRide?.driver?.full_name ? `for ${selectedRide.driver.full_name}` : ""}
          </Popup>
        </Marker>
      ) : null}

      <RecenterMap
        city={city}
        pickup={pickup}
        destination={destination}
        providerPosition={providerPosition}
        routeGeometry={pathGeometry}
      />
    </MapContainer>
  );
};
