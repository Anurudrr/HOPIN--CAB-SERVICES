import { create } from "zustand";
import { toast } from "sonner";

import type { SupportedCity } from "../lib/cities";
import { bookRide, cancelBooking } from "../lib/api";
import type { Booking, Ride } from "../types";

export interface Location {
  lng: number;
  lat: number;
  address: string;
  city?: SupportedCity;
}

export interface RideRequest {
  rideId: string;
  pickup: Location;
  destination: Location;
  seats: number;
  fareEstimate: number;
}

interface BookingState {
  currentRequest: Partial<RideRequest>;
  selectedRide: Ride | null;
  isSearching: boolean;
  activeRide: Booking | null;
  bookingError: string | null;
  clearBookingError: () => void;
  selectRide: (ride: Ride | null) => void;
  setSeats: (n: number) => void;
  startSearch: () => Promise<Booking | null>;
  cancelSearch: () => Promise<void>;
  reset: () => void;
}

function toRideLocation(ride: Ride, type: "origin" | "destination"): Location {
  if (type === "origin") {
    return {
      address: ride.origin_name,
      lat: ride.origin_lat,
      lng: ride.origin_lng,
      city: ride.city as Location["city"],
    };
  }

  return {
    address: ride.destination_name,
    lat: ride.destination_lat,
    lng: ride.destination_lng,
    city: ride.city as Location["city"],
  };
}

function clampSeats(value: number, maxSeats: number) {
  return Math.max(1, Math.min(Math.max(1, maxSeats), Number.isFinite(value) ? value : 1));
}

export const useBookingStore = create<BookingState>((set, get) => ({
  currentRequest: {
    seats: 1,
  },
  selectedRide: null,
  isSearching: false,
  activeRide: null,
  bookingError: null,
  clearBookingError: () => set({ bookingError: null }),

  selectRide: (ride) => {
    if (!ride) {
      set({
        currentRequest: { seats: 1 },
        selectedRide: null,
        activeRide: null,
        isSearching: false,
        bookingError: null,
      });
      return;
    }

    const seats = clampSeats(get().currentRequest.seats ?? 1, ride.seats_available);

    set({
      selectedRide: ride,
      currentRequest: {
        rideId: ride.id,
        pickup: toRideLocation(ride, "origin"),
        destination: toRideLocation(ride, "destination"),
        seats,
        fareEstimate: ride.fare_per_seat * seats,
      },
      activeRide: null,
      isSearching: false,
      bookingError: null,
    });
  },

  setSeats: (n) => {
    set((state) => {
      const maxSeats = state.selectedRide?.seats_available ?? 8;
      const seatCount = clampSeats(n, maxSeats);

      return {
        currentRequest: {
          ...state.currentRequest,
          seats: seatCount,
          fareEstimate: state.selectedRide ? state.selectedRide.fare_per_seat * seatCount : undefined,
        },
        activeRide: null,
        isSearching: false,
        bookingError: null,
      };
    });
  },

  startSearch: async () => {
    const { rideId, pickup, destination, seats } = get().currentRequest;
    const selectedRide = get().selectedRide;

    if (!selectedRide || !rideId) {
      const msg = "Choose a live ride before booking.";
      set({ bookingError: msg, isSearching: false, activeRide: null });
      toast.error(msg);
      return null;
    }

    if (!pickup || !destination) {
      const msg = "Ride endpoints are missing. Re-select the route and try again.";
      set({ bookingError: msg, isSearching: false, activeRide: null });
      toast.error(msg);
      return null;
    }

    const seatCount = clampSeats(seats ?? 1, selectedRide.seats_available);
    if (seatCount > selectedRide.seats_available) {
      const msg = "That ride no longer has enough seats available.";
      set({ bookingError: msg, isSearching: false, activeRide: null });
      toast.error(msg);
      return null;
    }

    set({ isSearching: true, bookingError: null });

    try {
      const booking = await bookRide(
        rideId,
        seatCount,
        pickup.address,
        pickup.lat,
        pickup.lng,
        destination.address,
        destination.lat,
        destination.lng,
      );

      set({
        activeRide: booking,
        bookingError: null,
        isSearching: false,
      });
      toast.success("Ride booked!");
      return booking;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not find a ride. Please try again.";
      set({
        isSearching: false,
        activeRide: null,
        bookingError: msg,
      });
      toast.error(msg);
      return null;
    }
  },

  cancelSearch: async () => {
    const { activeRide } = get();

    if (activeRide) {
      try {
        await cancelBooking(activeRide.id);
        toast.success("Ride cancelled.");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Could not cancel ride.";
        toast.error(msg);
        return;
      }
    }

    set({
      isSearching: false,
      activeRide: null,
      bookingError: null,
    });
  },

  reset: () =>
    set({
      currentRequest: { seats: 1 },
      selectedRide: null,
      isSearching: false,
      activeRide: null,
      bookingError: null,
    }),
}));
