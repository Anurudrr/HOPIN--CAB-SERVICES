import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAvailableRides, createDriverRide, startDriverRide, completeDriverRide, cancelDriverRide } from '../lib/api';
import type { Ride, RideInput } from '../types';

export function useAvailableRides(city: string) {
  return useQuery({
    queryKey: ['rides', 'available', city],
    queryFn: () => getAvailableRides(city),
    enabled: !!city && city.length > 0,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useCreateDriverRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RideInput) => createDriverRide(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
    },
  });
}

export function useStartDriverRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rideId: string) => startDriverRide(rideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['rides', 'available'] });
    },
  });
}

export function useCompleteDriverRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rideId: string) => completeDriverRide(rideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['rides', 'available'] });
    },
  });
}

export function useCancelDriverRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason?: string }) => cancelDriverRide(rideId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['rides', 'available'] });
    },
  });
}

export function useRideById(rideId: string) {
  return useQuery({
    queryKey: ['rides', 'byId', rideId],
    queryFn: async () => {
      const rides = await getAvailableRides('');
      return rides.find(r => r.id === rideId) ?? null;
    },
    enabled: !!rideId,
  });
}