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
  const activeRequestRef = useRef<number | null>(null)
  const requestSerialRef = useRef(0)
  const generationRef = useRef(0)

  const fetchFeed = useCallback(
    async (
      cursor: string | null,
      isRefresh: boolean,
      generation = generationRef.current,
    ): Promise<boolean> => {
      if (!user?.id || activeRequestRef.current !== null) return false
      const requestSerial = ++requestSerialRef.current
      activeRequestRef.current = requestSerial

      try {
        const { posts: newPosts, error: fetchError } = await getFeed(
          user.id,
          filter,
          cursor,
          PAGE_SIZE
        )

        if (generation !== generationRef.current) return false

        if (fetchError) {
          setError(fetchError.message)
          return false
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
        return true
      } catch (fetchException) {
        if (generation !== generationRef.current) return false
        setError(
          fetchException instanceof Error
            ? fetchException.message
            : 'Unexpected feed error',
        )
        return false
      } finally {
        if (activeRequestRef.current === requestSerial) {
          activeRequestRef.current = null
        }
      }
    },
    [user?.id, filter]
  )

  // Initial load + filter changes
  useEffect(() => {
    const generation = ++generationRef.current
    // A filter or account change supersedes any older request. The older
    // response is ignored by the generation guard while this fetch can start
    // immediately instead of leaving the new filter with an empty feed.
    activeRequestRef.current = null

    if (!user?.id) {
      setPosts([])
      setIsLoading(false)
      setHasInitiallyLoaded(false)
      setError(null)
      return
    }

    setIsLoading(true)
    cursorRef.current = null
    setPosts([])
    setHasMore(true)

    void fetchFeed(null, true, generation).finally(() => {
      if (generation !== generationRef.current) return
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    })

    return () => {
      if (generation === generationRef.current) {
        generationRef.current += 1
        activeRequestRef.current = null
      }
    }
  }, [user?.id, filter, fetchFeed])

  const refresh = useCallback(async () => {
    if (activeRequestRef.current !== null) return
    setIsRefreshing(true)
    cursorRef.current = null
    try {
      await fetchFeed(null, true)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchFeed])

  const loadMore = useCallback(async () => {
    if (!hasMore || activeRequestRef.current !== null) return
    setIsLoadingMore(true)
    try {
      await fetchFeed(cursorRef.current, false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, fetchFeed])

  const setFilter = useCallback((newFilter: FeedFilter) => {
    setFilterState(newFilter)
  }, [])

  // Optimistic mutations exposed to usePostActions
  const addPost = useCallback((post: Post) => {
    setPosts((currentPosts) => [
      post,
      ...currentPosts.filter((currentPost) => currentPost.id !== post.id),
    ].sort((left, right) => right.created_at.localeCompare(left.created_at)))
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
