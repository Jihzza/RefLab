import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from "@/components/Layout";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";
import RequireGuest from "./RequireGuest";
import AppShell from "./AppShell";

const LandingPage = lazy(() => import('@/features/landing/components/LandingPage'))
const ResetPassword = lazy(() => import('@/features/auth/components/ResetPassword'))
const OAuthCallbackPage = lazy(() => import('@/features/auth/components/OAuthCallbackPage'))
const LegalAcceptancePage = lazy(() => import('@/features/auth/components/LegalAcceptancePage'))
const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'))
const TestsList = lazy(() => import('@/features/tests/components/TestsList'))
const LearnPage = lazy(() => import('@/features/learn/components/LearnPage'))
const TestPage = lazy(() => import('@/features/learn/components/TestPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/components/NotificationsPage'))
const ProfilePage = lazy(() => import('@/features/profile/components/ProfilePage'))
const EditProfilePage = lazy(() => import('@/features/profile/components/EditProfilePage'))
const SettingsPage = lazy(() => import('@/features/settings/components/SettingsPage'))
const PublicProfilePage = lazy(() => import('@/features/social/components/PublicProfilePage'))
const PricingPage = lazy(() => import('@/features/pricing/components/PricingPage'))
const SocialPage = lazy(() => import('@/features/social/components/SocialPage'))
const PostDetailPage = lazy(() => import('@/features/social/components/PostDetailPage'))
const MessagesWorkspace = lazy(() => import('@/features/messages/components/MessagesWorkspace'))
const SearchPage = lazy(() => import('@/features/search/components/SearchPage'))
const PoliciesPage = lazy(() => import('@/features/policies/components/PoliciesPage'))
const SupportPage = lazy(() => import('@/features/support/components/SupportPage'))
const ModerationPage = lazy(() => import('@/features/moderation/components/ModerationPage'))
const NotFoundPage = lazy(() => import('./NotFoundPage'))

function RouteLoadingFallback() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center gap-3 bg-(--mc-color-canvas) text-sm text-(--mc-color-text-secondary)"
    >
      <LoaderCircle
        className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span>{t('Loading...')}</span>
    </div>
  )
}

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
}

const PUBLIC_ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'RefLab — Treino para árbitros de futebol',
    description: 'Treino prático para árbitros de futebol: testes, análise de decisões e acompanhamento de desempenho.',
  },
  '/privacy': {
    title: 'Política de Privacidade — RefLab',
    description: 'Consulta como o RefLab recolhe, utiliza e protege dados pessoais.',
  },
  '/terms': {
    title: 'Termos de Serviço — RefLab',
    description: 'Consulta os termos aplicáveis à utilização do RefLab.',
  },
  '/cookies': {
    title: 'Cookies e armazenamento — RefLab',
    description: 'Consulta como o RefLab utiliza cookies e armazenamento local do navegador.',
  },
  '/support': {
    title: 'Suporte — RefLab',
    description: 'Contacta o suporte do RefLab para questões técnicas, de conta, faturação ou privacidade.',
  },
}

function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const normalizedPath = pathname.length > 1
      ? pathname.replace(/\/+$/, '')
      : pathname
    const metadata = PUBLIC_ROUTE_METADATA[normalizedPath]
    const isPrivateRoute = normalizedPath === '/reset-password'
      || normalizedPath.startsWith('/auth/')
      || normalizedPath.startsWith('/legal/')
      || normalizedPath === '/admin'
      || normalizedPath.startsWith('/admin/')
      || normalizedPath === '/app'
      || normalizedPath.startsWith('/app/')
    const title = metadata?.title
      ?? (isPrivateRoute ? 'RefLab — Match Control' : 'Página não encontrada — RefLab')
    const description = metadata?.description
      ?? 'Plataforma de treino e aprendizagem para árbitros de futebol.'
    const canonicalUrl = new URL(metadata ? normalizedPath : '/', window.location.origin).toString()

    document.title = title

    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }
      element.content = content
    }

    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[name="robots"]', 'name', 'robots', metadata ? 'index,follow' : 'noindex,nofollow')
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [pathname])

  return null
}

