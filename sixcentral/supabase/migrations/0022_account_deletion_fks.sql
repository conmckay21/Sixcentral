-- 0022: unblock account deletion. Reviewer and pin history keeps the row, loses the actor.
alter table public.clip_submissions
  drop constraint clip_submissions_reviewed_by_fkey,
  add constraint clip_submissions_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.contributions
  drop constraint contributions_reviewed_by_fkey,
  add constraint contributions_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.map_pins
  drop constraint map_pins_submitted_by_fkey,
  add constraint map_pins_submitted_by_fkey
    foreign key (submitted_by) references public.profiles(id) on delete set null;
