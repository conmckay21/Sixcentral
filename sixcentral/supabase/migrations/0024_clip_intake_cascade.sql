-- ============================================================================
--  SixCentral — 0024 (applied live 3 Jul 2026)
--  An intake record without its clip is meaningless. Cascade it so moderation
--  and manual clip deletions are never blocked by processing rows. Found when
--  a manual delete of an uploaded clip hit the NO ACTION constraint.
-- ============================================================================
alter table public.clip_intake
  drop constraint clip_intake_clip_id_fkey,
  add constraint clip_intake_clip_id_fkey
    foreign key (clip_id) references public.clip_submissions(id) on delete cascade;
