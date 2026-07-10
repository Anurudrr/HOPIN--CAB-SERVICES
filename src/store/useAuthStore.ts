import { create } from 'zustand'
import type { EmailOtpType, Session, User } from '@supabase/supabase-js'

import { getErrorMessage, logDevError } from '../lib/errors'
import { buildProfile, type ProfileRow } from '../lib/profile'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  resendSignupOtp: (email: string) => Promise<void>
  verifyEmailOtp: (email: string, token: string) => Promise<void>
  completeEmailVerification: (params: {
    accessToken?: string | null
    refreshToken?: string | null
    code?: string | null
    tokenHash?: string | null
    token?: string | null
    email?: string | null
    type?: string | null
  }) => Promise<void>
  fetchProfile: () => Promise<void>
  initialize: () => Promise<void>
}

let initializePromise: Promise<void> | null = null
let authSubscriptionRegistered = false

const emailVerificationFallbackTypes: EmailOtpType[] = ['email', 'signup']

function normalizeEmailOtpType(type?: string | null): EmailOtpType | null {
  if (!type) {
    return null
  }

  const value = type.trim().toLowerCase()
  const validTypes: EmailOtpType[] = [
    'email',
    'signup',
    'magiclink',
    'invite',
    'recovery',
    'email_change',
  ]

  return validTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null
}

async function verifyEmailChallenge(params: {
  email?: string | null
  token?: string | null
  tokenHash?: string | null
  type?: string | null
}) {
  const verificationType = normalizeEmailOtpType(params.type)
  const verificationTypes = verificationType
    ? [verificationType, ...emailVerificationFallbackTypes.filter((type) => type !== verificationType)]
    : emailVerificationFallbackTypes

  let lastError: Error | null = null

  for (const type of verificationTypes) {
    const request = params.tokenHash
      ? { token_hash: params.tokenHash, type }
      : params.email && params.token
        ? { email: params.email, token: params.token, type }
        : null

    if (!request) {
      break
    }

    const { error } = await supabase.auth.verifyOtp(request)

    if (!error) {
      return
    }

    lastError = error
  }

  throw lastError ?? new Error('Verification information is incomplete.')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    if (initializePromise) {
      return initializePromise
    }

    initializePromise = (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        set({ session, user: session?.user ?? null, loading: Boolean(session?.user) })

        if (session?.user) {
          await get().fetchProfile()
        }

        set({ loading: false })

        if (!authSubscriptionRegistered) {
          supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (nextSession?.user) {
              set({ session: nextSession, user: nextSession.user, loading: true })

              void get().fetchProfile()
                .catch((error) => {
                  logDevError('auth.onAuthStateChange.fetchProfile', error)
                })
                .finally(() => {
                  set({ loading: false })
                })
              return
            }

            set({ profile: null, session: null, user: null, loading: false })
          })

          authSubscriptionRegistered = true
        }
      } catch (error) {
        logDevError('auth.initialize', error)
        set({ loading: false, session: null, user: null, profile: null })
        throw new Error(getErrorMessage(error, 'Could not restore your session.'))
      }
    })()

    try {
      await initializePromise
    } finally {
      initializePromise = null
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      logDevError('auth.signUp', error)
      throw new Error(getErrorMessage(error, 'Could not create that account.'))
    }
  },

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw error
      }
    } catch (error) {
      logDevError('auth.signIn', error)
      throw new Error(getErrorMessage(error, 'Could not sign in right now.'))
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      set({ user: null, session: null, profile: null })
    } catch (error) {
      logDevError('auth.signOut', error)
      throw new Error(getErrorMessage(error, 'Could not sign out right now.'))
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      logDevError('auth.requestPasswordReset', error)
      throw new Error(getErrorMessage(error, 'Could not send the password reset email.'))
    }
  },

  updatePassword: async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }
    } catch (error) {
      logDevError('auth.updatePassword', error)
      throw new Error(getErrorMessage(error, 'Could not update your password.'))
    }
  },

  resendSignupOtp: async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      logDevError('auth.resendSignupOtp', error)
      throw new Error(getErrorMessage(error, 'Could not resend the verification code.'))
    }
  },

  verifyEmailOtp: async (email, token) => {
    try {
      await get().completeEmailVerification({
        email,
        token,
        type: 'email',
      })
    } catch (error) {
      logDevError('auth.verifyEmailOtp', error)
      throw new Error(getErrorMessage(error, 'Could not verify that email code.'))
    }
  },

  completeEmailVerification: async ({
    accessToken,
    refreshToken,
    code,
    tokenHash,
    token,
    email,
    type,
  }) => {
    try {
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          throw error
        }

        await get().initialize()
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }

        await get().initialize()
        return
      }

      await verifyEmailChallenge({
        email,
        token,
        tokenHash,
        type,
      })

      await get().initialize()
    } catch (error) {
      logDevError('auth.completeEmailVerification', error)
      throw new Error(getErrorMessage(error, 'Could not complete email verification.'))
    }
  },

  fetchProfile: async () => {
    const userId = get().user?.id

    if (!userId) {
      set({ profile: null })
      return
    }

    try {
      const user = get().user
      const [profileResult, applicationResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('driver_applications').select('status').eq('user_id', userId).maybeSingle(),
      ])

      if (profileResult.error) {
        throw profileResult.error
      }

      if (applicationResult.error) {
        throw applicationResult.error
      }

      const profileRow = (profileResult.data as ProfileRow | null) ?? null
      const applicationStatus = applicationResult.data?.status
      const normalizedProfileRow =
        profileRow && profileRow.role !== 'admin'
          ? {
              ...profileRow,
              role:
                applicationStatus === 'approved'
                  ? 'driver'
                  : applicationStatus
                    ? 'rider'
                    : profileRow.role,
            }
          : profileRow

      set({ profile: buildProfile(normalizedProfileRow, user) })
    } catch (error) {
      logDevError('auth.fetchProfile', error)
      throw new Error(getErrorMessage(error, 'Could not load your profile right now.'))
    }
  },
}))
