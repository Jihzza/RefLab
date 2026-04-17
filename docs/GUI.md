# RefLab — GUI Documentação
**Data:** 2026-04-17  
**App:** RefLab (React + Vite + Tailwind)  
**Repo:** github.com/Jihzza/RefLab  
**URL:** https://reflab.netlify.app/

---

## Visão Geral

RefLab é uma plataforma de aprendizagem para árbitros de futebol.
O fluxo principal é: **Tests → Feedback → Dashboard insights**.
Estrutura: monorepo com `apps/frontend/` (React) + `backend/supabase/` (Edge Functions + migrations).

**Arquitectura de features:** "UI components render. Feature components decide behavior."
Cada feature é um domínio autónomo.

---

## Routing

### Público (sem auth)
| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `LandingPage` | Landing page pública |
| `/reset-password` | `ResetPassword` | Recuperação de password |
| `/auth/callback` | `OAuthCallbackPage` | OAuth PKCE callback |
| `/privacy` | `PoliciesPage` | Política de privacidade |
| `/terms` | `PoliciesPage` | Termos de serviço |
| `/cookies` | `PoliciesPage` | Política de cookies |

### Protegido (`/app/*` — requires auth)
| Rota | Componente | Feature | Descrição |
|------|-----------|---------|-----------|
| `/app` | `DashboardPage` | dashboard | Dashboard principal |
| `/app/dashboard` | `DashboardPage` | dashboard | Dashboard principal |
| `/app/tests` | `TestsList` | tests | Lista de testes disponíveis |
| `/app/learn` | `LearnPage` | learn | Página de aprendizagem com 5 tabs |
| `/app/learn/test/:slug` | `TestPage` | learn | Teste individual em execução |
| `/app/notifications` | `NotificationsPage` | notifications | Notificações |
| `/app/pricing` | `PricingPage` | pricing | Planos e billing |
| `/app/social` | `SocialPage` | social | Feed social |
| `/app/post/:postId` | `PostDetailPage` | social | Post individual |
| `/app/messages` | `MessagesPage` | messages | Mensagens directas |
| `/app/messages/:convId` | `ConversationPage` | messages | Conversa individual |
| `/app/search` | `SearchPage` | search | Pesquisa de utilizadores |
| `/app/profile` | `ProfilePage` | profile | Perfil do utilizador |
| `/app/profile/edit` | `EditProfilePage` | profile | Editar perfil |
| `/app/profile/:username` | `PublicProfilePage` | social | Perfil público de outro user |
| `/app/settings` | `SettingsPage` | settings | Definições |

---

## Layout

### AppShell
`AppShell.tsx` — wrapper para app autenticada com BottomNav, Header, Sidebar.

### BottomNav (mobile)
Navegação em rodapé com 5 itens principais: Dashboard, Tests, Learn, Social, Profile.

### Header
Barra superior com logo, pesquisa, notificações.

### Sidebar
Navegação lateral (desktop) com links para todas as secções.

---

## Features

### 1. Auth (`features/auth/`)
| Componente | Descrição |
|-----------|-----------|
| `LoginForm.tsx` | Form login email/password |
| `SignupForm.tsx` | Form registo |
| `OAuthCallbackPage.tsx` | Callback Google OAuth (PKCE) |
| `ForgotPassword.tsx` | Recuperação de password |
| `ResetPassword.tsx` | Reset password com token |
| `DeleteAccountDialog.tsx` | Eliminar conta |
| `SessionExpiredModal.tsx` | Modal sessão expirada |
| `AuthProvider.tsx` | Context provider para auth |
| `useAuth.ts` | Hook de autenticação |

### 2. Dashboard (`features/dashboard/`)
Ecrã principal após login. 3 secções:

**PerformanceSection**
- Desempenho geral do árbitro
- Métricas de accuracy

**ProgressSection**
- Progresso por tópico
- Gráficos de evolução

**HabitsSection**
- Hábitos de estudo
- Frequência de prática

