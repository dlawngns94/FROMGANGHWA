/**
 * 프롬강화 — 서버 (Cloudflare Workers, 무료 플랜으로 충분)
 *
 * GitHub Pages 는 서버가 없어서 결제 승인·주문 저장·네이버 로그인을 직접 할 수 없습니다.
 * 이 파일 하나를 Cloudflare Workers 에 올리면 그 역할을 합니다. (README 4장 참고)
 *
 * 경로
 *  POST /inquiry             구매 문의 저장 (결제 보류 중일 때 사용)
 *  POST /booking             예약·문의 저장 (체험·숙박 예약, 1:1 문의)
 *  POST /checkout            주문서 저장 (금액은 서버가 products.json 으로 다시 계산)
 *  POST /naverpay/approve    네이버페이 결제 승인
 *  POST /kakaopay/ready      카카오페이 결제창 준비
 *  POST /kakaopay/approve    카카오페이 결제 승인
 *  POST /test/pay            테스트 결제 (관리자 로그인 또는 TEST_MODE=true)
 *  POST /reserve/checkout    체험·숙박 결제 주문 만들기 (지금은 관리자 테스트 결제만)
 *  POST /orders/lookup       비회원 주문조회 (주문번호 + 휴대폰)
 *  POST /orders/cancel-request 구매자 취소 요청 (결제완료 상태일 때만, 회원 본인 또는 주문번호+휴대폰)
 *  POST /admin/cancel-reject 관리자: 구매자 취소 요청 거절 (사유 필수)
 *  POST /auth/naver          네이버 로그인 → Supabase 로그인 토큰 발급
 *  POST /auth/kakao          카카오 로그인 → Supabase 로그인 토큰 발급
 *  GET  /slots?product=      체험 회차와 남은 자리 (누구나)
 *  GET  /stay?product=       숙박 예약 불가 날짜 (누구나)
 *  GET  /admin/slots         관리자: 체험 회차 목록 (예약 인원 포함)
 *  POST /admin/slots         관리자: 체험 회차 한꺼번에 만들기
 *  POST /admin/slot          관리자: 회차 정원·시간·닫기·삭제
 *  GET  /admin/stay          관리자: 숙박 달력 (예약·문의·막은 날)
 *  POST /admin/stay-block    관리자: 숙박 날짜 막기/풀기
 *  GET  /admin/products      관리자: 상품 목록 (GitHub 의 data/products.json)
 *  POST /admin/products      관리자: 상품 목록 저장 (GitHub 에 커밋 → 1~2분 뒤 홈페이지 반영)
 *  POST /admin/image         관리자: 상품 사진 올리기 (assets/images/products/)
 *  GET  /me                  내 관리자 여부 (관리자면 새 예약·문의 건수도)
 *  POST /me/withdraw         회원 탈퇴
 *  GET  /admin/inquiries     관리자: 구매 문의 목록
 *  POST /admin/inquiry       관리자: 문의 상태·메모 저장
 *  GET  /admin/bookings      관리자: 예약·문의 목록
 *  POST /admin/booking       관리자: 예약·문의 상태·메모 저장
 *  GET  /admin/reviews       관리자: 상품 후기 목록
 *  POST /admin/review        관리자: 후기 숨김/보이기
 *  GET  /admin/questions     관리자: 상품 문의 목록
 *  POST /admin/question      관리자: 상품 문의 답변
 *  GET  /admin/orders        관리자: 주문 목록
 *  POST /admin/order         관리자: 상태·운송장 저장
 *  POST /admin/cancel        관리자: 결제 전액 취소
 *
 * Workers > Settings > Variables and Secrets 에 넣을 값 (🔒 = 반드시 Secret 타입)
 *  SITE_URL                    https://dlawngns94.github.io/FROMGANGHWA  (끝에 / 없이)
 *  SUPABASE_URL                https://xxxx.supabase.co
 *  SUPABASE_SERVICE_KEY     🔒 Supabase service_role(또는 secret) 키
 *  ADMIN_EMAILS                관리자 로그인 이메일 (여러 개면 쉼표로)
 *  TEST_MODE                   true 면 누구나 '테스트 결제' 가능 (넣지 않으면 관리자 계정만 테스트 결제 가능)
 *  NAVERPAY_MODE               development | production
 *  NAVERPAY_PARTNER_ID / NAVERPAY_CLIENT_ID / NAVERPAY_CHAIN_ID(그룹형만)
 *  NAVERPAY_CLIENT_SECRET   🔒
 *  KAKAOPAY_CID                테스트: TC0ONETIME / 실결제: 계약 후 받은 CID
 *  KAKAOPAY_SECRET_KEY      🔒 카카오페이 개발자센터의 Secret key (DEV… 또는 PRD…)
 *  NAVER_LOGIN_CLIENT_ID       네이버 로그인 애플리케이션 Client ID
 *  NAVER_LOGIN_CLIENT_SECRET 🔒
 *  KAKAO_LOGIN_CLIENT_SECRET 🔒 카카오 로그인 Client Secret (카카오 콘솔에서 켠 경우만)
 *  GITHUB_TOKEN             🔒 상품 관리용 GitHub 토큰 (FROMGANGHWA 저장소 Contents 읽기·쓰기만)
 *  GITHUB_REPO                 dlawngns94/FROMGANGHWA
 *  GITHUB_BRANCH               main (생략 가능)
 *
 * 외부 API 경로·파라미터는 각 개발자센터 최신 문서로 한 번 더 확인하세요.
 */

const PAID = ["paid", "preparing", "shipped", "delivered"];
const ADMIN_STATUS = PAID;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

export default {
  // Supabase 무료 플랜은 오래 쓰지 않으면 프로젝트를 멈춥니다.
  // Cloudflare 워커 > Settings > Triggers > Cron Triggers 에 하루 한 번(예: 0 0 * * *) 을 넣으면
  // 아래가 매일 Supabase 에 아주 작은 조회를 한 번 보내 멈추지 않게 합니다.
  async scheduled(event, env, ctx) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
    ctx.waitUntil(makeDb(env).select("profiles?select=id&limit=1")
      .then(() => console.log("KEEPALIVE ok"))
      .catch(e => console.error("KEEPALIVE fail", e.message)));
  },

  async fetch(req, env, ctx) {
    let origin = "*";
    try { origin = new URL(env.SITE_URL).origin; } catch {}
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    };
    const json = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const missing = ["SITE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter(k => !env[k]);
    if (missing.length) return json(500, { ok: false, message: `서버 설정 누락: ${missing.join(", ")}` });

    const url = new URL(req.url);
    const route = ROUTES[`${req.method} ${url.pathname.replace(/\/+$/, "")}`];
    if (!route) return json(404, { ok: false, message: "없는 경로입니다" });

    let body = {};
    if (req.method === "POST") {
      try { const text = await req.text(); body = (text && JSON.parse(text)) || {}; } catch { return json(400, { ok: false, message: "잘못된 요청" }); }
    }
    try {
      const out = await route({ req, env, ctx, url, body, db: makeDb(env) });
      return json(200, { ok: true, ...out });
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      return json(e.status || 500, { ok: false, message: e.status ? e.message : "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요" });
    }
  },
};

const ROUTES = {
  "POST /checkout": checkout,
  "POST /naverpay/approve": naverpayApprove,
  "POST /kakaopay/ready": kakaopayReady,
  "POST /kakaopay/approve": kakaopayApprove,
  "POST /test/pay": testPay,
  "POST /reserve/checkout": reserveCheckout,
  "POST /orders/lookup": lookup,
  "POST /orders/cancel-request": cancelRequest,
  "POST /admin/cancel-reject": adminCancelReject,
  "POST /auth/naver": naverLogin,
  "POST /auth/kakao": kakaoLogin,
  "GET /me": meInfo,
  "GET /slots": publicSlots,
  "GET /stay": publicStay,
  "GET /admin/slots": adminSlots,
  "POST /admin/slots": adminCreateSlots,
  "POST /admin/slot": adminSlotUpdate,
  "GET /admin/stay": adminStay,
  "POST /admin/stay-block": adminStayBlock,
  "GET /admin/products": adminProducts,
  "POST /admin/products": adminSaveProducts,
  "POST /admin/image": adminImage,
  "POST /me/withdraw": withdraw,
  "POST /inquiry": inquiry,
  "POST /booking": booking,
  "GET /admin/bookings": adminBookings,
  "POST /admin/booking": adminBookingUpdate,
  "GET /admin/inquiries": adminInquiries,
  "POST /admin/inquiry": adminInquiryUpdate,
  "GET /admin/reviews": adminReviews,
  "POST /admin/review": adminReviewUpdate,
  "GET /admin/questions": adminQuestions,
  "POST /admin/question": adminAnswer,
  "GET /admin/orders": adminOrders,
  "POST /admin/order": adminUpdate,
  "POST /admin/cancel": adminCancel,
};

