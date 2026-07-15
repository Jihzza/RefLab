import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getProfileFeed } from '@/features/social/api/socialApi'
import type { FeedFilter, Post } from '@/features/social/types'

const PAGE_SIZE = 20

export function useProfileFeed() {
  const { user } = useAuth()
  const userId = user?.id
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<FeedFilter>('all')

  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const requestIdRef = useRef(0)

  const fetchFeed = useCallback(
    async (cursor: string | null, isRefresh: boolean): Promise<boolean> => {
      if (!userId || (!isRefresh && loadingRef.current)) return false

      const requestId = ++requestIdRef.current
      loadingRef.current = true

      try {
        const { posts: newPosts, error: fetchError } = await getProfileFeed(
          userId,
          userId,
          filter,
          cursor,
          PAGE_SIZE,
        )

        if (requestId !== requestIdRef.current) return false

        if (fetchError) {
          setError(fetchError.message)
          return true
        }

        setError(null)

        if (isRefresh) {
          setPosts(newPosts)
        } else {
          setPosts((currentPosts) => [...currentPosts, ...newPosts])
        }

        setHasMore(newPosts.length >= PAGE_SIZE)
        cursorRef.current =
          newPosts.length > 0
            ? newPosts[newPosts.length - 1].created_at
            : cursor
        return true
      } catch (fetchError) {
        if (requestId !== requestIdRef.current) return false
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load profile posts.',
        )
        return true
      } finally {
        if (requestId === requestIdRef.current) loadingRef.current = false
      }
    },
    [filter, userId],
  )

  useEffect(() => {
    if (!userId) {
      requestIdRef.current += 1
      loadingRef.current = false
      cursorRef.current = null
      setPosts([])
      setIsLoading(false)
      setHasInitiallyLoaded(false)
      setIsRefreshing(false)
      setIsLoadingMore(false)
      setHasMore(true)
      setError(null)
      return
    }

    setIsLoading(true)
    setIsRefreshing(false)
    setIsLoadingMore(false)
    cursorRef.current = null
    setPosts([])
    setHasMore(true)

    void fetchFeed(null, true).then((completedCurrentRequest) => {
      if (!completedCurrentRequest) return
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    })

    return () => {
      requestIdRef.current += 1
      loadingRef.current = false
    }
  }, [userId, filter, fetchFeed])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setIsLoadingMore(false)
    cursorRef.current = null
    const completedCurrentRequest = await fetchFeed(null, true)
    if (completedCurrentRequest) {
      setIsLoading(false)
      setHasInitiallyLoaded(true)
      setIsRefreshing(false)
    }
  }, [fetchFeed])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return
    setIsLoadingMore(true)
    const completedCurrentRequest = await fetchFeed(cursorRef.current, false)
    if (completedCurrentRequest) setIsLoadingMore(false)
  }, [hasMore, fetchFeed])

  const setFilter = useCallback((newFilter: FeedFilter) => {
    setFilterState(newFilter)
  }, [])

  const addPost = useCallback((post: Post) => {
    setPosts((currentPosts) => [post, ...currentPosts])
  }, [])

  const removePost = useCallback((postId: string) => {
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
  }, [])

  const removePostsByUser = useCallback((removedUserId: string) => {
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.author.id !== removedUserId),
    )
  }, [])

  const updatePost = useCallback(
    (postId: string, updates: Partial<Post>) => {
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId ? { ...post, ...updates } : post,
        ),
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