```typescript
interface DashboardStats {
  performance: {
    overall: number;
    byTopic: Record<string, number>;
  };
  progress: {
    completedTests: number;
    totalQuestions: number;
    accuracy: number;
  };
  habits: {
    studyDays: number;
    averageScore: number;
  };
}
```

**DashboardSkeleton** — loading state com skeleton UI.

**StatCard** — card para métricas individuais.

**TopicAccuracyCard** — card de accuracy por tópico.

**TrainingCalendar** — calendário de dias de prática.

### 3. Tests (`features/tests/`)
**TestsList** — lista de testes disponíveis:
```typescript
interface Test {
  id: string;       // 'react-basics'
  title: string;    // 'React Basics'
  questions: number; // 10
  time: string;     // '15m'
}
```
Navega para `/app/learn/test/:slug` para fazer o teste.

### 4. Learn (`features/learn/`) — O mais complexo

**LearnPage** com 5 tabs: Test | Questions | Videos | Courses | Resources

#### Test Tab
Fluxo: RandomTestLanding → RandomTestRunner → RandomTestResults
- Testes aleatórios escolhidos automaticamente
- Timer e progress tracking
- Resultados com score e explicações

#### Questions Tab
Fluxo: QuestionsLanding → QuestionsSetup → QuestionsSession → QuestionsReview
- Questions mode com configuração prévia
- Modo de sessão personalizado

#### Videos Tab
- Video scenarios para decisões de árbitro
- Baseado em `video_decision_tables` + `video_action_sanction` no DB
- Carrega vídeos do Supabase Storage
- `sync-video-scenarios` Edge Function para sync

#### Courses Tab (placeholder/future)
#### Resources Tab (placeholder/future)

**TestTaking:**
```typescript
interface TestAttempt {
  id: uuid;
  user_id: uuid;
  test_id: uuid;
  status: 'in_progress' | 'submitted';
  started_at: timestamptz;
  submitted_at: timestamptz | null;
  score_correct: number | null;
  score_total: number | null;
  score_percent: number | null;
  answers: jsonb;              // Respostas do utilizador
  explanation_cache: jsonb;     // Cache de explicações IA
}
```

### 5. Social (`features/social/`)
| Componente | Descrição |
|-----------|-----------|
| `SocialPage.tsx` | Feed social com posts |
| `PostDetailPage.tsx` | Detalhe de post + comentários |
| `PublicProfilePage.tsx` | Perfil público de outro utilizador |

**Post types:** text, image, video, audio (do enum `post_media_type`)

**Campos do post:**
```typescript
interface Post {
  id: uuid;
  user_id: uuid;
  content: text;
  media_type: 'text' | 'image' | 'video' | 'audio';
  media_url: text;
  media_metadata: jsonb;
  original_post_id: uuid;  // Para reposts
  like_count, comment_count, repost_count, save_count: integer;
}
```

**Realtime** — posts, comments, likes actualizados via Supabase Realtime.

### 6. Messages (`features/messages/`)
| Componente | Descrição |
|-----------|-----------|
| `MessagesPage.tsx` | Lista de conversas |
| `ConversationPage.tsx` | Conversa individual |

DMs com Supabase Realtime subscriptions para actualização instantânea.

### 7. Notifications (`features/notifications/`)
Sistema de notificações com:
- Notificações por tipo (test, social, system, etc.)
- Marcação de lido/não lido
- Actor ID (quem causou a notificação)
- Reference ID (link para o conteúdo relacionado)

### 8. Billing (`features/billing/`)
Integração Stripe com Edge Functions:
- `create-checkout-session` — cria sessão de checkout
- `create-portal-session` — portal de billing
- `cancel-subscription` — cancelar
- `change-subscription-plan` — mudar plano
- `list-invoices` — lista facturas
- `stripe-webhook` — processa eventos Stripe

**Planos:** `pro` e `plus` (do schema)

