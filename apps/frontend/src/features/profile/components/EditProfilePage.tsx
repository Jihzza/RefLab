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
import { useTranslation } from 'react-i18next'
import { AtSign, Camera, UserRound } from 'lucide-react'
import DocumentPage from '@/app/layouts/DocumentPage'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { getSafeRemoteAvatarUrl } from '../avatarUrl'

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
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>('idle')
  const [isSaving, setIsSaving] = useState(false)

  const usernameRequestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null)

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

  const displayAvatar = getSafeRemoteAvatarUrl(
    profile.photo_url ??
    (typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null)
  )

  const displayInitials = getInitials(normalizedName, normalizedUsername)

  const navigateBackWithFallback = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/app/profile', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!avatarFile) return

    let cancelled = false

    const renderSafePreview = async () => {
      try {
        const bitmap = await createImageBitmap(avatarFile)

        if (cancelled) {
          bitmap.close()
          return
        }

        const canvas = avatarCanvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context) {
          bitmap.close()
          throw new Error('Avatar preview canvas is unavailable.')
        }

        const previewSize = 256
        const cropSize = Math.min(bitmap.width, bitmap.height)
        const sourceX = (bitmap.width - cropSize) / 2
        const sourceY = (bitmap.height - cropSize) / 2

        canvas.width = previewSize
        canvas.height = previewSize
        context.clearRect(0, 0, previewSize, previewSize)
        context.drawImage(
          bitmap,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          previewSize,
          previewSize
        )
        bitmap.close()
      } catch {
        if (!cancelled) {
          setAvatarFile(null)
          setAvatarError(t('Avatar must be a valid image file.'))
        }
      }
    }

    void renderSafePreview()

    return () => {
      cancelled = true
    }
  }, [avatarFile, t])

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

    setAvatarError(null)
    setAvatarFile(file)
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

  const saveDisabled =
    isSaving ||
    !hasChanges ||
    !!usernameFormatError ||
    usernameAvailability === 'taken' ||
    usernameAvailability === 'checking'

  return (
    <DocumentPage
      ariaLabel={t('Edit Profile')}
      eyebrow="Match Control"
      title={t('Edit Profile')}
      description={t('Update your profile details and avatar.')}
      width="narrow"
    >
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)"
      >
        <div className="grid md:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="relative overflow-hidden border-b border-(--mc-color-border) bg-(--mc-color-surface-raised) p-6 md:border-b-0 md:border-r">
            <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full border border-(--mc-color-border)" aria-hidden="true" />
            <div className="relative flex flex-col items-center text-center">
              <button
                type="button"
                aria-label={t('Upload profile image')}
                onClick={handleAvatarClick}
                className="group relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-(--mc-color-accent)/70 bg-(--mc-color-canvas) shadow-(--mc-shadow-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-surface-raised)"
              >
                {avatarFile ? (
                  <canvas
                    ref={avatarCanvasRef}
                    role="img"
                    aria-label={t('Profile avatar preview')}
                    className="size-full object-cover"
                  />
                ) : displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={t('Profile avatar preview')}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold text-(--mc-color-text)">
                    {displayInitials}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-black/65 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                  <Camera className="size-4" aria-hidden="true" />
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAvatarClick}
                leadingIcon={<Camera className="size-4" />}
                className="mt-3 text-(--mc-color-accent)"
              >
                {t('Change profile image')}
              </Button>
              <p className="mt-1 text-xs leading-5 text-(--mc-color-text-muted)">
                {t('JPG, PNG, WEBP, or GIF. Max size 5MB.')}
              </p>
              {avatarError && (
                <p className="mt-2 text-xs text-(--mc-color-danger)" role="alert" aria-live="polite">
                  {avatarError}
                </p>
              )}
            </div>
          </aside>

          <div className="space-y-5 p-5 sm:p-6">
            <Input
              id="edit-name"
              type="text"
              label={t('Name')}
              value={name}
              onChange={event => {
                setName(event.target.value)
                setFormError(null)
              }}
              disabled={isSaving}
              placeholder={t('Your name')}
              startAdornment={<UserRound className="size-4" />}
            />

            <div>
              <Input
                  id="edit-username"
                  type="text"
                  label={t('Username')}
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
                  startAdornment={<AtSign className="size-4" />}
                  hint={t('3-30 characters. Lowercase letters, numbers, dots, and underscores.')}
                  error={usernameTouched ? usernameFormatError : undefined}
                />

            {showUsernameStatus && usernameAvailability === 'checking' && (
              <p className="mt-2 text-xs text-(--mc-color-text-muted)" aria-live="polite">
                {t('Checking username availability...')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'available' && (
              <p className="mt-2 text-xs text-(--mc-color-success)" aria-live="polite">
                {t('Username is available.')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'taken' && (
              <p className="mt-2 text-xs text-(--mc-color-danger)" role="alert" aria-live="polite">
                {t('That username is already taken.')}
              </p>
            )}

            {showUsernameStatus && usernameAvailability === 'error' && (
              <p className="mt-2 text-xs text-(--mc-color-warning)" aria-live="polite">
                {t('Could not verify username right now. We will check again on save.')}
              </p>
            )}
            </div>

            {formError && (
              <div
                className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-sm text-(--mc-color-danger)"
                role="alert"
                aria-live="polite"
              >
                {formError}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-(--mc-color-border) bg-(--mc-color-surface-raised) px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={saveDisabled}
            loading={isSaving}
            loadingText={t('Saving...')}
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
        className="hidden"
      />
    </DocumentPage>
  )
}

export default function EditProfilePage() {
  const { t } = useTranslation()
  const { user, profile, updateUser, updateUserMetadata } = useAuth()

  if (!user) {
    return (
      <DocumentPage ariaLabel={t('Edit Profile')} title={t('Edit Profile')} width="narrow">
        <div className="rounded-(--mc-radius-card) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-5">
          <p className="text-sm text-(--mc-color-danger)">
            {t('You must be signed in to edit your profile.')}
          </p>
        </div>
      </DocumentPage>
    )
  }

  if (!profile) {
    return (
      <DocumentPage ariaLabel={t('Edit Profile')} title={t('Edit Profile')} width="narrow">
        <div className="animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) p-6" aria-label={t('Loading profile...')}>
          <div className="mx-auto size-24 rounded-full bg-(--mc-color-surface-raised)" />
          <div className="mt-6 h-11 rounded-(--mc-radius-input) bg-(--mc-color-surface-raised)" />
          <div className="mt-4 h-11 rounded-(--mc-radius-input) bg-(--mc-color-surface-raised)" />
        </div>
      </DocumentPage>
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
