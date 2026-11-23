-- Chạy toàn bộ file này trong Supabase > SQL Editor
create extension if not exists btree_gist;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('free','busy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  -- một người không thể có 2 khoảng giờ chồng nhau (nên cũng không có Rảnh+Bận cùng lúc)
  exclude using gist (user_id with =, tstzrange(start_time, end_time) with &&)
);

-- Ghi chú tách bảng riêng để CHỈ chủ sở hữu đọc được (RLS không ẩn được từng cột)
create table public.schedule_notes (
  schedule_id uuid primary key references public.schedules(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  note text not null
);

create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.user_id = old.user_id; return new; end $$;
create trigger schedules_touch before update on public.schedules for each row execute function public.touch();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_notes enable row level security;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "schedules read" on public.schedules for select to authenticated using (true);
create policy "schedules insert own" on public.schedules for insert to authenticated with check (user_id = auth.uid());
create policy "schedules update own" on public.schedules for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "schedules delete own" on public.schedules for delete to authenticated using (user_id = auth.uid());

create policy "notes own" on public.schedule_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.schedules;
alter publication supabase_realtime add table public.profiles;
