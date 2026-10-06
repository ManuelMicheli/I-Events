-- Request -> proposals from several agencies -> client accepts one -> events.
select tests.create_user('owner@agency-a.test') as a_owner \gset
select tests.create_user('owner@agency-b.test') as b_owner \gset
select tests.create_user('owner@agency-c.test') as c_owner \gset
select tests.create_user('brand@client.test') as client_user \gset
select tests.create_user('junior@client.test') as client_member \gset

set role authenticated;

select tests.login('owner@agency-a.test');
select public.create_organization('agency', 'Agenzia A', 'agenzia-a') as agency_a \gset
select tests.login('owner@agency-b.test');
select public.create_organization('agency', 'Agenzia B', 'agenzia-b') as agency_b \gset
update public.marketplace_profiles set is_listed = true where org_id = :'agency_b';
select tests.login('owner@agency-c.test');
select public.create_organization('agency', 'Agenzia C', 'agenzia-c') as agency_c \gset

select tests.login('brand@client.test');
select public.create_organization('client', 'Brand Spa', 'brand-spa') as client \gset
select public.invite_member(:'client', 'junior@client.test', 'member') as junior_token \gset
select tests.login('owner@agency-a.test');
select public.invite_connection(:'agency_a', :'client') as conn \gset
select tests.login('brand@client.test');
select public.accept_connection(:'conn', :'client');

-- Draft single event.
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date, guests, city)
values (:'client', :'client_user', 'single', 'Lancio prodotto', 'product_launch', '2026-11-20', 300, 'Milano')
returning id as req \gset
insert into public.request_items (request_id, category_key, answers)
values (:'req', 'venue', '{"space_type":"private","setting":"indoor"}'), (:'req', 'security', '{"guards":6}');
select tests.ok(tests.error_of(format($$insert into public.request_items (request_id, category_key) values (%L, 'unknown')$$, :'req')) = '23503', 'unknown service rejected');
select tests.ok(tests.error_of(format($$update public.requests set status = 'sent' where id = %L$$, :'req')) = '42501', 'status not writable directly');

select tests.login('owner@agency-a.test');
select tests.ok(not exists (select 1 from public.requests where id = :'req'), 'agency cannot see a draft');

-- Members can draft but not send.
select tests.login('junior@client.test');
select public.accept_member_invitation(:'junior_token');
select tests.ok(tests.error_of(format($$select public.submit_request(%L, array[%L]::uuid[])$$, :'req', :'agency_a')) = '42501', 'member cannot send');

select tests.login('brand@client.test');
select tests.ok(tests.error_of(format($$select public.submit_request(%L, array[%L]::uuid[])$$, :'req', :'agency_c')) = '42501', 'unconnected unlisted agency unreachable');
select tests.ok(tests.error_of(format($$select public.submit_request(%L, array[%L, %L, %L, %L]::uuid[])$$, :'req', :'agency_a', :'agency_b', :'agency_c', :'client')) = '22023', 'trial allows 3 agencies');
select tests.ok(public.submit_request(:'req', array[:'agency_a', :'agency_b']::uuid[]) = 2, 'sent to two agencies');
select tests.ok(tests.error_of(format($$update public.requests set title = 'Cambiato' where id = %L$$, :'req')) is null
  and (select title from public.requests where id = :'req') = 'Lancio prodotto', 'sent request is frozen');

select tests.login('owner@agency-c.test');
select tests.ok(not exists (select 1 from public.requests where id = :'req'), 'other agencies see nothing');
select tests.ok(not exists (select 1 from public.organizations where id = :'client'), 'other agencies do not see the client');

select tests.login('owner@agency-b.test');
select tests.ok(exists (select 1 from public.organizations where id = :'client'), 'marketplace agency sees the client that asked it');

select tests.login('owner@agency-a.test');
select tests.ok((select count(*) from public.request_items where request_id = :'req') = 2, 'agency reads the brief');
select tests.ok((select count(*) from public.proposals) = 1, 'agency sees only its own proposal');
select id as prop_a from public.proposals where request_id = :'req' \gset
select public.set_proposal_status(:'prop_a', 'reviewing');
insert into public.messages (proposal_id, author_id, author_org_id, body, internal)
values (:'prop_a', :'a_owner', :'agency_a', 'Nota interna: margine 20%', true),
       (:'prop_a', :'a_owner', :'agency_a', 'Avete già una location?', false);
