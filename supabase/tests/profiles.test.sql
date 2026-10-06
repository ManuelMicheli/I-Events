-- Profiles: portfolio with photos, reviews at the end of an event, supplier availability.
select tests.create_user('owner@pf-agency.test') as a_owner \gset
select tests.create_user('member@pf-agency.test') as a_member \gset
select tests.create_user('owner@pf-other.test') as o_owner \gset
select tests.create_user('brand@pf-client.test') as c_owner \gset
select tests.create_user('dj@pf-supplier.test') as s_owner \gset

set role authenticated;
select tests.login('owner@pf-agency.test');
select public.create_organization('agency', 'Agenzia Profili', 'agenzia-profili', 'Torino') as agency \gset
select public.invite_member(:'agency', 'member@pf-agency.test', 'member') as m_token \gset
select public.invite_connection(:'agency', p_email => 'brand@pf-client.test') as conn \gset
update public.marketplace_profiles set headline = 'Eventi aziendali', is_listed = true where org_id = :'agency';
select tests.login('member@pf-agency.test');
select public.accept_member_invitation(:'m_token');
select tests.login('owner@pf-other.test');
select public.create_organization('agency', 'Altra Profili', 'altra-profili') as other \gset
select tests.login('dj@pf-supplier.test');
select public.create_organization('supplier', 'Suoni Profili', 'suoni-profili', 'Torino') as supplier \gset
update public.marketplace_profiles set headline = 'DJ', services = '{entertainment}', is_listed = true where org_id = :'supplier';

-- Portfolio: the owner adds a job and its photos; plain members and other organizations cannot.
select tests.login('owner@pf-agency.test');
insert into public.portfolio_items (org_id, title, client_name, happened_on) values (:'agency', 'Convention 2026', 'Brand', '2026-05-01') returning id as item \gset
select tests.ok(tests.error_of(format($$insert into public.portfolio_items (org_id, title, happened_on) values (%L, 'X', '2026-05-12')$$, :'agency')) = '23514', 'month only');
select gen_random_uuid() as photo \gset
insert into public.portfolio_photos (id, item_id, org_id, storage_path) values (:'photo', :'item', :'agency', :'agency' || '/' || :'item' || '/' || :'photo' || '.jpg');
select tests.ok((select org_id from public.portfolio_photos where id = :'photo') = :'agency', 'photo belongs to the item organization');
select tests.ok(tests.error_of(format($$insert into public.portfolio_photos (item_id, org_id, storage_path) values (%L, %L, 'altro/percorso.jpg')$$, :'item', :'agency')) = '23514', 'path follows the row');
insert into storage.objects (bucket_id, name) values ('portfolio', :'agency' || '/' || :'item' || '/' || :'photo' || '.jpg');
select tests.ok(tests.error_of(format($$insert into storage.objects (bucket_id, name) values ('portfolio', %L)$$, :'agency' || '/' || :'item' || '/x.jpg')) = '42501', 'no upload without a row');
select tests.login('member@pf-agency.test');
select tests.ok(exists (select 1 from public.portfolio_items where id = :'item'), 'members see the portfolio');
select tests.ok(tests.error_of(format($$insert into public.portfolio_items (org_id, title) values (%L, 'Y')$$, :'agency')) = '42501', 'only owners and admins edit');
delete from public.portfolio_items where id = :'item';
select tests.ok(exists (select 1 from public.portfolio_items where id = :'item'), 'members cannot delete');
select tests.login('owner@pf-other.test');
select tests.ok(exists (select 1 from public.portfolio_photos where id = :'photo'), 'listed portfolio visible to others');
select tests.ok(tests.error_of(format($$insert into public.portfolio_items (org_id, title) values (%L, 'Z')$$, :'agency')) = '42501', 'others cannot add');
select tests.login('owner@pf-agency.test');
update public.marketplace_profiles set is_listed = false where org_id = :'agency';
select tests.login('owner@pf-other.test');
select tests.ok(not exists (select 1 from public.portfolio_items where id = :'item'), 'unlisted portfolio hidden');
select tests.login('owner@pf-agency.test');
update public.marketplace_profiles set is_listed = true where org_id = :'agency';

-- An event with the DJ confirmed, from request to completion.
insert into public.contacts (org_id, name, services, created_by) values (:'agency', 'Suoni', '{entertainment}', :'a_owner') returning id as contact \gset
select public.invite_supplier(:'contact') as s_token \gset
select tests.login('dj@pf-supplier.test');
select public.accept_supplier_invitation(:'s_token', :'supplier');
select tests.login('brand@pf-client.test');
select public.create_organization('client', 'Brand Profili', 'brand-profili') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date, end_date)
values (:'client', :'c_owner', 'single', 'Gala', 'other', '2027-03-10', '2027-03-11') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'entertainment');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@pf-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('brand@pf-client.test');
select public.accept_proposal(:'prop') as event \gset
select tests.login('owner@pf-agency.test');
select id as booking from public.event_bookings where event_id = :'event' \gset
update public.event_bookings set contact_id = :'contact', status = 'confirmed' where id = :'booking';

