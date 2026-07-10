/**
 * Enhanced API Layer with Error Handling & Retry Logic
 * 
 * This module provides all API calls to Supabase with:
 * - Consistent error handling
 * - Retry logic for transient failures
 * - Type safety with TypeScript
 * - Dev logging for debugging
 */

import { supabase } from './supabase'
import { logDevError, mapApiErrorMessage, withRetry } from './errors'
import type {
  BackendJobRun,
  Booking,
  ContactMessage,
  ContactMessageInput,
  DriverApplication,
  DriverApplicationInput,
  DriverApplicationStatus,
  DriverDashboardData,
  NewsletterSubscription,
  Ride,
  RideInput,
  RiderDashboardData,
  SupportChatEvent,
} from '../types'

export interface SupportChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AvailableRideRow extends Omit<Ride, 'driver' | 'vehicle'> {
  driver: Ride['driver'] | null
  vehicle: Ride['vehicle'] | null
}

export interface BookRideInput {
  rideId: string
  serviceId?: string | null
  seats: number
  pickup: {
    address: string
    lat: number
    lng: number
  }
  destination: {
    address: string
    lat: number
    lng: number
  }
  fareTotal?: number
  subtotalAmount?: number
  platformFee?: number
  taxAmount?: number
  distanceKm?: number
  etaMinutes?: number
  specialInstructions?: string
}

const rideSelect = `
  *,
  driver:profiles!rides_driver_id_fkey(id,full_name,avatar_url),
  vehicle:vehicles!vehicles_driver_id_fkey(make,model,color,license_plate)
`

async function invokeBackendFunction<TResponse>(
  name: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, body ? { body } : {})

  if (error) {
    logDevError(`functions.${name}`, error)
    throw new Error(mapApiErrorMessage(error, name))
  }

  return data as TResponse
}

function normalizeAvailableRideRow(row: AvailableRideRow): Ride {
  return {
    ...row,
    driver: row.driver && typeof row.driver === 'object' ? row.driver : null,
    vehicle: row.vehicle && typeof row.vehicle === 'object' ? row.vehicle : null,
  }
}

function normalizeSupportChatMessages(messages: SupportChatMessage[]): SupportChatMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12)
}

/**
 * Get available rides for a specific city
 */
export async function getAvailableRides(city: string): Promise<Ride[]> {
  const normalizedCity = city.trim()
  if (!normalizedCity) return []

  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase.rpc('get_available_rides', {
        p_city: normalizedCity,
      })

      if (error) {
        throw error
      }

      return (data ?? []) as AvailableRideRow[]
    }, 3, 250)

    return data.map(normalizeAvailableRideRow)
  } catch (error) {
    logDevError('getAvailableRides', error)
    throw new Error(mapApiErrorMessage(error, 'fetching rides'))
  }
}

async function fetchRideById(rideId: string, context: string): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .select(rideSelect)
    .eq('id', rideId)
    .single()

  if (error) {
    logDevError(`fetchRideById.${context}`, error)
    throw new Error(mapApiErrorMessage(error, context))
  }

  return data as Ride
}

/**
 * Create a new ride as a driver
 */
export async function createDriverRide(input: RideInput): Promise<Ride> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  try {
    const { data: application, error: applicationError } = await supabase
      .from('driver_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (applicationError) {
      logDevError('createDriverRide.application', applicationError)
      throw new Error(mapApiErrorMessage(applicationError, 'verifying driver application'))
    }

    if (application?.status !== 'approved') {
      throw new Error('Your driver application must be approved before you can publish rides.')
    }

    const { data, error } = await supabase
      .from('rides')
      .insert({ driver_id: user.id, seats_available: input.seats_total, ...input })
      .select(rideSelect)
      .single()

    if (error) {
      logDevError('createDriverRide', error)
      throw new Error(mapApiErrorMessage(error, 'publishing ride'))
    }

    return data as Ride
  } catch (error) {
    logDevError('createDriverRide', error)
    throw error
  }
}

/**
 * Start a scheduled ride as the assigned driver
 */
export async function startDriverRide(rideId: string): Promise<Ride> {
  try {
    const { data, error } = await supabase.rpc('start_ride', {
      p_ride_id: rideId,
    })

    if (error) {
      logDevError('startDriverRide', error)
      throw new Error(mapApiErrorMessage(error, 'starting ride'))
    }

    return await fetchRideById((data as string) || rideId, 'loading updated ride')
  } catch (error) {
    logDevError('startDriverRide', error)
    throw error
  }
}

