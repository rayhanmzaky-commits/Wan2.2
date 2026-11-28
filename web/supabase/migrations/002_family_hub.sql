-- Versi 2: profil anggota, judul transaksi, struk, target tabungan, tagihan, data contoh.

create table people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  role text not null default 'Anggota',
  color text not null default '#0f8f87',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target bigint not null check (target > 0),
  saved bigint not null default 0 check (saved >= 0),
  deadline date,
  created_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  amount bigint not null check (amount > 0),
  due_day int not null check (due_day between 1 and 31),
  paid_month date,
  created_at timestamptz not null default now()
);

alter table transactions rename column note to title;
alter table transactions add column person_id uuid references people(id) on delete set null;
alter table transactions add column receipt_path text;
alter table transactions add column bill_id uuid references bills(id) on delete set null;

alter table people enable row level security;
alter table savings_goals enable row level security;
alter table bills enable row level security;

create policy "anggota mengelola profil" on people
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "anggota mengelola target tabungan" on savings_goals
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "anggota mengelola tagihan" on bills
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "anggota mengubah nama keluarga" on households
  for update using (is_member(id)) with check (is_member(id));

grant select, insert, update, delete on people, savings_goals, bills to authenticated;
grant update (name) on households to authenticated;

-- Profil awal untuk keluarga yang sudah ada.
insert into people (household_id, name, role, color, sort)
select h.id, v.name, v.name, v.color, v.sort
from households h
cross join (values ('Ayah', '#0f8f87', 0), ('Ibu', '#e0792b', 1), ('Kakak', '#3b82c4', 2), ('Adik', '#6bb38a', 3)) as v(name, color, sort);

-- Penyimpanan foto struk (privat). Folder pertama = id keluarga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "anggota membaca struk" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and is_member(((storage.foldername(name))[1])::uuid));
create policy "anggota mengunggah struk" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and is_member(((storage.foldername(name))[1])::uuid));
create policy "anggota menghapus struk" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and is_member(((storage.foldername(name))[1])::uuid));

