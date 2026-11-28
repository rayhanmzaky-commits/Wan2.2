-- Mengosongkan transaksi, tagihan, target tabungan, dan anggaran sebuah keluarga (misalnya data contoh).
create function reset_household_data(p_household uuid) returns void
language plpgsql set search_path = public as $$
begin
  delete from transactions where household_id = p_household;
  delete from bills where household_id = p_household;
  delete from savings_goals where household_id = p_household;
  delete from budgets where household_id = p_household;
end;
$$;
revoke all on function reset_household_data(uuid) from public, anon;
grant execute on function reset_household_data(uuid) to authenticated;
