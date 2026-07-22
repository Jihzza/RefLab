import { useCallback, useState } from 'react'
import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Surface } from '@/components/ui'
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
const PostBox = ({
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
}: PostBoxProps) => {
  const { t } = useTranslation()
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
    <Surface className="overflow-visible" padding="md" role="article">
      {/* Repost label */}
      {isRepost && (
        <div className="mb-3 flex items-center gap-2 border-b border-(--mc-color-border) pb-2 text-xs font-medium text-(--mc-color-text-muted)">
          <Repeat2 className="size-3.5 text-(--mc-color-success)" aria-hidden="true" />
          <span>{t('{{name}} reposted', { name: post.author.name || post.author.username })}</span>
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
    </Surface>
  )
}

export default PostBox
