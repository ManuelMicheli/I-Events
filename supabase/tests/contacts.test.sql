-- Address book: private per organization, imports merge duplicates.
select tests.create_user('owner@contacts-agency.test') as owner \gset
select tests.create_user('ops@contacts-agency.test') as ops \gset
select tests.create_user('owner@contacts-other.test') as other_owner \gset

set role authenticated;
select tests.login('owner@contacts-agency.test');
select public.create_organization('agency', 'Agenzia Rubrica', 'agenzia-rubrica') as agency \gset
select public.invite_member(:'agency', 'ops@contacts-agency.test', 'member') as ops_token \gset
select tests.login('ops@contacts-agency.test');
select public.accept_member_invitation(:'ops_token');
select tests.login('owner@contacts-other.test');
select public.create_organization('agency', 'Altra Agenzia', 'altra-rubrica') as other \gset

select tests.login('ops@contacts-agency.test');
select public.import_contacts(:'agency', $$[
  {"name": "Marco DJ", "phone": "+393331234567", "services": ["entertainment", "unknown"]},
  {"name": "Security Milano", "company": "Sicura Srl", "email": "Info@Sicura.it", "services": ["security"]},
  {"company": "Solo Azienda Spa"},
  {"name": "", "email": "", "phone": ""},
  {"name": "Telefono sbagliato", "phone": "333 123"}
]$$::jsonb, 'csv') as first_import \gset
select tests.ok((:'first_import'::jsonb ->> 'created')::int = 4 and (:'first_import'::jsonb ->> 'skipped')::int = 1, 'rows imported, empty row skipped');
select tests.ok((select services from public.contacts where name = 'Marco DJ') = '{entertainment}', 'unknown services dropped');
select tests.ok((select email from public.contacts where name = 'Security Milano') = 'info@sicura.it', 'emails lowercased');
select tests.ok((select name from public.contacts where company = 'Solo Azienda Spa') = 'Solo Azienda Spa', 'company used as name');
select tests.ok((select phone from public.contacts where name = 'Telefono sbagliato') is null, 'invalid phone discarded');

-- Same people again: merged, not duplicated; missing data filled, existing data kept.
select public.import_contacts(:'agency', $$[
  {"name": "Marco Rossi", "phone": "+393331234567", "email": "marco@dj.it", "city": "Milano", "services": ["av"]},
  {"name": "Altro nome", "email": "info@sicura.it", "city": "Torino"}
]$$::jsonb) as second_import \gset
select tests.ok((:'second_import'::jsonb ->> 'merged')::int = 2 and (:'second_import'::jsonb ->> 'created')::int = 0, 'duplicates merged');
select tests.ok((select count(*) from public.contacts where org_id = :'agency') = 4, 'no duplicates created');
select tests.ok((select name = 'Marco DJ' and email = 'marco@dj.it' and city = 'Milano' and services = '{av,entertainment}' from public.contacts where phone = '+393331234567'), 'merge fills gaps and adds services');

-- Direct writes.
insert into public.contacts (org_id, name, phone, created_by) values (:'agency', 'Nuovo', '+390212345678', :'ops');
select tests.ok(tests.error_of(format($$insert into public.contacts (org_id, name, phone, created_by) values (%L, 'Doppio', '+390212345678', %L)$$, :'agency', :'ops')) = '23505', 'same phone twice rejected');
select tests.ok(tests.error_of(format($$insert into public.contacts (org_id, name, phone, created_by) values (%L, 'Formato', '02 1234', %L)$$, :'agency', :'ops')) = '23514', 'phone must be international');
select tests.ok(tests.error_of(format($$delete from public.contacts where org_id = %L$$, :'agency')) is null
  and (select count(*) from public.contacts where org_id = :'agency') = 5, 'members cannot delete contacts');

-- Other organizations see and change nothing.
select tests.login('owner@contacts-other.test');
select tests.ok(not exists (select 1 from public.contacts), 'address book is private');
select tests.ok(tests.error_of(format($$select public.import_contacts(%L, '[{"name":"x"}]')$$, :'agency')) = '42501', 'cannot import into another organization');
select tests.ok(tests.error_of(format($$insert into public.contacts (org_id, name, created_by) values (%L, 'Intruso', %L)$$, :'agency', :'other_owner')) = '42501', 'cannot add to another address book');

select tests.login('owner@contacts-agency.test');
delete from public.contacts where name = 'Nuovo';
select tests.ok((select count(*) from public.contacts where org_id = :'agency') = 4, 'owners can delete contacts');
