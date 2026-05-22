import { z } from 'zod';

import { supportedCities } from './cities';

export const MIN_DRIVER_VEHICLE_YEAR = 2000;
export const MAX_DRIVER_VEHICLE_YEAR = new Date().getFullYear() + 1;
export const MIN_DRIVER_CAPACITY = 2;
export const MAX_DRIVER_CAPACITY = 8;

// Auth Schemas
export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// Profile Schemas
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').nullable().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').nullable().optional(),
  city: z.string().min(2, 'City is required').nullable().optional(),
  gender: z.enum(['M', 'F', 'O']).nullable().optional(),
  home_address: z.string().min(5, 'Home address is required').nullable().optional(),
  work_address: z.string().min(5, 'Work address is required').nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// Booking Schemas
export const bookingSchema = z.object({
  rideId: z.string().uuid('Invalid ride ID'),
  seats: z.number().int().min(1, 'At least 1 seat required').max(6, 'Maximum 6 seats'),
  pickupAddress: z.string().min(5, 'Pickup address is required'),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  destAddress: z.string().min(5, 'Destination address is required'),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
});

export type BookingInput = z.infer<typeof bookingSchema>;

// Driver Application Schemas
export const driverApplicationSchema = z.object({
  licenseNumber: z.string().min(8, 'License number is required'),
  licenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  make: z.string().min(2, 'Vehicle make is required'),
  model: z.string().min(2, 'Vehicle model is required'),
  year: z.number().int().min(MIN_DRIVER_VEHICLE_YEAR).max(MAX_DRIVER_VEHICLE_YEAR, 'Invalid year'),
  plate: z.string().min(4, 'License plate is required'),
  color: z.string().min(3, 'Color is required'),
  capacity: z.number().int().min(MIN_DRIVER_CAPACITY).max(MAX_DRIVER_CAPACITY, 'Capacity must be between 2 and 8'),
  documentUrl: z.string().optional(),
});

export type DriverApplicationInput = z.infer<typeof driverApplicationSchema>;

// Ride Creation Schemas
export const rideSchema = z.object({
  origin_name: z.string().min(3, 'Pickup location is required'),
  origin_lat: z.number().min(-90).max(90),
  origin_lng: z.number().min(-180).max(180),
  destination_name: z.string().min(3, 'Destination is required'),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  city: z.enum(supportedCities),
  departure_time: z.string().datetime('Invalid date format'),
  seats_total: z.number().int().min(2).max(8),
  fare_per_seat: z.number().positive('Fare must be positive'),
});

export type RideInput = z.infer<typeof rideSchema>;

// Contact Message Schemas
export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  topic: z.string().min(3, 'Topic is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  requestedRole: z.enum(['rider', 'driver']).optional(),
  requestedCity: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// Newsletter Subscription Schema
export const newsletterSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

/**
 * Validation helper function
 * Returns { valid: true, data } or { valid: false, errors }
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    errors[path] = error.message;
  });

  return { valid: false, errors };
}
