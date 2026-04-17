# RefLab — Visual Design Spec
**Version:** 1.0
**Date:** 2026-04-17
**App:** React + Vite — Web (Netlify)
**Design System:** Tailwind CSS v4 + CSS custom properties

---

## 1. Design Language

### Aesthetic Direction
Professional sports training platform — dark mode default, yellow (#f6c21c) brand accent.
Think: UEFA/court-side analysis software. Clean, data-forward, serious.
Dark = concentration. Yellow = highlight/action.

### Color Palette (CSS Variables)
```
--bg-primary:   #14192c  (dark navy — main background)
--bg-surface:  #181f32  (slightly lighter — cards/panels)
--bg-surface-2: #18223a  (secondary surface)
--border-subtle: #24304a
--border-strong: #2f3c5c

--text-primary: #f5f7fa  (near-white)
--text-secondary: #b8c0d4
--text-muted: #8a93a8

--brand-yellow: #f6c21c  (primary action, highlights)
--brand-yellow-soft: #ffe58a
--brand-red: #e53935  (errors, critical)

--success: #3ddc97
--warning: #f6a821
--error: #e53935
--info: #4da3ff

--bg-hover: #1e2842
--focus-ring: var(--info)
```

### Typography
```
Font: Inter (Google Fonts import)
Weights: 400, 500, 600, 700
font-sans: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif

Scale: Tailwind defaults (text-sm, text-base, text-lg, text-xl, etc.)
Body: text-sm to text-base
Headings: font-semibold, larger sizes
```

### Spacing System (via Tailwind)
- Border radius cards: 16px (--radius-card)
- Border radius buttons: 14px (--radius-button)
- Border radius inputs: 12px (--radius-input)
- Border radius pills: 999px (--radius-pill)

### Motion / Interaction
- Hover: bg-hover colour change
- Focus-visible: 2px info ring offset 2px
- Scroll: custom thin scrollbars (--border-subtle thumb)
- Selection: yellow tinted (#f6c21c at 25% opacity)

### Icons / Imagery
- Lucide React icons throughout
- No emoji
- Real images for posts (user-uploaded)
- Avatar initials as fallback

---

## 2. Screen-by-Screen Visual Spec

### DashboardPage
**Layout:** Single scrollable page
**Sections (top to bottom):**

1. **PerformanceSection**
   - Overall accuracy % (large number, green/yellow/red based on value)
   - Per-topic breakdown (bar chart or list)
   - Loading: DashboardSkeleton (pulse animation)

2. **ProgressSection**
   - Cards: Tests Completed, Questions Answered, Accuracy Trend
   - Calendar heatmap or simple count

3. **HabitsSection**
   - Study days count
   - Average score
   - Training calendar (simple grid)

**Stats cards:** surface class (bg + border + shadow)
**Error state:** Alert banner with error icon + message + retry button

---

### Tests / LearnPage
**5 tabs:** Test | Questions | Videos | Courses | Resources

**Test view (RandomTestLanding → RandomTestRunner → RandomTestResults)**
- Landing: "Começar Teste" button, past attempts history
- Runner: Question card, A/B/C/D option buttons, timer, progress bar
- Results: Score circle, correct/incorrect breakdown, explanation per question

**Questions view (QuestionsLanding → QuestionsSetup → QuestionsSession → QuestionsReview)**
- Setup: topic multi-select, number slider, difficulty select
- Session: same as Test runner but filtered by topic
- Review: detailed answer review

**Videos view:**
- Video scenario cards: thumbnail, title, description
- Tap → video player with decision choices after

**Courses / Resources:** Empty tabs (not yet implemented)

**Tab bar:** border-b, horizontal scroll, md:justify-center

---

### SocialPage
**Feed:** List of PostCards
**PostCard anatomy:**
- Header: avatar, name, time
- Content: text, image, video (media type)
- Actions: like (❤️), comment, repost, save (counts)
- Tap → PostDetailPage with comments

**PostDetailPage:** Full post + threaded comments

---

### MessagesPage
**Conversation list:** DM threads
**ConversationPage:** Chat UI, real-time messages
**People search:** Fuzzy search via trigram

---

### NotificationsPage
**Bell icon** in navbar with unread badge count
**Notification list:** type icon, title, message, time, read/unread state

---

### ProfilePage / SettingsPage
**Profile:** Avatar, name, username, stats
**Settings:** Delete account, language, preferences

---

### PricingPage
**Plan cards:** pro, plus
**Stripe checkout** via Edge Function
**Billing portal** link for existing subscribers

---

### Auth Pages (Login / Register)
**Centered card, email/password + Google OAuth button**
**Delete account:** in settings

---

## 3. Component Architecture

### Button
Variants: primary (yellow bg, dark text), secondary, outline, ghost
Uses brand-yellow for primary CTA

### Card/Surface
surface class: bg-bg-surface, border border-subtle, rounded-16px, shadow-soft

### Avatar
Circular, initials fallback with coloured background

### Skeleton
DashboardSkeleton — pulse animation placeholder for loading

### Modal
SessionExpiredModal, generic overlays

---

## 4. Responsive Strategy

- Mobile-first
- Dashboard sections stack vertically
- Calendar grid adapts
- No sidebar on mobile
- Desktop: wider content area, more columns

---

## 5. Dark Mode

**Default only** — no light mode toggle
Dark theme is intentional: "professional referee training environment"

---

## 6. Edge Cases

- Empty test history → CTA to start first test
- No posts → empty state message
- Session expired → modal then redirect to login
- Payment failure → error + retry
