-- Add bilingual description columns to public.resources so PT-BR and EN
-- views can display coherent, localized descriptions while preserving `description`
-- as a fallback for user-submitted or single-language entries.

alter table public.resources
  add column if not exists description_pt text,
  add column if not exists description_en text;

comment on column public.resources.description_pt is
  'Localized Brazilian Portuguese description for catalog display.';

comment on column public.resources.description_en is
  'Localized English description for catalog display.';
