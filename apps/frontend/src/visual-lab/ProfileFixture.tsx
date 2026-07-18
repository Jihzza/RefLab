import { useState } from 'react'
import { CalendarDays, Pencil, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, IconButton, Surface } from '@/components/ui'
import NavigationBar from '@/features/social/components/NavigationBar'
import PostBody from '@/features/social/components/PostBody'
import PostFooter from '@/features/social/components/PostFooter'
import PostHeader from '@/features/social/components/PostHeader'
import type { FeedFilter, Post } from '@/features/social/types'
import FixtureAuthProvider from './FixtureAuthProvider'
import FixtureShell from './FixtureShell'

const refereePortrait = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#202832"/>
        <stop offset="1" stop-color="#090d12"/>
      </linearGradient>
      <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#20242a"/>
        <stop offset="1" stop-color="#080a0d"/>
      </linearGradient>
    </defs>
    <rect width="240" height="240" fill="url(#bg)"/>
    <circle cx="120" cy="87" r="48" fill="#c58c67"/>
    <path d="M74 86c2-38 22-58 49-58 29 0 46 22 47 56-12-15-24-22-49-22-20 0-33 7-47 24Z" fill="#24201e"/>
    <path d="M76 86c3 34 17 57 44 57 28 0 43-25 44-58-7 8-17 12-25 7-13-8-22-8-37 0-9 5-18 1-26-6Z" fill="#c58c67"/>
    <path d="M38 240c3-57 30-91 82-91s79 34 82 91Z" fill="url(#shirt)"/>
    <path d="m91 151 29 31 29-31M120 182v58" fill="none" stroke="#ffbf00" stroke-width="3"/>
    <path d="M63 89c-14 5-19 22-9 31 8 8 22 4 29-6" fill="none" stroke="#11161d" stroke-width="6" stroke-linecap="round"/>
    <circle cx="52" cy="120" r="5" fill="#11161d"/>
    <path d="M98 101h12m20 0h12M111 125c6 4 12 4 18 0" stroke="#51392d" stroke-width="3" stroke-linecap="round"/>
  </svg>
`)}`

const fixtureAuthor = {
  id: 'fixture-rafael',
  username: 'rafael',
  name: 'Rafael Martins',
  photo_url: refereePortrait,
}

const initialPosts: Post[] = [
  {
    id: 'profile-post-1',
    content: 'Treino concluído. 18/20 nas questões da Lei 12. Ainda tenho de rever as entradas imprudentes junto à linha lateral.',
    media_type: 'text',
    media_url: null,
    media_metadata: null,
    original_post_id: null,
    like_count: 31,
    comment_count: 9,
    repost_count: 2,
    save_count: 6,
    created_at: '2026-07-15T17:41:00.000Z',
    author: fixtureAuthor,
    original_post: null,
    is_liked: true,
    is_saved: false,
    is_reposted: false,
  },
  {
    id: 'profile-post-2',
    content: 'Revisão concluída: posição, impacto e intensidade continuam a ser os três indicadores essenciais para avaliar este tipo de entrada.',
    media_type: 'text',
    media_url: null,
    media_metadata: null,
    original_post_id: null,
    like_count: 24,
    comment_count: 5,
    repost_count: 3,
    save_count: 11,
    created_at: '2026-07-14T19:41:00.000Z',
    author: fixtureAuthor,
    original_post: null,
    is_liked: false,
    is_saved: true,
    is_reposted: false,
  },
]

