# Avaliação GitHub Actions - Entrega
**Nome:** Leonardo Mulhenhoff Borim

## Tarefa 1: CI a cada commit
- **Execução Verde:** [COLE O SEU LINK DA EXECUÇÃO VERDE AQUI]
- **Execução Vermelha:** https://github.com/lewou12/LoginProject/actions/runs/38293796780
- **Erro detectado no log:** `Error: near "INT": syntax error` (ajuste se o log exibiu diferente)
- **Por que testar no SQLite local antes do D1?** Testar no banco SQLite em um ambiente isolado e descartável (CI) garante que eventuais erros de sintaxe ou lógicos nas migrações sejam detectados e barrados gratuitamente antes que qualquer código inválido chegue a corromper o banco D1 que está em produção.

## Tarefa 2: Proteger a main com o CI
- **PR Bloqueado:** https://github.com/lewou12/LoginProject/pull/1
- **PR Liberado:** [COLE O LINK DO PR VERDE/LIBERADO AQUI]
- **Saída do `git push` recusado:** 
```text
main (push declined due to repository rule violations)
```

## Tarefa 3: Revisão de PR por IA
- **PR com os 2 comentários da IA:** [COLE O LINK DO SEU PR COM OS DOIS COMENTÁRIOS DA IA]
- **Log do erro de permissão (pull-requests: write removido):**
```text
HttpError: Resource not accessible by integration - 403 Forbidden
```
- **Crítica à IA (Afirmação errada ou irrelevante):** Em um dos nossos testes, a IA exigiu a importação e a instanciação manual do banco de dados no arquivo, sugerindo isso como uma vulnerabilidade/falha. No entanto, ela ignorou completamente a arquitetura de nuvem do nosso projeto (Cloudflare Pages Functions), onde o objeto `env` contendo a *binding* do banco D1 é injetado dinamicamente pelo próprio *runtime*, sem exigir importações no código, provando que a IA carece de contexto estrutural do ecossistema.

## Tarefa 4: Migrações D1 depois do merge (+ Bônus)
- **Execução do Merge (Workflow rodou):** [COLE O LINK DA EXECUÇÃO DO FLUXO MIGRAR AQUI]
- **Resumo por IA (Bônus):** O resumo gerado pela IA sobre as migrações aplicadas está visível no `$GITHUB_STEP_SUMMARY` do link da execução acima.
- **Saída do comando PRAGMA table_info:**
```text
[COLE AQUI A SAÍDA DO COMANDO MOSTRANDO A COLUNA NOVA]
```
- **Prova do segundo merge sem execução:** [COLE AQUI O LINK DO PR OU PRINT ONDE O FLUXO MIGRAR FOI IGNORADO DEVIDO AO FILTRO DE PATHS NO README]

---

## Respostas às Perguntas

**1. O ci.yml roda duas vezes quando você faz push numa ramificação com PR aberto. Por quê, e qual das duas execuções o status check da main considera?**
O workflow roda duas vezes porque há dois gatilhos independentes configurados para o disparo: o evento `push` (que avalia diretamente a ramificação onde o push foi feito) e o evento `pull_request` (que gera um commit simulando a integração e o resultado do merge com a branch de destino). Para liberar a branch `main`, o status check exige e considera obrigatoriamente a execução proveniente do evento de `pull_request`.

**2. Por que um PR vindo de um fork não consegue usar secrets.COPILOT_PAT? Qual ataque essa regra impede?**
Esta regra de bloqueio serve para impedir ataques de exfiltração de chaves e dados sensíveis. Sem ela, um agente mal-intencionado poderia fazer um fork público do nosso projeto, alterar os passos do GitHub Actions para imprimir as chaves da conta no log (como por exemplo `echo ${{ secrets.COPILOT_PAT }}`), e abrir um PR visando executar o fluxo no nosso ambiente para roubar os acessos privados.

**3. Por que o workflow da Tarefa 3 declara permissions em vez de usar as permissões padrão do GITHUB_TOKEN?**
Essa declaração aplica o Princípio do Privilégio Mínimo. O token padrão (`GITHUB_TOKEN`) frequentemente vem configurado nas configurações globais com acessos restritos (read-only) por segurança. Ao declarar explicitamente `permissions: pull-requests: write`, concedemos ao runner estritamente a permissão de escrita pontual que ele precisa para publicar o comentário da análise, sem lhe atribuir poderes amplos ou perigosos sobre o código-fonte do repositório.

**4. A revisão da IA pode substituir o status check da Tarefa 2? Justifique com o que você observou no item 4 da Tarefa 3.**
Não pode substituir. O status check da Tarefa 2 executa compilação e validação lógica determinística (como a verificação de sintaxe SQL e linting de HTML), garantindo de forma binária se a aplicação está apta ou não. A inteligência artificial opera com modelos não-determinísticos e contextualmente limitados (conforme observamos na Tarefa 3, ao gerar falsos positivos sobre bibliotecas não importadas no Cloudflare). A segurança de uma branch de produção exige ferramentas exatas e reprodutíveis que comprovem a integridade estrutural.