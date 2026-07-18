import React, { useCallback, useState } from 'react'
import { Repeat2 } from 'lucide-react'
import Surface from '@/components/ui/Surface'
import { useAuth } from '@/features/auth/components/useAuth'
import PostHeader from './PostHeader'
import PostBody from './PostBody'
import PostFooter from './PostFooter'
import CommentSection from './CommentSection'
import ReportDialog from './ReportDialog'
import BlockConfirmDialog from './BlockConfirmDialog'
import type {
  Post,
  ReportSubmission,
  ReportSubmissionResult,
} from '../types'
import { useTranslation } from 'react-i18next'

interface PostBoxProps {
  post: Post
  onLike: (post: Post) => void
  onSave: (post: Post) => void
  onRepost: (post: Post) => void
  onShare: (post: Post) => void
  onDelete: (post: Post) => void
  onReport: (
    type: 'post' | 'user',
    targetId: string,
    submission: ReportSubmission,
  ) => Promise<ReportSubmissionResult>
  onBlock: (userId: string) => void
  onCommentCountChange: (postId: string, delta: number) => void
  defaultShowComments?: boolean
  resolveMediaUrl?: (path: string) => string
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
  resolveMediaUrl,
}) => {
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

  const commentsId = `post-${post.id}-comments`

  return (
    <Surface
      role="article"
      aria-label={post.content ? undefined : t('Post by {{name}}', {
        name: post.author.name || post.author.username,
      })}
      padding="none"
      className="relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-(--mc-color-accent) via-(--mc-color-border-strong) to-(--mc-color-danger) opacity-80"
        aria-hidden="true"
      />

      {isRepost && (
        <div className="flex min-h-10 items-center gap-2 border-b border-(--mc-color-border) px-4 text-xs font-medium text-(--mc-color-text-muted) sm:px-5">
          <Repeat2 className="size-4 text-(--mc-color-success)" aria-hidden="true" />
          <span className="truncate">
            {t('{{name}} reposted', { name: post.author.name || post.author.username })}
          </span>
        </div>
      )}

      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <PostHeader
          author={post.author}
          createdAt={post.created_at}
          isOwnPost={isOwnPost}
          onReportPost={() => setReportDialog({ type: 'post', targetId: post.id })}
          onReportUser={() => setReportDialog({ type: 'user', targetId: post.author.id })}
          onBlockUser={() => setBlockDialog({ userId: post.author.id, username: post.author.username })}
          onDelete={() => onDelete(post)}
        />

        <PostBody post={post} resolveMediaUrl={resolveMediaUrl} />
      </div>

      <div className="px-2 sm:px-3">
        <PostFooter
          post={post}
          commentsExpanded={showComments}
          commentsId={commentsId}
          onLike={() => onLike(post)}
          onComment={() => setShowComments((value) => !value)}
          onRepost={() => onRepost(post)}
          onSave={() => onSave(post)}
          onShare={() => onShare(post)}
        />
      </div>

      {showComments && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <CommentSection
            id={commentsId}
            postId={post.id}
            onCommentCountChange={handleCommentCountChange}
          />
        </div>
      )}

      {/* Report dialog */}
      {reportDialog && (
        <ReportDialog
          type={reportDialog.type}
          onSubmit={(submission) => onReport(
            reportDialog.type,
            reportDialog.targetId,
            submission,
          )}
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
