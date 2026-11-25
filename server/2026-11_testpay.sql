-- 체험·숙박 결제 (2026-11 추가) ------------------------------------------
-- 결제 주문에 예약 정보를 담고, 결제가 끝나면 예약(bookings)을 '예약확정'으로 만들어 주문번호로 연결합니다.
alter table public.orders add column if not exists booking jsonb;   -- { product_id, kind, slot_id, slot_time, date_from, date_to, people }
alter table public.bookings add column if not exists order_no text references public.orders (order_no) on delete set null;
create index if not exists bookings_order_idx on public.bookings (order_no);
