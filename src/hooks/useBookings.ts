import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookRide, cancelBooking, getRiderDashboardData, getDriverDashboardData } from '../lib/api';
import type { Booking, BookRideInput } from '../types';

export function useBookRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BookRideInput) => bookRide(input),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'rider'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
      queryClient.setQueryData(['bookings', 'byId', booking.id], booking);
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'rider'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
      queryClient.removeQueries({ queryKey: ['bookings', 'byId', bookingId] });
    },
  });
}

export function useRiderBookings() {
  return useQuery({
    queryKey: ['bookings', 'rider'],
    queryFn: getRiderDashboardData,
    staleTime: 30000,
  });
}

export function useDriverDashboard() {
  return useQuery({
    queryKey: ['driver', 'dashboard'],
    queryFn: getDriverDashboardData,
    staleTime: 30000,
  });
}

export function useBookingById(bookingId: string) {
  return useQuery({
    queryKey: ['bookings', 'byId', bookingId],
    queryFn: async () => {
      const { data } = await import('../lib/api');
      return data as Promise<Booking | null>;
    },
    enabled: !!bookingId,
    staleTime: 30000,
  });
}

export function useActiveBooking() {
  return useQuery({
    queryKey: ['bookings', 'active'],
    queryFn: async () => {
      const { data } = await getRiderDashboardData();
      return data.recentBookings.find((b: Booking) => 
        ['pending', 'accepted', 'arriving', 'ongoing'].includes(b.status)
      ) ?? null;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}