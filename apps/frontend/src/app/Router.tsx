import { Routes, Route } from "react-router-dom";
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
import SettingsPage from "@/features/profile/components/SettingsPage";
import PublicProfilePage from "@/features/profile/components/PublicProfilePage";
import BillingDashboard from "@/features/billing/components/BillingDashboard";
import PricingPage from "@/features/billing/components/PricingPage";
import SocialPage from "@/features/social/components/SocialPage";
import MessagesPage from "@/features/messages/components/MessagesPage";
import ConversationPage from "@/features/messages/components/ConversationPage";
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
          {/* /app/billing shows billing dashboard */}
          <Route path="billing" element={<BillingDashboard />} />
          {/* /app/billing/pricing shows plan selection */}
          <Route path="billing/pricing" element={<PricingPage />} />
          {/* /app/social shows the social feed */}
          <Route path="social" element={<SocialPage />} />
          {/* /app/messages shows direct messages */}
          <Route path="messages" element={<MessagesPage />} />
          {/* /app/messages/:conversationId shows a conversation */}
          <Route path="messages/:conversationId" element={<ConversationPage />} />
          {/* /app/profile shows user profile */}
          <Route path="profile" element={<ProfilePage />} />
          {/* /app/profile/edit shows edit profile form */}
          <Route path="profile/edit" element={<EditProfilePage />} />
          {/* /app/profile/settings shows settings page */}
          <Route path="profile/settings" element={<SettingsPage />} />
          {/* /app/profile/:username shows another user's public profile */}
          <Route path="profile/:username" element={<PublicProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
