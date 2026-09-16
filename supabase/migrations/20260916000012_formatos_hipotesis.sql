-- 012 · Paso 2 de la limpieza (docs/campos.md §4b y §6): formatos con campos propios e hipótesis con ciclo de vida.

-- ---------------------------------------------------------------------------
-- 1. Formatos: lo que en Notion era columna y aquí se había vuelto prosa.
-- ---------------------------------------------------------------------------
alter table formatos
  add column serie_propia text,
  add column duracion text,
  add column recompensa text,
  add column cadencia text,
  add column hipotesis_formato text;   -- la que se resuelve con ≥ 8 episodios (rollup), no con una pieza

update formatos set serie_propia = v.serie, duracion = v.dur, recompensa = v.rec, cadencia = v.cad, hipotesis_formato = v.hip
from (values
  ('FC-01', 'Brand Reels', '45-90 s', 'Insight: «ahora entiendo por qué me gustó»', '1-2 por semana',
   'El react-análisis de un anuncio conocido sostiene el reach de no-seguidores episodio tras episodio: valida el formato, no la suerte de un episodio.'),
  ('FC-02', 'Róbate', '7-12 s', 'Satisfacción visual + utilidad guardable (saves)', '2 por semana',
   'Un micro-reel visual de menos de 12 s logra reach de no-seguidores ≥ 3x la mediana de reels propios; métrica secundaria: saves.'),
  ('FC-03', 'Robándole el marketing', '60-90 s', 'Insight + táctica robable', '2 episodios por semana; el contador es por episodio, no por día',
   null),
  ('FC-04', 'Verdades Incómodas', '35-50 s', 'Validación + reencuadre: «por fin alguien lo dijo»', '1 por semana',
   'La lección contraintuitiva desde experiencia real trae seguidor calificado: multiplicador modesto (3-4x) con retención alta, aunque el reach sea menor.'),
  ('FC-05', 'Checklist relámpago', '6-9 s', 'Utilidad guardable + lectura larga en el caption', '1 por semana (20 % experimental)',
   null),
  ('FC-08', 'Criterio', '60-90 s', 'Criterio prestado: el espectador se lleva una regla de decisión que puede usar mañana', '1 por día durante el reto de 30 yaps (11 ago – 9 sep 2026); después 2-3 por semana',
   'Primera persona + largo (50-150 s) + un criterio aplicado a un caso concreto supera a cualquier formato copiado: es el único patrón que ha despegado en @nazho.')
) as v(codigo, serie, dur, rec, cad, hip)
where formatos.codigo = v.codigo;

-- El owner edita formatos desde la app y por MCP (la RLS de 003 solo daba lectura general).
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'formatos' and policyname = 'owner_todo') then
    create policy owner_todo on formatos for all to authenticated using (rol_actual() = 'owner') with check (rol_actual() = 'owner');
  end if;
end $$;

-- Al elegir formato, la pieza hereda la serie propia si no traía una.
create or replace function public.heredar_serie_de_formato()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.formato_id is not null and nullif(trim(coalesce(new.serie, '')), '') is null then
    select serie_propia into new.serie from formatos where id = new.formato_id;
  end if;
  return new;
end $$;
create trigger piezas_heredan_serie before insert or update of formato_id on piezas
  for each row execute function heredar_serie_de_formato();

-- Rollups por formato: se calculan, no se guardan (docs/campos.md §4b).
create or replace function public.resumen_formato(p_formato_id uuid)
returns table (episodios int, publicadas int, multiplicador_promedio numeric, follows_totales int, views_totales int)
language sql stable security definer set search_path = public as $$
  with piezas_f as (
    select id, estado from piezas where formato_id = p_formato_id and estado <> 'archivada'
  ), ultima as (
    select distinct on (m.pieza_id) m.pieza_id, m.multiplicador, m.follows, m.views
    from metricas m join piezas_f p on p.id = m.pieza_id
    where m.fuente <> 'pendiente'
    order by m.pieza_id, m.fecha desc, m.created_at desc
  )
  select
    (select count(*) from piezas_f)::int,
    (select count(*) from piezas_f where estado in ('publicada','en_trial'))::int,
    (select round(avg(multiplicador), 2) from ultima where multiplicador is not null),
    (select coalesce(sum(follows), 0) from ultima)::int,
    (select coalesce(sum(views), 0) from ultima)::int;
