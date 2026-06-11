-- =============================================================
-- Migração 001 — palpites normalizados (banco JÁ EXISTENTE)
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- A ordem importa: os dados são migrados ANTES de criar o trigger,
-- senão palpites de jogos já apurados seriam rejeitados na cópia.
-- =============================================================

-- 1. Nova tabela de palpites (1 linha por usuário × jogo)
create table if not exists public.predictions (
  email text not null references public.users(email) on delete cascade,
  match_id text not null,
  home integer not null check (home >= 0),
  away integer not null check (away >= 0),
  updated_at timestamptz not null default now(),
  primary key (email, match_id)
);

alter table public.predictions enable row level security;

-- drop antes de criar: torna o script seguro de rodar mais de uma vez
drop policy if exists "predictions_select" on public.predictions;
drop policy if exists "predictions_insert" on public.predictions;
drop policy if exists "predictions_update" on public.predictions;
drop policy if exists "predictions_delete" on public.predictions;

create policy "predictions_select" on public.predictions for select using (true);
create policy "predictions_insert" on public.predictions for insert with check (true);
create policy "predictions_update" on public.predictions for update using (true);
create policy "predictions_delete" on public.predictions for delete using (true);

grant select, insert, update, delete on public.predictions to anon, authenticated;

-- 2. Migra os palpites existentes (JSONB de users.predictions → linhas)
insert into public.predictions (email, match_id, home, away)
select u.email, p.key, (p.value->>'home')::int, (p.value->>'away')::int
from public.users u, jsonb_each(u.predictions) p
on conflict (email, match_id) do nothing;

-- 3. Trava server-side: rejeita palpite (novo ou editado) de jogo já apurado
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

-- 4. (Rode DEPOIS que o novo front estiver publicado na Vercel.)
--    A coluna JSONB legada deixa de ser usada; mantê-la durante a
--    transição evita quebrar quem ainda estiver com o site antigo aberto.
-- alter table public.users drop column if exists predictions;

alter table public.users drop column if exists predictions;
