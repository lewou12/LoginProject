# Testes de Falha

### Caso 1: retorno sem cookie temporário
* **Preparação:** Início de login em janela comum interrompido. Cópia da URL de autorização do provedor para uma janela privativa que não possui o cookie `__Host-oauth-tx`.
* **Pedido enviado:** Conclusão do login no provedor utilizando a janela privativa.
* **Resultado esperado:** A rota de retorno deverá recusar a resposta e não criar uma sessão.
* **Resultado observado:** A aplicação bloqueou o processo e retornou o erro HTTP 400 (Cookie de transação ausente), impedindo a criação da sessão.

### Caso 2: state alterado
* **Preparação:** Início de login comum interrompido na página do provedor antes do envio das credenciais.
* **Pedido enviado:** Alteração de um caractere no parâmetro `state` diretamente na barra de endereços e prosseguimento do fluxo.
* **Resultado esperado:** A rota de retorno deverá recusar a resposta antes de trocar o código.
* **Resultado observado:** O sistema identificou a divergência do hash e retornou o erro HTTP 400 (State inválido), cancelando a autenticação.

### Caso 3: reutilização da transação
* **Preparação:** Login concluído com sucesso. Localização da requisição de callback no painel Network das ferramentas de desenvolvimento e cópia da sua URL completa.
* **Pedido enviado:** Abertura de uma nova aba e execução da mesma URL de callback copiada anteriormente.
* **Resultado esperado:** A transação já terá sido removida e a repetição deverá falhar.
* **Resultado observado:** A aplicação retornou o erro HTTP 400 (Transação expirada ou inexistente), comprovando que o registo foi apagado do banco D1 após a primeira utilização.

### Caso 4: sessão expirada
* **Preparação:** Sessão de teste criada com sucesso. Acesso ao console do banco de dados D1.
* **Pedido enviado:** Execução da instrução SQL `UPDATE sessions SET expires_at = 0;`. Recarregamento da página do projeto.
* **Resultado esperado:** A rota `/api/me` deverá responder 401.
* **Resultado observado:** Ao atualizar a interface, a requisição para `/api/me` falhou com erro HTTP 401, e o frontend atualizou o status para exibir que não há nenhuma sessão ativa.

### Caso 5: origem inválida na saída
* **Preparação:** Sessão válida e funcional aberta na URL base do projeto. Abertura de uma nova aba em uma origem diferente (`https://example.com`).
* **Pedido enviado:** Execução do comando `fetch("https://[NOME-DO-PROJETO].pages.dev/oauth/logout", { method: "POST", credentials: "include" });` diretamente no console do navegador da origem diferente.
* **Resultado esperado:** A rota deverá recusar a operação e a sessão original deve permanecer válida.
* **Resultado observado:** A requisição foi bloqueada com erro HTTP 403 (Origem inválida). Ao voltar para a aba do projeto, a sessão do usuário permaneceu ativa e intacta.

### Caso 6: reutilização do cookie revogado
* **Preparação:** Cópia temporária do valor do cookie `__Host-session` através das ferramentas de desenvolvimento em uma sessão ativa exclusiva de laboratório.
* **Pedido enviado:** Execução do botão de logout no projeto. Em seguida, restauração manual do cookie copiado e tentativa de consulta à rota `/api/me`.
* **Resultado esperado:** Como a linha correspondente foi removida do D1, a resposta deverá ser 401.
* **Resultado observado:** A requisição retornou erro HTTP 401. Mesmo com o cookie presente no navegador, a ausência da contraparte no banco de dados D1 impediu o restabelecimento da sessão.