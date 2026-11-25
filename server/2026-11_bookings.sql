-- 예약·문의 (2026-11 추가) --------------------------------------------
-- 체험·숙박 예약 문의와 1:1 문의. 서버(worker)만 쓰고, 회원은 자기 것만 볼 수 있습니다.
create table if not exists public.bookings (
  booking_no   text primary key,
  user_id      uuid references auth.users (id) on delete set null,
  kind         text not null check (kind in ('craft', 'stay', 'general')),  -- 체험 / 숙박 / 1:1 문의
  product_id   text,
  product_name text,
  date_from    date,                          -- 체험 날짜 또는 체크인
  date_to      date,                          -- 체크아웃 (숙박만)
  people       integer check (people between 1 and 99),
  name         text not null,
  tel          text not null,
  message      text,
  status       text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'done', 'cancelled')),
  admin_memo   text,                          -- 관리자 메모 (고객에게 안 보임)
  created_at   timestamptz not null default now()
);

create index if not exists bookings_status_idx on public.bookings (status, created_at desc);
create index if not exists bookings_date_idx on public.bookings (date_from);
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "본인 예약 조회" on public.bookings;
create policy "본인 예약 조회" on public.bookings for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.bookings from anon;
revoke insert, update, delete on public.bookings from authenticated;
grant select on public.bookings to authenticated;

