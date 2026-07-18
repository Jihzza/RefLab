// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MessagesWorkspace from './MessagesWorkspace'

const mocks = vi.hoisted(() => ({
  currentUserId: 'account-a',
  conversationId: 'conversation-1' as string | null,
  location: {
    pathname: '/app/messages/conversation-1',
    state: null as null | {
      ownerId: string
      otherUser?: {
        id: string
        username: string
        name: string | null
        photo_url: string | null
      }
    },
  },
  conversations: [] as Array<{
    id: string
    updated_at: string
    other_user: {
      id: string
      username: string
      name: string | null
      photo_url: string | null
    }
    last_message: null
    unread_count: number
  }>,
  navigate: vi.fn(),
  refresh: vi.fn(),
  clearSearch: vi.fn(),
  handleSearch: vi.fn(),
  retrySearch: vi.fn(),
  getOrCreateConversation: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) => (
      values?.name ? key.replace('{{name}}', values.name) : key
    ),
  }),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => mocks.location,
  useNavigate: () => mocks.navigate,
  useParams: () => ({ conversationId: mocks.conversationId ?? undefined }),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: { id: mocks.currentUserId } }),
}))

vi.mock('../api/messagesApi', () => ({
  getOrCreateConversation: mocks.getOrCreateConversation,
}))

vi.mock('../hooks/useConversations', () => ({
  useConversations: () => ({
    conversations: mocks.conversations,
    totalUnread: 0,
    isLoading: false,
    error: null,
    refresh: mocks.refresh,
  }),
}))

vi.mock('../hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    isSending: false,
    loadError: null,
    sendError: null,
    loadMore: vi.fn(),
    retry: vi.fn(),
    sendMessage: vi.fn(),
    retryOutboxMessage: vi.fn(),
    discardOutboxMessage: vi.fn(),
    dismissSendError: vi.fn(),
  }),
}))

vi.mock('../hooks/useUserSearch', () => ({
  useUserSearch: () => ({
    query: '',
    results: [],
    isSearching: false,
    error: null,
    handleSearch: mocks.handleSearch,
    clearSearch: mocks.clearSearch,
    retrySearch: mocks.retrySearch,
  }),
}))

vi.mock('@/app/layouts/SplitPanePage', () => ({
  default: ({
    primary,
    secondary,
  }: {
    primary: React.ReactNode
    secondary: React.ReactNode
  }) => (
    <main>
      <section>{primary}</section>
      <section>{secondary}</section>
    </main>
  ),
}))

vi.mock('@/components/ui', () => ({
  Avatar: ({
    alt,
    name,
    ownerId,
    src,
  }: {
    alt?: string
    name?: string
    ownerId?: string
    src?: string | null
  }) => (
    <img
      data-testid="message-avatar"
      data-owner-id={ownerId}
      src={src ?? undefined}
      alt={alt ?? name ?? ''}
    />
  ),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <button type="button" onClick={onClick}>{children}</button>,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  IconButton: ({
    children,
    label,
    onClick,
  }: {
    children: React.ReactNode
    label: string
    onClick: () => void
  }) => <button type="button" aria-label={label} onClick={onClick}>{children}</button>,
  Skeleton: () => <span>Skeleton</span>,
}))

vi.mock('./ConversationItem', () => ({
  default: ({
    conversation,
    onClick,
  }: {
    conversation: { id: string; other_user: { name: string | null; username: string } }
    onClick: () => void
  }) => (
    <button type="button" onClick={onClick}>
      Open conversation {conversation.other_user.name ?? conversation.other_user.username}
    </button>
  ),
}))

vi.mock('./MessageBubble', () => ({ default: () => <div>Message</div> }))
vi.mock('./MessageInput', () => ({ default: () => <div>Composer</div> }))
vi.mock('./UserSearchBar', () => ({ default: () => <div>Search</div> }))
vi.mock('./UserSearchDropdown', () => ({ default: () => null }))

const ROUTE_USER = {
  id: 'route-user-a',
  username: 'alice',
  name: 'Alice Referee',
  photo_url: 'https://example.invalid/alice.jpg',
}

beforeEach(() => {
  mocks.currentUserId = 'account-a'
  mocks.conversationId = 'conversation-1'
  mocks.location.pathname = '/app/messages/conversation-1'
  mocks.location.state = { ownerId: 'account-a', otherUser: ROUTE_USER }
  mocks.conversations = []
  mocks.navigate.mockReset()
  mocks.refresh.mockReset().mockResolvedValue(undefined)
  mocks.clearSearch.mockReset()
  mocks.handleSearch.mockReset()
  mocks.retrySearch.mockReset()
  mocks.getOrCreateConversation.mockReset()
})

afterEach(cleanup)

describe('MessagesWorkspace route-state ownership', () => {
  it('removes account A profile fallback immediately when auth switches to B', () => {
    const { rerender } = render(<MessagesWorkspace />)

    expect(screen.getByRole('button', {
      name: 'Open Alice Referee profile',
    })).toBeTruthy()
    expect(screen.getByText('@alice')).toBeTruthy()
    expect(screen.getByAltText('Alice Referee').getAttribute('src'))
      .toBe(ROUTE_USER.photo_url)

    mocks.currentUserId = 'account-b'
    rerender(<MessagesWorkspace />)

    expect(screen.queryByRole('button', {
      name: 'Open Alice Referee profile',
    })).toBeNull()
    expect(screen.queryByText('Alice Referee')).toBeNull()
    expect(screen.queryByText('@alice')).toBeNull()
    expect(screen.queryByAltText('Alice Referee')).toBeNull()
    expect(screen.getByText('Conversation')).toBeTruthy()
  })

  it('includes the active ownerId when opening a real conversation snapshot', () => {
    const otherUser = {
      id: 'route-user-b',
      username: 'bruno',
      name: 'Bruno Referee',
      photo_url: null,
    }
    mocks.conversationId = null
    mocks.location.pathname = '/app/messages'
    mocks.location.state = null
    mocks.conversations = [{
      id: 'conversation-2',
      updated_at: '2026-07-18T10:00:00.000Z',
      other_user: otherUser,
      last_message: null,
      unread_count: 0,
    }]

    render(<MessagesWorkspace />)
    fireEvent.click(screen.getByRole('button', {
      name: 'Open conversation Bruno Referee',
    }))

    expect(mocks.navigate).toHaveBeenCalledWith(
      '/app/messages/conversation-2',
      {
        state: {
          ownerId: 'account-a',
          otherUser,
        },
      },
    )
  })
})
