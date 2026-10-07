-- Public area: a public event has a page anyone can read and a registration that needs no account.
select tests.create_user('owner@pub-agency.test') as a_owner \gset
select tests.create_user('brand@pub-client.test') as c_owner \gset
select tests.create_user('owner@pub-other.test') as o_owner \gset

set role authenticated;
select tests.login('owner@pub-agency.test');
select public.create_organization('agency', 'Agenzia Pubblica', 'agenzia-pubblica') as agency \gset
select public.invite_connection(:'agency', p_email => 'brand@pub-client.test') as conn \gset
select tests.login('owner@pub-other.test');
select public.create_organization('agency', 'Altra Pubblica', 'altra-pubblica') as other \gset
select tests.login('brand@pub-client.test');
select public.create_organization('client', 'Brand Pubblico', 'brand-pubblico') as client \gset
select public.accept_connection(:'conn', :'client');

-- Two events from two requests: one open to the public, one private.
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date, city, is_public)
values (:'client', :'c_owner', 'single', 'Notte bianca', 'other', '2027-06-12', 'Milano', true) returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security');
select public.submit_request(:'req', array[:'agency']::uuid[]);
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date, city)
values (:'client', :'c_owner', 'single', 'Cena riservata', 'other', '2027-06-20', 'Milano') returning id as req2 \gset
insert into public.request_items (request_id, category_key) values (:'req2', 'security');
select public.submit_request(:'req2', array[:'agency']::uuid[]);
select tests.login('owner@pub-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select id as prop2 from public.proposals where request_id = :'req2' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select public.submit_proposal(:'prop2', 3000, 'Proposta');
select tests.login('brand@pub-client.test');
select public.accept_proposal(:'prop') as event \gset
select public.accept_proposal(:'prop2') as private_event \gset

-- The agency writes the page; the company cannot.
select tests.login('owner@pub-agency.test');
update public.events set public_description = 'Musica fino all''alba.', public_starts_at = '21:00', public_capacity = 5
 where id = :'event';
select tests.ok((select public_capacity = 5 from public.events where id = :'event'), 'the agency sets the public page');
select tests.login('brand@pub-client.test');
update public.events set public_capacity = 500 where id = :'event';
select tests.ok((select public_capacity = 5 from public.events where id = :'event'), 'the company cannot change the page');

-- Anyone reads the calendar, only public events and only the page fields.
reset role;
set role anon;
select tests.ok((select count(*) from public.public_events()) = 1, 'the calendar lists only public events');
select tests.ok(
  (select title = 'Notte bianca' and organizer = 'Brand Pubblico' and produced_by = 'Agenzia Pubblica' and city = 'Milano'
          and starts_at = '21:00' and capacity = 5 and registered = 0 and description = 'Musica fino all''alba.'
     from public.public_events()),
  'the calendar shows the page');
select tests.ok((select count(*) from public.public_events('2027-06-13', null)) = 0, 'the calendar filters from a day');
select tests.ok((select count(*) from public.public_events(null, '2027-06-11')) = 0, 'the calendar filters up to a day');
select tests.ok((select count(*) from public.public_event(:'event')) = 1, 'the page opens from its link');
select tests.ok((select count(*) from public.public_event(:'private_event')) = 0, 'a private event has no page');
select tests.ok(tests.error_of('select 1 from public.events') = '42501', 'anon cannot read events');
select tests.ok(tests.error_of('select 1 from public.event_registrations') = '42501', 'anon cannot read registrations');
select tests.ok(tests.error_of('select public.public_event_rows()') = '42501', 'the inner rows stay private');

-- Registration without an account.
select public.register_for_event(:'event', '  Giulia Rossi ', 'Giulia@Example.com', 2) as token \gset
select tests.ok(:'token' ~ '^[0-9a-f]{32}$', 'registering returns the ticket code');
select tests.ok(
  (select name = 'Giulia Rossi' and guests = 2 and title = 'Notte bianca' and organizer = 'Brand Pubblico' and number is not null
     from public.registration_ticket(:'token')),
  'the ticket opens from its code');
select tests.ok((select count(*) from public.registration_ticket(upper(:'token'))) = 1, 'the code works in capitals');
select tests.ok((select count(*) from public.registration_ticket(repeat('0', 32))) = 0, 'a wrong code shows nothing');
select tests.ok((select registered = 2 from public.public_event(:'event')), 'the page counts the people');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Giulia', 'giulia@example.com')$$, :'event')) = '23505', 'one registration per email');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Luca', 'luca@example.com', 4)$$, :'event')) = 'P0001', 'no more people than places left');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Luca', 'luca@example.com', 5)$$, :'event')) = '23514', 'at most 4 people each');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Luca', 'non-una-mail')$$, :'event')) = '23514', 'the email must look like one');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'L', 'luca@example.com')$$, :'event')) = '23514', 'the name needs two letters');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Luca', 'luca@example.com')$$, :'private_event')) = 'P0002', 'a private event takes no registrations');
select public.register_for_event(:'event', 'Luca', 'luca@example.com', 3) as token2 \gset
select tests.ok((select registered = 5 from public.public_event(:'event')), 'the last places can be taken');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Anna', 'anna@example.com')$$, :'event')) = 'P0001', 'a full event takes no more');

