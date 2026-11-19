"""Build the RefLab super mockup, design/super-maquete/index.html, from ferramentas/index-modelo.html and the MAP below.

The screen pages (design/super-maquete/*.html) are static captures of the REAL app (branch main) made by
ferramentas/captura/*.js: the app runs locally with a fake Supabase that answers with sample data, and each state is
saved with its real CSS. To redo them: see ferramentas/LEIA-ME.md. This file only writes the map.
Run: python3 design/super-maquete/ferramentas/gen.py"""
import json, os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = os.path.abspath(S + '..') + '/'

E, P, M, C, N = 'existe', 'problemas', 'ameio', 'codigo', 'naovi'
def row(t, tag, d=None, u=None, sub=0, nota=None, onde=None, dados=None, decisoes=None, problemas=None, perguntas=None):
    r = dict(t=t, tag=tag)
    if d: r['d'] = d
    if u: r['u'] = u
    if sub: r['sub'] = 1
    if nota: r['nota'] = nota
    k = {}
    for key, v in (('onde', onde), ('dados', dados), ('decisoes', decisoes), ('problemas', problemas), ('perguntas', perguntas)):
        if v: k[key] = v if isinstance(v, list) else [v]
    if k: r['k'] = k
    return r

F = 'apps/frontend/src/'
MAP = [
 dict(t='Entrada', how='O que vê quem ainda não entrou: a página inicial em reflab.netlify.app.', rows=[
  row('Página inicial', P, 'A marca, a frase, «Iniciar sessão» / «Criar conta», os planos em carrossel e o rodapé legal.', 'inicio.html',
      onde=[F + 'features/landing/components/LandingPage.tsx', 'HeroSection.tsx', 'AuthSection.tsx', 'PricingSection.tsx', 'PricingCard.tsx', 'FooterSection.tsx'],
      dados='Não lê nada da base de dados: os planos e os preços estão escritos no código.',
      problemas=['Os botões dos planos («Começar», «Subscrever») levam a /app/pricing, que manda quem não entrou de volta a esta página: não fazem nada à vista.',
                 'Os planos prometem coisas que não existem (fórum, newsletter, feedback com IA).', 'Preços em formato inglês («€4.99»); no plano grátis, «Gratuito» aparece como título e como preço.',
                 'O separador do navegador diz «reflab», com o ícone do Vite e lang="en".']),
  row('Iniciar sessão', E, 'Email e palavra-passe, «Esqueceste-te da palavra-passe?», Google.', 'inicio.html#entrar', sub=1,
      onde=F + 'features/auth/components/LoginForm.tsx', dados='Supabase Auth: signInWithPassword, signInWithOAuth(google). Depois de entrar vai sempre para /app/dashboard.',
      problemas=['O cartão do login tem título e moldura; o de criar conta e o de recuperar não têm: as três vistas parecem de produtos diferentes.', 'Erros do servidor que não estão mapeados aparecem em inglês.']),
  row('Campos em falta', E, u='entrar-erros.html', sub=1, onde=F + 'features/auth/components/LoginForm.tsx'),
  row('Email ou palavra-passe errados', E, u='entrar-errado.html', sub=1, onde=F + 'features/auth/api/authErrors.ts'),
  row('Criar conta', E, 'Email, palavra-passe (mínimo 6), confirmar, «Continuar com Google».', 'criar-conta.html', onde=F + 'features/auth/components/SignupForm.tsx',
      dados='Supabase Auth signUp. Um gatilho na base de dados cria o perfil com um nome aleatório (ex. «SharpWhistle4821»), as definições e um aviso «Completa o teu perfil».',
      problemas=['Não há escolha de nome de utilizador nem boas-vindas: a pessoa cai no Painel com um nome inventado.', 'Não há link para Termos e Privacidade no registo.'],
      perguntas='A confirmação por email está ligada no Supabase? Não se vê no repositório.'),
  row('Erros ao criar conta', E, u='criar-conta-erros.html', sub=1),
  row('Conta criada: verifica o email', E, u='criar-conta-feito.html', sub=1, nota='Manda o email de confirmação do Supabase (o texto do email está configurado no Supabase, não no repositório).'),
  row('Esqueci-me da palavra-passe', E, 'Pede o email e envia uma ligação.', 'esqueci.html', onde=F + 'features/auth/components/ForgotPassword.tsx',
      problemas='Os erros do servidor aparecem em inglês, crus (não passam pelo tradutor de erros).'),
  row('Ligação enviada', E, u='esqueci-enviado.html', sub=1),
  row('Definir nova palavra-passe', P, 'Aonde leva a ligação do email.', 'nova-passe.html', onde=[F + 'features/auth/components/ResetPassword.tsx', 'rota /reset-password'],
      problemas=['Não confirma que se chegou pela ligação do email: qualquer pessoa com sessão aberta pode mudar a palavra-passe aqui sem saber a antiga.']),
  row('Erros', E, u='nova-passe-erros.html', sub=1),
  row('Palavra-passe atualizada', E, '«A redirecionar para o painel…»', 'nova-passe-feita.html', sub=1),
  row('Sem sessão de recuperação', P, 'Sem sessão: o botão fica apagado.', 'nova-passe-invalida.html', sub=1,
      nota='O código prevê a mensagem «Ligação inválida ou expirada» ao fim de uns segundos; na captura ficou só o botão apagado.'),
  row('A entrar (regresso do Google ou do email)', E, 'Roda e «A iniciar sessão...».', 'regresso.html', onde=F + 'features/auth/components/OAuthCallbackPage.tsx',
      problemas='Uma ligação de confirmação aberta noutro aparelho deve dar «A autenticação falhou…» (o método PKCE exige o mesmo navegador).'),
  row('Falhou a entrada', N, 'Cartão «A autenticação falhou. Tenta iniciar sessão novamente.» e «Voltar ao início de sessão».', onde=F + 'features/auth/components/OAuthCallbackPage.tsx:34',
      nota='Não consegui provocar este estado com a base de dados falsa: a captura fica presa em «A iniciar sessão...». Descrito a partir do código.'),
  row('Aviso de cookies', P, 'Faixa em baixo: «Aceitar» e «Recusar».', 'inicio-cookies.html', onde=F + 'components/CookieConsentBanner.tsx',
      dados='Guarda «cookie-consent» no navegador.', problemas=['Nada lê a escolha: aceitar ou recusar não muda nada.', 'Dentro da app tapa a barra de baixo até se responder.', 'A política de cookies promete gerir preferências, o que não existe.']),
  row('Dentro da app', P, u='cookies-na-app.html', sub=1),
  row('Páginas legais: Privacidade', E, 'Uma página com três separadores; texto já em português.', 'legal-privacidade.html', onde=F + 'features/policies/components/*',
      problemas=['Os separadores não mudam o endereço.', 'O email de contacto não é uma ligação.'], perguntas='Os textos legais são finais? O PR #22 diz que faltam a identidade do operador e contactos válidos.'),
  row('Termos de Serviço', E, u='legal-termos.html', sub=1),
  row('Política de Cookies', E, u='legal-cookies.html', sub=1),
  row('Emails', N, 'Só dois, ambos do Supabase: confirmar o registo e redefinir a palavra-passe.', nota='Os modelos, o remetente e a língua estão no painel do Supabase, não no repositório. Não os vi.',
      perguntas='Os emails estão em português ou nos modelos ingleses do Supabase? Há SMTP próprio?'),
 ]),
 dict(t='Estrutura da app', how='Em todas as páginas depois de entrar.', rows=[
  row('A carregar a sessão', E, '«A carregar...» ao centro, numa página vazia.', 'a-carregar.html', onde=F + 'app/RequireAuth.tsx'),
  row('Barra de cima', E, 'Menu, a marca RefLab, a lupa e o sino com o número de avisos por ler.', 'painel.html#cima', onde=F + 'components/Header.tsx',
      problemas=['Os ícones são desenhos com «role=button» sem foco de teclado: não se usam com teclado.', 'O número do sino só atualiza quando se muda de página.']),
  row('Menu lateral', P, 'Dez entradas, o nome e email da pessoa, «Terminar sessão».', 'menu.html', onde=F + 'components/Sidebar.tsx',
      problemas=['Não marca a página onde se está.', 'O nome vem da conta, não do perfil: quem entrou com email vê o email duas vezes.', 'É a única porta para «Testes», «Pesquisar», «Notificações», «Planos» e «Definições».']),
  row('Barra de baixo', E, 'Painel, Aprender, Comunidade, Mensagens (com o número por ler), Perfil.', 'painel.html#baixo', onde=F + 'components/BottomNav.tsx',
      problemas='Em /app (sem /dashboard) «Painel» não fica aceso.'),
  row('Página que não existe', P, 'Um endereço desconhecido mostra uma página escura vazia.', 'pagina-inexistente.html', onde=F + 'app/Router.tsx', problemas='Não há página 404.'),
  row('Sessão expirada', N, 'Janela «Sessão expirada», «A tua sessão expirou…», «Iniciar sessão».', onde=F + 'features/auth/components/SessionExpiredModal.tsx',
      nota='Não consegui provocá-la nas capturas. Descrita a partir do código.', problemas=['O texto está a cinzento escuro sobre fundo escuro: quase ilegível.', 'Não tem botão para fechar.']),
  row('Cabeçalho e menu antigos', C, 'Uma versão branca anterior, com emojis e uma ligação para /app/chat que não existe.', onde=F + 'components/layout/Header.tsx, Sidebar.tsx', nota='Nenhum ficheiro os usa.'),
  row('Botão e campo partilhados', C, onde=F + 'components/ui/Button.tsx, Input.tsx', nota='Ficheiros vazios.'),
 ]),
 dict(t='Painel', how='A primeira página depois de entrar. Barra de baixo: Painel.', rows=[
  row('Painel', E, 'Desempenho (precisão global e por tema, simulação de jogo, aprovação), Progresso e Hábitos (calendário de 30 dias, sequências).', 'painel.html',
      onde=[F + 'features/dashboard/components/DashboardPage.tsx', 'PerformanceSection.tsx', 'ProgressSection.tsx', 'HabitsSection.tsx', 'TrainingCalendar.tsx', 'StatCard.tsx', 'TopicAccuracyCard.tsx'],
      dados='Uma só função na base de dados: get_dashboard_stats (testes, perguntas de prática e vídeos). Os dias de treino vêm de user_activity_days, preenchida por gatilhos.',
      problemas=['As letras do calendário estão em inglês («S M T W T F S»).', 'Os decimais usam ponto («72.5%»).', '«Iniciar novo teste» é azul (--info), a única ação principal azul num produto amarelo.',
                 'Abrir uma sessão de perguntas sem responder já conta como dia de treino.', 'As respostas em vídeo contam como «perguntas respondidas».']),
  row('Sem dados (pessoa nova)', P, u='painel-vazio.html', sub=1, problemas='Os cartões de tempo mostram «—» grande em vez da frase prevista para o vazio.'),
  row('A carregar', E, u='painel-a-carregar.html', sub=1),
  row('Erro', P, 'Faixa vermelha, sem botão para tentar de novo.', 'painel-erro.html', sub=1),
 ]),
 dict(t='Aprender', how='Barra de baixo: Aprender. Cinco separadores numa só página.', rows=[
  row('Teste (início)', E, '«Teste de Conhecimento de Arbitragem»: 20 perguntas aleatórias, 40 minutos, quatro números e «Iniciar teste».', 'aprender.html',
      onde=[F + 'features/learn/components/LearnPage.tsx', 'test/RandomTestLanding.tsx'], dados='test_attempts (contagens da semana, média, melhor, tempo).',
      problemas=['«Testes esta semana» conta desde a segunda-feira da semana anterior.', 'Os ficheiros LearnTabs, TestsTab, QuestionsTab, VideosTab, CourseTab e ResourcesTab não são usados: tudo vive em LearnPage.tsx.'],
      perguntas='O banco de perguntas real (com leis e temas) não está no repositório: foi preenchido à mão na produção. Quantas perguntas há, e em que língua?'),
  row('Histórico de testes', E, u='aprender-historico.html', sub=1),
  row('A gerar o teste', E, u='teste-a-gerar.html', sub=1),
  row('A responder', E, 'Relógio, «Pergunta 1 de 20», quatro opções, «Voltar» / «Seguinte».', 'teste-pergunta.html', sub=1, onde=F + 'features/learn/components/test/RandomTestRunner.tsx',
      dados='get_random_questions; cada resposta grava em test_attempt_answers.',
      problemas=['A resposta fica bloqueada ao primeiro toque, sem confirmar.', 'As perguntas estão em inglês (vêm da base de dados).', 'A correção é feita no navegador, que recebe a resposta certa: vê-se no tráfego da página.']),
  row('Resposta bloqueada', E, u='teste-respondida.html', sub=1),
  row('Última pergunta: «Submeter teste»', E, u='teste-ultima.html', sub=1),
  row('Resultado (aprovado)', E, 'Nota, pontos fortes e áreas a melhorar por tema, rever todas as perguntas.', 'teste-resultado.html', sub=1, onde=F + 'features/learn/components/test/RandomTestResults.tsx',
      dados='get_attempt_topic_breakdown', problemas=['Não há explicação das respostas: a coluna ai_explanation existe mas nada a escreve ou lê; não há IA no produto.', 'A função de resultados não confirma que a tentativa é de quem pede.']),
  row('Resultado (reprovado, tempo esgotado)', P, u='teste-resultado-baixo.html', sub=1, problemas='Quando o tempo acaba, grava quase zero segundos de duração e só conta as perguntas respondidas.'),
  row('Perguntas (início)', E, '«Perguntas de prática»: sem limite de tempo; rápidas, por lei, por área.', 'perguntas.html', onde=F + 'features/learn/components/questions/QuestionsLanding.tsx',
      dados='question_sessions, question_practice_answers, question_bank.'),
  row('Escolher leis', P, 'Leis 11 a 14 com nomes em português.', 'perguntas-por-lei.html', sub=1, onde=F + 'features/learn/components/questions/QuestionsSetup.tsx',
      problemas='Leis fora de 11–14 aparecem como «Law N» em inglês; uma pergunta sem lei aparece como «Lei — Law null» (como se vê aqui).'),
  row('Escolher áreas', P, 'Os nomes das áreas aparecem como estão na base de dados, em inglês.', 'perguntas-por-area.html', sub=1),
  row('A responder', E, u='perguntas-sessao.html', sub=1, onde=F + 'features/learn/components/questions/QuestionsSession.tsx'),
  row('Resposta certa', E, u='perguntas-certa.html', sub=1),
  row('Resposta errada', E, u='perguntas-errada.html', sub=1),
  row('Terminar sessão?', E, u='perguntas-terminar.html', sub=1),
  row('Sessão concluída', E, u='perguntas-revisao.html', sub=1, onde=F + 'features/learn/components/questions/QuestionsReview.tsx',
      problemas='«Voltar» numa sessão sem perguntas salta para um resultado de 0%.'),
  row('Vídeos', P, 'Um vídeo, depois «Que ação deve o árbitro tomar?» e «Que sanção…?».', 'videos.html', onde=F + 'features/learn/components/LearnPage.tsx:297-664',
      dados='video_scenarios, video_attempts. Os vídeos vêm de um endereço Cloudflare R2 escrito no código.',
      problemas=['Só há um cenário ativo («Offside Analysis 1»): o contador diz sempre «1 / 1».', 'Quando o vídeo falha, a mensagem fala a quem usa a app de um «bucket learn-videos no Supabase Storage».', 'O nome do ficheiro não bate certo com a forma como o R2 guarda os clips: o vídeo provavelmente não carrega.'],
      nota='Não consegui ver o vídeo a tocar (o site e o R2 estão fora do alcance deste ambiente); o erro mostrado é o que a app mostra quando o vídeo não carrega.'),
  row('A escolher a sanção', E, u='videos-sancao.html', sub=1),
  row('Resultado do vídeo', E, '«Parcialmente correta», ação e sanção.', 'videos-resultado.html', sub=1),
  row('Sem vídeos', E, u='videos-vazio.html', sub=1),
  row('Cursos', M, '«Brevemente.»', 'cursos.html'),
  row('Recursos', M, 'Cinco ficheiros de exemplo («Leis do Jogo 2024/25»…) com «Transferir» que não faz nada.', 'recursos.html', onde=F + 'features/learn/components/LearnPage.tsx:680-711'),
  row('Testes disponíveis', P, 'Três questionários de programação de exemplo («React Basics»…) com «Iniciar teste».', 'testes-lista.html', onde=F + 'features/tests/components/TestsList.tsx',
      problemas=['Lista escrita no código, nada a ver com arbitragem.', 'Os títulos estão escuros sobre fundo escuro: quase invisíveis.', 'Chega-se aqui pelo menu «Testes» e pelos avisos de conteúdo novo.']),
  row('Teste por endereço', P, 'Só mostra o erro: os testes da lista não existem.', 'teste-endereco.html', onde=F + 'features/learn/components/TestPage.tsx',
      problemas=['A caixa de erro é rosa-clara, de outro desenho, com a mensagem crua em inglês.', 'O fluxo antigo de testes fixos (9 testes semeados) só é alcançável por aqui, na prática nunca.']),
  row('Notícias', C, 'Duas tabelas e três artigos de exemplo na base de dados, sem nenhum ecrã.', onde='backend/supabase/migrations/20260222_0048_news_feature.sql, 0049_seed_news.sql',
      perguntas='As notícias eram para entrar? Onde?'),
 ]),
 dict(t='Comunidade', how='Barra de baixo: Comunidade. Um feed de toda a gente (não só de quem se segue).', rows=[
  row('Feed', P, 'Filtros Todos, Texto, Imagem, Vídeo, Áudio; cartões com gosto, comentários, republicar, guardar, partilhar; botão amarelo «+».', 'comunidade.html',
      onde=[F + 'features/social/components/SocialPage.tsx', 'NavigationBar.tsx', 'PostBox.tsx', 'PostHeader.tsx', 'PostBody.tsx', 'PostFooter.tsx', 'RepostBox.tsx', 'NewPostButton.tsx'],
      dados='get_social_feed (20 de cada vez), posts, post_likes, post_saves. Sem tempo real.',
      problemas=['«João Silva reposted» e o tempo «now» estão em inglês.', 'Guardar só sobe um contador: não há página de guardados.', 'Republicações ficam sempre em «Texto», mesmo de uma imagem.',
                 'Provável: a página não carrega mais de 20 publicações (a área com scroll não tem altura fixa).', 'Apagar a original deixa as republicações como cartões vazios.']),
  row('A carregar', E, u='comunidade-a-carregar.html', sub=1),
  row('Vazio', E, u='comunidade-vazia.html', sub=1),
  row('Erro', E, u='comunidade-erro.html', sub=1),
  row('Só imagens', E, u='comunidade-imagens.html', sub=1),
  row('Comentários', P, 'Abrem dentro do cartão; respostas num segundo nível; @menções a amarelo.', 'comunidade-comentarios.html', sub=1, onde=F + 'features/social/components/CommentSection.tsx, CommentBox.tsx',
      problemas=['Um erro ao comentar não aparece, e o contador sobe na mesma.', 'Denunciar um comentário envia logo, sem janela nem aviso.', 'Apagar não pede confirmação.']),
  row('Mencionar alguém (@)', P, u='comunidade-mencao.html', sub=1, onde=F + 'features/social/components/MentionDropdown.tsx', problemas='Sem resultados diz «No users found», em inglês.'),
  row('Menu de uma publicação de outra pessoa', E, u='comunidade-menu-outro.html', sub=1, onde=F + 'features/social/components/PostMenu.tsx'),
  row('Menu de uma publicação minha', P, '«Eliminar publicação», sem confirmação.', 'comunidade-menu-meu.html', sub=1),
  row('Denunciar', P, u='comunidade-denunciar.html', sub=1, onde=F + 'features/social/components/ReportDialog.tsx',
      problemas=['«Porque estás a denunciar este post?» / «este user?»: mistura de inglês.', 'No feed, depois de enviar, não aparece confirmação nenhuma.'],
      perguntas='Quem lê as denúncias? Não há ecrã de moderação.'),
  row('Bloquear', E, u='comunidade-bloquear.html', sub=1, onde=F + 'features/social/components/BlockConfirmDialog.tsx'),
  row('Nova publicação', E, 'Texto e um ficheiro (imagem, vídeo ou áudio até 50 MB).', 'comunidade-publicar.html', sub=1, onde=F + 'features/social/components/CreatePostModal.tsx', dados='Storage post-media, tabela posts.'),
  row('Publicar vazio', E, u='comunidade-publicar-erro.html', sub=1),
  row('Partilhar (janela)', C, 'WhatsApp, X, Facebook, Telegram, Email e «Copiar».', onde=F + 'features/social/components/ShareDialog.tsx', nota='Nenhum ficheiro a usa: «Partilhar» usa a partilha do telemóvel ou copia a ligação.'),
  row('Publicação aberta', P, 'A publicação com os comentários abertos.', 'publicacao.html', onde=F + 'features/social/components/PostDetailPage.tsx',
      problemas='O título diz «Publicar» (o verbo) em vez de «Publicação».'),
  row('Publicação que não existe', E, u='publicacao-inexistente.html', sub=1),
 ]),
 dict(t='Perfil', how='Barra de baixo: Perfil.', rows=[
  row('O meu perfil', P, 'Foto ou iniciais, nome, @utilizador e as minhas publicações com os mesmos filtros.', 'perfil.html', onde=F + 'features/profile/components/ProfilePage.tsx',
      dados='profiles; get_profile_feed.', problemas=['Não mostra seguidores, a seguir, nível nem nada do treino: o perfil não liga ao Aprender.', 'A tabela de perfis não tem biografia, XP nem nível.']),
  row('Sem publicações', E, u='perfil-vazio.html', sub=1),
  row('Editar perfil', E, 'Foto, nome e nome de utilizador (com verificação de disponibilidade).', 'perfil-editar.html', onde=F + 'features/profile/components/EditProfilePage.tsx', dados='Storage profile-media (5 MB), profiles, public_profiles.'),
  row('Perfil de outra pessoa', P, '«Seguir» e «Mensagem».', 'perfil-outro.html', onde=F + 'features/social/components/PublicProfilePage.tsx',
      dados='get_public_profile_view, get_public_profile_feed, user_follows.',
      problemas=['Seguir pode falhar sempre: o gatilho do aviso «novo seguidor» chama uma função que ficou ambígua (verificar na base de dados real).', 'Seguir não se vê em lado nenhum: não há contagens nem listas.', '«Try Again» e «Link copied to clipboard» em inglês.']),
  row('Menu do perfil', E, u='perfil-outro-menu.html', sub=1, onde=F + 'features/social/components/PublicProfileMenu.tsx'),
  row('Bloqueado por mim', E, u='perfil-outro-bloqueado.html', sub=1),
  row('Bloqueou-me', E, u='perfil-outro-bloqueou-te.html', sub=1),
  row('Utilizador que não existe', E, u='perfil-outro-inexistente.html', sub=1),
  row('Perfil público antigo', C, onde=F + 'features/profile/components/PublicProfilePage.tsx, api/publicProfilesApi.ts', nota='Uma segunda versão, não usada.'),
 ]),
 dict(t='Mensagens', how='Barra de baixo: Mensagens.', rows=[
  row('Conversas', P, 'Procurar, e a lista com a última mensagem e o número por ler.', 'mensagens.html', onde=F + 'features/messages/components/MessagesPage.tsx, ConversationItem.tsx',
      dados='get_conversations; search_users.', problemas=['A lista não se atualiza sozinha.', 'O número na barra de baixo só muda quando se muda de página.']),
  row('Sem conversas', E, u='mensagens-vazia.html', sub=1),
  row('Procurar pessoa para conversar', E, u='mensagens-procurar.html', sub=1, onde=F + 'features/messages/components/UserSearchBar.tsx, UserSearchDropdown.tsx'),
  row('Conversa', P, 'Balões, data e hora, anexar e «Enviar». Chega em tempo real.', 'conversa.html', onde=F + 'features/messages/components/ConversationPage.tsx, MessageBubble.tsx, MessageInput.tsx',
      dados='get_messages; messages (tempo real); Storage message-media.',
      problemas=['Os anexos ficam num local público: quem tiver a ligação vê.', 'Se um envio falha (por ex. a pessoa só aceita mensagens de quem segue), a conversa desaparece até ao envio seguinte, e o erro vem em inglês.',
                 'A hora mostra os segundos («09:21:08 19-11-2026»).']),
  row('Conversa vazia', E, u='conversa-vazia.html', sub=1),
  row('A escrever', E, u='conversa-a-escrever.html', sub=1),
 ]),
 dict(t='Pesquisa', how='Pela lupa na barra de cima, ou pelo menu.', rows=[
  row('Pesquisar pessoas', P, 'Campo, «Recentes» e «Limpar tudo».', 'pesquisa.html', onde=F + 'features/search/components/SearchPage.tsx, SearchHistory.tsx',
      dados='search_users (procura aproximada); histórico guardado no navegador.', problemas=['O histórico é partilhado por todas as contas no mesmo navegador.', 'Só procura pessoas, não publicações nem perguntas.', 'Vários ficheiros da pesquisa não são usados (SearchInput, SearchHistoryItem, UserListItem, useSearch, searchApi).']),
  row('Sem histórico', E, u='pesquisa-vazia.html', sub=1),
  row('Resultados', E, u='pesquisa-resultados.html', sub=1),
  row('Sem resultados', E, u='pesquisa-sem-resultados.html', sub=1),
 ]),
 dict(t='Avisos', how='Pelo sino na barra de cima.', rows=[
  row('Notificações', P, 'A lista: gostos, comentários, menções, seguidores, republicações, avisos do plano, completar o perfil.', 'notificacoes.html',
      onde=F + 'features/notifications/components/NotificationsPage.tsx, NotificationBanner.tsx, NotificationBell.tsx', dados='notifications (criadas por gatilhos na base de dados). Sem tempo real.',
      problemas=['O sino não abre uma lista: leva a esta página.', '«Completa o teu perfil» nunca desaparece, mesmo depois de completo.', '«Lembrar mais tarde» e «dispensar» existem no código, sem botão.']),
  row('Sem notificações', E, u='notificacoes-vazia.html', sub=1),
  row('Avisos que nunca chegam', C, '«Nova mensagem», «lembrete de sequência», «perdeste a sequência», «sequência» e «conteúdo novo».',
      nota='Têm interruptor nas Definições mas nada os cria: os gatilhos de dois deles foram apagados pela migração 0035 e nunca recriados.', onde='backend/supabase/migrations/20260213_0035_fresh_rebuild_all.sql'),
  row('Lembrete de fim de plano', P, 'Trabalho de hora a hora no servidor.', onde='backend/supabase/migrations/20260213_0023_plan_expiration_reminders.sql',
      problemas=['Avisa toda a gente que renova que o plano «vai expirar».', 'Cada um dos três avisos só é enviado uma vez na vida de cada pessoa.']),
 ]),
 dict(t='Conta', how='Pelo menu lateral: Planos e Definições.', rows=[
  row('Definições', P, 'Perfil, Conta e segurança, Notificações (11 interruptores), Privacidade (quem me pode escrever), Bloqueados, Aprendizagem, Legal.', 'definicoes.html',
      onde=F + 'features/settings/components/SettingsPage.tsx e *Section.tsx', dados='get_user_settings_all, notification_preferences, user_settings, get_blocked_users.',
      problemas=['5 dos 11 interruptores não fazem nada (os avisos não existem).', 'Se gravar uma preferência falhar, nada avisa; a escolha falhada fica à vista.']),
  row('Eliminar conta', E, 'Escrever DELETE para confirmar.', 'definicoes-apagar.html', sub=1, onde=[F + 'features/settings/components/ConfirmDialog.tsx', 'backend/supabase/functions/delete-account'],
      problemas=['Cancela logo a assinatura Stripe, sem reembolso, e deixa o cliente na Stripe.', 'Erros da função aparecem em inglês.']),
  row('Limpar histórico de aprendizagem', E, u='definicoes-limpar.html', sub=1, dados='clear_learning_history'),
  row('Eliminar conta (janela antiga)', C, onde=F + 'features/auth/components/DeleteAccountDialog.tsx', nota='Não usada: as Definições têm a sua.'),
  row('Planos e faturação (grátis)', P, 'Gratuito, Pro €4.99 (Recomendado), Plus €9.99.', 'planos.html', onde=F + 'features/pricing/components/PricingPage.tsx, PlansSection.tsx',
      dados='stripe_subscriptions; funções create-checkout-session, create-portal-session.',
      problemas=['Nada no produto muda com o plano: tudo o que é «premium» é grátis.', 'Os preços, «/ month», «Active», «Past Due» estão em inglês.'],
      perguntas=['Os planos pagos são para ligar já? O PR #22 deixa-os desligados até haver testes à Stripe.', 'O que deve ficar só para Pro e Plus?']),
  row('Com Pro', E, 'O plano atual, estado, renovação, «Cancelar subscrição», «Gerir na Stripe», histórico de compras.', 'planos-pro.html', sub=1, onde=F + 'features/pricing/components/SubscriptionCard.tsx, InvoiceHistory.tsx'),
  row('Mudar para Plus', P, u='planos-pro-mudar.html', sub=1, onde=F + 'features/pricing/components/ChangePlanDialog.tsx', problemas='Diz que muda no próximo ciclo; na Stripe muda logo, sem acerto de preço.'),
  row('Cancelar', E, u='planos-pro-cancelar.html', sub=1, onde=F + 'features/pricing/components/CancelDialog.tsx'),
  row('Cancelamento pendente', P, u='planos-a-cancelar.html', sub=1, problemas='Não há forma de voltar atrás dentro da app: só pela Stripe.'),
  row('Pagamento falhou', E, u='planos-pagamento-falhou.html', sub=1),
  row('Regresso da Stripe', P, '«A processar a tua subscrição…»', 'planos-checkout-feito.html', sub=1, problemas='A verificação automática nunca corre: a faixa pode ficar até se recarregar a página.'),
  row('Pagar na Stripe', N, 'A página de pagamento e o portal são da Stripe.', nota='Fora da app; não vi.'),
  row('Reportar um problema', C, onde=F + 'features/feedback/components/ReportIssueModal.tsx', nota='O componente devolve nada e ninguém o usa.'),
  row('Assistente (chatbot)', C, onde=F + 'features/chatbot/', nota='Pastas vazias. O README chama-lhe «básico», mas não há nada.'),
 ]),
 dict(t='Por trás', how='O que corre no servidor e não tem ecrã.', rows=[
  row('Funções no servidor', P, 'Oito: pagamento, portal, cancelar, mudar plano, faturas, webhook da Stripe, apagar conta, sincronizar vídeos.', onde='backend/supabase/functions/*',
      problemas=['«sync-video-scenarios» não verifica quem a chama e escreve com a chave de serviço; procura um armazenamento que já não se usa.', 'Não há config.toml: não se sabe como estão publicadas.']),
  row('Base de dados', P, '49 migrações; 38 tabelas.', onde='backend/supabase/migrations',
      problemas=['Qualquer pessoa pode mudar o seu próprio papel para «admin».', 'Qualquer pessoa com sessão lê o email e o papel de toda a gente.', 'A migração 0047 falha numa base nova (copia colunas que nunca existiram).',
                 'Tabelas antigas de faturação continuam lá sem uso.', 'A pasta supabase/.temp (ligação ao projeto) está no repositório.'],
      perguntas='As migrações aplicadas na base real são estas? Não consegui ver a base de dados.'),
 ]),
]