select tests.ok(tests.error_of(format($$select public.accept_proposal(%L)$$, :'prop_a')) = '42501', 'agency cannot accept its own proposal');
select public.submit_proposal(:'prop_a', 18500, 'Proposta completa', '[{"category":"venue","amount":9000}]');

select tests.login('owner@agency-b.test');
select id as prop_b from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop_b', 16000, 'Offerta B');

select tests.login('brand@client.test');
select tests.ok((select count(*) from public.proposals where request_id = :'req') = 2, 'client compares both proposals');
select tests.ok((select count(*) from public.messages where proposal_id = :'prop_a') = 1, 'client does not see internal notes');
select tests.ok(tests.error_of(format($$insert into public.messages (proposal_id, author_id, author_org_id, body, internal) values (%L, %L, %L, 'x', true)$$, :'prop_a', :'client_user', :'client')) = '42501', 'client cannot write internal notes');
select public.request_revision(:'prop_b', 'Potete includere il DJ?');
select tests.ok((select status from public.proposals where id = :'prop_b') = 'revision_requested', 'revision requested');
select tests.ok(tests.error_of(format($$select public.accept_proposal(%L)$$, :'prop_b')) = '22023', 'cannot accept a proposal under revision');

select count(*) as n_events from public.accept_proposal(:'prop_a') \gset
select tests.ok(:n_events = 1, 'one event for a single request');
select tests.ok((select status from public.requests where id = :'req') = 'awarded', 'request awarded');
select tests.ok((select status from public.proposals where id = :'prop_b') = 'rejected', 'other proposal rejected');
select tests.ok(tests.error_of(format($$select public.accept_proposal(%L)$$, :'prop_b')) = '22023', 'cannot accept twice');

select tests.login('owner@agency-b.test');
select tests.ok(not exists (select 1 from public.events), 'losing agency sees no event');
select tests.ok(tests.error_of(format($$select public.submit_proposal(%L, 1, 'late')$$, :'prop_b')) = '22023', 'cannot resubmit after the decision');

select tests.login('owner@agency-a.test');
select id as ev from public.events where request_id = :'req' \gset
update public.events set status = 'preparing' where id = :'ev';
select tests.ok(tests.error_of(format($$update public.events set status = 'completed' where id = %L$$, :'ev')) = '22023', 'event cannot skip live');

-- Campaign: three stages -> three events.
select tests.login('brand@client.test');
insert into public.requests (client_org_id, created_by, kind, title, objective, campaign)
values (:'client', :'client_user', 'campaign', 'Tour estivo', 'brand_awareness', '{"eventsCount":3,"sameVenue":false,"servicesMode":"shared"}')
returning id as camp \gset
insert into public.campaign_stages (request_id, position, city, date) values
  (:'camp', 0, 'Milano', '2027-06-01'), (:'camp', 1, 'Roma', '2027-06-08');
insert into public.request_items (request_id, category_key, answers) values (:'camp', 'entertainment', '{"kind":["dj"]}');
select tests.ok(tests.error_of(format($$select public.submit_request(%L, array[%L]::uuid[])$$, :'camp', :'agency_a')) = '22023', 'stages must match events count');
insert into public.campaign_stages (request_id, position, city, date) values (:'camp', 2, 'Napoli', '2027-06-15');
select public.submit_request(:'camp', array[:'agency_a']::uuid[]);
select tests.ok(tests.error_of(format($$insert into public.campaign_stages (request_id, position) values (%L, 3)$$, :'camp')) = '42501', 'stages frozen after sending');

select tests.login('owner@agency-a.test');
select id as prop_camp from public.proposals where request_id = :'camp' \gset
select public.submit_proposal(:'prop_camp', 42000, 'Tour completo');
select tests.login('brand@client.test');
select count(*) as n_camp from public.accept_proposal(:'prop_camp') \gset
select tests.ok(:n_camp = 3, 'one event per campaign stage');
select tests.ok((select string_agg(city, ',' order by start_date) from public.events where request_id = :'camp') = 'Milano,Roma,Napoli', 'events follow the stages');

reset role;
