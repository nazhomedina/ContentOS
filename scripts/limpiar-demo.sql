-- Borra los datos de demostración del 2026-09-07 (piezas DEMO-*, sus tareas, historias de muestra y el recurso RORY).
-- Correr cuando entren las piezas reales del import de Notion.
delete from historias where serie in ('te_lo_resumo','amplificacion','archivo_folklore','criterio_viernes')
  and copy in (
    'Leí Alchemy de Rory Sutherland para que tú no tengas que hacerlo.' || E'\n\n' || 'Responde «RORY» y te mando el resumen.',
    'Primer frame del reel + sticker de compartir',
    'Foto de archivo: la primera oficina de Folklore, 2011. Texto nativo.',
    'Screenshot del render de CRITERIO #001 + link.');
delete from piezas where id_publico like 'DEMO-%';   -- tareas, métricas y comentarios caen en cascada
delete from recursos where slug_go = 'rory-sutherland' and leads is null;
