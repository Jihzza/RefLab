import { supabase } from '@/lib/supabaseClient'

// Profile shape matching the profiles table
export interface Profile {
  id: string
  username: string
  username_customized: boolean
  role: 'user' | 'moderator' | 'admin'
  name: string | null
  email: string | null
  photo_url: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/
const PROFILE_MEDIA_BUCKET = 'profile-media'
const PROFILE_MEDIA_PUBLIC_PREFIX = '/storage/v1/object/public/profile-media/'

/**
 * Normalize username input before persistence/checks.
 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Validate username against DB-compatible rules.
 */
export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_REGEX.test(username)
}

/**
 * Check if profile is complete (custom username + name set)
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false
  return profile.username_customized && profile.name !== null
}

/**
 * Fetch the current user's profile
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile: data as Profile | null, error }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { profile: data as Profile | null, error }
}

/**
 * Set custom username (marks profile as customized)
 * Returns specific error for username conflicts
 */
export async function setUsername(userId: string, username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username, username_customized: true })
    .eq('id', userId)
    .select()
    .single()

  // Check for unique constraint violation (username taken)
  if (error?.code === '23505') {
    return {
      profile: null,
      error: { ...error, message: 'Username is already taken' },
    }
  }

  return { profile: data as Profile | null, error }
}

/**
 * Check if a username is available, optionally excluding one user ID.
 */
export async function checkUsernameAvailable(
  username: string,
  excludeUserId?: string
) {
  const normalized = normalizeUsername(username)
  const escapedPattern = normalized
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')

  let query = supabase
    .from('public_profiles')
    .select('id')
    .ilike('username', escapedPattern)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return { available: false, error }
  }

  return { available: data === null, error: null }
}

/**
 * Upload a profile avatar to storage and return path/public URL.
 */
export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{ path: string | null; publicUrl: string | null; error: Error | null }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${userId}/avatars/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    return { path: null, publicUrl: null, error: new Error(error.message) }
  }

  const { data } = supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .getPublicUrl(path)

  return { path, publicUrl: data.publicUrl, error: null }
}

/**
 * Delete an avatar when it belongs to the profile-media bucket.
 */
export async function deleteProfileAvatarByUrl(
  photoUrl: string
): Promise<{ error: Error | null }> {
  let path: string | null = null

  try {
    const parsed = new URL(photoUrl)
    const prefixIndex = parsed.pathname.indexOf(PROFILE_MEDIA_PUBLIC_PREFIX)

    if (prefixIndex === -1) {
      return { error: null }
    }

    const encodedPath = parsed.pathname.slice(
      prefixIndex + PROFILE_MEDIA_PUBLIC_PREFIX.length
    )

    if (!encodedPath) {
      return { error: null }
    }

    path = decodeURIComponent(encodedPath)
  } catch {
    return { error: null }
  }

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .remove([path])

  return { error: error ? new Error(error.message) : null }
}

/**
 * Update last_login_at timestamp
 */
export async function updateLastLogin(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)

  return { error }
}