ASOF = '19 nov 2026'
FOOT = ('Feito a ' + ASOF + ' a partir do ramo main (último código a 24 fev 2026). Cada ecrã é a app verdadeira a correr com uma base de dados '
        'falsa: pessoas, publicações, mensagens e números são de exemplo; as perguntas e o vídeo são os das migrações do próprio RefLab. '
        'Não vi o site ao vivo (bloqueado neste ambiente).')

def js(v):
    return json.dumps(v, ensure_ascii=False, indent=1).replace('</', '<\\/')

s = open(S + 'index-modelo.html').read()
a = s.index('/*MAPA*/') + 8; b = s.index('/*FIM*/'); s = s[:a] + js(MAP) + s[b:]
a = s.index('/*RODAPE*/') + 10; b = s.index('/*FIMRODAPE*/'); s = s[:a] + json.dumps(FOOT, ensure_ascii=False) + s[b:]
open(OUT + 'index.html', 'w').write(s)
json.dump(MAP, open(S + 'mapa.json', 'w'), ensure_ascii=False, indent=1)
from collections import Counter
rows = [r for sec in MAP for r in sec['rows']]
print(Counter(r['tag'] for r in rows), len(rows))
missing = [r['u'] for r in rows if r.get('u') and not os.path.exists(OUT + r['u'].split('#')[0])]
print('missing pages:', missing)

