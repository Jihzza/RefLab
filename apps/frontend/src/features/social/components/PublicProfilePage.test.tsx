// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicProfileView } from '../types'
import PublicProfilePage from './PublicProfilePage'

const VIEWER_A = 'public-profile-viewer-a'
const VIEWER_B = 'public-profile-viewer-b'
const TARGET_ID = 'shared-public-profile-target'
const TARGET_USERNAME = 'shared_referee'

const mocks = vi.hoisted(() => ({
  currentUserId: 'public-profile-viewer-a',
  navigate: vi.fn(),
  getPublicProfileView: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  reportUser: vi.fn(),
  getOrCreateConversation: vi.fn(),
  relationshipActions: [] as Array<() => void>,
  translate: (key: string) => key,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mocks.translate }),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ username: TARGET_USERNAME }),
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: { id: mocks.currentUserId },
    profile: {
      id: mocks.currentUserId,
      username: `viewer_${mocks.currentUserId}`,
      name: 'Viewer',
      photo_url: null,
    },
  }),
}))

vi.mock('../api/socialApi', () => ({
  getPublicProfileView: mocks.getPublicProfileView,
  followUser: mocks.followUser,
  unfollowUser: mocks.unfollowUser,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
  reportUser: mocks.reportUser,
}))

vi.mock('@/features/messages/api/messagesApi', () => ({
  getOrCreateConversation: mocks.getOrCreateConversation,
}))

vi.mock('../hooks/usePublicProfileFeed', () => ({
  usePublicProfileFeed: () => ({
    posts: [],
    isLoading: false,
    hasInitiallyLoaded: true,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    refresh: vi.fn(),
    loadMore: vi.fn(),
    addPost: vi.fn(),
    restorePost: vi.fn(),
    removePost: vi.fn(),
    removePostsByUser: vi.fn(),
    updatePost: vi.fn(),
  }),
}))

vi.mock('../hooks/usePostActions', () => ({
  usePostActions: () => ({
    handleLike: vi.fn(),
    handleSave: vi.fn(),
    handleRepost: vi.fn(),
    handleShare: vi.fn(),
    handleDelete: vi.fn(),
    handleReport: vi.fn(),
  }),
}))

vi.mock('@/app/layouts/ViewportPage', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui', () => ({
  Avatar: () => <span data-testid="profile-avatar" />,
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    'aria-label'?: string
  }) => {
    if (
      onClick &&
      (ariaLabel === 'Follow user' || ariaLabel === 'Unfollow user')
    ) {
      mocks.relationshipActions.push(onClick)
    }
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    )
  },
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
  }) => <div>{title}{description}{action}</div>,
  Skeleton: () => <span data-testid="skeleton" />,
  Surface: ({
    children,
    role,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode
    role?: string
    'aria-label'?: string
  }) => <section role={role} aria-label={ariaLabel}>{children}</section>,
}))

vi.mock('./PostBox', () => ({
  default: () => null,
}))

vi.mock('./PublicProfileMenu', () => ({
  default: () => null,
}))

vi.mock('./BlockConfirmDialog', () => ({
  default: () => null,
}))

vi.mock('./ReportDialog', () => ({
  default: () => null,
}))

beforeEach(() => {
  mocks.currentUserId = VIEWER_A
  mocks.navigate.mockReset()
  mocks.getPublicProfileView.mockReset()
  mocks.followUser.mockReset().mockResolvedValue({ error: null })
  mocks.unfollowUser.mockReset().mockResolvedValue({ error: null })
  mocks.blockUser.mockReset().mockResolvedValue({ error: null })
  mocks.unblockUser.mockReset().mockResolvedValue({ error: null })
  mocks.reportUser.mockReset().mockResolvedValue({ created: true, error: null })
  mocks.getOrCreateConversation.mockReset().mockResolvedValue({
    data: 'conversation-id',
    error: null,
  })
  mocks.relationshipActions.length = 0
})

afterEach(cleanup)

describe('PublicProfilePage viewer ownership', () => {
  it('hides A identity and relationships while B loads the same username', async () => {
    const profileA = profileView('Relationship name A', false)
    const profileB = profileView('Relationship name B', true)
    const accountBResponse = deferred<{
      profile: PublicProfileView
      error: null
    }>()

    mocks.getPublicProfileView.mockImplementation((viewerId: string) => {
      if (viewerId === VIEWER_A) {
        return Promise.resolve({ profile: profileA, error: null })
      }
      return accountBResponse.promise
    })

    const { rerender } = render(<PublicProfilePage />)
    await screen.findByText('Relationship name A')
    expect(screen.getByRole('button', { name: 'Follow user' })).toBeTruthy()
    const staleRelationshipAction = mocks.relationshipActions.at(-1)
    expect(staleRelationshipAction).toBeTypeOf('function')

    mocks.currentUserId = VIEWER_B
    rerender(<PublicProfilePage />)

    expect(screen.queryByText('Relationship name A')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Follow user' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Unfollow user' })).toBeNull()
    expect(screen.getByRole('status', { name: 'Loading profile...' })).toBeTruthy()
    await waitFor(() => expect(mocks.getPublicProfileView).toHaveBeenCalledTimes(2))

    await act(async () => {
      await staleRelationshipAction?.()
    })

    expect(mocks.followUser).not.toHaveBeenCalledWith(
      VIEWER_B,
      TARGET_ID,
    )
    expect(screen.queryByText('Relationship name A')).toBeNull()

    await act(async () => {
      accountBResponse.resolve({ profile: profileB, error: null })
      await accountBResponse.promise
    })

    await screen.findByText('Relationship name B')
    expect(screen.getByRole('button', { name: 'Unfollow user' })).toBeTruthy()
    expect(screen.queryByText('Relationship name A')).toBeNull()
    expect(mocks.getPublicProfileView).toHaveBeenNthCalledWith(
      1,
      VIEWER_A,
      TARGET_USERNAME,
    )
    expect(mocks.getPublicProfileView).toHaveBeenNthCalledWith(
      2,
      VIEWER_B,
      TARGET_USERNAME,
    )
  })
})

function profileView(name: string, isFollowing: boolean): PublicProfileView {
  return {
    id: TARGET_ID,
    username: TARGET_USERNAME,
    name,
    photo_url: null,
    is_following: isFollowing,
    is_blocked_by_viewer: false,
    has_blocked_viewer: false,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
