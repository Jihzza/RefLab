import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import LandingPage from "@/features/landing/components/LandingPage";
import ResetPassword from "@/features/auth/components/ResetPassword";
import OAuthCallbackPage from "@/features/auth/components/OAuthCallbackPage";
import DashboardPage from "@/features/dashboard/components/DashboardPage";
import TestsList from "@/features/tests/components/TestsList";
import LearnPage from "@/features/learn/components/LearnPage";
import TestPage from "@/features/learn/components/TestPage";
import NotificationsPage from "@/features/notifications/components/NotificationsPage";
import LeaderboardPage from "@/features/leaderboard/components/LeaderboardPage";
import ProfilePage from "@/features/profile/components/ProfilePage";
import EditProfilePage from "../features/profile/components/EditProfilePage";
import SettingsPage from "@/features/settings/components/SettingsPage";
import PublicProfilePage from "@/features/social/components/PublicProfilePage";
import PricingPage from "@/features/pricing/components/PricingPage";
import SocialPage from "@/features/social/components/SocialPage";
import PostDetailPage from "@/features/social/components/PostDetailPage";
import MessagesPage from "@/features/messages/components/MessagesPage";
import ConversationPage from "@/features/messages/components/ConversationPage";
import SearchPage from "@/features/search/components/SearchPage";
import PoliciesPage from "@/features/policies/components/PoliciesPage";
import RequireAuth from "./RequireAuth";
import RequireGuest from "./RequireGuest";
import AppShell from "./AppShell";

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
          {/* /app/leaderboards shows rankings */}
          <Route path="leaderboards" element={<LeaderboardPage />} />
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
