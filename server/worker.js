/**
 * 프롬강화 — 서버 (Cloudflare Workers, 무료 플랜으로 충분)
 *
 * GitHub Pages 는 서버가 없어서 결제 승인·주문 저장·네이버 로그인을 직접 할 수 없습니다.
 * 이 파일 하나를 Cloudflare Workers 에 올리면 그 역할을 합니다. (README 4장 참고)
 *
 * 경로
 *  POST /inquiry             구매 문의 저장 (결제 보류 중일 때 사용)
 *  POST /checkout            주문서 저장 (금액은 서버가 products.json 으로 다시 계산)
 *  POST /naverpay/approve    네이버페이 결제 승인
 *  POST /kakaopay/ready      카카오페이 결제창 준비
 *  POST /kakaopay/approve    카카오페이 결제 승인
 *  POST /test/pay            테스트 결제 (TEST_MODE=true 일 때만)
 *  POST /orders/lookup       비회원 주문조회 (주문번호 + 휴대폰)
 *  POST /auth/naver          네이버 로그인 → Supabase 로그인 토큰 발급
 *  POST /auth/kakao          카카오 로그인 → Supabase 로그인 토큰 발급
 *  POST /me/withdraw         회원 탈퇴
 *  GET  /admin/inquiries     관리자: 구매 문의 목록
 *  POST /admin/inquiry       관리자: 문의 상태·메모 저장
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
 *  TEST_MODE                   true 면 가맹점 키 없이 '테스트 결제' 주문 허용 (실오픈 때 지우기)
 *  NAVERPAY_MODE               development | production
 *  NAVERPAY_PARTNER_ID / NAVERPAY_CLIENT_ID / NAVERPAY_CHAIN_ID(그룹형만)
 *  NAVERPAY_CLIENT_SECRET   🔒
 *  KAKAOPAY_CID                테스트: TC0ONETIME / 실결제: 계약 후 받은 CID
 *  KAKAOPAY_SECRET_KEY      🔒 카카오페이 개발자센터의 Secret key (DEV… 또는 PRD…)
 *  NAVER_LOGIN_CLIENT_ID       네이버 로그인 애플리케이션 Client ID
 *  NAVER_LOGIN_CLIENT_SECRET 🔒
 *  KAKAO_LOGIN_CLIENT_SECRET 🔒 카카오 로그인 Client Secret (카카오 콘솔에서 켠 경우만)
 *
 * 외부 API 경로·파라미터는 각 개발자센터 최신 문서로 한 번 더 확인하세요.
 */

const PAID = ["paid", "preparing", "shipped", "delivered"];
const ADMIN_STATUS = PAID;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

export default {
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
  "POST /orders/lookup": lookup,
  "POST /auth/naver": naverLogin,
  "POST /auth/kakao": kakaoLogin,
  "POST /me/withdraw": withdraw,
  "POST /inquiry": inquiry,
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
  if (method === "test" && env.TEST_MODE !== "true") fail(403, "테스트 결제가 꺼져 있어요. 결제 수단 설정을 확인해 주세요");
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
async function testPay({ env, body, db }) {
  if (env.TEST_MODE !== "true") fail(403, "테스트 결제가 꺼져 있어요");
  const o = await getOrder(db, body.orderNo);
  if (o.status !== "pending" || o.method !== "test") fail(409, "이미 처리된 주문입니다");
  return { order: publicOrder(await markPaid(db, o, `TEST-${Date.now()}`)) };
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

/* ---------------- 관리자 ---------------- */
async function requireAdmin(env, req) {
  const user = await getUser(env, req);
  const list = String(env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!user.email || !list.includes(user.email.toLowerCase())) fail(403, "관리자 권한이 없어요");
  return user;
}

async function adminOrders({ env, req, url, db }) {
  await requireAdmin(env, req);
  const st = url.searchParams.get("status") || "paid";
  const filter = st === "all" ? "status=neq.pending" : [...PAID, "cancelled"].includes(st) ? `status=eq.${st}` : fail(400, "잘못된 상태");
  const orders = await db.select(`orders?${filter}&select=*&order=created_at.desc&limit=300`);
  return { orders };
}

async function adminUpdate({ env, req, body, db }) {
  await requireAdmin(env, req);
  const o = await getOrder(db, body.orderNo);
  if (!PAID.includes(o.status)) fail(409, "결제 완료된 주문만 수정할 수 있어요");
  if (!ADMIN_STATUS.includes(body.status)) fail(400, "잘못된 상태");
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
  const keys = ["order_no", "created_at", "status", "method", "product_name", "items", "goods", "discount", "ship_fee", "total", "tax_ex", "payment_id", "paid_at", "courier", "tracking_no"];
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
