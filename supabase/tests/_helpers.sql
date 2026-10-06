-- Test helpers (plain Postgres only).
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'assertion failed: %', what; end if;
end;
$$;

-- Runs a statement and returns its SQLSTATE, or null if it succeeded.
create or replace function tests.error_of(stmt text) returns text language plpgsql as $$
begin
  execute stmt;
  return null;
exception when others then
  return sqlstate;
end;
$$;

create or replace function tests.create_user(p_email text) returns uuid language sql as $$
  insert into auth.users (email, raw_user_meta_data) values (p_email, jsonb_build_object('full_name', split_part(p_email, '@', 1)))
  returning id;
$$;

-- Acts as the given user for the rest of the session (call `reset role` to go back to superuser).
create or replace function tests.login(p_email text) returns void language plpgsql security definer as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = p_email), false);
end;
$$;
grant execute on all functions in schema tests to anon, authenticated;
