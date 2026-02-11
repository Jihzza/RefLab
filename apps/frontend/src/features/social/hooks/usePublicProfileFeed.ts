import { useCallback, useEffect, useRef, useState } from 'react'
import { getPublicProfileFeed } from '../api/socialApi'
import type { Post } from '../types'

const PAGE_SIZE = 20

export function usePublicProfileFeed(
  viewerId: string | null,
  targetUserId: string | null,
  enabled: boolean
) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const fetchFeed = useCallback(
    async (cursor: string | null, isRefresh: boolean) => {
      if (!viewerId || !targetUserId || !enabled || loadingRef.current) return
      loadingRef.current = true

      try {
        const { posts: fetchedPosts, error: fetchError } =
          await getPublicProfileFeed(viewerId, targetUserId, cursor, PAGE_SIZE)

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        setError(null)

        if (isRefresh) {
          setPosts(fetchedPosts)
        } else {
          setPosts(prev => [...prev, ...fetchedPosts])
        }

        setHasMore(fetchedPosts.length >= PAGE_SIZE)
        cursorRef.current =
          fetchedPosts.length > 0
            ? fetchedPosts[fetchedPosts.length - 1].created_at
            : cursor
      } finally {
        loadingRef.current = false
      }
    },
    [viewerId, targetUserId, enabled]
  )

  useEffect(() => {
    if (!viewerId || !targetUserId || !enabled) {
      setPosts([])
      setIsLoading(false)
      setHasInitiallyLoaded(false)
      setIsRefreshing(false)
      setIsLoadingMore(false)
      setHasMore(false)
      setError(null)
      cursorRef.current = null
      return
    }

    setIsLoading(true)
    cursorRef.current = null
    setPosts([])
    setHasMore(true)

    fetchFeed(null, true).finally(() => {
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    })
  }, [viewerId, targetUserId, enabled, fetchFeed])

  const refresh = useCallback(async () => {
    if (!viewerId || !targetUserId || !enabled) return

    setIsRefreshing(true)
    cursorRef.current = null
    await fetchFeed(null, true)
    setIsRefreshing(false)
  }, [viewerId, targetUserId, enabled, fetchFeed])

  const loadMore = useCallback(async () => {
    if (!viewerId || !targetUserId || !enabled || !hasMore || loadingRef.current) {
      return
    }

    setIsLoadingMore(true)
    await fetchFeed(cursorRef.current, false)
    setIsLoadingMore(false)
  }, [viewerId, targetUserId, enabled, hasMore, fetchFeed])

  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev])
  }, [])

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  const removePostsByUser = useCallback((userId: string) => {
    setPosts(prev => prev.filter(p => p.author.id !== userId))
  }, [])

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...updates } : p)))
  }, [])

  return {
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
  }
}
