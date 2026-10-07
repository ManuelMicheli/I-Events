-- Developer accounts: see and do everything in every organization; everyone else keeps seeing only their own.
select tests.create_user('owner@pa-agency.test') as a_owner \gset
select tests.create_user('owner@pa-client.test') as c_owner \gset
select tests.create_user('someone@pa-other.test') as stranger \gset
select tests.create_user('dev@i-events.test') as dev \gset

set role authenticated;
select tests.login('owner@pa-agency.test');
select public.create_organization('agency', 'Agenzia Admin', 'agenzia-admin') as agency \gset
select public.invite_connection(:'agency', p_email => 'owner@pa-client.test') as conn \gset
select tests.login('owner@pa-client.test');
select public.create_organization('client', 'Brand Admin', 'brand-admin') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Gala admin', 'other', '2027-06-12') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@pa-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('owner@pa-client.test');
select public.accept_proposal(:'prop') as event \gset

-- Before being a developer account, it is a stranger like any other.
select tests.login('dev@i-events.test');
select tests.ok(not public.is_platform_admin(), 'not a developer account yet');
select tests.ok(not exists (select 1 from public.events where id = :'event'), 'a stranger cannot see the event');
select tests.ok((select count(*) from public.my_organizations()) = 0, 'a stranger has no organizations');
select tests.ok(tests.error_of(format($$insert into public.platform_admins (user_id) values (%L)$$, :'dev')) = '42501', 'nobody can make themselves a developer');
select tests.ok(tests.error_of($$select * from public.platform_admins$$) = '42501', 'the list cannot be read');

reset role;
insert into public.platform_admins (user_id, note) values (:'dev', 'test');
set role authenticated;

-- A developer account works in every organization, as owner.
select tests.login('dev@i-events.test');
select tests.ok(public.is_platform_admin(), 'developer account');
select tests.ok((select count(*) from public.my_organizations() where id in (:'agency', :'client') and role = 'owner') = 2, 'every organization is listed, as owner');
select tests.ok(exists (select 1 from public.events where id = :'event'), 'sees the event');
select tests.ok(exists (select 1 from public.requests where id = :'req'), 'sees the request');
select tests.ok(exists (select 1 from public.proposals where id = :'prop'), 'sees the proposal');
update public.events set venue = 'Palazzo Admin' where id = :'event';
select tests.ok((select venue from public.events where id = :'event') = 'Palazzo Admin', 'can change the event');
insert into public.event_crew (event_id, name, day, created_by) values (:'event', 'Sara', '2027-06-12', :'dev') returning id as crew \gset
select tests.ok((select org_id from public.event_crew where id = :'crew') = :'agency', 'can add people to the crew');
select public.invite_member(:'agency', 'new@pa-agency.test', 'member') as inv \gset
select tests.ok(:'inv' is not null, 'can invite into an organization');

-- Its own memberships come first, the others after.
reset role;
insert into public.organizations (type, name, slug, created_by) values ('supplier', 'Zeta Fornitore', 'zeta-fornitore', :'dev') returning id as own \gset
insert into public.memberships (org_id, user_id, role) values (:'own', :'dev', 'admin');
set role authenticated;
select tests.login('dev@i-events.test');
select tests.ok((select id from public.my_organizations() limit 1) = :'own', 'own organizations first');
select tests.ok((select role from public.my_organizations() where id = :'own') = 'admin', 'real role kept where a member');

-- Everyone else is unchanged.
select tests.login('someone@pa-other.test');
select tests.ok(not public.is_platform_admin(), 'others are not developers');
select tests.ok(not exists (select 1 from public.events where id = :'event'), 'others still cannot see the event');
select tests.ok((select count(*) from public.my_organizations()) = 0, 'others see only their own organizations');
select tests.login('owner@pa-agency.test');
select tests.ok((select array_agg(id) from public.my_organizations()) = array[:'agency']::uuid[], 'members see their own organization');
select tests.ok(not exists (select 1 from public.organizations where id = :'own'), 'members do not see unrelated organizations');

set role anon;
select tests.ok(tests.error_of($$select * from public.my_organizations()$$) = '42501', 'anon cannot list organizations');
reset role;
