-- Attachments follow the request and proposal permissions; notifications reach the other side.
select tests.create_user('owner@notif-agency.test') as a_owner \gset
select tests.create_user('pm@notif-agency.test') as a_pm \gset
select tests.create_user('owner@notif-other.test') as o_owner \gset
select tests.create_user('brand@notif-client.test') as c_owner \gset

set role authenticated;

select tests.login('owner@notif-agency.test');
select public.create_organization('agency', 'Agenzia N', 'agenzia-n') as agency \gset
select public.invite_member(:'agency', 'pm@notif-agency.test', 'manager') as pm_token \gset
select tests.login('pm@notif-agency.test');
select public.accept_member_invitation(:'pm_token');
select tests.login('owner@notif-other.test');
select public.create_organization('agency', 'Agenzia Altra', 'agenzia-altra') as other \gset

select tests.login('owner@notif-agency.test');
select public.invite_connection(:'agency', p_email => 'brand@notif-client.test') as conn \gset
select tests.login('brand@notif-client.test');
select public.create_organization('client', 'Brand N', 'brand-n') as client \gset
select public.accept_connection(:'conn', :'client');

insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Evento notifiche', 'other', '2027-01-10') returning id as req \gset
insert into public.request_items (request_id, category_key, answers) values (:'req', 'security', '{}');

-- Attachments on a draft.
select gen_random_uuid() as att \gset
insert into public.request_attachments (id, request_id, storage_path, file_name, mime_type, size_bytes, uploaded_by)
values (:'att', :'req', :'req' || '/' || :'att' || '/planimetria.pdf', 'Planimetria sala.pdf', 'application/pdf', 1200, :'c_owner');
insert into storage.objects (bucket_id, name, owner) values ('attachments', :'req' || '/' || :'att' || '/planimetria.pdf', :'c_owner');
select tests.ok(tests.error_of(format($$insert into public.request_attachments (request_id, storage_path, file_name, size_bytes, uploaded_by) values (%L, 'altro/percorso.pdf', 'x.pdf', 10, %L)$$, :'req', :'c_owner')) = '23514', 'path must belong to the row');
select tests.ok(tests.error_of(format($$insert into storage.objects (bucket_id, name) values ('attachments', %L)$$, :'req' || '/' || gen_random_uuid() || '/senza-riga.pdf')) = '42501', 'no upload without a metadata row');

select tests.login('owner@notif-agency.test');
select tests.ok(not exists (select 1 from public.request_attachments), 'agency cannot see draft files');
select tests.ok(not exists (select 1 from storage.objects where bucket_id = 'attachments'), 'agency cannot download draft files');

select tests.login('brand@notif-client.test');
select public.submit_request(:'req', array[:'agency']::uuid[]);

-- The agency team is told about the new request, the client is not.
select tests.login('pm@notif-agency.test');
select tests.ok((select count(*) from public.notifications where kind = 'request_received') = 1, 'agency manager notified of the request');
select tests.ok((select link from public.notifications where kind = 'request_received') like '/pro/richieste/%', 'notification links to the report');
select tests.ok((select count(*) from public.request_attachments where request_id = :'req') = 1, 'agency sees request files once sent');
select tests.ok((select count(*) from storage.objects where bucket_id = 'attachments') = 1, 'agency can download request files');
select tests.ok(tests.error_of(format($$delete from public.request_attachments where id = %L$$, :'att')) is null
  and exists (select 1 from public.request_attachments where id = :'att'), 'agency cannot delete client files');

-- Proposal files: visible to the client only once the proposal is sent.
select id as prop from public.proposals where request_id = :'req' \gset
select gen_random_uuid() as patt \gset
insert into public.request_attachments (id, request_id, proposal_id, storage_path, file_name, size_bytes, uploaded_by)
values (:'patt', :'req', :'prop', :'req' || '/' || :'patt' || '/preventivo.pdf', 'Preventivo.pdf', 5000, :'a_pm');
insert into public.messages (proposal_id, author_id, author_org_id, body, internal)
values (:'prop', :'a_pm', :'agency', 'Solo per noi', true), (:'prop', :'a_pm', :'agency', 'Avete un parcheggio?', false);

select tests.login('owner@notif-other.test');
select tests.ok(not exists (select 1 from public.request_attachments), 'other agencies see no files');
select tests.ok(tests.error_of(format($$insert into public.request_attachments (id, request_id, storage_path, file_name, size_bytes, uploaded_by) values (%L, %L, %L, 'x.pdf', 10, %L)$$, :'patt', :'req', :'req' || '/' || :'patt' || '/x.pdf', :'o_owner')) = '42501', 'other agencies cannot attach');

select tests.login('brand@notif-client.test');
select tests.ok(not exists (select 1 from public.request_attachments where proposal_id is not null), 'proposal files hidden before sending');
select tests.ok((select count(*) from public.notifications where kind = 'message') = 1, 'client notified of the public message only');
select tests.ok((select title from public.notifications where kind = 'message') = 'Nuovo messaggio da Agenzia N', 'message notification names the agency');

select tests.login('owner@notif-agency.test');
select public.submit_proposal(:'prop', 9000, 'Proposta');
select tests.ok(not exists (select 1 from public.notifications where kind = 'message'), 'authors are not notified of their own team messages');

select tests.login('brand@notif-client.test');
select tests.ok(exists (select 1 from public.request_attachments where proposal_id = :'prop'), 'proposal files visible once sent');
select tests.ok((select title from public.notifications where kind = 'proposal_submitted') = 'Nuova proposta da Agenzia N', 'client notified of the proposal');
select public.request_revision(:'prop', 'Rivedete il prezzo');
select public.cancel_request(:'req');

select tests.login('pm@notif-agency.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'revision_requested'), 'agency notified of the revision');
select tests.ok(exists (select 1 from public.notifications where kind = 'request_cancelled'), 'cancellation is not reported as a lost pitch');
select tests.ok(not exists (select 1 from public.notifications where kind = 'proposal_rejected'), 'no lost-pitch notice on cancellation');
update public.notifications set read_at = now();
select tests.ok(not exists (select 1 from public.notifications where read_at is null), 'people mark their notifications read');
select tests.ok(tests.error_of($$update public.notifications set title = 'x'$$) = '42501', 'only read_at is writable');
select tests.ok(tests.error_of($$select * from public.claim_notification_emails()$$) = '42501', 'people cannot claim emails');

-- Email digest claim (service role).
reset role;
update public.profiles set email_notifications = false where id = :'a_owner';
select count(*) as claimed from public.claim_notification_emails() \gset
select tests.ok(:claimed > 0, 'pending emails claimed');
select tests.ok(not exists (select 1 from public.notifications where user_id = :'a_owner' and email_status <> 'skipped'), 'opted-out people get no email');
select tests.ok(not exists (select 1 from public.notifications where user_id = :'a_pm' and email_status <> 'skipped'), 'notifications already read in the app are not emailed');
select tests.ok((select count(*) from public.claim_notification_emails()) = 0, 'claimed rows are not handed out twice');
select public.finish_notification_emails(array(select id from public.notifications where email_status = 'sending'), 'sent');
select tests.ok(not exists (select 1 from public.notifications where email_status in ('pending', 'sending')), 'all emails settled');
