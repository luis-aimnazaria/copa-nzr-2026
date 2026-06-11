-- =============================================================
-- Bolão Copa 2026 — schema do Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- =============================================================

-- Participantes (e-mail como identificador único, palpites em JSONB)
create table if not exists public.users (
  email text primary key,
  name text not null,
  predictions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Apuração manual de resultados (a API ao vivo tem prioridade no app)
create table if not exists public.results (
  match_id text primary key,
  home integer not null check (home >= 0),
  away integer not null check (away >= 0)
);

-- O bolão não usa autenticação: a chave anônima precisa de acesso
-- liberado. RLS fica ativa com políticas permissivas (sem DELETE em
-- users, para ninguém apagar participantes).
alter table public.users enable row level security;
alter table public.results enable row level security;

create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (true);
create policy "users_update" on public.users for update using (true);

create policy "results_select" on public.results for select using (true);
create policy "results_insert" on public.results for insert with check (true);
create policy "results_update" on public.results for update using (true);
create policy "results_delete" on public.results for delete using (true);

-- Projetos novos do Supabase exigem GRANT explícito para o papel anon
-- (as políticas de RLS acima só valem depois desta permissão de base).
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.users to anon, authenticated;
grant select, insert, update, delete on public.results to anon, authenticated;
