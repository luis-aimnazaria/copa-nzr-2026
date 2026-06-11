# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O projeto

Bolão da Copa do Mundo 2026 da Nazária Distribuidora (React 19 + Vite + TypeScript estrito + Tailwind v4, UI em pt-BR, dark mode mobile-first). Sem autenticação: o **e-mail é o identificador único** do participante. Está em produção com usuários reais durante a Copa (jun–jul/2026).

## Comandos

```bash
npm run dev        # dev server (proxy /wc-api configurado no vite.config.ts)
npm run build      # tsc --noEmit && vite build — é o type-check; rode antes de commitar
npx vercel deploy --prod --yes   # publica em produção (veja "Deploy" abaixo)
```

Não há testes automatizados. A pontuação foi validada manualmente com `node --experimental-strip-types -e "import('./src/utils/scoring.ts').then(...)"` (funciona para módulos sem import de JSON).

## Deploy — atenção

- **A Vercel NÃO está conectada ao GitHub.** `git push` não publica nada; o deploy é manual com `npx vercel deploy --prod --yes` (CLI já autenticado como `luis-aimnazaria`, projeto `luis-nzr-projects/copa-nzr-2026`, URL pública `copa-nzr-2026.vercel.app`).
- Workflow padrão de mudança: build → commit → push → deploy manual.
- `vercel.json` faz o rewrite `/wc-api/*` → `worldcup26.ir` em produção (mesmo papel do proxy do Vite em dev). A API não envia CORS, então o proxy é obrigatório.
- Env vars (embutidas no bundle no build): `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (aceita-se também `VITE_SUPABASE_ANON_KEY`). Local: `.env.local` (existe e não é versionado). Sem elas o app cai em LocalStorage (modo demo, dados só no navegador).

## Arquitetura — fluxo de dados

Duas fontes convergem em `matchService.getMatches()`, a única fonte de jogos das telas:

1. **Calendário/placares** — `services/fifaApi.ts` consome a World Cup 2026 API (`worldcup26.ir`, 104 jogos, 48 seleções reais) com **três camadas de fallback**: API ao vivo (com 1 retry — o servidor oscila em dia de jogo) → última resposta boa em `localStorage` (`bolao2026:apiCache`) → snapshot estático em `src/data/*.snapshot.json`. Se "placares ao vivo sumiram", suspeite da API instável caindo para camada 2/3.
2. **Apuração manual** — tabela `results` no Supabase (aba Apuração, senha em `AdminPage.tsx`). O resultado da API tem prioridade: `realScore = api ?? results[id]`. `getMatches()` também **sincroniza** resultados que a API encerrou para a tabela `results` (fire-and-forget; é o que ativa a trava server-side de palpites).

**Pontuação é sempre derivada, nunca gravada** (`utils/scoring.ts`): palpite × resultado recalculado a cada render. `realScore` gera pontos definitivos; `liveScore` (jogo em andamento) gera pontos *parciais*, que entram no total exibido e na ordenação do ranking com selo vermelho "parcial". Regras: 25 em cheio / 18 vencedor+saldo / 15 vencedor+gols de um time / 10 só vencedor / 0 — avaliadas nessa ordem, vale a maior. O balão de regras (`components/ScoringRules.tsx`) lê as constantes `POINTS`; não duplique valores.

**Persistência** — as telas só conhecem a interface `StorageAdapter` (`services/storage/`); `storage/index.ts` escolhe `SupabaseAdapter` (env presente) ou `LocalStorageAdapter`. No Supabase os palpites são normalizados em `predictions` (1 linha por e-mail × jogo); `saveUser` faz **diff por linha** (só grava o que mudou, deleta o que sumiu) — isso evita last-write-wins entre dispositivos e não esbarra no trigger. Um trigger Postgres (`predictions_lock`) **rejeita** insert/update de palpite cujo jogo já está em `results` — a trava de palpites é server-side, não confie só na UI.

## Gotchas da API externa

- Todos os campos vêm como **string** (`finished: "TRUE"|"FALSE"`, ids numéricos como string, placares como string).
- `local_date` é **hora local do estádio** (formato MM/DD/YYYY HH:mm). A conversão para UTC usa o mapa `STADIUM_TIMEZONES` (id do estádio → fuso IANA) em `fifaApi.ts`. Nunca interprete essas datas no fuso do navegador.
- Jogo ao vivo: `time_elapsed: "live"` com `finished: "FALSE"`. Vagas indefinidas do mata-mata: `home_team_id: "0"` + `home_team_label` ("Winner Group D" etc., traduzidos em `translateLabel`).
- Nomes das seleções são traduzidos via `TEAM_NAMES_PT` (chave = código FIFA); bandeiras são URLs do flagcdn (time `TBD` tem `flag: ''` e renderiza placeholder ⚽).

## Banco (Supabase)

- `supabase/schema.sql` = instalação do zero; `supabase/migration-001-predictions.sql` = migração aplicada no banco atual. Ambos são idempotentes (`drop policy if exists` antes de criar). Mudanças de schema são coladas manualmente no SQL Editor do dashboard — não há CLI/migration runner.
- RLS ativa com políticas permissivas para `anon` (bolão sem login; chave publishable tem escrita liberada — aceitável por decisão do dono). `users` não tem política de DELETE de propósito. Projetos novos do Supabase exigem `GRANT` explícito ao papel `anon` além das policies.
- A coluna legada `users.predictions` (JSONB) foi **removida**; `SupabaseAdapter` seleciona colunas explícitas, nunca `select *` em `users`.

## Convenções e decisões do dono

- Palpites ficam abertos **até o fim do jogo** (trava só na apuração) — decisão deliberada do organizador; não "corrigir" para travar no kickoff.
- Identidade visual Nazária: tokens em `src/index.css` (`--color-brand-500: #FF7415` laranja, escala navy sobre `#000B44`, fonte DM Sans servida de `public/fonts/`). Use as classes `brand-*`/`navy-*`, não cores Tailwind genéricas. Parciais/ao-vivo usam vermelho pulsante; definitivos, laranja.
- E-mail aparece mascarado no ranking (`lu***@***.com.br`, `utils/email.ts`); completo só para o próprio usuário no header.
- `IDENTIDADE_NZR/` contém o manual interno da marca — o repo GitHub é privado; não tornar público sem remover essa pasta.
