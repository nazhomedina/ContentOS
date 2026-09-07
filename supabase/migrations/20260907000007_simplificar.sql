-- 007 · Simplificación (docs/simplificacion.md).
-- Una sola base de piezas que nacen como idea. Formato, etapa e hipótesis se exigen
-- al pasar a para_grabar, no al capturar. id_publico se genera solo. Tabla hooks.

-- ---------------------------------------------------------------------------
-- piezas: estado idea, campos opcionales, defaults
-- ---------------------------------------------------------------------------
alter table piezas drop constraint piezas_estado_check;
alter table piezas add constraint piezas_estado_check check (estado in
  ('idea','para_producir','para_grabar','edicion','buffer','programada','publicada','archivada','en_trial'));
alter table piezas alter column estado set default 'idea';
alter table piezas alter column formato drop not null;
alter table piezas alter column etapa_embudo drop not null;
alter table piezas alter column hipotesis drop not null;
alter table piezas alter column comunidad_id set default '11111111-0000-4000-8000-000000000001';

alter table piezas drop constraint hipotesis_resoluble;
alter table piezas add constraint hipotesis_valida_si_existe check (hipotesis is null or hipotesis_valida(hipotesis));
-- Regla 1 reformulada: para grabar hace falta formato, etapa e hipótesis. Para pensar, no.
alter table piezas add constraint completa_segun_estado check (
  estado in ('idea','archivada')
  or (estado = 'para_producir' and formato is not null)
  or (estado not in ('idea','archivada','para_producir') and formato is not null and etapa_embudo is not null and hipotesis is not null)
);

alter table piezas
  add column origen text check (origen in ('radar','voz','destilado','markie','coyuntura','audiencia','claude','legado','nazho')),
  add column notas text,
  add column notion_url text,
  add column formato_sugerido text[] not null default '{}';
create unique index piezas_notion_url on piezas (notion_url);
create index piezas_estado_created on piezas (estado, created_at desc);

-- ---------------------------------------------------------------------------
-- id_publico automático: prefijo por formato, consecutivo. Se regenera si una idea (IDE-) toma formato.
-- ---------------------------------------------------------------------------
create or replace function public.prefijo_formato(f text)
returns text language sql immutable set search_path = public as $$
  select case f
    when 'reel' then 'REE' when 'yap' then 'YAP' when 'carrusel' then 'CAR' when 'historia' then 'HIS'
    when 'x' then 'XPO' when 'canal_ig' then 'CAN' when 'newsletter' then 'NEW' when 'articulo' then 'ART'
    when 'youtube' then 'YTB' else 'IDE' end;
$$;

create or replace function public.siguiente_id_publico(p_prefijo text)
returns text language plpgsql volatile set search_path = public as $$
declare n int;
begin
  select coalesce(max((regexp_match(id_publico, '^[A-Z]+-(\d+)'))[1]::int), 0) + 1 into n
  from piezas where id_publico ~ ('^' || p_prefijo || '-\d+');
  return p_prefijo || '-' || lpad(n::text, 2, '0');
end $$;

create or replace function public.asignar_id_publico()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and nullif(trim(coalesce(new.id_publico, '')), '') is null then
    new.id_publico := siguiente_id_publico(prefijo_formato(new.formato));
  elsif tg_op = 'UPDATE' and new.formato is distinct from old.formato and new.formato is not null and new.id_publico like 'IDE-%' then
    new.id_publico := siguiente_id_publico(prefijo_formato(new.formato));
  end if;
  return new;
end $$;

alter table piezas alter column id_publico drop not null;
create trigger piezas_id_publico before insert or update of formato on piezas
  for each row execute function asignar_id_publico();
alter table piezas add constraint id_publico_presente check (id_publico is not null);

