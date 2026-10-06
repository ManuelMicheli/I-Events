-- Event workspace: bookings are seeded from the brief and stay private to the agency.
select tests.create_user('owner@book-agency.test') as a_owner \gset
select tests.create_user('ops@book-agency.test') as a_ops \gset
select tests.create_user('owner@book-other.test') as o_owner \gset
select tests.create_user('brand@book-client.test') as c_owner \gset

set role authenticated;
select tests.login('owner@book-agency.test');
select public.create_organization('agency', 'Agenzia Book', 'agenzia-book') as agency \gset
select public.invite_member(:'agency', 'ops@book-agency.test', 'member') as ops_token \gset
select public.invite_connection(:'agency', p_email => 'brand@book-client.test') as conn \gset
select tests.login('ops@book-agency.test');
select public.accept_member_invitation(:'ops_token');
select tests.login('owner@book-other.test');
select public.create_organization('agency', 'Altra Book', 'altra-book') as other \gset
insert into public.contacts (org_id, name, created_by) values (:'other', 'Fornitore altrui', :'o_owner') returning id as foreign_contact \gset

select tests.login('brand@book-client.test');
select public.create_organization('client', 'Brand Book', 'brand-book') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Lancio prodotto', 'other', '2027-03-10') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security'), (:'req', 'venue'), (:'req', 'entertainment');
select public.submit_request(:'req', array[:'agency']::uuid[]);

select tests.login('owner@book-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 20000, 'Proposta');
select tests.login('brand@book-client.test');
select public.accept_proposal(:'prop') as event \gset

-- Seeded from the brief, in catalog order.
select tests.login('ops@book-agency.test');
select tests.ok((select array_agg(service_key order by created_at, service_key) from public.event_bookings where event_id = :'event') @> '{entertainment,security,venue}'
  and (select count(*) from public.event_bookings where event_id = :'event') = 3, 'one booking per requested service');
select tests.ok(not exists (select 1 from public.event_bookings where event_id = :'event' and status <> 'to_book'), 'bookings start to book');

-- Choosing and confirming a supplier.
insert into public.contacts (org_id, name, phone, services, created_by) values (:'agency', 'Sicura Srl', '+390211112222', '{security}', :'a_ops') returning id as supplier \gset
select id as security_booking from public.event_bookings where event_id = :'event' and service_key = 'security' \gset
select tests.ok(tests.error_of(format($$update public.event_bookings set status = 'confirmed' where id = %L$$, :'security_booking')) = '23514', 'cannot confirm without a supplier');
select tests.ok(tests.error_of(format($$update public.event_bookings set contact_id = %L where id = %L$$, :'foreign_contact', :'security_booking')) = '42501', 'supplier must be in our address book');
update public.event_bookings set contact_id = :'supplier', status = 'confirmed', planned_cost = 3000, actual_cost = 3200 where id = :'security_booking';
select tests.ok((select status = 'confirmed' and actual_cost = 3200 from public.event_bookings where id = :'security_booking'), 'member books a supplier');
select tests.ok(tests.error_of(format($$update public.event_bookings set event_id = gen_random_uuid() where id = %L$$, :'security_booking')) = '42501', 'event is fixed');

-- Extra bookings and removal.
insert into public.event_bookings (event_id, service_key, description, planned_cost, created_by)
values (:'event', 'catering', 'Aperitivo di benvenuto', 1500, :'a_ops') returning id as extra \gset
select tests.ok((select org_id from public.event_bookings where id = :'extra') = :'agency', 'agency filled in from the event');
insert into public.event_bookings (event_id, org_id, service_key, created_by) values (:'event', :'other', 'av', :'a_ops') returning id as forged \gset
select tests.ok((select org_id from public.event_bookings where id = :'forged') = :'agency', 'agency always taken from the event');
delete from public.event_bookings where id = :'forged';
delete from public.event_bookings where id = :'extra';
select tests.ok(not exists (select 1 from public.event_bookings where id = :'extra'), 'members remove bookings');

-- Deleting the supplier from the address book keeps the booking and its costs.
select tests.login('owner@book-agency.test');
delete from public.contacts where id = :'supplier';
select tests.ok((select contact_id is null and status = 'confirmed' and actual_cost = 3200 from public.event_bookings where id = :'security_booking'), 'booking survives supplier removal');

-- Nobody else sees or writes them.
select tests.login('brand@book-client.test');
select tests.ok(not exists (select 1 from public.event_bookings), 'client does not see suppliers or costs');
select tests.ok(tests.error_of(format($$insert into public.event_bookings (event_id, service_key, created_by) values (%L, 'av', %L)$$, :'event', :'c_owner')) = '42501', 'client cannot add bookings');
select tests.login('owner@book-other.test');
select tests.ok(not exists (select 1 from public.event_bookings), 'other agencies see nothing');
select tests.ok(tests.error_of(format($$insert into public.event_bookings (event_id, service_key, created_by) values (%L, 'av', %L)$$, :'event', :'o_owner')) = '42501', 'other agencies cannot add bookings');
select tests.ok(tests.error_of(format($$update public.event_bookings set org_id = %L$$, :'other')) = '42501', 'agency column not writable');
