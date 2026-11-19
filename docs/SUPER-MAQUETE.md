# RefLab: a super maquete do que existe hoje

> 19 nov 2026. Só leitura e desenho: nenhum código da aplicação foi mudado, nada foi publicado, nenhum segredo foi aberto,
> nada custou dinheiro.

**Abrir:** `design/super-maquete/index.html` (mapa à esquerda, a app à direita, com botão Telemóvel/Computador) ou, no
telemóvel, o ficheiro único `design/super-maquete/super-maquete-reflab.html` (3 MB, funciona sem internet, só as letras
vêm do Google). Também entregue em `Saikan-Corporation/saikan-mockup`, ramo `entrega/reflab`.

## Revisão 1 (19 nov, depois da revisão do coordenador): o que mudou

O coordenador comparou as cinco super maquetes com o mapa da Tertúlia (`docs/SUPER-MAQUETES-REVISAO-1.md` no estúdio).
Para o RefLab corrigi:

1. **Cada linha abre o seu próprio ecrã, no seu estado.** Antes, em 15 linhas apareciam 3 ecrãs diferentes. Agora, 97 linhas abrem 97 ecrãs diferentes (verificado: nenhum se repete).
   - «Iniciar sessão» abre o formulário de entrar, já à vista.
   - «Criar conta», os erros e «Esqueci-me da palavra-passe» abrem cada um o seu formulário, sem a página inicial por cima.
   - «Os planos na página inicial» abre os planos.
   - «Barra de cima» e «Barra de baixo» abrem cada uma o seu ecrã, com os números por ler à vista.
   - Saiu a linha «A carregar», que mostrava o mesmo ecrã que «Painel · A carregar».
   - Recapturei «Vídeos»: mostrava dados de exemplo antigos.
2. **As partes sem ecrã** (16: tarefas do servidor, código que ninguém usa, o que não consegui provocar) estão no fim de cada secção, num grupo «Sem ecrã» fechado.
3. **Palavras de programador fora das linhas.** Cada linha diz o que se vê e, se houver, o problema, em português simples. Ficheiros, tabelas, variáveis e números de migração estão na ficha «O que se sabe», fechada.
4. **Uma só ficha**, «O que se sabe», fechada por defeito, em todas as linhas.
5. **O mapa voltou ao aspeto do estúdio**: azul-noite, uma só cor de destaque, títulos com serifa, linhas finas. As cores do RefLab (amarelo e azul-marinho) ficam só dentro da moldura.
   - Cabeçalho comum: a marca e «RefLab · o que existe hoje», o título, o parágrafo, o botão e os contadores.
   - «Telemóvel / Computador» fica no canto de cima, à direita do palco, no computador, e por baixo do botão no telemóvel.
6. **Os problemas encontram-se.** Há um contador «Só o que tem problemas ou está a meio» (48 partes), e cada uma dessas linhas diz o problema logo por baixo do nome.
7. **`lang="en"`:** as páginas do RefLab dizem ao navegador que estão em inglês. É um problema real do produto e está na linha «Página inicial». O mapa em si está em `pt-PT`.

**Verificação (ponto 7):** abri o ficheiro único a 390×844 e a 1440×900 e toquei em 20 linhas espalhadas pelo mapa, em cada tamanho, duas vezes: 80 toques em 40 linhas diferentes. Olhei para cada resultado.
- Nenhuma moldura vazia, nenhum ecrã repetido, nenhum texto cortado pelo canto da moldura, nenhum erro.
- Na primeira volta encontrei e corrigi dois defeitos: o «Vídeos» antigo e o «A carregar» repetido.
- Não verifiquei com leitor de ecrã nem num iPhone verdadeiro.

**Continua sem ecrã, por não o conseguir provocar com dados de exemplo:** «Sessão expirada» e «Falhou a entrada». Estão em «Sem ecrã», marcadas «Não consegui ver».

## Em resumo

- O RefLab de hoje é o ramo `main`: último código a **24 fev 2026**. É uma app web (telemóvel primeiro) para árbitros:
  **Painel**, **Aprender** (teste de 20 perguntas, perguntas de prática, vídeos de decisão), **Comunidade** (feed, comentários,
  perfis, seguir, bloquear), **Mensagens** em tempo real, **Avisos**, **Definições** e **Planos** pagos com a Stripe.
