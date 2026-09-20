import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServiceCatalog, getSavedLocations, saveLocation, deleteLocation } from '../lib/platformApi';
import type { Service, SavedLocation } from '../types';

export function useServiceCatalog() {
  return useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: getServiceCatalog,
    staleTime: 5 * 60 * 1000,
  });
}

export function useServicesByCategory(category: string) {
  return useQuery({
    queryKey: ['services', 'category', category],
    queryFn: async () => {
      const services = await getServiceCatalog();
      return services.filter(s => s.category === category);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!category,
  });
}

export function useSavedLocations() {
  return useQuery({
    queryKey: ['savedLocations'],
    queryFn: getSavedLocations,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (location: Omit<SavedLocation, 'id' | 'user_id' | 'created_at'>) => saveLocation(location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedLocations'] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) => deleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedLocations'] });
    },
  });
}