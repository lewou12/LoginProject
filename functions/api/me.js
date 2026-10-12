// Funções utilitárias de criptografia e cookie
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

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Extrair o cookie de sessão da requisição
  const sessionCookie = getCookie(request, '__Host-session');

  // Se não houver cookie, devolve erro 401 (Não autorizado)
  if (!sessionCookie) {
    return new Response(JSON.stringify({ error: 'Nenhuma sessão ativa.' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // 2. Calcular o resumo do cookie e verificar a expiração
  const sessionHash = await createHash(sessionCookie);
  const now = Math.floor(Date.now() / 1000);

  // Consultar o D1 à procura de uma sessão válida
  const session = await env.DB.prepare(
    `SELECT email, display_name FROM sessions WHERE id_hash = ? AND expires_at > ?`
  ).bind(sessionHash, now).first();

  // Se a sessão não existir ou já estiver expirada, devolve 401
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // 3. Devolver o perfil mínimo com o cabeçalho Cache-Control correto
  return new Response(JSON.stringify({
    email: session.email,
    displayName: session.display_name
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
