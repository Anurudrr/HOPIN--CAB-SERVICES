import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDriverApplicationQueue, 
  getAdminRideQueue, 
  getAdminBookingQueue,
  getSupportInbox,
  getNewsletterSubscribers,
  getSupportChatEvents,
  getBackendJobRuns,
  reviewDriverApplication,
} from '../lib/api';
import type { DriverApplication, DriverApplicationStatus, Ride, Booking, ContactMessage, NewsletterSubscription, SupportChatEvent, BackendJobRun } from '../types';

export function useDriverApplications() {
  return useQuery({
    queryKey: ['admin', 'driverApplications'],
    queryFn: getDriverApplicationQueue,
    staleTime: 30000,
  });
}

export function useAdminRides() {
  return useQuery({
    queryKey: ['admin', 'rides'],
    queryFn: getAdminRideQueue,
    staleTime: 30000,
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: getAdminBookingQueue,
    staleTime: 30000,
  });
}

export function useSupportInbox() {
  return useQuery({
    queryKey: ['admin', 'supportInbox'],
    queryFn: getSupportInbox,
    staleTime: 30000,
  });
}

export function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ['admin', 'newsletterSubscribers'],
    queryFn: getNewsletterSubscribers,
    staleTime: 60000,
  });
}

export function useSupportChatEvents(limit = 25) {
  return useQuery({
    queryKey: ['admin', 'supportChatEvents', limit],
    queryFn: () => getSupportChatEvents(limit),
    staleTime: 30000,
  });
}

export function useBackendJobRuns(limit = 20, jobName?: string) {
  return useQuery({
    queryKey: ['admin', 'backendJobRuns', limit, jobName],
    queryFn: () => getBackendJobRuns(limit, jobName),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useReviewDriverApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      applicationId, 
      status, 
      reviewNotes 
    }: { 
      applicationId: string; 
      status: DriverApplicationStatus; 
      reviewNotes?: string; 
    }) => reviewDriverApplication(applicationId, status, reviewNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driverApplications'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });
}