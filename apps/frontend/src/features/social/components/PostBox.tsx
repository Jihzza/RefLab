import React, { useState, useCallback } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import PostHeader from './PostHeader'
import PostBody from './PostBody'
import PostFooter from './PostFooter'
import CommentSection from './CommentSection'
import ReportDialog from './ReportDialog'
import BlockConfirmDialog from './BlockConfirmDialog'
import type { Post } from '../types'

interface PostBoxProps {
  post: Post
  onLike: (post: Post) => void
  onSave: (post: Post) => void
  onRepost: (post: Post) => void
  onShare: (post: Post) => void
  onDelete: (postId: string) => void
  onReport: (type: 'post' | 'user', targetId: string, reason: string) => void
  onBlock: (userId: string) => void
  onCommentCountChange: (postId: string, delta: number) => void
  defaultShowComments?: boolean
}

/** Single post card composing header, body, footer, and expandable comments. */
const PostBox: React.FC<PostBoxProps> = ({
  post,
  onLike,
  onSave,
  onRepost,
  onShare,
  onDelete,
  onReport,
  onBlock,
  onCommentCountChange,
  defaultShowComments = false,
}) => {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(defaultShowComments)
  const [reportDialog, setReportDialog] = useState<{ type: 'post' | 'user'; targetId: string } | null>(null)
  const [blockDialog, setBlockDialog] = useState<{ userId: string; username: string } | null>(null)
  const isOwnPost = user?.id === post.author.id
  const isRepost = post.original_post_id !== null

  const handleCommentCountChange = useCallback(
    (delta: number) => {
      onCommentCountChange(post.id, delta)
    },
    [post.id, onCommentCountChange]
  )

  return (
    <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4">
      {/* Repost label */}
      {isRepost && (
        <div className="flex items-center gap-1.5 text-xs text-(--text-muted) mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
            />
          </svg>
          <span>{post.author.name || post.author.username} reposted</span>
        </div>
      )}

      {/* Header */}
      <PostHeader
        author={post.author}
        createdAt={post.created_at}
        isOwnPost={isOwnPost}
        onReportPost={() => setReportDialog({ type: 'post', targetId: post.id })}
        onReportUser={() => setReportDialog({ type: 'user', targetId: post.author.id })}
        onBlockUser={() => setBlockDialog({ userId: post.author.id, username: post.author.username })}
        onDelete={() => onDelete(post.id)}
      />

      {/* Body */}
      <PostBody post={post} />

      {/* Footer */}
      <PostFooter
        post={post}
        onLike={() => onLike(post)}
        onComment={() => setShowComments(!showComments)}
        onRepost={() => onRepost(post)}
        onSave={() => onSave(post)}
        onShare={() => onShare(post)}
      />

      {/* Comments (expandable) */}
      {showComments && (
        <CommentSection
          postId={post.id}
          onCommentCountChange={handleCommentCountChange}
        />
      )}

      {/* Report dialog */}
      {reportDialog && (
        <ReportDialog
          type={reportDialog.type}
          onSubmit={(reason) => {
            onReport(reportDialog.type, reportDialog.targetId, reason)
            setReportDialog(null)
          }}
          onClose={() => setReportDialog(null)}
        />
      )}

      {/* Block confirmation dialog */}
      {blockDialog && (
        <BlockConfirmDialog
          username={blockDialog.username}
          onConfirm={() => {
            onBlock(blockDialog.userId)
            setBlockDialog(null)
          }}
          onClose={() => setBlockDialog(null)}
        />
      )}
    </div>
  )
}

export default PostBox
