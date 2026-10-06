-- Event tasks: the agency team plans its work; assignees are told; nobody else sees it.
select tests.create_user('owner@task-agency.test') as a_owner \gset
select tests.create_user('ops@task-agency.test') as a_ops \gset
select tests.create_user('owner@task-other.test') as o_owner \gset
select tests.create_user('brand@task-client.test') as c_owner \gset

set role authenticated;
select tests.login('owner@task-agency.test');
select public.create_organization('agency', 'Agenzia Task', 'agenzia-task') as agency \gset
select public.invite_member(:'agency', 'ops@task-agency.test', 'member') as ops_token \gset
select public.invite_connection(:'agency', p_email => 'brand@task-client.test') as conn \gset
select tests.login('ops@task-agency.test');
select public.accept_member_invitation(:'ops_token');
select tests.login('owner@task-other.test');
select public.create_organization('agency', 'Altra Task', 'altra-task') as other \gset

select tests.login('brand@task-client.test');
select public.create_organization('client', 'Brand Task', 'brand-task') as client \gset
select public.accept_connection(:'conn', :'client');
insert into public.requests (client_org_id, created_by, kind, title, objective, start_date)
values (:'client', :'c_owner', 'single', 'Convention', 'other', '2027-05-20') returning id as req \gset
insert into public.request_items (request_id, category_key) values (:'req', 'security');
select public.submit_request(:'req', array[:'agency']::uuid[]);
select tests.login('owner@task-agency.test');
select id as prop from public.proposals where request_id = :'req' \gset
select public.submit_proposal(:'prop', 5000, 'Proposta');
select tests.login('brand@task-client.test');
select public.accept_proposal(:'prop') as event \gset

-- The owner plans a task for a colleague, tied to the security booking.
select tests.login('owner@task-agency.test');
select id as booking from public.event_bookings where event_id = :'event' \gset
insert into public.event_tasks (event_id, org_id, title, due_date, booking_id, assignee_id, created_by)
values (:'event', :'other', 'Mandare planimetria alla sicurezza', '2027-05-01', :'booking', :'a_ops', :'a_owner') returning id as task \gset
select tests.ok((select org_id from public.event_tasks where id = :'task') = :'agency', 'agency taken from the event');
select tests.ok(tests.error_of(format($$insert into public.event_tasks (event_id, title, assignee_id, created_by) values (%L, 'x', %L, %L)$$, :'event', :'o_owner', :'a_owner')) = '42501', 'only teammates can be assigned');
select tests.ok(not exists (select 1 from public.notifications where kind = 'task_assigned'), 'the author is not notified');

select tests.login('ops@task-agency.test');
select tests.ok((select title from public.notifications where kind = 'task_assigned') = 'Nuova attività: Mandare planimetria alla sicurezza', 'assignee notified');
select tests.ok((select body from public.notifications where kind = 'task_assigned') = 'Convention · entro il 01/05/2027', 'notification says the event and the deadline');

-- Completing: the database records who and when.
update public.event_tasks set done_at = '2000-01-01' where id = :'task';
select tests.ok((select done_by = :'a_ops' and done_at > now() - interval '1 minute' from public.event_tasks where id = :'task'), 'completion recorded by the database');
update public.event_tasks set done_at = null where id = :'task';
select tests.ok((select done_by is null from public.event_tasks where id = :'task'), 'reopening clears who did it');
select tests.ok(tests.error_of(format($$update public.event_tasks set done_by = %L where id = %L$$, :'a_owner', :'task')) = '42501', 'done_by not writable');

-- Self-assignment does not notify; reassignment does.
update public.event_tasks set assignee_id = :'a_ops' where id = :'task';
select tests.ok((select count(*) from public.notifications where kind = 'task_assigned') = 1, 'no duplicate notification');
update public.event_tasks set assignee_id = :'a_owner' where id = :'task';
select tests.login('owner@task-agency.test');
select tests.ok((select count(*) from public.notifications where kind = 'task_assigned') = 1, 'reassigned owner notified');

-- Nobody else sees or writes tasks.
select tests.login('brand@task-client.test');
select tests.ok(not exists (select 1 from public.event_tasks), 'client does not see agency tasks');
select tests.ok(tests.error_of(format($$insert into public.event_tasks (event_id, title, created_by) values (%L, 'x', %L)$$, :'event', :'c_owner')) = '42501', 'client cannot add tasks');
select tests.login('owner@task-other.test');
select tests.ok(not exists (select 1 from public.event_tasks), 'other agencies see nothing');
select tests.ok(tests.error_of(format($$insert into public.event_tasks (event_id, title, created_by) values (%L, 'x', %L)$$, :'event', :'o_owner')) = '42501', 'other agencies cannot add tasks');

-- Removing the booking keeps the task.
select tests.login('ops@task-agency.test');
delete from public.event_bookings where id = :'booking';
select tests.ok((select booking_id is null from public.event_tasks where id = :'task'), 'task survives its booking');
delete from public.event_tasks where id = :'task';
select tests.ok(not exists (select 1 from public.event_tasks), 'members remove tasks');