/* ---------------- 주문서 ---------------- */
async function checkout({ env, req, ctx, body, db }) {
  const { items, ship, method } = body;
  if (!["naverpay", "kakaopay", "test"].includes(method)) fail(400, "결제 수단을 확인해 주세요");
  if (method === "test" && !(await canTestPay(env, req))) fail(403, "테스트 결제는 관리자 계정으로 로그인했을 때만 쓸 수 있어요");
  const s = cleanShip(ship);
  const user = await getUser(env, req, false);
  const { products, site } = await catalog(env);

  // 첫 주문 할인: 가입을 마친 회원 + 결제된 주문이 없을 때
  let rate = 0;
  const perk = Number(site.member && site.member.firstOrderDiscount) || 0;
  if (user && perk) {
    const [prof] = await db.select(`profiles?id=eq.${user.id}&select=id`);
    const prev = await db.select(`orders?user_id=eq.${user.id}&status=in.(${PAID})&select=order_no&limit=1`);
    if (prof && !prev.length) rate = perk;
  }
  const a = calcAmount(items, products, site.shipping, rate);
  if (a.lines.some(l => (products.find(p => p.id === l.id) || {}).ticket)) fail(400, "체험·숙박은 예약 화면에서 일정을 골라 결제해 주세요");
  const order = await db.insert("orders", {
    order_no: newOrderNo(),
    user_id: user ? user.id : null,
    status: "pending",
    method,
    items: a.lines,
    product_name: a.lines.length > 1 ? `${a.lines[0].name} 외 ${a.lines.length - 1}건` : a.lines[0].name,
    goods: a.goods, discount: a.discount, ship_fee: a.ship, total: a.total, tax_ex: a.taxEx,
    ship: s,
    phone_digits: digits(s.tel),
  });
  // 결제하지 않고 떠난 주문서는 하루 뒤 삭제
  ctx.waitUntil(db.remove(`orders?status=eq.pending&created_at=lt.${new Date(Date.now() - 864e5).toISOString()}`).catch(() => {}));
  return { order: publicOrder(order) };
}

/* ---------------- 구매 문의 (결제 보류 중) ----------------
 * 고객이 상품과 연락처를 남기면 inquiries 표에 저장하고, 관리자 화면에서 보고 연락합니다. 결제는 일어나지 않습니다.
 */
const INQ_STATUS = ["new", "contacted", "done", "cancelled"];

async function inquiry({ env, req, body, db }) {
  if (body.website) return { inquiry: { inquiry_no: "IGNORED", total: 0 } };   // 자동 등록 봇 (숨김 칸을 채움)
  const c = body.contact || {};
  const name = String(c.name || "").trim().slice(0, 30);
  const tel = String(c.tel || "").trim().slice(0, 13);
  const addr = String(c.addr || "").trim().slice(0, 200);
  const message = String(c.message || "").trim().slice(0, 1000);
  if (!name) fail(400, "이름을 입력해 주세요");
  if (!/^0\d{8,10}$/.test(digits(tel))) fail(400, "휴대폰 번호를 확인해 주세요");

  const { products, site } = await catalog(env);
  const a = calcAmount(body.items, products, site.shipping, 0);
  const needAddr = a.lines.some(l => !(products.find(p => p.id === l.id) || {}).ticket);
  if (needAddr && !addr) fail(400, "배송받을 주소를 입력해 주세요");
  const user = await getUser(env, req, false);

  const row = await db.insert("inquiries", {
    inquiry_no: newOrderNo().replace(/^FG/, "Q"),
    user_id: user ? user.id : null,
    status: "new",
    items: a.lines,
    goods: a.goods, ship_fee: a.ship, total: a.total,
    has_quote: a.lines.some(l => !l.price),
    name, tel, addr: addr || null, message: message || null,
  });
  // TODO: 새 문의 알림 (예: 텔레그램 봇, 카카오 알림톡) 을 여기에 붙이세요
  console.log("INQUIRY", row.inquiry_no, a.lines.map(l => `${l.name}x${l.qty}`).join(", "));
  return { inquiry: { inquiry_no: row.inquiry_no, created_at: row.created_at, total: row.total } };
}

async function adminInquiries({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "new";
  const filter = st === "all" ? "" : INQ_STATUS.includes(st) ? `status=eq.${st}&` : fail(400, "잘못된 상태");
  const inquiries = await db.select(`inquiries?${filter}select=*&order=created_at.desc&limit=300`);
  return { inquiries };
}

async function adminInquiryUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  if (!INQ_STATUS.includes(body.status)) fail(400, "잘못된 상태");
  const [u] = await db.update(`inquiries?inquiry_no=eq.${enc(body.inquiryNo || "")}`, {
    status: body.status,
    admin_memo: String(body.memo || "").slice(0, 500) || null,
  });
  if (!u) fail(404, "문의를 찾을 수 없어요");
  return { inquiry: u };
}

/* ---------------- 예약·문의 ----------------
 * 체험·숙박 상품은 희망 날짜·인원을, 1:1 문의는 내용만 받아 bookings 표에 저장합니다. 결제는 일어나지 않습니다.
 */
const BK_STATUS = ["new", "contacted", "confirmed", "done", "cancelled"];
const kstToday = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z"));

/* 체험·숙박 예약 내용 검사 (예약 문의 · 테스트 결제 공통) — 남은 자리·예약 불가 날짜까지 확인 */
async function checkReservation(env, db, body) {
  let kind, product, dateFrom = null, dateTo = null, people, slot = null;
  const { products } = await catalog(env);
  product = products.find(p => p.id === body.productId && p.ticket && !p.soon);
  if (!product) fail(400, "예약할 수 없는 상품이에요");
  kind = product.cat === "stay" ? "stay" : "craft";
  people = Math.floor(Number(body.people));
  if (!(people >= 1 && people <= 99)) fail(400, "인원을 확인해 주세요");
  if (kind === "craft" && body.slotId) {
    // 관리자가 만든 회차를 고른 경우: 남은 자리 확인
    const [s] = await db.select(`slots?id=eq.${Number(body.slotId) || 0}&product_id=eq.${enc(product.id)}&select=*`);
    if (!s || s.closed) fail(400, "선택한 일정은 예약할 수 없어요. 다른 일정을 골라 주세요");
    if (!slotOpen(s)) fail(400, "지난 일정이에요. 다른 일정을 골라 주세요");
    const left = s.capacity - ((await usedBySlot(db, [s.id]))[s.id] || 0);
    if (people > left) fail(400, left > 0 ? `남은 자리가 ${left}명이에요. 인원을 줄이거나 다른 일정을 골라 주세요` : "마감된 일정이에요. 다른 일정을 골라 주세요");
    slot = s; dateFrom = s.slot_date;
  } else {
    if (kind === "craft") {
      const open = await db.select(`slots?product_id=eq.${enc(product.id)}&closed=eq.false&slot_date=gte.${kstToday()}&select=id&limit=1`);
      if (open.length) fail(400, "체험 일정을 골라 주세요");
    }
    dateFrom = String(body.dateFrom || "");
    if (!isDate(dateFrom)) fail(400, kind === "stay" ? "체크인 날짜를 선택해 주세요" : "희망 날짜를 선택해 주세요");
    if (dateFrom < kstToday()) fail(400, "지난 날짜는 선택할 수 없어요");
  }
  if (kind === "stay") {
    dateTo = String(body.dateTo || "");
    if (!isDate(dateTo)) fail(400, "체크아웃 날짜를 선택해 주세요");
    if (dateTo <= dateFrom) fail(400, "체크아웃은 체크인 다음 날 이후로 선택해 주세요");
    if (dateTo > addDays(dateFrom, 30)) fail(400, "한 번에 30박까지 문의할 수 있어요");
    const busy = await stayUnavailable(db, product.id, dateFrom, addDays(dateTo, -1));
    if (busy.size) fail(400, `${[...busy].sort()[0]} 은(는) 이미 예약이 차 있어요. 다른 날짜를 골라 주세요`);
  }
  return { kind, product, dateFrom, dateTo, people, slot };
}