-- Data contoh keluarga Indonesia yang realistis, relatif terhadap bulan berjalan.
create function seed_demo(h uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  names text[] := array['Belanja Dapur', 'Listrik dan Air', 'Transportasi', 'Pendidikan', 'Hiburan', 'Tabungan'];
  limits bigint[] := array[4000000, 2000000, 3000000, 5000000, 1500000, 3000000];
  factor numeric[] := array[0.70, 0.85, 0.78, 0.92, 0.66];
  ids uuid[] := '{}';
  pids uuid[];
  cid uuid;
  ayah uuid; ibu uuid; kakak uuid; adik uuid;
  m date := date_trunc('month', current_date)::date;
  mm date;
  i int; k int;
  total bigint;
begin
  insert into people (household_id, name, role, color, sort)
  select h, v.name, v.name, v.color, v.sort
  from (values ('Ayah', '#0f8f87', 0), ('Ibu', '#e0792b', 1), ('Kakak', '#3b82c4', 2), ('Adik', '#6bb38a', 3)) as v(name, color, sort)
  where not exists (select 1 from people where household_id = h);

  select array_agg(id order by sort, created_at) into pids from people where household_id = h;
  ayah := pids[1]; ibu := coalesce(pids[2], pids[1]); kakak := coalesce(pids[3], pids[1]); adik := coalesce(pids[4], pids[1]);

  insert into categories (household_id, name) select h, x from unnest(names) x
    on conflict (household_id, name) do nothing;
  for i in 1..6 loop
    select id into cid from categories where household_id = h and name = names[i];
    ids := ids || cid;
  end loop;

  for k in 0..5 loop
    mm := (m - make_interval(months => k))::date;
    for i in 1..6 loop
      insert into budgets (household_id, category_id, month, amount) values (h, ids[i], mm, limits[i])
        on conflict (category_id, month) do nothing;
    end loop;
  end loop;

  -- Bulan ini: pemasukan Rp 18.000.000, pengeluaran Rp 14.500.000.
  insert into transactions (household_id, category_id, kind, amount, title, spent_on, person_id) values
    (h, null,   'income',  12000000, 'Gaji Ayah',            least(current_date, m + 0), ayah),
    (h, null,   'income',   4500000, 'Gaji Ibu',             least(current_date, m + 0), ibu),
    (h, null,   'income',   1500000, 'Usaha Online Ibu',     least(current_date, m + 3), ibu),
    (h, ids[1], 'expense',  1450000, 'Belanja Bulanan',      least(current_date, m + 1), ibu),
    (h, ids[1], 'expense',   350000, 'Sayur dan Buah',       least(current_date, m + 4), ibu),
    (h, ids[1], 'expense',   285000, 'Indomaret',            least(current_date, m + 6), ayah),
    (h, ids[1], 'expense',   415000, 'Pasar Minggu',         least(current_date, m + 9), ibu),
    (h, ids[2], 'expense',  1100000, 'Bayar Listrik',        least(current_date, m + 4), ayah),
    (h, ids[2], 'expense',   280000, 'Air PDAM',             least(current_date, m + 5), ibu),
    (h, ids[2], 'expense',   420000, 'Internet Rumah',       least(current_date, m + 5), ayah),
    (h, ids[3], 'expense',   750000, 'Bensin',               least(current_date, m + 2), ayah),
    (h, ids[3], 'expense',   350000, 'Tol',                  least(current_date, m + 7), ayah),
    (h, ids[3], 'expense',   280000, 'Ojek Online Kuliah',   least(current_date, m + 8), kakak),
    (h, ids[3], 'expense',   620000, 'Servis Motor',         least(current_date, m + 10), ayah),
    (h, ids[4], 'expense',  2200000, 'SPP Sekolah Adik',     least(current_date, m + 2), ibu),
    (h, ids[4], 'expense',  1300000, 'Les Matematika',       least(current_date, m + 3), kakak),
    (h, ids[4], 'expense',   450000, 'Beli Buku',            least(current_date, m + 7), adik),
    (h, ids[4], 'expense',   350000, 'Alat Tulis Sekolah',   least(current_date, m + 8), adik),
    (h, ids[5], 'expense',   380000, 'Nonton Bioskop',       least(current_date, m + 6), kakak),
    (h, ids[5], 'expense',   920000, 'Makan Malam Keluarga', least(current_date, m + 9), ayah),
    (h, ids[5], 'expense',   150000, 'Langganan Streaming',  least(current_date, m + 10), ibu),
    (h, ids[5], 'expense',   250000, 'Uang Saku Minggu',     least(current_date, m + 11), adik),
    (h, ids[6], 'expense',  1200000, 'Setor Dana Darurat',   least(current_date, m + 1), ibu),
    (h, ids[6], 'expense',  1000000, 'Setor Liburan',        least(current_date, m + 1), ayah);

  -- Lima bulan sebelumnya, supaya grafik laporan langsung terisi.
  for k in 1..5 loop
    mm := (m - make_interval(months => k))::date;
    insert into transactions (household_id, category_id, kind, amount, title, spent_on, person_id) values
      (h, null, 'income', 12000000, 'Gaji Ayah', mm + 24, ayah),
      (h, null, 'income',  4500000, 'Gaji Ibu',  mm + 24, ibu);
    for i in 1..6 loop
      insert into transactions (household_id, category_id, kind, amount, title, spent_on, person_id)
      values (h, ids[i], 'expense', ((limits[i] * factor[k]) / 10000)::bigint * 10000,
              'Pengeluaran ' || lower(names[i]), mm + 8 + i, case when i % 2 = 0 then ayah else ibu end);
    end loop;
  end loop;

  select coalesce(sum(case when kind = 'income' then amount else -amount end), 0) into total
    from transactions where household_id = h;
  if total < 35500000 then
    insert into transactions (household_id, category_id, kind, amount, title, spent_on, person_id)
    values (h, null, 'income', 35500000 - total, 'Saldo awal', (m - interval '6 months')::date, ayah);
  end if;

  insert into savings_goals (household_id, name, target, saved, deadline) values
    (h, 'Dana Darurat',      30000000, 18500000, null),
    (h, 'Liburan Keluarga',  15000000,  6000000, (m + interval '8 months')::date),
    (h, 'Biaya Pendidikan',  50000000, 12000000, (m + interval '20 months')::date);

  insert into bills (household_id, category_id, name, amount, due_day, paid_month) values
    (h, ids[2], 'Listrik PLN',   1100000, 20, null),
    (h, ids[2], 'Internet',       420000,  5, m),
    (h, ids[2], 'Air PDAM',       280000, 15, null),
    (h, ids[4], 'SPP Sekolah',   2200000, 10, m),
    (h, ids[5], 'Iuran RT',       100000, 28, null);
end;
$$;

revoke all on function seed_demo(uuid) from public, anon, authenticated;

drop function create_household(text);
create function create_household(p_name text, p_demo boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dulu';
  end if;
  insert into households (name) values (p_name) returning id into h;
  insert into household_members (household_id, user_id, role) values (h, auth.uid(), 'owner');
  insert into people (household_id, name, role, color, sort) values
    (h, 'Ayah', 'Ayah', '#0f8f87', 0), (h, 'Ibu', 'Ibu', '#e0792b', 1),
    (h, 'Kakak', 'Kakak', '#3b82c4', 2), (h, 'Adik', 'Adik', '#6bb38a', 3);
  insert into categories (household_id, name) values
    (h, 'Belanja Dapur'), (h, 'Listrik dan Air'), (h, 'Transportasi'),
    (h, 'Pendidikan'), (h, 'Hiburan'), (h, 'Tabungan');
  if p_demo then
    perform seed_demo(h);
  end if;
  return h;
end;
$$;
revoke all on function create_household(text, boolean) from public, anon;
grant execute on function create_household(text, boolean) to authenticated;

-- Memuat data contoh ke keluarga yang masih kosong.
create function load_demo_data(p_household uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_member(p_household) then
    raise exception 'Bukan anggota keluarga ini';
  end if;
  if exists (select 1 from transactions where household_id = p_household) then
    raise exception 'Data contoh hanya bisa dimuat saat belum ada transaksi';
  end if;
  perform seed_demo(p_household);
end;
$$;
revoke all on function load_demo_data(uuid) from public, anon;
grant execute on function load_demo_data(uuid) to authenticated;

create function household_balance(p_household uuid) returns bigint
language sql stable set search_path = public as $$
  select coalesce(sum(case when kind = 'income' then amount else -amount end), 0)::bigint
  from transactions where household_id = p_household;
$$;

create function add_to_goal(p_goal uuid, p_amount bigint) returns void
language sql set search_path = public as $$
  update savings_goals set saved = greatest(saved + p_amount, 0) where id = p_goal;
$$;

create function pay_bill(p_bill uuid, p_month date, p_person uuid) returns void
language plpgsql set search_path = public as $$
declare
  b bills%rowtype;
begin
  select * into b from bills where id = p_bill;
  if not found then
    raise exception 'Tagihan tidak ditemukan';
  end if;
  update bills set paid_month = p_month where id = p_bill;
  insert into transactions (household_id, category_id, kind, amount, title, spent_on, person_id, bill_id)
  values (b.household_id, b.category_id, 'expense', b.amount, 'Bayar ' || b.name, current_date, p_person, b.id);
end;
$$;

create function unpay_bill(p_bill uuid, p_month date) returns void
language plpgsql set search_path = public as $$
begin
  update bills set paid_month = null where id = p_bill;
  delete from transactions
  where bill_id = p_bill and date_trunc('month', spent_on) = date_trunc('month', p_month::timestamp);
end;
$$;

revoke all on function household_balance(uuid), add_to_goal(uuid, bigint), pay_bill(uuid, date, uuid), unpay_bill(uuid, date) from public, anon;
grant execute on function household_balance(uuid), add_to_goal(uuid, bigint), pay_bill(uuid, date, uuid), unpay_bill(uuid, date) to authenticated;
