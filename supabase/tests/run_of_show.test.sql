-- Run of show: the agency team builds the schedule and checks people in; nobody else sees it.
select tests.create_user('owner@ros-agency.test') as a_owner \gset
select tests.create_user('ops@ros-agency.test') as a_ops \gset
select tests.create_user('owner@ros-other.test') as o_owner \gset
select tests.create_user('brand@ros-client.test') as c_owner \gset

set role authenticated;
select tests.login('owner@ros-agency.test');
select public.create_organization('agency', 'Agenzia Scaletta', 'agenzia-scaletta') as agency \gset
select public.invite_member(:'agency', 'ops@ros-agency.test', 'member') as ops_token \gset
select public.invite_connection(:'agency', p_email => 'brand@ros-client.test') as conn \gset
select tests.login('ops@ros-agency.test');
select public.accept_member_invitation(:'ops_token');
select tests.login('owner@ros-other.test');
select public.create_organization('agency', 'Altra Scaletta', 'altra-scaletta') as other \gset

select tests.login('brand@ros-client.test');
select public.create_organization('client', 'Brand Scaletta', 'brand-scaletta') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Gala', 'other', '2027-06-12') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@ros-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('brand@ros-client.test');
select public.accept_proposal(:'prop') as event \gset

select tests.login('owner@ros-agency.test');
select id as booking from public.event_bookings where event_id = :'event' \gset

-- Schedule: the agency is taken from the event, the person in charge must be a colleague.
insert into public.event_schedule_items (event_id, org_id, day, starts_at, ends_at, title, booking_id, assignee_id, created_by)
values (:'event', :'other', '2027-06-12', '17:00', '18:00', 'Arrivo sicurezza e briefing', :'booking', :'a_ops', :'a_owner') returning id as item \gset
select tests.ok((select org_id from public.event_schedule_items where id = :'item') = :'agency', 'agency taken from the event');
select tests.ok(tests.error_of(format($$insert into public.event_schedule_items (event_id, day, starts_at, title, assignee_id, created_by) values (%L, '2027-06-12', '19:00', 'x', %L, %L)$$, :'event', :'o_owner', :'a_owner')) = '42501', 'only colleagues are in charge');
select tests.ok(tests.error_of(format($$insert into public.event_schedule_items (event_id, day, starts_at, title, created_by) values (%L, '2027-06-12', '25:00', 'x', %L)$$, :'event', :'a_owner')) = '22008', 'times are validated');

-- Crew: a supplier booking once per day, a colleague, an external hostess by name.
insert into public.event_crew (event_id, booking_id, day, call_time, created_by) values (:'event', :'booking', '2027-06-12', '17:00', :'a_owner') returning id as sup \gset
select tests.ok(tests.error_of(format($$insert into public.event_crew (event_id, booking_id, day, created_by) values (%L, %L, '2027-06-12', %L)$$, :'event', :'booking', :'a_owner')) = '23505', 'a supplier is listed once per day');
insert into public.event_crew (event_id, user_id, day, call_time, created_by) values (:'event', :'a_ops', '2027-06-12', '16:00', :'a_owner') returning id as ops \gset
insert into public.event_crew (event_id, name, role, phone, day, created_by) values (:'event', 'Sara', 'Hostess', '333 1234567', '2027-06-12', :'a_owner') returning id as hostess \gset
select tests.ok(tests.error_of(format($$insert into public.event_crew (event_id, day, created_by) values (%L, '2027-06-12', %L)$$, :'event', :'a_owner')) = '23514', 'someone must be named');
select tests.ok(tests.error_of(format($$insert into public.event_crew (event_id, user_id, day, created_by) values (%L, %L, '2027-06-12', %L)$$, :'event', :'o_owner', :'a_owner')) = '42501', 'staff must be colleagues');

-- Check-in: the arrival time sent by an offline device is kept, but never in the future.
select tests.login('ops@ros-agency.test');
update public.event_crew set checked_in_at = now() - interval '20 minutes' where id = :'sup';
select tests.ok((select checked_in_by = :'a_ops' and checked_in_at between now() - interval '21 minutes' and now() - interval '19 minutes' from public.event_crew where id = :'sup'), 'offline arrival time kept');
update public.event_crew set checked_in_at = now() + interval '3 hours' where id = :'hostess';
select tests.ok((select checked_in_at <= now() from public.event_crew where id = :'hostess'), 'no check-in in the future');
select tests.login('owner@ros-agency.test');
update public.event_crew set checked_in_at = now() where id = :'sup';
select tests.ok((select checked_in_by from public.event_crew where id = :'sup') = :'a_ops', 'first check-in wins');
update public.event_crew set checked_in_at = null where id = :'hostess';
select tests.ok((select checked_in_by is null from public.event_crew where id = :'hostess'), 'check-in can be undone');
select tests.ok(tests.error_of(format($$update public.event_crew set user_id = %L where id = %L$$, :'a_owner', :'hostess')) = '42501', 'the person cannot be swapped');

-- Other agencies and the client see nothing.
select tests.login('owner@ros-other.test');
select tests.ok(not exists (select 1 from public.event_schedule_items) and not exists (select 1 from public.event_crew), 'other agencies see nothing');
select tests.ok(tests.error_of(format($$insert into public.event_schedule_items (event_id, day, starts_at, title, created_by) values (%L, '2027-06-12', '19:00', 'x', %L)$$, :'event', :'o_owner')) = '42501', 'other agencies cannot write');
select tests.login('brand@ros-client.test');
select tests.ok(not exists (select 1 from public.event_schedule_items) and not exists (select 1 from public.event_crew), 'the client sees nothing');
