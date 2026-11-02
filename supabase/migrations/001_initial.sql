-- Valmira vs Cerro Azul — multijugador en tiempo real
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- Salas de juego
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  phase text not null default 'lobby',
  round_index int not null default 0,
  subphase text not null default 'lobby',
  valmira_meters jsonb not null default '{"alimentos":55,"comercio":55,"estabilidad":50,"apoyo":50}'::jsonb,
  cerro_meters jsonb not null default '{"alimentos":55,"comercio":55,"estabilidad":50,"apoyo":50}'::jsonb,
  round_results jsonb not null default '{}'::jsonb,
  event_log jsonb not null default '[]'::jsonb,
  ending text,
  peace_flags jsonb not null default '{"valmira":false,"cerroAzul":false}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

-- Jugadores
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  nickname text not null default 'Jugador',
  country text not null check (country in ('valmira', 'cerroAzul')),
  role text not null,
  created_at timestamptz not null default now(),
  unique (room_id, nickname)
);

create index if not exists players_room_idx on public.players (room_id);

-- Votos por ronda
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  round_index int not null,
  player_id uuid not null references public.players (id) on delete cascade,
  vote_kind text not null check (vote_kind in ('option', 'yes', 'no')),
  option_id text,
  created_at timestamptz not null default now(),
  unique (room_id, round_index, player_id, vote_kind)
);

create index if not exists votes_room_round_idx on public.votes (room_id, round_index);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.votes enable row level security;

-- Lectura pública de salas y jugadores (anon key en frontend)
create policy "rooms_select" on public.rooms for select using (true);
create policy "players_select" on public.players for select using (true);

-- Votos: insertar solo con player_id válido; leer agregados vía RPC
create policy "votes_insert" on public.votes for insert
  with check (
    exists (select 1 from public.players p where p.id = player_id and p.room_id = room_id)
  );

create policy "votes_select_own" on public.votes for select
  using (true);

-- Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;

-- Generar código de sala legible
create or replace function public.gen_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..5 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Crear sala (proyector)
create or replace function public.create_room()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  rid uuid;
begin
  loop
    new_code := gen_room_code();
    exit when not exists (select 1 from rooms where code = new_code);
  end loop;
  insert into rooms (code) values (new_code) returning id into rid;
  return jsonb_build_object('room_id', rid, 'code', new_code);
end;
$$;

-- Roles aleatorios por país
create or replace function public.pick_role(p_room_id uuid, p_country text)
returns text
language plpgsql
as $$
declare
  leaders int;
begin
  if p_country = 'valmira' then
    select count(*) into leaders from players
      where room_id = p_room_id and country = 'valmira' and role = 'primer_ministro';
    if leaders = 0 and random() < 0.35 then
      return 'primer_ministro';
    end if;
    return 'diputado';
  else
    select count(*) into leaders from players
      where room_id = p_room_id and country = 'cerroAzul' and role = 'presidente';
    if leaders = 0 and random() < 0.35 then
      return 'presidente';
    end if;
    return 'asambleista';
  end if;
end;
$$;

-- Unirse a sala
create or replace function public.join_room(
  p_code text,
  p_nickname text,
  p_country text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  pid uuid;
  rrole text;
begin
  if p_country not in ('valmira', 'cerroAzul') then
    raise exception 'País inválido';
  end if;
  select id into rid from rooms where code = upper(trim(p_code));
  if rid is null then
    raise exception 'Sala no encontrada';
  end if;
  if (select phase from rooms where id = rid) != 'lobby' then
    raise exception 'La partida ya comenzó';
  end if;
  rrole := pick_role(rid, p_country);
  insert into players (room_id, nickname, country, role)
  values (rid, trim(p_nickname), p_country, rrole)
  returning id into pid;
  return jsonb_build_object(
    'player_id', pid,
    'room_id', rid,
    'country', p_country,
    'role', rrole,
    'code', upper(trim(p_code))
  );
end;
$$;

-- Pin docente (ponytail: aula; no seguridad fuerte)
create or replace function public.check_teacher_pin(p_pin text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_pin = '4125', false);
$$;

-- Avanzar subfase (proyector)
create or replace function public.teacher_set_subphase(
  p_room_id uuid,
  p_pin text,
  p_subphase text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_teacher_pin(p_pin) then
    raise exception 'Pin incorrecto';
  end if;
  if p_subphase not in ('lobby','intro','discuss','vote','reveal','consequence','ending') then
    raise exception 'Subfase inválida';
  end if;
  update rooms set subphase = p_subphase where id = p_room_id;
end;
$$;

create or replace function public.teacher_start_war(p_room_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_teacher_pin(p_pin) then
    raise exception 'Pin incorrecto';
  end if;
  update rooms set
    phase = 'playing',
    round_index = 0,
    subphase = 'intro',
    valmira_meters = '{"alimentos":55,"comercio":55,"estabilidad":50,"apoyo":50}'::jsonb,
    cerro_meters = '{"alimentos":55,"comercio":55,"estabilidad":50,"apoyo":50}'::jsonb,
    round_results = '{}'::jsonb,
    event_log = '[]'::jsonb,
    ending = null,
    peace_flags = '{"valmira":false,"cerroAzul":false}'::jsonb
  where id = p_room_id;
end;
$$;

-- Voto del jugador
create or replace function public.submit_vote(
  p_player_id uuid,
  p_vote_kind text,
  p_option_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  rnd int;
  sub text;
  pl record;
begin
  select p.*, r.subphase, r.round_index into pl
  from players p
  join rooms r on r.id = p.room_id
  where p.id = p_player_id;
  if pl is null then raise exception 'Jugador no encontrado'; end if;
  if pl.subphase != 'vote' then raise exception 'No está la fase de voto'; end if;

  rid := pl.room_id;
  rnd := pl.round_index;

  if p_vote_kind = 'option' then
    if pl.country = 'cerroAzul' and pl.role != 'presidente' then
      raise exception 'Solo el Presidente elige la propuesta';
    end if;
    if pl.country = 'valmira' and pl.role not in ('primer_ministro', 'diputado') then
      raise exception 'Rol no puede proponer';
    end if;
  end if;

  if p_vote_kind in ('yes', 'no') and pl.country = 'cerroAzul' and pl.role = 'presidente' then
    raise exception 'El Presidente no vota sí/no de asamblea';
  end if;

  insert into votes (room_id, round_index, player_id, vote_kind, option_id)
  values (rid, rnd, p_player_id, p_vote_kind, p_option_id)
  on conflict (room_id, round_index, player_id, vote_kind)
  do update set option_id = excluded.option_id, created_at = now();
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.rooms to anon, authenticated;
grant select on public.players to anon, authenticated;
grant insert on public.votes to anon, authenticated;
grant select on public.votes to anon, authenticated;
grant execute on function public.create_room() to anon, authenticated;
grant execute on function public.join_room(text, text, text) to anon, authenticated;
grant execute on function public.submit_vote(uuid, text, text) to anon, authenticated;
grant execute on function public.teacher_set_subphase(uuid, text, text) to anon, authenticated;
grant execute on function public.teacher_start_war(uuid, text) to anon, authenticated;
