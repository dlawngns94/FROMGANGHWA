-- 프롬강화 — Supabase 데이터베이스 설정
-- Supabase 대시보드 > SQL Editor > New query 에 전체를 붙여넣고 Run 하세요. (처음 한 번만)
--
-- 보안 원칙
--  · RLS(행 단위 보안)를 켜서, 로그인한 회원은 "자기 정보·자기 주문"만 볼 수 있습니다.
--  · 주문은 고객 브라우저에서 직접 만들거나 고칠 수 없고, 서버(server/worker.js)만 씁니다.
--  · 비회원 주문조회도 서버를 거쳐 주문번호 + 휴대폰 번호가 둘 다 맞을 때만 보여 줍니다.

-- 회원 정보 ---------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,  -- 탈퇴하면 함께 삭제
  name        text,
  phone       text,
  address     text,
  agreed_at   timestamptz,          -- 약관·개인정보 수집 동의 시각
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "본인 정보 조회" on public.profiles;
drop policy if exists "본인 정보 생성" on public.profiles;
drop policy if exists "본인 정보 수정" on public.profiles;
create policy "본인 정보 조회" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "본인 정보 생성" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "본인 정보 수정" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

-- 주문 --------------------------------------------------------------------
create table if not exists public.orders (
  order_no      text primary key,
  user_id       uuid references auth.users (id) on delete set null,  -- 탈퇴해도 주문 기록은 법정 기간 보관
  status        text not null default 'pending'
                check (status in ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled')),
  method        text not null check (method in ('naverpay', 'kakaopay', 'test')),
  items         jsonb not null,
  product_name  text not null,
  goods         integer not null,
  discount      integer not null default 0,
  ship_fee      integer not null default 0,
  total         integer not null,
  tax_ex        integer not null default 0,
  ship          jsonb not null,       -- 받는 분 · 휴대폰 · 주소 · 배송 요청
  phone_digits  text not null,        -- 비회원 조회용 (숫자만)
  payment_id    text,                 -- 네이버페이 paymentId / 카카오페이 tid
  paid_at       timestamptz,
  cancelled_at  timestamptz,
  courier       text,
  tracking_no   text,
  created_at    timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "본인 주문 조회" on public.orders;
create policy "본인 주문 조회" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
-- insert / update / delete 정책은 일부러 만들지 않습니다 → 서버(service_role)만 쓸 수 있음

revoke all on public.orders from anon;
revoke insert, update, delete on public.orders from authenticated;
grant select on public.orders to authenticated;

-- 회원 장바구니 (2026-10 추가) -------------------------------------------
-- 로그아웃 후 다시 로그인하거나 다른 기기에서도 장바구니가 그대로 보이게 저장합니다.
create table if not exists public.carts (
  user_id     uuid primary key references auth.users (id) on delete cascade,  -- 탈퇴하면 함께 삭제
  items       jsonb not null default '[]'::jsonb,   -- [{ "id": "p01", "qty": 2 }, …]
  updated_at  timestamptz not null default now()
);

alter table public.carts enable row level security;

drop policy if exists "본인 장바구니 조회" on public.carts;
drop policy if exists "본인 장바구니 생성" on public.carts;
drop policy if exists "본인 장바구니 수정" on public.carts;
create policy "본인 장바구니 조회" on public.carts for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 장바구니 생성" on public.carts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "본인 장바구니 수정" on public.carts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.carts from anon;
grant select, insert, update on public.carts to authenticated;

-- 구매 문의 (2026-10 추가, 결제 보류 중 사용) ----------------------------
-- 고객이 남긴 구매 문의. 서버(worker)만 쓰고, 회원은 자기 문의만 볼 수 있습니다.
create table if not exists public.inquiries (
  inquiry_no  text primary key,
  user_id     uuid references auth.users (id) on delete set null,
  status      text not null default 'new' check (status in ('new', 'contacted', 'done', 'cancelled')),
  items       jsonb not null,                -- [{ id, name, price, qty }]
  goods       integer not null default 0,
  ship_fee    integer not null default 0,
  total       integer not null default 0,    -- 예상 금액 ('가격 문의' 상품 제외)
  has_quote   boolean not null default false, -- '가격 문의' 상품 포함 여부
  name        text not null,
  tel         text not null,
  addr        text,
  message     text,
  admin_memo  text,                           -- 관리자 메모 (고객에게 안 보임)
  created_at  timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_user_idx on public.inquiries (user_id, created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "본인 문의 조회" on public.inquiries;
create policy "본인 문의 조회" on public.inquiries for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.inquiries from anon;
revoke insert, update, delete on public.inquiries from authenticated;
grant select on public.inquiries to authenticated;
