-- 구매자 취소 요청 (2026-11 추가) -------------------------------------------
-- { state: requested|approved|rejected, reason, detail, at, by: member|guest, answer, answered_at }
alter table public.orders add column if not exists cancel_req jsonb;
create index if not exists orders_cancel_req_idx on public.orders ((cancel_req->>'state')) where cancel_req is not null;