### 9. Profile (`features/profile/`)
| Componente | Descrição |
|-----------|-----------|
| `ProfilePage.tsx` | Perfil do próprio utilizador |
| `EditProfilePage.tsx` | Editar perfil |

### 10. Settings (`features/settings/`)
Definições do utilizador.

### 11. Pricing (`features/pricing/`)
Página de pricing + billing unification.

### 12. Search (`features/search/`)
Pesquisa de utilizadores com:
- História de pesquisas
- Trigram search (trgm) para fuzzy matching
- Resultados por nome/utilizador

### 13. Chatbot (`features/chatbot/`)
Chatbot básico. Conteúdo desconhecido — código não lido.

### 14. Feedback (`features/feedback/`)
`ReportIssueModal.tsx` — modal para reportar problemas.

### 15. Landing (`features/landing/`)
| Componente | Descrição |
|-----------|-----------|
| `LandingPage.tsx` | Landing page pública |
| `AuthSection.tsx` | Secção de autenticação |
| `FooterSection.tsx` | Footer |

### 16. Policies (`features/policies/`)
TOS, Privacy, Cookies — 3 tabs numa só página com `defaultTab` prop.

### 17. Videos (`features/videos/`)
Apenas `seed-videos.ts` — script de seed. UI para vídeos está em `LearnPage → Videos tab`.

---

## UI Components Partilhados (`components/ui/`)

| Componente | Descrição |
|-----------|-----------|
| `Button.tsx` | Botão genérico |
| `Input.tsx` | Input genérico |
| `Badge.tsx` | Badge (presente em packages/ui de Pescador, mas aqui?) |

---

## Design System

- **Tailwind CSS** com CSS variables customizadas
- **Brand color:** `brand-yellow` (#F59E0B ou similar)
- **Background:** `bg-(--bg-primary)`, `bg-(--bg-surface)`
- **Text:** `text-(--text-primary)`, `text-(--text-muted)`
- **Border:** `border-(--border-subtle)`
- **Radius:** `rounded-(--radius-card)`, `rounded-(--radius-button)`
- **Tradução:** i18next com `useTranslation` hook

---

## Fluxo Principal

```
/ (LandingPage)
    ↓
/auth/callback (OAuth PKCE exchange)
    ↓
/app/dashboard (DashboardPage)
    ├── /app/tests → TestsList → /app/learn/test/:slug
    │                    ↓
    │               TestPage (RandomTestRunner)
    │                    ↓
    │               RandomTestResults
    │
    ├── /app/learn → LearnPage
    │   ├── Test tab → Random tests
    │   ├── Questions tab → Custom questions
    │   ├── Videos tab → Video scenarios
    │   ├── Courses tab (future)
    │   └── Resources tab (future)
    │
    ├── /app/social → SocialPage
    │   └── /app/post/:postId → PostDetailPage
    │
    ├── /app/messages → MessagesPage
    │   └── /app/messages/:convId → ConversationPage
    │
    ├── /app/pricing → PricingPage (Stripe checkout)
    │
    └── /app/profile → ProfilePage
        └── /app/profile/edit → EditProfilePage
```

---

## Supabase Schema — Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `profiles` | Perfil estendido (além de auth.users) |
| `tests` | Catálogo de testes |
| `test_questions` | Perguntas de cada teste (A/B/C/D) |
| `test_attempts` | Tentativas de teste por utilizador |
| `posts` | Feed social |
| `stripe_customers` | Mapeamento user ↔ Stripe |
| `stripe_subscriptions` | Subscrições activas |
| `notifications` | Sistema de notificações |
| `messages` | Mensagens directas |

## Edge Functions

8 funções — todas Stripe + 1 sync de vídeos:
- `create-checkout-session` — Stripe checkout
- `create-portal-session` — Customer portal
- `cancel-subscription` — Cancelar
- `change-subscription-plan` — Mudar plano
- `list-invoices` — Facturas
- `stripe-webhook` — Webhook handler
- `delete-account` — Apagar conta
- `sync-video-scenarios` — Sync de vídeos

