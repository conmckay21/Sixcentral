-- ============================================================================
--  SixCentral — 0019 (applied live 2 Jul 2026)
--  The original 0001 status check on clip_submissions predated the clips
--  build and rejected 'approved', silently blocking moderation. Dropped;
--  clip_status_valid (pending/approved/rejected) is the single status law.
-- ============================================================================
alter table clip_submissions drop constraint if exists clip_submissions_status_check;
