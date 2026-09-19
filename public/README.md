Ensalab

**Universidade:** UniBrasil Centro Universitário  
**Disciplina:** Prática Profissional em Desenvolvimento Web — Engenharia de Software  
**Turma:** 2ESAN 2026  
**Alunos:** Leonardo Mulhenhoff Borim e Douglas Soares Belmiro  

---

## Sobre o Projeto

O **EnsaLab** é um sistema web desenvolvido para solucionar o complexo desafio de "ensalamento" (alocação e gestão de salas de aula) no ambiente universitário. 

Muitas vezes, mudanças de última hora, conflitos de horário e a falta de comunicação dificultam a rotina de alunos e professores. Este projeto nasce para ser a fonte oficial e confiável de consulta de salas, garantindo que toda a comunidade acadêmica saiba exatamente onde e quando suas aulas irão acontecer. 

A aplicação foi desenhada para ser rápida, acessível e segura, substituindo planilhas manuais e avisos desorganizados por um painel centralizado.

## Escopo do Sistema

O foco principal da equipe é garantir a qualidade da consulta e a integridade da alocação de turmas, sem sobreposição ou conflitos.

### O que o sistema faz:
* **Consulta Simplificada:** Permite que os usuários localizem facilmente suas salas filtrando por campus, prédio, andar e turma.
* **Prevenção de Conflitos:** Aplica regras de negócio para impedir que duas turmas sejam alocadas na mesma sala no mesmo horário, considerando a capacidade do ambiente.
* **Gestão de Acessos:** Possui perfis de usuário definidos (Administrador, Coordenador, Professor e Aluno) acessados com segurança através de login unificado (Google/Microsoft), sem necessidade de decorar novas senhas.
* **Trilha de Auditoria:** Mantém um histórico de alterações, identificando quem alterou o ensalamento e qual foi o motivo da mudança.

### O que o sistema NÃO faz (Limites do Escopo):
* Não realiza matrículas, controle de notas, frequências ou conteúdo disciplinar.
* Não substitui o sistema acadêmico oficial da universidade, funcionando de forma complementar para a gestão física do espaço.
* Não rastreia a localização física dos usuários via GPS ou mapas internos complexos.
* Não exige algoritmos matemáticos complexos de otimização global, operando de forma prática e controlada pelos coordenadores.

---
*Projeto desenvolvido utilizando uma arquitetura moderna baseada em HTML, CSS, JavaScript e Supabase.*
