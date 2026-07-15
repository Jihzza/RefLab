import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import NavigationBar from '@/features/social/components/NavigationBar'
import NewPostButton from '@/features/social/components/NewPostButton'
import PostBox from '@/features/social/components/PostBox'
import type { FeedFilter, Post } from '@/features/social/types'
import FixtureAuthProvider from './FixtureAuthProvider'
import FixtureShell from './FixtureShell'

const pitchSituation = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#47732f"/><stop offset="1" stop-color="#2e5725"/></linearGradient></defs>
    <rect width="900" height="500" fill="url(#g)"/>
    <g opacity=".18" fill="#fff"><rect y="0" width="900" height="62"/><rect y="124" width="900" height="62"/><rect y="248" width="900" height="62"/><rect y="372" width="900" height="62"/></g>
    <g fill="none" stroke="#f4f4f0" stroke-width="5" opacity=".8"><rect x="35" y="35" width="830" height="430"/><path d="M450 35v430"/><circle cx="450" cy="250" r="72"/><rect x="35" y="145" width="150" height="210"/><rect x="715" y="145" width="150" height="210"/></g>
    <g stroke="#12151b" stroke-width="18" stroke-linecap="round"><path d="M375 190l-50 130M375 190l65 105M375 190l-55-45"/><circle cx="380" cy="145" r="30" fill="#d6a57d" stroke="none"/><path d="M540 175l-42 145M540 175l68 125M540 175l58-55" stroke="#f7f7f3"/></g>
    <circle cx="620" cy="338" r="24" fill="#f4f4f0" stroke="#16191f" stroke-width="5"/><path d="M430 218 585 352" stroke="#ffbf00" stroke-width="6"/>
  </svg>
`)}`

const resolveFixtureMediaUrl = (path: string) => path

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const posts: Post[] = [
  {
    id: 'fixture-post-1',
    content: 'Situação do minuto 73: contacto imprudente dentro da área ou disputa normal? Para mim, penálti e cartão amarelo. O que decidiam?',
    media_type: 'image',
    media_url: pitchSituation,
    media_metadata: { width: 900, height: 500, mime_type: 'image/svg+xml' },
    original_post_id: null,
    like_count: 42,
    comment_count: 18,
    repost_count: 7,
    save_count: 12,
    created_at: minutesAgo(12),
    author: { id: 'marta-fixture', username: 'marta.referee', name: 'Marta Correia', photo_url: null },
    original_post: null,
    is_liked: true,
    is_saved: false,
    is_reposted: false,
  },
  {
    id: 'fixture-post-2',
    content: 'A intensidade e o ponto de contacto mudam tudo neste lance. Boa discussão.',
    media_type: 'text',
    media_url: null,
    media_metadata: null,
    original_post_id: null,
    like_count: 31,
    comment_count: 9,
    repost_count: 4,
    save_count: 6,
    created_at: minutesAgo(28),
    author: { id: 'tiago-fixture', username: 'tiago.var', name: 'Tiago Alves', photo_url: null },
    original_post: null,
    is_liked: false,
    is_saved: false,
    is_reposted: false,
  },
]

export default function SocialFixture() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const noopPost = () => undefined
  const noopId = () => undefined

  return (
    <FixtureAuthProvider>
      <FixtureShell title="Comunidade">
        <div className="mx-auto w-full max-w-[var(--mc-content-narrow)] px-4 pb-24 pt-5 sm:px-6">
          <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.035em] text-(--mc-color-text)">
            {t('Social')}
          </h2>
          <NavigationBar filter={filter} onFilterChange={setFilter} />
          <ul className="mt-4 space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostBox
                  post={post}
                  onLike={noopPost}
                  onSave={noopPost}
                  onRepost={noopPost}
                  onShare={noopPost}
                  onDelete={noopId}
                  onReport={noopId}
                  onBlock={noopId}
                  onCommentCountChange={noopId}
                  resolveMediaUrl={resolveFixtureMediaUrl}
                />
              </li>
            ))}
          </ul>
        </div>
        <NewPostButton onClick={() => undefined} />
      </FixtureShell>
    </FixtureAuthProvider>
  )
}
