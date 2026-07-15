import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Avatar, Button, EmptyState, Input, Surface } from '@/components/ui'
import {
  checkUsernameAvailable,
  deleteProfileAvatarByUrl,
  isValidUsernameFormat,
  normalizeUsername,
  type Profile,
  uploadProfileAvatar,
} from '@/features/auth/api/profilesApi'
import { useAuth } from '@/features/auth/components/useAuth'
import { useTranslation } from 'react-i18next'

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const AVATAR_CLEANUP_STORAGE_PREFIX = 'reflab-avatar-cleanup:'
const MAX_QUEUED_AVATAR_CLEANUPS = 20

function getAvatarCleanupStorageKey(userId: string): string {
  return `${AVATAR_CLEANUP_STORAGE_PREFIX}${userId}`
}

function readPendingAvatarCleanupUrls(userId: string): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getAvatarCleanupStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .slice(-MAX_QUEUED_AVATAR_CLEANUPS)
  } catch {
    return []
  }
}

function writePendingAvatarCleanupUrls(userId: string, urls: Iterable<string>): void {
  if (typeof window === 'undefined') return

  try {
    const queuedUrls = [...new Set(urls)].slice(-MAX_QUEUED_AVATAR_CLEANUPS)
    const storageKey = getAvatarCleanupStorageKey(userId)
    if (queuedUrls.length === 0) {
      window.localStorage.removeItem(storageKey)
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(queuedUrls))
  } catch {
    // The in-memory retry path remains available when local storage is blocked.
  }
}

function rememberAvatarCleanup(userId: string, photoUrl: string): void {
  writePendingAvatarCleanupUrls(userId, [
    ...readPendingAvatarCleanupUrls(userId),
    photoUrl,
  ])
}

function forgetAvatarCleanup(userId: string, photoUrl: string): void {
  writePendingAvatarCleanupUrls(
    userId,
    readPendingAvatarCleanupUrls(userId).filter((queuedUrl) => queuedUrl !== photoUrl),
  )
}

type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'error'
type InitialSnapshot = {
  name: string
  username: string
  photoUrl: string | null
}

function getInitials(name: string, username: string): string {
  const source = name.trim() || username.trim() || 'U'
  return source.slice(0, 2).toUpperCase()
}

interface EditProfileFormProps {
  user: User
  profile: Profile
  updateUser: (
    updates: Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>
  ) => Promise<{ error: Error | null }>
  updateUserMetadata: (
    updates: Partial<User['user_metadata']>
  ) => Promise<{ error: Error | null }>
}

