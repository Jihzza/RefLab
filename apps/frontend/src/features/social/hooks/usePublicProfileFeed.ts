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
  const [loadedTargetUserId, setLoadedTargetUserId] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const activeRequestRef = useRef<number | null>(null)
  const requestSerialRef = useRef(0)
  const generationRef = useRef(0)
  const removedPostIdsRef = useRef(new Set<string>())
  const targetUserIdRef = useRef(targetUserId)
  const enabledRef = useRef(enabled)

  targetUserIdRef.current = targetUserId
  enabledRef.current = enabled

  const fetchFeed = useCallback(
    async (
      cursor: string | null,
      isRefresh: boolean,
      generation = generationRef.current,
    ): Promise<boolean> => {
      if (!viewerId || !targetUserId || !enabled || activeRequestRef.current !== null) {
        return false
      }

      const requestSerial = ++requestSerialRef.current
      activeRequestRef.current = requestSerial

      try {
        const { posts: fetchedPosts, error: fetchError } =
          await getPublicProfileFeed(viewerId, targetUserId, cursor, PAGE_SIZE)

        if (generation !== generationRef.current) return false

        if (fetchError) {
          setError(fetchError.message)
          return true
        }

        setError(null)
        const visiblePosts = fetchedPosts.filter(
          (post) => !removedPostIdsRef.current.has(post.id),
        )
        setPosts((currentPosts) => (
          isRefresh ? visiblePosts : [...currentPosts, ...visiblePosts]
        ))
        setHasMore(fetchedPosts.length >= PAGE_SIZE)
        cursorRef.current = fetchedPosts.length > 0
          ? fetchedPosts[fetchedPosts.length - 1].created_at
          : cursor
        return true
      } catch (fetchError) {
        if (generation !== generationRef.current) return false
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load profile posts.',
        )
        return true
      } finally {
        if (activeRequestRef.current === requestSerial) {
          activeRequestRef.current = null
        }
      }
    },
    [enabled, targetUserId, viewerId],
  )

  useEffect(() => {
    const generation = ++generationRef.current
    activeRequestRef.current = null

    if (!viewerId || !targetUserId || !enabled) {
      setPosts([])
      setIsLoading(false)
      setHasInitiallyLoaded(false)
      setIsRefreshing(false)
      setIsLoadingMore(false)
      setHasMore(false)
      setError(null)
      setLoadedTargetUserId(null)
      cursorRef.current = null
      return
    }

    setIsLoading(true)
    setIsRefreshing(false)
    setIsLoadingMore(false)
    cursorRef.current = null
    setPosts([])
    setHasMore(true)

    void fetchFeed(null, true, generation).then((completedCurrentRequest) => {
      if (!completedCurrentRequest || generation !== generationRef.current) return
      setLoadedTargetUserId(targetUserId)
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    })

    return () => {
      if (generation === generationRef.current) {
        generationRef.current += 1
        activeRequestRef.current = null
      }
    }
  }, [enabled, fetchFeed, targetUserId, viewerId])

  const refresh = useCallback(async () => {
    if (!viewerId || !targetUserId || !enabled || activeRequestRef.current !== null) return

    const generation = generationRef.current
    setIsRefreshing(true)
    cursorRef.current = null
    const completedCurrentRequest = await fetchFeed(null, true, generation)
    if (completedCurrentRequest && generation === generationRef.current) {
      setIsRefreshing(false)
      setIsLoading(false)
      setHasInitiallyLoaded(true)
    }
  }, [enabled, fetchFeed, targetUserId, viewerId])

  const loadMore = useCallback(async () => {
    if (
      !viewerId
      || !targetUserId
      || !enabled
      || !hasMore
      || activeRequestRef.current !== null
    ) {
      return
    }

    const generation = generationRef.current
    setIsLoadingMore(true)
    const completedCurrentRequest = await fetchFeed(cursorRef.current, false, generation)
    if (completedCurrentRequest && generation === generationRef.current) {
      setIsLoadingMore(false)
    }
  }, [enabled, fetchFeed, hasMore, targetUserId, viewerId])

  const addPost = useCallback((post: Post) => {
    removedPostIdsRef.current.delete(post.id)
    setPosts((currentPosts) => {
      if (!enabledRef.current || post.author.id !== targetUserIdRef.current) {
        return currentPosts.filter((currentPost) => currentPost.id !== post.id)
      }

      return [
        post,
        ...currentPosts.filter((currentPost) => currentPost.id !== post.id),
      ].sort((left, right) => right.created_at.localeCompare(left.created_at))
    })
  }, [])

  const removePost = useCallback((postId: string) => {
    removedPostIdsRef.current.add(postId)
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
  }, [])

  const removePostsByUser = useCallback((userId: string) => {
    setPosts((currentPosts) => currentPosts.filter((post) => post.author.id !== userId))
  }, [])

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts((currentPosts) => currentPosts.map((post) => (
      post.id === postId ? { ...post, ...updates } : post
    )))
  }, [])

  const hasCurrentTarget = Boolean(targetUserId)
    && loadedTargetUserId === targetUserId

  return {
    posts: hasCurrentTarget ? posts : [],
    isLoading: Boolean(enabled && targetUserId) && !hasCurrentTarget ? true : isLoading,
    hasInitiallyLoaded: hasCurrentTarget ? hasInitiallyLoaded : false,
    isRefreshing: hasCurrentTarget ? isRefreshing : false,
    isLoadingMore: hasCurrentTarget ? isLoadingMore : false,
    hasMore: hasCurrentTarget ? hasMore : false,
    error: hasCurrentTarget ? error : null,
    refresh,
    loadMore,
    addPost,
    restorePost: addPost,
    removePost,
    removePostsByUser,
    updatePost,
  }
}
