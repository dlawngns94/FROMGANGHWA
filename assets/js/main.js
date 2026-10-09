/* =========================================================
   프롬강화 — 화면 구성 로직 (보통 수정할 필요 없음)
   내용·가격은 data/*.json 에서 바꾸세요.
   ========================================================= */
(function () {
  "use strict";

  const PAGE = document.body.dataset.page || "home";
  const $ = (sel, el = document) => el.querySelector(sel);
  const won = n => Number(n).toLocaleString("ko-KR");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);
  const BASE = location.origin + location.pathname.replace(/[^/]*$/, "");
  const isMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const safeNext = s => /^[a-z-]+\.html(\?[\w=&%.-]*)?$/.test(s || "") ? s : "index.html";
  const msgPage = (html, btn = `<a class="btn ghost" style="display:inline-flex" href="index.html">메인으로</a>`) => `<p class="empty">${html}<br><br>${btn}</p>`;

  let SITE, HOME, PRODUCTS;
  const byId = id => PRODUCTS.find(p => p.id === id);
  const rate = p => p.was ? Math.round((1 - p.price / p.was) * 100) : 0;

  /* ---------- 저장소 (브라우저) ---------- */
  const store = {
    get(k, d, s = localStorage) { try { const v = s.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k, s = localStorage) { try { s.removeItem(k); } catch (e) {} }
  };
  let cart = store.get("fg_cart", []);
  if (!Array.isArray(cart)) cart = [];
  const saveCart = () => { cart = cart.filter(l => byId(l.id)); store.set("fg_cart", cart); renderBadge(); pushCart(); };
  const cartCount = () => cart.reduce((s, l) => s + l.qty, 0);

  /* 금액 계산 — server/worker.js 의 calcAmount 와 같은 규칙 */
  function totals(lines, discountRate = 0) {
    const goods = lines.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
    const shipNeeded = lines.some(l => !byId(l.id).ticket);
    const ship = !shipNeeded || goods === 0 || goods >= SITE.shipping.freeOver ? 0 : SITE.shipping.fee;
    const discount = discountRate ? Math.floor(goods * discountRate / 1000) * 10 : 0;
    const taxExGoods = lines.reduce((s, l) => s + (byId(l.id).taxFree ? byId(l.id).price * l.qty : 0), 0);
    const taxEx = taxExGoods - (goods ? Math.round(discount * taxExGoods / goods) : 0);
    const total = goods - discount + ship;
    return { goods, ship, discount, discountRate, total, taxEx, taxScope: total - taxEx };
  }

  /* ---------- 회원 (Supabase) · 서버 (Cloudflare) ---------- */
  let SB = null, USER = null, PROFILE = null;
  const API = () => String(SITE.api || "").replace(/\/+$/, "");
  const PAID = ["paid", "preparing", "shipped", "delivered"];
  const STATUS = { pending: "결제대기", paid: "결제완료", preparing: "상품준비중", shipped: "배송중", delivered: "배송완료", cancelled: "주문취소" };
  const isMember = () => !!(USER && PROFILE);

  function loadScript(src) {
    return new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => no(new Error(`${src} 을 불러오지 못했어요`));
      document.head.appendChild(s);
    });
  }
  async function initAuth() {
    const cfg = SITE.supabase || {};
    if (!cfg.url || !cfg.anonKey) return;
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js");
      // 네이버 로그인 콜백의 ?code= 는 Supabase 것이 아니므로 자동 처리하지 않음
      SB = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { flowType: "pkce", detectSessionInUrl: PAGE !== "naver" && PAGE !== "kakao" } });
      const { data } = await SB.auth.getSession();
      USER = data.session ? data.session.user : null;
      if (USER) {
        const { data: prof } = await SB.from("profiles").select("*").eq("id", USER.id).maybeSingle();
        PROFILE = prof || null;
      }
    } catch (err) {
      console.warn("회원 기능을 불러오지 못했어요", err);
      SB = null; USER = null; PROFILE = null;
    }
  }
  async function api(path, body, method = "POST") {
    if (!API()) throw new Error("서버 주소(site.json 의 api)가 설정되지 않았어요");
    const headers = { "Content-Type": "application/json" };
    if (SB) { const { data } = await SB.auth.getSession(); if (data.session) headers.Authorization = "Bearer " + data.session.access_token; }
    const res = await fetch(API() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.ok === false) throw new Error(d.message || `요청에 실패했어요 (${res.status})`);
    return d;
  }
  // 로그아웃·탈퇴 시: 같은 기기를 쓰는 다음 사람에게 장바구니·배송지가 남지 않도록 비움
  /* 회원 장바구니 — Supabase carts 표에 저장해서 로그아웃 후 다시 로그인하거나 다른 기기에서도 그대로 보이게 함.
     fg_cart_owner: 브라우저 장바구니가 누구 것인지 (회원 id / 비어 있으면 비회원) */
  let cartTimer = null;
  function pushCart() {
    if (!isMember()) return;
    clearTimeout(cartTimer);
    cartTimer = setTimeout(flushCart, 300);
  }
  async function flushCart() {
    if (cartTimer === null || !isMember()) return;
    clearTimeout(cartTimer); cartTimer = null;
    const items = cart.map(l => ({ id: l.id, qty: l.qty }));
    const { error } = await SB.from("carts").upsert({ user_id: USER.id, items, updated_at: new Date().toISOString() });
    if (error) console.warn("장바구니를 저장하지 못했어요", error.message);
  }
  addEventListener("pagehide", () => { flushCart(); });
  async function syncCart() {
    const owner = store.get("fg_cart_owner", "");
    if (!isMember()) {
      // 로그인이 만료된 회원의 장바구니가 남아 있으면 비움
      if (owner) { cart = []; store.set("fg_cart", cart); store.del("fg_cart_owner"); }
      return;
    }
    const { data, error } = await SB.from("carts").select("items").eq("user_id", USER.id).maybeSingle();
    if (error) { console.warn("장바구니를 불러오지 못했어요", error.message); return; }
    const saved = (data && Array.isArray(data.items) ? data.items : []).filter(l => byId(l.id));
    if (owner === USER.id || !cart.length) { cart = saved; store.set("fg_cart", cart); store.set("fg_cart_owner", USER.id); return; }
    // 로그인 직후: 비회원일 때 담은 상품을 회원 장바구니에 합침
    const merged = saved.map(l => ({ ...l }));
    for (const l of cart) {
      const m = merged.find(x => x.id === l.id);
      if (m) m.qty = Math.min(99, m.qty + l.qty); else merged.push({ id: l.id, qty: l.qty });
    }
    cart = merged;
    store.set("fg_cart_owner", USER.id);
    saveCart();
  }

  async function signOutClean() {
    await flushCart();
    if (SB) await SB.auth.signOut();
    ["fg_cart", "fg_cart_owner", "fg_ship"].forEach(k => store.del(k));
    ["fg_buynow", "fg_pending", "fg_next"].forEach(k => store.del(k, sessionStorage));
  }
  async function logout() {
    await signOutClean();
    location.href = "index.html";
  }

  /* ---------- 결제 수단 ---------- */
  const NP = () => SITE.naverpay || {};
  const KP = () => SITE.kakaopay || {};
  const PAYS = {
    naverpay: { name: "네이버페이", cls: "npay", mark: `<span class="n">N</span>`,
      live: () => !!(window.Naver && window.Naver.Pay && NP().clientId && API()), test: () => NP().mode !== "production" },
    kakaopay: { name: "카카오페이", cls: "kpay", mark: `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1 1 .1 1.4.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z"/></svg>`,
      live: () => !!(KP().enabled && API()), test: () => KP().mode !== "production" }
  };
  const payName = m => PAYS[m] ? PAYS[m].name : m === "test" ? "테스트 결제" : m;
  const payPill = m => PAYS[m].live() ? (PAYS[m].test() ? "테스트 결제" : "") : "시뮬레이터";
  // 결제는 보류 중: site.json 의 checkout.mode 가 "inquiry" 면 결제 대신 구매 문의를 받음 ("payment" 로 바꾸면 결제 화면이 다시 켜짐)
  const INQUIRY = () => !SITE.checkout || SITE.checkout.mode !== "payment";
  const priceText = (p, qty = 1) => p.price ? `${won(p.price * qty)}원` : "가격 문의";

  /* ---------- 공통: 헤더 · 푸터 ---------- */
  function shell() {
    const activeCat = PAGE === "shop" ? (params.get("cat") || (params.get("q") ? "" : "all")) : "";
    const me = isMember();
    document.body.insertAdjacentHTML("afterbegin", `
      ${SITE.topbar ? `<div class="topbar">${esc(SITE.topbar)}</div>` : ""}
      <header class="site"><div class="wrap">
        <div class="h-row">
          <a class="logo" href="index.html" aria-label="${esc(SITE.name)} 홈"><img src="assets/images/logo.png" alt="${esc(SITE.name)}"><span class="tag">${esc(SITE.nameEn)}</span></a>
          <form class="search" action="shop.html" role="search">
            <input id="q" name="q" type="search" placeholder="고구마, 섬쌀, 사자발쑥을 검색해 보세요" aria-label="상품 검색" value="${esc(params.get("q") || "")}">
            <button aria-label="검색"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
          </form>
          <div class="h-icons">
            ${me
              ? `<a class="link" href="mypage.html">${esc(PROFILE.name || "회원")}님</a><button class="link" data-logout>로그아웃</button>`
              : `<a class="link" href="login.html">회원가입</a><a class="link" href="login.html">로그인</a>`}
            <a class="user-btn" href="${me ? "mypage.html" : "login.html"}" aria-label="${me ? "마이페이지" : "로그인"}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>
            </a>
            <a class="cart-btn" href="cart.html" aria-label="장바구니">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>
              <span class="badge num" id="cartCount" hidden>0</span>
            </a>
          </div>
        </div>
        <nav class="cats" aria-label="카테고리">${SITE.categories.map(c =>
          c.disabled
            ? `<span class="off" aria-disabled="true" title="준비 중이에요">${esc(c.name)}<small>준비중</small></span>`
            : `<a href="shop.html?cat=${c.id}" aria-current="${activeCat === c.id}">${esc(c.name)}</a>`).join("")}</nav>
      </div></header>`);
    const c = SITE.company;
    const pg = ["네이버페이", KP().enabled ? "카카오페이" : ""].filter(Boolean).join(" · ");
    document.body.insertAdjacentHTML("beforeend", `
      <footer class="site"><div class="wrap">
        <div class="f-row">
          <div><h4>고객행복센터</h4><p class="tel num">${esc(SITE.cs.tel)}</p><p>${esc(SITE.cs.hours)}</p></div>
          <div>
            <div class="f-links"><span>회사소개</span><a href="terms.html">이용약관</a><a href="privacy.html"><b>개인정보처리방침</b></a>${INQUIRY() ? "" : `<a href="lookup.html">비회원 주문조회</a>`}</div>
            <p>법인명(상호): ${esc(c.corpName)} · 대표자: ${esc(c.ceo)} · 사업자등록번호: ${esc(c.businessNumber)}<br>
            통신판매업신고: ${esc(c.mailOrderNumber)}<br>
            주소: ${esc(c.address)} · 이메일: ${esc(c.email)}<br>
            ${INQUIRY() ? "구매 문의를 남겨주시면 확인 후 연락드립니다." : `결제대행: ${pg} · 고객님의 결제 정보는 프롬강화에 저장되지 않습니다.`}</p>
          </div>
        </div>
        <p class="f-copy">© ${new Date().getFullYear()} ${esc(SITE.nameEn)}. ${esc(SITE.tagline)}.</p>
      </div></footer>
      <div id="modalRoot"></div>
      <div class="toast" id="toast" role="status" hidden></div>`);
    renderBadge();
  }
  function renderBadge() {
    const b = $("#cartCount"); if (!b) return;
    const n = cartCount(); b.textContent = n; b.hidden = n === 0;
  }
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ---------- 상품 카드 ---------- */
  function visual(p) {
    if (p.image) return `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
    const [bg, fg] = p.tile || ["#f4f5f3", "#1f2119"];
    const n1 = p.name.split(/ (?=\d)/)[0];
    return `<div class="label-tile" style="background:${esc(bg)};color:${esc(fg)}"><span class="lt-top">${esc(SITE.nameEn)}</span><span class="lt-name">${esc(n1)}</span><span class="lt-unit">${esc(p.unit)}</span></div>`;
  }
  const shipLabel = p => p.ticket ? (INQUIRY() ? "체험 예약" : "모바일 발송") : "산지직송";
  function card(p) {
    const r = rate(p), href = `product.html?id=${p.id}`;
    return `<article class="card">
      <a class="thumb" href="${href}" aria-label="${esc(p.name)} 상세보기">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}</a>
      <button class="add" data-add="${p.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/></svg>담기</button>
      <div class="c-ship">${shipLabel(p)}</div>
      <a class="c-name" href="${href}">${esc(p.name)}</a>
      <div class="c-desc">${esc(p.sub)}</div>
      <div class="c-price num">${r ? `<span class="rate">${r}%</span>` : ""}<span class="now">${priceText(p)}</span>${p.was ? `<span class="was">${won(p.was)}원</span>` : ""}</div>
    </article>`;
  }
  function addToCart(id, qty = 1) {
    const l = cart.find(x => x.id === id);
    if (l) l.qty = Math.min(99, l.qty + qty); else cart.push({ id, qty });
    saveCart(); toast(`장바구니에 담았어요 · ${byId(id).name}`);
  }

  /* ---------- 페이지: 메인 ---------- */
  function pageHome(view) {
    const pick = sel => {
      if (Array.isArray(sel)) return sel.map(byId).filter(Boolean);
      if (sel === "sale") return PRODUCTS.filter(p => rate(p) >= 10).sort((a, b) => rate(b) - rate(a)).slice(0, 4);
      return [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 4);
    };
    const S = HOME.slides;
    view.innerHTML = `
      <section class="hero" aria-label="기획전">
        <div class="slides" id="slides">${S.map((s, i) => `
          <div class="slide" aria-hidden="${i !== 0}">
            <div class="copy">
              <span class="eyebrow">${esc(s.eyebrow)}</span>
              <h2>${esc(s.title).replace(/\n/g, "<br>")}</h2>
              <p>${esc(s.text)}</p>
              <div><a class="btn primary" style="height:44px;flex:none" href="${esc(s.link)}">보러 가기</a></div>
            </div>
            <div class="pic" role="img" aria-label="${esc(s.eyebrow)}" style="background-image:url('${esc(s.image)}')"></div>
          </div>`).join("")}</div>
        ${S.length > 1 ? `<div class="hero-ctrl num"><button id="prev" aria-label="이전 배너">‹</button><span id="slideNo">1 / ${S.length}</span><button id="next" aria-label="다음 배너">›</button></div>` : ""}
      </section>
      ${HOME.sections.map(sec => sec.strip
        ? `<div class="strip"><div class="wrap">${sec.strip.map(s => `<div class="it"><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div>`).join("")}</div></div>`
        : `<div class="wrap"><section class="rail"><div class="rail-head"><h3>${esc(sec.title)}</h3>${sec.sub ? `<p>${esc(sec.sub)}</p>` : ""}</div><div class="grid">${pick(sec.pick).map(card).join("")}</div></section></div>`
      ).join("")}`;

    let idx = 0, timer;
    const show = i => {
      idx = (i + S.length) % S.length;
      $("#slides").style.transform = `translateX(-${idx * 100}%)`;
      [...$("#slides").children].forEach((c, k) => c.setAttribute("aria-hidden", k !== idx));
      const no = $("#slideNo"); if (no) no.textContent = `${idx + 1} / ${S.length}`;
    };
    if (S.length > 1) {
      $("#prev").onclick = () => { clearInterval(timer); show(idx - 1); };
      $("#next").onclick = () => { clearInterval(timer); show(idx + 1); };
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => show(idx + 1), 5000);
    }
  }

  /* ---------- 페이지: 상품 목록 ---------- */
  function pageShop(view) {
    const cat = params.get("cat") || "all", q = (params.get("q") || "").trim();
    let sort = "rec";
    const sorts = { rec: ["추천순", (a, b) => b.sold - a.sold], low: ["낮은 가격순", (a, b) => a.price - b.price], high: ["높은 가격순", (a, b) => b.price - a.price], sale: ["혜택순", (a, b) => rate(b) - rate(a)] };
    const off = new Set(SITE.categories.filter(c => c.disabled).map(c => c.id));
    const base = (q ? PRODUCTS.filter(p => (p.name + p.sub).includes(q)) : PRODUCTS.filter(p => cat === "all" || p.cat === cat)).filter(p => !off.has(p.cat));
    const title = q ? `'${q}' 검색 결과` : (SITE.categories.find(c => c.id === cat) || SITE.categories[0]).name;
    document.title = `${title} | ${SITE.name}`;
    if (!q && off.has(cat)) { view.innerHTML = `<div class="wrap"><div class="page-title"><h2>${esc(title)}</h2></div>${msgPage("준비 중인 카테고리예요. 곧 만나요!", `<a class="btn ghost" style="display:inline-flex" href="shop.html">전체 상품 보기</a>`)}</div>`; return; }
    const draw = () => {
      const items = [...base].sort(sorts[sort][1]);
      view.innerHTML = `<div class="wrap">
        <div class="page-title"><h2>${esc(title)}</h2>${q ? "" : "<p>강화에서 바로 보내드려요</p>"}</div>
        <div class="toolbar"><span class="num">총 ${items.length}건</span>
          <div class="sorts">${Object.entries(sorts).map(([k, v]) => `<button data-sort="${k}" aria-pressed="${sort === k}">${v[0]}</button>`).join("")}</div></div>
        ${items.length ? `<div class="grid" style="padding-bottom:72px">${items.map(card).join("")}</div>` : `<p class="empty">찾는 상품이 없어요. 다른 단어로 검색해 보세요.</p>`}
      </div>`;
    };
    view.addEventListener("click", e => { const b = e.target.closest("[data-sort]"); if (b) { sort = b.dataset.sort; draw(); } });
    draw();
  }

  /* ---------- 페이지: 상품 상세 ---------- */
  function pageProduct(view) {
    const p = byId(params.get("id"));
    if (!p) { view.innerHTML = `<p class="empty">상품을 찾을 수 없어요.<br><br><a class="btn ghost" style="display:inline-flex" href="shop.html">전체 상품 보기</a></p>`; return; }
    document.title = `${p.name} | ${SITE.name}`;
    const cat = SITE.categories.find(c => c.id === p.cat) || SITE.categories[0];
    let qty = 1;
    const draw = () => {
      const r = rate(p);
      view.innerHTML = `<div class="wrap">
        <nav class="crumbs"><a href="index.html">홈</a>›<a href="shop.html?cat=${p.cat}">${esc(cat.name)}</a></nav>
        <div class="detail">
          <div class="thumb">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}</div>
          <div>
            <div class="d-ship">${shipLabel(p)}</div>
            <h2 class="d-name">${esc(p.name)}</h2>
            <p class="d-sub">${esc(p.sub)}</p>
            <div class="d-price num">${r ? `<span class="rate">${r}%</span>` : ""}<span class="now">${p.price ? `${won(p.price)}<small>원</small>` : "가격 문의"}</span></div>
            ${p.was ? `<div class="d-was num">${won(p.was)}원</div>` : ""}
            <dl class="info">
              <dt>${p.ticket ? "이용" : "배송"}</dt><dd>${p.ticket ? (INQUIRY() ? "구매 문의 후 일정·비용을 안내해 드려요" : "결제 후 문자로 이용권 발송") : `산지직송 · ${esc(SITE.shipping.cutoff)}<br><span style="color:var(--mute);font-size:13px">${won(SITE.shipping.freeOver)}원 이상 무료배송</span>`}</dd>
              <dt>판매단위</dt><dd>${esc(p.unit)}</dd>
              <dt>포장타입</dt><dd>${esc(p.pack)}</dd>
              <dt>원산지</dt><dd>${esc(p.origin)}</dd>
              <dt>수량</dt><dd><div class="qty"><button data-q="-1" aria-label="수량 빼기" ${qty <= 1 ? "disabled" : ""}>−</button><span class="num">${qty}</span><button data-q="1" aria-label="수량 더하기">+</button></div></dd>
            </dl>
            ${p.price ? `<div class="d-total"><span class="lbl">총 상품금액:</span><span class="v num">${won(p.price * qty)}</span><span>원</span></div>` : `<div class="d-total"><span class="lbl">금액은 문의 후 안내해 드려요</span></div>`}
            <div class="d-actions">
              <button class="btn ghost" data-addqty>장바구니 담기</button>
              <button class="btn primary" data-buynow>${INQUIRY() ? "구매 문의" : "바로 구매"}</button>
            </div>
            ${p.detail ? `<p class="detail-text">${esc(p.detail)}</p>` : ""}
          </div>
        </div></div>`;
    };
    view.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.q) { qty = Math.max(1, Math.min(99, qty + +t.dataset.q)); draw(); }
      if ("addqty" in t.dataset) addToCart(p.id, qty);
      if ("buynow" in t.dataset) { store.set("fg_buynow", [{ id: p.id, qty }], sessionStorage); location.href = "order.html?from=buynow"; }
    });
    draw();
  }

  /* ---------- 장바구니 · 주문 공통 ---------- */
  function lineRow(l, editable) {
    const p = byId(l.id);
    return `<div class="line">
      <a class="mini" href="product.html?id=${p.id}">${visual(p)}</a>
      <div class="nm">${esc(p.name)}<small>${esc(p.pack)}</small></div>
      ${editable ? `<div class="qty"><button data-lq="${p.id}" data-d="-1" aria-label="수량 빼기" ${l.qty <= 1 ? "disabled" : ""}>−</button><span class="num">${l.qty}</span><button data-lq="${p.id}" data-d="1" aria-label="수량 더하기">+</button></div>` : `<div class="num" style="color:var(--sub);font-size:14px">${l.qty}개</div>`}
      <div class="pr num">${priceText(p, l.qty)}</div>
      ${editable ? `<button class="x" data-del="${p.id}" aria-label="${esc(p.name)} 삭제">×</button>` : "<span></span>"}
    </div>`;
  }
  function summaryBox(t, cta) {
    const free = SITE.shipping.freeOver;
    return `<div class="sum"><div class="box">
        <div class="r"><span>상품금액</span><span class="num">${won(t.goods)}원</span></div>
        ${t.discount ? `<div class="r"><span>첫 주문 할인 (${t.discountRate}%)</span><span class="num" style="color:var(--sale)">−${won(t.discount)}원</span></div>` : ""}
        <div class="r"><span>배송비</span><span class="num">${t.ship ? "+" + won(t.ship) + "원" : "0원"}</span></div>
        ${t.ship ? `<div class="hint num">${won(free - t.goods)}원 더 담으면 무료배송</div>` : ""}
        <div class="r tot"><span>${INQUIRY() ? "예상 금액" : "결제예정금액"}</span><b class="num">${won(t.total)}원</b></div>
      </div>${cta}</div>`;
  }

  /* ---------- 페이지: 장바구니 ---------- */
  function pageCart(view) {
    const draw = () => {
      if (!cart.length) { view.innerHTML = `<div class="wrap"><div class="page-title"><h2>장바구니</h2></div><p class="empty">장바구니에 담긴 상품이 없어요.<br><br><a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a></p></div>`; return; }
      view.innerHTML = `<div class="wrap"><div class="page-title"><h2>장바구니</h2></div><div class="two">
        <div class="box"><div class="box-h"><b>담은 상품 <span class="num">${cartCount()}</span>개</b><button data-clear style="color:var(--sub);font-size:13px">전체 삭제</button></div>${cart.map(l => lineRow(l, true)).join("")}</div>
        ${summaryBox(totals(cart), `<a class="btn primary" href="order.html">${INQUIRY() ? "구매 문의하기" : "주문하기"}</a>`)}
      </div></div>`;
    };
    view.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.lq) { const l = cart.find(x => x.id === t.dataset.lq); l.qty = Math.max(1, Math.min(99, l.qty + +t.dataset.d)); }
      else if (t.dataset.del) cart = cart.filter(x => x.id !== t.dataset.del);
      else if ("clear" in t.dataset) cart = [];
      else return;
      saveCart(); draw();
    });
    draw();
  }

  /* ---------- 페이지: 주문서 + 결제 ---------- */
  async function firstOrderRate() {
    const r = Number(SITE.member && SITE.member.firstOrderDiscount) || 0;
    if (!r || !isMember()) return 0;
    const { data, error } = await SB.from("orders").select("order_no").in("status", PAID).limit(1);
    return !error && data && !data.length ? r : 0;
  }

  async function pageOrder(view) {
    // 결제창에서 돌아온 경우
    if (params.get("resultCode")) return naverReturn(view);
    if (params.get("kp")) return kakaoReturn(view);
    if (INQUIRY()) return pageInquiry(view);

    const fromBuyNow = params.get("from") === "buynow";
    const lines = (fromBuyNow ? store.get("fg_buynow", [], sessionStorage) : cart).filter(l => byId(l.id)).map(l => ({ ...l }));
    if (!lines.length) { view.innerHTML = msgPage("주문할 상품이 없어요.", `<a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a>`); return; }
    const me = isMember();
    const t = totals(lines, await firstOrderRate());
    const saved = me ? { name: PROFILE.name, tel: PROFILE.phone, addr: PROFILE.address } : store.get("fg_ship", {});
    const perk = Number(SITE.member && SITE.member.firstOrderDiscount) || 0;
    const here = "order.html" + (fromBuyNow ? "?from=buynow" : "");
    view.innerHTML = `<div class="wrap"><div class="page-title"><h2>주문서</h2></div><div class="two">
      <div style="display:grid;gap:20px;min-width:0">
        ${!me && SB ? `<div class="notice">비회원으로 주문하고 있어요. 주문번호와 휴대폰 번호로 주문을 조회할 수 있어요.${perk ? ` <a href="login.html?next=${encodeURIComponent(here)}">로그인하고 첫 주문 ${perk}% 할인 받기 ›</a>` : ` <a href="login.html?next=${encodeURIComponent(here)}">로그인 ›</a>`}</div>` : ""}
        <div class="box"><div class="box-h"><b>주문 상품</b><span class="num" style="color:var(--sub)">${lines.reduce((s, l) => s + l.qty, 0)}개</span></div>${lines.map(l => lineRow(l, false)).join("")}</div>
        <form class="box" id="shipForm" novalidate>
          <div class="box-h"><b>배송 정보</b></div>
          <div class="form">
            <div class="field"><label for="f-name">받는 분</label><input id="f-name" required maxlength="30" value="${esc(saved.name || "")}" placeholder="이름" autocomplete="name"></div>
            <div class="field"><label for="f-tel">휴대폰</label><input id="f-tel" required maxlength="13" value="${esc(saved.tel || "")}" placeholder="010-0000-0000" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><label for="f-addr">주소</label><input id="f-addr" required maxlength="200" value="${esc(saved.addr || "")}" placeholder="도로명 주소와 상세 주소" autocomplete="street-address"></div>
            <div class="field"><label for="f-memo">배송 요청</label><select id="f-memo"><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전 연락주세요</option></select></div>
            ${me ? `<label class="chk"><input type="checkbox" id="f-save" ${PROFILE.address ? "" : "checked"}>이 배송지를 기본 배송지로 저장</label>` : ""}
          </div>
        </form>
        <div class="box"><div class="box-h"><b>결제 수단</b></div>
          ${Object.entries(PAYS).map(([k, p], i) => `<label class="pay-opt"><input type="radio" name="pm" value="${k}" ${i === 0 ? "checked" : ""}><span class="pm-mark ${p.cls}">${p.mark}</span><b>${p.name}</b>${payPill(k) ? `<span class="pill">${payPill(k)}</span>` : ""}</label>`).join("")}
          ${Object.keys(PAYS).some(k => !PAYS[k].live()) ? `<div class="pay-opt mode-note"><span><b>'시뮬레이터'로 표시된 결제 수단은 아직 가맹점 키가 없어</b> 실제 결제창 대신 결제 흐름을 흉내 내는 화면이 열리고, 돈은 나가지 않습니다.</span></div>` : ""}
        </div>
      </div>
      ${summaryBox(t, `
        <label class="chk agree-pay"><input type="checkbox" id="f-agree"><span>[필수] 주문 상품과 결제 금액을 확인했으며, 배송을 위한 <a href="privacy.html" target="_blank">개인정보 수집·이용</a> 및 결제대행사 제공에 동의합니다.</span></label>
        <button class="btn npay" id="payBtn"></button>`)}
    </div></div>`;

    const btn = $("#payBtn");
    const method = () => $("[name=pm]:checked", view).value;
    const paint = () => { const p = PAYS[method()]; btn.className = `btn ${p.cls}`; btn.innerHTML = `${p.mark}${won(t.total)}원 ${p.name} 결제`; };
    view.addEventListener("change", e => { if (e.target.name === "pm") paint(); });
    paint();

    btn.onclick = async () => {
      for (const id of ["f-name", "f-tel", "f-addr"]) {
        const el = $("#" + id); if (!el.value.trim()) { el.focus(); return toast("배송 정보를 모두 입력해 주세요"); }
      }
      const ship = { name: $("#f-name").value.trim(), tel: $("#f-tel").value.trim(), addr: $("#f-addr").value.trim(), memo: $("#f-memo").value };
      if (!/^0\d{8,10}$/.test(ship.tel.replace(/\D/g, ""))) { $("#f-tel").focus(); return toast("휴대폰 번호를 확인해 주세요"); }
      if (!$("#f-agree").checked) return toast("주문 내용 확인 및 동의에 체크해 주세요");
      const m = method(), live = PAYS[m].live();
      const items = lines.map(l => ({ id: l.id, qty: l.qty }));
      const ctx = { items, fromBuyNow, method: m, ship, saveAddr: !!($("#f-save") && $("#f-save").checked) };

      // 서버 연결 전: 브라우저 안에서만 흐름 확인 (저장되지 않음)
      if (!API()) {
        const o = localOrder(lines, t, m);
        return openSimulator(o, m, () => finishOrder(o, ctx, view));
      }
      btn.disabled = true;
      try {
        const { order } = await api("/checkout", { items, ship, method: live ? m : "test" });
        store.set("fg_pending", { ...ctx, order }, sessionStorage);
        if (!live) {
          openSimulator(order, m, async () => {
            try { const r = await api("/test/pay", { orderNo: order.order_no }); finishOrder(r.order, ctx, view); }
            catch (err) { toast(err.message); }
          });
        } else if (m === "naverpay") {
          openNaverPay(order, ctx, view);
        } else {
          const r = await api("/kakaopay/ready", { orderNo: order.order_no, mobile: isMobile() });
          location.href = r.redirectUrl;
          return;
        }
      } catch (err) {
        toast(err.message);
      }
      btn.disabled = false;
    };
  }

  /* ---------- 페이지: 구매 문의서 (결제 보류 중) ---------- */
  function pageInquiry(view) {
    document.title = `구매 문의 | ${SITE.name}`;
    const fromBuyNow = params.get("from") === "buynow";
    const lines = (fromBuyNow ? store.get("fg_buynow", [], sessionStorage) : cart).filter(l => byId(l.id)).map(l => ({ ...l }));
    if (!lines.length) { view.innerHTML = msgPage("문의할 상품이 없어요.", `<a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a>`); return; }
    const me = isMember();
    const t = totals(lines);
    const quote = lines.some(l => !byId(l.id).price);
    const needAddr = lines.some(l => !byId(l.id).ticket);
    const saved = me ? { name: PROFILE.name, tel: PROFILE.phone, addr: PROFILE.address } : store.get("fg_ship", {});
    view.innerHTML = `<div class="wrap"><div class="page-title"><h2>구매 문의</h2><p>남겨주신 연락처로 확인 후 연락드려요. 결제는 상담 후 안내해 드립니다.</p></div><div class="two">
      <div style="display:grid;gap:20px;min-width:0">
        <div class="box"><div class="box-h"><b>문의 상품</b><span class="num" style="color:var(--sub)">${lines.reduce((s, l) => s + l.qty, 0)}개</span></div>${lines.map(l => lineRow(l, false)).join("")}</div>
        <form class="box" id="inqForm" novalidate>
          <div class="box-h"><b>연락처</b></div>
          <div class="form">
            <div class="field"><label for="i-name">이름</label><input id="i-name" maxlength="30" value="${esc(saved.name || "")}" placeholder="이름" autocomplete="name"></div>
            <div class="field"><label for="i-tel">휴대폰</label><input id="i-tel" maxlength="13" value="${esc(saved.tel || "")}" placeholder="010-0000-0000" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><label for="i-addr">${needAddr ? "배송 주소" : "주소 (선택)"}</label><input id="i-addr" maxlength="200" value="${esc(saved.addr || "")}" placeholder="${needAddr ? "도로명 주소와 상세 주소" : "체험만 문의하시면 비워 두셔도 돼요"}" autocomplete="street-address"></div>
            <div class="field top"><label for="i-msg">문의 내용</label><textarea id="i-msg" maxlength="1000" rows="4" placeholder="${quote ? "체험 희망 날짜·인원, 궁금한 점을 적어 주세요" : "받고 싶은 날짜, 궁금한 점을 적어 주세요 (선택)"}"></textarea></div>
            <input id="i-web" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          </div>
        </form>
      </div>
      <div class="sum"><div class="box">
          <div class="r"><span>상품금액</span><span class="num">${won(t.goods)}원${quote ? " + 문의" : ""}</span></div>
          ${needAddr ? `<div class="r"><span>배송비</span><span class="num">${t.ship ? "+" + won(t.ship) + "원" : "0원"}</span></div>` : ""}
          <div class="r tot"><span>예상 금액</span><b class="num">${won(t.total)}원</b></div>
          ${quote ? `<div class="hint">'가격 문의' 상품은 상담 후 금액을 안내해 드려요</div>` : ""}
        </div>
        <label class="chk agree-pay"><input type="checkbox" id="i-agree"><span>[필수] 구매 상담을 위한 <a href="privacy.html" target="_blank">개인정보 수집·이용</a>(이름, 휴대폰, 주소, 문의 내용 · 상담 완료 후 1년 보관)에 동의합니다.</span></label>
        <button class="btn primary" id="inqBtn" style="flex:none">구매 문의 보내기</button>
      </div>
    </div></div>`;

    $("#inqBtn").onclick = async () => {
      const contact = { name: $("#i-name").value.trim(), tel: $("#i-tel").value.trim(), addr: $("#i-addr").value.trim(), message: $("#i-msg").value.trim() };
      if (!contact.name) { $("#i-name").focus(); return toast("이름을 입력해 주세요"); }
      if (!/^0\d{8,10}$/.test(contact.tel.replace(/\D/g, ""))) { $("#i-tel").focus(); return toast("휴대폰 번호를 확인해 주세요"); }
      if (needAddr && !contact.addr) { $("#i-addr").focus(); return toast("배송받을 주소를 입력해 주세요"); }
      if (!$("#i-agree").checked) return toast("개인정보 수집·이용에 동의해 주세요");
      if (!API()) return toast("구매 문의 접수는 준비 중이에요");
      const btn = $("#inqBtn"); btn.disabled = true;
      try {
        const { inquiry } = await api("/inquiry", { items: lines.map(l => ({ id: l.id, qty: l.qty })), contact, website: $("#i-web").value });
        if (!fromBuyNow) { const done = new Set(lines.map(l => l.id)); cart = cart.filter(l => !done.has(l.id)); saveCart(); }
        store.del("fg_buynow", sessionStorage);
        if (!me) store.set("fg_ship", { name: contact.name, tel: contact.tel, addr: contact.addr });
        document.title = `문의 접수 완료 | ${SITE.name}`;
        view.innerHTML = `<div class="wrap"><div class="done">
          <div class="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
          <h2>구매 문의가 접수되었어요</h2>
          <p style="color:var(--sub);margin:0">확인 후 <b class="num">${esc(contact.tel)}</b> 로 연락드릴게요.</p>
          <dl>
            <dt>문의번호</dt><dd class="num"><b>${esc(inquiry.inquiry_no)}</b></dd>
            <dt>상품</dt><dd>${lines.map(l => `${esc(byId(l.id).name)} × ${l.qty}`).join("<br>")}</dd>
            <dt>예상 금액</dt><dd class="num">${won(inquiry.total)}원${quote ? " + 문의 상품" : ""}</dd>
          </dl>
          <div class="d-actions">${me ? `<a class="btn ghost" href="mypage.html">문의 내역 보기</a>` : ""}<a class="btn primary" href="index.html">쇼핑 계속하기</a></div>
        </div></div>`;
        window.scrollTo({ top: 0 });
      } catch (err) {
        toast(err.message); btn.disabled = false;
      }
    };
  }

  function localOrder(lines, t, method) {
    const first = byId(lines[0].id);
    return {
      order_no: "FG-LOCAL-" + Date.now().toString(36).toUpperCase(), method: "test", status: "paid",
      product_name: lines.length > 1 ? `${first.name} 외 ${lines.length - 1}건` : first.name,
      items: lines.map(l => ({ id: l.id, name: byId(l.id).name, qty: l.qty })),
      total: t.total, tax_ex: t.taxEx, discount: t.discount, payment_id: "SIM" + Date.now(), sim_method: method
    };
  }

  /* 네이버페이 결제창 */
  function openNaverPay(order, ctx, view) {
    const cfg = NP();
    const oPay = window.Naver.Pay.create({
      mode: cfg.mode, clientId: cfg.clientId, chainId: cfg.chainId || undefined,
      openType: "popup", payType: "normal",
      onAuthorize: o => {
        if (o.resultCode === "Success") approveNaver(o.paymentId, ctx, view);
        else toast(`결제가 완료되지 않았어요 (${o.resultMessage || o.resultCode})`);
      }
    });
    oPay.open({
      merchantPayKey: order.order_no,
      merchantUserKey: USER ? USER.id : "guest",
      productName: order.product_name,
      productCount: order.items.reduce((s, i) => s + i.qty, 0),
      totalPayAmount: order.total,
      taxScopeAmount: order.total - order.tax_ex,
      taxExScopeAmount: order.tax_ex,
      returnUrl: BASE + "order.html",
      productItems: order.items.map(i => ({ categoryType: "PRODUCT", categoryId: "GENERAL", uid: i.id, name: i.name, count: i.qty }))
    });
  }
  async function approveNaver(paymentId, ctx, view) {
    toast("결제를 승인하는 중이에요…");
    try {
      const r = await api("/naverpay/approve", { orderNo: ctx.order.order_no, paymentId });
      finishOrder(r.order, ctx, view);
    } catch (err) {
      toast(`결제 승인에 실패했어요: ${err.message}`);
    }
  }
  function naverReturn(view) {
    const code = params.get("resultCode"), pid = params.get("paymentId");
    const ctx = store.get("fg_pending", null, sessionStorage);
    history.replaceState(null, "", location.pathname);
    if (code === "Success" && pid && ctx) { view.innerHTML = `<p class="loading">결제를 승인하는 중이에요…</p>`; approveNaver(pid, ctx, view); }
    else view.innerHTML = msgPage("결제가 취소되었어요.", `<a class="btn ghost" style="display:inline-flex" href="cart.html">장바구니로 돌아가기</a>`);
  }

  /* 카카오페이 — 결제창에서 order.html?kp=approve&order=…&pg_token=… 으로 돌아옴 */
  async function kakaoReturn(view) {
    const kp = params.get("kp"), orderNo = params.get("order"), pgToken = params.get("pg_token");
    const ctx = store.get("fg_pending", null, sessionStorage) || {};
    history.replaceState(null, "", location.pathname);
    if (kp !== "approve" || !orderNo || !pgToken) {
      view.innerHTML = msgPage(kp === "fail" ? "결제에 실패했어요. 다시 시도해 주세요." : "결제가 취소되었어요.", `<a class="btn ghost" style="display:inline-flex" href="cart.html">장바구니로 돌아가기</a>`);
      return;
    }
    view.innerHTML = `<p class="loading">결제를 승인하는 중이에요…</p>`;
    try {
      const r = await api("/kakaopay/approve", { orderNo, pgToken });
      finishOrder(r.order, ctx, view);
    } catch (err) {
      view.innerHTML = msgPage(`결제 승인에 실패했어요.<br><small>${esc(err.message)}</small>`, `<a class="btn ghost" style="display:inline-flex" href="cart.html">장바구니로 돌아가기</a>`);
    }
  }

  /* 결제 시뮬레이터 — 가맹점 키가 없을 때 결제 흐름만 확인 (실결제 없음) */
  function openSimulator(order, method, onOk) {
    const root = $("#modalRoot"), p = PAYS[method];
    root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="simTitle">
      <div class="sheet-h ${p.cls}"><span id="simTitle">${p.name} 결제 시뮬레이터</span><button aria-label="닫기" data-close style="color:inherit;font-size:22px">×</button></div>
      <div class="sheet-b">
        <div class="warn">테스트 화면입니다. 실제 ${p.name} 결제창이 아니며 결제가 일어나지 않습니다.${API() ? " 주문은 '테스트 결제'로 저장됩니다." : ""}</div>
        <div class="r"><span>주문번호</span><span class="num">${esc(order.order_no)}</span></div>
        <div class="r"><span>상품</span><span style="text-align:right">${esc(order.product_name)}</span></div>
        <div class="r"><span>과세 / 면세</span><span class="num">${won(order.total - order.tax_ex)} / ${won(order.tax_ex)}원</span></div>
        <div class="r" style="align-items:baseline"><span>결제금액</span><span class="big num">${won(order.total)}원</span></div>
      </div>
      <div class="sheet-f"><button class="btn ghost" data-simfail>결제 취소</button><button class="btn ${p.cls}" data-simok>결제 성공</button></div>
    </div></div>`;
    $("[data-simok]", root).focus();
    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { root.innerHTML = ""; root.onclick = null; document.removeEventListener("keydown", onKey); };
    document.addEventListener("keydown", onKey);
    root.onclick = ev => {
      if (ev.target.id === "scrim" || ev.target.closest("[data-close]")) return close();
      if (ev.target.closest("[data-simfail]")) { close(); return toast("결제가 취소되었어요"); }
      if (ev.target.closest("[data-simok]")) { close(); onOk(); }
    };
  }

  function finishOrder(o, ctx, view) {
    ctx = ctx || {};
    if (ctx.items && !ctx.fromBuyNow) { const bought = new Set(ctx.items.map(i => i.id)); cart = cart.filter(l => !bought.has(l.id)); saveCart(); }
    const me = isMember();
    if (ctx.ship && !me) store.set("fg_ship", ctx.ship);
    if (ctx.ship && ctx.saveAddr && me) {
      SB.from("profiles").update({ phone: ctx.ship.tel, address: ctx.ship.addr }).eq("id", USER.id).then(() => {});
    }
    store.del("fg_pending", sessionStorage); store.del("fg_buynow", sessionStorage);
    document.title = `주문 완료 | ${SITE.name}`;
    const test = o.method === "test";
    view.innerHTML = `<div class="wrap"><div class="done">
      <div class="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
      <h2>주문이 완료되었어요</h2>
      <p style="color:var(--sub);margin:0">${test ? "테스트 결제로 처리된 주문입니다. 실제 결제는 일어나지 않았어요." : `${payName(o.method)} 결제가 승인되었습니다.`}</p>
      <dl>
        <dt>주문번호</dt><dd class="num"><b>${esc(o.order_no)}</b></dd>
        <dt>상품</dt><dd>${esc(o.product_name)}</dd>
        ${o.discount ? `<dt>할인</dt><dd class="num">−${won(o.discount)}원</dd>` : ""}
        <dt>결제금액</dt><dd class="num"><b>${won(o.total)}원</b>${o.tax_ex ? ` (면세 ${won(o.tax_ex)}원 포함)` : ""}</dd>
        ${ctx.ship ? `<dt>받는 분</dt><dd>${esc(ctx.ship.name)}</dd>` : ""}
      </dl>
      ${me
        ? `<div class="d-actions"><a class="btn ghost" href="mypage.html">주문 내역 보기</a><a class="btn primary" href="index.html">쇼핑 계속하기</a></div>`
        : `<p class="notice" style="text-align:left">비회원 주문은 <b>주문번호와 휴대폰 번호</b>로 조회할 수 있어요. 주문번호를 꼭 메모해 두세요.</p>
           <div class="d-actions"><a class="btn ghost" href="lookup.html">비회원 주문조회</a><a class="btn primary" href="index.html">쇼핑 계속하기</a></div>`}
    </div></div>`;
    window.scrollTo({ top: 0 });
  }

  /* ---------- 주문 카드 (마이페이지 · 비회원 조회 · 관리자) ---------- */
  const fmtDate = s => s ? new Date(s).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  function orderCard(o, extra = "") {
    return `<article class="ord">
      <div class="ord-h"><span class="num">${fmtDate(o.created_at)}</span><span class="st st-${esc(o.status)}">${STATUS[o.status] || esc(o.status)}</span></div>
      <div class="ord-no num">주문번호 ${esc(o.order_no)}</div>
      <ul class="ord-items">${(o.items || []).map(i => `<li><span>${esc(i.name)}</span><span class="num">${i.qty}개</span></li>`).join("")}</ul>
      <div class="ord-f"><span>${esc(payName(o.method))}${o.discount ? ` · 할인 ${won(o.discount)}원` : ""}</span><b class="num">${won(o.total)}원</b></div>
      ${o.tracking_no ? `<div class="ord-track">${esc(o.courier || "택배")} 운송장 <span class="num">${esc(o.tracking_no)}</span></div>` : ""}
      ${extra}
    </article>`;
  }

  const INQ_STATUS = { new: "새 문의", contacted: "연락함", done: "완료", cancelled: "취소" };
  function inquiryCard(q, extra = "") {
    return `<article class="ord">
      <div class="ord-h"><span class="num">${fmtDate(q.created_at)}</span><span class="st st-q-${esc(q.status)}">${INQ_STATUS[q.status] || esc(q.status)}</span></div>
      <div class="ord-no num">문의번호 ${esc(q.inquiry_no)}</div>
      <ul class="ord-items">${(q.items || []).map(i => `<li><span>${esc(i.name)}</span><span class="num">${i.qty}개 · ${i.price ? won(i.price * i.qty) + "원" : "가격 문의"}</span></li>`).join("")}</ul>
      <div class="ord-f"><span>예상 금액${q.has_quote ? " (문의 상품 제외)" : ""}</span><b class="num">${won(q.total)}원</b></div>
      ${extra}
    </article>`;
  }

  /* ---------- 페이지: 로그인 · 회원가입 ---------- */
  function pageLogin(view) {
    document.title = `로그인 | ${SITE.name}`;
    const next = safeNext(params.get("next") || store.get("fg_next", "", sessionStorage));
    const err = params.get("error_description");
    if (params.has("code") || err) history.replaceState(null, "", location.pathname);
    if (USER && !PROFILE) return pageAgree(view, next);
    if (isMember()) { store.del("fg_next", sessionStorage); location.replace(next); return; }

    const L = SITE.login || {};
    const kakao = !!(SB && API() && L.kakao && L.kakaoRestKey), naver = !!(SB && API() && L.naver !== false && L.naverClientId);  // 네이버 로그인: 검수 전까지 site.json 의 login.naver=false 로 꺼 둠
    const perk = Number(SITE.member && SITE.member.firstOrderDiscount) || 0;
    view.innerHTML = `<div class="wrap"><div class="auth">
      <div class="page-title"><h2>로그인 · 회원가입</h2><p>${[kakao && "카카오", naver && "네이버"].filter(Boolean).join("·") || "소셜"} 계정으로 바로 가입하고 로그인해요</p></div>
      ${perk && !INQUIRY() && (kakao || naver) ? `<p class="auth-perk">지금 가입하면 <b>첫 주문 ${perk}% 할인</b></p>` : ""}
      <div class="auth-btns">
        ${kakao ? `<button class="btn kakao" data-login="kakao">${PAYS.kakaopay.mark}카카오로 시작하기</button>` : ""}
        ${naver ? `<button class="btn naver" data-login="naver"><span class="n">N</span>네이버로 시작하기</button>` : ""}
        ${!kakao && !naver ? `<p class="empty" style="padding-block:24px">회원 기능은 오픈 준비 중입니다.<br>비회원으로도 주문할 수 있어요.</p>` : ""}
      </div>
      ${kakao || naver ? `<p class="mode-note" style="text-align:center">처음 로그인하면 약관 동의 후 가입이 완료돼요. 프롬강화는 비밀번호를 저장하지 않아요.</p>` : ""}
      ${INQUIRY()
        ? `<div class="auth-guest"><span>회원가입 없이도 구매 문의를 남길 수 있어요</span><a class="btn ghost" href="shop.html">상품 보러 가기</a></div>`
        : `<div class="auth-guest"><span>비회원으로 주문하셨나요?</span><a class="btn ghost" href="lookup.html">비회원 주문조회</a></div>`}
    </div></div>`;
    if (err) toast(`로그인하지 못했어요: ${err}`);

    view.onclick = e => {
      const b = e.target.closest("[data-login]"); if (!b) return;
      store.set("fg_next", next, sessionStorage);
      const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, "0")).join("");
      store.set("fg_oauth_state", state, sessionStorage);
      // 카카오는 이메일 없이 닉네임만 요청 (비즈 앱 전환 전에도 로그인 가능)
      location.href = b.dataset.login === "kakao"
        ? "https://kauth.kakao.com/oauth/authorize?" + new URLSearchParams({
            response_type: "code", client_id: L.kakaoRestKey, redirect_uri: BASE + "kakao-callback.html", scope: "profile_nickname", state })
        : "https://nid.naver.com/oauth2.0/authorize?" + new URLSearchParams({
            response_type: "code", client_id: L.naverClientId, redirect_uri: BASE + "naver-callback.html", state });
    };
  }
  const loginLabel = u => /@kakao\.invalid$/.test(u.email || "") ? "카카오 계정" : (u.email || "");

  /* 처음 로그인한 회원 — 약관 동의 후 가입 완료 */
  function pageAgree(view, next) {
    document.title = `회원가입 | ${SITE.name}`;
    const m = USER.user_metadata || {};
    const nm = m.name || m.full_name || m.nickname || m.preferred_username || "";
    view.innerHTML = `<div class="wrap"><div class="auth">
      <div class="page-title"><h2>회원가입</h2><p>계정 확인이 끝났어요. 약관에 동의하면 가입이 완료돼요.</p></div>
      <form class="box" id="agreeForm" novalidate>
        <div class="form">
          <div class="field"><label>로그인 계정</label><input value="${esc(loginLabel(USER))}" disabled></div>
          <div class="field"><label for="a-name">이름</label><input id="a-name" maxlength="30" value="${esc(nm)}" autocomplete="name"></div>
        </div>
        <div class="agree">
          <label class="chk all"><input type="checkbox" id="a-all"><b>전체 동의</b></label>
          <label class="chk"><input type="checkbox" data-req>[필수] 만 14세 이상입니다</label>
          <label class="chk"><input type="checkbox" data-req><span>[필수] <a href="terms.html" target="_blank">이용약관</a> 동의</span></label>
          <label class="chk"><input type="checkbox" data-req>[필수] 개인정보 수집·이용 동의</label>
          <div class="agree-box">
            <b>수집 항목</b> 이름(닉네임), 카카오·네이버 회원 식별값, 이메일(네이버 로그인 시) (주문 시 휴대폰 번호·배송지)<br>
            <b>이용 목적</b> 회원 식별, 주문·배송, 고객 상담, 회원 혜택 제공<br>
            <b>보유 기간</b> 회원 탈퇴 시까지 (주문·결제 기록은 전자상거래법에 따라 5년 보관)<br>
            동의를 거부할 수 있으며, 거부하면 회원가입은 할 수 없지만 비회원 주문은 가능합니다. <a href="privacy.html" target="_blank">개인정보처리방침</a>
          </div>
        </div>
        <div class="auth-actions"><button type="button" class="btn ghost" data-cancel>가입 취소</button><button class="btn primary">동의하고 가입하기</button></div>
      </form>
    </div></div>`;
    const reqs = [...view.querySelectorAll("[data-req]")];
    $("#a-all").onchange = e => reqs.forEach(c => (c.checked = e.target.checked));
    view.addEventListener("change", e => { if (e.target.dataset.req !== undefined) $("#a-all").checked = reqs.every(c => c.checked); });
    $("[data-cancel]", view).onclick = async () => {
      try { if (API()) await api("/me/withdraw"); } catch (e) {}
      await SB.auth.signOut();
      location.replace("index.html");
    };
    $("#agreeForm").onsubmit = async e => {
      e.preventDefault();
      const name = $("#a-name").value.trim();
      if (!name) { $("#a-name").focus(); return toast("이름을 입력해 주세요"); }
      if (!reqs.every(c => c.checked)) return toast("필수 항목에 모두 동의해 주세요");
      const { error } = await SB.from("profiles").upsert({ id: USER.id, name, agreed_at: new Date().toISOString() });
      if (error) return toast(`가입하지 못했어요: ${error.message}`);
      store.del("fg_next", sessionStorage);
      location.replace(next);
    };
  }

  /* 카카오·네이버 로그인 콜백 — 서버에서 계정 확인 후 Supabase 로그인 토큰을 받아옴 */
  async function pageOAuth(view) {
    const provider = PAGE, label = provider === "kakao" ? "카카오" : "네이버";
    const code = params.get("code"), state = params.get("state");
    const saved = store.get("fg_oauth_state", "", sessionStorage);
    store.del("fg_oauth_state", sessionStorage);
    history.replaceState(null, "", location.pathname);
    const back = `<a class="btn ghost" style="display:inline-flex" href="login.html">로그인으로 돌아가기</a>`;
    if (!code || !state || state !== saved || !SB) { view.innerHTML = msgPage(`${label} 로그인이 취소되었어요.`, back); return; }
    view.innerHTML = `<p class="loading">${label} 계정으로 로그인하는 중이에요…</p>`;
    try {
      const d = await api(`/auth/${provider}`, { code, state, redirectUri: BASE + `${provider}-callback.html` });
      const { error } = await SB.auth.verifyOtp({ token_hash: d.tokenHash, type: "magiclink" });
      if (error) throw error;
      location.replace("login.html");
    } catch (err) {
      view.innerHTML = msgPage(`${label} 로그인에 실패했어요.<br><small>${esc(err.message)}</small>`, back);
    }
  }

  /* ---------- 페이지: 마이페이지 ---------- */
  async function pageMypage(view) {
    document.title = `마이페이지 | ${SITE.name}`;
    if (!SB) { view.innerHTML = msgPage("회원 기능은 오픈 준비 중입니다."); return; }
    if (!isMember()) { location.replace("login.html?next=mypage.html"); return; }
    const [{ data: orders, error }, { data: inqs }] = await Promise.all([
      SB.from("orders").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(50),
      SB.from("inquiries").select("*").order("created_at", { ascending: false }).limit(50)
    ]);
    const showOrders = !INQUIRY() || (orders && orders.length);
    view.innerHTML = `<div class="wrap"><div class="page-title"><h2>마이페이지</h2><p>${esc(PROFILE.name)}님, 반가워요</p></div><div class="two my">
      <div style="display:grid;gap:20px;min-width:0;align-content:start">
      ${INQUIRY() || (inqs && inqs.length) ? `<div class="box"><div class="box-h"><b>구매 문의 내역</b><span class="num" style="color:var(--sub)">${inqs ? inqs.length : 0}건</span></div>
        <div class="ord-list">${inqs && inqs.length ? inqs.map(q => inquiryCard(q)).join("") : `<p class="empty">아직 구매 문의 내역이 없어요.</p>`}</div>
      </div>` : ""}
      ${showOrders ? `<div class="box"><div class="box-h"><b>주문 내역</b><span class="num" style="color:var(--sub)">${orders ? orders.length : 0}건</span></div>
        <div class="ord-list">${error ? `<p class="empty">주문 내역을 불러오지 못했어요.</p>` : orders.length ? orders.map(o => orderCard(o)).join("") : `<p class="empty">아직 주문 내역이 없어요.</p>`}</div>
      </div>` : ""}
      </div>
      <div class="sum">
        <form class="box" id="profForm" novalidate>
          <div class="box-h"><b>회원 정보</b></div>
          <div class="form stack">
            <div class="field"><label>로그인 계정</label><input value="${esc(loginLabel(USER))}" disabled></div>
            <div class="field"><label for="p-name">이름</label><input id="p-name" maxlength="30" value="${esc(PROFILE.name || "")}" autocomplete="name"></div>
            <div class="field"><label for="p-tel">휴대폰</label><input id="p-tel" maxlength="13" value="${esc(PROFILE.phone || "")}" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><label for="p-addr">기본 배송지</label><input id="p-addr" maxlength="200" value="${esc(PROFILE.address || "")}" autocomplete="street-address"></div>
            <button class="btn primary" style="height:46px">저장</button>
          </div>
        </form>
        <div class="my-links"><button data-logout>로그아웃</button><button data-withdraw>회원 탈퇴</button></div>
      </div>
    </div></div>`;
    $("#profForm").onsubmit = async e => {
      e.preventDefault();
      const row = { name: $("#p-name").value.trim(), phone: $("#p-tel").value.trim(), address: $("#p-addr").value.trim() };
      if (!row.name) return toast("이름을 입력해 주세요");
      const { error: er } = await SB.from("profiles").update(row).eq("id", USER.id);
      if (er) return toast(`저장하지 못했어요: ${er.message}`);
      Object.assign(PROFILE, row); toast("회원 정보를 저장했어요");
    };
    $("[data-withdraw]", view).onclick = async () => {
      if (!confirm("정말 탈퇴할까요?\n회원 정보는 바로 삭제되고, 주문·결제 기록은 전자상거래법에 따라 5년간 보관 후 삭제됩니다.")) return;
      try { await api("/me/withdraw"); } catch (err) { return toast(`탈퇴하지 못했어요: ${err.message}`); }
      await signOutClean();
      alert("탈퇴가 완료되었어요. 그동안 이용해 주셔서 감사합니다.");
      location.replace("index.html");
    };
  }

  /* ---------- 페이지: 비회원 주문조회 ---------- */
  function pageLookup(view) {
    document.title = `비회원 주문조회 | ${SITE.name}`;
    view.innerHTML = `<div class="wrap"><div class="auth">
      <div class="page-title"><h2>비회원 주문조회</h2><p>주문 완료 화면의 주문번호와 주문할 때 적은 휴대폰 번호를 입력하세요</p></div>
      <form class="box" id="lkForm" novalidate>
        <div class="form">
          <div class="field"><label for="l-no">주문번호</label><input id="l-no" maxlength="40" placeholder="FG20261006-ABC123" autocapitalize="characters"></div>
          <div class="field"><label for="l-tel">휴대폰</label><input id="l-tel" maxlength="13" placeholder="010-0000-0000" inputmode="tel"></div>
          <button class="btn primary" style="height:46px">조회하기</button>
        </div>
      </form>
      <div id="lkResult" style="margin-top:20px"></div>
      ${isMember() ? "" : `<p class="mode-note" style="text-align:center;margin-top:20px">회원이신가요? <a href="login.html?next=mypage.html" style="text-decoration:underline">로그인하고 주문 내역 보기</a></p>`}
    </div></div>`;
    $("#lkForm").onsubmit = async e => {
      e.preventDefault();
      const orderNo = $("#l-no").value.trim().toUpperCase(), phone = $("#l-tel").value.trim();
      if (!orderNo || !phone) return toast("주문번호와 휴대폰 번호를 입력해 주세요");
      if (!API()) return toast("주문조회는 오픈 준비 중입니다");
      const out = $("#lkResult");
      out.innerHTML = `<p class="loading" style="padding-block:24px">조회하는 중…</p>`;
      try {
        const { order: o } = await api("/orders/lookup", { orderNo, phone });
        out.innerHTML = `<div class="box ord-list">${orderCard(o, `<dl class="ord-ship"><dt>받는 분</dt><dd>${esc(o.ship.name)}</dd><dt>주소</dt><dd>${esc(o.ship.addr)}</dd></dl>`)}</div>
          <p class="mode-note" style="text-align:center">주문 취소·교환은 고객행복센터(${esc(SITE.cs.tel)}) 또는 ${esc(SITE.company.email)} 로 문의해 주세요.</p>`;
      } catch (err) {
        out.innerHTML = `<p class="empty" style="padding-block:24px">${esc(err.message)}</p>`;
      }
    };
  }

  /* ---------- 페이지: 관리자 주문 관리 ---------- */
  function pageAdmin(view) {
    document.title = `관리자 | ${SITE.name}`;
    if (!API() || !SB) { view.innerHTML = msgPage("서버(api)와 Supabase 설정 후 사용할 수 있어요."); return; }
    if (!USER) { location.replace("login.html?next=admin.html"); return; }
    const SECTIONS = {
      inquiry: { name: "구매 문의", tabs: { new: "새 문의", contacted: "연락함", done: "완료", cancelled: "취소", all: "전체" }, first: "new" },
      order: { name: "주문", tabs: { paid: "결제완료", preparing: "상품준비중", shipped: "배송중", delivered: "배송완료", cancelled: "취소", all: "전체" }, first: "paid" }
    };
    let section = INQUIRY() ? "inquiry" : "order", status = SECTIONS[section].first, rows = [];
    const orderRow = o => orderCard(o, `
      <dl class="ord-ship">
        <dt>받는 분</dt><dd>${esc(o.ship.name)} · <span class="num">${esc(o.ship.tel)}</span></dd>
        <dt>주소</dt><dd>${esc(o.ship.addr)}</dd>
        <dt>요청</dt><dd>${esc(o.ship.memo || "")}</dd>
        <dt>결제번호</dt><dd class="num">${esc(o.payment_id || "")}</dd>
      </dl>
      ${o.status === "cancelled" || o.status === "pending" ? "" : `<div class="adm-edit" data-no="${esc(o.order_no)}">
        <select data-f="status">${["paid", "preparing", "shipped", "delivered"].map(s => `<option value="${s}" ${o.status === s ? "selected" : ""}>${STATUS[s]}</option>`).join("")}</select>
        <input data-f="courier" placeholder="택배사" value="${esc(o.courier || "")}">
        <input data-f="tracking" placeholder="운송장 번호" value="${esc(o.tracking_no || "")}" inputmode="numeric">
        <button class="btn primary" data-save>저장</button>
        <button class="btn ghost" data-cancel>결제 취소</button>
      </div>`}`);
    const inqRow = q => inquiryCard(q, `
      <dl class="ord-ship">
        <dt>이름</dt><dd>${esc(q.name)}${q.user_id ? ` <span class="pill">회원</span>` : ""}</dd>
        <dt>휴대폰</dt><dd><a class="num" href="tel:${esc(q.tel.replace(/[^\d]/g, ""))}" style="color:var(--brand);text-decoration:underline">${esc(q.tel)}</a></dd>
        <dt>주소</dt><dd>${esc(q.addr || "-")}</dd>
        <dt>문의 내용</dt><dd style="white-space:pre-wrap">${esc(q.message || "-")}</dd>
      </dl>
      <div class="adm-edit" data-inq="${esc(q.inquiry_no)}">
        <select data-f="status">${Object.keys(INQ_STATUS).map(s => `<option value="${s}" ${q.status === s ? "selected" : ""}>${INQ_STATUS[s]}</option>`).join("")}</select>
        <input data-f="memo" placeholder="관리자 메모 (고객에게 안 보여요)" value="${esc(q.admin_memo || "")}" maxlength="500">
        <button class="btn primary" data-save>저장</button>
      </div>`);
    const draw = () => {
      const sec = SECTIONS[section];
      view.innerHTML = `<div class="wrap"><div class="page-title"><h2>관리자</h2><p>관리자 전용 화면</p></div>
        <div class="adm-sec">${Object.entries(SECTIONS).map(([k, s]) => `<button data-sec="${k}" aria-pressed="${section === k}">${s.name}</button>`).join("")}</div>
        <div class="toolbar"><span class="num">총 ${rows.length}건</span>
          <div class="sorts">${Object.entries(sec.tabs).map(([k, v]) => `<button data-tab="${k}" aria-pressed="${status === k}">${v}</button>`).join("")}</div></div>
        <div class="box ord-list adm">${rows.length ? rows.map(section === "inquiry" ? inqRow : orderRow).join("") : `<p class="empty">${sec.name} 내역이 없어요.</p>`}</div>
        <div style="height:72px"></div></div>`;
    };
    const load = async () => {
      view.innerHTML = `<p class="loading">불러오는 중…</p>`;
      try {
        const d = await api(`/admin/${section === "inquiry" ? "inquiries" : "orders"}?status=${status}`, null, "GET");
        rows = d.inquiries || d.orders || []; draw();
      } catch (err) {
        view.innerHTML = msgPage(esc(err.message) + (/권한/.test(err.message)
          ? `<br><small>이 계정을 관리자로 쓰려면 Cloudflare 워커의 ADMIN_EMAILS 에<br><b class="num" style="color:var(--ink)">${esc(USER.email)}</b> 를 넣으세요.</small>` : ""));
      }
    };
    view.onclick = async e => {
      const sec = e.target.closest("[data-sec]");
      if (sec) { section = sec.dataset.sec; status = SECTIONS[section].first; return load(); }
      const tab = e.target.closest("[data-tab]");
      if (tab) { status = tab.dataset.tab; return load(); }
      const box = e.target.closest(".adm-edit"); if (!box) return;
      const f = k => $(`[data-f=${k}]`, box).value.trim();
      try {
        if (box.dataset.inq) {
          if (!e.target.closest("[data-save]")) return;
          await api("/admin/inquiry", { inquiryNo: box.dataset.inq, status: f("status"), memo: f("memo") });
          toast("저장했어요"); load();
          return;
        }
        const orderNo = box.dataset.no;
        if (e.target.closest("[data-save]")) {
          await api("/admin/order", { orderNo, status: f("status"), courier: f("courier"), trackingNo: f("tracking") });
          toast("저장했어요"); load();
        } else if (e.target.closest("[data-cancel]")) {
          if (!confirm(`${orderNo} 주문을 전액 결제 취소할까요?\n고객에게 바로 환불되며 되돌릴 수 없어요.`)) return;
          await api("/admin/cancel", { orderNo });
          toast("결제를 취소했어요"); load();
        }
      } catch (err) { toast(err.message); }
    };
    load();
  }

  /* ---------- 페이지: 약관 · 개인정보처리방침 (본문은 HTML 에 있음) ---------- */
  function pagePolicy(view) {
    view.querySelectorAll("[data-site]").forEach(el => {
      el.textContent = el.dataset.site.split(".").reduce((o, k) => (o ? o[k] : ""), SITE) || "";
    });
  }

  /* ---------- 전역 이벤트 ---------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-add], [data-toast], [data-logout]"); if (!t) return;
    if ("logout" in t.dataset) return logout();
    if (t.dataset.toast) return toast(t.dataset.toast);
    if (t.dataset.add) addToCart(t.dataset.add, 1);
  });

  /* ---------- 시작 ---------- */
  async function load(name) {
    const r = await fetch(`data/${name}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(`data/${name}.json 을 불러오지 못했어요`);
    return r.json();
  }
  (async function boot() {
    const view = $("#view");
    try {
      [SITE, HOME, PRODUCTS] = await Promise.all([load("site"), load("home"), load("products")]);
    } catch (err) {
      view.innerHTML = `<p class="empty">페이지를 불러오지 못했어요.<br><small>${esc(err.message)} — JSON 파일의 쉼표·따옴표를 확인해 주세요.</small></p>`;
      return;
    }
    // 없어진 상품(판매 종료 등)이 브라우저 장바구니에 남아 있으면 정리
    if (cart.some(l => !byId(l.id))) { cart = cart.filter(l => byId(l.id)); store.set("fg_cart", cart); }
    await initAuth();
    await syncCart();
    shell();
    ({ home: pageHome, shop: pageShop, product: pageProduct, cart: pageCart, order: pageOrder,
       login: pageLogin, naver: pageOAuth, kakao: pageOAuth, mypage: pageMypage, lookup: pageLookup, admin: pageAdmin, policy: pagePolicy }[PAGE] || pageHome)(view);
  })();
})();
