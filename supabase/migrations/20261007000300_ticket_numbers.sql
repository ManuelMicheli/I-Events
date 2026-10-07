-- Ticket numbers ("#0142"): every request has a 4-digit number from one shared sequence, the same
-- in every screen for client, agency and suppliers. Its events carry the request's number (campaign
-- events add the stage, "#0142-2" in the interface).
create sequence public.ticket_number_seq start 101;

alter table public.requests add column number int;
alter table public.events add column number int;

-- Existing rows get numbers in creation order.
with ordered as (select id, row_number() over (order by created_at, id) as n from public.requests)
update public.requests r set number = 100 + ordered.n from ordered where r.id = ordered.id;
select setval('public.ticket_number_seq', greatest((select max(number) from public.requests), 100) + 1, false);
update public.events e set number = r.number from public.requests r where r.id = e.request_id;

-- The default only keeps the column optional on insert: the triggers below always set it.
alter table public.requests alter column number set not null, alter column number set default 0;
alter table public.requests add constraint requests_number_key unique (number);
alter table public.events alter column number set not null, alter column number set default 0;

-- The database always picks the number: whatever an insert sends is replaced. Security definer
-- because only the owner may use the sequence.
create function public.requests_assign_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.number := nextval('ticket_number_seq');
  return new;
end;
$$;
create trigger requests_assign_number before insert on public.requests
  for each row execute function public.requests_assign_number();

-- Events take the type and the number of their request.
create or replace function public.events_inherit_type()
returns trigger language plpgsql set search_path = public as $$
begin
  select coalesce(new.event_type, r.event_type), r.number into new.event_type, new.number
    from requests r where r.id = new.request_id;
  return new;
end;
$$;
