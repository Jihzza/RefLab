import { supabase } from '@/lib/supabaseClient'
import { normalizeProfilePhotoStoragePath } from '../utils/profilePhotoUrl'

// Profile shape matching the profiles table
export interface Profile {
  id: string
  username: string
  username_customized: boolean
  name: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/
const PROFILE_MEDIA_BUCKET = 'profile-media'
const PROFILE_SELECT_COLUMNS =
  'id, username, username_customized, name, photo_url, created_at, updated_at'

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
    .select(PROFILE_SELECT_COLUMNS)
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
  const persistedUpdates = 'username' in updates
    ? { ...updates, username_customized: true }
    : updates

  const { data, error } = await supabase
    .from('profiles')
    .update(persistedUpdates)
    .eq('id', userId)
    .select(PROFILE_SELECT_COLUMNS)
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
    .select(PROFILE_SELECT_COLUMNS)
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
  photoUrl: string,
  expectedOwnerId: string,
): Promise<{ error: Error | null }> {
  const path = normalizeProfilePhotoStoragePath(photoUrl, expectedOwnerId)
  if (!path) return { error: null }

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .remove([path])

  return { error: error ? new Error(error.message) : null }
}

/**
 * Ask the server to record the authenticated user's login time.
 */
export async function updateLastLogin() {
  const { error } = await supabase.rpc('touch_last_login')

  return { error }
}