async function booking({ env, req, body, db }) {
  if (body.website) return { booking: { booking_no: "IGNORED" } };   // 자동 등록 봇 (숨김 칸을 채움)
  const name = String(body.name || "").trim().slice(0, 30);
  const tel = String(body.tel || "").trim().slice(0, 13);
  const message = String(body.message || "").trim().slice(0, 1000);
  if (!name) fail(400, "이름을 입력해 주세요");
  if (!/^0\d{8,10}$/.test(digits(tel))) fail(400, "휴대폰 번호를 확인해 주세요");

  let kind = "general", product = null, dateFrom = null, dateTo = null, people = null, slot = null;
  if (body.productId) {
    ({ kind, product, dateFrom, dateTo, people, slot } = await checkReservation(env, db, body));
  } else if (!message) fail(400, "문의 내용을 입력해 주세요");

  const user = await getUser(env, req, false);
  const row = await db.insert("bookings", {
    booking_no: newOrderNo().replace(/^FG/, "R"),
    user_id: user ? user.id : null,
    kind,
    product_id: product ? product.id : null,
    product_name: product ? product.name : null,
    date_from: dateFrom, date_to: dateTo, people,
    slot_id: slot ? slot.id : null, slot_time: slot ? slot.slot_time : null,
    name, tel, message: message || null,
    status: "new",
  });
  // TODO: 새 예약 알림 (예: 텔레그램 봇, 카카오 알림톡) 을 여기에 붙이세요
  console.log("BOOKING", row.booking_no, kind, product ? product.name : "", dateFrom || "");
  return { booking: { booking_no: row.booking_no, created_at: row.created_at } };
}

async function adminBookings({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "new";
  let q;
  if (st === "upcoming") q = `status=in.(new,contacted,confirmed)&date_from=gte.${kstToday()}&order=date_from.asc,created_at.asc`;
  else if (st === "all") q = "order=created_at.desc";
  else if (BK_STATUS.includes(st)) q = `status=eq.${st}&order=created_at.desc`;
  else fail(400, "잘못된 상태");
  const bookings = await db.select(`bookings?${q}&select=*&limit=300`);
  return { bookings };
}

async function adminBookingUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  if (!BK_STATUS.includes(body.status)) fail(400, "잘못된 상태");
  if (body.status === "confirmed") {
    // 숙박을 확정할 때 다른 확정 예약·막은 날과 겹치면 막음
    const [b] = await db.select(`bookings?booking_no=eq.${enc(body.bookingNo || "")}&select=*`);
    if (b && b.kind === "stay" && b.status !== "confirmed" && b.date_from && b.date_to) {
      const busy = await stayUnavailable(db, b.product_id, b.date_from, addDays(b.date_to, -1), b.booking_no);
      if (busy.size) fail(409, `${[...busy].sort()[0]} 에 이미 확정된 예약이나 막은 날이 있어요`);
    }
  }
  const [u] = await db.update(`bookings?booking_no=eq.${enc(body.bookingNo || "")}`, {
    status: body.status,
    admin_memo: String(body.memo || "").slice(0, 500) || null,
  });
  if (!u) fail(404, "예약·문의를 찾을 수 없어요");
  return { booking: u };
}

/* ---------------- 체험 일정(회차) ----------------
 * 관리자가 상품별로 날짜·시간·정원을 만들어 두면, 손님은 남은 자리가 있는 회차를 골라 예약 문의를 남깁니다.
 * 자리 계산: 새 문의·연락함·예약확정 상태의 인원을 모두 셉니다 (취소·완료는 제외).
 */
