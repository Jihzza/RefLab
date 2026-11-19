"""Build the RefLab super mockup, design/super-maquete/index.html, from ferramentas/index-modelo.html and the MAP below.

The screen pages (design/super-maquete/*.html) are static captures of the REAL app (branch main) made by
ferramentas/captura/*.js: the app runs locally with a fake Supabase that answers with sample data, and each state is
saved with its real CSS. See ferramentas/LEIA-ME.md. This file only writes the map and adds the in-page links.
Review 1 (coordinator, 19 Nov): every linked row opens its own state; rows with no screen are listed under «Sem ecrã»;
the visible lines are plain words (d = what you see, p = the problem); paths, tables and variables live in k, shown
in the closed sheet «O que se sabe».
Run: python3 design/super-maquete/ferramentas/gen.py"""
import json, os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = os.path.abspath(S + '..') + '/'

E, P, M, C, N = 'existe', 'problemas', 'ameio', 'codigo', 'naovi'
def row(t, tag, d=None, u=None, sub=0, p=None, nota=None, onde=None, dados=None, decisoes=None, problemas=None, perguntas=None):
    r = dict(t=t, tag=tag)
    if p: r['p'] = p
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
 dict(t='Entrada', how='O que vê quem ainda não entrou.', rows=[
  row('Página inicial', P, 'A marca, a frase «O teu laboratório de treino de arbitragem», entrar ou criar conta, os planos e o rodapé.', 'inicio.html',
      p='Os botões dos planos não fazem nada a quem ainda não entrou.',
      onde=[F + 'features/landing/components/LandingPage.tsx', 'HeroSection.tsx', 'AuthSection.tsx', 'PricingSection.tsx', 'PricingCard.tsx', 'FooterSection.tsx', 'apps/frontend/index.html'],
      dados='Nada da base de dados: os planos e preços estão escritos no código.',
      problemas=['«Começar» e «Subscrever» levam a /app/pricing, que devolve quem não entrou a esta página.', 'Os planos prometem fórum, newsletter e feedback com IA, que não existem.',
                 'Preços em formato inglês («€4.99»); no plano grátis, «Gratuito» aparece como título e como preço.',
                 'O separador do navegador diz «reflab», com o ícone do Vite, e as páginas declaram-se em inglês ao navegador (lang="en") embora o texto seja português.']),
  row('Os planos na página inicial', P, 'Gratuito, Pro e Plus num carrossel.', 'planos-inicio.html', sub=1, p='Prometem coisas que o produto não tem (IA, fórum, newsletter).'),
  row('Iniciar sessão', E, 'Email e palavra-passe, «Esqueceste-te da palavra-passe?» e o botão do Google.', 'entrar.html',
      onde=F + 'features/auth/components/LoginForm.tsx', dados='Supabase Auth: signInWithPassword, signInWithOAuth(google). Depois de entrar vai sempre para o Painel.',
      problemas=['O cartão de entrar tem título e moldura; o de criar conta e o de recuperar não têm.', 'Erros do servidor não mapeados aparecem em inglês.']),
  row('Campos por preencher', E, 'O aviso por baixo de cada campo.', 'entrar-erros.html', sub=1, onde=F + 'features/auth/components/LoginForm.tsx'),
  row('Email ou palavra-passe errados', E, 'A faixa vermelha no cartão.', 'entrar-errado.html', sub=1, onde=F + 'features/auth/api/authErrors.ts'),
  row('Criar conta', P, 'Email, palavra-passe (mínimo 6), confirmar, e «Continuar com Google».', 'criar-conta.html',
      p='Não há escolha de nome nem boas-vindas: a pessoa entra com um nome inventado (por exemplo «SharpWhistle4821»).',
      onde=F + 'features/auth/components/SignupForm.tsx',
      dados='Supabase Auth signUp. Um gatilho cria o perfil com um nome aleatório, as definições e o aviso «Completa o teu perfil».',
      problemas=['Não há ligação para Termos e Privacidade no registo.'], perguntas='A confirmação por email está ligada? Não se vê no repositório.'),
  row('Erros ao criar conta', E, 'Email inválido, palavra-passe curta, palavras-passe diferentes.', 'criar-conta-erros.html', sub=1),
  row('Conta criada', E, '«Conta criada! Verifica o teu email para confirmar a conta.»', 'criar-conta-feito.html', sub=1),
  row('Esqueci-me da palavra-passe', P, 'Pede o email para enviar uma ligação.', 'esqueci.html', p='Se o servidor der erro, a mensagem aparece em inglês.',
      onde=F + 'features/auth/components/ForgotPassword.tsx', problemas='Os erros não passam pelo tradutor de erros.'),
  row('Ligação enviada', E, 'A confirmação a verde.', 'esqueci-enviado.html', sub=1),
  row('Definir nova palavra-passe', P, 'A página a que leva a ligação do email.', 'nova-passe.html',
      p='Quem já tem sessão aberta pode mudar a palavra-passe aqui sem saber a antiga.',
      onde=[F + 'features/auth/components/ResetPassword.tsx', 'rota /reset-password'], problemas='Não confirma que se chegou pela ligação do email (recoveryMode não é verificado).'),
  row('Erros', E, 'Palavra-passe curta, palavras-passe diferentes.', 'nova-passe-erros.html', sub=1),
  row('Palavra-passe atualizada', E, '«A redirecionar para o painel…»', 'nova-passe-feita.html', sub=1),
  row('Sem a ligação do email', P, 'O botão fica apagado.', 'nova-passe-invalida.html', sub=1, p='Devia dizer «Ligação inválida ou expirada»; na captura não apareceu.'),
  row('A entrar', E, 'A roda e «A iniciar sessão...», ao voltar do Google ou do email de confirmação.', 'regresso.html',
      onde=F + 'features/auth/components/OAuthCallbackPage.tsx', problemas='Uma ligação de confirmação aberta noutro aparelho deve falhar (o método PKCE exige o mesmo navegador).'),
  row('Aviso de cookies', P, 'Faixa em baixo com «Aceitar» e «Recusar».', 'inicio-cookies.html', p='Aceitar ou recusar não muda nada.',
      onde=F + 'components/CookieConsentBanner.tsx', dados='Guarda «cookie-consent» no navegador.', problemas=['Nada lê a escolha.', 'A política de cookies promete gerir preferências, o que não existe.']),
  row('O aviso dentro da app', P, 'Tapa a barra de baixo.', 'cookies-na-app.html', sub=1, p='Não se consegue mudar de secção até responder.'),
  row('Privacidade', E, 'Página com três separadores, já em português.', 'legal-privacidade.html', onde=F + 'features/policies/components/*',
      problemas=['Os separadores não mudam o endereço.', 'O email de contacto não é uma ligação.'], perguntas='Os textos legais são finais? O PR #22 diz que faltam a identidade do operador e contactos válidos.'),
  row('Termos de Serviço', E, 'O segundo separador.', 'legal-termos.html', sub=1),
  row('Política de Cookies', E, 'O terceiro separador.', 'legal-cookies.html', sub=1),
  row('Falhou a entrada', N, 'Devia mostrar «A autenticação falhou» e «Voltar ao início de sessão».', nota='Não consegui provocar este estado com os dados de exemplo.',
      onde=F + 'features/auth/components/OAuthCallbackPage.tsx:34'),
  row('Emails', N, 'Dois, enviados pelo Supabase: confirmar o registo e redefinir a palavra-passe.', nota='O texto, o remetente e a língua estão no painel do Supabase; não os vi.',
      perguntas='Os emails estão em português? Há um serviço de email próprio?'),
 ]),
 dict(t='Estrutura da app', how='Em todas as páginas depois de entrar.', rows=[
  row('Barra de cima', P, 'Menu, a marca, a lupa e o sino com o número de avisos por ler (aqui «9+»).', 'barra-cima.html',
      p='O número do sino só muda quando se muda de página.',
      onde=F + 'components/Header.tsx', problemas=['Os ícones não se usam com o teclado (são desenhos com role=button, sem foco).']),
  row('Barra de baixo', P, 'Painel, Aprender, Comunidade, Mensagens (aqui com «99+» por ler), Perfil.', 'barra-baixo.html',
      p='O número das mensagens só muda quando se muda de página.', onde=F + 'components/BottomNav.tsx', problemas='Em /app (sem /dashboard) «Painel» não fica aceso.'),
  row('Menu lateral', P, 'Dez entradas, o nome e o email, e «Terminar sessão».', 'menu.html',
      p='É o único caminho para Testes, Pesquisar, Notificações, Planos e Definições, e não marca onde estás.',
      onde=F + 'components/Sidebar.tsx', problemas='O nome vem da conta, não do perfil: quem entrou com email vê o email duas vezes.'),
  row('Endereço que não existe', P, 'Uma página escura vazia.', 'pagina-inexistente.html', p='Não há página «não encontrado».', onde=F + 'app/Router.tsx'),
  row('Sessão expirada', N, 'Uma janela «Sessão expirada» com «Iniciar sessão».', nota='Não consegui provocá-la com os dados de exemplo. No código, o texto está quase ilegível e não há forma de fechar.',
      onde=F + 'features/auth/components/SessionExpiredModal.tsx', problemas=['Texto text-gray-600 sobre fundo escuro.', 'Sem botão de fechar.']),
  row('Cabeçalho e menu antigos', C, 'Uma versão branca anterior, com emojis.', nota='Ninguém os usa.', onde=F + 'components/layout/Header.tsx, Sidebar.tsx', problemas='Têm uma ligação para /app/chat, que não existe.'),
  row('Botão e campo partilhados', C, 'Peças de desenho comuns.', nota='Os ficheiros estão vazios.', onde=F + 'components/ui/Button.tsx, Input.tsx'),
 ]),
 dict(t='Painel', how='A primeira página depois de entrar.', rows=[
  row('Painel', P, 'Desempenho (precisão geral e por tema), Progresso e Hábitos (calendário de 30 dias, sequências).', 'painel.html',
      p='Os dias da semana do calendário estão em inglês e os decimais usam ponto.',
      onde=[F + 'features/dashboard/components/DashboardPage.tsx', 'PerformanceSection.tsx', 'ProgressSection.tsx', 'HabitsSection.tsx', 'TrainingCalendar.tsx', 'StatCard.tsx', 'TopicAccuracyCard.tsx'],
      dados='Função get_dashboard_stats (testes, perguntas de prática e vídeos); dias de treino em user_activity_days, preenchida por gatilhos.',
      problemas=['«Iniciar novo teste» é azul (--info), a única ação principal azul num produto amarelo.', 'Abrir uma sessão de perguntas sem responder já conta como dia de treino.', 'As respostas em vídeo contam como «perguntas respondidas».']),
  row('Pessoa nova', P, 'Os cartões vazios.', 'painel-vazio.html', sub=1, p='Os cartões de tempo mostram um «—» grande em vez da frase prevista.'),
  row('A carregar', E, 'As silhuetas cinzentas.', 'painel-a-carregar.html', sub=1),
  row('Erro', P, 'A faixa vermelha.', 'painel-erro.html', sub=1, p='Não há botão para tentar de novo.'),
 ]),
 dict(t='Aprender', how='Cinco separadores: Teste, Perguntas, Vídeos, Cursos, Recursos.', rows=[
  row('Teste', P, '«Teste de Conhecimento de Arbitragem»: 20 perguntas ao acaso, 40 minutos, e os teus números.', 'aprender.html',
      p='«Testes esta semana» conta também a semana anterior.',
      onde=[F + 'features/learn/components/LearnPage.tsx', 'test/RandomTestLanding.tsx'], dados='test_attempts.',
      problemas=['LearnTabs, TestsTab, QuestionsTab, VideosTab, CourseTab e ResourcesTab não são usados: tudo vive em LearnPage.tsx.'],
      perguntas='O banco de perguntas verdadeiro não está no repositório (foi preenchido à mão). Quantas perguntas há, de que leis, em que língua?'),
  row('Histórico de testes', E, 'Data, certas, tempo e nota de cada teste.', 'aprender-historico.html', sub=1),
  row('A preparar o teste', E, '«A gerar o teu teste...»', 'teste-a-gerar.html', sub=1),
  row('A responder', P, 'Relógio, «Pergunta 1 de 20», quatro opções.', 'teste-pergunta.html', sub=1, p='As perguntas estão em inglês num produto em português.',
      onde=F + 'features/learn/components/test/RandomTestRunner.tsx', dados='get_random_questions; respostas em test_attempt_answers.',
      problemas=['A correção é feita no navegador, que recebe a resposta certa.']),
  row('Resposta escolhida', P, 'A opção fica marcada e bloqueada.', 'teste-respondida.html', sub=1, p='Fica bloqueada ao primeiro toque, sem confirmar.'),
  row('A última pergunta', E, 'Aparece «Submeter teste».', 'teste-ultima.html', sub=1),
  row('Resultado: aprovado', P, '16/20, pontos fortes e áreas a melhorar por tema.', 'teste-resultado.html', sub=1,
      p='Não explica as respostas: não há IA nenhuma no produto.', onde=F + 'features/learn/components/test/RandomTestResults.tsx',
      dados='get_attempt_topic_breakdown.', problemas=['A coluna ai_explanation existe mas nada a escreve.', 'A função de resultados não confirma que a tentativa é de quem pede.']),
  row('Resultado: reprovado com o tempo esgotado', P, '9/20 e «Submetido automaticamente».', 'teste-resultado-baixo.html', sub=1,
      p='Quando o tempo acaba, só conta as perguntas respondidas e grava a duração errada.'),
  row('Perguntas', E, '«Perguntas de prática», sem limite de tempo: rápidas, por lei ou por área.', 'perguntas.html',
      onde=F + 'features/learn/components/questions/QuestionsLanding.tsx', dados='question_sessions, question_practice_answers, question_bank.'),
  row('Escolher leis', P, 'As leis 11 a 14 com nome em português.', 'perguntas-por-lei.html', sub=1, p='Uma pergunta sem lei aparece como «Lei — Law null».',
      onde=F + 'features/learn/components/questions/QuestionsSetup.tsx', problemas=['Leis fora de 11–14 aparecem como «Law N».', 'O botão para começar diz «Iniciar sessão», as mesmas palavras de entrar na conta.']),
  row('Escolher áreas', P, 'As áreas para praticar.', 'perguntas-por-area.html', sub=1, p='Os nomes das áreas aparecem em inglês.'),
  row('A responder', E, 'Relógio, certas até agora, «Terminar sessão».', 'perguntas-sessao.html', sub=1, onde=F + 'features/learn/components/questions/QuestionsSession.tsx'),
  row('Resposta certa', E, 'A opção fica verde.', 'perguntas-certa.html', sub=1),
  row('Resposta errada', E, 'A tua a vermelho, a certa a verde.', 'perguntas-errada.html', sub=1),
  row('Terminar a sessão?', E, 'A janela de confirmação.', 'perguntas-terminar.html', sub=1),
  row('Sessão concluída', E, 'Certas, tempo, precisão, e as respostas para rever.', 'perguntas-revisao.html', sub=1,
      onde=F + 'features/learn/components/questions/QuestionsReview.tsx', problemas='«Voltar» numa sessão sem perguntas salta para um resultado de 0%.'),
  row('Vídeos', P, 'Um lance em vídeo, depois «Que ação deve o árbitro tomar?» e a sanção.', 'videos.html',
      p='Só há um vídeo, e quando não carrega a mensagem é técnica e dirigida à equipa.',
      onde=F + 'features/learn/components/LearnPage.tsx:297-664', dados='video_scenarios, video_attempts; vídeos num endereço Cloudflare R2 escrito no código.',
      problemas=['O contador diz sempre «1 / 1» («Offside Analysis 1»).', 'O nome do ficheiro não bate certo com o R2: o vídeo provavelmente não carrega.'],
      nota='Não vi o vídeo a tocar: o armazenamento dos vídeos está fora do alcance deste ambiente.'),
  row('A escolher a sanção', E, 'Sem cartão, amarelo ou vermelho.', 'videos-sancao.html', sub=1),
  row('Resultado do vídeo', E, '«Parcialmente correta», com a ação e a sanção certas.', 'videos-resultado.html', sub=1),
  row('Sem vídeos', E, '«Ainda não há cenários de vídeo disponíveis.»', 'videos-vazio.html', sub=1),
  row('Cursos', M, 'Só a palavra «Brevemente.»', 'cursos.html', p='Não há cursos.'),
  row('Recursos', M, 'Cinco ficheiros («Leis do Jogo 2024/25»…) com «Transferir».', 'recursos.html', p='Os ficheiros não existem e «Transferir» não faz nada.',
      onde=F + 'features/learn/components/LearnPage.tsx:680-711'),
  row('Testes disponíveis', P, 'Três questionários com «Iniciar teste», pelo menu lateral.', 'testes-lista.html',
      p='São exemplos de programação («React Basics»), e os títulos quase não se veem.', onde=F + 'features/tests/components/TestsList.tsx'),
  row('Abrir um desses testes', P, 'Uma caixa rosa com um erro.', 'teste-endereco.html', p='Os testes da lista não existem: mostra um erro técnico em inglês.',
      onde=F + 'features/learn/components/TestPage.tsx', problemas='O fluxo antigo de testes fixos (9 testes semeados) só é alcançável por aqui.'),
  row('Notícias', C, 'Três artigos de exemplo guardados, sem página para os ler.', onde='backend/supabase/migrations/20260222_0048_news_feature.sql, 0049_seed_news.sql', perguntas='As notícias eram para entrar? Onde?'),
 ]),
 dict(t='Comunidade', how='Um feed de toda a gente, não só de quem segues.', rows=[
  row('Feed', P, 'Filtros por tipo, cartões com gosto, comentários, republicar, guardar e partilhar; o «+» amarelo para publicar.', 'comunidade.html',
      p='Republicar mostra «reposted» em inglês, e guardar não leva a lado nenhum.',
      onde=[F + 'features/social/components/SocialPage.tsx', 'NavigationBar.tsx', 'PostBox.tsx', 'PostHeader.tsx', 'PostBody.tsx', 'PostFooter.tsx', 'RepostBox.tsx', 'NewPostButton.tsx'],
      dados='get_social_feed (20 de cada vez), posts, post_likes, post_saves. Sem tempo real.',
      problemas=['O tempo «now» também está em inglês.', 'Republicações ficam sempre em «Texto».', 'Provável: não carrega mais de 20 publicações (a lista não tem altura fixa).', 'Apagar a original deixa as republicações vazias.']),
  row('A carregar', E, 'As silhuetas.', 'comunidade-a-carregar.html', sub=1),
  row('Ainda sem publicações', E, '«Ainda não há publicações».', 'comunidade-vazia.html', sub=1),
  row('Erro', E, '«Ocorreu um erro ao carregar o feed.» e «Tentar novamente».', 'comunidade-erro.html', sub=1),
  row('Só imagens', E, 'O filtro «Imagem».', 'comunidade-imagens.html', sub=1),
  row('Comentários', P, 'Abrem dentro do cartão, com respostas e @menções a amarelo.', 'comunidade-comentarios.html', sub=1,
      p='Se um comentário falhar, ninguém avisa e o contador sobe na mesma.', onde=F + 'features/social/components/CommentSection.tsx, CommentBox.tsx',
      problemas=['Denunciar um comentário envia logo, sem janela.', 'Apagar não pede confirmação.']),
  row('Mencionar alguém', P, 'Ao escrever «@an» aparece a lista de pessoas.', 'comunidade-mencao.html', sub=1, p='Sem resultados diz «No users found», em inglês.'),
  row('Menu numa publicação de outra pessoa', E, 'Denunciar a publicação, denunciar a pessoa, bloquear.', 'comunidade-menu-outro.html', sub=1, onde=F + 'features/social/components/PostMenu.tsx'),
  row('Menu numa publicação minha', P, '«Eliminar publicação».', 'comunidade-menu-meu.html', sub=1, p='Elimina sem pedir confirmação.'),
  row('Denunciar', P, 'Três motivos e uma caixa para descrever.', 'comunidade-denunciar.html', sub=1, p='Diz «este post» e «este user», e depois de enviar não confirma nada.',
      onde=F + 'features/social/components/ReportDialog.tsx', perguntas='Quem lê as denúncias? Não há ecrã de moderação.'),
  row('Bloquear', E, '«Bloquear @anacosta?»', 'comunidade-bloquear.html', sub=1, onde=F + 'features/social/components/BlockConfirmDialog.tsx'),
  row('Nova publicação', E, 'Texto e um ficheiro: imagem, vídeo ou áudio.', 'comunidade-publicar.html', sub=1, onde=F + 'features/social/components/CreatePostModal.tsx', dados='Storage post-media (50 MB), tabela posts.'),
  row('Publicar sem nada escrito', E, '«Escreve algo ou anexa multimédia.»', 'comunidade-publicar-erro.html', sub=1),
  row('Publicação aberta', P, 'A publicação com os comentários abertos.', 'publicacao.html', p='O título diz «Publicar» em vez de «Publicação».', onde=F + 'features/social/components/PostDetailPage.tsx'),
  row('Publicação que já não existe', E, '«Publicação não encontrada ou já eliminada.»', 'publicacao-inexistente.html', sub=1),
  row('Janela de partilha', C, 'WhatsApp, X, Facebook, Telegram, Email e «Copiar».', nota='Ninguém a usa: «Partilhar» copia a ligação.', onde=F + 'features/social/components/ShareDialog.tsx'),
 ]),
 dict(t='Perfil', how='Pelo último separador da barra de baixo.', rows=[
  row('O meu perfil', P, 'Iniciais ou foto, nome, @utilizador, e as minhas publicações.', 'perfil.html', p='Não mostra nada do treino nem quem me segue.',
      onde=F + 'features/profile/components/ProfilePage.tsx', dados='profiles; get_profile_feed.', problemas='A tabela de perfis não tem biografia, nível nem pontos.'),
  row('Sem publicações', E, 'Só o cartão do perfil.', 'perfil-vazio.html', sub=1),
  row('Editar perfil', E, 'Foto, nome e nome de utilizador, com verificação se está livre.', 'perfil-editar.html', onde=F + 'features/profile/components/EditProfilePage.tsx', dados='Storage profile-media (5 MB), profiles.'),
  row('Perfil de outra pessoa', P, '«Seguir» e «Mensagem», e as publicações dela.', 'perfil-outro.html', p='Seguir pode estar a falhar sempre, e não se vê quem se segue.',
      onde=F + 'features/social/components/PublicProfilePage.tsx', dados='get_public_profile_view, get_public_profile_feed, user_follows.',
      problemas=['O gatilho do aviso «novo seguidor» chama uma função ambígua (create_notification com 5 argumentos): verificar na base real.', '«Try Again» e «Link copied to clipboard» em inglês.']),
  row('Menu do perfil', E, 'Denunciar ou bloquear a pessoa.', 'perfil-outro-menu.html', sub=1, onde=F + 'features/social/components/PublicProfileMenu.tsx'),
  row('Pessoa que bloqueei', E, 'O perfil com «Desbloquear».', 'perfil-outro-bloqueado.html', sub=1),
  row('Pessoa que me bloqueou', E, 'O perfil sem publicações.', 'perfil-outro-bloqueou-te.html', sub=1),
  row('Pessoa que não existe', E, 'O aviso de perfil não encontrado.', 'perfil-outro-inexistente.html', sub=1),
  row('Perfil público antigo', C, 'Uma segunda versão do perfil de outra pessoa.', nota='Ninguém a usa.', onde=F + 'features/profile/components/PublicProfilePage.tsx, api/publicProfilesApi.ts'),
 ]),
 dict(t='Mensagens', how='Pela barra de baixo.', rows=[
  row('Conversas', P, 'Procurar alguém, e cada conversa com a última mensagem e quantas faltam ler.', 'mensagens.html', p='A lista não se atualiza sozinha.',
      onde=F + 'features/messages/components/MessagesPage.tsx, ConversationItem.tsx', dados='get_conversations; search_users.'),
  row('Sem conversas', E, 'A lista vazia.', 'mensagens-vazia.html', sub=1),
  row('Procurar pessoa', E, 'Ao escrever «ru» aparecem as pessoas.', 'mensagens-procurar.html', sub=1, onde=F + 'features/messages/components/UserSearchBar.tsx, UserSearchDropdown.tsx'),
  row('Conversa', P, 'Balões, data e hora, anexar e «Enviar». As mensagens chegam na hora.', 'conversa.html',
      p='Os anexos ficam num sítio público: quem tiver a ligação vê.',
      onde=F + 'features/messages/components/ConversationPage.tsx, MessageBubble.tsx, MessageInput.tsx', dados='get_messages; messages (tempo real); Storage message-media (público).',
      problemas=['Se um envio falhar (a pessoa só aceita mensagens de quem segue), a conversa desaparece até ao envio seguinte e o erro vem em inglês.', 'A hora mostra os segundos.']),
  row('Conversa nova', E, 'Ainda sem mensagens.', 'conversa-vazia.html', sub=1),
  row('A escrever', E, 'A mensagem na caixa, antes de enviar.', 'conversa-a-escrever.html', sub=1),
 ]),
 dict(t='Pesquisa', how='Pela lupa na barra de cima.', rows=[
  row('Pesquisar pessoas', P, 'O campo, as pesquisas recentes e «Limpar tudo».', 'pesquisa.html', p='Só procura pessoas, e as recentes são as de todas as contas do mesmo telemóvel.',
      onde=F + 'features/search/components/SearchPage.tsx, SearchHistory.tsx', dados='search_users; histórico «search_history» no navegador.',
      problemas='SearchInput, SearchHistoryItem, UserListItem, useSearch e searchApi não são usados.'),
  row('Primeira vez', E, 'Sem pesquisas recentes.', 'pesquisa-vazia.html', sub=1),
  row('Resultados', E, 'Ao escrever «ana».', 'pesquisa-resultados.html', sub=1),
  row('Sem resultados', E, 'Nenhuma pessoa encontrada.', 'pesquisa-sem-resultados.html', sub=1),
 ]),
 dict(t='Avisos', how='Pelo sino na barra de cima.', rows=[
  row('Notificações', P, 'Gostos, comentários, menções, novos seguidores, republicações, avisos do plano.', 'notificacoes.html',
      p='«Completa o teu perfil» nunca desaparece, mesmo depois de completo.',
      onde=F + 'features/notifications/components/NotificationsPage.tsx, NotificationBanner.tsx, NotificationBell.tsx', dados='notifications, criadas por gatilhos. Sem tempo real.',
      problemas=['O sino não abre uma lista: leva a esta página.', '«Lembrar mais tarde» e «dispensar» existem no código, sem botão.']),
  row('Sem notificações', E, 'A página vazia.', 'notificacoes-vazia.html', sub=1),
  row('Avisos que nunca chegam', C, 'Nova mensagem, sequências e conteúdo novo.', nota='Têm interruptor nas Definições, mas nada os envia.',
      onde='backend/supabase/migrations/20260213_0035_fresh_rebuild_all.sql', problemas='Os gatilhos de dois deles foram apagados pela migração 0035 e nunca recriados; três nunca tiveram gatilho.'),
  row('Lembrete do fim do plano', P, 'Um aviso automático antes do fim do plano.', p='Avisa quem renova que o plano «vai expirar», e cada aviso só sai uma vez na vida.',
      onde='backend/supabase/migrations/20260213_0023_plan_expiration_reminders.sql', dados='Trabalho pg_cron de hora a hora.'),
 ]),
 dict(t='Conta', how='Pelo menu lateral: Definições e Planos.', rows=[
  row('Definições', P, 'Perfil, conta, 11 interruptores de avisos, quem te pode escrever, bloqueados, aprendizagem, legal.', 'definicoes.html',
      p='5 dos 11 interruptores não fazem nada.', onde=F + 'features/settings/components/SettingsPage.tsx e *Section.tsx',
      dados='get_user_settings_all, notification_preferences, user_settings, get_blocked_users.', problemas='Se gravar uma preferência falhar, nada avisa.'),
  row('Eliminar conta', P, 'Escrever DELETE para confirmar.', 'definicoes-apagar.html', sub=1, p='Cancela logo o plano pago, sem reembolso.',
      onde=[F + 'features/settings/components/ConfirmDialog.tsx', 'backend/supabase/functions/delete-account'], problemas='Deixa o cliente na Stripe; erros em inglês.'),
  row('Limpar o histórico de aprendizagem', E, 'A janela de confirmação.', 'definicoes-limpar.html', sub=1, dados='clear_learning_history.'),
  row('Planos e faturação', P, 'Gratuito, Pro a €4.99 (Recomendado) e Plus a €9.99.', 'planos.html', p='Pagar não muda nada no produto: tudo o que é «premium» é grátis.',
      onde=F + 'features/pricing/components/PricingPage.tsx, PlansSection.tsx', dados='stripe_subscriptions; funções create-checkout-session e create-portal-session.',
      problemas='Preços, «/ month», «Active» e «Past Due» em inglês.', perguntas=['Os planos pagos são para ligar? O PR #22 deixa-os desligados.', 'O que deve ficar só para Pro e Plus?']),
  row('Com o plano Pro', E, 'O plano, o estado, a renovação, cancelar, gerir na Stripe, histórico de compras.', 'planos-pro.html', sub=1,
      onde=F + 'features/pricing/components/SubscriptionCard.tsx, InvoiceHistory.tsx'),
  row('Mudar para Plus', P, 'A janela de confirmação.', 'planos-pro-mudar.html', sub=1, p='Diz que muda no próximo ciclo, mas muda logo.', onde=F + 'features/pricing/components/ChangePlanDialog.tsx'),
  row('Cancelar o plano', E, 'A janela de confirmação.', 'planos-pro-cancelar.html', sub=1, onde=F + 'features/pricing/components/CancelDialog.tsx'),
  row('Cancelamento pendente', P, '«A tua subscrição será cancelada no fim do período».', 'planos-a-cancelar.html', sub=1, p='Não se pode voltar atrás dentro da app.'),
  row('Pagamento falhou', E, 'O aviso vermelho para atualizar o cartão.', 'planos-pagamento-falhou.html', sub=1),
  row('Regresso do pagamento', P, '«A processar a tua subscrição…»', 'planos-checkout-feito.html', sub=1, p='Pode ficar assim até se recarregar a página.'),
  row('Pagar', N, 'A página de pagamento e o portal são da Stripe.', nota='Fora da app; não vi.'),
  row('Janela antiga de eliminar conta', C, 'Uma segunda janela de eliminar conta.', nota='Ninguém a usa.', onde=F + 'features/auth/components/DeleteAccountDialog.tsx'),
  row('Reportar um problema', C, 'Uma janela prevista para reportar problemas.', nota='Está vazia e ninguém a usa.', onde=F + 'features/feedback/components/ReportIssueModal.tsx'),
  row('Assistente', C, 'O «chatbot» do README.', nota='Não há nada: pastas vazias.', onde=F + 'features/chatbot/'),
 ]),
 dict(t='Por trás', how='O que corre no servidor.', rows=[
  row('Funções no servidor', P, 'Oito: pagamento, portal, cancelar, mudar de plano, faturas, avisos da Stripe, apagar conta, sincronizar vídeos.',
      p='Uma delas aceita pedidos de qualquer pessoa.', onde='backend/supabase/functions/*',
      problemas=['sync-video-scenarios não verifica quem a chama e escreve com a chave de serviço.', 'Não há config.toml: não se sabe como estão publicadas.']),
  row('Base de dados', P, '49 migrações e 38 tabelas.', p='Qualquer pessoa pode tornar-se administradora e ler o email de toda a gente.', onde='backend/supabase/migrations',
      problemas=['A regra de atualização do perfil não limita colunas (role).', 'A migração 0019 deixa ler todas as colunas dos perfis.', 'A migração 0047 falha numa base nova.', 'Tabelas antigas de faturação sem uso.', 'A pasta supabase/.temp está no repositório.'],
      perguntas='As migrações aplicadas na base real são estas? Não vi a base.'),
 ]),
]

