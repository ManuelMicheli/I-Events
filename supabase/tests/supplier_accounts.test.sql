-- Supplier accounts: an agency invites a contact to claim its account; the supplier then answers the
-- agency's requests and sees its schedule, never the agency's costs or notes.
select tests.create_user('owner@sup-agency.test') as a_owner \gset
select tests.create_user('owner@sup-other.test') as o_owner \gset
select tests.create_user('brand@sup-client.test') as c_owner \gset
select tests.create_user('dj@sup-supplier.test') as s_owner \gset
select tests.create_user('crew@sup-supplier.test') as s_member \gset
select tests.create_user('rival@sup-rival.test') as r_owner \gset

set role authenticated;
select tests.login('owner@sup-agency.test');
select public.create_organization('agency', 'Agenzia Fornitori', 'agenzia-fornitori') as agency \gset
select public.invite_connection(:'agency', p_email => 'brand@sup-client.test') as conn \gset
insert into public.contacts (org_id, name, company, phone, services, created_by)
values (:'agency', 'Luca DJ', 'Luca Sound', '+393331112233', '{entertainment}', :'a_owner') returning id as contact \gset
select tests.login('owner@sup-other.test');
select public.create_organization('agency', 'Altra Fornitori', 'altra-fornitori') as other \gset

select tests.login('brand@sup-client.test');
select public.create_organization('client', 'Brand Fornitori', 'brand-fornitori') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Party', 'other', '2027-07-01') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'entertainment');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@sup-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('brand@sup-client.test');
select public.accept_proposal(:'prop') as event \gset

-- The agency asks its DJ before the DJ is on I-Events, and invites them.
select tests.login('owner@sup-agency.test');
select id as booking from public.event_bookings where event_id = :'event' \gset
update public.event_bookings set contact_id = :'contact', status = 'requested', planned_cost = null, notes = 'Margine alto', description = 'DJ set 22-02' where id = :'booking';
select tests.ok((select requested_at is not null from public.event_bookings where id = :'booking'), 'request time recorded');
select tests.login('owner@sup-other.test');
select tests.ok(tests.error_of(format($$select public.invite_supplier(%L)$$, :'contact')) = '42501', 'only the address book owner invites');
select tests.login('owner@sup-agency.test');
select public.invite_supplier(:'contact') as token \gset
select public.invite_supplier(:'contact') as token \gset
select tests.ok((select count(*) from public.supplier_invitations where accepted_at is null) = 1, 'one open invitation per contact');
select tests.ok((select kind = 'supplier' and org_name = 'Agenzia Fornitori' and valid from public.preview_invitation(:'token')), 'invitation preview');

-- The DJ creates a supplier account and claims the contact; a client account cannot.
select tests.login('brand@sup-client.test');
select tests.ok(tests.error_of(format($$select public.accept_supplier_invitation(%L, %L)$$, :'token', :'client')) = '42501', 'only supplier accounts claim');
select tests.login('dj@sup-supplier.test');
select public.create_organization('supplier', 'Luca Sound', 'luca-sound') as supplier \gset
select public.invite_member(:'supplier', 'crew@sup-supplier.test', 'member') as m_token \gset
select tests.ok(public.accept_supplier_invitation(:'token', :'supplier') = :'contact', 'contact claimed');
select tests.ok(tests.error_of(format($$select public.accept_supplier_invitation(%L, %L)$$, :'token', :'supplier')) = 'P0002', 'invitation used once');
select tests.login('crew@sup-supplier.test');
select public.accept_member_invitation(:'m_token');

