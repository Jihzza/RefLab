# RefLab — super maquete do que existe hoje

> Versão 0 (inventário), 19 nov 2026. Leitura e desenho apenas: nenhum código da aplicação foi mudado,
> nada foi publicado, nenhum segredo foi aberto. Este documento vai sendo completado ao longo do dia.

## O que é «o RefLab de hoje»

- **O código de hoje é o ramo `main` deste repositório** (último código a 24 fev 2026; depois disso só entraram
  documentos, a 17 abr). É o que o Netlify publica em `reflab.netlify.app`.
- **Não consegui ver o site ao vivo:** a rede deste ambiente de trabalho bloqueia `reflab.netlify.app`.
  Por isso, cada ecrã da maquete foi desenhado **pela própria aplicação**: corri o código de `main` aqui,
  com uma base de dados falsa e dados de exemplo, e fotografei cada estado. As palavras, a ordem e as cores
  são as do código; os nomes, números e textos de utilizadores são de exemplo.
- **Há trabalho maior à espera, fora de `main`** (não faz parte do que existe hoje, mas importa para decidir):
  - PR aberto [Jihzza/RefLab#22](https://github.com/Jihzza/RefLab/pull/22) (rascunho, jul 2026): «redesign completo
    Match Control» + preparação do lançamento público. 221 ficheiros. Diz «não fazer merge enquanto o preflight
    estiver NO-GO» e lista bloqueios externos.
  - PR fechado sem merge [Jihzza/RefLab#21](https://github.com/Jihzza/RefLab/pull/21) (a versão anterior do mesmo redesign).
  - Ramo `production-readiness-hardening` (jul 2026, sem PR): outro redesign («Referee's Console») + gamificação
    («A Carreira do Árbitro», XP, conquistas).
  - Ramo `mainpageDB` (fev 2026): vídeos na base de dados, já absorvido em `main` pelo PR #13.
  - 11 PRs abertos do Dependabot (atualizações de bibliotecas).
- **Repositórios irmãos** (`Jihzza/reflab-old`, `Jihzza/reflab-oli`, `Olivv14/reflab-oli`, `Jihzza/RefLab-Tests`):
  todos parados desde fev 2026, mais antigos do que `main`. Não os usei.

## Inventário (versão 0)

Etiquetas: **Existe** · **Existe, com problemas** · **A meio** · **Só no código** · **Não consegui ver**.
As etiquetas finais e os problemas de cada linha ficam na maquete (`design/super-maquete/index.html`) e na tabela completa abaixo, que vai sendo preenchida.

| Secção | Parte | Onde vive no código | Etiqueta (provisória) |
|---|---|---|---|
| Entrada | Página inicial pública (marca, frase, entrar/criar conta, planos, rodapé) | `features/landing/*` · rota `/` | Existe |
| Entrada | Iniciar sessão (email + palavra-passe, Google) | `features/auth/components/LoginForm.tsx` | Existe |
| Entrada | Criar conta | `features/auth/components/SignupForm.tsx` | Existe |
| Entrada | Esqueci-me da palavra-passe | `features/auth/components/ForgotPassword.tsx` | Existe |
| Entrada | Nova palavra-passe (link do email) | `features/auth/components/ResetPassword.tsx` · `/reset-password` | Existe |
| Entrada | Regresso do Google / do email | `features/auth/components/OAuthCallbackPage.tsx` · `/auth/callback` | Existe |
| Entrada | Sessão expirada (janela) | `features/auth/components/SessionExpiredModal.tsx` | Existe |
| Entrada | Aviso de cookies | `components/CookieConsentBanner.tsx` | Existe |
| Entrada | Páginas legais (Privacidade, Termos, Cookies) | `features/policies/*` · `/privacy` `/terms` `/cookies` | Existe |
| Estrutura | Barra de cima (menu, marca, lupa, sino) | `components/Header.tsx` | Existe |
| Estrutura | Menu lateral (10 entradas + sair) | `components/Sidebar.tsx` | Existe |
| Estrutura | Barra de baixo (5 separadores, contador de mensagens) | `components/BottomNav.tsx` | Existe |
| Estrutura | Segundo cabeçalho e menu lateral antigos | `components/layout/*` | Só no código |
| Painel | Painel: desempenho, progresso, hábitos, calendário | `features/dashboard/*` · `/app/dashboard` | Existe, com problemas (rebenta sem dados) |
| Aprender | Aprender, com 5 separadores | `features/learn/components/LearnPage.tsx` · `/app/learn` | Existe |
| Aprender | Teste aleatório: início, a responder, resultado | `features/learn/components/test/*` | Existe |
| Aprender | Perguntas: início, escolher, sessão, rever | `features/learn/components/questions/*` | Existe |
| Aprender | Vídeos de decisão | `features/learn/components/VideosTab.tsx` | Existe (a confirmar) |
| Aprender | Cursos | `features/learn/components/CourseTab.tsx` | A meio (a confirmar) |
| Aprender | Recursos | `features/learn/components/ResourcesTab.tsx` | A meio (a confirmar) |
| Aprender | Lista de testes | `features/tests/components/TestsList.tsx` · `/app/tests` | A confirmar |
| Aprender | Fazer um teste por endereço | `features/learn/components/TestPage.tsx` · `/app/learn/test/:slug` | A confirmar |
| Comunidade | Feed, publicar, gostar, comentar, partilhar, repostar, guardar, denunciar, bloquear | `features/social/*` · `/app/social` | Existe |
| Comunidade | Publicação aberta | `PostDetailPage.tsx` · `/app/post/:postId` | Existe |
| Comunidade | Perfil de outra pessoa | `features/social/components/PublicProfilePage.tsx` · `/app/profile/:username` | Existe |
| Mensagens | Lista de conversas e conversa | `features/messages/*` · `/app/messages` | Existe |
| Pesquisa | Pesquisar pessoas, histórico | `features/search/*` · `/app/search` | Existe |
| Avisos | Sino, página de notificações, faixa | `features/notifications/*` · `/app/notifications` | Existe |
| Perfil | O meu perfil, editar perfil | `features/profile/*` · `/app/profile` | Existe |
| Conta | Definições (perfil, conta, privacidade, notificações, aprendizagem, legal, bloqueados) | `features/settings/*` · `/app/settings` | Existe |
| Conta | Planos e pagamentos (Stripe) | `features/pricing/*`, `features/billing/*` · `/app/pricing` | Existe (a confirmar) |
| Conta | Apagar conta (janela) | `features/auth/components/DeleteAccountDialog.tsx` | Só no código (não é importado) |
| Conta | Reportar um problema | `features/feedback/components/ReportIssueModal.tsx` | Só no código (não é importado) |
| — | Chatbot | `features/chatbot/` | Só no código (pastas vazias) |
| Por trás | 8 funções no servidor (Stripe, apagar conta, vídeos) | `backend/supabase/functions/*` | A confirmar |
| Por trás | Notícias (tabelas e dados) | migrações `0048`, `0049` | A confirmar se há ecrã |

## Como está montado (nomes apenas)

- **Aplicação web:** React 19 + TypeScript + Vite + Tailwind 4, em `apps/frontend`. Língua forçada a português
  de Portugal (`src/i18n`), com inglês onde falta tradução.
- **Alojamento:** Netlify (`netlify.toml`, publica `apps/frontend/dist`).
- **Base de dados, contas, ficheiros, tempo real:** Supabase (`backend/supabase/migrations`, 49 ficheiros).
- **Entrar:** email e palavra-passe, e Google, pelo Supabase.
- **Pagamentos:** Stripe, por funções no servidor do Supabase.
- **Vídeos:** guardados fora (Cloudflare R2, segundo o PR #13; a confirmar).
- Variáveis usadas pela app web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (lista completa a seguir).

## Perguntas só para o Daniel

1. O segredo do Google e a palavra-passe da base de dados: o PR #22 diz que **ficaram expostos durante um
   diagnóstico** e que é preciso trocá-los. Já foram trocados?
2. O redesign «Match Control» (PR #22) e o «Referee's Console» (ramo `production-readiness-hardening`) são duas
   direções diferentes. Qual vale? Ou nenhuma, e partimos desta maquete?