ASOF = '19 nov 2026'
FOOT = ('Feito a ' + ASOF + ' a partir do ramo main (último código a 24 fev 2026), revisto depois da revisão 1. Cada ecrã é a app '
        'verdadeira com uma base de dados de exemplo: pessoas, publicações, mensagens e números são inventados; as perguntas e o '
        'vídeo são os do próprio RefLab. Não vi o site ao vivo.')

def js(v):
    return json.dumps(v, ensure_ascii=False, indent=1).replace('</', '<\\/')

s = open(S + 'index-modelo.html').read()
a = s.index('/*MAPA*/') + 8; b = s.index('/*FIM*/'); s = s[:a] + js(MAP) + s[b:]
a = s.index('/*RODAPE*/') + 10; b = s.index('/*FIMRODAPE*/'); s = s[:a] + json.dumps(FOOT, ensure_ascii=False) + s[b:]
open(OUT + 'index.html', 'w').write(s)
json.dump(MAP, open(S + 'mapa.json', 'w'), ensure_ascii=False, indent=1)
from collections import Counter
rows = [r for sec in MAP for r in sec['rows']]
print(Counter(r['tag'] for r in rows), len(rows), 'rows,', sum(1 for r in rows if r.get('u')), 'with a screen')
us = [r['u'] for r in rows if r.get('u')]
print('duplicate screens:', [u for u, n in Counter(us).items() if n > 1])
missing = [u for u in us if not os.path.exists(OUT + u.split('#')[0])]
print('missing pages:', missing)
unused = [f for f in os.listdir(OUT) if f.endswith('.html') and f not in us and f != 'index.html' and not f.startswith('super-maquete')]
print('unused pages:', unused)
import re
bad = [(r['t'], x) for r in rows for x in [r.get('d', ''), r.get('p', ''), r.get('nota', '')] if re.search(r'[a-z]/[a-z]|_|\.tsx?|\.sql|\bRLS\b|\bRPC\b', x)]
print('developer words in visible lines:', bad)

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
    else if (/^(inicio|entrar|planos-inicio)/.test(here)) { var b2 = t.closest('button'); var k2 = b2 && b2.textContent.trim(); if (k2 === 'Criar conta' && !b2.closest('form')) to = 'criar-conta.html'; else if (k2 === 'Esqueceste-te da palavra-passe?') to = 'esqueci.html'; }
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
