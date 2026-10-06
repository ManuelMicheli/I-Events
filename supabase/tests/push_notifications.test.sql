-- Phones register their push token for the person signed in; the scheduled job pushes only fresh, unread notifications.
select tests.create_user('anna@push.test') as anna \gset
select tests.create_user('bruno@push.test') as bruno \gset
select tests.create_user('carla@push.test') as carla \gset

set role authenticated;
select tests.login('anna@push.test');
select public.create_organization('agency', 'Agenzia Push', 'agenzia-push') as org \gset

select public.register_push_token('ExponentPushToken[anna-phone]', 'ios');
select public.register_push_token('ExponentPushToken[anna-phone]', 'ios');
select tests.ok((select count(*) from public.push_tokens) = 1, 'registering twice keeps one row');
select tests.ok(tests.error_of($$select public.register_push_token('not-a-token', 'ios')$$) = '23514', 'only Expo push tokens are accepted');
select tests.ok(tests.error_of($$select public.register_push_token('ExpoPushToken[x]', 'web')$$) = '23514', 'only phone platforms');
select tests.ok(tests.error_of(format($$insert into public.push_tokens (token, user_id, platform) values ('ExpoPushToken[y]', %L, 'ios')$$, :'anna')) = '42501',
  'tokens are written only through the function');

-- The same phone signed in by someone else now belongs to them.
select tests.login('bruno@push.test');
select public.register_push_token('ExponentPushToken[shared-phone]', 'android');
select tests.ok(not exists (select 1 from public.push_tokens where user_id <> :'bruno'), 'people see only their own phones');
select tests.login('anna@push.test');
select public.register_push_token('ExponentPushToken[shared-phone]', 'android');
select tests.ok((select count(*) from public.push_tokens) = 2, 'the phone moved to the last person who signed in');
select tests.login('bruno@push.test');
select tests.ok(not exists (select 1 from public.push_tokens), 'the previous owner lost it');
select public.unregister_push_token('ExponentPushToken[anna-phone]');

-- Ten phones per person at most: the oldest goes.
select tests.login('carla@push.test');
select public.register_push_token(format('ExpoPushToken[carla-%s]', i), 'ios') from generate_series(1, 11) i;
select tests.ok((select count(*) from public.push_tokens) = 10, 'ten phones per person');
select public.unregister_push_token(format('ExpoPushToken[carla-%s]', i)) from generate_series(1, 11) i;
select tests.ok(not exists (select 1 from public.push_tokens), 'signing out removes the phone');

select tests.ok(tests.error_of($$select * from public.claim_notification_pushes()$$) = '42501', 'people cannot claim pushes');
select tests.ok(tests.error_of($$select public.remove_push_tokens(array['ExponentPushToken[anna-phone]'])$$) = '42501', 'people cannot remove other phones');

-- Scheduled job.
reset role;
insert into public.notifications (user_id, org_id, kind, title, body, link, read_at, created_at) values
  (:'anna', :'org', 'message', 'Fresca', 'Ciao', '/pro/richieste/1', null, now()),
  (:'anna', :'org', 'message', 'Già letta', null, null, now(), now()),
  (:'anna', :'org', 'message', 'Vecchia', null, null, null, now() - interval '2 hours'),
  (:'bruno', :'org', 'message', 'Senza telefono', null, null, null, now());

set role service_role;
create temp table claimed as select * from public.claim_notification_pushes();
reset role;
select tests.ok((select count(*) from claimed where user_id in (:'anna', :'bruno')) = 1, 'only the fresh unread one with a phone is claimed');
select tests.ok((select tokens from claimed where title = 'Fresca') @> array['ExponentPushToken[anna-phone]', 'ExponentPushToken[shared-phone]'],
  'every phone of the person');
select tests.ok((select unread from claimed where title = 'Fresca') = 2, 'unread count for the app badge');
select tests.ok((select push_status from public.notifications where title = 'Già letta' and user_id = :'anna') = 'skipped', 'read ones are not pushed');
select tests.ok((select push_status from public.notifications where title = 'Vecchia' and user_id = :'anna') = 'skipped', 'old ones are not pushed');
select tests.ok((select push_status from public.notifications where user_id = :'bruno') = 'skipped', 'nobody to push to');

set role service_role;
select count(*) as again from public.claim_notification_pushes() where user_id = :'anna' \gset
select public.finish_notification_pushes(array(select id from claimed), 'sent');
select public.remove_push_tokens(array['ExponentPushToken[shared-phone]']);
reset role;
select tests.ok(:again = 0, 'claimed rows are not handed out twice');
select tests.ok((select push_status from public.notifications where title = 'Fresca' and user_id = :'anna') = 'sent', 'push settled');
select tests.ok((select array_agg(token) from public.push_tokens where user_id = :'anna') = array['ExponentPushToken[anna-phone]'], 'dead phone removed');
