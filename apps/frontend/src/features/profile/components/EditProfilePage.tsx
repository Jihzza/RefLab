import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import {
  checkUsernameAvailable,
  deleteProfileAvatarByUrl,
  isValidUsernameFormat,
  normalizeUsername,
  type Profile,
  uploadProfileAvatar,
} from '@/features/auth/api/profilesApi'
import { useAuth } from '@/features/auth/components/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useTranslation } from 'react-i18next'

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
      setAvatarError(t('Avatar must be JPG, PNG, WEBP, or GIF.'))
      setAvatarFile(null)
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(t('Avatar must be 5MB or smaller.'))
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
        setFormError(t('Could not verify username availability. Please try again.'))
        return
      }

      if (!available) {
        setUsernameAvailability('taken')
        setFormError(t('That username is already taken.'))
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
          setAvatarError(error?.message ?? t('Failed to upload avatar.'))
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
            t('Profile updated, but metadata sync failed. Tap "Save changes" again to retry.')
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
        error instanceof Error ? error.message : t('Something went wrong while saving.')
      setFormError(message)
      setIsSaving(false)
    }
  }

  const showUsernameStatus =
    hasUsernameChanged && !usernameFormatError && usernameTouched

  // Map the username validation/availability states onto the Input primitive's
  // single error / hint slots (error takes precedence over hint).
  const usernameError =
    usernameTouched && usernameFormatError
      ? usernameFormatError
      : showUsernameStatus && usernameAvailability === 'taken'
        ? t('That username is already taken.')
        : undefined

  const usernameHint = usernameError
    ? undefined
    : showUsernameStatus && usernameAvailability === 'checking'
      ? t('Checking username availability...')
      : showUsernameStatus && usernameAvailability === 'available'
        ? t('Username is available.')
        : showUsernameStatus && usernameAvailability === 'error'
          ? t('Could not verify username right now. We will check again on save.')
          : t('3-30 characters. Lowercase letters, numbers, dots, and underscores.')

  const saveDisabled =
    isSaving ||
    !hasChanges ||
    !!usernameFormatError ||
    usernameAvailability === 'taken' ||
    usernameAvailability === 'checking'

  return (
    <section className="p-4 pb-20 animate-fade-up">
      <form
        onSubmit={handleSubmit}
        className="card-console p-4 sm:p-6"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <span className="h-6 w-1.5 rounded-full flag-accent" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-(--text-primary) leading-tight">{t('Edit Profile')}</h1>
            <p className="mt-0.5 text-sm text-(--text-muted)">
              {t('Update your profile details and avatar.')}
            </p>
          </div>
        </div>

        {/* Avatar upload area */}
        <div className="mb-6 flex flex-col items-center rounded-(--radius-card) border border-(--border-subtle) bg-(--bg-surface-2)/50 field-lines py-6">
          <button
            type="button"
            aria-label={t('Upload profile image')}
            onClick={handleAvatarClick}
            className="group relative w-24 h-24 rounded-full border-4 border-(--bg-surface) bg-(--bg-surface-2) flex items-center justify-center overflow-hidden shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02]"
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={t('Profile avatar preview')}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-black text-(--text-primary)">
                {displayInitials}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="w-6 h-6 text-white" aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            onClick={handleAvatarClick}
            className="mt-3 text-sm font-semibold text-(--brand-yellow) hover:text-(--brand-yellow-soft)"
          >
            {t('Change profile image')}
          </button>
          <p className="mt-1 text-xs text-(--text-muted)">
            {t('JPG, PNG, WEBP, or GIF. Max size 5MB.')}
          </p>
          {avatarError && (
            <p className="mt-2 text-xs text-(--error)" role="alert" aria-live="polite">
              {avatarError}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Input
            id="edit-name"
            label={t('Name')}
            type="text"
            value={name}
            onChange={event => {
              setName(event.target.value)
              setFormError(null)
            }}
            disabled={isSaving}
            placeholder={t('Your name')}
          />

          <Input
            id="edit-username"
            label={t('Username')}
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
            placeholder={t('username')}
            autoComplete="off"
            leftIcon={<span className="text-sm">@</span>}
            error={usernameError}
            hint={usernameHint}
          />
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
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSaving}
            disabled={saveDisabled}
          >
            {isSaving ? t('Saving...') : t('Save changes')}
          </Button>
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
  const { t } = useTranslation()
  const { user, profile, updateUser, updateUserMetadata } = useAuth()

  if (!user) {
    return (
      <section className="p-4 pb-20">
        <div className="card-console p-6">
          <h1 className="text-xl font-bold text-(--text-primary)">{t('Edit Profile')}</h1>
          <p className="mt-2 text-sm text-(--error)">
            {t('You must be signed in to edit your profile.')}
          </p>
        </div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="p-4 pb-20">
        <div className="card-console p-6">
          <h1 className="text-xl font-bold text-(--text-primary)">{t('Edit Profile')}</h1>
          <p className="mt-2 text-sm text-(--text-muted)">{t('Loading profile...')}</p>
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
