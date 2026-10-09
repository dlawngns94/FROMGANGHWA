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

-- 상품 후기 · 상품 문의 (2026-10 추가) ------------------------------------
-- 누구나 볼 수 있고, 가입을 마친 회원만 쓸 수 있습니다. 작성자 이름은 서버가 가려서(조*인) 저장합니다.
-- 관리자는 admin.html 에서 후기를 숨기거나, 문의에 답변합니다 (서버 경유).

create or replace function public.mask_name(n text) returns text
language sql immutable as $$
  select case
    when n is null or btrim(n) = '' then '회원'
    when char_length(n) <= 2 then left(n, 1) || '*'
    else left(n, 1) || repeat('*', char_length(n) - 2) || right(n, 1)
  end
$$;

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  product_id  text not null,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text,
  rating      smallint not null check (rating between 1 and 5),
  content     text not null check (char_length(content) between 10 and 1000),
  hidden      boolean not null default false,   -- 관리자가 숨긴 후기
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)                  -- 상품마다 한 사람 한 개
);
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);

create table if not exists public.questions (
  id           bigint generated always as identity primary key,
  product_id   text not null,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text,
  question     text not null check (char_length(question) between 5 and 1000),
  is_secret    boolean not null default false,  -- 비밀글: 작성자 본인만 보임
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists questions_product_idx on public.questions (product_id, created_at desc);

-- 쓰는 사람이 이름·작성자·숨김·답변을 마음대로 넣지 못하게 서버 쪽에서 채움
create or replace function public.fill_review_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.name := public.mask_name((select p.name from public.profiles p where p.id = auth.uid()));
  new.hidden := false;
  new.created_at := now();
  return new;
end $$;

create or replace function public.fill_question_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.name := public.mask_name((select p.name from public.profiles p where p.id = auth.uid()));
  new.answer := null;
  new.answered_at := null;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists reviews_author on public.reviews;
create trigger reviews_author before insert on public.reviews for each row execute function public.fill_review_author();
drop trigger if exists questions_author on public.questions;
create trigger questions_author before insert on public.questions for each row execute function public.fill_question_author();

alter table public.reviews enable row level security;
alter table public.questions enable row level security;

drop policy if exists "후기 보기" on public.reviews;
drop policy if exists "후기 쓰기" on public.reviews;
drop policy if exists "내 후기 삭제" on public.reviews;
create policy "후기 보기" on public.reviews for select to anon, authenticated using (not hidden or user_id = (select auth.uid()));
create policy "후기 쓰기" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.agreed_at is not null));
create policy "내 후기 삭제" on public.reviews for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "문의 보기" on public.questions;
drop policy if exists "문의 쓰기" on public.questions;
drop policy if exists "내 문의 삭제" on public.questions;
create policy "문의 보기" on public.questions for select to anon, authenticated using (not is_secret or user_id = (select auth.uid()));
create policy "문의 쓰기" on public.questions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.agreed_at is not null));
create policy "내 문의 삭제" on public.questions for delete to authenticated using (user_id = (select auth.uid()) and answer is null);

revoke all on public.reviews, public.questions from anon, authenticated;
grant select on public.reviews, public.questions to anon, authenticated;
grant insert (product_id, rating, content) on public.reviews to authenticated;
grant insert (product_id, question, is_secret) on public.questions to authenticated;
grant delete on public.reviews, public.questions to authenticated;
