import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from "react-router-dom";
import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Layout } from "@/components/Layout";
import RequireAuth from "./RequireAuth";
import RequireGuest from "./RequireGuest";
import AppShell from "./AppShell";

const LandingPage = lazy(() => import('@/features/landing/components/LandingPage'))
const ResetPassword = lazy(() => import('@/features/auth/components/ResetPassword'))
const OAuthCallbackPage = lazy(() => import('@/features/auth/components/OAuthCallbackPage'))
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
const MessagesPage = lazy(() => import('@/features/messages/components/MessagesPage'))
const ConversationPage = lazy(() => import('@/features/messages/components/ConversationPage'))
const SearchPage = lazy(() => import('@/features/search/components/SearchPage'))
const PoliciesPage = lazy(() => import('@/features/policies/components/PoliciesPage'))

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

export default function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes - landing page only for non-authenticated users */}
        <Route path="/" element={<RequireGuest>{lazyRoute(<LandingPage />)}</RequireGuest>} />
        <Route path="/reset-password" element={lazyRoute(<ResetPassword />)} />
        {/* OAuth/email callback - handles PKCE code exchange */}
        <Route path="/auth/callback" element={lazyRoute(<OAuthCallbackPage />)} />

        {/* Public policy pages - no auth required */}
        <Route path="/privacy" element={lazyRoute(<PoliciesPage defaultTab="privacy" />)} />
        <Route path="/terms" element={lazyRoute(<PoliciesPage defaultTab="terms" />)} />
        <Route path="/cookies" element={lazyRoute(<PoliciesPage defaultTab="cookies" />)} />

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
          <Route path="messages" element={lazyRoute(<MessagesPage />)} />
          {/* /app/messages/:conversationId shows a conversation */}
          <Route path="messages/:conversationId" element={lazyRoute(<ConversationPage />)} />
          {/* /app/search shows user search with history */}
          <Route path="search" element={lazyRoute(<SearchPage />)} />
          {/* /app/profile shows user profile */}
          <Route path="profile" element={lazyRoute(<ProfilePage />)} />
          {/* /app/profile/edit shows edit profile form */}
          <Route path="profile/edit" element={lazyRoute(<EditProfilePage />)} />
          {/* /app/settings shows user settings */}
          <Route path="settings" element={lazyRoute(<SettingsPage />)} />
          {/* /app/profile/:username shows another user's public profile */}
          <Route path="profile/:username" element={lazyRoute(<PublicProfilePage />)} />
        </Route>
      </Route>
    </Routes>
  );
}
