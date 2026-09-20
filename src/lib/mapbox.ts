import { env } from "./env";
import { supabase } from "./supabase";

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

const MAPBOX_PROXY_BASE = "/functions/v1/mapbox-proxy";

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

async function mapboxFetch(path: string, params: URLSearchParams) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${MAPBOX_PROXY_BASE}${path}?${params.toString()}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Mapbox request failed");
  }

  return response.json();
}

export async function searchPlaces(query: string, proximity?: { lat: number; lng: number }) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return [] as PlaceSuggestion[];
  }

  const params = new URLSearchParams({
    autocomplete: "true",
    limit: "5",
    country: "IN",
    types: "address,place,poi",
  });

  if (proximity) {
    params.set("proximity", `${proximity.lng},${proximity.lat}`);
  }

  const payload = await mapboxFetch(
    `/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json`,
    params
  ) as {
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
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "false",
  });

  const payload = await mapboxFetch(
    `/directions/v5/mapbox/driving/${coordinates}`,
    params
  ) as {
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
  // Tile URLs still need the token in the URL for Mapbox tiles
  // This is acceptable as it's a public token with URL restrictions
  const mapboxToken = env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    return null;
  }

  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
}
