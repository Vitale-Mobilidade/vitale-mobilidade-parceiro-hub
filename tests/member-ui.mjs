// Targeted UI smoke against local Vite. Every non-local request is aborted.
// Start dev with VITE_MEMBER_ACCOUNTS_ENABLED=true, VITE_SUPABASE_URL=http://127.0.0.1:54321,
// VITE_SUPABASE_PUBLISHABLE_KEY=local-test-key. No real auth, email or database calls.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const origin = process.env.MEMBER_TEST_ORIGIN || 'http://127.0.0.1:4318';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const requests = [];
const external = [];
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.error('Browser error:', e.message); });
const user = { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'leitor@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { display_name: 'Leitor teste' }, identities: [], created_at: new Date().toISOString() };
let profile = null;
let communityEnabled = true;
let comment = null;
const expires = Math.floor(Date.now()/1000) + 3600;
const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp:expires,aud:'authenticated',role:'authenticated'})}.fake-signature`;
const session = { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'fake-local-refresh', user };
const fixtures = new URL('./member-ui.html', import.meta.url);
await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin === origin && url.pathname === '/tests/member-ui.html') return route.fulfill({ contentType: 'text/html', body: await readFile(fixtures, 'utf8') });
  if (url.origin === origin) return route.continue();
  if (url.origin !== 'http://127.0.0.1:54321') { external.push(url.origin); return route.abort(); }
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,PUT,DELETE,OPTIONS' } });
  const input = request.postDataJSON() || {};
  requests.push({ path: url.pathname, input });
  const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': origin }, body: JSON.stringify(data) });
  if (url.pathname.endsWith('/signup')) return reply(user);
  if (url.pathname.endsWith('/recover') || url.pathname.endsWith('/resend') || url.pathname.endsWith('/logout')) return reply({});
  if (url.pathname.endsWith('/token')) return input.email === 'erro@example.invalid' ? reply({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400) : reply(session);
  if (url.pathname.endsWith('/user')) return reply(user);
  assert.equal(url.pathname, '/rest/v1/rpc/member_community');
  const payload = input.p_payload;
  switch (input.p_action) {
    case 'status': return reply({ enabled: communityEnabled });
    case 'profile': return reply(profile);
    case 'save_profile': profile = { displayName: payload.displayName, suspended: false, createdAt: new Date().toISOString() }; return reply(profile);
    case 'comments': return reply([
      ...(comment && comment.status !== 'removed' ? [comment] : []),
      { id: '20000000-0000-4000-8000-000000000001', body: '<img src=x onerror=alert(1)> dúvida', authorName: '<b>Ana</b>', status: 'approved', createdAt: new Date().toISOString(), isOwn: false },
    ]);
    case 'add_comment': comment = { id: '20000000-0000-4000-8000-000000000002', body: payload.body, authorName: profile.displayName, status: 'pending', createdAt: new Date().toISOString(), isOwn: true }; return reply({ok:true});
    case 'remove_comment': comment.status = 'removed'; return reply({ok:true});
    case 'moderation_list': return reply([{ id: '20000000-0000-4000-8000-000000000003', body: 'Comentário na fila', authorName: 'Leitor teste', createdAt: new Date().toISOString(), status: 'pending', suspended: false, articleTitle: 'Artigo teste', articleSlug: 'artigo-teste' }]);
    case 'moderate': return reply({ok:true});
    default: throw new Error(`Unexpected action ${input.p_action}`);
  }
});
const fixture = (view='account') => `${origin}/tests/member-ui.html?view=${view}`;
try {
  const response = await page.goto(`${origin}/conta`);
  assert.equal(response.headers()['cache-control'], 'private, no-store');
  assert.match(await page.locator('meta[name="robots"]').last().getAttribute('content'), /noindex/);
  await page.getByRole('heading', {name:'Entre na Vitale'}).waitFor();
  await page.getByRole('button', {name:'Criar conta gratuita',exact:true}).click();
  await page.getByLabel('Nome público',{exact:true}).fill('Leitor teste');
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByLabel('Senha',{exact:true}).fill('minha-senha-local-123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Criar conta',exact:true}).press('Enter');
  await page.getByRole('status').filter({hasText:'Confira seu e-mail'}).waitFor();
  assert.equal(requests.filter(r=>r.path.endsWith('/signup')).length,1);
  assert.deepEqual(Object.keys(requests.find(r=>r.path.endsWith('/signup')).input.data),['display_name']);
  assert(!requests.some(r=>/newsletter|quiz|editorial-admin/.test(r.path)));
  await page.getByRole('button',{name:'Já tenho conta',exact:true}).click();
  await page.getByLabel('E-mail',{exact:true}).fill('erro@example.invalid');
  await page.getByLabel('Senha',{exact:true}).fill('senha-errada');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Não foi possível entrar'}).waitFor();
  await page.getByRole('button',{name:'Esqueci minha senha'}).click();
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
  await page.getByRole('status').filter({hasText:'Se houver uma conta'}).waitFor();
  assert(requests.some(r=>r.path.endsWith('/recover')));
  await page.getByRole('button',{name:'Já tenho conta',exact:true}).click();
  await page.getByLabel('Senha',{exact:true}).fill('minha-senha-local-123');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Minha conta',exact:true}).waitFor();
  await page.getByLabel('Nome público',{exact:true}).fill('Meu nome público');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Salvar perfil'}).click();
  await page.getByRole('status').filter({hasText:'Perfil salvo'}).waitFor();
  await page.getByRole('button',{name:'Alterar senha',exact:true}).click();
  await page.getByLabel('Nova senha',{exact:true}).fill('nova-senha-local-123');
  await page.getByRole('button',{name:'Salvar nova senha'}).click();
  await page.getByRole('status').filter({hasText:'Senha atualizada'}).waitFor();
  assert(requests.some(r=>r.path.endsWith('/user') && r.input.password === 'nova-senha-local-123'));
  await mkdir(new URL('../artifacts/member-accounts/',import.meta.url),{recursive:true});
  await page.screenshot({path: new URL('../artifacts/member-accounts/account-mobile.png',import.meta.url).pathname,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({width:1024,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({path:new URL('../artifacts/member-accounts/account-desktop.png',import.meta.url).pathname,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  console.log('PASS keyboard signup, mobile/desktop layout, login failure/success, password recovery/update, profile, no subscription');

  await page.goto(fixture('comments'));
  await page.getByText('<img src=x onerror=alert(1)> dúvida',{exact:true}).waitFor();
  assert.equal(await page.locator('img').count(),0);
  assert.equal(await page.locator('script:not([type="module"])').count(),0);
  await page.getByLabel('Seu comentário').fill('Minha dúvida sobre esta bike.');
  await page.getByRole('button',{name:'Enviar para moderação'}).click();
  await page.getByText('Aguardando moderação · visível só para você',{exact:true}).waitFor();
  await page.screenshot({path:new URL('../artifacts/member-accounts/comments-mobile.png',import.meta.url).pathname,fullPage:true});
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Remover meu comentário'}).click();
  await page.getByRole('status').filter({hasText:'Comentário removido'}).waitFor();
  console.log('PASS comment submission, pending feedback, removal and escaped HTML');

  await page.goto(fixture('moderation'));
  await page.getByText('Comentário na fila',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Aprovar',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Moderação atualizada'}).waitFor();
  assert(requests.some(r=>r.input.p_action==='moderate' && r.input.p_payload.status==='approved'));
  console.log('PASS moderation queue and action');

  await page.goto(`${origin}/conta`);
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  await page.getByRole('heading',{name:'Entre na Vitale'}).waitFor();
  await page.goto(`${origin}/conta?modo=senha`);
  await page.getByRole('heading',{name:'Recuperar acesso'}).waitFor();
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
  await page.getByRole('status').filter({hasText:'Se houver uma conta'}).waitFor();
  await page.goto(`${origin}/conta?modo=senha#access_token=${token}&refresh_token=fake-local-refresh&expires_in=3600&token_type=bearer&type=recovery`);
  await page.getByRole('heading',{name:'Definir nova senha'}).waitFor();
  await page.getByLabel('Nova senha',{exact:true}).fill('senha-do-link-local-123');
  await page.getByRole('button',{name:'Salvar nova senha'}).click();
  await page.getByRole('status').filter({hasText:'Senha atualizada'}).waitFor();
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  await page.getByRole('heading',{name:'Entre na Vitale'}).waitFor();
  console.log('PASS expired/missing recovery session fallback and simulated email recovery callback');
  communityEnabled = false;
  await page.goto(`${origin}/conta`);
  await page.getByText('A área de leitores está temporariamente indisponível.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar conta gratuita',exact:true}).count(),0);
  assert.equal(external.length,0, `External requests: ${external.join(', ')}`);
  assert.deepEqual(errors,[]);
  console.log('PASS logout, kill switch, no external calls or runtime errors');
} catch (error) { console.error('UI errors:',errors); await page.screenshot({path:'/tmp/vitale-member-ui-failure.png',fullPage:true}); throw error; } finally { await browser.close(); }
