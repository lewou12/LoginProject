# Critérios de Aceitação

\[x\] O site é servido pelo endereço pages.dev com HTTPS.
\[x\] O código fonte não utiliza o Node.js nem o ficheiro package.json.
\[x\] A base de dados D1 tem as duas tabelas e os dois índices criados.
\[x\] As chaves Client ID e Client Secret não foram expostas no código fonte.
\[x\] A aplicação usa a Web Crypto API para SHA-256 e valores aleatórios (criptograficamente seguros).
\[x\] Os parâmetros state, nonce e code_challenge são gerados de forma segura e não previsível.
\[x\] A aplicação usa PKCE com o método S256 e verifica o code_challenge.
\[x\] O cookie transitório usa o prefixo \__Host- e configurações seguras (HttpOnly, Secure, SameSite=Lax).
\[x\] O redirecionamento 302 para o provedor contém todos os parâmetros obrigatórios.
\[x\] A rota de retorno valida o cookie transitório e o state.
\[x\] O código de autorização é trocado por tokens no back-end.
\[x\] O cookie de sessão usa o prefixo \__Host- e configurações seguras (HttpOnly, Secure, SameSite=Strict).
\[x\] Os identificadores das transações e sessões são guardados no D1 apenas como resumos criptográficos (hashes).
\[x\] As sessões têm um tempo de vida máximo de 24 horas e os tokens originais não são guardados.
\[x\] A rota /api/me resolve a sessão, não armazena em cache e devolve apenas o perfil mínimo.
\[x\] A rota /oauth/logout aceita apenas POST, verifica a origem e revoga a sessão no D1 e no navegador.
\[x\] Nenhuma informação sensível foi registada nos ficheiros de evidência.
\[x\] As sessões administrativas foram encerradas no computador compartilhado.

Assinado: Leonardo Mulhenhoff Borim