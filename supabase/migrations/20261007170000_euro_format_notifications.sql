-- The supplier's price in the agency's notification reads '1.700,00 €' whatever the database locale
-- (to_char's G and D follow lc_numeric, which printed '1,700.00 €').
create or replace function public.respond_to_booking(p_booking uuid, p_available boolean, p_price numeric default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b event_bookings;
  v_supplier text;
  v_service text;
  v_event text;
begin
  if not is_booking_supplier(p_booking) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from event_bookings where id = p_booking for update;
  if b.status <> 'requested' then raise exception 'request is not open' using errcode = '22023'; end if;
  if p_price is not null and (p_price < 0 or p_price > 10000000) then raise exception 'invalid price' using errcode = '22023'; end if;
  update event_bookings
     set supplier_response = case when p_available then 'available' else 'unavailable' end,
         supplier_price = case when p_available then round(p_price, 2) end,
         supplier_note = nullif(left(trim(p_note), 2000), ''),
         responded_at = now(),
         planned_cost = case when p_available and planned_cost is null then round(p_price, 2) else planned_cost end
   where id = b.id;
  select o.name into v_supplier from contacts c join organizations o on o.id = c.supplier_org_id where c.id = b.contact_id;
  select coalesce(name ->> 'it', key) into v_service from service_categories where key = b.service_key;
  select title into v_event from events where id = b.event_id;
  perform notify_org(b.org_id, 'booking_response',
    case when p_available then format('%s è disponibile', v_supplier) else format('%s non è disponibile', v_supplier) end,
    concat_ws(' · ', v_service, v_event,
      case when p_available and p_price is not null then translate(to_char(p_price, 'FM999,999,990.00'), ',.', '.,') || ' €' end,
      nullif(left(trim(p_note), 200), '')),
    '/pro/eventi/' || b.event_id);
  perform log_activity(b.org_id, 'event_booking', b.id, case when p_available then 'available' else 'unavailable' end);
end;
$$;

