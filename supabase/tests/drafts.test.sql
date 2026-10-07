-- Wizard drafts are saved atomically and only by members of the client.
select tests.create_user('maria@drafts.test') as client_user \gset
select tests.create_user('ugo@agency-drafts.test') as agency_user \gset

set role authenticated;
select tests.login('ugo@agency-drafts.test');
select public.create_organization('agency', 'Agenzia Bozze', 'agenzia-bozze') as agency \gset
update public.marketplace_profiles set is_listed = true where org_id = :'agency';

select tests.login('maria@drafts.test');
select public.create_organization('client', 'Cliente Bozze', 'cliente-bozze') as client \gset

select public.save_request_draft(:'client', $${
  "kind": "campaign", "title": "Tour 2027", "objective": "brand_awareness", "guests": 200,
  "campaign": {"eventsCount": 2, "sameVenue": false, "servicesMode": "per_stage"},
  "completeness": 40,
  "stages": [{"city": "Milano", "date": "2027-05-01"}, {"city": "Torino", "date": "2027-05-08"}],
  "items": [
    {"category": "venue", "stage_index": 0, "answers": {"space_type": "private", "setting": "indoor"}},
    {"category": "venue", "stage_index": 1, "answers": {"space_type": "public", "setting": "outdoor"}},
    {"category": "security", "stage_index": 1, "answers": {"guards": 3}}
  ]
}$$::jsonb) as req \gset

select tests.ok((select count(*) from public.campaign_stages where request_id = :'req') = 2, 'stages saved');
select tests.ok((select count(*) from public.request_items i join public.campaign_stages s on s.id = i.stage_id where s.city = 'Torino') = 2, 'items linked to their stage');
select tests.ok((select completeness from public.requests where id = :'req') = 40, 'completeness stored');

-- Saving again replaces stages and items.
select public.save_request_draft(:'client', $${
  "kind": "single", "title": "Evento unico", "objective": "product_launch", "start_date": "2027-03-01",
  "items": [{"category": "catering", "answers": {"format": "buffet"}}]
}$$::jsonb, :'req');
select tests.ok((select kind = 'single' and campaign is null from public.requests where id = :'req'), 'switched to single event');
select tests.ok((select count(*) from public.campaign_stages where request_id = :'req') = 0, 'old stages removed');
select tests.ok((select count(*) from public.request_items where request_id = :'req') = 1, 'items replaced');

select tests.login('ugo@agency-drafts.test');
select tests.ok(tests.error_of(format($$select public.save_request_draft(%L, '{"kind":"single","title":"Hack","objective":"other"}', %L)$$, :'client', :'req')) = '42501', 'outsiders cannot edit a draft');
select tests.ok(tests.error_of(format($$select public.save_request_draft(%L, '{"kind":"single","title":"Hack","objective":"other"}')$$, :'client')) = '42501', 'outsiders cannot create drafts for a client');

select tests.login('maria@drafts.test');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.ok(tests.error_of(format($$select public.save_request_draft(%L, '{"kind":"single","title":"Dopo","objective":"other"}', %L)$$, :'client', :'req')) = '42501', 'sent requests cannot be edited');

select public.cancel_request(:'req');
select tests.ok((select status from public.requests where id = :'req') = 'cancelled', 'request cancelled');
select tests.ok((select status from public.proposals where request_id = :'req') = 'rejected', 'open proposals closed');
reset role;

-- The event type is saved with the draft and passes to the events of the accepted proposal.
select tests.create_user('eva@types.test') as type_client_user \gset
select tests.create_user('leo@types.test') as type_agency_user \gset
set role authenticated;
select tests.login('leo@types.test');
select public.create_organization('agency', 'Agenzia Tipi', 'agenzia-tipi') as type_agency \gset
update public.marketplace_profiles set is_listed = true where org_id = :'type_agency';
select tests.login('eva@types.test');
select public.create_organization('client', 'Cliente Tipi', 'cliente-tipi') as type_client \gset
select public.save_request_draft(:'type_client', $${
  "kind": "single", "event_type": "gala", "title": "Gala Riva", "objective": "other", "start_date": "2027-11-21",
  "items": [{"category": "catering", "answers": {"format": "buffet"}}]
}$$::jsonb) as type_req \gset
select tests.ok((select event_type = 'gala' from public.requests where id = :'type_req'), 'event type saved with the draft');
select tests.ok((select number > 100 from public.requests where id = :'type_req'), 'every request gets a ticket number');
select tests.ok(tests.error_of($$update public.requests set number = 1$$) = '42501', 'nobody can change a ticket number');
select public.submit_request(:'type_req', array[:'type_agency']::uuid[]);
reset role;
update public.proposals set status = 'submitted', total_amount = 1000 where request_id = :'type_req';
set role authenticated;
select tests.login('eva@types.test');
select public.accept_proposal((select id from public.proposals where request_id = :'type_req'));
select tests.ok((select event_type = 'gala' from public.events where request_id = :'type_req'), 'the event takes the type of its request');
select tests.ok((select e.number = r.number from public.events e join public.requests r on r.id = e.request_id where r.id = :'type_req'), 'the event carries the ticket number of its request');
reset role;
