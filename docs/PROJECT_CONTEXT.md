# PROJECT CONTEXT — Cybersecurity Community Platform

## 1. Visão geral

Estamos desenvolvendo uma plataforma internacional e open source voltada à comunidade de cibersegurança.

O objetivo é centralizar ferramentas, projetos, scripts, laboratórios práticos, tutoriais, documentações e conhecimento técnico em um único ambiente, permitindo que profissionais, estudantes e entusiastas aprendam, compartilhem experiências e colaborem.

A plataforma também terá um fórum integrado para discussões técnicas, dúvidas, tutoriais e compartilhamento de projetos.

- **Nome do projeto:** **Vexor** (repositório local: `cybersec-community-platform`).
- **Alcance:** Internacional.
- **Idiomas:** Português e inglês (`pt-BR` / `en`).
- **Modelo:** Open source e comunitário.
- **Público:** Iniciantes, estudantes, profissionais e especialistas em cibersegurança.

## 2. Objetivos do produto

- Facilitar a descoberta de ferramentas de cibersegurança.
- Organizar projetos open source e repositórios GitHub.
- Compartilhar scripts, frameworks, tutoriais e laboratórios.
- Criar uma comunidade para troca de conhecimento.
- Permitir que usuários contribuam com novos recursos.
- Construir uma base colaborativa de conhecimento técnico.
- Incentivar aprendizado prático e desenvolvimento profissional.

## 3. Público-alvo

- Iniciantes em cibersegurança.
- Estudantes e pessoas em transição de carreira.
- Analistas SOC e profissionais de Blue Team.
- Pentesters e profissionais de Red Team.
- Pesquisadores de segurança.
- Especialistas em forense digital e resposta a incidentes.
- Profissionais de segurança em nuvem, AppSec e GRC.

## 4. Funcionalidades do MVP

### 4.1. Catálogo de recursos
- **Tipos:** Ferramentas, Projetos/Repositórios GitHub, Scripts, Frameworks, Documentações, Laboratórios práticos, Plataformas CTF, Cursos/Tutoriais, Artigos técnicos.
- **Atributos:** Nome, Descrição (até 2.000 caracteres), Categoria, Tipo, Link oficial, Idioma, Dificuldade (opcional), Autor/Organização, Data de inclusão (`published_at`).
- **Funcionalidades:** Pesquisa textual (`tsvector` + `pg_trgm`), filtros por categoria/tipo/dificuldade, página individual do recurso, favoritos (`bookmarks`).

### 4.2. Fórum comunitário
- Criar tópicos, responder discussões, organizar por categorias, utilizar até 5 tags, votar em respostas (`votes`), marcar resposta como solução (`accepted_post_id`), denunciar conteúdo (`reports`), busca textual em tópicos (`search_vector`).

### 4.3. Cadastro e perfis
- Conta via Supabase Auth, `username`, foto (`avatars` bucket), biografia, interesses, links GitHub e LinkedIn, consulta de contribuições e favoritos.

### 4.4. Contribuição comunitária
- Submissão com status `pending` $\rightarrow$ análise por moderador/admin $\rightarrow$ `approved` ou `rejected` (com motivo obrigatório e possibilidade de reenvio).

### 4.5. Administração e moderação
- Aprovar/rejeitar/arquivar recursos, gerenciar categorias (auditado), moderar tópicos/respostas (ocultar, apagar, fixar, bloquear), tratar denúncias, gerenciar papéis (`member`, `moderator`, `admin`) e suspensões, consultar `audit_logs`.

## 5. Categorias iniciais

1. Blue Team
2. Red Team
3. OSINT
4. DFIR — Digital Forensics and Incident Response
5. Application Security
6. Cloud Security
7. Threat Intelligence
8. Malware Analysis
9. Network Security
10. GRC — Governance, Risk and Compliance
11. AI Security
12. Career & Learning

## 6. Identidade visual

- **Modo padrão:** Dark mode.
- **Paleta:** Fundo azul muito escuro / grafite; cor principal ciano / verde-água; secundária azul / roxo; texto branco e cinza claro; cards com bordas discretas.
- **Marca:** Ainda em definição (não fixar nome definitivo, domínio ou logotipo sem aprovação).

## 7. Stack tecnológica e decisões técnicas do MVP

- **Frontend:** Next.js 16 (App Router, `src/proxy.ts` em runtime Node.js), React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend e Infraestrutura:** Supabase (PostgreSQL 15+, Supabase Auth, Supabase Storage, RLS + Column-Level Grants).
- **Rate Limiting (MVP):** Armazenamento compartilhado no próprio PostgreSQL/Supabase (sem Upstash/Redis no MVP), com operações atômicas, acesso restrito à tabela de controle, limpeza de registros expirados, sem depender de memória local do processo e sem armazenar IPs em texto puro.
- **Hospedagem:** Vercel.
- **Versionamento:** Git / GitHub público.
