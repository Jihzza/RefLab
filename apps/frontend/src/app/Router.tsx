import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import RequireAuth from "./RequireAuth";
import RequireGuest from "./RequireGuest";
import AppShell from "./AppShell";

// Route-level code splitting: each page is loaded on demand so the initial
// bundle stays small. Suspense fallbacks live inside Layout / AppShell so the
// app chrome stays visible while a page chunk is being fetched.
const LandingPage = lazy(() => import("@/features/landing/components/LandingPage"));
const ResetPassword = lazy(() => import("@/features/auth/components/ResetPassword"));
const OAuthCallbackPage = lazy(() => import("@/features/auth/components/OAuthCallbackPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/components/DashboardPage"));
const TestsList = lazy(() => import("@/features/tests/components/TestsList"));
const LearnPage = lazy(() => import("@/features/learn/components/LearnPage"));
const TestPage = lazy(() => import("@/features/learn/components/TestPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/components/NotificationsPage"));
const ProfilePage = lazy(() => import("@/features/profile/components/ProfilePage"));
const EditProfilePage = lazy(() => import("@/features/profile/components/EditProfilePage"));
const SettingsPage = lazy(() => import("@/features/settings/components/SettingsPage"));
const PublicProfilePage = lazy(() => import("@/features/social/components/PublicProfilePage"));
const PricingPage = lazy(() => import("@/features/pricing/components/PricingPage"));
const SocialPage = lazy(() => import("@/features/social/components/SocialPage"));
const PostDetailPage = lazy(() => import("@/features/social/components/PostDetailPage"));
const MessagesPage = lazy(() => import("@/features/messages/components/MessagesPage"));
const ConversationPage = lazy(() => import("@/features/messages/components/ConversationPage"));
const SearchPage = lazy(() => import("@/features/search/components/SearchPage"));
const PoliciesPage = lazy(() => import("@/features/policies/components/PoliciesPage"));

export default function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes - landing page only for non-authenticated users */}
        <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* OAuth/email callback - handles PKCE code exchange */}
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* Public policy pages - no auth required */}
        <Route path="/privacy" element={<PoliciesPage defaultTab="privacy" />} />
        <Route path="/terms" element={<PoliciesPage defaultTab="terms" />} />
        <Route path="/cookies" element={<PoliciesPage defaultTab="cookies" />} />

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
          <Route index element={<DashboardPage />} />
          {/* /app/dashboard also shows dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          {/* /app/tests shows tests list */}
          <Route path="tests" element={<TestsList />} />
          {/* /app/learn shows the learn page with tabs */}
          <Route path="learn" element={<LearnPage />} />
          {/* /app/learn/test/:slug shows the test-taking page */}
          <Route path="learn/test/:slug" element={<TestPage />} />
          {/* /app/notifications shows user notifications */}
          <Route path="notifications" element={<NotificationsPage />} />
          {/* /app/pricing shows unified pricing & billing page */}
          <Route path="pricing" element={<PricingPage />} />
          {/* Redirects from old billing routes */}
          <Route path="billing" element={<Navigate to="/app/pricing" replace />} />
          <Route path="billing/pricing" element={<Navigate to="/app/pricing" replace />} />
          {/* /app/social shows the social feed */}
          <Route path="social" element={<SocialPage />} />
          {/* /app/post/:postId shows a single post (from notifications, share links) */}
          <Route path="post/:postId" element={<PostDetailPage />} />
          {/* /app/messages shows direct messages */}
          <Route path="messages" element={<MessagesPage />} />
          {/* /app/messages/:conversationId shows a conversation */}
          <Route path="messages/:conversationId" element={<ConversationPage />} />
          {/* /app/search shows user search with history */}
          <Route path="search" element={<SearchPage />} />
          {/* /app/profile shows user profile */}
          <Route path="profile" element={<ProfilePage />} />
          {/* /app/profile/edit shows edit profile form */}
          <Route path="profile/edit" element={<EditProfilePage />} />
          {/* /app/settings shows user settings */}
          <Route path="settings" element={<SettingsPage />} />
          {/* /app/profile/:username shows another user's public profile */}
          <Route path="profile/:username" element={<PublicProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
