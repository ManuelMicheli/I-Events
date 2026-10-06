-- Marketplace search: only listed profiles, filtered by words, service and area; agencies add
-- listed suppliers to their address book already linked.
select tests.create_user('owner@mkt-agency.test') as a_owner \gset
select tests.create_user('owner@mkt-hidden.test') as h_owner \gset
select tests.create_user('brand@mkt-client.test') as c_owner \gset
select tests.create_user('dj@mkt-supplier.test') as s_owner \gset

set role authenticated;
select tests.login('owner@mkt-agency.test');
select public.create_organization('agency', 'Eventi Milano', 'eventi-milano', 'Milano') as agency \gset
update public.marketplace_profiles set headline = 'Convention e lanci di prodotto', description = 'Regia completa',
  services = '{organization,av}', regions = '{Lombardia}', is_listed = true where org_id = :'agency';
insert into public.contacts (org_id, name, phone, created_by) values (:'agency', 'Luca (vecchio numero)', '+393330000000', :'a_owner') returning id as old_contact \gset
select tests.login('owner@mkt-hidden.test');
select public.create_organization('agency', 'Agenzia Nascosta', 'agenzia-nascosta', 'Milano') as hidden \gset

select tests.login('dj@mkt-supplier.test');
select public.create_organization('supplier', 'Luca Sound', 'luca-sound-mkt', 'Bergamo') as supplier \gset
update public.marketplace_profiles set headline = 'DJ per eventi aziendali', services = '{entertainment,bogus}', regions = '{Lombardia, Piemonte}',
  phone = '+393330000000', is_listed = true where org_id = :'supplier';

-- A company searches agencies.
select tests.login('brand@mkt-client.test');
select public.create_organization('client', 'Brand Mkt', 'brand-mkt') as client \gset
select tests.ok((select array_agg(name) from public.search_marketplace('agency', :'client') where name in ('Eventi Milano', 'Agenzia Nascosta')) = '{Eventi Milano}', 'only listed agencies');
select tests.ok((select name from public.search_marketplace('agency', :'client', 'LANCI')) = 'Eventi Milano', 'words match the headline');
select tests.ok(not exists (select 1 from public.search_marketplace('agency', :'client', 'lanci', p_service => 'catering')), 'service filter');
select tests.ok(exists (select 1 from public.search_marketplace('agency', :'client', 'lanci', p_area => 'milano')), 'area matches the city');
select tests.ok(exists (select 1 from public.search_marketplace('agency', :'client', 'lanci', p_area => 'Lombardia')), 'area matches the regions');
select tests.ok(not exists (select 1 from public.search_marketplace('agency', :'client', 'lanci', p_area => 'Sicilia')), 'other areas excluded');
select tests.ok((select not connected from public.search_marketplace('agency', :'client', 'lanci')), 'not connected yet');
select tests.ok((select events_done = 0 and type = 'agency' from public.marketplace_profile('eventi-milano')), 'profile readable');
select tests.ok(not exists (select 1 from public.marketplace_profile('agenzia-nascosta')), 'unlisted profiles hidden');
select tests.ok(not exists (select 1 from public.search_marketplace('client', :'client')), 'companies are never listed');
select tests.ok((select count(*) from public.search_marketplace('supplier', :'client', 'luca sound')) = 1, 'suppliers searchable');

-- The agency finds the DJ and adds them: the old contact with the same phone gets linked.
select tests.login('owner@mkt-agency.test');
select tests.ok((select contact_id is null from public.search_marketplace('supplier', :'agency', 'dj')), 'not in the address book yet');
select tests.ok(public.add_marketplace_supplier(:'agency', :'supplier') = :'old_contact', 'existing contact linked');
select tests.ok((select supplier_org_id from public.contacts where id = :'old_contact') = :'supplier', 'linked to the account');
select tests.ok((select contact_id from public.search_marketplace('supplier', :'agency', 'dj')) = :'old_contact', 'search shows it is in the address book');
select tests.ok(public.add_marketplace_supplier(:'agency', :'supplier') = :'old_contact', 'adding twice is harmless');

-- Without a match a new contact is created, with known services only.
delete from public.contacts where id = :'old_contact';
select public.add_marketplace_supplier(:'agency', :'supplier') as new_contact \gset
select tests.ok((select name = 'Luca Sound' and services = '{entertainment}' and source = 'marketplace' and supplier_org_id = :'supplier'
  from public.contacts where id = :'new_contact'), 'contact created from the profile');
select tests.ok(tests.error_of(format($$select public.add_marketplace_supplier(%L, %L)$$, :'hidden', :'supplier')) = '42501', 'only for your own agency');

select tests.login('dj@mkt-supplier.test');
select tests.ok(exists (select 1 from public.notifications where kind = 'supplier_added' and title = 'Eventi Milano ti ha aggiunto ai suoi fornitori'), 'supplier told');
update public.marketplace_profiles set is_listed = false where org_id = :'supplier';
select tests.login('owner@mkt-agency.test');
select tests.ok(tests.error_of(format($$select public.add_marketplace_supplier(%L, %L)$$, :'agency', :'supplier')) = 'P0002', 'unlisted suppliers cannot be added');