-- ---------------------------------------------------------------------------
-- crear_pieza_validada: acepta ideas (solo título) y valida según el estado destino
-- ---------------------------------------------------------------------------
create or replace function public.validar_pieza_para_estado(p_estado text, p_formato text, p_etapa text, p_hipotesis jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare h jsonb := p_hipotesis; falta text;
begin
  if p_estado in ('idea', 'archivada') then return; end if;
  if p_formato is null then
    raise exception 'Antes de producirla, la pieza necesita formato.' using errcode = 'P0001';
  end if;
  if p_estado = 'para_producir' then return; end if;
  falta := case
    when p_etapa is null then 'etapa_embudo'
    when h is null then 'hipotesis'
    when nullif(h->>'texto','') is null then 'hipotesis.texto'
    when nullif(h->>'campo','') is null then 'hipotesis.campo'
    when jsonb_typeof(h->'numero') <> 'number' then 'hipotesis.numero'
    when nullif(h->>'fecha','') is null then 'hipotesis.fecha'
    else null end;
  if falta is not null then
    raise exception 'Para pasar a % falta %. Pídele a Claude que complete la pieza.', p_estado, falta using errcode = 'P0001';
  end if;
  if (h->>'fecha') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'hipotesis.fecha debe ser AAAA-MM-DD.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.crear_pieza_validada(payload jsonb)
returns piezas language plpgsql security definer set search_path = public as $$
declare
  p piezas%rowtype;
  h jsonb := payload->'hipotesis';
  fc uuid;
  est text := coalesce(nullif(payload->>'estado',''), 'idea');
begin
  perform exigir_rol('owner');
  if nullif(payload->>'titulo','') is null and nullif(payload->>'guion','') is null then
    raise exception 'Una pieza nace con al menos un título.' using errcode = 'P0001';
  end if;
  perform validar_pieza_para_estado(est, payload->>'formato', payload->>'etapa_embudo', h);
  if h is not null and (h->>'fecha')::date <= (now() at time zone 'America/Mexico_City')::date then
    raise exception 'hipotesis.fecha debe estar en el futuro.' using errcode = 'P0001';
  end if;
  if nullif(payload->>'format_card','') is not null then
    select id into fc from format_cards where codigo = payload->>'format_card' or id::text = payload->>'format_card';
    if fc is null then
      raise exception 'No existe la Format Card %.', payload->>'format_card' using errcode = 'P0001';
    end if;
  end if;

  insert into piezas (
    id_publico, idea_id, comunidad_id, formato, serie, format_card_id, hipotesis, etapa_embudo, cta, guion, spec_visual,
    fidelidad, fecha_objetivo, responsable_id, titulo, programa_aprobado, estado, origen, notas, formato_sugerido
  ) values (
    nullif(payload->>'id_publico',''),
    (payload->>'idea_id')::uuid,
    coalesce((payload->>'comunidad_id')::uuid, '11111111-0000-4000-8000-000000000001'),
    payload->>'formato', payload->>'serie', fc,
    case when h is null then null else jsonb_build_object('texto', h->>'texto', 'campo', h->>'campo', 'numero', h->'numero', 'fecha', h->>'fecha') end,
    payload->>'etapa_embudo', payload->>'cta', payload->>'guion', payload->>'spec_visual',
    coalesce(payload->>'fidelidad', 'mis_palabras'),
    (payload->>'fecha_objetivo')::date, (payload->>'responsable_id')::uuid, payload->>'titulo',
    coalesce((payload->>'programa_aprobado')::boolean, false), est,
    coalesce(payload->>'origen', 'nazho'), payload->>'notas',
    coalesce(array(select jsonb_array_elements_text(payload->'formato_sugerido')), '{}')
  ) returning * into p;

  perform registrar_corrida('crear_pieza', 'ok', format('%s creada (%s, %s)', p.id_publico, coalesce(p.formato, 'sin formato'), p.estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
exception
  when unique_violation then
    raise exception 'Ya existe una pieza con ese id_publico.' using errcode = 'P0001';
end $$;

-- cambiar_estado_pieza: mensajes legibles antes de que truene el check
create or replace function public.cambiar_estado_pieza(p_pieza_id uuid, p_nuevo_estado text)
returns piezas language plpgsql security definer set search_path = public as $$
declare
  p piezas%rowtype;
  rol text := rol_actual();
begin
  select * into p from piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'No existe la pieza.' using errcode = 'P0002';
  end if;
  if p_nuevo_estado = 'publicada' then
    raise exception 'Para publicar usa marcar_publicada con la URL.' using errcode = 'P0001';
  end if;
  if not transicion_permitida(rol, p.estado, p_nuevo_estado) then
    raise exception 'Tu rol (%) no puede pasar la pieza de % a %.', coalesce(rol,'ninguno'), p.estado, p_nuevo_estado
      using errcode = '42501';
  end if;
  if rol = 'editor' and p.responsable_id is distinct from auth.uid()
     and p.estado not in ('para_grabar','edicion','buffer','programada') then
    raise exception 'La pieza no está en tu cola.' using errcode = '42501';
  end if;
  perform validar_pieza_para_estado(p_nuevo_estado, p.formato, p.etapa_embudo, p.hipotesis);
  update piezas set estado = p_nuevo_estado where id = p_pieza_id returning * into p;
  perform registrar_corrida('cambiar_estado_pieza', 'ok',
    format('%s → %s', p.id_publico, p_nuevo_estado),
    jsonb_build_object('pieza_id', p.id, 'actor', auth.uid()));
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Las ideas pasan a piezas. Propuesta (shortlist) → para_producir como carrusel; el resto → idea.
-- ---------------------------------------------------------------------------
select set_config('app.import', 'on', true);
insert into piezas (titulo, estado, formato, origen, notas, notion_url, formato_sugerido, comunidad_id, etapa_embudo, created_at)
select titulo,
       case when estado = 'shortlist' then 'para_producir' else 'idea' end,
       case when estado = 'shortlist' then 'carrusel' end,
       origen, notas, notion_url, formato_sugerido, comunidad_id, etapa_embudo, created_at
from ideas where estado in ('nueva', 'shortlist')
order by created_at;
delete from ideas;

-- ---------------------------------------------------------------------------
-- hooks: banco ligero que llena Claude
-- ---------------------------------------------------------------------------
create table public.hooks (
  id uuid primary key default gen_random_uuid(),
  texto text not null check (length(trim(texto)) > 0),
  categoria text,
  formato text,
  pieza_id uuid references piezas on delete set null,
  favorito boolean not null default false,
  created_at timestamptz not null default now()
);
alter table hooks enable row level security;
create policy owner_todo on hooks for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
create policy editor_leer on hooks for select to authenticated using (rol_actual() = 'editor');

grant execute on function validar_pieza_para_estado(text, text, text, jsonb), prefijo_formato(text), siguiente_id_publico(text) to authenticated;