const ACTIVE_BK = "status=in.(new,contacted,confirmed)";
const kstNowHM = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(11, 16);
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const addDays = (ymd, n) => { const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const slotOpen = s => s.slot_date > kstToday() || (s.slot_date === kstToday() && s.slot_time > kstNowHM());
const pid = v => /^[A-Za-z0-9_-]{1,24}$/.test(String(v || "")) ? String(v) : fail(400, "상품을 확인해 주세요");

async function usedBySlot(db, ids) {
  if (!ids.length) return {};
  const rows = await db.select(`bookings?slot_id=in.(${ids.join(",")})&${ACTIVE_BK}&select=slot_id,people`);
  const used = {};
  for (const r of rows) used[r.slot_id] = (used[r.slot_id] || 0) + (r.people || 0);
  return used;
}

async function publicSlots({ url, db }) {
  const product = pid(url.searchParams.get("product"));
  const to = addDays(kstToday(), 120);
  const slots = (await db.select(`slots?product_id=eq.${enc(product)}&closed=eq.false&slot_date=gte.${kstToday()}&slot_date=lte.${to}&select=id,slot_date,slot_time,capacity&order=slot_date.asc,slot_time.asc&limit=500`)).filter(slotOpen);
  const used = await usedBySlot(db, slots.map(s => s.id));
  return { today: kstToday(), slots: slots.map(s => ({ id: s.id, date: s.slot_date, time: s.slot_time, capacity: s.capacity, left: Math.max(0, s.capacity - (used[s.id] || 0)) })) };
}

async function adminSlots({ env, req, url, db }) {
  await requireAdmin(env, req);
  const product = pid(url.searchParams.get("product"));
  const from = isDate(url.searchParams.get("from") || "") ? url.searchParams.get("from") : addDays(kstToday(), -7);
  const to = addDays(from, 186);
  const slots = await db.select(`slots?product_id=eq.${enc(product)}&slot_date=gte.${from}&slot_date=lte.${to}&select=*&order=slot_date.asc,slot_time.asc&limit=1000`);
  const used = await usedBySlot(db, slots.map(s => s.id));
  return { today: kstToday(), slots: slots.map(s => ({ ...s, booked: used[s.id] || 0 })) };
}

async function adminCreateSlots({ env, req, body, db }) {
  await requireAdmin(env, req);
  const product = pid(body.product);
  const { products } = await catalog(env);
  const p = products.find(x => x.id === product);
  if (!p || !p.ticket || p.cat === "stay") fail(400, "체험 상품만 일정을 만들 수 있어요");
  const from = String(body.from || ""), to = String(body.to || "") || from;
  if (!isDate(from) || !isDate(to)) fail(400, "시작일과 종료일을 골라 주세요");
  if (to < from) fail(400, "종료일이 시작일보다 빨라요");
  if (from < kstToday()) fail(400, "지난 날짜에는 일정을 만들 수 없어요");
  if (to > addDays(from, 186)) fail(400, "한 번에 6개월까지만 만들 수 있어요");
  const weekdays = (Array.isArray(body.weekdays) ? body.weekdays : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  if (!weekdays.length) fail(400, "요일을 하나 이상 골라 주세요");
  const times = [...new Set((Array.isArray(body.times) ? body.times : []).map(t => String(t).trim()))].filter(Boolean);
  if (!times.length || times.some(t => !isTime(t))) fail(400, "시간을 10:00 처럼 입력해 주세요");
  const capacity = Number(body.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) fail(400, "정원은 1~500 사이 숫자로 입력해 주세요");
  const rows = [];
  for (let d = from; d <= to; d = addDays(d, 1))
    if (weekdays.includes(new Date(d + "T00:00:00Z").getUTCDay())) for (const t of times) rows.push({ product_id: product, slot_date: d, slot_time: t, capacity });
  if (!rows.length) fail(400, "고른 기간에 해당 요일이 없어요");
  if (rows.length > 400) fail(400, `일정이 ${rows.length}개로 너무 많아요. 한 번에 400개까지 만들 수 있어요`);
  const made = await db.insertMany("slots", rows, "product_id,slot_date,slot_time");
  return { created: made.length, skipped: rows.length - made.length };
}

async function adminSlotUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  const id = Number(body.id) || 0;
  const [s] = await db.select(`slots?id=eq.${id}&select=*`);
  if (!s) fail(404, "이미 삭제된 일정이에요");
  const booked = (await usedBySlot(db, [id]))[id] || 0;
  if (body.remove) {
    if (booked) fail(409, `이 일정에 ${booked}명의 예약·문의가 있어요. 먼저 예약을 취소하거나 '닫기'를 이용해 주세요`);
    await db.remove(`slots?id=eq.${id}`);
    return { removed: true };
  }
  const patch = {};
  if (body.capacity !== undefined) {
    const c = Number(body.capacity);
    if (!Number.isInteger(c) || c < 1 || c > 500) fail(400, "정원은 1~500 사이 숫자로 입력해 주세요");
    if (c < booked) fail(409, `이미 ${booked}명이 예약해서 정원을 ${booked}명보다 줄일 수 없어요`);
    patch.capacity = c;
  }
  if (body.time !== undefined) {
    const t = String(body.time).trim();
    if (!isTime(t)) fail(400, "시간을 10:00 처럼 입력해 주세요");
    if (t !== s.slot_time) {
      const dup = await db.select(`slots?product_id=eq.${enc(s.product_id)}&slot_date=eq.${s.slot_date}&slot_time=eq.${enc(t)}&select=id`);
      if (dup.length) fail(409, `${s.slot_date} ${t} 일정이 이미 있어요`);
    }
    patch.slot_time = t;
  }
  if (body.closed !== undefined) patch.closed = !!body.closed;
  if (!Object.keys(patch).length) fail(400, "바꿀 내용이 없어요");
  const [u] = await db.update(`slots?id=eq.${id}`, patch);
  if (patch.slot_time) await db.update(`bookings?slot_id=eq.${id}`, { slot_time: patch.slot_time });
  return { slot: { ...u, booked } };
}

/* ---------------- 숙박 달력 ----------------
 * 손님에게 '예약 불가'로 보이는 날 = 예약확정된 숙박의 밤 + 관리자가 막은 날
 */
async function stayUnavailable(db, product, from, to, exceptNo) {
  const out = new Set();
  const [bk, blocks] = await Promise.all([
    db.select(`bookings?product_id=eq.${enc(product)}&kind=eq.stay&status=eq.confirmed&date_from=lte.${to}&date_to=gt.${from}&select=booking_no,date_from,date_to`),
    db.select(`stay_blocks?product_id=eq.${enc(product)}&block_date=gte.${from}&block_date=lte.${to}&select=block_date`),
  ]);
  for (const b of bk) {
    if (b.booking_no === exceptNo) continue;
    for (let d = b.date_from; d < b.date_to; d = addDays(d, 1)) if (d >= from && d <= to) out.add(d);
  }
  for (const b of blocks) out.add(b.block_date);
  return out;
}

async function publicStay({ url, db }) {
  const product = pid(url.searchParams.get("product"));
  const from = kstToday(), to = addDays(from, 366);
  return { today: from, unavailable: [...await stayUnavailable(db, product, from, to)].sort() };
}

async function adminStay({ env, req, url, db }) {
  await requireAdmin(env, req);
  const product = pid(url.searchParams.get("product"));
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") || "") ? url.searchParams.get("month") : kstToday().slice(0, 7);
  const from = month + "-01", to = addDays(addDays(from, 31).slice(0, 7) + "-01", -1);
  const [bookings, blocks] = await Promise.all([
    db.select(`bookings?product_id=eq.${enc(product)}&kind=eq.stay&status=in.(new,contacted,confirmed)&date_from=lte.${to}&date_to=gt.${from}&select=booking_no,name,tel,people,status,date_from,date_to&order=date_from.asc`),
    db.select(`stay_blocks?product_id=eq.${enc(product)}&block_date=gte.${from}&block_date=lte.${to}&select=block_date,note`),
  ]);
  return { today: kstToday(), month, from, to, bookings, blocks };
}

async function adminStayBlock({ env, req, body, db }) {
  await requireAdmin(env, req);
  const product = pid(body.product);
  const dates = (Array.isArray(body.dates) ? body.dates : [body.date]).map(String).filter(isDate).slice(0, 62);
  if (!dates.length) fail(400, "날짜를 골라 주세요");
  if (body.blocked) {
    await db.insertMany("stay_blocks", dates.map(d => ({ product_id: product, block_date: d, note: String(body.note || "").slice(0, 100) || null })), "product_id,block_date");
  } else {
    await db.remove(`stay_blocks?product_id=eq.${enc(product)}&block_date=in.(${dates.join(",")})`);
  }
  return { ok: true };
}

/* ---------------- 상품 관리 (GitHub 저장) ----------------
 * data/products.json 과 사진을 GitHub 저장소에 직접 커밋합니다. GitHub Pages 가 1~2분 뒤 홈페이지에 반영해요.
 */
const ghBranch = env => env.GITHUB_BRANCH || "main";
const b64enc = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function gh(env, path, init) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) fail(500, "상품 관리를 쓰려면 Cloudflare 워커에 GITHUB_TOKEN · GITHUB_REPO 를 넣어 주세요");
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}` + (init ? "" : `?ref=${enc(ghBranch(env))}`);
  return fetch(url, { ...init, headers: {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "fromganghwa-admin",
    ...(init ? { "Content-Type": "application/json" } : {}),
  } });
}
async function ghGet(env, path) {
  const r = await gh(env, path);
  if (!r.ok) { console.error("GH_GET", path, r.status, await r.text()); fail(502, "GitHub 에서 상품 파일을 읽지 못했어요. 토큰 설정을 확인해 주세요"); }
  const j = await r.json();
  return { text: new TextDecoder().decode(b64dec(String(j.content || "").replace(/\s/g, ""))), sha: j.sha };
}
async function ghPut(env, path, bytes, message, sha) {
  const payload = { message, content: b64enc(bytes), branch: ghBranch(env) };
  if (sha) payload.sha = sha;
  const r = await gh(env, path, { method: "PUT", body: JSON.stringify(payload) });
  if (r.status === 409 || (r.status === 422 && sha)) fail(409, "그사이 다른 곳에서 상품이 바뀌었어요. 새로고침한 뒤 다시 저장해 주세요");
  if (!r.ok) { console.error("GH_PUT", path, r.status, await r.text()); fail(502, "GitHub 에 저장하지 못했어요. 토큰 권한(Contents 읽기·쓰기)을 확인해 주세요"); }
  const j = await r.json();
  return j.content && j.content.sha;
}

async function adminProducts({ env, req }) {
  await requireAdmin(env, req);
  const [file, siteFile] = await Promise.all([ghGet(env, "data/products.json"), ghGet(env, "data/site.json")]);
  let items, site;
  try { items = JSON.parse(file.text); site = JSON.parse(siteFile.text); } catch { fail(500, "data/products.json 형식이 깨져 있어요"); }
  return { items, sha: file.sha, categories: (site.categories || []).filter(c => c.id !== "all").map(c => ({ id: c.id, name: c.name })) };
}

const txt = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
function cleanProduct(raw, catIds, n) {
  const bad = msg => fail(400, `${n}번째 상품: ${msg}`);
  if (!raw || typeof raw !== "object") bad("형식이 잘못됐어요");
  const p = {};
  p.id = txt(raw.id, 24); if (!/^[a-z0-9_-]{1,24}$/i.test(p.id)) bad("상품 코드가 잘못됐어요");
  p.cat = txt(raw.cat, 20); if (!catIds.includes(p.cat)) bad("분류를 골라 주세요");
  p.name = txt(raw.name, 80); if (!p.name) bad("상품 이름을 입력해 주세요");
  p.sub = txt(raw.sub, 120);
  const money = (v, label) => { const x = Number(v || 0); if (!Number.isInteger(x) || x < 0 || x > 100000000) bad(`${label}은 0원 이상 숫자로 입력해 주세요`); return x; };
  p.price = money(raw.price, "가격"); p.was = money(raw.was, "정가");
  const image = txt(raw.image, 200);
  if (image && (!/^assets\/images\/[A-Za-z0-9._\/-]+\.(jpe?g|png|webp)$/.test(image) || image.includes(".."))) bad("사진 경로가 잘못됐어요");
  p.image = image;
  if (Array.isArray(raw.tile) && raw.tile.length === 2 && raw.tile.every(c => /^#[0-9a-f]{3,8}$/i.test(c))) p.tile = raw.tile;
  p.flag = txt(raw.flag, 16);
  p.taxFree = !!raw.taxFree;
  p.origin = txt(raw.origin, 80); p.unit = txt(raw.unit, 80); p.pack = txt(raw.pack, 80);
  p.sold = Math.max(0, Math.floor(Number(raw.sold) || 0));
  if (raw.ticket) p.ticket = true;
  if (raw.soon) p.soon = true;
  p.detail = txt(raw.detail, 2000);
  p.story = (Array.isArray(raw.story) ? raw.story : []).slice(0, 12).map(s => {
    const o = { title: txt(s && s.title, 120), text: txt(s && s.text, 3000) };
    const list = (Array.isArray(s && s.list) ? s.list : []).map(x => txt(x, 200)).filter(Boolean).slice(0, 20);
    if (list.length) o.list = list;
    return o;
  }).filter(s => s.title || s.text);
  p.info = (Array.isArray(raw.info) ? raw.info : []).slice(0, 30).map(r => [txt(r && r[0], 40), txt(r && r[1], 300)]).filter(r => r[0] && r[1]);
  return p;
}

async function adminSaveProducts({ env, req, body }) {
  const user = await requireAdmin(env, req);
  if (!Array.isArray(body.items) || typeof body.sha !== "string") fail(400, "요청 형식이 잘못됐어요");
  if (body.items.length > 300) fail(400, "상품은 300개까지 저장할 수 있어요");
  const site = JSON.parse((await ghGet(env, "data/site.json")).text);
  const catIds = (site.categories || []).filter(c => c.id !== "all").map(c => c.id);
  const items = body.items.map((x, i) => cleanProduct(x, catIds, i + 1));
  const seen = new Set();
  for (const it of items) { if (seen.has(it.id)) fail(400, `상품 코드 ${it.id} 가 두 번 들어갔어요`); seen.add(it.id); }
  const text = "[\n" + items.map(it => "  " + JSON.stringify(it)).join(",\n\n") + "\n]\n";
  const who = String(user.email || "").replace(/@.*/, "");
  const sha = await ghPut(env, "data/products.json", new TextEncoder().encode(text), `관리자 상품 수정 (${who})${body.note ? " - " + txt(body.note, 60) : ""}`, body.sha);
  return { sha, count: items.length };
}

async function adminImage({ env, req, body }) {
  await requireAdmin(env, req);
  const id = txt(body.id, 24);
  if (!/^[a-z0-9_-]{1,24}$/i.test(id)) fail(400, "상품 코드가 잘못됐어요");
  const data = String(body.data || "");
  if (!data || data.length > 4000000 || !/^[A-Za-z0-9+/]+=*$/.test(data)) fail(400, "사진이 너무 크거나 형식이 잘못됐어요 (3MB 이하 JPG)");
  const bytes = b64dec(data);
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) fail(400, "JPG 사진만 올릴 수 있어요");
  const path = `assets/images/products/${id.toLowerCase()}-${Date.now().toString(36)}.jpg`;
  await ghPut(env, path, bytes, `관리자 상품 사진 (${id})`);
  return { path };
}

/* ---------------- 상품 후기 · 상품 문의 (관리자) ----------------
 * 고객은 Supabase 에 직접 쓰고(RLS 로 본인 것만), 관리자는 여기서 후기 숨김·문의 답변을 합니다.
 */
async function adminReviews({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "all";
  const filter = st === "hidden" ? "hidden=eq.true&" : st === "shown" ? "hidden=eq.false&" : st === "all" ? "" : fail(400, "잘못된 상태");
  return { reviews: await db.select(`reviews?${filter}select=*&order=created_at.desc&limit=300`) };
}

async function adminReviewUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  const [u] = await db.update(`reviews?id=eq.${Number(body.id) || 0}`, { hidden: !!body.hidden });
  if (!u) fail(404, "후기를 찾을 수 없어요");
  return { review: u };
}

async function adminQuestions({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "open";
  const filter = st === "open" ? "answer=is.null&" : st === "answered" ? "answer=not.is.null&" : st === "all" ? "" : fail(400, "잘못된 상태");
  return { questions: await db.select(`questions?${filter}select=*&order=created_at.desc&limit=300`) };
}

async function adminAnswer({ env, req, body, db }) {
  await requireAdmin(env, req);
  const answer = String(body.answer || "").trim().slice(0, 2000);
  const [u] = await db.update(`questions?id=eq.${Number(body.id) || 0}`, answer ? { answer, answered_at: now() } : { answer: null, answered_at: null });
  if (!u) fail(404, "문의를 찾을 수 없어요");
  return { question: u };
}

/* ---------------- 네이버페이 ---------------- */
function npay(env) {
  const need = ["NAVERPAY_PARTNER_ID", "NAVERPAY_CLIENT_ID", "NAVERPAY_CLIENT_SECRET"].filter(k => !env[k]);
  if (need.length) fail(500, `네이버페이 설정 누락: ${need.join(", ")}`);
  const base = `${env.NAVERPAY_MODE === "production" ? "https://pub.apis.naver.com" : "https://dev-pub.apis.naver.com"}/${env.NAVERPAY_PARTNER_ID}/naverpay/payments`;
  const call = (path, key, form) => {
    const h = {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Naver-Client-Id": env.NAVERPAY_CLIENT_ID,
      "X-Naver-Client-Secret": env.NAVERPAY_CLIENT_SECRET,
      "X-NaverPay-Idempotency-Key": key,
    };
    if (env.NAVERPAY_CHAIN_ID) h["X-NaverPay-Chain-Id"] = env.NAVERPAY_CHAIN_ID;
    return fetch(`${base}${path}`, { method: "POST", headers: h, body: new URLSearchParams(form) }).then(r => r.json()).catch(() => ({}));
  };
  return {
    apply: paymentId => call("/v2.2/apply/payment", `apply-${paymentId}`, { paymentId }),
    cancel: (paymentId, amount, taxEx, reason) => call("/v1/cancel", `cancel-${paymentId}`, {
      paymentId,
      cancelAmount: String(amount),
      taxScopeAmount: String(amount - taxEx),
      taxExScopeAmount: String(taxEx),
      cancelReason: reason,
      cancelRequester: "2",
    }),
  };
}

async function naverpayApprove({ env, body, db }) {
  const { orderNo, paymentId } = body;
  if (!paymentId) fail(400, "paymentId 가 필요합니다");
  const o = await getOrder(db, orderNo);
  if (o.status !== "pending") {
    if (o.payment_id === paymentId && PAID.includes(o.status)) return { order: publicOrder(o) };
    fail(409, "이미 처리된 주문입니다");
  }
  const np = npay(env);
  const data = await np.apply(paymentId);
  if (data.code !== "Success") fail(402, data.message || `승인 실패 (${data.code || "응답 없음"})`);

  const d = (data.body && data.body.detail) || {};
  const paid = Number(d.totalPayAmount);
  if (paid !== o.total || d.merchantPayKey !== o.order_no) {
    await np.cancel(paymentId, paid, Number(d.taxExScopeAmount) || 0, "결제 금액 불일치 자동 취소");
    await db.update(`orders?order_no=eq.${enc(o.order_no)}`, { status: "cancelled", payment_id: paymentId, cancelled_at: now() });
    fail(409, "결제 금액이 주문과 달라 자동 취소했습니다");
  }
  return { order: publicOrder(await markPaid(db, o, paymentId)) };
}

/* ---------------- 카카오페이 ---------------- */
function kpay(env) {
  if (!env.KAKAOPAY_SECRET_KEY || !env.KAKAOPAY_CID) fail(500, "카카오페이 설정 누락: KAKAOPAY_SECRET_KEY, KAKAOPAY_CID");
  return (path, payload) => fetch(`https://open-api.kakaopay.com/online/v1/payment/${path}`, {
    method: "POST",
    headers: { Authorization: `SECRET_KEY ${env.KAKAOPAY_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cid: env.KAKAOPAY_CID, ...payload }),
  }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
}

async function kakaopayReady({ env, body, db }) {
  const o = await getOrder(db, body.orderNo);
  if (o.status !== "pending" || o.method !== "kakaopay") fail(409, "결제할 수 없는 주문입니다");
  const back = `${env.SITE_URL}/order.html?order=${enc(o.order_no)}&kp=`;
  const r = await kpay(env)("ready", {
    partner_order_id: o.order_no,
    partner_user_id: o.user_id || "guest",
    item_name: o.product_name,
    quantity: o.items.reduce((s, i) => s + i.qty, 0),
    total_amount: o.total,
    tax_free_amount: o.tax_ex,
    approval_url: back + "approve",
    cancel_url: back + "cancel",
    fail_url: back + "fail",
  });
  if (!r.ok || !r.data.tid) fail(402, r.data.error_message || r.data.msg || "카카오페이 결제창을 열지 못했어요");
  await db.update(`orders?order_no=eq.${enc(o.order_no)}&status=eq.pending`, { payment_id: r.data.tid });
  return { redirectUrl: body.mobile ? r.data.next_redirect_mobile_url : r.data.next_redirect_pc_url };
}

async function kakaopayApprove({ env, body, db }) {
  const { orderNo, pgToken } = body;
  if (!pgToken) fail(400, "pg_token 이 필요합니다");
  const o = await getOrder(db, orderNo);
  if (o.status !== "pending") {
    if (PAID.includes(o.status)) return { order: publicOrder(o) };
    fail(409, "이미 처리된 주문입니다");
  }
  if (!o.payment_id) fail(409, "카카오페이 결제 준비 정보가 없어요");
  const call = kpay(env);
  const r = await call("approve", { tid: o.payment_id, partner_order_id: o.order_no, partner_user_id: o.user_id || "guest", pg_token: pgToken });
  if (!r.ok) fail(402, r.data.error_message || r.data.msg || "카카오페이 승인 실패");
  const paid = Number(r.data.amount && r.data.amount.total);
  if (paid !== o.total) {
    await call("cancel", { tid: o.payment_id, cancel_amount: paid, cancel_tax_free_amount: Number(r.data.amount.tax_free) || 0 });
    await db.update(`orders?order_no=eq.${enc(o.order_no)}`, { status: "cancelled", cancelled_at: now() });
    fail(409, "결제 금액이 주문과 달라 자동 취소했습니다");
  }
  return { order: publicOrder(await markPaid(db, o, o.payment_id)) };
}

/* ---------------- 테스트 결제 ---------------- */
async function testPay({ env, req, body, db }) {
  if (!(await canTestPay(env, req))) fail(403, "테스트 결제는 관리자 계정으로 로그인했을 때만 쓸 수 있어요");
  const o = await getOrder(db, body.orderNo);
  if (o.status !== "pending" || o.method !== "test") fail(409, "이미 처리된 주문입니다");
  // 체험·숙박: 결제 직전에 자리·날짜를 한 번 더 확인
  if (o.booking) await checkReservation(env, db, bookingBody(o));
  const u = await markPaid(db, o, `TEST-${Date.now()}`);
  const booking = o.booking ? await confirmPaidBooking(db, u) : null;
  return { order: publicOrder(u), booking };
}

/* 테스트 결제 허용: Cloudflare 변수 TEST_MODE=true 이거나, 관리자 계정으로 로그인한 경우 */
async function canTestPay(env, req) {
  if (env.TEST_MODE === "true") return true;
  const user = await getUser(env, req, false);
  return !!user && isAdminEmail(env, user.email);
}

/* ---------------- 체험·숙박 결제 ----------------
 * 예약 화면에서 일정·인원(숙박은 날짜)을 고르면 금액을 계산해 결제 주문을 만듭니다.
 * 체험: 1인 가격 × 인원 / 숙박: 1박 가격 × 박 수. 결제가 끝나면 예약(bookings)을 '예약확정'으로 만들어요.
 */
const bookingBody = o => ({ productId: o.booking.product_id, slotId: o.booking.slot_id, dateFrom: o.booking.date_from, dateTo: o.booking.date_to, people: o.booking.people });

async function reserveCheckout({ env, req, body, db }) {
  if (!(await canTestPay(env, req))) fail(403, "체험·숙박 결제는 아직 준비 중이에요. 예약 문의를 남겨 주세요");
  const name = String(body.name || "").trim().slice(0, 30), tel = String(body.tel || "").trim().slice(0, 13);
  if (!name) fail(400, "이름을 입력해 주세요");
  if (!/^0\d{8,10}$/.test(digits(tel))) fail(400, "휴대폰 번호를 확인해 주세요");
  const r = await checkReservation(env, db, body);
  if (!r.product.price) fail(400, "판매가가 없는 상품이에요. 관리자 > 상품 관리에서 판매가를 입력해 주세요");
  const qty = r.kind === "stay" ? Math.round((Date.parse(r.dateTo) - Date.parse(r.dateFrom)) / 864e5) : r.people;
  const { products, site } = await catalog(env);
  const a = calcAmount([{ id: r.product.id, qty }], products, site.shipping, 0);
  const when = r.kind === "stay" ? `${r.dateFrom}~${r.dateTo} ${qty}박 ${r.people}명` : `${r.dateFrom}${r.slot ? " " + r.slot.slot_time : ""} ${r.people}명`;
  const user = await getUser(env, req, false);
  const order = await db.insert("orders", {
    order_no: newOrderNo(),
    user_id: user ? user.id : null,
    status: "pending",
    method: "test",
    items: a.lines,
    product_name: `${r.product.name} (${when})`,
    goods: a.goods, discount: 0, ship_fee: 0, total: a.total, tax_ex: a.taxEx,
    ship: { name, tel, addr: r.kind === "stay" ? "숙박 예약 (배송 없음)" : "체험 예약 (배송 없음)", memo: String(body.message || "").trim().slice(0, 100) },
    phone_digits: digits(tel),
    booking: { product_id: r.product.id, kind: r.kind, slot_id: r.slot ? r.slot.id : null, slot_time: r.slot ? r.slot.slot_time : null, date_from: r.dateFrom, date_to: r.dateTo, people: r.people },
  });
  return { order: publicOrder(order) };
}

async function confirmPaidBooking(db, o) {
  const b = o.booking, s = o.ship || {};
  const row = await db.insert("bookings", {
    booking_no: newOrderNo().replace(/^FG/, "R"),
    user_id: o.user_id || null,
    kind: b.kind, product_id: b.product_id, product_name: (o.items[0] || {}).name || null,
    date_from: b.date_from, date_to: b.date_to, people: b.people,
    slot_id: b.slot_id, slot_time: b.slot_time,
    name: s.name, tel: s.tel, message: s.memo || null,
    status: "confirmed",
    admin_memo: `결제 완료 (주문 ${o.order_no}, ${o.method === "test" ? "테스트 결제" : o.method})`,
    order_no: o.order_no,
  });
  return { booking_no: row.booking_no };
}

/* ---------------- 구매자 취소 요청 ----------------
 * 결제완료(사장님이 '상품준비중'으로 넘기기 전)일 때만 요청할 수 있어요. 사장님이 관리자에서 승인(결제 취소·환불)하거나 거절합니다.
 */
const CANCEL_REASONS = ["단순 변심", "주문 실수 (상품·수량·옵션)", "배송·이용 일정이 맞지 않음", "다른 상품으로 다시 주문", "기타 (직접 입력)"];

async function cancelRequest({ env, req, body, db }) {
  const o = await getOrder(db, String(body.orderNo || "").trim().toUpperCase());
  const user = await getUser(env, req, false);
  const mine = (user && o.user_id && o.user_id === user.id) || (digits(body.phone).length >= 9 && digits(body.phone) === o.phone_digits);
  if (!mine) fail(403, "주문한 분만 취소 요청을 할 수 있어요. 주문번호와 휴대폰 번호를 확인해 주세요");
  if (o.status === "cancelled") fail(409, "이미 취소된 주문이에요");
  if (o.status !== "paid") fail(409, "상품 준비가 시작되어 직접 취소 요청을 할 수 없어요. 고객행복센터로 연락해 주세요");
  if (o.cancel_req && o.cancel_req.state === "requested") fail(409, "이미 취소 요청이 접수됐어요. 확인 후 처리해 드릴게요");
  if (o.cancel_req && o.cancel_req.state === "rejected") fail(409, "취소 요청이 거절된 주문이에요. 고객행복센터로 연락해 주세요");
  const reason = String(body.reason || "");
  if (!CANCEL_REASONS.includes(reason)) fail(400, "취소 사유를 골라 주세요");
  const detail = String(body.detail || "").trim().slice(0, 500);
  if (reason.startsWith("기타") && !detail) fail(400, "취소 사유를 적어 주세요");
  const [u] = await db.update(`orders?order_no=eq.${enc(o.order_no)}&status=eq.paid`, {
    cancel_req: { state: "requested", reason, detail: detail || null, at: now(), by: user && o.user_id === user.id ? "member" : "guest" },
  });
  if (!u) fail(409, "주문 상태가 바뀌었어요. 새로고침해 주세요");
  // TODO: 취소 요청 알림 (예: 텔레그램 봇, 카카오 알림톡) 을 여기에 붙이세요
  console.log("CANCEL_REQUEST", o.order_no, reason);
  return { order: publicOrder(u) };
}

async function adminCancelReject({ env, req, body, db }) {
  await requireAdmin(env, req);
  const o = await getOrder(db, body.orderNo);
  if (!o.cancel_req || o.cancel_req.state !== "requested") fail(409, "처리할 취소 요청이 없어요");
  const answer = String(body.answer || "").trim().slice(0, 300);
  if (!answer) fail(400, "거절 사유를 적어 주세요 (구매자에게 보여요)");
  const [u] = await db.update(`orders?order_no=eq.${enc(o.order_no)}`, { cancel_req: { ...o.cancel_req, state: "rejected", answer, answered_at: now() } });
  return { order: u };
}

/* ---------------- 비회원 주문조회 ---------------- */
async function lookup({ body, db }) {
  const orderNo = String(body.orderNo || "").trim().toUpperCase(), phone = digits(body.phone);
  if (!orderNo || phone.length < 9) fail(400, "주문번호와 휴대폰 번호를 확인해 주세요");
  const [o] = await db.select(`orders?order_no=eq.${enc(orderNo)}&phone_digits=eq.${phone}&status=neq.pending&select=*`);
  if (!o) fail(404, "주문을 찾을 수 없어요. 주문번호와 휴대폰 번호를 확인해 주세요");
  return { order: { ...publicOrder(o), ship: { name: o.ship.name, addr: o.ship.addr } } };
}

/* ---------------- 네이버 로그인 ---------------- */
async function naverLogin({ env, body }) {
  if (!env.NAVER_LOGIN_CLIENT_ID || !env.NAVER_LOGIN_CLIENT_SECRET) fail(500, "네이버 로그인 설정 누락");
  const { code, state } = body;
  if (!code || !state) fail(400, "잘못된 요청");

  const tok = await fetch("https://nid.naver.com/oauth2.0/token?" + new URLSearchParams({
    grant_type: "authorization_code", client_id: env.NAVER_LOGIN_CLIENT_ID, client_secret: env.NAVER_LOGIN_CLIENT_SECRET, code, state,
  })).then(r => r.json()).catch(() => ({}));
  if (!tok.access_token) fail(401, tok.error_description || "네이버 인증에 실패했어요");

  const me = await fetch("https://openapi.naver.com/v1/nid/me", { headers: { Authorization: `Bearer ${tok.access_token}` } })
    .then(r => r.json()).catch(() => ({}));
  const p = me.response || {};
  if (!p.id) fail(401, "네이버 회원 정보를 받지 못했어요");
  if (!p.email) fail(400, "네이버 로그인 화면에서 이메일 제공에 동의해 주세요");
  return { tokenHash: await issueLogin(env, p.email, { name: p.name || p.nickname || "", provider: "naver", naver_id: p.id }) };
}

/* ---------------- 카카오 로그인 ----------------
 * Supabase 기본 카카오 연동은 이메일(account_email)을 항상 요청해서, 비즈 앱 전환 전에는 로그인이 막힙니다.
 * 그래서 닉네임만 받아 직접 처리하고, 회원은 카카오 회원번호로 만든 내부용 주소(kakao_번호@kakao.invalid)로 구분합니다.
 * (이 주소로는 메일이 가지 않습니다)
 */
async function kakaoLogin({ env, body }) {
  const { code, redirectUri } = body;
  if (!code || !redirectUri || !String(redirectUri).startsWith(`${env.SITE_URL}/`)) fail(400, "잘못된 요청");
  const { site } = await catalog(env);
  const clientId = site.login && site.login.kakaoRestKey;
  if (!clientId) fail(500, "카카오 로그인 설정 누락: site.json 의 login.kakaoRestKey");

  const form = { grant_type: "authorization_code", client_id: clientId, redirect_uri: redirectUri, code };
  if (env.KAKAO_LOGIN_CLIENT_SECRET) form.client_secret = env.KAKAO_LOGIN_CLIENT_SECRET;
  const tok = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(form),
  }).then(r => r.json()).catch(() => ({}));
  if (!tok.access_token) {
    console.error("KAKAO_TOKEN", JSON.stringify(tok));
    fail(401, tok.error_code === "KOE010" ? "카카오 Client Secret 설정을 확인해 주세요 (워커의 KAKAO_LOGIN_CLIENT_SECRET)" : (tok.error_description || "카카오 인증에 실패했어요"));
  }
  const me = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tok.access_token}` } })
    .then(r => r.json()).catch(() => ({}));
  if (!me.id) fail(401, "카카오 회원 정보를 받지 못했어요");
  const name = (me.kakao_account && me.kakao_account.profile && me.kakao_account.profile.nickname) || (me.properties && me.properties.nickname) || "";
  return { tokenHash: await issueLogin(env, `kakao_${me.id}@kakao.invalid`, { name, provider: "kakao", kakao_id: String(me.id) }) };
}

