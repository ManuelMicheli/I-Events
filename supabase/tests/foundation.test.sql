-- Organizations, membership invitations and agency-client connections.
select tests.create_user('anna@nss.test') as agency_owner \gset
select tests.create_user('carla@brand.test') as client_owner \gset
select tests.create_user('mario@nss.test') as invited \gset
select tests.create_user('sara@other.test') as stranger \gset

select tests.ok((select count(*) from public.profiles where id in (:'agency_owner', :'client_owner', :'invited', :'stranger')) = 4, 'a profile is created for every user');

set role authenticated;

select tests.login('anna@nss.test');
select public.create_organization('agency', 'NSS Eventi', 'nss-eventi', 'Milano') as agency \gset
select tests.ok((select role from public.memberships where org_id = :'agency') = 'owner', 'creator is owner');
select tests.ok((select plan from public.subscriptions where org_id = :'agency') = 'trial', 'trial subscription started');
select tests.ok(exists (select 1 from public.marketplace_profiles where org_id = :'agency'), 'agency gets a marketplace profile');
select tests.ok(tests.error_of($$insert into public.organizations (type, name, slug) values ('agency', 'Hack', 'hack')$$) = '42501', 'no direct insert into organizations');
select tests.ok(tests.error_of(format($$update public.organizations set type = 'client' where id = %L$$, :'agency')) = '42501', 'type cannot be changed');

select tests.login('carla@brand.test');
select public.create_organization('client', 'Nutella Italia', 'nutella-italia') as client \gset
select tests.ok(not exists (select 1 from public.organizations where id = :'agency'), 'client cannot see an unconnected, unlisted agency');
select tests.ok((select count(*) from public.memberships) = 1, 'client sees only its own memberships');

-- Slug collision gets a suffix.
select tests.login('sara@other.test');
select public.create_organization('client', 'Nutella Italia', 'nutella-italia') as other_client \gset
select tests.ok((select slug from public.organizations where id = :'other_client') = 'nutella-italia-1', 'slug made unique');

-- Agency invites the client by email; the client accepts with its organization.
select tests.login('anna@nss.test');
select public.invite_connection(:'agency', null, 'carla@brand.test', 'Lavoriamo insieme') as conn_token \gset
select tests.login('sara@other.test');
select tests.ok(tests.error_of(format($$select public.accept_connection(%L, %L)$$, :'conn_token', :'agency')) = '42501', 'only members can accept for an org');
select tests.login('carla@brand.test');
select tests.ok((select org_name = 'NSS Eventi' and valid from public.preview_invitation(:'conn_token')), 'invitee previews the invite');
select public.accept_connection(:'conn_token', :'client');
select tests.ok((select not valid from public.preview_invitation(:'conn_token')), 'used invite shows as not valid');
select tests.ok(exists (select 1 from public.organizations where id = :'agency'), 'connected client sees the agency');
select tests.ok(tests.error_of(format($$select public.accept_connection(%L, %L)$$, :'conn_token', :'client')) = 'P0002', 'token cannot be reused');

-- Stranger still sees nothing of either.
select tests.login('sara@other.test');
select tests.ok(not exists (select 1 from public.organizations where id in (:'agency', :'client')), 'stranger sees neither org');
select tests.ok(not exists (select 1 from public.connections), 'stranger sees no connections');

-- Member invitations.
select tests.login('anna@nss.test');
select public.invite_member(:'agency', 'Mario@NSS.test', 'manager') as member_token \gset
select tests.ok(tests.error_of(format($$select public.invite_member(%L, 'x@y.test', 'approver')$$, :'agency')) = '22023', 'approver is a client-only role');
select tests.login('sara@other.test');
select tests.ok(tests.error_of(format($$select public.accept_member_invitation(%L)$$, :'member_token')) = '42501', 'invitation bound to its email');
select tests.ok(tests.error_of(format($$select public.invite_member(%L, 'z@z.test', 'member')$$, :'agency')) = '42501', 'outsiders cannot invite');
select tests.login('mario@nss.test');
select public.accept_member_invitation(:'member_token');
select tests.ok((select role from public.memberships where org_id = :'agency' and user_id = :'invited') = 'manager', 'invited member joined as manager');
select tests.ok(tests.error_of(format($$select public.invite_member(%L, 'z@z.test', 'member')$$, :'agency')) = '42501', 'managers cannot invite');
select tests.ok((select count(*) from public.profiles) = 2, 'members see each other''s profiles only');

-- Marketplace listing makes an agency visible to everyone signed in.
select tests.login('anna@nss.test');
update public.marketplace_profiles set is_listed = true, headline = 'Eventi di brand' where org_id = :'agency';
select tests.login('sara@other.test');
select tests.ok(exists (select 1 from public.organizations where id = :'agency'), 'listed agency visible');

reset role;
set role anon;
select tests.ok(not exists (select 1 from public.marketplace_profiles where not is_listed), 'anon sees only listed profiles');
select tests.ok(tests.error_of('select 1 from public.organizations') = '42501', 'anon cannot read organizations');
reset role;
