import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  FileText,
  LoaderCircle,
  MessageCircle,
  RefreshCcw,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import ViewportPage from '@/app/layouts/ViewportPage'
import {
  Avatar,
  Button,
  EmptyState,
  Skeleton,
  Surface,
} from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getOrCreateConversation } from '@/features/messages/api/messagesApi'
import type { MessageUser } from '@/features/messages/types'
import {
  blockUser,
  followUser,
  getPublicProfileView,
  reportUser,
  unfollowUser,
  unblockUser,
} from '../api/socialApi'
import { usePostActions } from '../hooks/usePostActions'
import { usePublicProfileFeed } from '../hooks/usePublicProfileFeed'
import type { Post, PublicProfileView } from '../types'
import BlockConfirmDialog from './BlockConfirmDialog'
import PostBox from './PostBox'
import PublicProfileMenu from './PublicProfileMenu'
import ReportDialog from './ReportDialog'
import { useTranslation } from 'react-i18next'

function PostSkeleton() {
  return (
    <Surface aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="3rem" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="9rem" />
          <Skeleton variant="text" width="6rem" className="h-3" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="78%" />
      </div>
      <div className="mt-5 grid grid-cols-5 gap-3 border-t border-(--mc-color-border) pt-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} variant="text" className="h-5" />
        ))}
      </div>
    </Surface>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 280 190"
      className="pointer-events-none absolute -right-12 top-0 h-[68%] w-[72%] text-(--mc-color-border-strong) opacity-55 sm:h-full sm:w-[58%]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      aria-hidden="true"
    >
      <path d="M56 10 267 28 245 178 14 143Z" />
      <path d="m149 18-11 143" />
      <ellipse cx="143" cy="91" rx="29" ry="23" transform="rotate(-5 143 91)" />
      <path d="m48 56-30-4-6 62 29 7M242 57l29 4-9 85-29-7" />
      <path d="M91 13 70 151M207 22l-17 144" opacity=".55" />
    </svg>
  )
}