$$;
grant execute on function resumen_formato(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Hipótesis: evidencia y resolución.
-- ---------------------------------------------------------------------------

-- Qué valor alcanzó cada pieza en el campo de la hipótesis (última lectura no pendiente).
-- Campos con sensor: multiplicador, views, likes, comentarios, saves, follows. Otros: sin sensor (valor null).
create or replace function public.evidencia_hipotesis(p_hipotesis_id uuid)
returns table (pieza_id uuid, id_publico text, titulo text, tipo text, estado text, publicada_en timestamptz, valor numeric, fecha date, fuente text)
language plpgsql stable security definer set search_path = public as $$
declare campo text;
begin
  select h.campo into campo from hipotesis h where h.id = p_hipotesis_id;
  return query
    select p.id, p.id_publico, p.titulo, p.tipo, p.estado, p.publicada_en,
      case campo
        when 'multiplicador' then coalesce(u.multiplicador, (select m.multiplicador from multiplicador(p.id) m))
        when 'views' then u.views::numeric when 'likes' then u.likes::numeric when 'comentarios' then u.comentarios::numeric
        when 'saves' then u.saves::numeric when 'follows' then u.follows::numeric
        else null end,
      u.fecha, u.fuente
    from piezas p
    left join lateral (
      select m.* from metricas m where m.pieza_id = p.id and m.fuente <> 'pendiente' order by m.fecha desc, m.created_at desc limit 1
    ) u on true
    where p.hipotesis_id = p_hipotesis_id
    order by p.publicada_en desc nulls last, p.id_publico;
end $$;
grant execute on function evidencia_hipotesis(uuid) to authenticated;

-- Resolver: verdadera · falsa · sin_datos, con veredicto (qué se aprendió). Reabrir = estado 'abierta'.
create or replace function public.resolver_hipotesis(p_hipotesis_id uuid, p_estado text, p_veredicto text default null)
returns hipotesis language plpgsql security definer set search_path = public as $$
declare h hipotesis%rowtype;
begin
  perform exigir_rol('owner');
  if p_estado not in ('abierta','verdadera','falsa','sin_datos') then
    raise exception 'Estado inválido: %.', p_estado using errcode = 'P0001';
  end if;
  if p_estado in ('verdadera','falsa') and nullif(trim(coalesce(p_veredicto, '')), '') is null then
    raise exception 'Para cerrarla como % escribe el veredicto: qué se aprendió.', p_estado using errcode = 'P0001';
  end if;
  update hipotesis set estado = p_estado,
                       veredicto = case when p_estado = 'abierta' then null else coalesce(nullif(trim(p_veredicto), ''), veredicto) end,
                       resuelta_en = case when p_estado = 'abierta' then null else now() end
   where id = p_hipotesis_id returning * into h;
  if not found then raise exception 'No existe la hipótesis.' using errcode = 'P0002'; end if;
  perform registrar_corrida('resolver_hipotesis', 'ok', format('%s → %s', left(h.texto, 60), p_estado),
    jsonb_build_object('hipotesis_id', h.id, 'actor', auth.uid()));
  return h;
end $$;
grant execute on function resolver_hipotesis(uuid, text, text) to authenticated;

-- Completar o corregir una hipótesis (texto, campo, número, fecha). La fecha puede ser pasada al corregir una heredada.
create or replace function public.actualizar_hipotesis(p_hipotesis_id uuid, p_texto text default null, p_campo text default null, p_numero numeric default null, p_fecha date default null)
returns hipotesis language plpgsql security definer set search_path = public as $$
declare h hipotesis%rowtype;
begin
  perform exigir_rol('owner');
  update hipotesis set
    texto = coalesce(nullif(trim(p_texto), ''), texto),
    campo = coalesce(nullif(trim(p_campo), ''), campo),
    numero = coalesce(p_numero, numero),
    fecha = coalesce(p_fecha, fecha)
   where id = p_hipotesis_id returning * into h;
  if not found then raise exception 'No existe la hipótesis.' using errcode = 'P0002'; end if;
  return h;
end $$;
grant execute on function actualizar_hipotesis(uuid, text, text, numeric, date) to authenticated;

-- Ligar una pieza a una hipótesis existente (o quitarla). Owner.
create or replace function public.ligar_hipotesis(p_pieza_id uuid, p_hipotesis_id uuid)
returns piezas language plpgsql security definer set search_path = public as $$
declare p piezas%rowtype;
begin
  perform exigir_rol('owner');
  update piezas set hipotesis_id = p_hipotesis_id where id = p_pieza_id returning * into p;
  if not found then raise exception 'No existe la pieza.' using errcode = 'P0002'; end if;
  return p;
end $$;
grant execute on function ligar_hipotesis(uuid, uuid) to authenticated;