-- Giving the place back frees it.
select public.cancel_registration(:'token2');
select tests.ok((select count(*) from public.registration_ticket(:'token2')) = 0, 'a cancelled ticket shows nothing');
select tests.ok((select registered = 2 from public.public_event(:'event')), 'the places come back');
reset role;

-- The agency and the company see who registered; other agencies do not.
set role authenticated;
select tests.login('owner@pub-agency.test');
select tests.ok((select count(*) from public.event_registrations where event_id = :'event') = 1, 'the agency sees the registrations');
select tests.ok(tests.error_of(format($$delete from public.event_registrations where event_id = %L$$, :'event')) = '42501', 'nobody deletes them directly');
select tests.login('brand@pub-client.test');
select tests.ok((select count(*) from public.event_registrations where event_id = :'event') = 1, 'the company sees the registrations');
select tests.login('owner@pub-other.test');
select tests.ok((select count(*) from public.event_registrations) = 0, 'other agencies do not');

-- A cancelled event keeps its page but takes no registrations and leaves the calendar.
select tests.login('owner@pub-agency.test');
update public.events set status = 'cancelled' where id = :'event';
reset role;
set role anon;
select tests.ok((select count(*) from public.public_events()) = 0, 'a cancelled event leaves the calendar');
select tests.ok((select status = 'cancelled' from public.public_event(:'event')), 'its page still opens');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Anna', 'anna@example.com')$$, :'event')) = '22023', 'registrations are closed');
select tests.ok((select status = 'cancelled' from public.registration_ticket(:'token')), 'the ticket says it was cancelled');
reset role;

-- An event of the city sells its tickets on its own website: the page links to it, no registration here.
update public.events set is_public = true, public_url = 'https://example.com/cena', public_organizer = 'Comune di Milano'
 where id = :'private_event';
set role anon;
select tests.ok((select website = 'https://example.com/cena' from public.public_event(:'private_event')), 'the page shows the website');
select tests.ok((select organizer = 'Comune di Milano' from public.public_event(:'private_event')), 'and names the real organiser');
reset role;
update public.events set public_image_url = 'https://example.com/poster.jpg', public_image_credit = 'Comune di Milano' where id = :'private_event';
set role anon;
select tests.ok((select image = 'https://example.com/poster.jpg' and image_credit = 'Comune di Milano' from public.public_event(:'private_event')), 'the page shows the poster and its credit');
select tests.ok(tests.error_of(format($$select public.register_for_event(%L, 'Anna', 'anna@example.com')$$, :'private_event')) = '22023', 'it takes no registrations');
reset role;
select tests.ok(tests.error_of(format($$update public.events set public_url = 'http://example.com' where id = %L$$, :'private_event')) = '23514', 'the website needs https');

-- The days gone by: an event already on stage leaves the calendar of today, and shows when looking back
-- (the cancelled one stays out of both).
update public.events set status = 'preparing' where id = :'private_event';
update public.events set status = 'live' where id = :'private_event';
update public.events set status = 'completed', start_date = current_date - 10 where id = :'private_event';
set role anon;
select tests.ok((select count(*) from public.public_events()) = 0, 'a past event is not in the calendar of today');
select tests.ok((select count(*) from public.public_events(current_date - 30, null)) = 1, 'it shows when looking back');
reset role;