/**
 * Complete an active ride as the assigned driver
 */
export async function completeDriverRide(rideId: string): Promise<Ride> {
  try {
    const { data, error } = await supabase.rpc('complete_ride', {
      p_ride_id: rideId,
    })

    if (error) {
      logDevError('completeDriverRide', error)
      throw new Error(mapApiErrorMessage(error, 'completing ride'))
    }

    return await fetchRideById((data as string) || rideId, 'loading updated ride')
  } catch (error) {
    logDevError('completeDriverRide', error)
    throw error
  }
}

/**
 * Cancel a scheduled or active ride as the assigned driver
 */
export async function cancelDriverRide(rideId: string, reason?: string): Promise<Ride> {
  try {
    const { data, error } = await supabase.rpc('cancel_ride_by_driver', {
      p_ride_id: rideId,
      p_reason: reason?.trim() || null,
    })

    if (error) {
      logDevError('cancelDriverRide', error)
      throw new Error(mapApiErrorMessage(error, 'cancelling ride'))
    }

    return await fetchRideById((data as string) || rideId, 'loading updated ride')
  } catch (error) {
    logDevError('cancelDriverRide', error)
    throw error
  }
}

/**
 * Submit a contact message
 */
export async function submitContactMessage(input: ContactMessageInput): Promise<void> {
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    topic: input.topic.trim(),
    message: input.message.trim(),
    requested_role: input.requestedRole?.trim() || null,
    requested_city: input.requestedCity?.trim() || null,
  }

  try {
    await invokeBackendFunction('submit-contact-message', {
      name: payload.name,
      email: payload.email,
      topic: payload.topic,
      message: payload.message,
      requestedRole: payload.requested_role,
      requestedCity: payload.requested_city,
    })
  } catch (error) {
    logDevError('submitContactMessage', error)
    throw error
  }
}

/**
 * Subscribe to newsletter
 */
export async function subscribeToJournal(email: string): Promise<{ email: string }> {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    return await invokeBackendFunction<{ email: string }>('subscribe-to-journal', {
      email: normalizedEmail,
    })
  } catch (error) {
    logDevError('subscribeToJournal', error)
    throw error
  }
}

/**
 * Send a support chat message through the authenticated backend function layer.
 */
export async function requestSupportChatReply(messages: SupportChatMessage[]): Promise<string> {
  const normalizedMessages = normalizeSupportChatMessages(messages)

  if (!normalizedMessages.length) {
    throw new Error('A chat message is required.')
  }

  try {
    const result = await invokeBackendFunction<{ content?: string }>('ai-support-chat', {
      messages: normalizedMessages,
    })
    const content = typeof result?.content === 'string' ? result.content.trim() : ''

    if (!content) {
      throw new Error('AI support returned an empty response.')
    }

    return content
  } catch (error) {
    logDevError('requestSupportChatReply', error)
    throw error
  }
}

/**
 * Book a ride
 */
export async function bookRide(input: BookRideInput): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  try {
    const { data: bookingId, error } = await supabase.rpc('book_ride', {
      p_ride_id: input.rideId,
      p_rider_id: user.id,
      p_seats: input.seats,
      p_pickup_address: input.pickup.address,
      p_pickup_lat: input.pickup.lat,
      p_pickup_lng: input.pickup.lng,
      p_dest_address: input.destination.address,
      p_dest_lat: input.destination.lat,
      p_dest_lng: input.destination.lng,
      p_service_id: input.serviceId ?? null,
      p_fare_total: input.fareTotal ?? null,
      p_subtotal_amount: input.subtotalAmount ?? null,
      p_platform_fee: input.platformFee ?? null,
      p_tax_amount: input.taxAmount ?? null,
      p_distance_km: input.distanceKm ?? null,
      p_eta_minutes: input.etaMinutes ?? null,
      p_special_instructions: input.specialInstructions?.trim() || null,
    })

    if (error) {
      logDevError('bookRide', error)
      throw new Error(mapApiErrorMessage(error, 'booking ride'))
    }

    const { data, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      logDevError('bookRide.fetchBooking', bookingError)
      throw new Error(mapApiErrorMessage(bookingError, 'loading booking details'))
    }

    return data as Booking
  } catch (error) {
    logDevError('bookRide', error)
    throw error
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  try {
    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_rider_id: user.id,
    })

    if (error) {
      logDevError('cancelBooking', error)
      throw new Error(mapApiErrorMessage(error, 'cancelling booking'))
    }
  } catch (error) {
    logDevError('cancelBooking', error)
    throw error
  }
}