/* Supabase 회원 만들기 (이미 있으면 그대로) → 1회용 로그인 토큰 발급 */
async function issueLogin(env, email, meta) {
  const auth = (path, payload) => fetch(`${env.SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: "POST", headers: sbHeaders(env), body: JSON.stringify(payload),
  });
  const created = await auth("users", { email, email_confirm: true, user_metadata: meta });
  if (!created.ok && created.status !== 422 && created.status !== 400) {
    console.error("LOGIN_CREATE", created.status, await created.text());
    fail(500, "회원 정보를 만들지 못했어요");
  }
  const link = await auth("generate_link", { type: "magiclink", email });
  const l = await link.json().catch(() => ({}));
  const tokenHash = l.hashed_token || (l.properties && l.properties.hashed_token);
  if (!link.ok || !tokenHash) { console.error("LOGIN_LINK", link.status, JSON.stringify(l)); fail(500, "로그인 토큰을 만들지 못했어요"); }
  return tokenHash;
}

/* ---------------- 회원 탈퇴 ---------------- */
async function withdraw({ env, req }) {
  const user = await getUser(env, req);
  // profiles 는 함께 삭제, 주문 기록은 user_id 만 비우고 법정 보관 (schema.sql 참고)
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: sbHeaders(env) });
  if (!r.ok) { console.error("WITHDRAW", r.status, await r.text()); fail(500, "탈퇴 처리에 실패했어요"); }
  return {};
}

/* ---------------- 관리자 ----------------
 * 관리자 지정: Cloudflare 워커 변수 ADMIN_EMAILS 에 마이페이지의 '회원번호'(로그인 이메일)를 쉼표로 이어서 넣습니다.
 */
const isAdminEmail = (env, email) =>
  !!email && String(env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

async function requireAdmin(env, req) {
  const user = await getUser(env, req);
  if (!isAdminEmail(env, user.email)) fail(403, "관리자 권한이 없어요");
  return user;
}

/* 마이페이지: 관리자면 '관리자 페이지' 버튼과 새로 들어온 건수를 보여 줌 */
async function meInfo({ env, req, db }) {
  const user = await getUser(env, req);
  if (!isAdminEmail(env, user.email)) return { isAdmin: false };
  const n = path => db.select(path + "&limit=100").then(r => r.length).catch(() => 0);
  const [bookings, inquiries, questions, cancels] = await Promise.all([
    n("bookings?status=eq.new&select=booking_no"),
    n("inquiries?status=eq.new&select=inquiry_no"),
    n("questions?answer=is.null&select=id"),
    n("orders?status=eq.paid&cancel_req->>state=eq.requested&select=order_no"),
  ]);
  return { isAdmin: true, counts: { bookings, inquiries, questions, cancels } };
}

async function adminOrders({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "paid";
  const filter = st === "all" ? "status=neq.pending"
    : st === "cancelreq" ? "status=eq.paid&cancel_req->>state=eq.requested"
    : [...PAID, "cancelled"].includes(st) ? `status=eq.${st}` : fail(400, "잘못된 상태");
  const orders = await db.select(`orders?${filter}&select=*&order=created_at.desc&limit=300`);
  return { orders };
}

async function adminUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  const o = await getOrder(db, body.orderNo);
  if (!PAID.includes(o.status)) fail(409, "결제 완료된 주문만 수정할 수 있어요");
  if (!ADMIN_STATUS.includes(body.status)) fail(400, "잘못된 상태");
  if (o.cancel_req && o.cancel_req.state === "requested" && body.status !== o.status) fail(409, "구매자의 취소 요청이 있어요. 먼저 '취소 승인' 또는 '거절'을 해 주세요");
  const [u] = await db.update(`orders?order_no=eq.${enc(o.order_no)}`, {
    status: body.status,
    courier: String(body.courier || "").slice(0, 30) || null,
    tracking_no: String(body.trackingNo || "").slice(0, 40) || null,
  });
  return { order: u };
}

async function adminCancel({ env, req, body, db }) {
  await requireAdmin(env, req);
  const o = await getOrder(db, body.orderNo);
  if (!PAID.includes(o.status)) fail(409, "취소할 수 없는 주문이에요");
  if (o.method === "naverpay") {
    const r = await npay(env).cancel(o.payment_id, o.total, o.tax_ex, "판매자 취소");
    if (r.code !== "Success") fail(402, r.message || `네이버페이 취소 실패 (${r.code || "응답 없음"})`);
  } else if (o.method === "kakaopay") {
    const r = await kpay(env)("cancel", { tid: o.payment_id, cancel_amount: o.total, cancel_tax_free_amount: o.tax_ex });
    if (!r.ok) fail(402, r.data.error_message || r.data.msg || "카카오페이 취소 실패");
  }
  const [u] = await db.update(`orders?order_no=eq.${enc(o.order_no)}`, { status: "cancelled", cancelled_at: now() });
  if (o.booking) await db.update(`bookings?order_no=eq.${enc(o.order_no)}`, { status: "cancelled", admin_memo: `결제 취소 (주문 ${o.order_no})` });
  if (o.cancel_req && o.cancel_req.state === "requested") {
    const [v] = await db.update(`orders?order_no=eq.${enc(o.order_no)}`, { cancel_req: { ...o.cancel_req, state: "approved", answered_at: now() } });
    return { order: v };
  }
  return { order: u };
}

/* ---------------- 공통 ---------------- */
function sbHeaders(env) {
  const h = { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" };
  // 예전 형식(JWT) 키만 Authorization 에 넣음. 새 형식(sb_secret_…) 키는 apikey 헤더만 사용
  if (env.SUPABASE_SERVICE_KEY.startsWith("eyJ")) h.Authorization = `Bearer ${env.SUPABASE_SERVICE_KEY}`;
  return h;
}

function makeDb(env) {
  const call = async (method, path, payload, extra = {}) => {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      method, headers: { ...sbHeaders(env), ...extra }, body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!r.ok) { console.error("DB", method, path, r.status, await r.text()); fail(500, "주문 저장소 오류가 발생했어요"); }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  };
  return {
    select: path => call("GET", path),
    insert: (table, row) => call("POST", table, row, { Prefer: "return=representation" }).then(r => r[0]),
    // 이미 있는 줄(onConflict 기준)은 건너뛰고 새로 들어간 줄만 돌려줌
    insertMany: (table, rows, onConflict) => call("POST", `${table}?on_conflict=${onConflict}`, rows, { Prefer: "resolution=ignore-duplicates,return=representation" }).then(r => r || []),
    update: (path, patch) => call("PATCH", path, patch, { Prefer: "return=representation" }),
    remove: path => call("DELETE", path),
  };
}

async function getUser(env, req, required = true) {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return required ? fail(401, "로그인이 필요해요") : null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${t}` } });
  if (!r.ok) return required ? fail(401, "로그인이 만료되었어요. 다시 로그인해 주세요") : null;
  return r.json();
}

