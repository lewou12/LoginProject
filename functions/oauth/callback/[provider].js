// Funções utilitárias de criptografia e descodificaçã
async function createHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomString() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return JSON.parse(atob(base64));
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const provider = params.provider;
  const url = new URL(request.url);

  // 1. Recusar erros ou parâmetros em falta
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return new Response('Pedido inválido ou recusado.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  // 2. Exigir e processar o cookie temporário
  const txCookie = getCookie(request, '__Host-oauth-tx');
  if (!txCookie) {
    return new Response('Cookie de transação ausente.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  // 3. Calcular resumo do cookie e localizar transação
  const txIdHash = await createHash(txCookie);
  const txRecord = await env.DB.prepare(
    `SELECT * FROM oauth_transactions WHERE id_hash = ? AND expires_at > ?`
  ).bind(txIdHash, Math.floor(Date.now() / 1000)).first();

  // 5. Apagar a transação imediatamente (proteção contra reutilização)
  await env.DB.prepare(`DELETE FROM oauth_transactions WHERE id_hash = ?`).bind(txIdHash).run();

  if (!txRecord) {
    return new Response('Transação expirada ou inexistente.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

// 4. Comparar o resumo do state
  const stateHash = await createHash(state);
  if (stateHash !== txRecord.state_hash) {
    return new Response('State inválido.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const clientId = provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID;
  const clientSecret = provider === 'google' ? env.GOOGLE_CLIENT_SECRET : env.GITHUB_CLIENT_SECRET;
  const redirectUri = `${env.PUBLIC_BASE_URL}/oauth/callback/${provider}`;

  // 6. Trocar o código pelo token
  const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token';
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: txRecord.code_verifier
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: tokenBody.toString()
  });
  
  const tokenData = await tokenResponse.json();

  let subject, email, displayName, issuer;

  // 7. Validar identidade (Google OIDC)
  if (provider === 'google') {
    const idToken = tokenData.id_token;
    if (!idToken) return new Response('id_token ausente', { status: 400 });

    const parts = idToken.split('.');
    if (parts.length !== 3) return new Response('Formato JWT inválido', { status: 400 });

    const header = base64UrlDecode(parts[0]);
    if (header.alg !== 'RS256') return new Response('Algoritmo não suportado', { status: 400 });

    // Buscar chaves da Google
    const discoveryRes = await fetch('https://accounts.google.com/.well-known/openid-configuration');
    const discovery = await discoveryRes.json();
    const jwksRes = await fetch(discovery.jwks_uri);
    const jwks = await jwksRes.json();

    const jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) return new Response('Chave pública não encontrada', { status: 400 });

    // Importar a chave e verificar assinatura nativamente
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );

    const dataBuffer = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signatureBuffer = new Uint8Array(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0)));

    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signatureBuffer, dataBuffer);
    if (!isValid) return new Response('Assinatura JWT inválida', { status: 400 });

    const payload = base64UrlDecode(parts[1]);
    const now = Math.floor(Date.now() / 1000);

    // Validar propriedades do OIDC
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') return new Response('Emissor inválido', { status: 400 });
    if (payload.aud !== clientId) return new Response('Audiência inválida', { status: 400 });
    if (payload.exp < now) return new Response('Token expirado', { status: 400 });
    if (payload.nonce !== txRecord.nonce) return new Response('Nonce inválido', { status: 400 });

    issuer = payload.iss;
    subject = payload.sub;
    email = payload.email;
    displayName = payload.name;
  } 
  // 7. Validar identidade (GitHub)
  else if (provider === 'github') {
    const accessToken = tokenData.access_token;
    if (!accessToken || tokenData.token_type.toLowerCase() !== 'bearer') {
      return new Response('access_token ausente ou inválido', { status: 400 });
    }

    // Consultar o perfil
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'Cloudflare-Pages-Lab'
      }
    });
    const userData = await userRes.json();

    // Revogar a autorização da OAuth App imediatamente
    const revokeRes = await fetch(`https://api.github.com/applications/${clientId}/grant`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'Cloudflare-Pages-Lab'
      },
      body: JSON.stringify({ access_token: accessToken })
    });

    if (revokeRes.status !== 204) return new Response('Falha ao revogar token', { status: 500 });

    issuer = 'https://github.com';
    subject = userData.id.toString(); // Utilizar id numérico convertido em texto
    email = userData.email;
    displayName = userData.name || userData.login;
  }

  // 8. Criar sessão opaca (Duração de 8 horas)
  const sessionId = generateRandomString();
  const sessionIdHash = await createHash(sessionId);
  const now = Math.floor(Date.now() / 1000);
  const sessionExpiresAt = now + 28800; // 8 horas em segundos

  await env.DB.prepare(
    `INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(sessionIdHash, issuer, subject, email, displayName, sessionExpiresAt, now).run();

  // 9. Configurar cookies (Criar sessão rigorosa e apagar o temporário)
  const sessionCookie = `__Host-session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
  const clearTxCookie = `__Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

  // 10. Redirecionar para a página inicial
  return new Response(null, {
    status: 302,
    headers: new Headers([
      ['Location', env.PUBLIC_BASE_URL],
      ['Set-Cookie', sessionCookie],
      ['Set-Cookie', clearTxCookie],
      ['Cache-Control', 'no-store']
    ])
  });
}
