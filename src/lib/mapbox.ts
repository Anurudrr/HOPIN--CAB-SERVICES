import { env } from "./env";

export interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
  geometry: Array<[number, number]>;
}

const mapboxToken = env.MAPBOX_ACCESS_TOKEN;

function toPlaceSuggestion(feature: {
  id: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
}): PlaceSuggestion | null {
  if (!feature.center) {
    return null;
  }

  return {
    id: feature.id,
    name: feature.text || feature.place_name || "Location",
    address: feature.place_name || feature.text || "Location",
    lng: feature.center[0],
    lat: feature.center[1],
  };
}

export async function searchPlaces(query: string, proximity?: { lat: number; lng: number }) {
  const trimmedQuery = query.trim();

  if (!mapboxToken || trimmedQuery.length < 3) {
    return [] as PlaceSuggestion[];
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    limit: "5",
    country: "IN",
    types: "address,place,poi",
  });

  if (proximity) {
    params.set("proximity", `${proximity.lng},${proximity.lat}`);
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Could not search locations right now.");
  }

  const payload = (await response.json()) as {
    features?: Array<{
      id: string;
      place_name?: string;
      text?: string;
      center?: [number, number];
    }>;
  };

  return (payload.features ?? [])
    .map(toPlaceSuggestion)
    .filter((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion));
}

export async function getRouteEstimate(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  if (!mapboxToken) {
    throw new Error("Map services are not configured.");
  }

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: mapboxToken,
    geometries: "geojson",
    overview: "full",
    steps: "false",
  });

  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Could not load route details right now.");
  }

  const payload = (await response.json()) as {
    routes?: Array<{
      distance?: number;
      duration?: number;
      geometry?: {
        coordinates?: Array<[number, number]>;
      };
    }>;
  };

  const route = payload.routes?.[0];

  if (!route?.distance || !route.duration) {
    throw new Error("A route could not be found for those locations.");
  }

  return {
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    geometry: (route.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng] as [number, number]),
  } satisfies RouteEstimate;
}

export function getMapboxTileUrl() {
  if (!mapboxToken) {
    return null;
  }

  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
}