/**
 * Get rider dashboard data (recent bookings)
 */
export async function getRiderDashboardData(): Promise<RiderDashboardData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { recentBookings: [] }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('rider_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      logDevError('getRiderDashboardData', error)
      return { recentBookings: [] }
    }

    return { recentBookings: (data ?? []) as Booking[] }
  } catch (error) {
    logDevError('getRiderDashboardData', error)
    return { recentBookings: [] }
  }
}

/**
 * Get driver dashboard data (applications, vehicles, rides)
 */
export async function getDriverDashboardData(): Promise<DriverDashboardData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { application: null, vehicles: [], rides: [] }

  try {
    const [appResult, vehiclesResult, ridesResult] = await Promise.all([
      supabase.from('driver_applications').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('vehicles').select('*').eq('driver_id', user.id),
      supabase.from('rides').select('*').eq('driver_id', user.id).order('departure_time', { ascending: false }).limit(20),
    ])

    if (appResult.error) logDevError('getDriverDashboardData.app', appResult.error)
    if (vehiclesResult.error) logDevError('getDriverDashboardData.vehicles', vehiclesResult.error)
    if (ridesResult.error) logDevError('getDriverDashboardData.rides', ridesResult.error)

    return {
      application: appResult.data ?? null,
      vehicles: vehiclesResult.data ?? [],
      rides: ridesResult.data ?? [],
    }
  } catch (error) {
    logDevError('getDriverDashboardData', error)
    return { application: null, vehicles: [], rides: [] }
  }
}

/**
 * Submit a driver application
 */
