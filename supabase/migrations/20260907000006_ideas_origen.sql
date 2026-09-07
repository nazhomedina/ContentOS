-- 006 · Ideas: orígenes del banco de Notion (Legacy, Nazho) y trazabilidad a la página original.
alter table ideas drop constraint if exists ideas_origen_check;
alter table ideas add constraint ideas_origen_check
  check (origen in ('radar','voz','destilado','markie','coyuntura','audiencia','claude','legado','nazho'));
alter table ideas add column if not exists notion_url text;
alter table ideas add column if not exists formato_sugerido text[] not null default '{}';
create unique index if not exists ideas_notion_url on ideas (notion_url);
