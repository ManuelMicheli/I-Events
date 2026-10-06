-- Event quotes: the agency sends versions, the client's approvers decide, drafts stay private.
select tests.create_user('owner@quote-agency.test') as a_owner \gset
select tests.create_user('owner@quote-other.test') as o_owner \gset
select tests.create_user('brand@quote-client.test') as c_owner \gset
select tests.create_user('marketing@quote-client.test') as c_member \gset
select tests.create_user('cfo@quote-client.test') as c_approver \gset

set role authenticated;
select tests.login('owner@quote-agency.test');
select public.create_organization('agency', 'Agenzia Quote', 'agenzia-quote') as agency \gset
select public.invite_connection(:'agency', p_email => 'brand@quote-client.test') as conn \gset
select tests.login('owner@quote-other.test');
select public.create_organization('agency', 'Altra Quote', 'altra-quote') as other \gset

select tests.login('brand@quote-client.test');
select public.create_organization('client', 'Brand Quote', 'brand-quote') as client \gset
select public.accept_connection(:'conn', :'client');
select public.invite_member(:'client', 'marketing@quote-client.test', 'member') as m_token \gset
select public.invite_member(:'client', 'cfo@quote-client.test', 'approver') as a_token \gset
select tests.login('marketing@quote-client.test');
select public.accept_member_invitation(:'m_token');
select tests.login('cfo@quote-client.test');
select public.accept_member_invitation(:'a_token');

select tests.login('brand@quote-client.test');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Festa aziendale', 'other', '2027-09-10') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'catering');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@quote-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 8000, 'Proposta');
select tests.login('brand@quote-client.test');
select public.accept_proposal(:'prop') as event \gset

-- Draft: the total follows the lines, the client cannot see it yet.
select tests.login('owner@quote-agency.test');
insert into public.event_quotes (event_id, org_id, client_org_id, lines, note, created_by)
values (:'event', :'other', :'other', '[{"category":"catering","description":"Buffet 200 persone","amount":6000.5},{"category":"other","description":"Coordinamento","amount":1500}]', 'Prima versione', :'a_owner')
returning id as q1 \gset
select tests.ok((select org_id = :'agency' and client_org_id = :'client' and total_amount = 7500.50 from public.event_quotes where id = :'q1'), 'parties and total from the event and lines');
select tests.ok(tests.error_of(format($$insert into public.event_quotes (event_id, lines, created_by) values (%L, '[]', %L)$$, :'event', :'a_owner')) = '23505', 'one draft at a time');
select tests.ok(tests.error_of(format($$update public.event_quotes set lines = '[{"category":"other","description":"x","amount":-1}]' where id = %L$$, :'q1')) = '22023', 'negative amounts rejected');
select tests.ok(tests.error_of(format($$update public.event_quotes set total_amount = 1 where id = %L$$, :'q1')) = '42501', 'total not writable');

select tests.login('brand@quote-client.test');
select tests.ok(not exists (select 1 from public.event_quotes), 'client does not see drafts');
select tests.ok(tests.error_of(format($$select public.send_event_quote(%L)$$, :'q1')) = '42501', 'client cannot send');

-- Sent as version 1: frozen, visible, the client is told.
select tests.login('owner@quote-agency.test');
select tests.ok(public.send_event_quote(:'q1') = 1, 'sent as version 1');
select tests.ok(tests.error_of(format($$select public.send_event_quote(%L)$$, :'q1')) = '22023', 'cannot send twice');
update public.event_quotes set note = 'cambiata' where id = :'q1';
select tests.ok((select note from public.event_quotes where id = :'q1') = 'Prima versione', 'sent quote is frozen');
delete from public.event_quotes where id = :'q1';
select tests.ok(exists (select 1 from public.event_quotes where id = :'q1'), 'sent quote cannot be deleted');

select tests.login('marketing@quote-client.test');
select tests.ok((select total_amount from public.event_quotes where id = :'q1') = 7500.50, 'client sees the sent quote');
select tests.ok((select title from public.notifications where kind = 'quote_sent') = 'Preventivo da approvare da Agenzia Quote', 'client notified');
select tests.ok((select link from public.notifications where kind = 'quote_sent') = '/client/eventi/' || :'event', 'notification opens the client event');
select tests.ok(tests.error_of(format($$select public.decide_event_quote(%L, true)$$, :'q1')) = '42501', 'plain members cannot approve');

-- The approver asks for changes, with a reason.
select tests.login('cfo@quote-client.test');
select tests.ok(tests.error_of(format($$select public.decide_event_quote(%L, false, '  ')$$, :'q1')) = '22023', 'changes need a reason');
select public.decide_event_quote(:'q1', false, 'Togliete il coordinamento');
select tests.ok((select status = 'changes_requested' and decided_by = :'c_approver' from public.event_quotes where id = :'q1'), 'changes requested');

-- Version 2 supersedes version 1 and is approved.
select tests.login('owner@quote-agency.test');
select tests.ok((select body from public.notifications where kind = 'quote_changes_requested') = 'Festa aziendale: Togliete il coordinamento', 'agency told what to change');
insert into public.event_quotes (event_id, lines, created_by)
values (:'event', '[{"category":"catering","description":"Buffet 200 persone","amount":6000.5}]', :'a_owner') returning id as q2 \gset
select tests.ok(public.send_event_quote(:'q2') = 2, 'sent as version 2');
select tests.ok((select status from public.event_quotes where id = :'q1') = 'superseded', 'version 1 superseded');

select tests.login('cfo@quote-client.test');
select tests.ok((select title from public.notifications where kind = 'quote_sent' order by created_at desc limit 1) = 'Agenzia Quote ha aggiornato il preventivo', 'update announced as such');
select tests.ok(tests.error_of(format($$select public.decide_event_quote(%L, true)$$, :'q1')) = '22023', 'old versions cannot be approved');
select public.decide_event_quote(:'q2', true);
select tests.ok((select status from public.event_quotes where id = :'q2') = 'approved', 'version 2 approved');
select tests.ok(tests.error_of(format($$select public.decide_event_quote(%L, false, 'ripensamento')$$, :'q2')) = '22023', 'a decision is final');

select tests.login('owner@quote-agency.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'quote_approved' and title = 'Brand Quote ha approvato il preventivo'), 'agency told of the approval');

-- Other agencies see nothing.
select tests.login('owner@quote-other.test');
select tests.ok(not exists (select 1 from public.event_quotes), 'other agencies see no quotes');
select tests.ok(tests.error_of(format($$insert into public.event_quotes (event_id, lines, created_by) values (%L, '[]', %L)$$, :'event', :'o_owner')) = '42501', 'other agencies cannot write quotes');
