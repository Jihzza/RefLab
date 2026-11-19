# RefLab: a super maquete do que existe hoje

> 19 nov 2026. Só leitura e desenho: nenhum código da aplicação foi mudado, nada foi publicado, nenhum segredo foi aberto,
> nada custou dinheiro.

**Abrir:** `design/super-maquete/index.html` (mapa à esquerda, a app à direita, com botão Telemóvel/Computador) ou, no
telemóvel, o ficheiro único `design/super-maquete/super-maquete-reflab.html` (3 MB, funciona sem internet, só as letras
vêm do Google).

## Em resumo

- O RefLab de hoje é o ramo `main`: último código a **24 fev 2026**. É uma app web (telemóvel primeiro) para árbitros:
  **Painel**, **Aprender** (teste de 20 perguntas, perguntas de prática, vídeos de decisão), **Comunidade** (feed, comentários,
  perfis, seguir, bloquear), **Mensagens** em tempo real, **Avisos**, **Definições** e **Planos** pagos com a Stripe.
- **113 partes** no mapa: 63 «Existe», 35 «Existe, com problemas», 2 «A meio», 9 «Só no código», 4 «Não consegui ver».
- O que funciona bem: entrar e criar conta, o teste aleatório com resultado por tema, as perguntas de prática, o feed,
  as mensagens, as definições. Quase tudo está em português.
- O que não está: **nada muda com o plano pago** (o «premium» é grátis); **não há IA** (nem explicações, nem chatbot);
  **Cursos** e **Recursos** são de enfeite; **«Testes»** no menu mostra 3 questionários de programação de exemplo;
  só há **um vídeo**; as **Notícias** existem na base de dados sem ecrã; o perfil não mostra nada do treino.
- **Riscos sérios na base de dados** (ver «Segurança» abaixo): qualquer pessoa pode tornar-se administradora; toda a gente
  com conta lê o email de toda a gente; os anexos das mensagens são públicos; uma função de servidor aceita chamadas de qualquer um.

## Como foi feito, e o que não vi

- **Cada ecrã é a app verdadeira.** Corri o código de `main` nesta máquina com uma base de dados falsa que responde com
  dados de exemplo, e fotografei cada estado com o HTML e o CSS que a app desenha. Por isso as palavras, a ordem e as cores
  são as reais, incluindo os erros (inglês no meio do português, títulos invisíveis, etc.). Pessoas, publicações, mensagens e
  números são de exemplo; as perguntas, os testes e o vídeo são os das migrações do próprio RefLab.
  Como refazer: `design/super-maquete/ferramentas/LEIA-ME.md`.
- **Não vi o site ao vivo** (`reflab.netlify.app`): a rede deste ambiente bloqueia-o. Também não vi a base de dados real,
  o painel do Supabase, os emails, a Stripe nem os vídeos no Cloudflare R2. Onde isso importa, a linha diz «Não consegui ver».
- Verifiquei com capturas a 390 px (telemóvel) e 1280 px (computador). Não verifiquei com leitor de ecrã nem em Safari real.
- O que o meu simulador **não** mostra: tempo real (mensagens a chegar), envio de ficheiros, a passagem pela Stripe.

## Inventário

Cada linha tem no mapa a ficha «O que se sabe»: ficheiros, dados que lê e escreve, problemas e perguntas.
As imagens estão em `design/super-maquete/imagens/`.

