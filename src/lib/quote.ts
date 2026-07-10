import type { RouteEstimate } from "./mapbox";
import type { Service } from "../types";

interface Coordinates {
  lat: number;
  lng: number;
}

export interface BookingQuote {
  subtotal: number;
  platformFee: number;
  taxAmount: number;
  total: number;
  distanceKm: number;
  durationMin: number;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates) {
  const earthRadiusKm = 6371;
  const latDistance = toRadians(destination.lat - origin.lat);
  const lngDistance = toRadians(destination.lng - origin.lng);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(1));
}

export function buildFallbackRouteEstimate(origin: Coordinates, destination: Coordinates): RouteEstimate {
  const distanceKm = calculateDistanceKm(origin, destination);

  return {
    distanceKm,
    durationMin: Math.max(5, Math.round(distanceKm * 4.5)),
    geometry: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
  };
}

export function calculateBookingQuote(service: Service | null, route: RouteEstimate, seats: number): BookingQuote {
  const seatCount = Math.max(1, seats);
  const baseFare = Number(service?.base_fare ?? 120);
  const pricePerKm = Number(service?.price_per_km ?? 18);
  const pricePerMinute = Number(service?.price_per_minute ?? 2);
  const subtotalPerSeat = baseFare + route.distanceKm * pricePerKm + route.durationMin * pricePerMinute;
  const subtotal = Number((subtotalPerSeat * seatCount).toFixed(2));
  const platformFee = Number((subtotal * 0.08).toFixed(2));
  const taxAmount = Number((subtotal * 0.05).toFixed(2));

  return {
    subtotal,
    platformFee,
    taxAmount,
    total: Number((subtotal + platformFee + taxAmount).toFixed(2)),
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
  };
}
