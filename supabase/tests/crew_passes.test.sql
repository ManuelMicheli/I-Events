-- Crew passes: each person on site has a random pass; the link alone shows it, nobody can set or change it.
select tests.create_user('owner@pass-agency.test') as a_owner \gset
select tests.create_user('owner@pass-other.test') as o_owner \gset
select tests.create_user('brand@pass-client.test') as c_owner \gset

set role authenticated;
select tests.login('owner@pass-agency.test');
select public.create_organization('agency', 'Agenzia Pass', 'agenzia-pass') as agency \gset
select public.invite_connection(:'agency', p_email => 'brand@pass-client.test') as conn \gset
select tests.login('owner@pass-other.test');
select public.create_organization('agency', 'Altra Pass', 'altra-pass') as other \gset
select tests.login('brand@pass-client.test');
select public.create_organization('client', 'Brand Pass', 'brand-pass') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Gala dei pass', 'other', '2027-06-12') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@pass-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('brand@pass-client.test');
select public.accept_proposal(:'prop') as event \gset

select tests.login('owner@pass-agency.test');
select id as booking from public.event_bookings where event_id = :'event' \gset
insert into public.event_crew (event_id, name, role, day, call_time, created_by)
values (:'event', 'Sara', 'Hostess', '2027-06-12', '18:30', :'a_owner') returning id as hostess, pass_token as token \gset
insert into public.event_crew (event_id, booking_id, day, created_by) values (:'event', :'booking', '2027-06-12', :'a_owner') returning id as sup, pass_token as sup_token \gset
insert into public.event_crew (event_id, user_id, day, created_by) values (:'event', :'a_owner', '2027-06-12', :'a_owner') returning pass_token as staff_token \gset

select tests.ok(:'token' ~ '^[0-9a-f]{32}$' and :'token' <> :'sup_token', 'every person gets a different random pass');
select tests.ok(tests.error_of(format($$insert into public.event_crew (event_id, name, day, pass_token, created_by) values (%L, 'Luca', '2027-06-12', %L, %L)$$, :'event', repeat('a', 32), :'a_owner')) = '42501', 'the pass cannot be chosen');
select tests.ok(tests.error_of(format($$update public.event_crew set pass_token = %L where id = %L$$, repeat('b', 32), :'hostess')) = '42501', 'the pass cannot be changed');

-- The link works without an account and shows only that pass.
reset role;
set role anon;
select tests.ok(
  (select event_title = 'Gala dei pass' and agency_name = 'Agenzia Pass' and person = 'Sara' and role = 'Hostess'
          and day = '2027-06-12' and call_time = '18:30' and checked_in_at is null
     from public.crew_pass(:'token')),
  'anyone with the link sees the pass');
select tests.ok((select count(*) from public.crew_pass(upper(:'token'))) = 1, 'the code works in capitals too');
select tests.ok((select person is null and service_key = 'security' from public.crew_pass(:'sup_token')), 'a supplier without a contact is named by its service');
select tests.ok((select person is not null from public.crew_pass(:'staff_token')), 'a colleague is named from the profile');
select tests.ok((select count(*) from public.crew_pass(repeat('0', 32))) = 0, 'a wrong code shows nothing');
select tests.ok((select count(*) from public.crew_pass('')) = 0, 'an empty code shows nothing');
select tests.ok(tests.error_of('select 1 from public.event_crew') = '42501', 'anon still cannot read the crew');
reset role;

-- The check-in recorded on site shows on the pass.
set role authenticated;
select tests.login('owner@pass-agency.test');
update public.event_crew set checked_in_at = now() where id = :'hostess';
reset role;
set role anon;
select tests.ok((select checked_in_at is not null from public.crew_pass(:'token')), 'the pass shows the arrival');
reset role;

-- Other agencies cannot list passes.
set role authenticated;
select tests.login('owner@pass-other.test');
select tests.ok(not exists (select 1 from public.event_crew where pass_token = :'token'), 'other agencies do not see passes');