# ---------- extra links inside the captured pages (header icons, tabs): idempotent ----------
EXTRA = '''<script id="maquete-ligacoes">
/* Maquete: ligações a mais dentro das fotografias (ícones e separadores que na app são botões). */
(function(){
  var here = location.pathname.split('/').pop();
  var learn = /^(aprender|perguntas|videos|cursos|recursos|teste-|aprender-)/.test(here);
  var tabs = { 'Teste': 'aprender.html', 'Perguntas': 'perguntas.html', 'Vídeos': 'videos.html', 'Cursos': 'cursos.html', 'Recursos': 'recursos.html' };
  document.addEventListener('click', function(e){
    var t = e.target; if (!t.closest) return;
    var to = null;
    if (t.closest('header [aria-label="Pesquisar"]')) to = 'pesquisa.html';
    else if (t.closest('header [aria-label="Abrir menu"]')) to = 'menu.html';
    else if (t.closest('header [aria-label*="otifica"]')) to = 'notificacoes.html';
    else if (t.closest('header [aria-label="Início RefLab"]')) to = 'painel.html';
    else if (learn) { var b = t.closest('button'); var k = b && b.textContent.trim(); if (k && tabs[k] && b.closest('nav, .border-b')) to = tabs[k]; }
    else if (here === 'inicio.html' || here === 'inicio-cookies.html') { var b2 = t.closest('button'); var k2 = b2 && b2.textContent.trim(); if (k2 === 'Criar conta' && !b2.closest('form')) to = 'criar-conta.html'; else if (k2 === 'Esqueceste-te da palavra-passe?') to = 'esqueci.html'; }
    else if (/^(criar-conta|esqueci)/.test(here)) { var b3 = t.closest('button'); var k3 = b3 && b3.textContent.trim(); if (k3 === 'Iniciar sessão' && !b3.closest('form')) to = 'inicio.html'; else if (/Voltar ao início de sessão/.test(k3 || '')) to = 'inicio.html'; }
    if (to && to !== here) { e.preventDefault(); e.stopPropagation(); location.href = to; }
  }, true);
})();
</script>'''
import glob, re
for f in glob.glob(OUT + '*.html'):
    if f.endswith('/index.html') or '/super-maquete' in f: continue
    s = open(f).read()
    s = re.sub(r'<script id="maquete-ligacoes">.*?</script>', '', s, flags=re.S)
    i = s.rindex('</body>'); s = s[:i] + EXTRA + s[i:]
    open(f, 'w').write(s)
print('links added')
