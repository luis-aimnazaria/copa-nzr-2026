# ⚽ Bolão Copa 2026 — Nazária Distribuidora

Web app de bolão para a Copa do Mundo de 2026, sem autenticação complexa:
o **e-mail é o identificador único** para salvar e recuperar palpites.

**Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 (dark mode, mobile-first).

**Identidade visual:** marca Nazária Distribuidora — laranja institucional
`#FF7415`, azul-marinho `#000B44` e tipografia **DM Sans** (assets em
`public/brand/` e `public/fonts/`, tokens em `src/index.css`).

## Rodando

```bash
npm install
npm run dev
```

## Dados da Copa (API ao vivo + fallback)

Os jogos vêm da [World Cup 2026 API](https://github.com/rezarahiminia/worldcup2026)
(`worldcup26.ir`): 104 jogos, 48 seleções (sorteio real), bandeiras e placares ao vivo.

- **Dev:** o Vite faz proxy de `/wc-api` → `worldcup26.ir` (contorna CORS) — ver `vite.config.ts`.
- **Fallback:** se a API estiver fora do ar (ou sem proxy em produção), o app usa
  automaticamente o snapshot local em `src/data/*.snapshot.json`.
- **Resultados:** jogos encerrados na API chegam apurados; a aba **Apuração**
  permite registrar/simular resultados manualmente (a API tem prioridade).

## Telas

| Tela | Descrição |
|---|---|
| **Entrada** | Digite o e-mail. Cadastrado → carrega os palpites; novo → pede o nome e cria o perfil. |
| **Palpites** | Jogos separados por grupo/fase com inputs de placar e botão "Salvar Palpites". Jogos apurados ficam bloqueados e mostram os pontos ganhos. |
| **Ranking** | Leaderboard ordenado por pontos (desempate: placares em cheio), com e-mail mascarado (`lu***@nazaria.com.br`). |
| **Apuração** | Área administrativa protegida por senha padrão (`nzr2026`, definida em `src/pages/AdminPage.tsx`) para registrar placares manualmente — a pontuação de todos é recalculada automaticamente. |

## Pontuação (`src/utils/scoring.ts`)

| Acerto | Pontos |
|---|---|
| Placar em cheio (palpite 2x1, jogo 2x1) | **25** |
| Vencedor/empate + saldo de gols (palpite 3x1, jogo 2x0) | **18** |
| Vencedor/empate + gols de um dos times (palpite 2x1, jogo 2x0) | **15** |
| Apenas vencedor/empate (palpite 1x0, jogo 3x1) | **10** |
| Erro total | **0** |

## Arquitetura

```
src/
├── types/index.ts                  # Tipos centrais (Match, User, Score, Phase...)
├── data/                           # Snapshot da API (fallback offline)
├── utils/
│   ├── scoring.ts                  # Cálculo de pontos e ranking
│   ├── email.ts                    # Normalização, validação e máscara de e-mail
│   └── matches.ts                  # Agrupamento por fase/grupo, formatação de datas
├── services/
│   ├── fifaApi.ts                  # Integração worldcup26.ir + tradução PT + fallback
│   ├── matchService.ts             # Junta calendário + apuração manual
│   └── storage/
│       ├── StorageAdapter.ts       # Contrato de persistência (interface)
│       ├── LocalStorageAdapter.ts  # Modo demonstração (dados só no navegador)
│       ├── SupabaseAdapter.ts      # Banco central compartilhado (produção)
│       └── index.ts                # Escolhe o adapter pelas variáveis de ambiente
├── components/                     # Header (logo + tabs), MatchCard, ScoringRules
└── pages/                          # EntryPage, DashboardPage, RankingPage, AdminPage
```

## Publicando (Supabase + Vercel — grátis)

Com LocalStorage cada navegador tem um bolão isolado. Para um bolão público,
configure o banco central:

**1. Supabase** ([supabase.com](https://supabase.com), conta gratuita)
   - Crie um projeto, abra o **SQL Editor** e execute o conteúdo de
     [`supabase/schema.sql`](supabase/schema.sql).
   - Em **Project Settings → API**, copie a *Project URL* e a *anon key*.

**2. Vercel** ([vercel.com](https://vercel.com), conta gratuita)
   - `npx vercel` na raiz do projeto (ou importe o repositório no site).
   - Configure as variáveis de ambiente do projeto:
     `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
   - O `vercel.json` já faz o proxy `/wc-api` → `worldcup26.ir` em produção.

**Dev local com banco central:** copie `.env.example` para `.env.local` e
preencha as chaves. Sem as variáveis, o app cai no LocalStorage (demonstração).

> Nota: o bolão é deliberadamente sem login — a chave anônima do Supabase tem
> escrita liberada nas duas tabelas e a senha da apuração vive no front-end.
> Suficiente para um bolão entre colegas; não use para nada sensível.
