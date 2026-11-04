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
const testReferrals = process.env.MEMBER_TEST_COMMUNITY === 'true';
const screenshots = process.env.MEMBER_TEST_ARTIFACTS || (process.env.MEMBER_TEST_IDENTITY === 'true' ? '../artifacts/member-identity/' : testReferrals ? '../artifacts/community-membership/' : '../artifacts/member-accounts/');
const referralCode = 'a'.repeat(32);
let visits = 0, pendingReferrals = 0, confirmedReferrals = 0;
let dashboardError = false;
let profile = null;
let identity={emailVerified:false,phoneVerified:false,phoneMasked:null,canInteract:false};
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
  if (url.pathname.endsWith('/signup')) { user.user_metadata = input.data; return reply(session); }
  if (url.pathname.endsWith('/recover') || url.pathname.endsWith('/resend') || url.pathname.endsWith('/logout')) return reply({});
  if (url.pathname.endsWith('/token')) return input.email === 'erro@example.invalid' ? reply({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400) : reply(session);
  if (url.pathname.endsWith('/user')) return reply(user);
  if(url.pathname === '/rest/v1/rpc/member_classifieds') return reply({displayName:profile?.displayName??null,communityJoined:Boolean(profile?.communityJoinedAt),canAdvertise:false,canPublish:identity.canInteract,canUploadAvatar:identity.canInteract,avatarId:null,avatarPath:null});
  if (url.pathname === '/rest/v1/rpc/member_identity') {
    if(input.p_action==='verify') {
      if(input.p_payload.code!=='123456') return reply({ok:false,error:'identity_invalid_code'});
      if(input.p_payload.channel==='email') identity.emailVerified=true;
      else {identity.phoneVerified=true;identity.phoneMasked='+55 •• •••••-9999';}
      identity.canInteract=identity.emailVerified && identity.phoneVerified;return reply({ok:true});
    }
    return reply(identity);
  }
  if (url.pathname === '/functions/v1/member-identity-code') return reply({ok:true});
  if (url.pathname === '/rest/v1/rpc/member_referrals') return dashboardError ? reply({message:'unavailable'},503) : reply({enabled:true,code:referralCode,visits,pending:pendingReferrals,confirmed:confirmedReferrals,history:confirmedReferrals?[{day:'2026-11-03',confirmed:confirmedReferrals}]:[]});
  if (url.pathname === '/functions/v1/member-password-recovery') return reply({ok:true});
  if (url.pathname === '/functions/v1/newsletter-interest') {
    if (input.action==='community_referral_visit') visits++;
    else assert(input.email && input.name && input.consent===true);
    return reply({ok:true});
  }
  if (url.pathname === '/rest/v1/rpc/member_community_account') {
    if (input.p_action === 'join' && !profile?.communityJoinedAt) {
      profile = { displayName:input.p_payload.displayName || user.user_metadata.display_name, suspended:false,createdAt:new Date().toISOString(), communityJoinedAt:new Date().toISOString(),newsletterSubscribed:true };
    }
    return reply(profile);
  }
  assert.equal(url.pathname, '/rest/v1/rpc/member_community');
  const payload = input.p_payload;
  switch (input.p_action) {
    case 'status': return reply({ enabled: communityEnabled });
    case 'profile': return reply(profile);
    case 'save_profile': profile = { ...profile, displayName: payload.displayName, suspended: false, createdAt: new Date().toISOString() }; return reply(profile);
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
  const response = await page.goto(`${origin}/conta?modo=perfil`);
  assert.equal(response.headers()['cache-control'], 'private, no-store');
  assert.match(await page.locator('meta[name="robots"]').last().getAttribute('content'), /noindex/);
  await page.getByRole('heading', {name:'Entre na comunidade Vitale'}).waitFor();
  await page.getByRole('button', {name:'Criar conta gratuita',exact:true}).click();
  await page.getByLabel('Nome público',{exact:true}).fill('Leitor teste');
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByLabel('Senha',{exact:true}).fill('minha-senha-local-123');
  await page.getByRole('checkbox').filter({hasNotText:'Aceito receber'}).first().check();
  await mkdir(new URL(screenshots,import.meta.url),{recursive:true});
  await page.screenshot({path:new URL(screenshots+'signup-mobile.png',import.meta.url).pathname,fullPage:true});
  await page.getByRole('button',{name:'Criar conta',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Reenviar confirmação de e-mail'}).count(),0);
  await page.goto(fixture('comments'));
  await page.getByRole('link',{name:'Valide seu e-mail e celular para comentar',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Seu comentário',{exact:true}).count(),0);
  await page.goto(`${origin}/conta?modo=perfil`);
  await page.getByRole('button',{name:'Enviar código por e-mail',exact:true}).click();
  await page.getByLabel('Código recebido por e-mail',{exact:true}).fill('000000');
  await page.getByRole('button',{name:'Validar e-mail',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Código inválido'}).waitFor();
  await page.getByLabel('Código recebido por e-mail',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Validar e-mail',exact:true}).click();
  await page.getByRole('heading',{name:'E-mail: validado',exact:true}).waitFor();
  await page.getByLabel('Celular com DDD',{exact:true}).fill('(11) 99999-9999');
  await page.getByRole('checkbox',{name:'Aceito receber um código no WhatsApp para validar meu celular.',exact:true}).check();
  await page.getByRole('button',{name:'Enviar código pelo WhatsApp',exact:true}).click();
  await page.getByLabel('Código recebido no WhatsApp',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Validar celular',exact:true}).click();
  await page.getByRole('status').filter({hasText:'E-mail e celular validados'}).waitFor();
  await page.getByRole('region',{name:'Valide seu acesso',exact:true}).screenshot({path:new URL(screenshots+'identity-panel-mobile.png',import.meta.url).pathname,style:'header {visibility:hidden;}'});
  assert(requests.some(r=>r.path.endsWith('member-identity-code') && r.input.channel==='phone' && r.input.phone==='+5511999999999' && r.input.consent===true));
  console.log('PASS restricted interaction before verification; two code forms, retry and successful email/mobile validation');

  assert.equal(requests.filter(r=>r.path.endsWith('/signup')).length,1);
  const metadata = requests.find(r=>r.path.endsWith('/signup')).input.data;
  assert.deepEqual(metadata,{display_name:'Leitor teste',community_consent_version:'2026-11-03',community_newsletter_consent:true});
  assert(!requests.some(r=>/newsletter|quiz|editorial-admin/.test(r.path)));
  await page.getByRole('button',{name:'Sair desta conta',exact:true}).click();
  await page.getByRole('heading',{name:'Entre na comunidade Vitale'}).waitFor();
  await page.getByLabel('E-mail',{exact:true}).fill('erro@example.invalid');
  await page.getByLabel('Senha',{exact:true}).fill('senha-errada');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Não foi possível entrar'}).waitFor();
  await page.getByRole('button',{name:'Esqueci minha senha'}).click();
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
  await page.getByRole('status').filter({hasText:'Se houver uma conta'}).waitFor();
  assert(requests.some(r=>r.path.endsWith('/member-password-recovery')));
  assert(!requests.some(r=>r.path.endsWith('/recover') || r.path.endsWith('/resend')));
  await page.getByRole('button',{name:'Voltar para entrar',exact:true}).click();
  await page.getByLabel('Senha',{exact:true}).fill('minha-senha-local-123');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Editar meu perfil',exact:true}).waitFor();
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).waitFor();
  assert.equal(requests.filter(r=>r.path.endsWith('member_community_account') && r.input.p_action==='join').length,1);
  await page.getByLabel('Nome público',{exact:true}).fill('Meu nome público');
  await page.getByRole('button',{name:'Salvar perfil'}).click();
  await page.getByRole('status').filter({hasText:'Perfil salvo'}).waitFor();
  await page.getByRole('button',{name:'Alterar senha',exact:true}).click();
  await page.getByLabel('Nova senha',{exact:true}).fill('nova-senha-local-123');
  await page.getByRole('button',{name:'Salvar nova senha'}).click();
  await page.getByRole('status').filter({hasText:'Senha atualizada'}).waitFor();
  assert(requests.some(r=>r.path.endsWith('/user') && r.input.password === 'nova-senha-local-123'));
  await mkdir(new URL(screenshots,import.meta.url),{recursive:true});
  await page.screenshot({path: new URL(screenshots+'account-mobile.png',import.meta.url).pathname,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({width:1024,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({path:new URL(screenshots+'account-desktop.png',import.meta.url).pathname,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  console.log('PASS immediate keyboard signup without confirmation email, mobile/desktop layout, login failure/success, password recovery/update, profile and one automatic community/newsletter adhesion');

  if (testReferrals) {
    const invitation = page.getByRole('textbox',{name:'Seu link pessoal',exact:true});
    await invitation.waitFor();
    assert.equal(await invitation.inputValue(),`https://vitalemobilidade.com/conta?modo=cadastro&convite=${referralCode}`);
    const whatsapp = await page.getByRole('link',{name:'Compartilhar no WhatsApp'}).getAttribute('href');
    assert.equal(new URL(whatsapp).hostname,'wa.me');
    assert(new URL(whatsapp).searchParams.get('text').includes(`convite=${referralCode}`));
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
    await page.getByRole('button',{name:'Copiar convite'}).click();
    await page.getByRole('status').filter({hasText:'Link copiado'}).waitFor();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await invitation.inputValue());
    dashboardError=true;
    await page.getByRole('button',{name:'Atualizar indicações'}).click();
    await page.getByRole('alert').waitFor();
    dashboardError=false;
    await page.getByRole('button',{name:'Atualizar indicações'}).click();
    await page.getByRole('alert').waitFor({state:'hidden'});
    console.log('PASS stable personal invitation, clipboard, encoded WhatsApp link and dashboard error/retry');

    await page.goto(`${origin}/newsletter?ref=${referralCode}`,{waitUntil:"networkidle"});
    assert.equal(await page.getByRole('link',{name:'Criar conta e participar',exact:true}).count(),0);
    assert.equal(await page.getByRole('link',{name:'crie sua conta',exact:true}).count(),0);
    assert.equal(await page.locator('input[type="email"]').count(),1);
    const signupBefore=requests.filter(r=>r.path.endsWith('/signup')).length;
    await page.getByLabel('Seu nome',{exact:true}).fill('Só newsletter');
    await page.getByLabel('Seu e-mail',{exact:true}).fill('newsletter-only@example.invalid');
    await page.getByRole('checkbox').check();
    await page.screenshot({path:new URL(screenshots+'invitation-newsletter-mobile.png',import.meta.url).pathname,fullPage:true});
    await page.getByRole('region',{name:'Inscrição na newsletter',exact:true}).screenshot({path:new URL(screenshots+'newsletter-only-mobile.png',import.meta.url).pathname,style:'header {visibility:hidden;}'});
    await page.getByRole('button',{name:'Cadastrar e-mail',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Cadastro confirmado. Guardamos seu nome e e-mail'}).waitFor();
    assert.equal(requests.filter(r=>r.path.endsWith('/signup')).length,signupBefore);
    assert(requests.some(r=>r.path.endsWith('newsletter-interest') && r.input.email==='newsletter-only@example.invalid' && r.input.consent===true));
    assert(!requests.some(r=>r.input.action==='community_referral_visit' && r.input.referralCode===referralCode));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://vitalemobilidade.com/newsletter');
    await page.goto(`${origin}/conta?modo=perfil`);
    await page.getByRole('textbox',{name:'Seu link pessoal',exact:true}).waitFor();
    await page.getByRole('region',{name:'Convide para a comunidade',exact:true}).screenshot({path:new URL(screenshots+'referral-panel-mobile.png',import.meta.url).pathname,style:'header { visibility:hidden; }'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    const joinsBefore=requests.filter(r=>r.path.endsWith('member_community_account') && r.input.p_action==='join').length;
    profile.newsletterSubscribed=false;
    await page.reload();
    await page.getByRole('button',{name:'Salvar perfil',exact:true}).waitFor();
    assert.equal(await page.getByText('assinatura cancelada',{exact:true}).count(),0);
    assert.equal(requests.filter(r=>r.path.endsWith('member_community_account') && r.input.p_action==='join').length,joinsBefore);
    console.log('PASS community invitation links/metrics, independent newsletter capture, no second confirmation and later unsubscribe preserved');

  }

  await page.goto(fixture('comments'));
  await page.getByText('<img src=x onerror=alert(1)> dúvida',{exact:true}).waitFor();
  assert.equal(await page.locator('img').count(),0);
  assert.equal(await page.locator('script:not([type="module"])').count(),0);
  await page.getByLabel('Seu comentário').fill('Minha dúvida sobre esta bike.');
  await page.getByRole('button',{name:'Enviar para moderação'}).click();
  await page.getByText('Aguardando moderação · visível só para você',{exact:true}).waitFor();
  await page.screenshot({path:new URL(screenshots+'comments-mobile.png',import.meta.url).pathname,fullPage:true});
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

  await page.goto(`${origin}/conta?modo=perfil`);
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  await page.getByRole('heading',{name:'Entre na comunidade Vitale'}).waitFor();
  await page.goto(`${origin}/conta?modo=senha`);
  await page.getByRole('heading',{name:'Recuperar acesso'}).waitFor();
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
  await page.getByRole('status').filter({hasText:'Se houver uma conta'}).waitFor();
  await page.goto(`${origin}/conta?modo=senha#access_token=${token}&refresh_token=fake-local-refresh&expires_in=3600&token_type=bearer&type=recovery`);
  await page.getByRole('heading',{name:'Definir nova senha'}).waitFor();
  await page.getByLabel('Nova senha',{exact:true}).fill('senha-do-link-local-123');
  await page.getByRole('button',{name:'Salvar nova senha'}).click();
  await page.waitForURL(url=>url.pathname==='/');
  await page.goto(`${origin}/conta?modo=perfil`);
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  await page.getByRole('heading',{name:'Entre na comunidade Vitale'}).waitFor();
  console.log('PASS expired/missing recovery session fallback and simulated email recovery callback');
  user.user_metadata={display_name:'Conta antiga'}; profile=null;
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByLabel('Senha',{exact:true}).fill('minha-senha-local-123');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:'Entrar na comunidade',exact:true}).waitFor();
  assert.equal(profile,null);
  await page.getByRole('checkbox').filter({hasNotText:'Aceito receber'}).first().check();
  await page.getByRole('button',{name:'Entrar na comunidade',exact:true}).click();
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).waitFor();
  assert(requests.some(r=>r.input.p_action==='join' && r.input.p_payload.acknowledged===true));
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  console.log('PASS old account joins only after explicit combined consent');
  // A normal login returns to its actual origin, including harmless UI state.
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${origin}/radar?compare=v9_max%2Cv8_pro#bikes`);
  assert.equal(await page.getByRole('link',{name:'Entrar',exact:true}).count(),0,'signin discovery is on hold');
  await page.goto(`${origin}/conta?retorno=${encodeURIComponent('/radar?compare=v9_max%2Cv8_pro#bikes')}`);
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill('local-login-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/radar');assert.equal(new URL(page.url()).searchParams.get('compare'),'v9_max,v8_pro');assert.equal(new URL(page.url()).hash,'#bikes');
  await page.goBack();assert.notEqual(new URL(page.url()).pathname,'/conta','successful login replaces the auth entry in history');await page.goForward();
  const avatar=page.getByRole('button',{name:'Abrir menu da minha conta'});await avatar.waitFor();assert(!(await avatar.innerText()).includes('Minha conta'));
  assert.equal(await page.locator('nav[aria-label="Principal"] a').first().evaluate(e=>getComputedStyle(e).fontSize),'16px');
  await avatar.click();assert((await page.getByRole('menuitem',{name:'Editar meu perfil'}).getAttribute('href')).includes('modo=perfil'));await page.getByRole('menuitem',{name:'Editar meu perfil'}).click();await page.getByRole('heading',{name:'Editar meu perfil',exact:true}).waitFor();await page.getByRole('button',{name:'Salvar perfil'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('modo'),'perfil');
  await page.getByRole('button',{name:'Sair desta conta'}).click();
  // Public CTA shows no advertising fee and returns the member to the editor.
  await page.goto(`${origin}/venda-sua-bike`);await page.getByRole('heading',{name:'Quer vender sua bike aqui?',exact:true}).waitFor();assert(!/R\$\s*150/.test(await page.locator('body').innerText()));
  await page.getByRole('link',{name:'Anuncie sua bike',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('retorno'),'/conta/anuncios');
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill('local-login-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(url=>url.pathname==='/conta/anuncios');
  await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();await page.getByRole('menuitem',{name:'Sair',exact:true}).click();await page.getByRole('button',{name:'Abrir menu da minha conta'}).waitFor({state:'hidden'});assert.equal(await page.getByRole('link',{name:'Entrar',exact:true}).count(),0);
  // Signup finishes membership/newsletter once and immediately returns, no profile step.
  profile=null;const joinsAtSignup=requests.filter(r=>r.input.p_action==='join').length;
  await page.goto(`${origin}/conta?modo=cadastro&retorno=%2Fconteudos`);await page.getByLabel('Nome público',{exact:true}).fill('Novo leitor');await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill('local-signup-password');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.waitForURL(url=>url.pathname==='/conteudos');assert(profile.newsletterSubscribed);assert.equal(requests.filter(r=>r.input.p_action==='join').length,joinsAtSignup+1);
  await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();await page.getByRole('menuitem',{name:'Sair',exact:true}).click();await page.getByRole('button',{name:'Abrir menu da minha conta'}).waitFor({state:'hidden'});assert.equal(await page.getByRole('link',{name:'Entrar',exact:true}).count(),0);
  // Recovery keeps navigation context in the same browser, waits for the new password.
  await page.goto(`${origin}/conta?retorno=${encodeURIComponent('/radar?compare=v9_max,v8_pro#bikes')}`);await page.getByRole('button',{name:'Esqueci minha senha'}).click();assert.equal(await page.getByRole('button',{name:'Esqueci minha senha'}).count(),0);assert.equal(await page.getByText('Sua conta inclui a newsletter.',{exact:false}).count(),0);assert.equal(await page.getByRole('link',{name:'Explorar os artigos'}).count(),0);
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Enviar link de recuperação'}).click();await page.getByRole('status').filter({hasText:'Se houver uma conta'}).waitFor();await page.screenshot({path:new URL(screenshots+'recovery-clean.png',import.meta.url).pathname,fullPage:true});
  await page.goto(`${origin}/conta?modo=senha#access_token=${token}&refresh_token=fake-local-refresh&expires_in=3600&token_type=bearer&type=recovery`);await page.getByRole('heading',{name:'Definir nova senha'}).waitFor();assert.equal(new URL(page.url()).pathname,'/conta');await page.getByLabel('Nova senha',{exact:true}).fill('local-recovered-password');await page.getByRole('button',{name:'Salvar nova senha'}).click();await page.waitForURL(url=>url.pathname==='/radar');assert.equal(new URL(page.url()).hash,'#bikes');assert.equal(new URL(page.url()).searchParams.get('compare'),'v9_max,v8_pro');
  await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();await page.getByRole('menuitem',{name:'Sair',exact:true}).click();
  console.log('PASS origin-preserving login/signup/recovery; explicit profile only; avatar-only menu at 16px; public CTA to authenticated editor and private fee');
  communityEnabled = false;
  await page.goto(`${origin}/conta?modo=perfil`);
  await page.getByText('A comunidade está temporariamente indisponível.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar conta gratuita',exact:true}).count(),0);
  // All non-local requests are aborted by the context route above.
  assert(!requests.some(r=>/stripe|payment/.test(r.path)));
  assert.deepEqual(errors,[]);
  console.log('PASS logout, kill switch, no external calls or runtime errors');
} catch (error) { console.error('UI errors:',errors); await page.screenshot({path:'/tmp/vitale-member-ui-failure.png',fullPage:true}); throw error; } finally { await browser.close(); }
