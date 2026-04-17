# RefLab — Product Spec
**Version:** 1.0
**Date:** 2026-04-17
**App:** React + Vite + Supabase
**URL:** https://reflab.netlify.app/
**Stack:** React + Vite + Tailwind + Supabase (Auth, DB, Storage, Realtime) + Stripe Edge Functions

---

## 1. Product Overview

### What it is
RefLab is a professional learning and training platform for football referees.
The MVP focuses on one core learning loop: Tests → Feedback → Dashboard insights.

### Core value proposition
"Professional referee training — tests, feedback, and progress tracking."

### Target users
Football referees who want to improve decision-making, rule knowledge, and match performance.

### MVP scope (from README)
**In scope:** Auth, Tests, Dashboard, Chatbot, Notifications, Profile, Feedback, Legal pages
**Out of scope:** Advanced leaderboards, AI coaching, community, deep analytics

---

## 2. User Stories

### US-01: Authentication
**As a** referee  
**I want to** sign up and log in  
**So that I** can access my personalised dashboard

**Acceptance criteria:**
- [ ] Email/password registration and login
- [ ] Google OAuth (PKCE flow via /auth/callback)
- [ ] Protected routes redirect to / if not authenticated
- [ ] Session expiry shows SessionExpiredModal
- [ ] Delete account option in settings

**Edge cases:**
- OAuth failure → show error, retry option
- Session expired mid-use → modal, then redirect to login
- Duplicate email → "Já existe conta com este email"
- Password too short → validation error

---

### US-02: Dashboard
**As a** referee  
**I want to** see my progress, performance, and habits at a glance  
**So that I** know where to focus my training

**Acceptance criteria:**
- [ ] Performance section: overall accuracy %, breakdown by topic
- [ ] Progress section: completed tests, questions answered, accuracy trend
- [ ] Habits section: study days, average score, training calendar
- [ ] Loading shows DashboardSkeleton
- [ ] Error shows error banner with retry

**Edge cases:**
- No tests taken yet → show "Começa o teu primeiro teste" CTA
- API failure → show cached data if available, else error banner
- First login → onboarding flow before dashboard

---

### US-03: Take a test
**As a** referee  
**I want to** take random tests and see my score and explanations  
**So that I** can practice and learn

**Acceptance criteria:**
- [ ] Tests tab → RandomTestLanding → start button
- [ ] RandomTestRunner: shows questions one at a time, timer, progress
- [ ] Questions: A/B/C/D options, tap to select
- [ ] Submit → RandomTestResults: score, correct/incorrect breakdown
- [ ] Explanation shown per question (from explanation_cache)
- [ ] History view shows past attempts

**Edge cases:**
- Network fails mid-test → save progress, allow resume
- Timer expires → auto-submit current answers
- All questions correct → confetti / celebration
- Zero correct → encouraging message, suggest easier topic

**Data:**
```
TestAttempt: id, user_id, test_id, status(in_progress|submitted),
             started_at, submitted_at, score_correct, score_total,
             score_percent, answers(jsonb), explanation_cache(jsonb)
```

---

### US-04: Questions mode
**As a** referee  
**I want to** configure and take a custom question session  
**So that I** can focus on specific topics

**Acceptance criteria:**
- [ ] Questions tab → QuestionsLanding
- [ ] QuestionsSetup: select topics, number of questions, difficulty
- [ ] QuestionsSession: configured test
- [ ] QuestionsReview: detailed review of answers
- [ ] Save session results to test_attempts

---

### US-05: Video scenarios
**As a** referee  
**I want to** watch video clips of referee decisions and practice  
**So that I** can improve my visual decision-making

**Acceptance criteria:**
- [ ] Videos tab shows available video scenarios
- [ ] Video player loads from Supabase Storage
- [ ] Decision options shown after video
- [ ] User selects decision → save attempt
- [ ] Sync with video scenarios via sync-video-scenarios Edge Function

**Edge cases:**
- Video fails to load → show error with retry
- Slow connection → show loading spinner, allow play when ready
- Video watched >50% → count as attempted

---

