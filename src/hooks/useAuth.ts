import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  submitContactMessage, 
  subscribeToJournal, 
  requestSupportChatReply,
  uploadAvatar,
  updateProfile,
  submitDriverApplication,
} from '../lib/api';
import type { ContactMessageInput, SupportChatMessage, DriverApplicationInput } from '../types';

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: ContactMessageInput) => submitContactMessage(input),
  });
}

export function useSubscribeToJournal() {
  return useMutation({
    mutationFn: (email: string) => subscribeToJournal(email),
  });
}

export function useSupportChat() {
  return useMutation({
    mutationFn: (messages: SupportChatMessage[]) => requestSupportChatReply(messages),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (url) => {
      queryClient.setQueryData(['auth', 'profile'], (old: any) => ({
        ...old,
        avatar_url: url,
      }));
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof updateProfile>[0]) => updateProfile(updates),
    onSuccess: (_, updates) => {
      queryClient.setQueryData(['auth', 'profile'], (old: any) => ({
        ...old,
        ...updates,
      }));
    },
  });
}

export function useSubmitDriverApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DriverApplicationInput) => submitDriverApplication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });
}