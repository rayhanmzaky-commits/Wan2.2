-- Skema Keuangan Keluarga. Jalankan di Supabase SQL editor atau sebagai migrasi.

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (household_id, user_id)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  unique (household_id, name)
);

-- month selalu tanggal 1 pada bulan yang dimaksud
create table budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount >= 0),
  unique (category_id, month)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  kind text not null check (kind in ('expense', 'income')),
  amount bigint not null check (amount > 0),
  note text not null default '',
  spent_on date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index on transactions (household_id, spent_on);

-- Cek keanggotaan lewat fungsi security definer supaya policy tidak rekursif.
create function is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;

create policy "anggota melihat keluarganya" on households
  for select using (is_member(id));
create policy "anggota melihat anggota sekeluarga" on household_members
  for select using (is_member(household_id));
create policy "anggota mengelola kategori" on categories
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "anggota mengelola anggaran" on budgets
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "anggota mengelola transaksi" on transactions
  for all using (is_member(household_id)) with check (is_member(household_id));

-- Membuat keluarga baru beserta kategori awal.
create function create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;
  insert into households (name) values (p_name) returning id into h;
  insert into household_members (household_id, user_id, role) values (h, auth.uid(), 'owner');
  insert into categories (household_id, name)
    values (h, 'Makan'), (h, 'Listrik dan air'), (h, 'Transportasi'),
           (h, 'Sekolah'), (h, 'Kesehatan'), (h, 'Tabungan');
  return h;
end;
$$;

-- Bergabung ke keluarga lewat kode undangan.
create function join_household(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;
  select id into h from households where invite_code = lower(trim(p_code));
  if h is null then
    raise exception 'Kode undangan tidak ditemukan';
  end if;
  insert into household_members (household_id, user_id) values (h, auth.uid())
    on conflict do nothing;
  return h;
end;
$$;

revoke all on function create_household(text), join_household(text) from public, anon;
grant execute on function create_household(text), join_household(text) to authenticated;

-- Izin akses API untuk pengguna yang sudah masuk. RLS di atas yang membatasi baris yang boleh dilihat.
grant usage on schema public to authenticated;
grant select on households, household_members to authenticated;
grant select, insert, update, delete on categories, budgets, transactions to authenticated;

-- is_member hanya dipakai policy untuk pengguna yang sudah masuk.
revoke all on function is_member(uuid) from public, anon;
grant execute on function is_member(uuid) to authenticated;
