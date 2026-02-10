import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getFeed } from '../api/socialApi'
import type { Post, FeedFilter } from '../types'

const PAGE_SIZE = 20

export function useFeed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<FeedFilter>('all')

  // Use ref for cursor to avoid stale closures
  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const fetchFeed = useCallback(
    async (cursor: string | null, isRefresh: boolean) => {
      if (!user?.id || loadingRef.current) return
      loadingRef.current = true

      try {
        const { posts: newPosts, error: fetchError } = await getFeed(
          user.id,
          filter,
          cursor,
          PAGE_SIZE
        )

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        setError(null)

        if (isRefresh) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }

        setHasMore(newPosts.length >= PAGE_SIZE)
        cursorRef.current =
          newPosts.length > 0
            ? newPosts[newPosts.length - 1].created_at
            : cursor
      } finally {
        loadingRef.current = false
      }
    },
    [user?.id, filter]
  )

  // Initial load + filter changes
  useEffect(() => {
    if (!user?.id) return

    setIsLoading(true)
    cursorRef.current = null
    setPosts([])
    setHasMore(true)

    fetchFeed(null, true).finally(() => {
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    })
  }, [user?.id, filter, fetchFeed])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    cursorRef.current = null
    await fetchFeed(null, true)
    setIsRefreshing(false)
  }, [fetchFeed])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return
    setIsLoadingMore(true)
    await fetchFeed(cursorRef.current, false)
    setIsLoadingMore(false)
  }, [hasMore, fetchFeed])

  const setFilter = useCallback((newFilter: FeedFilter) => {
    setFilterState(newFilter)
  }, [])

  // Optimistic mutations exposed to usePostActions
  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev])
  }, [])

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  const removePostsByUser = useCallback((userId: string) => {
    setPosts(prev => prev.filter(p => p.author.id !== userId))
  }, [])

  const updatePost = useCallback(
    (postId: string, updates: Partial<Post>) => {
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, ...updates } : p))
      )
    },
    []
  )

  return {
    posts,
    isLoading,
    hasInitiallyLoaded,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    filter,
    setFilter,
    refresh,
    loadMore,
    addPost,
    removePost,
    removePostsByUser,
    updatePost,
  }
}
