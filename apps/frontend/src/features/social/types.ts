// Media type enum matching the database post_media_type
export type PostMediaType = 'text' | 'image' | 'video' | 'audio'

// Author info subset returned by RPC functions
export interface PostAuthor {
  id: string
  username: string
  name: string | null
  photo_url: string | null
}

// Post as returned by get_social_feed RPC
export interface Post {
  id: string
  content: string | null
  media_type: PostMediaType
  media_url: string | null
  media_metadata: {
    width?: number
    height?: number
    duration_seconds?: number
    mime_type?: string
  } | null
  original_post_id: string | null
  like_count: number
  comment_count: number
  repost_count: number
  save_count: number
  created_at: string
  author: PostAuthor
  original_post: (Omit<Post, 'original_post' | 'is_liked' | 'is_saved' | 'is_reposted'> & { author: PostAuthor }) | null
  is_liked: boolean
  is_saved: boolean
  is_reposted: boolean
}

// Comment as returned by get_post_comments RPC
export interface Comment {
  id: string
  content: string
  like_count: number
  created_at: string
  user_id: string
  author: PostAuthor
  is_liked: boolean
  replies: Comment[]
}

// Filter tabs
export type FeedFilter = 'all' | PostMediaType

// Feed state used by useFeed hook
export interface FeedState {
  posts: Post[]
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  filter: FeedFilter
}