### US-06: Social feed
**As a** referee  
**I want to** see community posts  
**So that I** can engage with other referees

**Acceptance criteria:**
- [ ] Social page shows feed of posts
- [ ] Post types: text, image, video, audio
- [ ] Like, comment, repost, save counts
- [ ] Tap post → PostDetailPage with comments
- [ ] Realtime updates via Supabase subscriptions

**Edge cases:**
- No posts → empty state "Ainda não há posts"
- Deleted post → remove from feed
- Blocked user → hide posts

---

### US-07: Direct messages
**As a** referee  
**I want to** DM other referees  
**So that I** can communicate privately

**Acceptance criteria:**
- [ ] Messages page → conversation list
- [ ] Tap conversation → ConversationPage
- [ ] Real-time messaging via Supabase Realtime
- [ ] New message badge on MessagesPage tab

**Edge cases:**
- Blocked user → show "Mensagem não enviada"
- Offline → queue messages, send when online
- Long message → scrollable

---

### US-08: Notifications
**As a** referee  
**I want to** receive notifications for test results, social activity  
**So that I** don't miss important updates

**Acceptance criteria:**
- [ ] Bell icon with unread count badge
- [ ] Dropdown/page shows all notifications
- [ ] Types: test, social, system
- [ ] Mark as read on tap
- [ ] Real-time via Supabase Realtime

---

### US-09: Billing and subscriptions
**As a** referee  
**I want to** upgrade to a paid plan  
**So that I** can access premium features

**Acceptance criteria:**
- [ ] Pricing page shows plans: pro, plus
- [ ] Stripe checkout via create-checkout-session Edge Function
- [ ] Billing portal via create-portal-session Edge Function
- [ ] Cancel subscription option
- [ ] Plan limits enforced

**Edge cases:**
- Payment fails → show error, retry option
- Subscription expired → downgrade to free, notify user
- Plan change mid-cycle → prorate

---

### US-10: User search
**As a** referee  
**I want to** search for other referees  
**So that I** can find and follow them

**Acceptance criteria:**
- [ ] Search page with text input
- [ ] Fuzzy search via trigram (trgm extension)
- [ ] Results show avatar, name, username
- [ ] Tap → PublicProfilePage

---

## 3. Functional Requirements

### FR-01: Test and question schema
```
Test: id, slug, title, is_active, updated_at
TestQuestion: id, test_id, order_index, question_text,
              option_a/b/c/d, correct_option, updated_at
TestAttempt: id, user_id, test_id, status, started_at, submitted_at,
             score_correct, score_total, score_percent,
             answers(jsonb), explanation_cache(jsonb)
```

### FR-02: Social schema
```
Post: id, user_id, content, media_type(text|image|video|audio),
      media_url, original_post_id (repost), like_count, comment_count,
      repost_count, save_count, created_at, updated_at
```

### FR-03: Notifications
```
Notification: id, user_id, type, title, message, read,
             actor_id, reference_id, created_at
```

### FR-04: Stripe integration
```
StripeCustomer: user_id, stripe_customer_id
StripeSubscription: stripe_subscription_id, user_id, price_id,
                    plan(pro|plus), status, current_period_end,
                    cancel_at_period_end
StripeWebhookEvent: event_id(pk), type, created, processed
```

### FR-05: Edge Functions
- create-checkout-session → Stripe checkout
- create-portal-session → billing portal
- cancel-subscription → cancel
- change-subscription-plan → change plan
- list-invoices → invoice list
- stripe-webhook → event handler
- delete-account → delete user + data
- sync-video-scenarios → sync video content

---

## 4. Non-Functional Requirements

- **i18n:** react-i18next for translations
- **Realtime:** Supabase Realtime for posts, messages, notifications
- **Auth:** PKCE OAuth via /auth/callback
- **Storage:** Supabase Storage for media

---

## 5. Open Questions

1. What does the chatbot actually do?
2. What are "courses" and "resources" tabs for?
3. Is there any ML/AI for test explanations?
4. How does video decision practice work exactly?
5. What is the "pro" vs "plus" plan difference?
