-- =============================================================
-- Bolão Copa 2026 — schema do Supabase (instalação do zero)
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- Banco já existente? Use supabase/migration-001-predictions.sql.
-- =============================================================

-- Participantes (e-mail como identificador único)
create table if not exists public.users (
  email text primary key,
  name text not null,
  company text not null check (company in (
    'FORTALEZA','TIMON','NATAL','CAMPINA','FEIRA',
    'RECIFE','MACEIO','CASTANHAL','TERESINA','IMPERATRIZ'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Palpites: 1 linha por usuário × jogo
create table if not exists public.predictions (
  email text not null references public.users(email) on delete cascade,
  match_id text not null,
  home integer not null check (home >= 0),
  away integer not null check (away >= 0),
  updated_at timestamptz not null default now(),
  primary key (email, match_id)
);

-- Resultados apurados (sincronizados da API ou registrados na aba Apuração)
create table if not exists public.results (
  match_id text primary key,
  home integer not null check (home >= 0),
  away integer not null check (away >= 0)
);

-- O bolão não usa autenticação: a chave anônima precisa de acesso
-- liberado. RLS fica ativa com políticas permissivas (sem DELETE em
-- users, para ninguém apagar participantes).
alter table public.users enable row level security;
alter table public.predictions enable row level security;
alter table public.results enable row level security;

create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (true);
create policy "users_update" on public.users for update using (true);

create policy "predictions_select" on public.predictions for select using (true);
create policy "predictions_insert" on public.predictions for insert with check (true);
create policy "predictions_update" on public.predictions for update using (true);
create policy "predictions_delete" on public.predictions for delete using (true);

create policy "results_select" on public.results for select using (true);
create policy "results_insert" on public.results for insert with check (true);
create policy "results_update" on public.results for update using (true);
create policy "results_delete" on public.results for delete using (true);

-- Projetos novos do Supabase exigem GRANT explícito para o papel anon
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.users to anon, authenticated;
grant select, insert, update, delete on public.predictions to anon, authenticated;
grant select, insert, update, delete on public.results to anon, authenticated;

-- Trava server-side: rejeita palpite (novo ou editado) de jogo já apurado.
-- Vale mesmo para quem tentar burlar a interface pelo console do navegador.
create or replace function public.reject_locked_predictions()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.results r where r.match_id = new.match_id) then
    raise exception 'Palpites encerrados: o jogo % já foi apurado', new.match_id;
  end if;
  return new;
end;
$$;

drop trigger if exists predictions_lock on public.predictions;
create trigger predictions_lock
  before insert or update on public.predictions
  for each row execute function public.reject_locked_predictions();
