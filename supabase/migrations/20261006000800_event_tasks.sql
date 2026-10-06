-- Tasks and timeline of an event: what the agency team has to do, by when and by whom. Like bookings,
-- they are internal to the agency. Assigning a task to a colleague notifies them.

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- The agency running the event, always copied from the event.
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  notes text check (length(notes) <= 2000),
  due_date date,
  -- Optional link to the supplier booking the task is about.
  booking_id uuid references public.event_bookings (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_tasks_event_idx on public.event_tasks (event_id, due_date);
create index event_tasks_assignee_idx on public.event_tasks (assignee_id, due_date) where done_at is null;

create function public.event_tasks_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select agency_org_id into new.org_id from events where id = new.event_id;
  elsif new.event_id is distinct from old.event_id or new.org_id is distinct from old.org_id then
    raise exception 'tasks cannot move to another event' using errcode = '22023';
  end if;
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and not exists (select 1 from memberships where org_id = new.org_id and user_id = new.assignee_id) then
    raise exception 'assignee must be in the agency team' using errcode = '42501';
  end if;
  if new.booking_id is not null and (tg_op = 'INSERT' or new.booking_id is distinct from old.booking_id)
     and not exists (select 1 from event_bookings where id = new.booking_id and event_id = new.event_id) then
    raise exception 'booking belongs to another event' using errcode = '22023';
  end if;
  -- Who completed a task is recorded by the database, not sent by the app.
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null) then
    new.done_at := now();
    new.done_by := auth.uid();
  elsif new.done_at is not null then
    new.done_at := old.done_at;
    new.done_by := old.done_by;
  else
    new.done_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_tasks_before_write before insert or update on public.event_tasks
  for each row execute function public.event_tasks_before_write();

create function public.notify_task_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text;
begin
  if new.assignee_id is null or new.assignee_id is not distinct from auth.uid()
     or (tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id) then
    return new;
  end if;
  select title into v_event from events where id = new.event_id;
  insert into notifications (user_id, org_id, kind, title, body, link)
  values (new.assignee_id, new.org_id, 'task_assigned',
          format('Nuova attività: %s', new.title),
          v_event || coalesce(' · entro il ' || to_char(new.due_date, 'DD/MM/YYYY'), ''),
          '/pro/eventi/' || new.event_id);
  return new;
end;
$$;
create trigger event_tasks_notify after insert or update of assignee_id on public.event_tasks
  for each row execute function public.notify_task_assigned();

alter table public.event_tasks enable row level security;
create policy event_tasks_select on public.event_tasks for select to authenticated using (public.is_member(org_id));
create policy event_tasks_insert on public.event_tasks for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_member(e.agency_org_id)));
create policy event_tasks_update on public.event_tasks for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy event_tasks_delete on public.event_tasks for delete to authenticated using (public.is_member(org_id));

revoke all on public.event_tasks from anon, authenticated;
grant select, delete on public.event_tasks to authenticated;
grant insert (event_id, org_id, title, notes, due_date, booking_id, assignee_id, done_at, created_by) on public.event_tasks to authenticated;
grant update (title, notes, due_date, booking_id, assignee_id, done_at) on public.event_tasks to authenticated;

revoke execute on function public.event_tasks_before_write, public.notify_task_assigned from public, anon, authenticated;