-- Availability: the supplier marks days off; others see only that it is busy, never why.
select tests.login('dj@pf-supplier.test');
insert into public.supplier_unavailability (org_id, starts_on, ends_on, note) values (:'supplier', '2027-04-01', '2027-04-03', 'Ferie');
select tests.ok(tests.error_of(format($$insert into public.supplier_unavailability (org_id, starts_on, ends_on) values (%L, '2027-04-05', '2027-04-01')$$, :'supplier')) = '23514', 'range checked');
select tests.ok((select count(*) from public.supplier_busy_days(:'supplier', '2027-03-01', '2027-04-30')) = 5, 'event days and days off');
select tests.ok((select array_agg(day order by day) from public.supplier_busy_days(:'supplier', '2027-03-01', '2027-04-30') where booked) = '{2027-03-10,2027-03-11}', 'confirmed event days are booked');
select tests.login('owner@pf-other.test');
select tests.ok((select count(*) from public.supplier_busy_days(:'supplier', '2027-03-01', '2027-04-30')) = 5, 'listed supplier availability visible');
select tests.ok(not exists (select 1 from public.supplier_unavailability), 'notes stay private');
select tests.ok(tests.error_of(format($$insert into public.supplier_unavailability (org_id, starts_on, ends_on) values (%L, '2027-01-01', '2027-01-01')$$, :'supplier')) = '42501', 'only the supplier marks its days');
select tests.ok(not exists (select 1 from public.search_marketplace('supplier', :'other', 'suoni', p_date => '2027-04-02')), 'busy suppliers left out of a date search');
select tests.ok(exists (select 1 from public.search_marketplace('supplier', :'other', 'suoni', p_date => '2027-04-04')), 'free on other days');
select tests.login('owner@pf-agency.test');
select tests.ok(not exists (select 1 from public.event_busy_contacts(:'event')), 'its own event does not make the supplier busy');
update public.events set start_date = '2027-04-02', end_date = '2027-04-02' where id = :'event';
select tests.ok((select days from public.event_busy_contacts(:'event') where contact_id = :'contact') = '{2027-04-02}', 'busy contact flagged for the event dates');
select tests.login('owner@pf-other.test');
select tests.ok(not exists (select 1 from public.event_busy_contacts(:'event')), 'only for the event agency');
select tests.login('owner@pf-agency.test');
update public.events set start_date = '2027-03-10', end_date = '2027-03-11' where id = :'event';

-- Reviews open only once the event is completed.
select tests.login('brand@pf-client.test');
select tests.ok(tests.error_of(format($$select public.leave_review(%L, %L, %L, 5)$$, :'event', :'client', :'agency')) = '42501', 'not before the end');
select tests.login('owner@pf-agency.test');
update public.events set status = 'preparing' where id = :'event';
update public.events set status = 'live' where id = :'event';
update public.events set status = 'completed' where id = :'event';
select tests.login('member@pf-agency.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'review_requested' and title = 'Recensisci i fornitori di Gala'), 'agency asked to review suppliers');
select tests.ok(tests.error_of(format($$select public.leave_review(%L, %L, %L, 4)$$, :'event', :'agency', :'supplier')) = '42501', 'plain members do not review');

select tests.login('brand@pf-client.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'review_requested' and title = 'Com''è andato Gala?'), 'client asked to review');
select tests.ok((select array_agg(subject_org_id) from public.reviewable_for(:'event', :'client')) = array[:'agency']::uuid[], 'client reviews the agency');
select public.leave_review(:'event', :'client', :'agency', 4, 'Ottima regia') as review \gset
select tests.ok(public.leave_review(:'event', :'client', :'agency', 5, 'Ottima regia, tutto puntuale') = :'review', 'review updated, not duplicated');
select tests.ok(tests.error_of(format($$select public.leave_review(%L, %L, %L, 5)$$, :'event', :'client', :'supplier')) = '42501', 'client does not review suppliers');
select tests.ok(tests.error_of(format($$select public.leave_review(%L, %L, %L, 6)$$, :'event', :'client', :'agency')) = '23514', 'rating 1 to 5');
select tests.ok(tests.error_of(format($$insert into public.reviews (event_id, author_org_id, subject_org_id, rating) values (%L, %L, %L, 5)$$, :'event', :'client', :'agency')) = '42501', 'only through leave_review');

select tests.login('owner@pf-agency.test');
select tests.ok((select count(*) from public.notifications where kind = 'review_received') = 1, 'agency told once');
select tests.ok((select array_agg(subject_org_id) from public.reviewable_for(:'event', :'agency')) = array[:'supplier']::uuid[], 'agency reviews its suppliers on I-Events');
select public.leave_review(:'event', :'agency', :'supplier', 5, 'Puntuale');
select public.reply_to_review(:'review', 'Grazie, alla prossima!');
select tests.ok((select reply = 'Grazie, alla prossima!' and replied_at is not null from public.reviews where id = :'review'), 'reply saved');
select tests.ok((select rating_avg = 5 and rating_count = 1 from public.org_rating(:'agency')), 'rating summary');
select tests.ok((select rating_avg = 5 and rating_count = 1 from public.marketplace_profile('agenzia-profili')), 'rating on the profile');

select tests.login('brand@pf-client.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'review_reply'), 'author told of the reply');
select tests.ok(tests.error_of(format($$select public.reply_to_review(%L, 'Io')$$, :'review')) = '42501', 'only the reviewed organization replies');

-- Anyone signed in reads the reviews of a listed profile, with the author's organization, not the event.
select tests.login('owner@pf-other.test');
select tests.ok((select author_name = 'Brand Profili' and rating = 5 and reply is not null from public.org_reviews(:'agency')), 'reviews on a listed profile');
select tests.ok((select rating_count = 1 from public.search_marketplace('supplier', :'other', 'suoni')), 'rating in search results');
select tests.ok(not exists (select 1 from public.reviews), 'review rows stay between the parties');
select tests.login('dj@pf-supplier.test');
update public.marketplace_profiles set is_listed = false where org_id = :'supplier';
select tests.login('owner@pf-other.test');
select tests.ok(not exists (select 1 from public.org_reviews(:'supplier')), 'unlisted reviews hidden');
select tests.login('dj@pf-supplier.test');
select tests.ok((select rating_count = 1 from public.org_rating(:'supplier')), 'own rating always visible');