- **113 partes** no mapa: 52 «Existe», 46 «Existe, com problemas», 2 «A meio», 9 «Só no código», 4 «Não consegui ver». 97 abrem o seu próprio ecrã; as 16 sem ecrã estão no fim de cada secção, em «Sem ecrã».
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

| Secção | Parte | Etiqueta | Ecrã | O que se vê / o problema |
|---|---|---|---|---|
| Entrada | Página inicial | Existe, com problemas | [inicio.html](../design/super-maquete/imagens/inicio.jpg) | **Problema:** Os botões dos planos não fazem nada a quem ainda não entrou. A marca, a frase «O teu laboratório de treino de arbitragem», entrar ou criar conta, os planos e o rodapé. |
| Entrada | ↳ Os planos na página inicial | Existe, com problemas | [planos-inicio.html](../design/super-maquete/imagens/planos-inicio.jpg) | **Problema:** Prometem coisas que o produto não tem (IA, fórum, newsletter). Gratuito, Pro e Plus num carrossel. |
| Entrada | Iniciar sessão | Existe | [entrar.html](../design/super-maquete/imagens/entrar.jpg) | Email e palavra-passe, «Esqueceste-te da palavra-passe?» e o botão do Google. |
| Entrada | ↳ Campos por preencher | Existe | [entrar-erros.html](../design/super-maquete/imagens/entrar-erros.jpg) | O aviso por baixo de cada campo. |
| Entrada | ↳ Email ou palavra-passe errados | Existe | [entrar-errado.html](../design/super-maquete/imagens/entrar-errado.jpg) | A faixa vermelha no cartão. |
| Entrada | Criar conta | Existe, com problemas | [criar-conta.html](../design/super-maquete/imagens/criar-conta.jpg) | **Problema:** Não há escolha de nome nem boas-vindas: a pessoa entra com um nome inventado (por exemplo «SharpWhistle4821»). Email, palavra-passe (mínimo 6), confirmar, e «Continuar com Google». |
| Entrada | ↳ Erros ao criar conta | Existe | [criar-conta-erros.html](../design/super-maquete/imagens/criar-conta-erros.jpg) | Email inválido, palavra-passe curta, palavras-passe diferentes. |
| Entrada | ↳ Conta criada | Existe | [criar-conta-feito.html](../design/super-maquete/imagens/criar-conta-feito.jpg) | «Conta criada! Verifica o teu email para confirmar a conta.» |
| Entrada | Esqueci-me da palavra-passe | Existe, com problemas | [esqueci.html](../design/super-maquete/imagens/esqueci.jpg) | **Problema:** Se o servidor der erro, a mensagem aparece em inglês. Pede o email para enviar uma ligação. |
| Entrada | ↳ Ligação enviada | Existe | [esqueci-enviado.html](../design/super-maquete/imagens/esqueci-enviado.jpg) | A confirmação a verde. |
| Entrada | Definir nova palavra-passe | Existe, com problemas | [nova-passe.html](../design/super-maquete/imagens/nova-passe.jpg) | **Problema:** Quem já tem sessão aberta pode mudar a palavra-passe aqui sem saber a antiga. A página a que leva a ligação do email. |
| Entrada | ↳ Erros | Existe | [nova-passe-erros.html](../design/super-maquete/imagens/nova-passe-erros.jpg) | Palavra-passe curta, palavras-passe diferentes. |
| Entrada | ↳ Palavra-passe atualizada | Existe | [nova-passe-feita.html](../design/super-maquete/imagens/nova-passe-feita.jpg) | «A redirecionar para o painel…» |
| Entrada | ↳ Sem a ligação do email | Existe, com problemas | [nova-passe-invalida.html](../design/super-maquete/imagens/nova-passe-invalida.jpg) | **Problema:** Devia dizer «Ligação inválida ou expirada»; na captura não apareceu. O botão fica apagado. |
| Entrada | A entrar | Existe | [regresso.html](../design/super-maquete/imagens/regresso.jpg) | A roda e «A iniciar sessão...», ao voltar do Google ou do email de confirmação. |
| Entrada | Aviso de cookies | Existe, com problemas | [inicio-cookies.html](../design/super-maquete/imagens/inicio-cookies.jpg) | **Problema:** Aceitar ou recusar não muda nada. Faixa em baixo com «Aceitar» e «Recusar». |
| Entrada | ↳ O aviso dentro da app | Existe, com problemas | [cookies-na-app.html](../design/super-maquete/imagens/cookies-na-app.jpg) | **Problema:** Não se consegue mudar de secção até responder. Tapa a barra de baixo. |
| Entrada | Privacidade | Existe | [legal-privacidade.html](../design/super-maquete/imagens/legal-privacidade.jpg) | Página com três separadores, já em português. |
| Entrada | ↳ Termos de Serviço | Existe | [legal-termos.html](../design/super-maquete/imagens/legal-termos.jpg) | O segundo separador. |
| Entrada | ↳ Política de Cookies | Existe | [legal-cookies.html](../design/super-maquete/imagens/legal-cookies.jpg) | O terceiro separador. |
| Entrada | Falhou a entrada | Não consegui ver | Sem ecrã | Devia mostrar «A autenticação falhou» e «Voltar ao início de sessão». Não consegui provocar este estado com os dados de exemplo. |
| Entrada | Emails | Não consegui ver | Sem ecrã | Dois, enviados pelo Supabase: confirmar o registo e redefinir a palavra-passe. O texto, o remetente e a língua estão no painel do Supabase; não os vi. |
| Estrutura da app | Barra de cima | Existe, com problemas | [barra-cima.html](../design/super-maquete/imagens/barra-cima.jpg) | **Problema:** O número do sino só muda quando se muda de página. Menu, a marca, a lupa e o sino com o número de avisos por ler (aqui «9+»). |
| Estrutura da app | Barra de baixo | Existe, com problemas | [barra-baixo.html](../design/super-maquete/imagens/barra-baixo.jpg) | **Problema:** O número das mensagens só muda quando se muda de página. Painel, Aprender, Comunidade, Mensagens (aqui com «99+» por ler), Perfil. |
| Estrutura da app | Menu lateral | Existe, com problemas | [menu.html](../design/super-maquete/imagens/menu.jpg) | **Problema:** É o único caminho para Testes, Pesquisar, Notificações, Planos e Definições, e não marca onde estás. Dez entradas, o nome e o email, e «Terminar sessão». |
| Estrutura da app | Endereço que não existe | Existe, com problemas | [pagina-inexistente.html](../design/super-maquete/imagens/pagina-inexistente.jpg) | **Problema:** Não há página «não encontrado». Uma página escura vazia. |
| Estrutura da app | Sessão expirada | Não consegui ver | Sem ecrã | Uma janela «Sessão expirada» com «Iniciar sessão». Não consegui provocá-la com os dados de exemplo. No código, o texto está quase ilegível e não há forma de fechar. |
| Estrutura da app | Cabeçalho e menu antigos | Só no código | Sem ecrã | Uma versão branca anterior, com emojis. Ninguém os usa. |
| Estrutura da app | Botão e campo partilhados | Só no código | Sem ecrã | Peças de desenho comuns. Os ficheiros estão vazios. |
| Painel | Painel | Existe, com problemas | [painel.html](../design/super-maquete/imagens/painel.jpg) | **Problema:** Os dias da semana do calendário estão em inglês e os decimais usam ponto. Desempenho (precisão geral e por tema), Progresso e Hábitos (calendário de 30 dias, sequências). |
| Painel | ↳ Pessoa nova | Existe, com problemas | [painel-vazio.html](../design/super-maquete/imagens/painel-vazio.jpg) | **Problema:** Os cartões de tempo mostram um «—» grande em vez da frase prevista. Os cartões vazios. |
| Painel | ↳ A carregar | Existe | [painel-a-carregar.html](../design/super-maquete/imagens/painel-a-carregar.jpg) | As silhuetas cinzentas. |
| Painel | ↳ Erro | Existe, com problemas | [painel-erro.html](../design/super-maquete/imagens/painel-erro.jpg) | **Problema:** Não há botão para tentar de novo. A faixa vermelha. |
| Aprender | Teste | Existe, com problemas | [aprender.html](../design/super-maquete/imagens/aprender.jpg) | **Problema:** «Testes esta semana» conta também a semana anterior. «Teste de Conhecimento de Arbitragem»: 20 perguntas ao acaso, 40 minutos, e os teus números. |
| Aprender | ↳ Histórico de testes | Existe | [aprender-historico.html](../design/super-maquete/imagens/aprender-historico.jpg) | Data, certas, tempo e nota de cada teste. |
| Aprender | ↳ A preparar o teste | Existe | [teste-a-gerar.html](../design/super-maquete/imagens/teste-a-gerar.jpg) | «A gerar o teu teste...» |
| Aprender | ↳ A responder | Existe, com problemas | [teste-pergunta.html](../design/super-maquete/imagens/teste-pergunta.jpg) | **Problema:** As perguntas estão em inglês num produto em português. Relógio, «Pergunta 1 de 20», quatro opções. |
| Aprender | ↳ Resposta escolhida | Existe, com problemas | [teste-respondida.html](../design/super-maquete/imagens/teste-respondida.jpg) | **Problema:** Fica bloqueada ao primeiro toque, sem confirmar. A opção fica marcada e bloqueada. |
| Aprender | ↳ A última pergunta | Existe | [teste-ultima.html](../design/super-maquete/imagens/teste-ultima.jpg) | Aparece «Submeter teste». |
| Aprender | ↳ Resultado: aprovado | Existe, com problemas | [teste-resultado.html](../design/super-maquete/imagens/teste-resultado.jpg) | **Problema:** Não explica as respostas: não há IA nenhuma no produto. 16/20, pontos fortes e áreas a melhorar por tema. |
| Aprender | ↳ Resultado: reprovado com o tempo esgotado | Existe, com problemas | [teste-resultado-baixo.html](../design/super-maquete/imagens/teste-resultado-baixo.jpg) | **Problema:** Quando o tempo acaba, só conta as perguntas respondidas e grava a duração errada. 9/20 e «Submetido automaticamente». |
| Aprender | Perguntas | Existe | [perguntas.html](../design/super-maquete/imagens/perguntas.jpg) | «Perguntas de prática», sem limite de tempo: rápidas, por lei ou por área. |
| Aprender | ↳ Escolher leis | Existe, com problemas | [perguntas-por-lei.html](../design/super-maquete/imagens/perguntas-por-lei.jpg) | **Problema:** Uma pergunta sem lei aparece como «Lei — Law null». As leis 11 a 14 com nome em português. |
| Aprender | ↳ Escolher áreas | Existe, com problemas | [perguntas-por-area.html](../design/super-maquete/imagens/perguntas-por-area.jpg) | **Problema:** Os nomes das áreas aparecem em inglês. As áreas para praticar. |
| Aprender | ↳ A responder | Existe | [perguntas-sessao.html](../design/super-maquete/imagens/perguntas-sessao.jpg) | Relógio, certas até agora, «Terminar sessão». |
| Aprender | ↳ Resposta certa | Existe | [perguntas-certa.html](../design/super-maquete/imagens/perguntas-certa.jpg) | A opção fica verde. |
| Aprender | ↳ Resposta errada | Existe | [perguntas-errada.html](../design/super-maquete/imagens/perguntas-errada.jpg) | A tua a vermelho, a certa a verde. |
| Aprender | ↳ Terminar a sessão? | Existe | [perguntas-terminar.html](../design/super-maquete/imagens/perguntas-terminar.jpg) | A janela de confirmação. |
| Aprender | ↳ Sessão concluída | Existe | [perguntas-revisao.html](../design/super-maquete/imagens/perguntas-revisao.jpg) | Certas, tempo, precisão, e as respostas para rever. |
| Aprender | Vídeos | Existe, com problemas | [videos.html](../design/super-maquete/imagens/videos.jpg) | **Problema:** Só há um vídeo, e quando não carrega a mensagem é técnica e dirigida à equipa. Um lance em vídeo, depois «Que ação deve o árbitro tomar?» e a sanção. |
| Aprender | ↳ A escolher a sanção | Existe | [videos-sancao.html](../design/super-maquete/imagens/videos-sancao.jpg) | Sem cartão, amarelo ou vermelho. |
| Aprender | ↳ Resultado do vídeo | Existe | [videos-resultado.html](../design/super-maquete/imagens/videos-resultado.jpg) | «Parcialmente correta», com a ação e a sanção certas. |
| Aprender | ↳ Sem vídeos | Existe | [videos-vazio.html](../design/super-maquete/imagens/videos-vazio.jpg) | «Ainda não há cenários de vídeo disponíveis.» |
| Aprender | Cursos | A meio | [cursos.html](../design/super-maquete/imagens/cursos.jpg) | **Problema:** Não há cursos. Só a palavra «Brevemente.» |
| Aprender | Recursos | A meio | [recursos.html](../design/super-maquete/imagens/recursos.jpg) | **Problema:** Os ficheiros não existem e «Transferir» não faz nada. Cinco ficheiros («Leis do Jogo 2024/25»…) com «Transferir». |
| Aprender | Testes disponíveis | Existe, com problemas | [testes-lista.html](../design/super-maquete/imagens/testes-lista.jpg) | **Problema:** São exemplos de programação («React Basics»), e os títulos quase não se veem. Três questionários com «Iniciar teste», pelo menu lateral. |
| Aprender | Abrir um desses testes | Existe, com problemas | [teste-endereco.html](../design/super-maquete/imagens/teste-endereco.jpg) | **Problema:** Os testes da lista não existem: mostra um erro técnico em inglês. Uma caixa rosa com um erro. |
| Aprender | Notícias | Só no código | Sem ecrã | Três artigos de exemplo guardados, sem página para os ler. |
| Comunidade | Feed | Existe, com problemas | [comunidade.html](../design/super-maquete/imagens/comunidade.jpg) | **Problema:** Republicar mostra «reposted» em inglês, e guardar não leva a lado nenhum. Filtros por tipo, cartões com gosto, comentários, republicar, guardar e partilhar; o «+» amarelo para publicar. |
| Comunidade | ↳ A carregar | Existe | [comunidade-a-carregar.html](../design/super-maquete/imagens/comunidade-a-carregar.jpg) | As silhuetas. |
| Comunidade | ↳ Ainda sem publicações | Existe | [comunidade-vazia.html](../design/super-maquete/imagens/comunidade-vazia.jpg) | «Ainda não há publicações». |
| Comunidade | ↳ Erro | Existe | [comunidade-erro.html](../design/super-maquete/imagens/comunidade-erro.jpg) | «Ocorreu um erro ao carregar o feed.» e «Tentar novamente». |
| Comunidade | ↳ Só imagens | Existe | [comunidade-imagens.html](../design/super-maquete/imagens/comunidade-imagens.jpg) | O filtro «Imagem». |
| Comunidade | ↳ Comentários | Existe, com problemas | [comunidade-comentarios.html](../design/super-maquete/imagens/comunidade-comentarios.jpg) | **Problema:** Se um comentário falhar, ninguém avisa e o contador sobe na mesma. Abrem dentro do cartão, com respostas e @menções a amarelo. |
| Comunidade | ↳ Mencionar alguém | Existe, com problemas | [comunidade-mencao.html](../design/super-maquete/imagens/comunidade-mencao.jpg) | **Problema:** Sem resultados diz «No users found», em inglês. Ao escrever «@an» aparece a lista de pessoas. |
| Comunidade | ↳ Menu numa publicação de outra pessoa | Existe | [comunidade-menu-outro.html](../design/super-maquete/imagens/comunidade-menu-outro.jpg) | Denunciar a publicação, denunciar a pessoa, bloquear. |
| Comunidade | ↳ Menu numa publicação minha | Existe, com problemas | [comunidade-menu-meu.html](../design/super-maquete/imagens/comunidade-menu-meu.jpg) | **Problema:** Elimina sem pedir confirmação. «Eliminar publicação». |
| Comunidade | ↳ Denunciar | Existe, com problemas | [comunidade-denunciar.html](../design/super-maquete/imagens/comunidade-denunciar.jpg) | **Problema:** Diz «este post» e «este user», e depois de enviar não confirma nada. Três motivos e uma caixa para descrever. |
| Comunidade | ↳ Bloquear | Existe | [comunidade-bloquear.html](../design/super-maquete/imagens/comunidade-bloquear.jpg) | «Bloquear @anacosta?» |
| Comunidade | ↳ Nova publicação | Existe | [comunidade-publicar.html](../design/super-maquete/imagens/comunidade-publicar.jpg) | Texto e um ficheiro: imagem, vídeo ou áudio. |
| Comunidade | ↳ Publicar sem nada escrito | Existe | [comunidade-publicar-erro.html](../design/super-maquete/imagens/comunidade-publicar-erro.jpg) | «Escreve algo ou anexa multimédia.» |
| Comunidade | Publicação aberta | Existe, com problemas | [publicacao.html](../design/super-maquete/imagens/publicacao.jpg) | **Problema:** O título diz «Publicar» em vez de «Publicação». A publicação com os comentários abertos. |
| Comunidade | ↳ Publicação que já não existe | Existe | [publicacao-inexistente.html](../design/super-maquete/imagens/publicacao-inexistente.jpg) | «Publicação não encontrada ou já eliminada.» |
| Comunidade | Janela de partilha | Só no código | Sem ecrã | WhatsApp, X, Facebook, Telegram, Email e «Copiar». Ninguém a usa: «Partilhar» copia a ligação. |
| Perfil | O meu perfil | Existe, com problemas | [perfil.html](../design/super-maquete/imagens/perfil.jpg) | **Problema:** Não mostra nada do treino nem quem me segue. Iniciais ou foto, nome, @utilizador, e as minhas publicações. |
| Perfil | ↳ Sem publicações | Existe | [perfil-vazio.html](../design/super-maquete/imagens/perfil-vazio.jpg) | Só o cartão do perfil. |
| Perfil | Editar perfil | Existe | [perfil-editar.html](../design/super-maquete/imagens/perfil-editar.jpg) | Foto, nome e nome de utilizador, com verificação se está livre. |
| Perfil | Perfil de outra pessoa | Existe, com problemas | [perfil-outro.html](../design/super-maquete/imagens/perfil-outro.jpg) | **Problema:** Seguir pode estar a falhar sempre, e não se vê quem se segue. «Seguir» e «Mensagem», e as publicações dela. |
| Perfil | ↳ Menu do perfil | Existe | [perfil-outro-menu.html](../design/super-maquete/imagens/perfil-outro-menu.jpg) | Denunciar ou bloquear a pessoa. |
| Perfil | ↳ Pessoa que bloqueei | Existe | [perfil-outro-bloqueado.html](../design/super-maquete/imagens/perfil-outro-bloqueado.jpg) | O perfil com «Desbloquear». |
| Perfil | ↳ Pessoa que me bloqueou | Existe | [perfil-outro-bloqueou-te.html](../design/super-maquete/imagens/perfil-outro-bloqueou-te.jpg) | O perfil sem publicações. |
| Perfil | ↳ Pessoa que não existe | Existe | [perfil-outro-inexistente.html](../design/super-maquete/imagens/perfil-outro-inexistente.jpg) | O aviso de perfil não encontrado. |
| Perfil | Perfil público antigo | Só no código | Sem ecrã | Uma segunda versão do perfil de outra pessoa. Ninguém a usa. |
| Mensagens | Conversas | Existe, com problemas | [mensagens.html](../design/super-maquete/imagens/mensagens.jpg) | **Problema:** A lista não se atualiza sozinha. Procurar alguém, e cada conversa com a última mensagem e quantas faltam ler. |
| Mensagens | ↳ Sem conversas | Existe | [mensagens-vazia.html](../design/super-maquete/imagens/mensagens-vazia.jpg) | A lista vazia. |
| Mensagens | ↳ Procurar pessoa | Existe | [mensagens-procurar.html](../design/super-maquete/imagens/mensagens-procurar.jpg) | Ao escrever «ru» aparecem as pessoas. |
| Mensagens | Conversa | Existe, com problemas | [conversa.html](../design/super-maquete/imagens/conversa.jpg) | **Problema:** Os anexos ficam num sítio público: quem tiver a ligação vê. Balões, data e hora, anexar e «Enviar». As mensagens chegam na hora. |
| Mensagens | ↳ Conversa nova | Existe | [conversa-vazia.html](../design/super-maquete/imagens/conversa-vazia.jpg) | Ainda sem mensagens. |
| Mensagens | ↳ A escrever | Existe | [conversa-a-escrever.html](../design/super-maquete/imagens/conversa-a-escrever.jpg) | A mensagem na caixa, antes de enviar. |
| Pesquisa | Pesquisar pessoas | Existe, com problemas | [pesquisa.html](../design/super-maquete/imagens/pesquisa.jpg) | **Problema:** Só procura pessoas, e as recentes são as de todas as contas do mesmo telemóvel. O campo, as pesquisas recentes e «Limpar tudo». |
| Pesquisa | ↳ Primeira vez | Existe | [pesquisa-vazia.html](../design/super-maquete/imagens/pesquisa-vazia.jpg) | Sem pesquisas recentes. |
| Pesquisa | ↳ Resultados | Existe | [pesquisa-resultados.html](../design/super-maquete/imagens/pesquisa-resultados.jpg) | Ao escrever «ana». |
| Pesquisa | ↳ Sem resultados | Existe | [pesquisa-sem-resultados.html](../design/super-maquete/imagens/pesquisa-sem-resultados.jpg) | Nenhuma pessoa encontrada. |
| Avisos | Notificações | Existe, com problemas | [notificacoes.html](../design/super-maquete/imagens/notificacoes.jpg) | **Problema:** «Completa o teu perfil» nunca desaparece, mesmo depois de completo. Gostos, comentários, menções, novos seguidores, republicações, avisos do plano. |
| Avisos | ↳ Sem notificações | Existe | [notificacoes-vazia.html](../design/super-maquete/imagens/notificacoes-vazia.jpg) | A página vazia. |
| Avisos | Avisos que nunca chegam | Só no código | Sem ecrã | Nova mensagem, sequências e conteúdo novo. Têm interruptor nas Definições, mas nada os envia. |
| Avisos | Lembrete do fim do plano | Existe, com problemas | Sem ecrã | **Problema:** Avisa quem renova que o plano «vai expirar», e cada aviso só sai uma vez na vida. Um aviso automático antes do fim do plano. |
| Conta | Definições | Existe, com problemas | [definicoes.html](../design/super-maquete/imagens/definicoes.jpg) | **Problema:** 5 dos 11 interruptores não fazem nada. Perfil, conta, 11 interruptores de avisos, quem te pode escrever, bloqueados, aprendizagem, legal. |
| Conta | ↳ Eliminar conta | Existe, com problemas | [definicoes-apagar.html](../design/super-maquete/imagens/definicoes-apagar.jpg) | **Problema:** Cancela logo o plano pago, sem reembolso. Escrever DELETE para confirmar. |
| Conta | ↳ Limpar o histórico de aprendizagem | Existe | [definicoes-limpar.html](../design/super-maquete/imagens/definicoes-limpar.jpg) | A janela de confirmação. |
| Conta | Planos e faturação | Existe, com problemas | [planos.html](../design/super-maquete/imagens/planos.jpg) | **Problema:** Pagar não muda nada no produto: tudo o que é «premium» é grátis. Gratuito, Pro a €4.99 (Recomendado) e Plus a €9.99. |
| Conta | ↳ Com o plano Pro | Existe | [planos-pro.html](../design/super-maquete/imagens/planos-pro.jpg) | O plano, o estado, a renovação, cancelar, gerir na Stripe, histórico de compras. |
| Conta | ↳ Mudar para Plus | Existe, com problemas | [planos-pro-mudar.html](../design/super-maquete/imagens/planos-pro-mudar.jpg) | **Problema:** Diz que muda no próximo ciclo, mas muda logo. A janela de confirmação. |
| Conta | ↳ Cancelar o plano | Existe | [planos-pro-cancelar.html](../design/super-maquete/imagens/planos-pro-cancelar.jpg) | A janela de confirmação. |
| Conta | ↳ Cancelamento pendente | Existe, com problemas | [planos-a-cancelar.html](../design/super-maquete/imagens/planos-a-cancelar.jpg) | **Problema:** Não se pode voltar atrás dentro da app. «A tua subscrição será cancelada no fim do período». |
| Conta | ↳ Pagamento falhou | Existe | [planos-pagamento-falhou.html](../design/super-maquete/imagens/planos-pagamento-falhou.jpg) | O aviso vermelho para atualizar o cartão. |
| Conta | ↳ Regresso do pagamento | Existe, com problemas | [planos-checkout-feito.html](../design/super-maquete/imagens/planos-checkout-feito.jpg) | **Problema:** Pode ficar assim até se recarregar a página. «A processar a tua subscrição…» |
| Conta | Pagar | Não consegui ver | Sem ecrã | A página de pagamento e o portal são da Stripe. Fora da app; não vi. |
| Conta | Janela antiga de eliminar conta | Só no código | Sem ecrã | Uma segunda janela de eliminar conta. Ninguém a usa. |
| Conta | Reportar um problema | Só no código | Sem ecrã | Uma janela prevista para reportar problemas. Está vazia e ninguém a usa. |
| Conta | Assistente | Só no código | Sem ecrã | O «chatbot» do README. Não há nada: pastas vazias. |
| Por trás | Funções no servidor | Existe, com problemas | Sem ecrã | **Problema:** Uma delas aceita pedidos de qualquer pessoa. Oito: pagamento, portal, cancelar, mudar de plano, faturas, avisos da Stripe, apagar conta, sincronizar vídeos. |
| Por trás | Base de dados | Existe, com problemas | Sem ecrã | **Problema:** Qualquer pessoa pode tornar-se administradora e ler o email de toda a gente. 49 migrações e 38 tabelas. |

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