| Secção | Parte | Etiqueta | Ecrã | Problemas conhecidos |
|---|---|---|---|---|
| Entrada | Página inicial | Existe, com problemas | [inicio.html](../design/super-maquete/imagens/inicio.jpg) | Os botões dos planos («Começar», «Subscrever») levam a /app/pricing, que manda quem não entrou de volta a esta página: não fazem nada à vista. · Os planos prometem coisas que não existem (fórum, newsletter, feedback com IA). · Preços em formato inglês («€4.99»); no plano grátis, «Gratuito» aparece como título e como preço. · O separador do navegador diz «reflab», com o ícone do Vite e lang="en". |
| Entrada | ↳ Iniciar sessão | Existe | [inicio.html](../design/super-maquete/imagens/inicio.jpg) | O cartão do login tem título e moldura; o de criar conta e o de recuperar não têm: as três vistas parecem de produtos diferentes. · Erros do servidor que não estão mapeados aparecem em inglês. |
| Entrada | ↳ Campos em falta | Existe | [entrar-erros.html](../design/super-maquete/imagens/entrar-erros.jpg) |  |
| Entrada | ↳ Email ou palavra-passe errados | Existe | [entrar-errado.html](../design/super-maquete/imagens/entrar-errado.jpg) |  |
| Entrada | Criar conta | Existe | [criar-conta.html](../design/super-maquete/imagens/criar-conta.jpg) | Não há escolha de nome de utilizador nem boas-vindas: a pessoa cai no Painel com um nome inventado. · Não há link para Termos e Privacidade no registo. |
| Entrada | ↳ Erros ao criar conta | Existe | [criar-conta-erros.html](../design/super-maquete/imagens/criar-conta-erros.jpg) |  |
| Entrada | ↳ Conta criada: verifica o email | Existe | [criar-conta-feito.html](../design/super-maquete/imagens/criar-conta-feito.jpg) |  |
| Entrada | Esqueci-me da palavra-passe | Existe | [esqueci.html](../design/super-maquete/imagens/esqueci.jpg) | Os erros do servidor aparecem em inglês, crus (não passam pelo tradutor de erros). |
| Entrada | ↳ Ligação enviada | Existe | [esqueci-enviado.html](../design/super-maquete/imagens/esqueci-enviado.jpg) |  |
| Entrada | Definir nova palavra-passe | Existe, com problemas | [nova-passe.html](../design/super-maquete/imagens/nova-passe.jpg) | Não confirma que se chegou pela ligação do email: qualquer pessoa com sessão aberta pode mudar a palavra-passe aqui sem saber a antiga. |
| Entrada | ↳ Erros | Existe | [nova-passe-erros.html](../design/super-maquete/imagens/nova-passe-erros.jpg) |  |
| Entrada | ↳ Palavra-passe atualizada | Existe | [nova-passe-feita.html](../design/super-maquete/imagens/nova-passe-feita.jpg) |  |
| Entrada | ↳ Sem sessão de recuperação | Existe, com problemas | [nova-passe-invalida.html](../design/super-maquete/imagens/nova-passe-invalida.jpg) |  |
| Entrada | A entrar (regresso do Google ou do email) | Existe | [regresso.html](../design/super-maquete/imagens/regresso.jpg) | Uma ligação de confirmação aberta noutro aparelho deve dar «A autenticação falhou…» (o método PKCE exige o mesmo navegador). |
| Entrada | Falhou a entrada | Não consegui ver | — | Não consegui provocar este estado com a base de dados falsa: a captura fica presa em «A iniciar sessão...». Descrito a partir do código. |
| Entrada | Aviso de cookies | Existe, com problemas | [inicio-cookies.html](../design/super-maquete/imagens/inicio-cookies.jpg) | Nada lê a escolha: aceitar ou recusar não muda nada. · Dentro da app tapa a barra de baixo até se responder. · A política de cookies promete gerir preferências, o que não existe. |
| Entrada | ↳ Dentro da app | Existe, com problemas | [cookies-na-app.html](../design/super-maquete/imagens/cookies-na-app.jpg) |  |
| Entrada | Páginas legais: Privacidade | Existe | [legal-privacidade.html](../design/super-maquete/imagens/legal-privacidade.jpg) | Os separadores não mudam o endereço. · O email de contacto não é uma ligação. |
| Entrada | ↳ Termos de Serviço | Existe | [legal-termos.html](../design/super-maquete/imagens/legal-termos.jpg) |  |
| Entrada | ↳ Política de Cookies | Existe | [legal-cookies.html](../design/super-maquete/imagens/legal-cookies.jpg) |  |
| Entrada | Emails | Não consegui ver | — | Os modelos, o remetente e a língua estão no painel do Supabase, não no repositório. Não os vi. |
| Estrutura da app | A carregar a sessão | Existe | [a-carregar.html](../design/super-maquete/imagens/a-carregar.jpg) |  |
| Estrutura da app | Barra de cima | Existe | [painel.html](../design/super-maquete/imagens/painel.jpg) | Os ícones são desenhos com «role=button» sem foco de teclado: não se usam com teclado. · O número do sino só atualiza quando se muda de página. |
| Estrutura da app | Menu lateral | Existe, com problemas | [menu.html](../design/super-maquete/imagens/menu.jpg) | Não marca a página onde se está. · O nome vem da conta, não do perfil: quem entrou com email vê o email duas vezes. · É a única porta para «Testes», «Pesquisar», «Notificações», «Planos» e «Definições». |
| Estrutura da app | Barra de baixo | Existe | [painel.html](../design/super-maquete/imagens/painel.jpg) | Em /app (sem /dashboard) «Painel» não fica aceso. |
| Estrutura da app | Página que não existe | Existe, com problemas | [pagina-inexistente.html](../design/super-maquete/imagens/pagina-inexistente.jpg) | Não há página 404. |
| Estrutura da app | Sessão expirada | Não consegui ver | — | O texto está a cinzento escuro sobre fundo escuro: quase ilegível. · Não tem botão para fechar. · Não consegui provocá-la nas capturas. Descrita a partir do código. |
| Estrutura da app | Cabeçalho e menu antigos | Só no código | — | Nenhum ficheiro os usa. |
| Estrutura da app | Botão e campo partilhados | Só no código | — | Ficheiros vazios. |
| Painel | Painel | Existe | [painel.html](../design/super-maquete/imagens/painel.jpg) | As letras do calendário estão em inglês («S M T W T F S»). · Os decimais usam ponto («72.5%»). · «Iniciar novo teste» é azul (--info), a única ação principal azul num produto amarelo. · Abrir uma sessão de perguntas sem responder já conta como dia de treino. · As respostas em vídeo contam como «perguntas respondidas». |
| Painel | ↳ Sem dados (pessoa nova) | Existe, com problemas | [painel-vazio.html](../design/super-maquete/imagens/painel-vazio.jpg) | Os cartões de tempo mostram «—» grande em vez da frase prevista para o vazio. |
| Painel | ↳ A carregar | Existe | [painel-a-carregar.html](../design/super-maquete/imagens/painel-a-carregar.jpg) |  |
| Painel | ↳ Erro | Existe, com problemas | [painel-erro.html](../design/super-maquete/imagens/painel-erro.jpg) |  |
| Aprender | Teste (início) | Existe | [aprender.html](../design/super-maquete/imagens/aprender.jpg) | «Testes esta semana» conta desde a segunda-feira da semana anterior. · Os ficheiros LearnTabs, TestsTab, QuestionsTab, VideosTab, CourseTab e ResourcesTab não são usados: tudo vive em LearnPage.tsx. |
| Aprender | ↳ Histórico de testes | Existe | [aprender-historico.html](../design/super-maquete/imagens/aprender-historico.jpg) |  |
| Aprender | ↳ A gerar o teste | Existe | [teste-a-gerar.html](../design/super-maquete/imagens/teste-a-gerar.jpg) |  |
| Aprender | ↳ A responder | Existe | [teste-pergunta.html](../design/super-maquete/imagens/teste-pergunta.jpg) | A resposta fica bloqueada ao primeiro toque, sem confirmar. · As perguntas estão em inglês (vêm da base de dados). · A correção é feita no navegador, que recebe a resposta certa: vê-se no tráfego da página. |
| Aprender | ↳ Resposta bloqueada | Existe | [teste-respondida.html](../design/super-maquete/imagens/teste-respondida.jpg) |  |
| Aprender | ↳ Última pergunta: «Submeter teste» | Existe | [teste-ultima.html](../design/super-maquete/imagens/teste-ultima.jpg) |  |
| Aprender | ↳ Resultado (aprovado) | Existe | [teste-resultado.html](../design/super-maquete/imagens/teste-resultado.jpg) | Não há explicação das respostas: a coluna ai_explanation existe mas nada a escreve ou lê; não há IA no produto. · A função de resultados não confirma que a tentativa é de quem pede. |
| Aprender | ↳ Resultado (reprovado, tempo esgotado) | Existe, com problemas | [teste-resultado-baixo.html](../design/super-maquete/imagens/teste-resultado-baixo.jpg) | Quando o tempo acaba, grava quase zero segundos de duração e só conta as perguntas respondidas. |
| Aprender | Perguntas (início) | Existe | [perguntas.html](../design/super-maquete/imagens/perguntas.jpg) |  |
| Aprender | ↳ Escolher leis | Existe, com problemas | [perguntas-por-lei.html](../design/super-maquete/imagens/perguntas-por-lei.jpg) | Leis fora de 11–14 aparecem como «Law N» em inglês; uma pergunta sem lei aparece como «Lei — Law null» (como se vê aqui). |
| Aprender | ↳ Escolher áreas | Existe, com problemas | [perguntas-por-area.html](../design/super-maquete/imagens/perguntas-por-area.jpg) |  |
| Aprender | ↳ A responder | Existe | [perguntas-sessao.html](../design/super-maquete/imagens/perguntas-sessao.jpg) |  |
| Aprender | ↳ Resposta certa | Existe | [perguntas-certa.html](../design/super-maquete/imagens/perguntas-certa.jpg) |  |
| Aprender | ↳ Resposta errada | Existe | [perguntas-errada.html](../design/super-maquete/imagens/perguntas-errada.jpg) |  |
| Aprender | ↳ Terminar sessão? | Existe | [perguntas-terminar.html](../design/super-maquete/imagens/perguntas-terminar.jpg) |  |
| Aprender | ↳ Sessão concluída | Existe | [perguntas-revisao.html](../design/super-maquete/imagens/perguntas-revisao.jpg) | «Voltar» numa sessão sem perguntas salta para um resultado de 0%. |
| Aprender | Vídeos | Existe, com problemas | [videos.html](../design/super-maquete/imagens/videos.jpg) | Só há um cenário ativo («Offside Analysis 1»): o contador diz sempre «1 / 1». · Quando o vídeo falha, a mensagem fala a quem usa a app de um «bucket learn-videos no Supabase Storage». · O nome do ficheiro não bate certo com a forma como o R2 guarda os clips: o vídeo provavelmente não carrega. |
| Aprender | ↳ A escolher a sanção | Existe | [videos-sancao.html](../design/super-maquete/imagens/videos-sancao.jpg) |  |
| Aprender | ↳ Resultado do vídeo | Existe | [videos-resultado.html](../design/super-maquete/imagens/videos-resultado.jpg) |  |
| Aprender | ↳ Sem vídeos | Existe | [videos-vazio.html](../design/super-maquete/imagens/videos-vazio.jpg) |  |
| Aprender | Cursos | A meio | [cursos.html](../design/super-maquete/imagens/cursos.jpg) |  |
| Aprender | Recursos | A meio | [recursos.html](../design/super-maquete/imagens/recursos.jpg) |  |
| Aprender | Testes disponíveis | Existe, com problemas | [testes-lista.html](../design/super-maquete/imagens/testes-lista.jpg) | Lista escrita no código, nada a ver com arbitragem. · Os títulos estão escuros sobre fundo escuro: quase invisíveis. · Chega-se aqui pelo menu «Testes» e pelos avisos de conteúdo novo. |
| Aprender | Teste por endereço | Existe, com problemas | [teste-endereco.html](../design/super-maquete/imagens/teste-endereco.jpg) | A caixa de erro é rosa-clara, de outro desenho, com a mensagem crua em inglês. · O fluxo antigo de testes fixos (9 testes semeados) só é alcançável por aqui, na prática nunca. |
| Aprender | Notícias | Só no código | — |  |
| Comunidade | Feed | Existe, com problemas | [comunidade.html](../design/super-maquete/imagens/comunidade.jpg) | «João Silva reposted» e o tempo «now» estão em inglês. · Guardar só sobe um contador: não há página de guardados. · Republicações ficam sempre em «Texto», mesmo de uma imagem. · Provável: a página não carrega mais de 20 publicações (a área com scroll não tem altura fixa). · Apagar a original deixa as republicações como cartões vazios. |
| Comunidade | ↳ A carregar | Existe | [comunidade-a-carregar.html](../design/super-maquete/imagens/comunidade-a-carregar.jpg) |  |
| Comunidade | ↳ Vazio | Existe | [comunidade-vazia.html](../design/super-maquete/imagens/comunidade-vazia.jpg) |  |
| Comunidade | ↳ Erro | Existe | [comunidade-erro.html](../design/super-maquete/imagens/comunidade-erro.jpg) |  |
| Comunidade | ↳ Só imagens | Existe | [comunidade-imagens.html](../design/super-maquete/imagens/comunidade-imagens.jpg) |  |
| Comunidade | ↳ Comentários | Existe, com problemas | [comunidade-comentarios.html](../design/super-maquete/imagens/comunidade-comentarios.jpg) | Um erro ao comentar não aparece, e o contador sobe na mesma. · Denunciar um comentário envia logo, sem janela nem aviso. · Apagar não pede confirmação. |
| Comunidade | ↳ Mencionar alguém (@) | Existe, com problemas | [comunidade-mencao.html](../design/super-maquete/imagens/comunidade-mencao.jpg) | Sem resultados diz «No users found», em inglês. |
| Comunidade | ↳ Menu de uma publicação de outra pessoa | Existe | [comunidade-menu-outro.html](../design/super-maquete/imagens/comunidade-menu-outro.jpg) |  |
| Comunidade | ↳ Menu de uma publicação minha | Existe, com problemas | [comunidade-menu-meu.html](../design/super-maquete/imagens/comunidade-menu-meu.jpg) |  |
| Comunidade | ↳ Denunciar | Existe, com problemas | [comunidade-denunciar.html](../design/super-maquete/imagens/comunidade-denunciar.jpg) | «Porque estás a denunciar este post?» / «este user?»: mistura de inglês. · No feed, depois de enviar, não aparece confirmação nenhuma. |
| Comunidade | ↳ Bloquear | Existe | [comunidade-bloquear.html](../design/super-maquete/imagens/comunidade-bloquear.jpg) |  |
| Comunidade | ↳ Nova publicação | Existe | [comunidade-publicar.html](../design/super-maquete/imagens/comunidade-publicar.jpg) |  |
| Comunidade | ↳ Publicar vazio | Existe | [comunidade-publicar-erro.html](../design/super-maquete/imagens/comunidade-publicar-erro.jpg) |  |
| Comunidade | Partilhar (janela) | Só no código | — | Nenhum ficheiro a usa: «Partilhar» usa a partilha do telemóvel ou copia a ligação. |
| Comunidade | Publicação aberta | Existe, com problemas | [publicacao.html](../design/super-maquete/imagens/publicacao.jpg) | O título diz «Publicar» (o verbo) em vez de «Publicação». |
| Comunidade | ↳ Publicação que não existe | Existe | [publicacao-inexistente.html](../design/super-maquete/imagens/publicacao-inexistente.jpg) |  |
| Perfil | O meu perfil | Existe, com problemas | [perfil.html](../design/super-maquete/imagens/perfil.jpg) | Não mostra seguidores, a seguir, nível nem nada do treino: o perfil não liga ao Aprender. · A tabela de perfis não tem biografia, XP nem nível. |
| Perfil | ↳ Sem publicações | Existe | [perfil-vazio.html](../design/super-maquete/imagens/perfil-vazio.jpg) |  |
| Perfil | Editar perfil | Existe | [perfil-editar.html](../design/super-maquete/imagens/perfil-editar.jpg) |  |
| Perfil | Perfil de outra pessoa | Existe, com problemas | [perfil-outro.html](../design/super-maquete/imagens/perfil-outro.jpg) | Seguir pode falhar sempre: o gatilho do aviso «novo seguidor» chama uma função que ficou ambígua (verificar na base de dados real). · Seguir não se vê em lado nenhum: não há contagens nem listas. · «Try Again» e «Link copied to clipboard» em inglês. |
| Perfil | ↳ Menu do perfil | Existe | [perfil-outro-menu.html](../design/super-maquete/imagens/perfil-outro-menu.jpg) |  |
| Perfil | ↳ Bloqueado por mim | Existe | [perfil-outro-bloqueado.html](../design/super-maquete/imagens/perfil-outro-bloqueado.jpg) |  |
| Perfil | ↳ Bloqueou-me | Existe | [perfil-outro-bloqueou-te.html](../design/super-maquete/imagens/perfil-outro-bloqueou-te.jpg) |  |
| Perfil | ↳ Utilizador que não existe | Existe | [perfil-outro-inexistente.html](../design/super-maquete/imagens/perfil-outro-inexistente.jpg) |  |
| Perfil | Perfil público antigo | Só no código | — | Uma segunda versão, não usada. |
| Mensagens | Conversas | Existe, com problemas | [mensagens.html](../design/super-maquete/imagens/mensagens.jpg) | A lista não se atualiza sozinha. · O número na barra de baixo só muda quando se muda de página. |
| Mensagens | ↳ Sem conversas | Existe | [mensagens-vazia.html](../design/super-maquete/imagens/mensagens-vazia.jpg) |  |
| Mensagens | ↳ Procurar pessoa para conversar | Existe | [mensagens-procurar.html](../design/super-maquete/imagens/mensagens-procurar.jpg) |  |
| Mensagens | Conversa | Existe, com problemas | [conversa.html](../design/super-maquete/imagens/conversa.jpg) | Os anexos ficam num local público: quem tiver a ligação vê. · Se um envio falha (por ex. a pessoa só aceita mensagens de quem segue), a conversa desaparece até ao envio seguinte, e o erro vem em inglês. · A hora mostra os segundos («09:21:08 19-11-2026»). |
| Mensagens | ↳ Conversa vazia | Existe | [conversa-vazia.html](../design/super-maquete/imagens/conversa-vazia.jpg) |  |
| Mensagens | ↳ A escrever | Existe | [conversa-a-escrever.html](../design/super-maquete/imagens/conversa-a-escrever.jpg) |  |
| Pesquisa | Pesquisar pessoas | Existe, com problemas | [pesquisa.html](../design/super-maquete/imagens/pesquisa.jpg) | O histórico é partilhado por todas as contas no mesmo navegador. · Só procura pessoas, não publicações nem perguntas. · Vários ficheiros da pesquisa não são usados (SearchInput, SearchHistoryItem, UserListItem, useSearch, searchApi). |
| Pesquisa | ↳ Sem histórico | Existe | [pesquisa-vazia.html](../design/super-maquete/imagens/pesquisa-vazia.jpg) |  |
| Pesquisa | ↳ Resultados | Existe | [pesquisa-resultados.html](../design/super-maquete/imagens/pesquisa-resultados.jpg) |  |
| Pesquisa | ↳ Sem resultados | Existe | [pesquisa-sem-resultados.html](../design/super-maquete/imagens/pesquisa-sem-resultados.jpg) |  |
| Avisos | Notificações | Existe, com problemas | [notificacoes.html](../design/super-maquete/imagens/notificacoes.jpg) | O sino não abre uma lista: leva a esta página. · «Completa o teu perfil» nunca desaparece, mesmo depois de completo. · «Lembrar mais tarde» e «dispensar» existem no código, sem botão. |
| Avisos | ↳ Sem notificações | Existe | [notificacoes-vazia.html](../design/super-maquete/imagens/notificacoes-vazia.jpg) |  |
| Avisos | Avisos que nunca chegam | Só no código | — | Têm interruptor nas Definições mas nada os cria: os gatilhos de dois deles foram apagados pela migração 0035 e nunca recriados. |
| Avisos | Lembrete de fim de plano | Existe, com problemas | — | Avisa toda a gente que renova que o plano «vai expirar». · Cada um dos três avisos só é enviado uma vez na vida de cada pessoa. |
| Conta | Definições | Existe, com problemas | [definicoes.html](../design/super-maquete/imagens/definicoes.jpg) | 5 dos 11 interruptores não fazem nada (os avisos não existem). · Se gravar uma preferência falhar, nada avisa; a escolha falhada fica à vista. |
| Conta | ↳ Eliminar conta | Existe | [definicoes-apagar.html](../design/super-maquete/imagens/definicoes-apagar.jpg) | Cancela logo a assinatura Stripe, sem reembolso, e deixa o cliente na Stripe. · Erros da função aparecem em inglês. |
| Conta | ↳ Limpar histórico de aprendizagem | Existe | [definicoes-limpar.html](../design/super-maquete/imagens/definicoes-limpar.jpg) |  |
| Conta | Eliminar conta (janela antiga) | Só no código | — | Não usada: as Definições têm a sua. |
| Conta | Planos e faturação (grátis) | Existe, com problemas | [planos.html](../design/super-maquete/imagens/planos.jpg) | Nada no produto muda com o plano: tudo o que é «premium» é grátis. · Os preços, «/ month», «Active», «Past Due» estão em inglês. |
| Conta | ↳ Com Pro | Existe | [planos-pro.html](../design/super-maquete/imagens/planos-pro.jpg) |  |
| Conta | ↳ Mudar para Plus | Existe, com problemas | [planos-pro-mudar.html](../design/super-maquete/imagens/planos-pro-mudar.jpg) | Diz que muda no próximo ciclo; na Stripe muda logo, sem acerto de preço. |
| Conta | ↳ Cancelar | Existe | [planos-pro-cancelar.html](../design/super-maquete/imagens/planos-pro-cancelar.jpg) |  |
| Conta | ↳ Cancelamento pendente | Existe, com problemas | [planos-a-cancelar.html](../design/super-maquete/imagens/planos-a-cancelar.jpg) | Não há forma de voltar atrás dentro da app: só pela Stripe. |
| Conta | ↳ Pagamento falhou | Existe | [planos-pagamento-falhou.html](../design/super-maquete/imagens/planos-pagamento-falhou.jpg) |  |
| Conta | ↳ Regresso da Stripe | Existe, com problemas | [planos-checkout-feito.html](../design/super-maquete/imagens/planos-checkout-feito.jpg) | A verificação automática nunca corre: a faixa pode ficar até se recarregar a página. |
| Conta | Pagar na Stripe | Não consegui ver | — | Fora da app; não vi. |
| Conta | Reportar um problema | Só no código | — | O componente devolve nada e ninguém o usa. |
| Conta | Assistente (chatbot) | Só no código | — | Pastas vazias. O README chama-lhe «básico», mas não há nada. |
| Por trás | Funções no servidor | Existe, com problemas | — | «sync-video-scenarios» não verifica quem a chama e escreve com a chave de serviço; procura um armazenamento que já não se usa. · Não há config.toml: não se sabe como estão publicadas. |
| Por trás | Base de dados | Existe, com problemas | — | Qualquer pessoa pode mudar o seu próprio papel para «admin». · Qualquer pessoa com sessão lê o email e o papel de toda a gente. · A migração 0047 falha numa base nova (copia colunas que nunca existiram). · Tabelas antigas de faturação continuam lá sem uso. · A pasta supabase/.temp (ligação ao projeto) está no repositório. |
## Como está montado (nomes apenas)