function EditProfileForm({
  user,
  profile,
  updateUser,
  updateUserMetadata,
}: EditProfileFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [initialSnapshot] = useState<InitialSnapshot>(() => {
    const fallbackName =
      profile.name ??
      (typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : '')
    const fallbackUsername = normalizeUsername(
      profile.username ??
        (typeof user.user_metadata?.username === 'string'
          ? user.user_metadata.username
          : '')
    )
    const fallbackPhoto =
      profile.photo_url ??
      (typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null)

    return {
      name: fallbackName.trim(),
      username: fallbackUsername,
      photoUrl: fallbackPhoto,
    }
  })

  const [name, setName] = useState(initialSnapshot.name)
  const [username, setUsername] = useState(initialSnapshot.username)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>('idle')
  const [isSaving, setIsSaving] = useState(false)

  const usernameRequestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadedAvatarUrlRef = useRef<string | null>(null)
  const supersededAvatarUrlsRef = useRef(
    new Set(readPendingAvatarCleanupUrls(user.id)),
  )

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username])
  const normalizedName = useMemo(() => name.trim(), [name])

  const usernameFormatError = useMemo(() => {
    if (!normalizedUsername) return t('Username is required.')
    if (!isValidUsernameFormat(normalizedUsername)) {
      return t('Use 3-30 chars: lowercase letters, numbers, dots, or underscores.')
    }
    return null
  }, [normalizedUsername, t])

  const hasNameChanged = normalizedName !== initialSnapshot.name
  const hasUsernameChanged = normalizedUsername !== initialSnapshot.username
  const needsUsernameConfirmation = !profile.username_customized
  const hasAvatarChanged = avatarFile !== null
  const hasChanges = hasNameChanged
    || hasUsernameChanged
    || needsUsernameConfirmation
    || hasAvatarChanged

  const displayAvatar =
    avatarPreviewUrl ??
    profile.photo_url ??
    (typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null)

  const displayInitials = getInitials(normalizedName, normalizedUsername)

  const navigateBackWithFallback = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/app/profile', { replace: true })
  }, [navigate])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      for (const queuedUrl of readPendingAvatarCleanupUrls(user.id)) {
        if (queuedUrl === profile.photo_url) {
          forgetAvatarCleanup(user.id, queuedUrl)
          supersededAvatarUrlsRef.current.delete(queuedUrl)
          continue
        }

        try {
          const { error: cleanupError } = await deleteProfileAvatarByUrl(queuedUrl)
          if (cleanupError) {
            console.error('Failed to retry queued avatar cleanup:', cleanupError)
            continue
          }

          forgetAvatarCleanup(user.id, queuedUrl)
          if (!cancelled) supersededAvatarUrlsRef.current.delete(queuedUrl)
        } catch (cleanupError) {
          console.error('Failed to retry queued avatar cleanup:', cleanupError)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profile.photo_url, user.id])

  useEffect(() => {
    const requestId = ++usernameRequestIdRef.current

    if (!hasUsernameChanged || !!usernameFormatError) return

    const timeoutId = window.setTimeout(async () => {
      const { available, error } = await checkUsernameAvailable(
        normalizedUsername,
        user.id
      )

      if (requestId !== usernameRequestIdRef.current) return

      if (error) {
        setUsernameAvailability('error')
        return
      }

      setUsernameAvailability(available ? 'available' : 'taken')
    }, 400)

    return () => {
      window.clearTimeout(timeoutId)
      if (usernameRequestIdRef.current === requestId) {
        usernameRequestIdRef.current += 1
      }
    }
  }, [hasUsernameChanged, normalizedUsername, user.id, usernameFormatError])

  const handleAvatarClick = () => {
    if (isSaving) return
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFormError(null)

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarError(t('Avatar must be JPG, PNG, WEBP, or GIF.'))
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(t('Avatar must be 5MB or smaller.'))
      event.target.value = ''
      return
    }

    setAvatarError(null)
    if (pendingUploadedAvatarUrlRef.current) {
      supersededAvatarUrlsRef.current.add(pendingUploadedAvatarUrlRef.current)
      pendingUploadedAvatarUrlRef.current = null
    }
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  const handleCancel = () => {
    navigateBackWithFallback()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setUsernameTouched(true)
    setFormError(null)

    if (usernameFormatError) {
      setFormError(usernameFormatError)
      return
    }

    if (!hasChanges) {
      return
    }

    setIsSaving(true)

    if (hasUsernameChanged) {
      setUsernameAvailability('checking')
      try {
        const { available, error } = await checkUsernameAvailable(
          normalizedUsername,
          user.id,
        )

        if (error) {
          setUsernameAvailability('error')
          setFormError(t('Could not verify username availability. Please try again.'))
          setIsSaving(false)
          return
        }

        if (!available) {
          setUsernameAvailability('taken')
          setFormError(t('That username is already taken.'))
          setIsSaving(false)
          return
        }

        setUsernameAvailability('available')
      } catch {
        setUsernameAvailability('error')
        setFormError(t('Could not verify username availability. Please try again.'))
        setIsSaving(false)
        return
      }
    }

    let uploadedAvatarUrl: string | null = null
    let uploadedAvatarThisAttempt = false
    let profileUpdated = false

    try {
      if (avatarFile) {
        if (pendingUploadedAvatarUrlRef.current) {
          uploadedAvatarUrl = pendingUploadedAvatarUrlRef.current
        } else {
          const { publicUrl, error } = await uploadProfileAvatar(user.id, avatarFile)

          if (error || !publicUrl) {
            setAvatarError(error?.message ?? t('Failed to upload avatar.'))
            setIsSaving(false)
            return
          }

          uploadedAvatarUrl = publicUrl
          uploadedAvatarThisAttempt = true
          pendingUploadedAvatarUrlRef.current = publicUrl
          // Durable outbox: a reload between upload and profile commit must
          // still leave enough information to remove an orphaned file.
          rememberAvatarCleanup(user.id, publicUrl)
        }
      }

      const profileUpdates: Partial<Pick<Profile, 'name' | 'username' | 'photo_url'>>
        = {}

      if (hasNameChanged) {
        profileUpdates.name = normalizedName ? normalizedName : null
      }

      if (hasUsernameChanged || needsUsernameConfirmation) {
        profileUpdates.username = normalizedUsername
      }

      if (hasAvatarChanged && uploadedAvatarUrl) {
        profileUpdates.photo_url = uploadedAvatarUrl
      }

      const { error: profileError } = await updateUser(profileUpdates)

      if (profileError) {
        if (uploadedAvatarThisAttempt && uploadedAvatarUrl) {
          try {
            const { error: deleteError } = await deleteProfileAvatarByUrl(uploadedAvatarUrl)
            if (!deleteError) {
              pendingUploadedAvatarUrlRef.current = null
              forgetAvatarCleanup(user.id, uploadedAvatarUrl)
            } else {
              console.error('Failed to clean up uploaded avatar:', deleteError)
              rememberAvatarCleanup(user.id, uploadedAvatarUrl)
            }
          } catch (deleteError) {
            console.error('Failed to clean up uploaded avatar:', deleteError)
            rememberAvatarCleanup(user.id, uploadedAvatarUrl)
            // The profile error remains the primary actionable failure.
          }
        }
        setFormError(profileError.message)
        setIsSaving(false)
        return
      }

      profileUpdated = true

      if (hasAvatarChanged && uploadedAvatarUrl) {
        // The profile now references this file. It must never remain in the
        // durable orphan-cleanup queue, including after a failed earlier save.
        forgetAvatarCleanup(user.id, uploadedAvatarUrl)
        supersededAvatarUrlsRef.current.delete(uploadedAvatarUrl)

        const avatarUrlsToDelete = new Set(supersededAvatarUrlsRef.current)
        if (initialSnapshot.photoUrl) avatarUrlsToDelete.add(initialSnapshot.photoUrl)
        avatarUrlsToDelete.delete(uploadedAvatarUrl)
        let avatarCleanupFailed = false

        for (const obsoleteAvatarUrl of avatarUrlsToDelete) {
          try {
            const { error: deleteError } = await deleteProfileAvatarByUrl(obsoleteAvatarUrl)
            if (deleteError) {
              console.error('Failed to delete previous avatar file:', deleteError)
              supersededAvatarUrlsRef.current.add(obsoleteAvatarUrl)
              rememberAvatarCleanup(user.id, obsoleteAvatarUrl)
              avatarCleanupFailed = true
            } else {
              supersededAvatarUrlsRef.current.delete(obsoleteAvatarUrl)
              forgetAvatarCleanup(user.id, obsoleteAvatarUrl)
            }
          } catch (deleteError) {
            console.error('Failed to delete previous avatar file:', deleteError)
            supersededAvatarUrlsRef.current.add(obsoleteAvatarUrl)
            rememberAvatarCleanup(user.id, obsoleteAvatarUrl)
            avatarCleanupFailed = true
          }
        }

        if (avatarCleanupFailed) {
          setFormError(
            t('Profile updated, but an old avatar could not be removed. Tap "Save changes" again to retry.')
          )
          setIsSaving(false)
          return
        }
      }

      const metadataUpdates: Partial<User['user_metadata']> = {}

      if (hasNameChanged) {
        metadataUpdates.full_name = normalizedName || null
      }

      if (hasUsernameChanged) {
        metadataUpdates.username = normalizedUsername
      }

      if (hasAvatarChanged && uploadedAvatarUrl) {
        metadataUpdates.avatar_url = uploadedAvatarUrl
      }

      if (Object.keys(metadataUpdates).length > 0) {
        const { error: metadataError } = await updateUserMetadata(metadataUpdates)

        if (metadataError) {
          setFormError(
            t('Profile updated, but metadata sync failed. Tap "Save changes" again to retry.')
          )
          setIsSaving(false)
          return
        }
      }

      if (hasAvatarChanged && uploadedAvatarUrl) {
        pendingUploadedAvatarUrlRef.current = null
        supersededAvatarUrlsRef.current.clear()
      }

      navigateBackWithFallback()
    } catch (error) {
      if (!profileUpdated && uploadedAvatarThisAttempt && uploadedAvatarUrl) {
        try {
          const { error: deleteError } = await deleteProfileAvatarByUrl(uploadedAvatarUrl)
          if (!deleteError) {
            pendingUploadedAvatarUrlRef.current = null
            forgetAvatarCleanup(user.id, uploadedAvatarUrl)
          } else {
            console.error('Failed to clean up uploaded avatar:', deleteError)
            rememberAvatarCleanup(user.id, uploadedAvatarUrl)
          }
        } catch (deleteError) {
          console.error('Failed to clean up uploaded avatar:', deleteError)
          rememberAvatarCleanup(user.id, uploadedAvatarUrl)
          // Keep the original save error as the actionable message.
        }
      }
      const message =
        error instanceof Error ? error.message : t('Something went wrong while saving.')
      setFormError(message)
      setIsSaving(false)
    }
  }

  const showUsernameStatus =
    hasUsernameChanged && !usernameFormatError && usernameTouched

  const saveDisabled =
    isSaving ||
    !hasChanges ||
    !!avatarError ||
    !!usernameFormatError ||
    usernameAvailability === 'taken' ||
    usernameAvailability === 'checking'

  return (
    <ViewportPage ariaLabel={t('Edit Profile')} scroll="managed">
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8">
          <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
            <form onSubmit={handleSubmit} aria-busy={isSaving || undefined} className="p-4 sm:p-6">
              <div className="mb-7 flex items-start gap-3 border-b border-(--mc-color-border) pb-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leadingIcon={<ArrowLeft className="size-4" />}
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="-ml-2 shrink-0"
                >
                  {t('Back')}
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-(--mc-color-text)">
                    {t('Edit Profile')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-(--mc-color-text-muted)">
                    {t('Update your profile details and avatar.')}
                  </p>
                </div>
              </div>

        <div className="mb-7 flex flex-col items-center rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-6">
          <button
            type="button"
            aria-label={t('Upload profile image')}
            onClick={handleAvatarClick}
            disabled={isSaving}
            className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-4 focus-visible:ring-offset-(--mc-color-canvas) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Avatar
              src={displayAvatar}
              alt={t('Profile avatar preview')}
              name={normalizedName || normalizedUsername}
              fallback={displayInitials}
              size="xl"
              className="!size-28 border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-xl shadow-(--mc-shadow-raised)"
              imageProps={{ loading: 'eager' }}
            />
            <span className="absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full border-2 border-(--mc-color-canvas) bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft) transition-transform group-hover:scale-105 motion-reduce:transition-none">
              <Camera className="size-5" aria-hidden="true" />
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAvatarClick}
            disabled={isSaving}
            className="mt-3 text-(--mc-color-accent)"
          >
            {t('Change profile image')}
          </Button>
          <p className="mt-1 text-center text-xs text-(--mc-color-text-muted)">
            {t('JPG, PNG, WEBP, or GIF. Max size 5MB.')}
          </p>
          {avatarError && (
            <p className="mt-2 text-center text-xs text-(--mc-color-danger)" role="alert" aria-live="polite">
              {avatarError}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <Input
            id="edit-name"
            type="text"
            label={t('Name')}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setFormError(null)
            }}
            disabled={isSaving}
            placeholder={t('Your name')}
            autoComplete="name"
          />

          <div className="space-y-2">
            <Input
              id="edit-username"
              type="text"
              label={t('Username')}
              value={username}
              onChange={(event) => {
                const nextUsername = normalizeUsername(event.target.value)
                const nextFormatError = nextUsername
                  ? isValidUsernameFormat(nextUsername)
                    ? null
                    : 'invalid'
                  : 'invalid'

                setUsername(nextUsername)
                setUsernameTouched(true)
                setFormError(null)

                if (
                  !nextUsername ||
                  nextFormatError ||
                  nextUsername === initialSnapshot.username
                ) {
                  setUsernameAvailability('idle')
                } else {
                  setUsernameAvailability('checking')
                }
              }}
              onBlur={() => setUsernameTouched(true)}
              disabled={isSaving}
              placeholder={t('username')}
              autoComplete="username"
              startAdornment={<span className="text-sm font-semibold">@</span>}
              endAdornment={
                usernameAvailability === 'checking' ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : usernameAvailability === 'available' ? (
                  <CheckCircle2 className="size-4 text-(--mc-color-success)" aria-hidden="true" />
                ) : undefined
              }
              hint={t('3-30 characters. Lowercase letters, numbers, dots, and underscores.')}
              error={usernameTouched ? usernameFormatError : null}
            />

            {showUsernameStatus && usernameAvailability === 'checking' && (
              <p className="text-xs text-(--mc-color-text-muted)" aria-live="polite">
                {t('Checking username availability...')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'available' && (
              <p className="text-xs text-(--mc-color-success)" aria-live="polite">
                {t('Username is available.')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'taken' && (
              <p className="text-xs text-(--mc-color-danger)" role="alert" aria-live="polite">
                {t('That username is already taken.')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'error' && (
              <p className="text-xs text-(--mc-color-warning)" aria-live="polite">
                {t('Could not verify username right now. We will check again on save.')}
              </p>
            )}
          </div>
        </div>

        {formError && (
          <div
            className="mt-5 flex items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-sm leading-6 text-(--mc-color-text-secondary)"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="mt-1 size-4 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-(--mc-color-border) pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
            className="sm:min-w-32"
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={saveDisabled}
            loading={isSaving}
            loadingText={t('Saving...')}
            className="sm:min-w-40"
          >
            {t('Save changes')}
          </Button>
        </div>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              disabled={isSaving}
              className="hidden"
            />
          </Surface>
        </div>
      </div>
    </ViewportPage>
  )
}

export default function EditProfilePage() {
  const { t } = useTranslation()
  const { user, profile, updateUser, updateUserMetadata } = useAuth()

  if (!user) {
    return (
      <ViewportPage ariaLabel={t('Edit Profile')} padded width="narrow">
        <Surface>
          <EmptyState
            icon={<AlertCircle className="size-6" />}
            title={t('Edit Profile')}
            description={t('You must be signed in to edit your profile.')}
          />
        </Surface>
      </ViewportPage>
    )
  }

  if (!profile) {
    return (
      <ViewportPage ariaLabel={t('Edit Profile')} padded width="narrow">
        <Surface role="status" aria-label={t('Loading profile...')}>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-(--mc-color-text-muted)">
            <LoaderCircle className="size-6 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
            <p className="text-sm">{t('Loading profile...')}</p>
          </div>
        </Surface>
      </ViewportPage>
    )
  }

  return (
    <EditProfileForm
      user={user}
      profile={profile}
      updateUser={updateUser}
      updateUserMetadata={updateUserMetadata}
    />
  )
}
