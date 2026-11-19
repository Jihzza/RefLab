# Como foi feita a super maquete (e como refazê-la)

Cada página desta pasta é uma **fotografia da app verdadeira** (ramo `main`), não um desenho à mão:

1. A app corre aqui com o Vite, com um Supabase falso:
   `VITE_SUPABASE_URL=http://mock.supabase.test VITE_SUPABASE_ANON_KEY=mock-anon-key npx vite --port 5173` (em `apps/frontend`, depois de `npm ci`).
2. `captura/harness.js` abre a app no Chromium (Playwright), responde a todos os pedidos ao Supabase com os dados de
   exemplo de `captura/fx.js` e `captura/fxsocial.js`, põe uma sessão falsa no navegador, faz os toques de cada estado
   e grava o HTML desenhado com o CSS verdadeiro embutido. `captura/shim.html` torna as ligações navegáveis entre fotografias.
3. Os lotes: `captura/s-entrada.js`, `s-painel.js`, `s-aprender2.js`, `s-comunidade.js`, `s-conta.js`, `s-extra.js` e, da revisão 1, `s-revisao.js` (cada estado aberto na sua parte).
   Corre-se cada um com `OUT=<pasta> SHOTS=<pasta de png> node s-xxx.js` a partir de `captura/`.
4. `gen.py` escreve o mapa (`index.html`) a partir de `index-modelo.html` (a mesma mecânica da super maquete da Tertúlia)
   e acrescenta às páginas as ligações dos ícones. `empacotar.py` faz o ficheiro único.

Nenhuma chave verdadeira é usada; nada sai da máquina; nada no código da app foi mudado.
As pessoas, publicações, mensagens e números são de exemplo. As perguntas, os testes e o vídeo são os das migrações do RefLab.
