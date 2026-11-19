const F = require('./fx'); const h = require('./harness');
const P = (id, username, name) => ({ id, username, name, photo_url: null });
exports.ME = P(h.USER.id, 'joaosilva', 'João Silva');
exports.ANA = P('22222222-2222-2222-2222-222222222222', 'anacosta', 'Ana Costa');
exports.RUI = P('33333333-3333-3333-3333-333333333333', 'ruimartins', 'Rui Martins');
exports.TIAGO = P('44444444-4444-4444-4444-444444444444', 'SharpWhistle4821', null);
const IMG = 'exemplo.jpg';
const post = (id, author, content, o = {}) => Object.assign({ id, content, media_type: 'text', media_url: null, media_metadata: null, original_post_id: null, like_count: 0, comment_count: 0, repost_count: 0, save_count: 0, created_at: F.day(0), author, original_post: null, is_liked: false, is_saved: false, is_reposted: false }, o);
const hrs = n => new Date(Date.now() - n * 3600e3).toISOString();
exports.POSTS = [
  post('p1', exports.ANA, 'Jogo de juniores este fim de semana: dois lances de mão na bola na área. Como é que vocês avaliam a posição do braço quando o jogador está a cair?', { like_count: 12, comment_count: 4, repost_count: 1, created_at: hrs(2), is_liked: true }),
  post('p2', exports.RUI, 'Posicionamento numa transição rápida. Exemplo do treino de ontem.', { media_type: 'image', media_url: IMG, media_metadata: { width: 800, height: 500 }, like_count: 8, comment_count: 2, created_at: hrs(5) }),
  post('p3', exports.ME, null, { original_post_id: 'p0', created_at: hrs(9), is_reposted: true, original_post: Object.assign(post('p0', exports.TIAGO, 'Alguém tem dicas para o teste físico de janeiro?', { like_count: 3, comment_count: 6, created_at: hrs(30) }), {}) }),
  post('p4', exports.ME, 'Acabei hoje o teste de fora de jogo com 90%. A lei 11 já não me assusta.', { like_count: 5, comment_count: 1, created_at: hrs(26), is_saved: true }),
];
exports.COMMENTS = [
  { id: 'c1', content: 'Eu olho primeiro se o braço está a apoiar a queda. Se está, normalmente não sanciono.', like_count: 3, created_at: hrs(1.5), user_id: exports.RUI.id, author: exports.RUI, is_liked: false, replies: [
    { id: 'c2', content: '@ruimartins concordo, desde que não aumente a área do corpo de forma não natural.', like_count: 1, created_at: hrs(1), user_id: exports.ANA.id, author: exports.ANA, is_liked: true, replies: [] } ] },
  { id: 'c3', content: 'Boa pergunta. Seria bom termos vídeos destes lances no RefLab.', like_count: 0, created_at: hrs(0.5), user_id: h.USER.id, author: exports.ME, is_liked: false, replies: [] },
];
const msg = (id, sender, content, minsAgo) => ({ id, conversation_id: 'cv1', sender_id: sender.id, content, media_type: 'text', media_url: null, created_at: new Date(Date.now() - minsAgo * 60e3).toISOString(), sender });
exports.MESSAGES = [
  msg('m1', exports.ANA, 'Olá João! Vais ao curso de atualização no sábado?', 95),
  msg('m2', exports.ME, 'Olá Ana! Vou sim. Já fizeste o teste novo das leis?', 90),
  msg('m3', exports.ANA, 'Fiz ontem, 16 em 20. A parte do VAR é a mais difícil.', 12),
  msg('m4', exports.ANA, 'Depois diz-me como te correu 🙂', 11),
].reverse();
exports.CONVS = [
  { id: 'cv1', updated_at: new Date(Date.now() - 11 * 60e3).toISOString(), other_user: exports.ANA, last_message: Object.assign({}, exports.MESSAGES[0], { sender: undefined }), unread_count: 2 },
  { id: 'cv2', updated_at: hrs(28), other_user: exports.RUI, last_message: { id: 'm9', conversation_id: 'cv2', sender_id: h.USER.id, content: 'Obrigado pela dica!', media_type: 'text', media_url: null, created_at: hrs(28) }, unread_count: 0 },
  { id: 'cv3', updated_at: hrs(80), other_user: exports.TIAGO, last_message: { id: 'm8', conversation_id: 'cv3', sender_id: exports.TIAGO.id, content: null, media_type: 'image', media_url: 'x.jpg', created_at: hrs(80) }, unread_count: 0 },
];