export default function ProfileFixture() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [posts, setPosts] = useState(initialPosts)

  const memberSince = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'pt-PT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date('2026-01-08T10:00:00.000Z'))

  const updatePost = (postId: string, patch: Partial<Post>) => {
    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, ...patch } : post
    )))
  }

  const visiblePosts = filter === 'all'
    ? posts
    : posts.filter((post) => post.media_type === filter)

  return (
    <FixtureAuthProvider>
      <FixtureShell title="Perfil">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8">
          <Surface
            padding="none"
            className="relative isolate mx-auto max-w-4xl overflow-hidden border-(--mc-color-border-strong) shadow-none"
          >
            <div className="absolute left-0 top-0 size-20 bg-(--mc-color-accent) [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
            <div className="absolute bottom-10 right-0 h-20 w-9 bg-(--mc-color-danger) [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden="true" />
            <PitchDiagram />

            <div className="relative z-10 flex min-h-[21rem] flex-col justify-end px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[17rem] lg:flex-row lg:items-end lg:justify-start lg:gap-7">
              <Avatar
                src={refereePortrait}
                alt="Rafael Martins"
                name="Rafael Martins"
                size="xl"
                className="!size-28 border-(--mc-color-border-strong) bg-(--mc-color-canvas) shadow-(--mc-shadow-raised) sm:!size-32"
                imageProps={{ loading: 'eager' }}
              />

              <div className="mt-5 min-w-0 flex-1 lg:mt-0">
                <h2 className="break-words text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl">
                  Rafael Martins
                </h2>
                <p className="mt-1 break-all text-base text-(--mc-color-text-muted) sm:text-lg">
                  @rafael
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs font-medium text-(--mc-color-text-muted)">
                  <CalendarDays className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                  {t('Member since {{date}}', { date: memberSince })}
                </p>
              </div>

              <div className="mt-5 flex w-full gap-2 lg:mt-0 lg:w-auto lg:shrink-0">
                <Button
                  variant="secondary"
                  leadingIcon={<Pencil className="size-4" />}
                  className="flex-1 border-(--mc-color-accent)/80 text-(--mc-color-accent) lg:min-w-40"
                  onClick={() => navigate('/app/profile/edit')}
                >
                  {t('Edit Profile')}
                </Button>
                <IconButton
                  label={t('Settings')}
                  variant="secondary"
                  className="border-(--mc-color-accent)/80 text-(--mc-color-accent)"
                  onClick={() => navigate('/app/settings')}
                >
                  <Settings className="size-5" />
                </IconButton>
              </div>
            </div>
          </Surface>

          <div className="sticky top-16 z-10 mx-auto max-w-4xl bg-(--mc-color-canvas)/95 pt-1 backdrop-blur-md">
            <NavigationBar filter={filter} onFilterChange={setFilter} />
          </div>

          <div
            id="community-feed"
            role="tabpanel"
            aria-labelledby={`community-filter-${filter}`}
            className="mx-auto max-w-3xl space-y-4"
          >
            {visiblePosts.map((post) => (
              <FixturePostCard
                key={post.id}
                post={post}
                onPatch={(patch) => updatePost(post.id, patch)}
                onDelete={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
              />
            ))}
          </div>
        </div>
      </FixtureShell>
    </FixtureAuthProvider>
  )
}

function FixturePostCard({
  post,
  onPatch,
  onDelete,
}: {
  post: Post
  onPatch: (patch: Partial<Post>) => void
  onDelete: (postId: string) => void
}) {
  const commentsId = `fixture-${post.id}-comments`

  return (
    <Surface role="article" padding="none" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-(--mc-color-accent) via-(--mc-color-border-strong) to-(--mc-color-danger) opacity-80"
        aria-hidden="true"
      />
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <PostHeader
          author={post.author}
          createdAt={post.created_at}
          isOwnPost
          onReportPost={() => undefined}
          onReportUser={() => undefined}
          onBlockUser={() => undefined}
          onDelete={() => onDelete(post.id)}
        />
        <PostBody post={post} />
      </div>
      <div className="px-2 sm:px-3">
        <PostFooter
          post={post}
          commentsExpanded={false}
          commentsId={commentsId}
          onLike={() => onPatch({
            is_liked: !post.is_liked,
            like_count: post.like_count + (post.is_liked ? -1 : 1),
          })}
          onComment={() => undefined}
          onRepost={() => onPatch({
            is_reposted: !post.is_reposted,
            repost_count: post.repost_count + (post.is_reposted ? -1 : 1),
          })}
          onSave={() => onPatch({
            is_saved: !post.is_saved,
            save_count: post.save_count + (post.is_saved ? -1 : 1),
          })}
          onShare={() => undefined}
        />
      </div>
      <div id={commentsId} hidden />
    </Surface>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 280 190"
      className="pointer-events-none absolute -right-12 top-0 h-[68%] w-[72%] text-(--mc-color-border-strong) opacity-55 sm:h-full sm:w-[58%]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      aria-hidden="true"
    >
      <path d="M56 10 267 28 245 178 14 143Z" />
      <path d="m149 18-11 143" />
      <ellipse cx="143" cy="91" rx="29" ry="23" transform="rotate(-5 143 91)" />
      <path d="m48 56-30-4-6 62 29 7M242 57l29 4-9 85-29-7" />
      <path d="M91 13 70 151M207 22l-17 144" opacity=".55" />
    </svg>
  )
}
