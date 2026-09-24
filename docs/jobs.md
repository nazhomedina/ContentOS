# La máquina — jobs, latidos y rituales

**Fecha:** 2026-09-24 · Decisión de Nazho: nada de esto en n8n (n8n queda para sus otros procesos) y ninguna rutina automática de Claude: los rituales los corre él desde Cowork cuando quiere.

## 1. Dónde corre cada cosa

| Sistema | Dónde | Cuándo (hora de México) | Qué escribe |
|---|---|---|---|
| `snapshot_seguidores` | app · Vercel Cron `/api/cron/snapshot_seguidores` | 05:00 | `indicadores_semana.seguidores` + corte, vía Apify `instagram-profile-scraper` |
| `post_scraper_grilla` | app · Vercel Cron `/api/cron/post_scraper_grilla` | 06:00 | `metricas(fuente apify)` de las piezas publicadas con liga de los últimos 60 días, vía Apify `instagram-scraper`; luego `recalcular_multiplicadores()` |
| `kit_suscriptores` | app · Vercel Cron `/api/cron/kit_suscriptores` | 07:00 | `indicadores_semana.suscriptores` + corte, vía Kit v4 `growth_stats` |
| `go_leads` | app · Vercel Cron `/api/cron/go_leads` | 07:10 | `recursos.leads` por `slug_go` (fuente `job`) e `indicadores_semana.leads`, leyendo la tabla `leads` (marca `nazho`) del Supabase «Folklore Leads» |
| `recalcular_multiplicadores` | pg_cron dentro de Supabase | 03:00 | `metricas.multiplicador` y `n_mediana` de la última lectura por pieza |
| `sprint_lunes` | ritual · Nazho desde Cowork | cuando él quiera, cadencia esperada 7 días | cuenta como corrida cualquier `proponer_historias`, `agendar_historia` o `crear_pieza` |
| `review_viernes` | ritual · Nazho desde Cowork | ídem | cuenta `resolver_hipotesis`, `registrar_metrica_manual` o `declarar_hueco` |
| `espejo_md` | apagado | — | nadie lo necesita todavía |

Todo job de la app abre una fila en `corridas` con estado `corriendo` y la cierra con `ok`, `vacio` o `error` y un resumen. `latidos()` mira la última corrida que no sea error de cada sistema (o de sus `fuentes`, en los rituales) y la compara con `esperado_cada`. Inicio y Sistemas pintan eso; en Sistemas cada job de la app tiene «Correr ahora».

## 2. Variables que faltan en Vercel (las pone Nazho)

| Variable | Para qué | De dónde sale |
|---|---|---|
| `CRON_SECRET` | Vercel la manda en `Authorization: Bearer` a las rutas de cron; sin ella responden 401 | una cadena aleatoria larga; Vercel la usa sola |
| `APIFY_TOKEN` | seguidores y métricas de piezas | Apify → Settings → Integrations → API token |
| `KIT_API_KEY` | suscriptores | Kit → Settings → Developer → API key (v4) |
| `FOLKLORE_LEADS_URL` · `FOLKLORE_LEADS_SERVICE_KEY` | leads | Supabase «Folklore Leads» (`mixbxbqurmoxatsvdvut`) → Project settings → API: URL y service_role |

Mientras falte una variable, Sistemas lo dice junto al job («falta APIFY_TOKEN en Vercel») y el latido sigue en rojo, que es lo honesto. Al ponerlas hay que redesplegar (o correr el job a mano, que lee el entorno del deploy actual).

## 3. Costos y límites

- Apify: `instagram-scraper` cobra por resultado; con ≤ 50 piezas al día y un perfil es centavos. El job pide `resultsLimit: 1` por liga.
- Vercel Cron en plan Hobby corre una vez al día por ruta y la hora es aproximada; las rutas tienen `maxDuration` 300 s.
- Kit v4: `growth_stats` sin parámetros devuelve el total actual de suscriptores.

## 4. Lo que sigue siendo manual y por qué

- Saves y follows por pieza: solo salen por la Graph API de Instagram con app de Meta aprobada; Apify no los da. Mientras, `registrar_metrica_manual`.
- Métricas de historias: no hay API pública; Mariela las anota al día siguiente.
- Outliers de cuentas de terceros: los analiza Claude desde Cowork (Apify por dentro del skill si hace falta) y los guarda en la biblioteca con `crear_formato` y `agregar_referencia`. No hay job porque el criterio es humano.
