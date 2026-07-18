// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '../types'
import PostDetailPage from './PostDetailPage'

const VIEWER_A = 'post-detail-viewer-a'
const VIEWER_B = 'post-detail-viewer-b'
const POST_ID = 'shared-post-id'

const mocks = vi.hoisted(() => ({
  currentUserId: 'post-detail-viewer-a',
  getPostById: vi.fn(),
  navigate: vi.fn(),
  translate: (key: string) => key,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mocks.translate }),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ postId: POST_ID }),
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: { id: mocks.currentUserId } }),
}))

vi.mock('../api/socialApi', () => ({
  getPostById: mocks.getPostById,
}))

vi.mock('../hooks/usePostActions', () => ({
  usePostActions: () => ({
    handleLike: vi.fn(),
    handleSave: vi.fn(),
    handleRepost: vi.fn(),
    handleShare: vi.fn(),
    handleDelete: vi.fn(),
    handleReport: vi.fn(),
    handleBlock: vi.fn(),
    pendingAction: null,
  }),
}))

vi.mock('@/components/ui/Button', () => ({
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <button type="button" onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/ui/IconButton', () => ({
  default: ({
    children,
    label,
    onClick,
  }: {
    children: React.ReactNode
    label: string
    onClick?: () => void
  }) => <button type="button" aria-label={label} onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/ui/Surface', () => ({
  default: ({
    children,
    role,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode
    role?: string
    'aria-label'?: string
  }) => <section role={role} aria-label={ariaLabel}>{children}</section>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  default: ({
    title,
    description,
    action,
  }: {
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
  }) => <div>{title}{description}{action}</div>,
}))

vi.mock('./PostBox', () => ({
  default: ({ post }: { post: Post }) => (
    <article>
      <p>{post.content}</p>
      <p>{post.author.name}</p>
      <button type="button" aria-label={`like-${post.id}`}>Like</button>
    </article>
  ),
}))

beforeEach(() => {
  mocks.currentUserId = VIEWER_A
  mocks.getPostById.mockReset()
  mocks.navigate.mockReset()
})

afterEach(cleanup)

describe('PostDetailPage owner scope', () => {
  it('hides viewer A post and actions immediately while viewer B loads the same post', async () => {
    const postA = postFor('Post state for viewer A', 'Author visible to A')
    const postB = postFor('Post state for viewer B', 'Author visible to B')
    const accountBResponse = deferred<{ post: Post; error: null }>()

    mocks.getPostById.mockImplementation((viewerId: string) => {
      if (viewerId === VIEWER_A) return Promise.resolve({ post: postA, error: null })
      return accountBResponse.promise
    })

    const { rerender } = render(<PostDetailPage />)
    await screen.findByText('Post state for viewer A')
    expect(screen.getByRole('button', { name: `like-${POST_ID}` })).toBeTruthy()

    mocks.currentUserId = VIEWER_B
    rerender(<PostDetailPage />)

    expect(screen.queryByText('Post state for viewer A')).toBeNull()
    expect(screen.queryByText('Author visible to A')).toBeNull()
    expect(screen.queryByRole('button', { name: `like-${POST_ID}` })).toBeNull()
    expect(screen.getByRole('status', { name: 'Loading post' })).toBeTruthy()
    await waitFor(() => expect(mocks.getPostById).toHaveBeenCalledTimes(2))

    await act(async () => {
      accountBResponse.resolve({ post: postB, error: null })
      await accountBResponse.promise
    })

    await screen.findByText('Post state for viewer B')
    expect(screen.queryByText('Post state for viewer A')).toBeNull()
    expect(mocks.getPostById).toHaveBeenNthCalledWith(1, VIEWER_A, POST_ID)
    expect(mocks.getPostById).toHaveBeenNthCalledWith(2, VIEWER_B, POST_ID)
  })

  it('ignores viewer A response that arrives after viewer B owns the route', async () => {
    const postA = postFor('Late post state for viewer A', 'Late A author')
    const postB = postFor('Authoritative post state for viewer B', 'B author')
    const accountAResponse = deferred<{ post: Post; error: null }>()
    const accountBResponse = deferred<{ post: Post; error: null }>()

    mocks.getPostById.mockImplementation((viewerId: string) => (
      viewerId === VIEWER_A ? accountAResponse.promise : accountBResponse.promise
    ))

    const { rerender } = render(<PostDetailPage />)
    await waitFor(() => expect(mocks.getPostById).toHaveBeenCalledTimes(1))

    mocks.currentUserId = VIEWER_B
    rerender(<PostDetailPage />)
    await waitFor(() => expect(mocks.getPostById).toHaveBeenCalledTimes(2))

    await act(async () => {
      accountAResponse.resolve({ post: postA, error: null })
      await accountAResponse.promise
    })

    expect(screen.queryByText('Late post state for viewer A')).toBeNull()
    expect(screen.getByRole('status', { name: 'Loading post' })).toBeTruthy()

    await act(async () => {
      accountBResponse.resolve({ post: postB, error: null })
      await accountBResponse.promise
    })

    await screen.findByText('Authoritative post state for viewer B')
    expect(screen.queryByText('Late post state for viewer A')).toBeNull()
  })
})

function postFor(content: string, authorName: string): Post {
  return {
    id: POST_ID,
    content,
    media_type: 'text',
    media_url: null,
    media_metadata: null,
    original_post_id: null,
    like_count: 1,
    comment_count: 2,
    repost_count: 3,
    save_count: 4,
    created_at: '2026-07-18T12:00:00.000Z',
    author: {
      id: 'shared-post-author',
      username: 'shared_author',
      name: authorName,
      photo_url: null,
    },
    original_post: null,
    is_liked: false,
    is_saved: false,
    is_reposted: false,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
