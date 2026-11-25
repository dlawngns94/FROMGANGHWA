-- 체험 일정(회차) · 숙박 막은 날 (2026-11 추가) -----------------------------
-- 서버(worker)만 읽고 씁니다. 손님 화면에는 서버가 남은 자리·예약 불가 날짜만 알려 줍니다.

-- 체험 회차: 상품별 날짜·시간·정원
create table if not exists public.slots (
  id          bigint generated always as identity primary key,
  product_id  text not null,
  slot_date   date not null,
  slot_time   text not null check (slot_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  capacity    integer not null check (capacity between 1 and 500),
  closed      boolean not null default false,     -- 관리자가 닫은 회차 (손님에게 안 보임)
  created_at  timestamptz not null default now(),
  unique (product_id, slot_date, slot_time)
);
create index if not exists slots_date_idx on public.slots (product_id, slot_date);

-- 예약·문의에 회차 연결
alter table public.bookings add column if not exists slot_id bigint references public.slots (id) on delete set null;
alter table public.bookings add column if not exists slot_time text;
create index if not exists bookings_slot_idx on public.bookings (slot_id);

-- 숙박: 관리자가 막은 날 (휴무·정비 등)
create table if not exists public.stay_blocks (
  product_id  text not null,
  block_date  date not null,
  note        text,
  created_at  timestamptz not null default now(),
  primary key (product_id, block_date)
);

alter table public.slots enable row level security;
alter table public.stay_blocks enable row level security;
revoke all on public.slots from anon, authenticated;
revoke all on public.stay_blocks from anon, authenticated;