function getProfileLink(username: string): string {
  return `${window.location.origin}/app/profile/${encodeURIComponent(username)}`
}

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { username: usernameParam } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const userId = user?.id

  const username = useMemo(() => {
    if (!usernameParam) return ''
    try {
      return decodeURIComponent(usernameParam)
    } catch {
      return usernameParam
    }
  }, [usernameParam])

  const isOwnProfileRoute = useMemo(() => {
    if (!profile?.username || !username) return false
    return profile.username.toLowerCase() === username.toLowerCase()
  }, [profile, username])

  const [loadedProfileView, setProfileView] = useState<PublicProfileView | null>(null)
  const [loadedProfileUsername, setLoadedProfileUsername] = useState<string | null>(null)
  const [profileLoadPending, setProfileLoadPending] = useState(true)
  const [loadedProfileError, setProfileError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isFollowUpdating, setIsFollowUpdating] = useState(false)
  const [isBlockUpdating, setIsBlockUpdating] = useState(false)
  const [isStartingConversation, setIsStartingConversation] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockConfirmDialog, setShowBlockConfirmDialog] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const profileRequestIdRef = useRef(0)
  const activeProfileIdRef = useRef<string | null>(null)
  const relationshipActionRef = useRef<string | null>(null)

  const hasCurrentProfile = loadedProfileUsername === username
  const profileView = hasCurrentProfile ? loadedProfileView : null
  const profileError = hasCurrentProfile ? loadedProfileError : null
  const isProfileLoading = profileLoadPending || !hasCurrentProfile

  activeProfileIdRef.current = profileView?.id ?? null

  useEffect(() => {
    if (!isOwnProfileRoute) return
    navigate('/app/profile', { replace: true })
  }, [isOwnProfileRoute, navigate])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 2000)
  }, [])

  const loadProfileView = useCallback(async () => {
    const requestId = ++profileRequestIdRef.current

    if (!username) {
      setProfileError(t('Missing username.'))
      setProfileView(null)
      setLoadedProfileUsername(username)
      setProfileLoadPending(false)
      return
    }

    if (!userId) {
      setLoadedProfileUsername(username)
      setProfileLoadPending(false)
      return
    }

    setProfileLoadPending(true)
    setProfileView(null)
    setProfileError(null)
    setActionError(null)
    setIsFollowUpdating(false)
    setIsBlockUpdating(false)
    setIsStartingConversation(false)
    setShowReportDialog(false)
    setShowBlockConfirmDialog(false)

    try {
      const { profile: publicProfile, error } = await getPublicProfileView(
        userId,
        username,
      )

      if (requestId !== profileRequestIdRef.current) return

      if (error) {
        setProfileError(error.message)
        setProfileView(null)
        setLoadedProfileUsername(username)
        return
      }

      setProfileView(publicProfile)
      setLoadedProfileUsername(username)
    } catch (loadError) {
      if (requestId !== profileRequestIdRef.current) return
      setProfileError(
        loadError instanceof Error
          ? loadError.message
          : t('Something went wrong loading this profile.'),
      )
      setProfileView(null)
      setLoadedProfileUsername(username)
    } finally {
      if (requestId === profileRequestIdRef.current) {
        setProfileLoadPending(false)
      }
    }
  }, [username, userId, t])

  useEffect(() => {
    if (isOwnProfileRoute || !userId) return
    void loadProfileView()
    return () => {
      profileRequestIdRef.current += 1
    }
  }, [loadProfileView, isOwnProfileRoute, userId])

  const canLoadFullProfile = !!profileView && !profileView.has_blocked_viewer
  const canShowFeed = !!profileView && !profileView.has_blocked_viewer && !profileView.is_blocked_by_viewer

  const {
    posts,
    isLoading,
    hasInitiallyLoaded,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    addPost,
    removePost,
    removePostsByUser,
    updatePost,
  } = usePublicProfileFeed(userId ?? null, profileView?.id ?? null, canShowFeed)

  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
  } = usePostActions({
    updatePost,
    removePost,
    removePostsByUser,
    addPost,
  })

  const displayName = profileView?.name || profileView?.username || username

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore || !canShowFeed) return

    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      void loadMore()
    }
  }, [isLoadingMore, hasMore, canShowFeed, loadMore])

  const handleSharePost = useCallback(
    async (post: Post) => {
      await handleShare(post)
      if (!navigator.share) {
        showToast(t('Link copied to clipboard'))
      }
    },
    [handleShare, showToast, t],
  )

  const handleCommentCountChange = useCallback(
    (postId: string, delta: number) => {
      updatePost(postId, {
        comment_count: Math.max(
          0,
          (posts.find(p => p.id === postId)?.comment_count ?? 0) + delta
        ),
      })
    },
    [posts, updatePost]
  )

  const applyBlockChange = useCallback(
    async (nextBlocked: boolean) => {
      if (!userId || !profileView) return

      const targetProfileId = profileView.id
      const previousBlocked = profileView.is_blocked_by_viewer
      const previousFollowing = profileView.is_following

      if (
        previousBlocked === nextBlocked ||
        relationshipActionRef.current === targetProfileId
      ) return

      relationshipActionRef.current = targetProfileId

      setActionError(null)
      setIsBlockUpdating(true)

      setProfileView(prev =>
        prev?.id === targetProfileId
          ? {
              ...prev,
              is_blocked_by_viewer: nextBlocked,
              is_following: nextBlocked ? false : prev.is_following,
            }
          : prev
      )

      if (nextBlocked) {
        removePostsByUser(profileView.id)
      }

      const restoreRelationship = () => {
        setProfileView(prev =>
          prev?.id === targetProfileId
            ? {
                ...prev,
                is_blocked_by_viewer: previousBlocked,
                is_following: previousFollowing,
              }
            : prev
        )
      }

      try {
        const { error: blockError } = nextBlocked
          ? await blockUser(userId, profileView.id)
          : await unblockUser(userId, profileView.id)

        if (blockError) {
          restoreRelationship()
          if (activeProfileIdRef.current === targetProfileId) {
            setActionError(blockError.message)
            if (nextBlocked) await refresh()
          }
        }
      } catch (blockError) {
        restoreRelationship()
        if (activeProfileIdRef.current === targetProfileId) {
          setActionError(
            blockError instanceof Error
              ? blockError.message
              : t('Could not update this block right now.'),
          )
          if (nextBlocked) await refresh()
        }
      } finally {
        if (relationshipActionRef.current === targetProfileId) {
          relationshipActionRef.current = null
        }
        if (activeProfileIdRef.current === targetProfileId) {
          setIsBlockUpdating(false)
        }
      }
    },
    [profileView, refresh, removePostsByUser, t, userId],
  )

  const handleFollowToggle = useCallback(async () => {
    if (!userId || !profileView || profileView.is_blocked_by_viewer) return

    const targetProfileId = profileView.id
    const previousFollowing = profileView.is_following
    if (relationshipActionRef.current === targetProfileId) return

    relationshipActionRef.current = targetProfileId
    setActionError(null)
    setIsFollowUpdating(true)

    setProfileView(prev =>
      prev?.id === targetProfileId
        ? { ...prev, is_following: !previousFollowing }
        : prev
    )

    const restoreFollowState = () => {
      setProfileView(prev =>
        prev?.id === targetProfileId
          ? { ...prev, is_following: previousFollowing }
          : prev
      )
    }

    try {
      const { error: followError } = previousFollowing
        ? await unfollowUser(userId, profileView.id)
        : await followUser(userId, profileView.id)

      if (followError) {
        restoreFollowState()
        if (activeProfileIdRef.current === targetProfileId) {
          setActionError(followError.message)
        }
      }
    } catch (followError) {
      restoreFollowState()
      if (activeProfileIdRef.current === targetProfileId) {
        setActionError(
          followError instanceof Error
            ? followError.message
            : t('Could not update this follow right now.'),
        )
      }
    } finally {
      if (relationshipActionRef.current === targetProfileId) {
        relationshipActionRef.current = null
      }
      if (activeProfileIdRef.current === targetProfileId) {
        setIsFollowUpdating(false)
      }
    }
  }, [profileView, t, userId])

  const handleStartConversation = useCallback(async () => {
    if (!userId || !profileView || profileView.is_blocked_by_viewer) return

    setActionError(null)
    setIsStartingConversation(true)

    try {
      const { data: conversationId, error: conversationError } =
        await getOrCreateConversation(userId, profileView.id)

      if (conversationError || !conversationId) {
        setActionError(conversationError?.message ?? t('Failed to open conversation.'))
        return
      }

      const otherUser: MessageUser = {
        id: profileView.id,
        username: profileView.username,
        name: profileView.name,
        photo_url: profileView.photo_url,
      }

      navigate(`/app/messages/${conversationId}`, { state: { otherUser } })
    } catch (conversationError) {
      setActionError(
        conversationError instanceof Error
          ? conversationError.message
          : t('Failed to open conversation.'),
      )
    } finally {
      setIsStartingConversation(false)
    }
  }, [navigate, profileView, t, userId])

  const handleSubmitReport = useCallback(
    async (reason: string) => {
      if (!userId || !profileView) return
      setShowReportDialog(false)

      try {
        const { error: reportError } = await reportUser(userId, profileView.id, reason)
        if (reportError) {
          setActionError(reportError.message)
        } else {
          showToast(t('Report submitted'))
        }
      } catch (reportError) {
        setActionError(
          reportError instanceof Error
            ? reportError.message
            : t('Could not submit this report.'),
        )
      }
    },
    [profileView, showToast, t, userId],
  )

  const handleShareProfile = useCallback(async () => {
    if (!profileView) return

    const url = getProfileLink(profileView.username)

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('@{{username}} on RefLab', { username: profileView.username }),
          url,
        })
        return
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showToast(t('Profile link copied'))
    } catch (copyError) {
      setActionError(
        copyError instanceof Error
          ? copyError.message
          : t('Could not copy the profile link.'),
      )
    }
  }, [profileView, showToast, t])

  const handleCopyProfileLink = useCallback(async () => {
    if (!profileView) return

    try {
      await navigator.clipboard.writeText(getProfileLink(profileView.username))
      showToast(t('Profile link copied'))
    } catch (copyError) {
      setActionError(
        copyError instanceof Error
          ? copyError.message
          : t('Could not copy the profile link.'),
      )
    }
  }, [profileView, showToast, t])

  if (isOwnProfileRoute) {
    return null
  }

  return (
    <ViewportPage ariaLabel={t('Profile')} scroll="managed">
      <div
        ref={scrollRef}
        className="h-full min-h-0 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
      >
        <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8">
        {isProfileLoading && (
          <Surface
            role="status"
            aria-label={t('Loading profile...')}
            padding="none"
            className="mx-auto max-w-4xl overflow-hidden border-(--mc-color-border-strong) shadow-none"
          >
            <div className="flex min-h-[21rem] flex-col justify-end gap-5 px-5 py-6 sm:min-h-[17rem] sm:flex-row sm:items-end sm:px-8 sm:py-8">
              <Skeleton variant="circular" width="8rem" className="shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton variant="text" width="12rem" className="h-8" />
                <Skeleton variant="text" width="8rem" />
              </div>
              <div className="flex gap-2">
                <Skeleton width="8rem" height="2.75rem" />
                <Skeleton width="2.75rem" height="2.75rem" />
              </div>
            </div>
          </Surface>
        )}

        {!isProfileLoading && profileError && (
          <Surface className="mx-auto max-w-3xl">
            <EmptyState
              icon={<AlertCircle className="size-6" />}
              title={t('Something went wrong loading this profile.')}
              description={profileError}
              action={(
                <Button
                  leadingIcon={<RefreshCcw className="size-4" />}
                  onClick={() => void loadProfileView()}
                >
                  {t('Try Again')}
                </Button>
              )}
            />
          </Surface>
        )}

        {!isProfileLoading && !profileError && !profileView && (
          <Surface className="mx-auto max-w-3xl">
            <EmptyState
              icon={<AlertCircle className="size-6" />}
              title={t('Profile not found')}
              description={t('We could not find a public profile for @{{username}}.', { username })}
              action={(
                <Button variant="secondary" onClick={() => navigate('/app/social')}>
                  {t('Back to Feed')}
                </Button>
              )}
            />
          </Surface>
        )}

        {!isProfileLoading && !profileError && profileView && (
          <>
            <Surface
              padding="none"
              className="relative isolate mx-auto max-w-4xl overflow-hidden border-(--mc-color-border-strong) shadow-none"
            >
              <div className="absolute left-0 top-0 size-20 bg-(--mc-color-accent) [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
              <div className="absolute bottom-10 right-0 h-20 w-9 bg-(--mc-color-danger) [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden="true" />
              <PitchDiagram />

              {canLoadFullProfile && (
                <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                  <PublicProfileMenu
                    username={profileView.username}
                    isBlockedByViewer={profileView.is_blocked_by_viewer}
                    isBusy={isBlockUpdating || isFollowUpdating}
                    onToggleBlock={() => {
                      if (profileView.is_blocked_by_viewer) {
                        void applyBlockChange(false)
                      } else {
                        setShowBlockConfirmDialog(true)
                      }
                    }}
                    onReport={() => setShowReportDialog(true)}
                    onShare={() => void handleShareProfile()}
                    onCopyLink={() => void handleCopyProfileLink()}
                  />
                </div>
              )}

              <div className="relative z-10 flex min-h-[22rem] flex-col justify-end px-5 py-6 sm:min-h-[18rem] sm:flex-row sm:items-end sm:gap-7 sm:px-8 sm:py-8">
                <Avatar
                  src={profileView.photo_url}
                  alt={displayName}
                  name={displayName}
                  size="xl"
                  className="!size-28 border-(--mc-color-border-strong) bg-(--mc-color-canvas) shadow-(--mc-shadow-raised) sm:!size-32"
                  imageProps={{ loading: 'eager' }}
                />

                <div className="mt-5 min-w-0 flex-1 sm:mt-0">
                  <h2 className="truncate text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl">
                    {displayName}
                  </h2>
                  <p className="mt-1 truncate text-base text-(--mc-color-text-muted) sm:text-lg">
                    @{profileView.username}
                  </p>

                  {profileView.has_blocked_viewer && (
                    <p className="mt-4 max-w-md text-sm leading-6 text-(--mc-color-text-muted)">
                      {t('This user is unavailable.')}
                    </p>
                  )}
                </div>

                {!profileView.has_blocked_viewer && (
                  <div className="mt-5 flex w-full gap-2 sm:mt-0 sm:w-auto sm:shrink-0">
                    <Button
                      variant={profileView.is_following ? 'secondary' : 'primary'}
                      leadingIcon={
                        profileView.is_following
                          ? <UserCheck className="size-4" />
                          : <UserPlus className="size-4" />
                      }
                      loading={isFollowUpdating}
                      disabled={isBlockUpdating || profileView.is_blocked_by_viewer}
                      onClick={() => void handleFollowToggle()}
                      aria-label={profileView.is_following ? t('Unfollow user') : t('Follow user')}
                      className="flex-1 sm:min-w-32"
                    >
                      {profileView.is_following ? t('Unfollow') : t('Follow')}
                    </Button>

                    <Button
                      variant="secondary"
                      leadingIcon={<MessageCircle className="size-4" />}
                      loading={isStartingConversation}
                      loadingText={t('Opening...')}
                      disabled={isBlockUpdating || profileView.is_blocked_by_viewer}
                      onClick={() => void handleStartConversation()}
                      aria-label={t('Send message')}
                      className="flex-1 sm:min-w-32"
                    >
                      {t('Message')}
                    </Button>
                  </div>
                )}
              </div>

              {profileView.is_blocked_by_viewer && !profileView.has_blocked_viewer && (
                <div className="relative z-10 border-t border-(--mc-color-border) bg-(--mc-color-canvas)/75 px-5 py-3 text-sm text-(--mc-color-text-muted) sm:px-8">
                  {t('You blocked this user. Unblock to view their posts.')}
                </div>
              )}
            </Surface>

            {actionError && (
              <div
                role="alert"
                className="mx-auto flex max-w-3xl items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-sm leading-6 text-(--mc-color-text-secondary)"
              >
                <AlertCircle className="mt-1 size-4 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
                <span className="break-words">{actionError}</span>
              </div>
            )}

            <div className="mx-auto max-w-3xl space-y-4">

            {canShowFeed && isRefreshing && (
              <div className="flex min-h-10 items-center justify-center" role="status" aria-label={t('Refreshing posts')}>
                <RefreshCcw className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              </div>
            )}

            {canShowFeed && isLoading && (
              <div className="space-y-4" role="status" aria-label={t('Loading posts')}>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            )}

            {canShowFeed && error && !isLoading && (
              <Surface>
                <EmptyState
                  icon={<RefreshCcw className="size-6" />}
                  title={t('Something went wrong loading this profile feed.')}
                  description={error}
                  action={(
                    <Button
                      leadingIcon={<RefreshCcw className="size-4" />}
                      onClick={() => void refresh()}
                    >
                      {t('Try Again')}
                    </Button>
                  )}
                />
              </Surface>
            )}

            {canShowFeed &&
              !isLoading &&
              !error &&
              posts.map((post) => (
                <PostBox
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onSave={handleSave}
                  onRepost={handleRepost}
                  onShare={handleSharePost}
                  onDelete={handleDelete}
                  onReport={handleReport}
                  onBlock={() => {
                    void applyBlockChange(true)
                  }}
                  onCommentCountChange={handleCommentCountChange}
                />
              ))}

            {canShowFeed && isLoadingMore && (
              <div className="flex min-h-16 items-center justify-center" role="status" aria-label={t('Loading more posts')}>
                <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              </div>
            )}

            {canShowFeed && !isLoading && !hasMore && posts.length > 0 && (
              <p className="py-4 text-center text-xs text-(--mc-color-text-muted)">
                {t("You're all caught up!")}
              </p>
            )}

            {canShowFeed && !isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
              <Surface>
                <EmptyState
                  icon={<FileText className="size-6" />}
                  title={t('No posts yet')}
                  description={t('This user has not posted yet.')}
                />
              </Surface>
            )}
            </div>
          </>
        )}
        </div>
      </div>

      {showReportDialog && (
        <ReportDialog
          type="user"
          onSubmit={reason => {
            void handleSubmitReport(reason)
          }}
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {showBlockConfirmDialog && profileView && (
        <BlockConfirmDialog
          username={profileView.username}
          onConfirm={() => {
            setShowBlockConfirmDialog(false)
            void applyBlockChange(true)
          }}
          onClose={() => setShowBlockConfirmDialog(false)}
        />
      )}

      {toastMessage && (
        <div
          className="mc-layer-toast fixed bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-3 text-center text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised) md:bottom-6"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </ViewportPage>
  )
}