export async function submitDriverApplication(input: DriverApplicationInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  let documentPath = ''

  try {
    const [existingApplicationResult, existingVehicleResult] = await Promise.all([
      supabase.from('driver_applications').select('document_url').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (existingApplicationResult.error) {
      logDevError('submitDriverApplication.applicationLookup', existingApplicationResult.error)
      throw new Error(mapApiErrorMessage(existingApplicationResult.error, 'verifying application'))
    }

    if (existingVehicleResult.error) {
      logDevError('submitDriverApplication.vehicleLookup', existingVehicleResult.error)
      throw new Error(mapApiErrorMessage(existingVehicleResult.error, 'verifying vehicle'))
    }

    if (input.documentUrl && input.documentUrl.startsWith('data:')) {
      const uploadResponse = await fetch(input.documentUrl)
      const uploadBlob = await uploadResponse.blob()
      const mime = uploadBlob.type || 'application/pdf'
      const ext = mime.split('/')[1] ?? 'pdf'
      const filePath = `${user.id}/license.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, uploadBlob, { contentType: mime, upsert: true })

      if (uploadError) {
        logDevError('submitDriverApplication.upload', uploadError)
        throw new Error(mapApiErrorMessage(uploadError, 'uploading document'))
      }

      documentPath = filePath
    }
    documentPath = documentPath || existingApplicationResult.data?.document_url || ''

    const { error: appError } = await supabase.from('driver_applications').upsert({
      user_id: user.id,
      license_number: input.licenseNumber,
      license_expiry: input.licenseExpiry,
      document_url: documentPath || null,
      status: 'pending',
    }, { onConflict: 'user_id' })

    if (appError) {
      logDevError('submitDriverApplication', appError)
      throw new Error(mapApiErrorMessage(appError, 'submitting application'))
    }

    const vehiclePayload = {
      driver_id: user.id,
      make: input.make,
      model: input.model,
      year: input.year,
      license_plate: input.plate,
      color: input.color,
      capacity: input.capacity,
    }

    const vehicleQuery = existingVehicleResult.data
      ? supabase.from('vehicles').update(vehiclePayload).eq('id', existingVehicleResult.data.id)
      : supabase.from('vehicles').insert(vehiclePayload)

    const { error: vehicleError } = await vehicleQuery

    if (vehicleError) {
      logDevError('submitDriverApplication.vehicle', vehicleError)
      throw new Error(mapApiErrorMessage(vehicleError, 'saving vehicle'))
    }
  } catch (error) {
    logDevError('submitDriverApplication', error)
    throw error
  }
}

/**
 * Load driver applications for admin review
 */
export async function getDriverApplicationQueue(): Promise<DriverApplication[]> {
  try {
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logDevError('getDriverApplicationQueue', error)
      throw new Error(mapApiErrorMessage(error, 'loading driver applications'))
    }

    return (data ?? []) as DriverApplication[]
  } catch (error) {
    logDevError('getDriverApplicationQueue', error)
    throw error
  }
}

/**
 * Load rides for admin operations
 */
export async function getAdminRideQueue(): Promise<Ride[]> {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select(rideSelect)
      .order('departure_time', { ascending: false })
      .limit(100)

    if (error) {
      logDevError('getAdminRideQueue', error)
      throw new Error(mapApiErrorMessage(error, 'loading ride operations'))
    }

    return (data ?? []) as Ride[]
  } catch (error) {
    logDevError('getAdminRideQueue', error)
    throw error
  }
}

/**
 * Load bookings for admin operations
 */
export async function getAdminBookingQueue(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logDevError('getAdminBookingQueue', error)
      throw new Error(mapApiErrorMessage(error, 'loading booking operations'))
    }

    return (data ?? []) as Booking[]
  } catch (error) {
    logDevError('getAdminBookingQueue', error)
    throw error
  }
}

/**
 * Load support inbox messages for admin operations
 */
export async function getSupportInbox(): Promise<ContactMessage[]> {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logDevError('getSupportInbox', error)
      throw new Error(mapApiErrorMessage(error, 'loading support inbox'))
    }

    return (data ?? []) as ContactMessage[]
  } catch (error) {
    logDevError('getSupportInbox', error)
    throw error
  }
}

/**
 * Load newsletter subscribers for admin operations
 */
export async function getNewsletterSubscribers(): Promise<NewsletterSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logDevError('getNewsletterSubscribers', error)
      throw new Error(mapApiErrorMessage(error, 'loading newsletter subscriptions'))
    }

    return (data ?? []) as NewsletterSubscription[]
  } catch (error) {
    logDevError('getNewsletterSubscribers', error)
    throw error
  }
}

/**
 * Load recent AI support chat audit rows for admins.
 */
export async function getSupportChatEvents(limit = 25): Promise<SupportChatEvent[]> {
  try {
    const { data, error } = await supabase
      .from('support_chat_events')
      .select('*, user:profiles(id,full_name,email)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logDevError('getSupportChatEvents', error)
      throw new Error(mapApiErrorMessage(error, 'loading support chat events'))
    }

    return (data ?? []) as SupportChatEvent[]
  } catch (error) {
    logDevError('getSupportChatEvents', error)
    throw error
  }
}

/**
 * Load recent backend job runs for admin observability.
 */
export async function getBackendJobRuns(limit = 20, jobName?: string): Promise<BackendJobRun[]> {
  try {
    let query = supabase
      .from('backend_job_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (jobName) {
      query = query.eq('job_name', jobName)
    }

    const { data, error } = await query

    if (error) {
      logDevError('getBackendJobRuns', error)
      throw new Error(mapApiErrorMessage(error, 'loading backend job runs'))
    }

    return (data ?? []) as BackendJobRun[]
  } catch (error) {
    logDevError('getBackendJobRuns', error)
    throw error
  }
}

/**
 * Review a driver application as an admin
 */
export async function reviewDriverApplication(
  applicationId: string,
  status: DriverApplicationStatus,
  reviewNotes?: string,
): Promise<DriverApplication> {
  try {
    const result = await invokeBackendFunction<{ application: DriverApplication }>(
      'admin-review-driver-application',
      {
        applicationId,
        status,
        reviewNotes: reviewNotes?.trim() || null,
      }
    )

    return result.application
  } catch (error) {
    logDevError('reviewDriverApplication', error)
    throw error
  }
}

/**
 * Upload a profile avatar into the public avatars storage bucket.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${user.id}/avatar.${fileExtension}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      logDevError('uploadAvatar', uploadError)
      throw new Error(mapApiErrorMessage(uploadError, 'uploading avatar'))
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = data?.publicUrl?.trim()

    if (!publicUrl) {
      throw new Error('Avatar uploaded, but no public URL was returned.')
    }

    return `${publicUrl}?t=${Date.now()}`
  } catch (error) {
    logDevError('uploadAvatar', error)
    throw error
  }
}

/**
 * Update user profile
 */
export async function updateProfile(updates: {
  full_name?: string
  phone?: string
  city?: string
  gender?: string
  home_address?: string
  work_address?: string
  avatar_url?: string
  onboarding_completed?: boolean
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      logDevError('updateProfile', error)
      throw new Error(mapApiErrorMessage(error, 'updating profile'))
    }
  } catch (error) {
    logDevError('updateProfile', error)
    throw error
  }
}