async function getOrder(db, orderNo) {
  if (!orderNo) fail(400, "주문번호가 필요합니다");
  const [o] = await db.select(`orders?order_no=eq.${enc(orderNo)}&select=*`);
  if (!o) fail(404, "주문을 찾을 수 없어요");
  return o;
}

async function markPaid(db, o, paymentId) {
  const [u] = await db.update(`orders?order_no=eq.${enc(o.order_no)}&status=eq.pending`, { status: "paid", payment_id: paymentId, paid_at: now() });
  if (!u) fail(409, "이미 처리된 주문입니다");
  // TODO: 새 주문 알림 (예: 텔레그램 봇, 카카오 알림톡) 을 여기에 붙이세요
  console.log("ORDER_PAID", o.order_no, o.method, o.total);
  return u;
}

function publicOrder(o) {
  const keys = ["order_no", "created_at", "status", "method", "product_name", "items", "goods", "discount", "ship_fee", "total", "tax_ex", "payment_id", "paid_at", "courier", "tracking_no", "cancel_req", "booking"];
  return Object.fromEntries(keys.map(k => [k, o[k] ?? null]));
}

async function catalog(env) {
  try {
    const [products, site] = await Promise.all([
      fetch(`${env.SITE_URL}/data/products.json`, { cf: { cacheTtl: 60 } }).then(r => r.json()),
      fetch(`${env.SITE_URL}/data/site.json`, { cf: { cacheTtl: 60 } }).then(r => r.json()),
    ]);
    return { products, site };
  } catch {
    fail(502, "가격표를 읽지 못했어요");
  }
}

