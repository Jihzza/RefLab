import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import {
  checkUsernameAvailable,
  deleteProfileAvatarByUrl,
  isValidUsernameFormat,
  normalizeUsername,
  type Profile,
  uploadProfileAvatar,
} from '@/features/auth/api/profilesApi'
import { useAuth } from '@/features/auth/components/useAuth'

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

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

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username])
  const normalizedName = useMemo(() => name.trim(), [name])

  const usernameFormatError = useMemo(() => {
    if (!normalizedUsername) return 'Username is required.'
    if (!isValidUsernameFormat(normalizedUsername)) {
      return 'Use 3-30 chars: lowercase letters, numbers, dots, or underscores.'
    }
    return null
  }, [normalizedUsername])

  const hasNameChanged = normalizedName !== initialSnapshot.name
  const hasUsernameChanged = normalizedUsername !== initialSnapshot.username
  const hasAvatarChanged = avatarFile !== null
  const hasChanges = hasNameChanged || hasUsernameChanged || hasAvatarChanged

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
    }
  }, [hasUsernameChanged, normalizedUsername, user.id, usernameFormatError])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFormError(null)

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarError('Avatar must be JPG, PNG, WEBP, or GIF.')
      setAvatarFile(null)
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('Avatar must be 5MB or smaller.')
      setAvatarFile(null)
      event.target.value = ''
      return
    }

    if (avatarPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    setAvatarError(null)
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

    if (hasUsernameChanged) {
      setUsernameAvailability('checking')
      const { available, error } = await checkUsernameAvailable(
        normalizedUsername,
        user.id
      )

      if (error) {
        setUsernameAvailability('error')
        setFormError('Could not verify username availability. Please try again.')
        return
      }

      if (!available) {
        setUsernameAvailability('taken')
        setFormError('That username is already taken.')
        return
      }

      setUsernameAvailability('available')
    }

    setIsSaving(true)

    let uploadedAvatarUrl: string | null = null
    let profileUpdated = false

    try {
      if (avatarFile) {
        const { publicUrl, error } = await uploadProfileAvatar(user.id, avatarFile)

        if (error || !publicUrl) {
          setAvatarError(error?.message ?? 'Failed to upload avatar.')
          setIsSaving(false)
          return
        }

        uploadedAvatarUrl = publicUrl
      }

      const profileUpdates: Partial<Pick<Profile, 'name' | 'username' | 'photo_url'>>
        = {}

      if (hasNameChanged) {
        profileUpdates.name = normalizedName ? normalizedName : null
      }

      if (hasUsernameChanged) {
        profileUpdates.username = normalizedUsername
      }

      if (hasAvatarChanged && uploadedAvatarUrl) {
        profileUpdates.photo_url = uploadedAvatarUrl
      }

      const { error: profileError } = await updateUser(profileUpdates)

      if (profileError) {
        if (uploadedAvatarUrl) {
          await deleteProfileAvatarByUrl(uploadedAvatarUrl)
        }
        setFormError(profileError.message)
        setIsSaving(false)
        return
      }

      profileUpdated = true

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
            'Profile updated, but metadata sync failed. Tap "Save changes" again to retry.'
          )
          setIsSaving(false)
          return
        }
      }

      if (hasAvatarChanged && uploadedAvatarUrl) {
        const previousPhotoUrl = initialSnapshot.photoUrl
        if (previousPhotoUrl && previousPhotoUrl !== uploadedAvatarUrl) {
          const { error: deleteError } = await deleteProfileAvatarByUrl(previousPhotoUrl)
          if (deleteError) {
            console.error('Failed to delete previous avatar file:', deleteError)
          }
        }
      }

      navigateBackWithFallback()
    } catch (error) {
      if (!profileUpdated && uploadedAvatarUrl) {
        await deleteProfileAvatarByUrl(uploadedAvatarUrl)
      }
      const message =
        error instanceof Error ? error.message : 'Something went wrong while saving.'
      setFormError(message)
      setIsSaving(false)
    }
  }

  const showUsernameStatus =
    hasUsernameChanged && !usernameFormatError && usernameTouched

  const saveDisabled =
    isSaving ||
    !hasChanges ||
    !!usernameFormatError ||
    usernameAvailability === 'taken' ||
    usernameAvailability === 'checking'

  return (
    <section className="p-4 pb-20">
      <form
        onSubmit={handleSubmit}
        className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-4 sm:p-6"
      >
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-(--text-primary)">Edit Profile</h1>
          <p className="mt-1 text-sm text-(--text-muted)">
            Update your profile details and avatar.
          </p>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            aria-label="Upload profile image"
            onClick={handleAvatarClick}
            className="w-24 h-24 rounded-full border border-(--border-subtle) bg-(--bg-surface-2) flex items-center justify-center overflow-hidden"
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Profile avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-(--text-primary)">
                {displayInitials}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleAvatarClick}
            className="mt-3 text-sm font-medium text-(--brand-yellow) hover:text-(--brand-yellow-soft)"
          >
            Change profile image
          </button>
          <p className="mt-1 text-xs text-(--text-muted)">
            JPG, PNG, WEBP, or GIF. Max size 5MB.
          </p>
          {avatarError && (
            <p className="mt-2 text-xs text-(--error)" role="alert" aria-live="polite">
              {avatarError}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-name" className="block text-sm font-medium text-(--text-secondary)">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={event => {
                setName(event.target.value)
                setFormError(null)
              }}
              disabled={isSaving}
              placeholder="Your name"
              className="w-full px-4 py-3 outline-none transition-all
                bg-(--bg-surface-2)
                border border-(--border-subtle)
                rounded-(--radius-input)
                text-(--text-primary)
                placeholder-(--text-muted)
                focus:border-(--brand-yellow)
                focus:ring-1 focus:ring-(--brand-yellow)
                disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-username" className="block text-sm font-medium text-(--text-secondary)">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted) text-sm">
                @
              </span>
              <input
                id="edit-username"
                type="text"
                value={username}
                onChange={event => {
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
                placeholder="username"
                autoComplete="off"
                className="w-full pl-8 pr-4 py-3 outline-none transition-all
                  bg-(--bg-surface-2)
                  border border-(--border-subtle)
                  rounded-(--radius-input)
                  text-(--text-primary)
                  placeholder-(--text-muted)
                  focus:border-(--brand-yellow)
                  focus:ring-1 focus:ring-(--brand-yellow)
                  disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <p className="text-xs text-(--text-muted)">
              3-30 characters. Lowercase letters, numbers, dots, and underscores.
            </p>

            {usernameTouched && usernameFormatError && (
              <p className="text-xs text-(--error)" role="alert" aria-live="polite">
                {usernameFormatError}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'checking' && (
              <p className="text-xs text-(--text-muted)" aria-live="polite">
                Checking username availability...
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'available' && (
              <p className="text-xs text-(--success)" aria-live="polite">
                Username is available.
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'taken' && (
              <p className="text-xs text-(--error)" role="alert" aria-live="polite">
                That username is already taken.
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'error' && (
              <p className="text-xs text-(--warning)" aria-live="polite">
                Could not verify username right now. We will check again on save.
              </p>
            )}
          </div>
        </div>

        {formError && (
          <div
            className="mt-5 p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm"
            role="alert"
            aria-live="polite"
          >
            {formError}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 py-3 px-4 font-medium border border-(--border-subtle) text-(--text-primary) rounded-(--radius-button) bg-(--bg-surface-2) hover:bg-(--bg-hover) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveDisabled}
            className="flex-1 py-3 px-4 font-semibold bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </section>
  )
}

export default function EditProfilePage() {
  const { user, profile, updateUser, updateUserMetadata } = useAuth()

  if (!user) {
    return (
      <section className="p-4 pb-20">
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-6">
          <h1 className="text-xl font-semibold text-(--text-primary)">Edit Profile</h1>
          <p className="mt-2 text-sm text-(--error)">
            You must be signed in to edit your profile.
          </p>
        </div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="p-4 pb-20">
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-6">
          <h1 className="text-xl font-semibold text-(--text-primary)">Edit Profile</h1>
          <p className="mt-2 text-sm text-(--text-muted)">Loading profile...</p>
        </div>
      </section>
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
