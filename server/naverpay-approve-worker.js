/**
 * 프롬강화 — 네이버페이 결제 승인 서버 (Cloudflare Workers, 무료 플랜으로 충분)
 *
 * GitHub Pages 는 서버가 없어서 '결제 승인'을 직접 할 수 없습니다.
 * 이 파일 하나를 Cloudflare Workers 에 올리면 승인 서버가 됩니다. (README 4장 참고)
 *
 * 하는 일
 *  1) 사이트(order.html)가 { paymentId, merchantPayKey, items } 를 보냄
 *  2) 사이트의 data/products.json · data/site.json 을 직접 읽어 금액을 다시 계산
 *     (고객이 브라우저에서 가격을 조작해도 막힘)
 *  3) 네이버페이 결제 승인 API 호출 → 승인 금액이 다르면 즉시 취소
 *
 * Workers > Settings > Variables and Secrets 에 넣을 값
 *  SITE_URL               https://www.도메인.co.kr  (끝에 / 없이)
 *  NAVERPAY_MODE          development | production
 *  NAVERPAY_PARTNER_ID    파트너 ID
 *  NAVERPAY_CLIENT_ID     클라이언트 ID
 *  NAVERPAY_CLIENT_SECRET 클라이언트 시크릿  ← 반드시 'Secret' 타입으로
 *  NAVERPAY_CHAIN_ID      체인 ID (그룹형 가맹점일 때만)
 *
 * API 경로·파라미터는 네이버페이 개발자센터 최신 문서로 한 번 더 확인하세요.
 */

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.SITE_URL || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (status, body) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json(405, { ok: false, message: "POST only" });

    const missing = ["SITE_URL", "NAVERPAY_PARTNER_ID", "NAVERPAY_CLIENT_ID", "NAVERPAY_CLIENT_SECRET"].filter(k => !env[k]);
    if (missing.length) return json(500, { ok: false, message: `서버 설정 누락: ${missing.join(", ")}` });

    let body;
    try { body = await req.json(); } catch { return json(400, { ok: false, message: "잘못된 요청" }); }
    const { paymentId, merchantPayKey, items } = body || {};
    if (!paymentId || !merchantPayKey || !Array.isArray(items) || !items.length) {
      return json(400, { ok: false, message: "paymentId, merchantPayKey, items 가 필요합니다" });
    }

    // 1) 사이트의 공식 가격표로 금액 다시 계산
    let expected;
    try {
      const [products, site] = await Promise.all([
        fetch(`${env.SITE_URL}/data/products.json`, { cf: { cacheTtl: 60 } }).then(r => r.json()),
        fetch(`${env.SITE_URL}/data/site.json`, { cf: { cacheTtl: 60 } }).then(r => r.json()),
      ]);
      expected = calcAmount(items, products, site.shipping);
    } catch (e) {
      return json(400, { ok: false, message: e.message || "가격표를 읽지 못했습니다" });
    }

    // 2) 결제 승인
    const base = `${env.NAVERPAY_MODE === "production" ? "https://pub.apis.naver.com" : "https://dev-pub.apis.naver.com"}/${env.NAVERPAY_PARTNER_ID}/naverpay/payments`;
    const headers = key => {
      const h = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": env.NAVERPAY_CLIENT_ID,
        "X-Naver-Client-Secret": env.NAVERPAY_CLIENT_SECRET,
        "X-NaverPay-Idempotency-Key": key,
      };
      if (env.NAVERPAY_CHAIN_ID) h["X-NaverPay-Chain-Id"] = env.NAVERPAY_CHAIN_ID;
      return h;
    };

    const res = await fetch(`${base}/v2.2/apply/payment`, {
      method: "POST",
      headers: headers(`apply-${paymentId}`),
      body: new URLSearchParams({ paymentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.code !== "Success") {
      return json(402, { ok: false, message: data.message || `승인 실패 (${data.code || res.status})` });
    }

    // 3) 금액 검증 — 다르면 즉시 전액 취소
    const d = data.body?.detail || {};
    const paid = Number(d.totalPayAmount);
    if (paid !== expected.total || d.merchantPayKey !== merchantPayKey) {
      await fetch(`${base}/v1/cancel`, {
        method: "POST",
        headers: headers(`cancel-${paymentId}`),
        body: new URLSearchParams({
          paymentId,
          cancelAmount: String(paid),
          taxScopeAmount: String(Number(d.taxScopeAmount) || paid),
          taxExScopeAmount: String(Number(d.taxExScopeAmount) || 0),
          cancelReason: "결제 금액 불일치 자동 취소",
          cancelRequester: "2",
        }),
      }).catch(() => {});
      return json(409, { ok: false, message: "결제 금액이 주문과 달라 자동 취소했습니다" });
    }

    // TODO: 주문 저장·알림 (예: 구글 Apps Script 웹훅, 텔레그램/카카오 알림)
    console.log("NPAY_APPROVED", JSON.stringify({ merchantPayKey, paymentId, paid, means: d.primaryPayMeans }));

    return json(200, { ok: true, paymentId, merchantPayKey, totalPayAmount: paid, admissionYmdt: d.admissionYmdt });
  },
};

function calcAmount(items, products, shipping) {
  let goods = 0, taxEx = 0, needShip = false;
  for (const { id, qty } of items) {
    const p = products.find(x => x.id === id);
    const n = Number(qty);
    if (!p || !Number.isInteger(n) || n < 1 || n > 99) throw new Error(`잘못된 상품 정보: ${id}`);
    goods += p.price * n;
    if (p.taxFree) taxEx += p.price * n;
    if (!p.ticket) needShip = true;
  }
  const ship = !needShip || goods >= shipping.freeOver ? 0 : shipping.fee;
  const total = goods + ship;
  return { total, taxEx, taxScope: total - taxEx };
}