function RouteScrollManager() {
  const { pathname, search, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    let frame = 0
    let timeout = 0
    let observer: MutationObserver | null = null

    const scrollToRoute = () => {
      if (hash) {
        let targetId = hash.slice(1)
        try {
          targetId = decodeURIComponent(targetId)
        } catch {
          // Keep the literal fragment when it is not valid percent-encoding.
        }

        const target = document.getElementById(targetId)
        if (target) {
          target.scrollIntoView({ block: 'start' })
          observer?.disconnect()
          if (timeout) window.clearTimeout(timeout)
          return true
        }
      }

      // Let the browser restore the prior position for back/forward navigation.
      if (navigationType !== 'POP') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
      return !hash
    }

    frame = window.requestAnimationFrame(() => {
      if (scrollToRoute() || !hash) return

      // Lazy route chunks can resolve after the first animation frame. Watch
      // briefly for the fragment target instead of losing direct deep links.
      observer = new MutationObserver(() => {
        scrollToRoute()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      timeout = window.setTimeout(() => observer?.disconnect(), 5_000)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      if (timeout) window.clearTimeout(timeout)
      observer?.disconnect()
    }
  }, [hash, navigationType, pathname, search])

  return null
}

export default function Router() {
  return (
    <>
      <RouteMetadata />
      <RouteScrollManager />
      <Routes>
      <Route element={<Layout />}>
        {/* Public routes - landing page only for non-authenticated users */}
        <Route path="/" element={<RequireGuest>{lazyRoute(<LandingPage />)}</RequireGuest>} />
        <Route path="/reset-password" element={lazyRoute(<ResetPassword />)} />
        {/* OAuth/email callback - handles PKCE code exchange */}
        <Route path="/auth/callback" element={lazyRoute(<OAuthCallbackPage />)} />
        <Route path="/legal/accept" element={lazyRoute(<LegalAcceptancePage />)} />

        {/* Public policy pages - no auth required */}
        <Route path="/privacy" element={lazyRoute(<PoliciesPage defaultTab="privacy" />)} />
        <Route path="/terms" element={lazyRoute(<PoliciesPage defaultTab="terms" />)} />
        <Route path="/cookies" element={lazyRoute(<PoliciesPage defaultTab="cookies" />)} />
        <Route path="/support" element={lazyRoute(<SupportPage />)} />

        {/* Protected routes - wrapped in auth check and app layout */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* /app shows dashboard by default */}
          <Route index element={lazyRoute(<DashboardPage />)} />
          {/* /app/dashboard also shows dashboard */}
          <Route path="dashboard" element={lazyRoute(<DashboardPage />)} />
          {/* /app/tests shows tests list */}
          <Route path="tests" element={lazyRoute(<TestsList />)} />
          {/* /app/learn shows the learn page with tabs */}
          <Route path="learn" element={lazyRoute(<LearnPage />)} />
          {/* /app/learn/test/:slug shows the test-taking page */}
          <Route path="learn/test/:slug" element={lazyRoute(<TestPage />)} />
          {/* /app/notifications shows user notifications */}
          <Route path="notifications" element={lazyRoute(<NotificationsPage />)} />
          {/* /app/pricing shows unified pricing & billing page */}
          <Route path="pricing" element={lazyRoute(<PricingPage />)} />
          {/* Redirects from old billing routes */}
          <Route path="billing" element={<Navigate to="/app/pricing" replace />} />
          <Route path="billing/pricing" element={<Navigate to="/app/pricing" replace />} />
          {/* /app/social shows the social feed */}
          <Route path="social" element={lazyRoute(<SocialPage />)} />
          {/* /app/post/:postId shows a single post (from notifications, share links) */}
          <Route path="post/:postId" element={lazyRoute(<PostDetailPage />)} />
          {/* /app/messages shows direct messages */}
          <Route path="messages" element={lazyRoute(<MessagesWorkspace />)} />
          {/* /app/messages/:conversationId shows a conversation */}
          <Route path="messages/:conversationId" element={lazyRoute(<MessagesWorkspace />)} />
          {/* /app/search shows user search with history */}
          <Route path="search" element={lazyRoute(<SearchPage />)} />
          {/* /app/profile shows user profile */}
          <Route path="profile" element={lazyRoute(<ProfilePage />)} />
          {/* /app/profile/edit shows edit profile form */}
          <Route path="profile/edit" element={lazyRoute(<EditProfilePage />)} />
          {/* /app/settings shows user settings */}
          <Route path="settings" element={lazyRoute(<SettingsPage />)} />
          <Route
            path="moderation"
            element={<Navigate to="/admin/moderation" replace />}
          />
          {/* /app/profile/:username shows another user's public profile */}
          <Route path="profile/:username" element={lazyRoute(<PublicProfilePage />)} />
          <Route path="*" element={lazyRoute(<NotFoundPage withinApp />)} />
        </Route>
        <Route
          path="/admin"
          element={(
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          )}
        >
          <Route
            path="moderation"
            element={(
              <RequireAdmin>
                {lazyRoute(<ModerationPage />)}
              </RequireAdmin>
            )}
          />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Route>
        <Route path="*" element={lazyRoute(<NotFoundPage />)} />
      </Route>
      </Routes>
    </>
  );
}
