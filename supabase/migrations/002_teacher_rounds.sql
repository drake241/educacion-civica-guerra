-- Cierre de votación, consecuencias y avance de ronda (proyector)

create or replace function public.clamp_meter(v int)
returns int
language sql
immutable
as $$
  select greatest(0, least(100, v));
$$;

create or replace function public.apply_meter_delta(m jsonb, delta jsonb)
returns jsonb
language plpgsql
as $$
declare
  keys text[] := array['alimentos','comercio','estabilidad','apoyo'];
  k text;
  out jsonb := m;
  nv int;
begin
  foreach k in array keys loop
    nv := clamp_meter((coalesce(m->>k, '50')::int) + coalesce((delta->>k)::int, 0));
    out := jsonb_set(out, array[k], to_jsonb(nv));
  end loop;
  return out;
end;
$$;

create or replace function public.is_collapsed(m jsonb)
returns boolean
language sql
immutable
as $$
  select (coalesce(m->>'alimentos','0')::int <= 0)
      or (coalesce(m->>'comercio','0')::int <= 0)
      or (coalesce(m->>'estabilidad','0')::int <= 0)
      or (coalesce(m->>'apoyo','0')::int <= 0);
$$;

-- Agrega resultados en round_results y pasa a reveal
create or replace function public.teacher_close_vote(
  p_room_id uuid,
  p_pin text,
  p_valmira_option text,
  p_cerro_option text,
  p_cerro_yes int,
  p_cerro_no int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rnd int;
  vm jsonb;
  cm jsonb;
  v_counts jsonb;
  results jsonb;
begin
  if not check_teacher_pin(p_pin) then raise exception 'Pin incorrecto'; end if;
  select round_index, valmira_meters, cerro_meters into rnd, vm, cm from rooms where id = p_room_id;

  select jsonb_object_agg(option_id, cnt) into v_counts
  from (
    select option_id, count(*) cnt from votes
    where room_id = p_room_id and round_index = rnd and vote_kind = 'option' and option_id is not null
    group by option_id
  ) s;

  results := jsonb_build_object(
    'round_index', rnd,
    'valmira_chosen', p_valmira_option,
    'cerro_chosen', p_cerro_option,
    'cerro_assembly', jsonb_build_object('yes', p_cerro_yes, 'no', p_cerro_no),
    'valmira_option_votes', coalesce(v_counts, '{}'::jsonb)
  );

  update rooms set
    subphase = 'reveal',
    round_results = round_results || jsonb_build_object(rnd::text, results)
  where id = p_room_id;

  return results;
end;
$$;

-- Aplicar efectos (proyector envía deltas ya resueltos en cliente desde contenido.json)
create or replace function public.teacher_apply_consequence(
  p_room_id uuid,
  p_pin text,
  p_valmira_delta jsonb,
  p_cerro_delta jsonb,
  p_valmira_headline text,
  p_cerro_headline text,
  p_cross_event text default null,
  p_peace_valmira boolean default false,
  p_peace_cerro boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  vm jsonb;
  cm jsonb;
  pf jsonb;
  ev jsonb;
  rnd int;
  max_round int := 4;
begin
  if not check_teacher_pin(p_pin) then raise exception 'Pin incorrecto'; end if;
  select round_index, valmira_meters, cerro_meters, peace_flags into rnd, vm, cm, pf from rooms where id = p_room_id;

  vm := apply_meter_delta(vm, p_valmira_delta);
  cm := apply_meter_delta(cm, p_cerro_delta);

  if p_peace_valmira then pf := jsonb_set(pf, '{valmira}', 'true'::jsonb); end if;
  if p_peace_cerro then pf := jsonb_set(pf, '{cerroAzul}', 'true'::jsonb); end if;

  ev := jsonb_build_object(
    'round', rnd,
    'valmira', p_valmira_headline,
    'cerro', p_cerro_headline,
    'cross', p_cross_event,
    'at', now()
  );

  update rooms set
    valmira_meters = vm,
    cerro_meters = cm,
    peace_flags = pf,
    event_log = event_log || ev,
    subphase = case when rnd >= max_round then 'ending' else 'consequence' end,
    phase = case when rnd >= max_round then 'finished' else phase end
  where id = p_room_id;

  return jsonb_build_object('valmira', vm, 'cerro', cm, 'collapsed_valmira', is_collapsed(vm), 'collapsed_cerro', is_collapsed(cm));
end;
$$;

create or replace function public.teacher_next_round(p_room_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rnd int;
begin
  if not check_teacher_pin(p_pin) then raise exception 'Pin incorrecto'; end if;
  select round_index into rnd from rooms where id = p_room_id;
  if (select phase from rooms where id = p_room_id) = 'finished' then
    return;
  end if;
  update rooms set round_index = rnd + 1, subphase = 'discuss' where id = p_room_id;
end;
$$;

create or replace function public.teacher_set_ending(
  p_room_id uuid,
  p_pin text,
  p_ending text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_teacher_pin(p_pin) then raise exception 'Pin incorrecto'; end if;
  update rooms set ending = p_ending, subphase = 'ending', phase = 'finished' where id = p_room_id;
end;
$$;

grant execute on function public.teacher_close_vote(uuid, text, text, text, int, int) to anon, authenticated;
grant execute on function public.teacher_apply_consequence(uuid, text, jsonb, jsonb, text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.teacher_next_round(uuid, text) to anon, authenticated;
grant execute on function public.teacher_set_ending(uuid, text, text) to anon, authenticated;
