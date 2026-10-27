create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  email text not null,
  role text check (role in ('owner', 'reseller')) not null,
  credit integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tool_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tool_versions (
  id uuid primary key default gen_random_uuid(),
  tool_type_id uuid references tool_types(id) on delete cascade not null,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tool_type_id, name)
);

create table if not exists duration_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days integer not null check (days > 0),
  credit_cost integer not null default 0 check (credit_cost >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists keys (
  id uuid primary key default gen_random_uuid(),
  key_value text unique not null,
  tool_type_id uuid references tool_types(id) not null,
  tool_version_id uuid references tool_versions(id) not null,
  created_by uuid references profiles(id) not null,
  status text check (status in ('active', 'expired', 'banned')) default 'active',
  duration_days integer,
  expired_at timestamptz,
  max_device integer default 1 check (max_device > 0),
  note text,
  last_used timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists device_logs (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references keys(id) on delete cascade not null,
  hardware_id text not null,
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  unique (key_id, hardware_id)
);

create table if not exists credit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  action text check (action in ('topup', 'generate')) not null,
  amount integer not null,
  balance_after integer not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists tool_secrets (
  tool_type_id uuid primary key references tool_types(id) on delete cascade,
  secret_payload text,
  updated_at timestamptz default now()
);

create table if not exists validation_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  key_value text,
  hardware_id text,
  success boolean not null,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_keys_created_by on keys(created_by);
create index if not exists idx_keys_status on keys(status);
create index if not exists idx_keys_tool_type on keys(tool_type_id);
create index if not exists idx_keys_tool_version on keys(tool_version_id);
create index if not exists idx_keys_expired_at on keys(expired_at);
create index if not exists idx_keys_created_at on keys(created_at desc);
create index if not exists idx_device_logs_key_id on device_logs(key_id);
create index if not exists idx_device_logs_hwid on device_logs(hardware_id);
create index if not exists idx_credit_logs_user_id on credit_logs(user_id);
create index if not exists idx_credit_logs_created_at on credit_logs(created_at desc);
create index if not exists idx_tool_versions_tool_type on tool_versions(tool_type_id);
create index if not exists idx_validation_ip_time on validation_attempts(ip, created_at desc);
create index if not exists idx_validation_key_time on validation_attempts(key_value, created_at desc);

create or replace function is_owner()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$ language sql security definer stable set search_path = public;

create or replace function register_device(p_key_id uuid, p_hwid text)
returns table(result text, current_devices integer) as $$
declare
  v_max integer;
  v_count integer;
begin
  select max_device into v_max from keys where id = p_key_id for update;
  if v_max is null then
    return query select 'limit'::text, 0;
    return;
  end if;

  if exists (select 1 from device_logs where key_id = p_key_id and hardware_id = p_hwid) then
    update device_logs set last_seen = now() where key_id = p_key_id and hardware_id = p_hwid;
    select count(*) into v_count from device_logs where key_id = p_key_id;
    return query select 'ok'::text, v_count;
    return;
  end if;

  select count(*) into v_count from device_logs where key_id = p_key_id;
  if v_count >= v_max then
    return query select 'limit'::text, v_count;
    return;
  end if;

  insert into device_logs (key_id, hardware_id) values (p_key_id, p_hwid);
  return query select 'ok'::text, v_count + 1;
end;
$$ language plpgsql;
revoke execute on function register_device(uuid, text) from public;
revoke execute on function register_device(uuid, text) from anon, authenticated;
grant execute on function register_device(uuid, text) to service_role;

create or replace function cleanup_validation_attempts()
returns void as $$
begin
  delete from validation_attempts where created_at < now() - interval '7 days';
end;
$$ language plpgsql;
revoke execute on function cleanup_validation_attempts() from public;
revoke execute on function cleanup_validation_attempts() from anon, authenticated;
grant execute on function cleanup_validation_attempts() to service_role;

create or replace function update_expired_keys()
returns void as $$
begin
  update keys
  set status = 'expired', updated_at = now()
  where status = 'active'
    and expired_at is not null
    and expired_at < now();
end;
$$ language plpgsql;
revoke execute on function update_expired_keys() from public;
revoke execute on function update_expired_keys() from anon, authenticated;
grant execute on function update_expired_keys() to service_role;

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists keys_updated_at on keys;
create trigger keys_updated_at before update on keys for each row execute function update_updated_at();

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();

drop trigger if exists tool_types_updated_at on tool_types;
create trigger tool_types_updated_at before update on tool_types for each row execute function update_updated_at();

drop trigger if exists tool_versions_updated_at on tool_versions;
create trigger tool_versions_updated_at before update on tool_versions for each row execute function update_updated_at();

drop trigger if exists duration_presets_updated_at on duration_presets;
create trigger duration_presets_updated_at before update on duration_presets for each row execute function update_updated_at();

alter table profiles enable row level security;
alter table tool_types enable row level security;
alter table tool_versions enable row level security;
alter table duration_presets enable row level security;
alter table keys enable row level security;
alter table device_logs enable row level security;
alter table credit_logs enable row level security;
alter table tool_secrets enable row level security;
alter table validation_attempts enable row level security;

drop policy if exists "Users see own profile" on profiles;
create policy "Users see own profile" on profiles for select using (auth.uid() = id);

drop policy if exists "Owner sees all profiles" on profiles;
create policy "Owner sees all profiles" on profiles for select using (is_owner());

drop policy if exists "Owner manages profiles" on profiles;
create policy "Owner manages profiles" on profiles for all using (is_owner()) with check (is_owner());

drop policy if exists "Anyone can read tool types" on tool_types;
create policy "Anyone can read tool types" on tool_types for select using (true);

drop policy if exists "Owner manages tool types" on tool_types;
create policy "Owner manages tool types" on tool_types for all using (is_owner()) with check (is_owner());

drop policy if exists "Anyone can read tool versions" on tool_versions;
create policy "Anyone can read tool versions" on tool_versions for select using (true);

drop policy if exists "Owner manages tool versions" on tool_versions;
create policy "Owner manages tool versions" on tool_versions for all using (is_owner()) with check (is_owner());

drop policy if exists "Anyone can read duration presets" on duration_presets;
create policy "Anyone can read duration presets" on duration_presets for select using (true);

drop policy if exists "Owner manages duration presets" on duration_presets;
create policy "Owner manages duration presets" on duration_presets for all using (is_owner()) with check (is_owner());

drop policy if exists "Owner sees all keys" on keys;
create policy "Owner sees all keys" on keys for all using (is_owner()) with check (is_owner());

drop policy if exists "Reseller sees own keys" on keys;
create policy "Reseller sees own keys" on keys for select using (created_by = auth.uid());

drop policy if exists "Owner sees all device logs" on device_logs;
create policy "Owner sees all device logs" on device_logs for all using (is_owner()) with check (is_owner());

drop policy if exists "Reseller sees own device logs" on device_logs;
create policy "Reseller sees own device logs" on device_logs for select using (
  exists (select 1 from keys where keys.id = device_logs.key_id and keys.created_by = auth.uid())
);

drop policy if exists "Owner sees all credit logs" on credit_logs;
create policy "Owner sees all credit logs" on credit_logs for all using (is_owner()) with check (is_owner());

drop policy if exists "Reseller sees own credit logs" on credit_logs;
create policy "Reseller sees own credit logs" on credit_logs for select using (user_id = auth.uid());

insert into duration_presets (name, days, credit_cost, is_active)
select * from (values
  ('1 Hari', 7, 5, true),
  ('3 Hari', 3, 15, true),
  ('7 Hari', 7, 35, true),
  ('15 Hari', 15, 75, true),
  ('30 Hari', 30, 150, true)
) as v(name, days, credit_cost, is_active)
where not exists (select 1 from duration_presets);
