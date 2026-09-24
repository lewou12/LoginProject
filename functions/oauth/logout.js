// Funções utilitárias
async function createHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// 1. A exportação como onRequestPost garante que apenas pedidos POST são aceites
export async function onRequestPost(context) {
  const { request, env } = context;

  // 2. Exigir o cabeçalho Origin exatamente igual à PUBLIC_BASE_URL
  const origin = request.headers.get('Origin');
  if (origin !== env.PUBLIC_BASE_URL) {
    return new Response('Origem inválida', { 
        status: 403, 
        headers: { 'Cache-Control': 'no-store' } 
    });
  }

  // Extrair o cookie de sessão para saber quem está a fazer logout
  const sessionCookie = getCookie(request, '__Host-session');

  if (sessionCookie) {
    // Calcular o resumo criptográfico do cookie
    const sessionHash = await createHash(sessionCookie);

    // 3. Remover a linha da sessão no D1
    await env.DB.prepare(`DELETE FROM sessions WHERE id_hash = ?`).bind(sessionHash).run();
  }

  // 4. Expirar o cookie definindo Max-Age como 0 e o valor vazio
  const clearSessionCookie = `__Host-session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

  // 5. Responder com redirecionamento para a página inicial e Cache-Control: no-store
  return new Response(null, {
    status: 302,
    headers: new Headers([
      ['Location', env.PUBLIC_BASE_URL],
      ['Set-Cookie', clearSessionCookie],
      ['Cache-Control', 'no-store']
    ])
  });
}