select tests.login('owner@sup-agency.test');
select tests.ok((select supplier_org_id from public.contacts where id = :'contact') = :'supplier', 'contact linked to the account');
select tests.ok((select name from public.organizations where id = :'supplier') = 'Luca Sound', 'agency reads the linked account name');
select tests.login('owner@sup-other.test');
select tests.ok(not exists (select 1 from public.organizations where id = :'supplier'), 'other agencies do not');
select tests.login('owner@sup-agency.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'supplier_joined' and title = 'Luca DJ è ora su I-Events'), 'agency told');
select tests.ok(tests.error_of(format($$update public.contacts set supplier_org_id = null where id = %L$$, :'contact')) = '42501', 'link not editable');
select tests.ok(tests.error_of(format($$select public.invite_supplier(%L)$$, :'contact')) = '22023', 'no invitation once linked');

-- The supplier sees the pending request, without the agency's notes or costs.
select tests.login('crew@sup-supplier.test');
select tests.ok((select count(*) from public.supplier_bookings(:'supplier')) = 1, 'request visible after claiming');
select tests.ok((select agency_name = 'Agenzia Fornitori' and description = 'DJ set 22-02' and status = 'requested' from public.supplier_bookings(:'supplier')), 'request details');
select tests.ok(not exists (select 1 from public.event_bookings), 'bookings table stays private');
select tests.ok(not exists (select 1 from public.contacts), 'address book stays private');
select tests.ok(not exists (select 1 from public.supplier_bookings(:'agency')), 'not for other organizations');

-- They answer: available at 800. The agency is told and the price becomes its planned cost.
select public.respond_to_booking(:'booking', true, 800, 'Porto anche le luci');
select tests.ok(tests.error_of(format($$select public.respond_to_booking(%L, true, -1)$$, :'booking')) = '22023', 'price validated');
select tests.login('owner@sup-agency.test');
select tests.ok((select supplier_response = 'available' and supplier_price = 800 and planned_cost = 800 from public.event_bookings where id = :'booking'), 'answer recorded, planned cost set');
select tests.ok((select title from public.notifications where kind = 'booking_response') = 'Luca Sound è disponibile', 'agency told of the answer');
select tests.ok(tests.error_of(format($$update public.event_bookings set supplier_price = 1 where id = %L$$, :'booking')) = '42501', 'answer not writable by the agency');

-- Confirmed: the supplier is told and sees its arrival and moments of the run of show.
update public.event_bookings set status = 'confirmed' where id = :'booking';
insert into public.event_schedule_items (event_id, day, starts_at, ends_at, title, location, booking_id, created_by)
values (:'event', '2027-07-01', '22:00', '02:00', 'DJ set', 'Sala grande', :'booking', :'a_owner');
insert into public.event_schedule_items (event_id, day, starts_at, title, created_by) values (:'event', '2027-07-01', '20:00', 'Cena', :'a_owner');
insert into public.event_crew (event_id, booking_id, day, call_time, created_by) values (:'event', :'booking', '2027-07-01', '20:30', :'a_owner');
select tests.login('dj@sup-supplier.test');
select tests.ok((select title from public.notifications where kind = 'booking_confirmed') = 'Agenzia Fornitori ti ha confermato', 'supplier told of the confirmation');
select tests.ok((select string_agg(title || ' ' || to_char(starts_at, 'HH24:MI'), ', ' order by day, starts_at, kind) from public.supplier_booking_schedule(:'booking')) = 'Arrivo 20:30, DJ set 22:00', 'own schedule only');
select tests.ok(tests.error_of(format($$select public.respond_to_booking(%L, false)$$, :'booking')) = '22023', 'confirmed requests are closed');

-- A rival supplier sees nothing; a cancellation reaches the supplier.
select tests.login('rival@sup-rival.test');
select public.create_organization('supplier', 'Rival', 'rival') as rival \gset
select tests.ok(not exists (select 1 from public.supplier_booking_schedule(:'booking')), 'others see no schedule');
select tests.ok(tests.error_of(format($$select public.respond_to_booking(%L, true, 1)$$, :'booking')) = '42501', 'others cannot answer');
select tests.login('owner@sup-agency.test');
update public.event_bookings set status = 'cancelled' where id = :'booking';
select tests.login('dj@sup-supplier.test');
select tests.ok((select title from public.notifications where kind = 'booking_cancelled') = 'Agenzia Fornitori ha annullato la richiesta', 'supplier told of the cancellation');
select tests.ok((select status from public.supplier_bookings(:'supplier')) = 'cancelled', 'cancelled request still listed');
select tests.ok((select agency_name = 'Agenzia Fornitori' and open_requests = 0 from public.supplier_agencies(:'supplier')), 'agencies listed');

-- Booking a supplier directly as confirmed still reaches it.
select tests.login('owner@sup-agency.test');
insert into public.event_bookings (event_id, service_key, contact_id, status, created_by)
values (:'event', 'av', :'contact', 'confirmed', :'a_owner') returning id as direct \gset
select tests.login('dj@sup-supplier.test');
select tests.ok((select status from public.supplier_bookings(:'supplier') where id = :'direct') = 'confirmed', 'direct confirmation listed');
select tests.ok((select count(*) from public.notifications where kind = 'booking_confirmed') = 2, 'direct confirmation notified');
