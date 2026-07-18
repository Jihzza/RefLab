import {
  deleteProfileAvatarByUrl,
  getProfile,
  type Profile,
} from '@/features/auth/api/profilesApi'
import {
  forgetDeferredAvatarCleanup,
  isDeferredAvatarCleanupDue,
  readDeferredAvatarCleanup,
  rememberDeferredAvatarCleanup,
} from './deferredAvatarCleanup'

type ProfileUpdates = Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>

/**
 * Commit a profile update without treating a transport failure as a rollback.
 * A matching authoritative profile proves that the mutation committed; every
 * other ambiguous avatar result stays in the reload-safe deferred queue.
 */
export async function commitProfileUpdateWithAvatarRecovery(
  userId: string,
  updates: ProfileUpdates,
  uploadedAvatarUrl: string | null,
  updateProfile: (updates: ProfileUpdates) => Promise<{ error: Error | null }>,
): Promise<{ committed: boolean; error: Error | null }> {
  const mutation = await updateProfile(updates)
  if (!mutation.error) {
    if (uploadedAvatarUrl) {
      forgetDeferredAvatarCleanup(userId, uploadedAvatarUrl)
    }
    return { committed: true, error: null }
  }

  if (!uploadedAvatarUrl) {
    return { committed: false, error: mutation.error }
  }

  try {
    const authoritative = await getProfile(userId)
    if (!authoritative.error && authoritative.profile?.photo_url === uploadedAvatarUrl) {
      forgetDeferredAvatarCleanup(userId, uploadedAvatarUrl)
      return { committed: true, error: null }
    }
  } catch {
    // A network failure leaves the outcome ambiguous and queued below.
  }

  rememberDeferredAvatarCleanup(userId, uploadedAvatarUrl)
  return { committed: false, error: mutation.error }
}

/**
 * Reload-safe orphan reconciliation. Nothing is deleted before the full grace
 * period and every due candidate is checked against the authoritative profile.
 */
export async function reconcileDeferredAvatarCleanup(
  userId: string,
  currentPhotoUrl: string | null,
  now = Date.now(),
): Promise<void> {
  for (const entry of readDeferredAvatarCleanup(userId, now)) {
    if (entry.url === currentPhotoUrl) {
      forgetDeferredAvatarCleanup(userId, entry.url)
      continue
    }
    if (!isDeferredAvatarCleanupDue(entry, now)) continue

    let authoritative
    try {
      authoritative = await getProfile(userId)
    } catch {
      continue
    }
    if (authoritative.error) continue
    if (authoritative.profile?.photo_url === entry.url) {
      forgetDeferredAvatarCleanup(userId, entry.url)
      continue
    }

    try {
      const cleanup = await deleteProfileAvatarByUrl(entry.url, userId)
      if (!cleanup.error) {
        forgetDeferredAvatarCleanup(userId, entry.url)
      }
    } catch {
      // Keep the oldest timestamp so the next reload can retry immediately.
    }
  }
}