/* 금액 계산 — assets/js/main.js 의 totals 와 같은 규칙 */
function calcAmount(items, products, shipping, rate = 0) {
  if (!Array.isArray(items) || !items.length || items.length > 50) fail(400, "주문 상품이 없어요");
  let goods = 0, taxExGoods = 0, needShip = false;
  const lines = [];
  for (const { id, qty } of items) {
    const p = products.find(x => x.id === id);
    const n = Number(qty);
    if (!p || !Number.isInteger(n) || n < 1 || n > 99) fail(400, `잘못된 상품 정보: ${id}`);
    if (p.soon) fail(400, `${p.name}은(는) 오픈 예정 상품이에요`);
    goods += p.price * n;
    if (p.taxFree) taxExGoods += p.price * n;
    if (!p.ticket) needShip = true;
    lines.push({ id: p.id, name: p.name, price: p.price, qty: n });
  }
  const ship = !needShip || goods >= shipping.freeOver ? 0 : shipping.fee;
  const discount = rate ? Math.floor(goods * rate / 1000) * 10 : 0;
  const taxEx = taxExGoods - (goods ? Math.round(discount * taxExGoods / goods) : 0);
  const total = goods - discount + ship;
  return { lines, goods, discount, ship, total, taxEx, taxScope: total - taxEx };
}

function cleanShip(s) {
  s = s || {};
  const name = String(s.name || "").trim().slice(0, 30);
  const tel = String(s.tel || "").trim().slice(0, 13);
  const addr = String(s.addr || "").trim().slice(0, 200);
  const memo = String(s.memo || "").trim().slice(0, 100);
  if (!name || !addr) fail(400, "배송 정보를 모두 입력해 주세요");
  if (!/^0\d{8,10}$/.test(digits(tel))) fail(400, "휴대폰 번호를 확인해 주세요");
  return { name, tel, addr, memo };
}

function newOrderNo() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => A[b % A.length]).join("");
  const ymd = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10).replace(/-/g, "");
  return `FG${ymd}-${rnd}`;
}

const digits = s => String(s || "").replace(/\D/g, "");
const enc = encodeURIComponent;
const now = () => new Date().toISOString();
