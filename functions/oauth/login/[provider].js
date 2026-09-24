// 1. Funções utilitárias de criptografia (Web Crypto API)
function generateRandomString() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Codificação Base64URL sem preenchimento (=)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Converte para hexadecimal para armazenar no D1
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // PKCE exige Base64URL do resumo SHA-256
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 2. Manipulador principal da rota GET
export async function onRequestGet(context) {
  const provider = context.params.provider;

  // Rejeitar qualquer provedor inválido com erro 404 genérico
  if (provider !== 'google' && provider !== 'github') {
    return new Response('Not Found', { status: 404 });
  }

  // Gerar chaves aleatórias da transação
  const txId = generateRandomString();
  const state = generateRandomString();
  const codeVerifier = generateRandomString();
  // Nonce é exclusivo do fluxo OIDC do Google
  const nonce = provider === 'google' ? generateRandomString() : null;

  // Calcular resumos e desafios criptográficos
  const txIdHash = await createHash(txId);
  const stateHash = await createHash(state);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  // Calcular expiração do cookie e da transação no banco (10 minutos / 600 segundos)
  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  // 3. Salvar transação no D1 (guardando apenas os hashes para segurança)
await context.env.DB.prepare(
    `INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(txIdHash, provider, stateHash, nonce, codeVerifier, expiresAt).run();

  // 4. Construir a URL de autorização
  const clientId = provider === 'google'
    ? context.env.GOOGLE_CLIENT_ID
    : context.env.GITHUB_CLIENT_ID;

  // Utilizar a variável de ambiente para garantir a origem exata (sem barra no final)
  const redirectUri = `${context.env.PUBLIC_BASE_URL}/oauth/callback/${provider}`;

  const authUrl = new URL(
    provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : 'https://github.com/login/oauth/authorize'
  );

  // Parâmetros comuns aos dois provedores
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state); // state enviado em texto claro
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Parâmetros exclusivos do Google
  if (provider === 'google') {
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('nonce', nonce);
  }

  // 5. Contrato exato do Cookie de Transação
  const cookie = `__Host-oauth-tx=${txId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;

  // 6. Redirecionar usuário (Status 302)
  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl.toString(),
      'Set-Cookie': cookie
    }
  });
}