| Peça | O quê |
|---|---|
| App web | React 19 + TypeScript + Vite 7 + Tailwind 4, em `apps/frontend`. Ícones Lucide, letra Inter. Só tema escuro: azul-marinho `#14192c`, amarelo `#f6c21c`. |
| Língua | i18next, forçado a `pt-PT` (`src/i18n/pt-PT.ts`, cerca de 720 frases); onde falta tradução aparece o inglês. |
| Alojamento | Netlify (`netlify.toml`): constrói `apps/frontend` e publica `dist`. |
| Contas | Supabase Auth: email + palavra-passe e Google. Emails do Supabase (confirmar registo, redefinir palavra-passe). |
| Base de dados | Supabase Postgres, 49 migrações em `backend/supabase/migrations`, 38 tabelas, regras por linha (RLS), gatilhos que criam os avisos, um trabalho de hora a hora (`pg_cron`) para os lembretes do plano. |
| Ficheiros | Supabase Storage, públicos: `post-media` e `message-media` (50 MB), `profile-media` (5 MB). |
| Tempo real | Só as mensagens. |
| Vídeos | Cloudflare R2, endereço escrito no código (`features/learn/api/testsApi.ts:287`). |
| Pagamentos | Stripe (Checkout, portal, faturas) por 8 funções no servidor do Supabase (`backend/supabase/functions`). Pro €4.99/mês, Plus €9.99/mês. |
| Variáveis (só nomes) | App: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Servidor: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLAN_PRO_PRICE_ID` / `STRIPE_PRICE_PRO`, `PLAN_PLUS_PRICE_ID` / `STRIPE_PRICE_PLUS`, `SITE_URL`. Script de vídeos: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. |
| Testes automáticos | Nenhum. |
| O que custa dinheiro | Supabase, Netlify, Cloudflare R2, comissões Stripe. |

## Segurança (para resolver antes de abrir ao público)

1. Qualquer pessoa pode mudar o seu próprio `role` para `admin` (a regra de atualização do perfil não limita colunas).
2. Qualquer pessoa com sessão lê todas as colunas de todos os perfis, incluindo **email** e papel (migração 0019).
3. Os anexos das mensagens privadas ficam num armazenamento **público**.
4. A função `sync-video-scenarios` não verifica quem a chama e escreve com a chave de serviço.
5. As funções de feed, comentários e publicação não confirmam quem pede; os comentários ignoram bloqueios.
6. O teste corrige-se no navegador, que recebe as respostas certas.
7. `/reset-password` deixa mudar a palavra-passe a quem já tem sessão, sem pedir a antiga.
8. A pasta `backend/supabase/supabase/.temp` (ligação ao projeto Supabase) está no repositório. Não a abri.
9. Segundo o PR #22, a palavra-passe da base de dados e o segredo do Google OAuth ficaram expostos durante um diagnóstico.

## O que está por acabar

- **Planos pagos sem efeito:** nada no produto verifica o plano.
- **IA:** prometida na página inicial e nos planos; não existe (a coluna `ai_explanation` nunca é usada; o chatbot são pastas vazias).
- **Cursos** («Brevemente.»), **Recursos** (lista falsa), **Testes** (lista de exemplo de programação), **Notícias** (sem ecrã).
- **Vídeos:** um só cenário ativo; o carregamento provavelmente falha (o nome do ficheiro não bate com o R2).
- **Banco de perguntas real** não está no repositório; a migração 0047 falha numa base nova.
- **Avisos:** 5 dos 11 tipos nunca são criados; os lembretes do plano avisam quem renova e só uma vez na vida.
- **Seguir:** pode falhar sempre por uma função ambígua na base de dados (verificar na base real); e não se vê em lado nenhum.
- **Guardar** publicações sem página de guardados; **denúncias** sem ninguém que as leia.
- **Onboarding:** não existe; a pessoa nova fica com um nome aleatório e um aviso que nunca desaparece.
- **Sem página 404**, sem testes automáticos, `index.html` com título «reflab» e ícone do Vite.

## Fora de `main`: trabalho à espera

- [Jihzza/RefLab#22](https://github.com/Jihzza/RefLab/pull/22) (rascunho, jul 2026): redesign completo «Match Control» +
  preparação do lançamento (segurança, limites antiabuso, CAPTCHA, palavra-passe mais forte). 221 ficheiros. O próprio PR diz
  «não fazer merge, deploy ou migrações enquanto o preflight estiver NO-GO» e lista bloqueios: textos legais, backups,
  SMTP próprio, CAPTCHA, Google OAuth, troca de segredos, moderação.
- [Jihzza/RefLab#21](https://github.com/Jihzza/RefLab/pull/21): versão anterior do mesmo redesign, fechada sem merge.
- Ramo `production-readiness-hardening` (jul 2026, sem PR): outro redesign («Referee's Console») e gamificação
  («A Carreira do Árbitro», XP por decisões em vídeo, conquistas).
- 11 PRs abertos do Dependabot (atualizações de bibliotecas).
- Repositórios irmãos `Jihzza/reflab-old`, `Jihzza/reflab-oli`, `Olivv14/reflab-oli`, `Jihzza/RefLab-Tests`: parados desde
  fev 2026, mais antigos do que `main`; não os usei.
- Os documentos `docs/GUI.md`, `PRODUCT_SPEC.md`, `RESEARCH_2026-04-17.md` e `VISUAL_SPEC.md` (abr 2026) foram escritos a
  partir da lista de ficheiros e têm erros (ex.: «chatbot básico», «explicações em cache»). `docs/Authentication Flow
  Documentation.txt` descreve um desenho planeado que não corresponde ao código. Esta maquete substitui-os como retrato do que existe.

## Perguntas só para o Daniel

1. **Segredos expostos:** o PR #22 diz que a palavra-passe da base de dados e o segredo do Google OAuth ficaram expostos. Já foram trocados?
2. **Que direção vale?** O «Match Control» (PR #22), o «Referee's Console» (ramo `production-readiness-hardening`), ou partimos desta maquete?
3. **Planos pagos:** são para ligar? O que deve ficar só para Pro e Plus? (Hoje tudo é grátis e os planos prometem IA, fórum e newsletter que não existem.)
4. **Banco de perguntas:** onde está a versão verdadeira (quantas perguntas, que leis, em que língua)? As perguntas aparecem em inglês num produto em português.
5. **Vídeos:** quantos cenários há no R2 e quem os classifica (ação certa, sanção certa)?
6. **Comunidade e mensagens:** são para manter no lançamento? Quem modera as denúncias?
7. **Cursos, Recursos, Notícias, IA:** entram, ou saem do produto e da página inicial?
8. **O site ao vivo** é igual a `main`? Não o consegui ver; se o Netlify publicar outro ramo, a maquete tem de ser refeita a partir dele.
9. **Emails:** estão em português? Há SMTP próprio?
