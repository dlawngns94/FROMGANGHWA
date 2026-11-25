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
            <div class="f-links"><span>회사소개</span><a href="terms.html">이용약관</a><a href="privacy.html"><b>개인정보처리방침</b></a><a href="reserve.html">예약·1:1 문의</a>${INQUIRY() ? "" : `<a href="lookup.html">비회원 주문조회</a>`}</div>
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
  const isStay = p => p.cat === "stay";
  const shipLabel = p => p.ticket ? (INQUIRY() ? (isStay(p) ? "숙박 예약" : "체험 예약") : "모바일 발송") : "산지직송";
  function card(p) {
    const r = rate(p), href = `product.html?id=${p.id}`;
    // 오픈 예정 상품은 상세로 들어가지 않음 (사진·이름이 링크가 아님)
    if (p.soon) return `<article class="card soon-card">
      <div class="thumb">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}<span class="soon-veil">COMING SOON</span></div>
      <button class="add" disabled>오픈 예정</button>
      <div class="c-ship">${shipLabel(p)}</div>
      <span class="c-name">${esc(p.name)}</span>
      <div class="c-desc">${esc(p.sub)}</div>
      <div class="c-price num"><span class="now"><span class="soon">오픈 예정</span></span></div>
    </article>`;
    return `<article class="card">
      <a class="thumb" href="${href}" aria-label="${esc(p.name)} 상세보기">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}</a>
      ${p.soon ? `<button class="add" disabled>오픈 예정</button>` : p.ticket ? `<a class="add" href="reserve.html?id=${p.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>예약 문의</a>` : `<button class="add" data-add="${p.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/></svg>담기</button>`}
      <div class="c-ship">${shipLabel(p)}</div>
      <a class="c-name" href="${href}">${esc(p.name)}</a>
      <div class="c-desc">${esc(p.sub)}</div>
      <div class="c-price num">${r ? `<span class="rate">${r}%</span>` : ""}<span class="now">${p.soon ? `<span class="soon">오픈 예정</span>` : priceText(p)}</span>${p.was && !p.soon ? `<span class="was">${won(p.was)}원</span>` : ""}</div>
    </article>`;
  }
  function addToCart(id, qty = 1) {
    if (byId(id).soon) return toast("오픈 예정 상품이에요. 조금만 기다려 주세요!");
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
        <div class="page-title"><h2>${esc(title)}</h2>${q ? "" : `<p>${esc((SITE.categories.find(c => c.id === cat) || {}).sub || "강화에서 바로 보내드려요")}</p>`}</div>
        <div class="toolbar"><span class="num">총 ${items.length}건</span>
          <div class="sorts">${Object.entries(sorts).map(([k, v]) => `<button data-sort="${k}" aria-pressed="${sort === k}">${v[0]}</button>`).join("")}</div></div>
        ${items.length ? `<div class="grid" style="padding-bottom:72px">${items.map(card).join("")}</div>` : `<p class="empty">찾는 상품이 없어요. 다른 단어로 검색해 보세요.</p>`}
      </div>`;
    };
    view.addEventListener("click", e => { const b = e.target.closest("[data-sort]"); if (b) { sort = b.dataset.sort; draw(); } });
    draw();
  }

  /* ---------- 검색용 메타 (상품별 설명문·대표 주소) ----------
     product.html?id=… 은 모두 같은 HTML 파일이라, 자바스크립트를 실행하는 검색 로봇(구글 등)이
     상품마다 다른 페이지로 인식하도록 설명문과 canonical 주소를 상품에 맞게 바꿔 줌 */
  const SITE_URL = "https://www.fromganghwa.co.kr";
  function setMeta(desc, path) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = desc;
    let c = document.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
    c.href = SITE_URL + "/" + path;
  }

  /* ---------- 페이지: 상품 상세 ---------- */
  function pageProduct(view) {
    const p = byId(params.get("id"));
    if (!p) { view.innerHTML = `<p class="empty">상품을 찾을 수 없어요.<br><br><a class="btn ghost" style="display:inline-flex" href="shop.html">전체 상품 보기</a></p>`; return; }
    if (p.soon) { view.innerHTML = msgPage(`<b style="color:var(--ink)">${esc(p.name)}</b>은(는) 오픈을 준비하고 있어요.<br>조금만 기다려 주세요!`, `<a class="btn ghost" style="display:inline-flex" href="shop.html?cat=${p.cat}">다른 상품 보기</a>`); return; }
    document.title = `${p.name} | ${SITE.name}`;
    const cat = SITE.categories.find(c => c.id === p.cat) || SITE.categories[0];
    let qty = 1;
    const TABS = [["story", "상품설명"], ["info", "상세정보"], ["review", "후기"], ["qna", "문의"]];
    view.innerHTML = `<div class="wrap"><div id="pTop"></div></div>
      <div class="ptabs-wrap"><nav class="ptabs wrap" aria-label="상품 정보">${TABS.map(([k, v], i) =>
        `<a href="#tab-${k}" data-ptab="${k}" aria-current="${i === 0}">${v}<span class="num" id="cnt-${k}"></span></a>`).join("")}</nav></div>
      <div class="wrap ptab-body">
        <section id="tab-story" class="psec">${storyHtml(p)}</section>
        <section id="tab-info" class="psec"><h3 class="psec-h">상세정보</h3>${infoHtml(p)}</section>
        <section id="tab-review" class="psec"><h3 class="psec-h">상품 후기</h3><div id="revBox"><p class="loading" style="padding-block:40px">불러오는 중…</p></div></section>
        <section id="tab-qna" class="psec"><h3 class="psec-h">상품 문의</h3><div id="qnaBox"><p class="loading" style="padding-block:40px">불러오는 중…</p></div></section>
      </div>`;
    const top = $("#pTop");
    const draw = () => {
      const r = rate(p);
      top.innerHTML = `
        <nav class="crumbs"><a href="index.html">홈</a>›<a href="shop.html?cat=${p.cat}">${esc(cat.name)}</a></nav>
        <div class="detail">
          <div class="thumb">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}</div>
          <div>
            <div class="d-ship">${shipLabel(p)}</div>
            <h2 class="d-name">${esc(p.name)}</h2>
            <p class="d-sub">${esc(p.sub)}</p>
            <div class="d-price num">${r && !p.soon ? `<span class="rate">${r}%</span>` : ""}<span class="now">${p.soon ? `<span class="soon">오픈 예정</span>` : p.price ? `${won(p.price)}<small>원</small>` : "가격 문의"}</span></div>
            ${p.was && !p.soon ? `<div class="d-was num">${won(p.was)}원</div>` : ""}
            <dl class="info">
              <dt>${p.ticket ? "이용" : "배송"}</dt><dd>${p.ticket ? (INQUIRY() ? "예약 문의를 남겨 주시면 일정·비용을 안내해 드려요" : "결제 후 문자로 이용권 발송") : `산지직송 · ${esc(SITE.shipping.cutoff)}<br><span style="color:var(--mute);font-size:13px">${won(SITE.shipping.freeOver)}원 이상 무료배송</span>`}</dd>
              <dt>판매단위</dt><dd>${esc(p.unit)}</dd>
              <dt>포장타입</dt><dd>${esc(p.pack)}</dd>
              <dt>원산지</dt><dd>${esc(p.origin)}</dd>
              ${p.soon || p.ticket && INQUIRY() ? "" : `<dt>수량</dt><dd><div class="qty"><button data-q="-1" aria-label="수량 빼기" ${qty <= 1 ? "disabled" : ""}>−</button><span class="num">${qty}</span><button data-q="1" aria-label="수량 더하기">+</button></div></dd>`}
            </dl>
            ${p.soon ? `<div class="d-total"><span class="lbl">오픈을 준비하고 있어요. 조금만 기다려 주세요!</span></div>` : p.price ? `<div class="d-total"><span class="lbl">총 상품금액:</span><span class="v num">${won(p.price * qty)}</span><span>원</span></div>` : `<div class="d-total"><span class="lbl">금액은 문의 후 안내해 드려요</span></div>`}
            <div class="d-actions">${p.soon
              ? `<button class="btn primary" disabled>오픈 예정이에요</button>`
              : p.ticket && INQUIRY()
              ? `<a class="btn primary" href="reserve.html?id=${p.id}">${isStay(p) ? "숙박" : "체험"} 예약 문의하기</a>`
              : `<button class="btn ghost" data-addqty>장바구니 담기</button>
              <button class="btn primary" data-buynow>${INQUIRY() ? "구매 문의" : "바로 구매"}</button>`}
            </div>
            ${demoBox()}
          </div>
        </div>`;
    };
    // 관리자 시연: 상세 화면에서 바로 테스트 결제
    let isAdm = false;
    const demoBox = () => !isAdm || p.soon ? "" : p.ticket
      ? `<div class="demo-pay pd-demo"><div class="demo-h"><span class="pill">관리자 시연</span><b>테스트 결제</b></div><p class="mode-note">${p.price ? "예약 화면에서 일정을 고른 뒤 테스트 결제할 수 있어요." : "판매가가 없어 결제할 수 없어요. 상품 관리에서 판매가를 입력해 주세요."}</p>${p.price ? `<a class="btn primary" href="reserve.html?id=${p.id}">일정 고르고 테스트 결제</a>` : ""}</div>`
      : `<div class="demo-pay pd-demo"><div class="demo-h"><span class="pill">관리자 시연</span><b>테스트 결제</b></div><p class="mode-note">실제 돈은 나가지 않아요.</p><button class="btn primary" data-demobuy>${p.price ? `${won(p.price * qty)}원 테스트 결제로 바로 구매` : "가격 문의 상품은 결제할 수 없어요"}</button></div>`;
    amAdmin().then(ok => { isAdm = ok; if (ok) draw(); });
    top.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if ("demobuy" in t.dataset) { if (!p.price) return toast("가격 문의 상품은 결제할 수 없어요"); store.set("fg_buynow", [{ id: p.id, qty }], sessionStorage); location.href = "order.html?from=buynow&pay=test"; return; }
      if (t.dataset.q) { qty = Math.max(1, Math.min(99, qty + +t.dataset.q)); draw(); }
      if ("addqty" in t.dataset) addToCart(p.id, qty);
      if ("buynow" in t.dataset) { store.set("fg_buynow", [{ id: p.id, qty }], sessionStorage); location.href = "order.html?from=buynow"; }
    });
    draw();

    // 탭: 헤더 바로 아래에 붙고, 스크롤 위치에 따라 현재 탭 표시
    const setHH = () => document.documentElement.style.setProperty("--hh", ($("header.site") ? $("header.site").offsetHeight : 0) + "px");
    setHH(); addEventListener("resize", setHH);
    const tabs = [...view.querySelectorAll("[data-ptab]")];
    let ticking = false;
    addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const line = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--hh")) || 0) + 80;
        let cur = TABS[0][0];
        for (const [k] of TABS) { const s = $("#tab-" + k); if (s && s.getBoundingClientRect().top <= line) cur = k; }
        tabs.forEach(a => a.setAttribute("aria-current", a.dataset.ptab === cur));
      });
    }, { passive: true });

    const next = encodeURIComponent(`product.html?id=${p.id}`);
    const loginPrompt = what => `<div class="pnote">${what}는 회원만 쓸 수 있어요. <a href="login.html?next=${next}">카카오로 로그인하기 ›</a></div>`;
    const stars = n => `<span class="stars" aria-label="5점 만점에 ${n}점">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`;

    /* 후기 */
    const revBox = $("#revBox");
    async function loadReviews() {
      if (!SB) { revBox.innerHTML = `<p class="empty" style="padding-block:40px">후기 기능은 준비 중이에요.</p>`; return; }
      const { data, error } = await SB.from("reviews").select("id,user_id,name,rating,content,hidden,created_at").eq("product_id", p.id).order("created_at", { ascending: false }).limit(200);
      if (error) { revBox.innerHTML = `<p class="empty" style="padding-block:40px">후기를 불러오지 못했어요.</p>`; return; }
      const shown = data.filter(r => !r.hidden);
      const mine = USER && data.find(r => r.user_id === USER.id);
      const avg = shown.length ? shown.reduce((s, r) => s + r.rating, 0) / shown.length : 0;
      $("#cnt-review").textContent = shown.length ? ` (${shown.length})` : "";
      revBox.innerHTML = `
        <div class="rev-sum">
          <div class="rev-avg"><b class="num">${shown.length ? avg.toFixed(1) : "-"}</b>${stars(Math.round(avg))}<span class="num">${shown.length}개 후기</span></div>
          <div class="rev-bars">${[5, 4, 3, 2, 1].map(n => { const c = shown.filter(r => r.rating === n).length; return `<div><span>${n}점</span><i><em style="width:${shown.length ? c / shown.length * 100 : 0}%"></em></i><span class="num">${c}</span></div>`; }).join("")}</div>
        </div>
        ${!isMember() ? loginPrompt("후기") : mine ? `<div class="pnote">이 상품에 후기를 남기셨어요. 감사합니다!</div>` : `
          <form class="pform" id="revForm" novalidate>
            <div class="star-pick" role="radiogroup" aria-label="별점">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="rating" value="${n}" ${n === 5 ? "checked" : ""}><span aria-hidden="true">★</span><span class="sr">${n}점</span></label>`).join("")}</div>
            <textarea id="revText" maxlength="1000" rows="3" placeholder="상품은 어떠셨나요? 맛, 품질, 체험 소감을 10자 이상 남겨 주세요"></textarea>
            <div class="pform-f"><span class="mode-note">작성자 이름은 가려서(예: 조*인) 보여요.</span><button class="btn primary">후기 등록</button></div>
          </form>`}
        <div class="plist">${data.length ? data.map(r => `
          <article class="pitem">
            <div class="pitem-h">${stars(r.rating)}<span>${esc(r.name || "회원")}</span><span class="num">${fmtDate(r.created_at).slice(0, 12)}</span>
              ${USER && r.user_id === USER.id ? `<button class="plink" data-del-rev="${r.id}">삭제</button>` : ""}</div>
            ${r.hidden ? `<p class="mode-note">관리자가 숨긴 후기예요. 다른 고객에게는 보이지 않아요.</p>` : ""}
            <p class="pitem-b">${esc(r.content)}</p>
          </article>`).join("") : `<p class="empty" style="padding-block:40px">아직 후기가 없어요. 첫 후기를 남겨 주세요!</p>`}</div>`;
      const f = $("#revForm");
      if (f) f.onsubmit = async e => {
        e.preventDefault();
        const content = $("#revText").value.trim(), rating = +$("[name=rating]:checked", f).value;
        if (content.length < 10) return toast("후기를 10자 이상 적어 주세요");
        const { error: er } = await SB.from("reviews").insert({ product_id: p.id, rating, content });
        if (er) return toast(er.code === "23505" ? "이미 후기를 남기셨어요" : `후기를 등록하지 못했어요: ${er.message}`);
        toast("후기를 등록했어요. 감사합니다!"); loadReviews();
      };
    }
    revBox.addEventListener("click", async e => {
      const b = e.target.closest("[data-del-rev]"); if (!b || !confirm("후기를 삭제할까요?")) return;
      const { error } = await SB.from("reviews").delete().eq("id", b.dataset.delRev);
      if (error) return toast(`삭제하지 못했어요: ${error.message}`);
      toast("후기를 삭제했어요"); loadReviews();
    });

    /* 상품 문의 */
    const qnaBox = $("#qnaBox");
    async function loadQna() {
      if (!SB) { qnaBox.innerHTML = `<p class="empty" style="padding-block:40px">상품 문의 기능은 준비 중이에요.</p>`; return; }
      const { data, error } = await SB.from("questions").select("id,user_id,name,question,is_secret,answer,answered_at,created_at").eq("product_id", p.id).order("created_at", { ascending: false }).limit(200);
      if (error) { qnaBox.innerHTML = `<p class="empty" style="padding-block:40px">문의를 불러오지 못했어요.</p>`; return; }
      $("#cnt-qna").textContent = data.length ? ` (${data.length})` : "";
      qnaBox.innerHTML = `
        <p class="mode-note" style="margin:0 0 14px">상품에 대해 궁금한 점을 남겨 주시면 답변해 드려요. 구매·체험 예약은 <b>구매 문의</b>로 남겨 주시면 더 빨리 연락드려요.</p>
        ${!isMember() ? loginPrompt("상품 문의") : `
          <form class="pform" id="qnaForm" novalidate>
            <textarea id="qnaText" maxlength="1000" rows="3" placeholder="궁금한 점을 적어 주세요 (5자 이상)"></textarea>
            <div class="pform-f"><label class="chk"><input type="checkbox" id="qnaSecret">비밀글 (나와 관리자만 보기)</label><button class="btn primary">문의 등록</button></div>
          </form>`}
        <div class="plist">${data.length ? data.map(q => `
          <article class="pitem">
            <div class="pitem-h"><span class="st ${q.answer ? "" : "st-q-new"}">${q.answer ? "답변완료" : "답변대기"}</span>${q.is_secret ? `<span class="pill">비밀글</span>` : ""}<span>${esc(q.name || "회원")}</span><span class="num">${fmtDate(q.created_at).slice(0, 12)}</span>
              ${USER && q.user_id === USER.id && !q.answer ? `<button class="plink" data-del-q="${q.id}">삭제</button>` : ""}</div>
            <p class="pitem-b"><b class="qa">Q</b>${esc(q.question)}</p>
            ${q.answer ? `<div class="pans"><b class="qa">A</b><div><p>${esc(q.answer)}</p><span class="mode-note num">${esc(SITE.name)} · ${fmtDate(q.answered_at).slice(0, 12)}</span></div></div>` : ""}
          </article>`).join("") : `<p class="empty" style="padding-block:40px">아직 문의가 없어요.</p>`}</div>`;
      const f = $("#qnaForm");
      if (f) f.onsubmit = async e => {
        e.preventDefault();
        const question = $("#qnaText").value.trim();
        if (question.length < 5) return toast("문의 내용을 5자 이상 적어 주세요");
        const { error: er } = await SB.from("questions").insert({ product_id: p.id, question, is_secret: $("#qnaSecret").checked });
        if (er) return toast(`문의를 등록하지 못했어요: ${er.message}`);
        toast("문의를 등록했어요. 답변을 기다려 주세요!"); loadQna();
      };
    }
    qnaBox.addEventListener("click", async e => {
      const b = e.target.closest("[data-del-q]"); if (!b || !confirm("문의를 삭제할까요?")) return;
      const { error } = await SB.from("questions").delete().eq("id", b.dataset.delQ);
      if (error) return toast(`삭제하지 못했어요: ${error.message}`);
      toast("문의를 삭제했어요"); loadQna();
    });
    Promise.all([loadReviews(), loadQna()]).then(() => {
      // product.html?id=…#tab-review 처럼 들어오면 내용이 그려진 뒤 그 탭으로 이동
      const s = /^#tab-\w+$/.test(location.hash) && $(location.hash);
      if (s) s.scrollIntoView();
    });
  }

  /* 상품설명 — products.json 의 story */
  function storyHtml(p) {
    const blocks = p.story || (p.detail ? [{ title: p.sub, text: p.detail }] : []);
    const [bg, fg] = p.tile || ["#f4f5f3", "#1f2119"];
    return `<div class="story">
      <figure class="story-hero">${p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
        : `<div class="story-tile" style="background:${esc(bg)};color:${esc(fg)}"><span>${esc(SITE.nameEn)}</span><b>${esc(p.name)}</b></div>`}
        <figcaption><span>${esc(SITE.nameEn)}</span><h3>${esc(p.name)}</h3><p>${esc(p.sub)}</p></figcaption></figure>
      ${blocks.map((b, i) => `<div class="story-b">
        <span class="story-no num">${String(i + 1).padStart(2, "0")}</span>
        <h4>${esc(b.title)}</h4><p>${esc(b.text)}</p>
        ${b.list ? `<ul>${b.list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")}
    </div>`;
  }

  /* 상세정보 — 상품정보 제공고시 + 배송·교환 안내 */
  function infoHtml(p) {
    const c = SITE.company;
    const rows = p.ticket
      ? (isStay(p) ? [["숙소명", p.name], ["운영", c.corpName], ...(p.info || [])] : [["체험명", p.name], ["운영", `${c.corpName} · 이리저리 체험관`], ...(p.info || [])])
      : [["품목 또는 명칭", p.name], ["포장단위별 용량(중량) · 수량", p.unit], ["원산지", p.origin], ["포장타입", p.pack], ["판매자", c.corpName], ...(p.info || [])];
    rows.push(["소비자상담 관련 전화번호", `${SITE.cs.tel} · ${c.email}`]);
    const guide = p.ticket
      ? [["예약 · 변경", "구매 문의로 희망 날짜·인원을 남겨 주시면 연락드려 일정을 확정해요."], ["취소 · 환불", "예약 확정 후 취소·환불 기준은 상담 시 안내해 드려요."]]
      : [["배송", `산지직송 · ${SITE.shipping.cutoff} · ${won(SITE.shipping.freeOver)}원 이상 무료배송 (미만 시 ${won(SITE.shipping.fee)}원)`],
         ["교환 · 반품", "상품이 표시·광고와 다르거나 파손·변질된 경우 받으신 날부터 3개월, 그 사실을 안 날부터 30일 안에 교환·환불해 드려요. 사진과 함께 고객센터로 연락해 주세요."],
         ["단순 변심", "농산물은 신선식품이라 받으신 뒤 가치가 떨어지기 쉬워, 단순 변심에 의한 반품은 어려울 수 있어요."]];
    const table = (title, list) => `<h4 class="info-h">${title}</h4><table class="info-t">${list.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`;
    return table(p.ticket ? (isStay(p) ? "숙소 정보" : "체험 정보") : "상품정보 제공고시", rows) + table(p.ticket ? "예약 · 취소 안내" : "배송 · 교환 · 반품 안내", guide)
      + `<p class="mode-note" style="margin-top:10px">자세한 기준은 <a href="terms.html" style="text-decoration:underline">이용약관</a>을 확인해 주세요.</p>`;
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
        ${summaryBox(totals(cart), `<a class="btn primary" href="order.html">${INQUIRY() ? "구매 문의하기" : "주문하기"}</a>${INQUIRY() ? `<div id="cartDemo"></div>` : ""}`)}
      </div></div>`;
    };
    const demo = () => amAdmin().then(ok => { const d = $("#cartDemo"); if (ok && d) d.innerHTML = `<a class="btn ghost demo-link" href="order.html?pay=test"><span class="pill">관리자 시연</span>테스트 결제로 주문하기</a>`; });
    view.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.lq) { const l = cart.find(x => x.id === t.dataset.lq); l.qty = Math.max(1, Math.min(99, l.qty + +t.dataset.d)); }
      else if (t.dataset.del) cart = cart.filter(x => x.id !== t.dataset.del);
      else if ("clear" in t.dataset) cart = [];
      else return;
      saveCart(); draw(); demo();
    });
    draw(); demo();
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
    // 결제 보류 중에도 관리자는 order.html?pay=test 로 테스트 결제 시연 가능 (서버가 관리자인지 다시 확인)
    const demoPay = INQUIRY() && params.get("pay") === "test";
    if (INQUIRY() && !demoPay) return pageInquiry(view);

    const fromBuyNow = params.get("from") === "buynow";
    const lines = (fromBuyNow ? store.get("fg_buynow", [], sessionStorage) : cart).filter(l => byId(l.id)).map(l => ({ ...l }));
    if (!lines.length) { view.innerHTML = msgPage("주문할 상품이 없어요.", `<a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a>`); return; }
    const me = isMember();
    const t = totals(lines, await firstOrderRate());
    const saved = me ? { name: PROFILE.name, tel: PROFILE.phone, addr: PROFILE.address } : store.get("fg_ship", {});
    const perk = Number(SITE.member && SITE.member.firstOrderDiscount) || 0;
    const here = "order.html" + (fromBuyNow ? "?from=buynow" : "");
    view.innerHTML = `<div class="wrap"><div class="page-title"><h2>주문서</h2>${demoPay ? `<p><span class="pill">관리자 시연</span> 테스트 결제 화면이에요. 실제 돈은 나가지 않아요.</p>` : ""}</div><div class="two">
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
            <div class="field"><label for="i-addr">${needAddr ? "배송 주소" : "주소 (선택)"}</label><input id="i-addr" maxlength="200" value="${esc(saved.addr || "")}" placeholder="${needAddr ? "도로명 주소와 상세 주소" : "체험·숙박만 문의하시면 비워 두셔도 돼요"}" autocomplete="street-address"></div>
            <div class="field top"><label for="i-msg">문의 내용</label><textarea id="i-msg" maxlength="1000" rows="4" placeholder="${lines.some(l => isStay(byId(l.id))) ? "체크인·체크아웃 날짜, 인원, 궁금한 점을 적어 주세요" : quote ? "체험 희망 날짜·인원, 궁금한 점을 적어 주세요" : "받고 싶은 날짜, 궁금한 점을 적어 주세요 (선택)"}"></textarea></div>
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

  // 관리자 계정인지 서버에 한 번만 확인 (테스트 결제 시연 버튼용)
  let ADMIN_P = null;
  const amAdmin = () => ADMIN_P || (ADMIN_P = isMember() && API() ? api("/me", null, "GET").then(r => !!r.isAdmin).catch(() => false) : Promise.resolve(false));

  /* ---------- 페이지: 예약·1:1 문의 ---------- */
  const ymdLocal = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const addDays = (ymd, n) => { const d = new Date(ymd + "T00:00:00"); d.setDate(d.getDate() + n); return ymdLocal(d); };
  const dayLabel = ymd => ymd ? `${ymd.slice(5, 7).replace(/^0/, "")}월 ${ymd.slice(8, 10).replace(/^0/, "")}일 (${"일월화수목금토"[new Date(ymd + "T00:00:00").getDay()]})` : "";
  const nightsOf = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
  const bookingWhen = b => b.kind === "stay"
    ? `${dayLabel(b.date_from)} → ${dayLabel(b.date_to)} · ${nightsOf(b.date_from, b.date_to)}박`
    : dayLabel(b.date_from) + (b.slot_time ? ` ${b.slot_time}` : "");
  const ymAdd = (ym, n) => { const d = new Date(ym + "-01T00:00:00"); d.setMonth(d.getMonth() + n); return ymdLocal(d).slice(0, 7); };
  // 한 달 달력: cell(날짜) → { cls, disabled, html }
  function monthGrid(ym, cell) {
    const first = new Date(ym + "-01T00:00:00"), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    let h = `<div class="cal-grid">${[..."일월화수목금토"].map((d, i) => `<b class="${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${d}</b>`).join("")}${"<span></span>".repeat(first.getDay())}`;
    for (let i = 1; i <= days; i++) {
      const d = `${ym}-${String(i).padStart(2, "0")}`, c = cell(d) || {};
      h += `<button type="button" class="cal-d ${c.cls || ""}" data-day="${d}" ${c.disabled ? "disabled" : ""}><span class="n">${i}</span>${c.html || ""}</button>`;
    }
    return h + "</div>";
  }

  function pageReserve(view) {
    document.title = `예약·1:1 문의 | ${SITE.name}`;
    setMeta(`${SITE.name} 이리저리 체험관·숙박 예약과 1:1 문의를 남겨 주세요. 확인 후 연락드려요.`, "reserve.html");
    const tickets = PRODUCTS.filter(p => p.ticket && !p.soon);
    let sel = (tickets.find(p => p.id === params.get("id")) || {}).id || (params.get("type") === "general" ? "" : (tickets[0] || {}).id || "");
    const me = isMember();
    const saved = me ? { name: PROFILE.name, tel: PROFILE.phone } : store.get("fg_ship", {});
    const today = ymdLocal();
    const opt = (p) => `<option value="${p.id}" ${sel === p.id ? "selected" : ""}>${esc(p.name)}</option>`;
    const groups = [["craft", "이리저리 체험관"], ["stay", "숙박"]].map(([c, label]) => {
      const list = tickets.filter(p => (p.cat === "stay" ? "stay" : "craft") === c);
      return list.length ? `<optgroup label="${label}">${list.map(opt).join("")}</optgroup>` : "";
    }).join("");
    view.innerHTML = `<div class="wrap narrow"><div class="page-title"><h2>예약·1:1 문의</h2><p>남겨 주신 연락처로 확인 후 연락드려요. 예약은 상담 후 확정돼요.</p></div>
      <form class="box" id="rsvForm" novalidate>
        <div class="form">
          <div class="field"><label for="r-what">문의 종류</label><select id="r-what">${groups}<option value="" ${sel ? "" : "selected"}>1:1 문의 (상품·배송·기타)</option></select></div>
          <div id="r-pick"></div>
          <div class="field"><label for="r-name">이름</label><input id="r-name" maxlength="30" value="${esc(saved.name || "")}" placeholder="이름" autocomplete="name"></div>
          <div class="field"><label for="r-tel">휴대폰</label><input id="r-tel" maxlength="13" value="${esc(saved.tel || "")}" placeholder="010-0000-0000" inputmode="tel" autocomplete="tel"></div>
          <div class="field top"><label for="r-msg">문의 내용</label><textarea id="r-msg" maxlength="1000" rows="5"></textarea></div>
          <input id="r-web" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        </div>
        <label class="chk agree-pay"><input type="checkbox" id="r-agree"><span>[필수] 예약·상담을 위한 <a href="privacy.html" target="_blank">개인정보 수집·이용</a>(이름, 휴대폰, 문의 내용 · 상담 완료 후 1년 보관)에 동의합니다.</span></label>
        <button class="btn primary" id="rsvBtn" type="button">문의 보내기</button>
        <div id="r-pay"></div>
      </form>
      <div style="height:48px"></div></div>`;

    const pick = $("#r-pick"), msg = $("#r-msg");
    // 체험: 관리자가 만든 일정(회차)이 있으면 그중에서 고르고, 없으면 희망 날짜를 직접 입력
    // 숙박: 달력에서 예약 불가 날짜를 피해 체크인·체크아웃을 고름
    let mode = "date", slots = [], slotId = 0, busy = new Set(), calYm = today.slice(0, 7), ci = "", co = "", seq = 0;
    const pplMax = () => { const s = slots.find(x => x.id === slotId); return s ? s.left : 99; };
    const pplHtml = n => `<div class="field"><label>인원</label><div><div class="qty"><button type="button" data-p="-1" aria-label="인원 빼기">−</button><span class="num" id="r-ppl">${n}</span><button type="button" data-p="1" aria-label="인원 더하기">+</button></div><span class="mode-note" style="margin-left:8px">명</span></div></div>`;
    let slotDate = "", slotYm = "";
    const drawSlots = () => {
      const byDate = {};
      slots.forEach(x => (byDate[x.date] = byDate[x.date] || []).push(x));
      const months = [...new Set(slots.map(x => x.date.slice(0, 7)))];
      if (!slotDate) { const f = slots.find(x => x.left > 0) || slots[0]; slotDate = f.date; slotYm = f.date.slice(0, 7); }
      const cell = d => {
        const l = byDate[d]; if (!l) return { disabled: true };
        const open = l.some(x => x.left > 0);
        return { cls: (open ? "avail" : "full") + (d === slotDate ? " ci" : ""), disabled: !open };
      };
      $("#r-slots").innerHTML = `<div class="cal"><div class="cal-h"><button type="button" data-scal="-1" ${slotYm <= months[0] ? "disabled" : ""} aria-label="이전 달">‹</button><b>${slotYm.slice(0, 4)}년 ${+slotYm.slice(5)}월</b><button type="button" data-scal="1" ${slotYm >= months[months.length - 1] ? "disabled" : ""} aria-label="다음 달">›</button></div>
        ${monthGrid(slotYm, cell)}
        <p class="cal-legend"><span class="lg avail"></span>예약 가능 <span class="lg full"></span>마감</p></div>
        <div class="slot-times">${slotDate && byDate[slotDate] ? `<b>${dayLabel(slotDate)}</b><div>${byDate[slotDate].map(x =>
          `<button type="button" class="slot-btn" data-slot="${x.id}" aria-pressed="${slotId === x.id}" ${x.left ? "" : "disabled"}>${esc(x.time)}<small>${x.left ? `남은 자리 ${x.left} / ${x.capacity || x.left}` : "정원 마감"}</small></button>`).join("")}</div>`
          : `<p class="mode-note">달력에서 예약 가능한(초록) 날짜를 골라 주세요</p>`}</div>`;
      const sl = slots.find(x => x.id === slotId);
      $("#r-when").textContent = sl ? `${dayLabel(sl.date)} ${sl.time} · 남은 자리 ${sl.left}명` : "시간을 골라 주세요";
      payPaint();
    };
    const drawCal = () => {
      const inRange = d => ci && co && d > ci && d < co;
      const cell = d => {
        const past = d < today, off = busy.has(d);
        // 체크인을 고른 뒤에는 체크아웃 날(그날 밤은 안 묵음)은 막힌 날이어도 고를 수 있음
        const canOut = ci && !co && d > ci && ![...busy].some(b => b >= ci && b < d);
        return { cls: [off ? "off" : "", d === ci ? "ci" : "", d === co ? "co" : "", inRange(d) ? "in" : ""].join(" "), disabled: past || (off && !canOut) };
      };
      $("#r-cal").innerHTML = `<div class="cal-h"><button type="button" data-cal="-1" ${calYm <= today.slice(0, 7) ? "disabled" : ""} aria-label="이전 달">‹</button><b>${calYm.replace("-", "년 ").replace(/^(\d+년 )0?/, "$1")}월</b><button type="button" data-cal="1" aria-label="다음 달">›</button></div>
        ${monthGrid(calYm, cell)}
        <p class="cal-legend"><span class="lg off"></span>예약 불가 <span class="lg ci"></span>선택한 날</p>`;
      $("#r-from").value = ci; $("#r-to").value = co;
      setTimeout(payPaint);
      $("#r-when").textContent = ci && co ? `${dayLabel(ci)} → ${dayLabel(co)} · ${nightsOf(ci, co)}박` : ci ? `체크인 ${dayLabel(ci)} · 체크아웃 날짜를 골라 주세요` : "체크인 날짜를 골라 주세요";
    };
    const drawPick = async () => {
      const p = byId(sel), my = ++seq;
      slotId = 0; ci = co = ""; mode = "date";
      if (!p) {
        pick.innerHTML = "";
        msg.placeholder = "궁금하신 점을 자유롭게 적어 주세요";
        return;
      }
      const stay = isStay(p);
      const head = `<div class="rsv-prod">${visual(p)}<div><b>${esc(p.name)}</b><span>${esc(p.sub)}</span>${p.price ? `<span class="rsv-price num">${stay ? "1박" : "1인"} ${won(p.price)}원</span>` : ""}<a href="product.html?id=${p.id}">상품 자세히 보기 ›</a></div></div>`;
      const dateInputs = `<div class="field"><label for="r-from">${stay ? "체크인" : "희망 날짜"}</label><input type="date" id="r-from" min="${today}" value=""></div>
        ${stay ? `<div class="field"><label for="r-to">체크아웃</label><input type="date" id="r-to" min="${addDays(today, 1)}" value=""></div>` : ""}`;
      msg.placeholder = stay ? "도착 예정 시간, 요청 사항, 궁금한 점을 적어 주세요 (선택)" : "단체 여부, 궁금한 점을 적어 주세요 (선택)";
      pick.innerHTML = head + `<p class="loading" style="padding-block:12px">일정을 불러오는 중이에요</p>`;
      let data = null;
      if (API()) try { data = await api(`/${stay ? "stay" : "slots"}?product=${encodeURIComponent(p.id)}`, null, "GET"); } catch { data = null; }
      if (my !== seq) return;   // 그사이 다른 상품을 고름
      if (!stay && data && data.slots && data.slots.length) {
        mode = "slot"; slots = data.slots;
        slotDate = ""; pick.innerHTML = head + `<div class="field top"><label>체험 일정</label><div id="r-slots" class="slot-cal"></div></div><input type="hidden" id="r-from">` + pplHtml(1) + `<p class="mode-note rsv-note" id="r-when"></p>`;
        drawSlots();
      } else if (stay && data && data.unavailable) {
        mode = "cal"; busy = new Set(data.unavailable); calYm = today.slice(0, 7);
        pick.innerHTML = head + `<div class="field top"><label>숙박 일정</label><div id="r-cal" class="cal"></div></div><input type="hidden" id="r-from"><input type="hidden" id="r-to">` + pplHtml(2) + `<p class="mode-note rsv-note" id="r-when"></p>`;
        drawCal();
      } else {
        pick.innerHTML = head + dateInputs + pplHtml(stay ? 2 : 1) + `<p class="mode-note rsv-note" id="r-when"></p>`;
      }
    };
    const showWhen = () => {
      payPaint();
      if (mode !== "date") return;
      const f = $("#r-from"), t = $("#r-to"), w = $("#r-when"); if (!f || !w) return;
      if (t) { t.min = f.value ? addDays(f.value, 1) : addDays(today, 1); if (f.value && (!t.value || t.value <= f.value)) t.value = addDays(f.value, 1); }
      w.textContent = !f.value ? "" : t && t.value ? `${dayLabel(f.value)} → ${dayLabel(t.value)} · ${nightsOf(f.value, t.value)}박` : t ? "" : dayLabel(f.value);
    };
    drawPick();
    $("#r-what").onchange = e => { sel = e.target.value; drawPick(); history.replaceState(null, "", sel ? `reserve.html?id=${sel}` : "reserve.html?type=general"); };
    pick.addEventListener("input", showWhen);
    pick.addEventListener("click", e => {
      const b = e.target.closest("[data-p]");
      if (b) { const el = $("#r-ppl"); el.textContent = Math.max(1, Math.min(pplMax(), +el.textContent + +b.dataset.p)); if (+b.dataset.p > 0 && +el.textContent >= pplMax() && mode === "slot") toast(`이 일정은 ${pplMax()}명까지 예약할 수 있어요`); return payPaint(); }
      const sb = e.target.closest("[data-slot]");
      if (sb) {
        slotId = +sb.dataset.slot; const s = slots.find(x => x.id === slotId);
        $("#r-from").value = s.date;
        const el = $("#r-ppl"); if (+el.textContent > s.left) el.textContent = s.left;
        return drawSlots();
      }
      const sc = e.target.closest("[data-scal]");
      if (sc) { slotYm = ymAdd(slotYm, +sc.dataset.scal); return drawSlots(); }
      const cb = e.target.closest("[data-cal]");
      if (cb) { calYm = ymAdd(calYm, +cb.dataset.cal); return drawCal(); }
      const db = e.target.closest("[data-day]");
      if (db && mode === "slot") { slotDate = db.dataset.day; slotId = 0; return drawSlots(); }
      if (db && mode === "cal") {
        const d = db.dataset.day;
        if (ci && !co && d > ci && ![...busy].some(x => x >= ci && x < d)) co = d;
        else if (!busy.has(d)) { ci = d; co = ""; }
        return drawCal();
      }
    });

    // 입력값 모으기 (예약 문의 · 테스트 결제 공통). 빠진 게 있으면 안내하고 null
    const collect = () => {
      const p = byId(sel), stay = p && isStay(p);
      const body = { productId: p ? p.id : "", name: $("#r-name").value.trim(), tel: $("#r-tel").value.trim(), message: msg.value.trim(), website: $("#r-web").value };
      const no = m => { toast(m); return null; };
      if (p) {
        if (!$("#r-ppl")) return no("일정을 불러오는 중이에요. 잠시만 기다려 주세요");
        if (mode === "slot" && !slotId) return no("체험 일정을 골라 주세요");
        if (mode === "cal" && !(ci && co)) return no(ci ? "체크아웃 날짜를 골라 주세요" : "체크인 날짜를 골라 주세요");
        if (mode === "slot") body.slotId = slotId;
        body.dateFrom = $("#r-from").value; body.people = +$("#r-ppl").textContent;
        if (!body.dateFrom) return no(stay ? "체크인 날짜를 선택해 주세요" : "희망 날짜를 선택해 주세요");
        if (body.dateFrom < today) return no("지난 날짜는 선택할 수 없어요");
        if (stay) { body.dateTo = $("#r-to").value; if (!body.dateTo || body.dateTo <= body.dateFrom) return no("체크아웃 날짜를 확인해 주세요"); }
      } else if (!body.message) { msg.focus(); return no("문의 내용을 입력해 주세요"); }
      if (!body.name) { $("#r-name").focus(); return no("이름을 입력해 주세요"); }
      if (!/^0\d{8,10}$/.test(body.tel.replace(/\D/g, ""))) { $("#r-tel").focus(); return no("휴대폰 번호를 확인해 주세요"); }
      if (!$("#r-agree").checked) return no("개인정보 수집·이용에 동의해 주세요");
      return body;
    };

    // 관리자 시연: 테스트 결제 (손님에게는 안 보임)
    let isAdm = false;
    function payQty() {
      const p = byId(sel); if (!p || !p.ticket) return 0;
      if (isStay(p)) { const f = $("#r-from"), t = $("#r-to"); return f && t && f.value && t.value > f.value ? nightsOf(f.value, t.value) : 0; }
      return $("#r-ppl") ? +$("#r-ppl").textContent : 0;
    }
    function payPaint() {
      const box = $("#r-pay"); if (!box || !isAdm) return;
      const p = byId(sel);
      if (!p) { box.innerHTML = ""; return; }
      const q = payQty(), amt = p.price * q;
      box.innerHTML = `<div class="demo-pay"><div class="demo-h"><span class="pill">관리자 시연</span><b>테스트 결제</b></div>
        ${p.price ? `<p class="mode-note">${isStay(p) ? `1박 ${won(p.price)}원 × ${q || "-"}박` : `1인 ${won(p.price)}원 × ${q}명`} · 실제 돈은 나가지 않아요. 결제하면 예약이 바로 '예약확정'돼요.</p>
          <button class="btn primary" type="button" data-testpay ${amt ? "" : "disabled"}>${amt ? `${won(amt)}원 테스트 결제하기` : isStay(p) ? "체크인·체크아웃을 골라 주세요" : "일정을 골라 주세요"}</button>`
        : `<p class="mode-note">판매가가 없어 결제할 수 없어요. 관리자 &gt; 상품 관리에서 판매가를 입력해 주세요.</p>`}</div>`;
    }
    amAdmin().then(ok => { isAdm = ok; payPaint(); });
    view.addEventListener("click", async e => {
      const t = e.target.closest("[data-testpay]"); if (!t) return;
      const body = collect(); if (!body) return;
      t.disabled = true;
      try {
        const { order } = await api("/reserve/checkout", body);
        openSimulator(order, "test", async () => {
          try {
            const r = await api("/test/pay", { orderNo: order.order_no });
            document.title = `테스트 결제 완료 | ${SITE.name}`;
            view.innerHTML = `<div class="wrap"><div class="done">
              <div class="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
              <h2>테스트 결제가 완료되었어요</h2>
              <p style="color:var(--sub);margin:0">실제 결제는 일어나지 않았어요. 예약은 '예약확정'으로 저장됐어요.</p>
              <dl>
                <dt>주문번호</dt><dd class="num"><b>${esc(r.order.order_no)}</b></dd>
                ${r.booking ? `<dt>예약번호</dt><dd class="num">${esc(r.booking.booking_no)}</dd>` : ""}
                <dt>상품</dt><dd>${esc(r.order.product_name)}</dd>
                <dt>결제금액</dt><dd class="num"><b>${won(r.order.total)}원</b></dd>
              </dl>
              <div class="d-actions"><a class="btn ghost" href="admin.html?sec=order">관리자 › 주문에서 상태 변경·결제 취소</a><a class="btn primary" href="admin.html?sec=booking&tab=confirmed">예약 확인</a></div>
            </div></div>`;
            window.scrollTo({ top: 0 });
          } catch (err) { toast(err.message); payPaint(); }
        }, () => payPaint());
      } catch (err) { toast(err.message); t.disabled = false; }
    });

    $("#rsvBtn").onclick = async () => {
      const p = byId(sel), stay = p && isStay(p);
      const body = collect(); if (!body) return;
      if (!API()) return toast("예약·문의 접수는 준비 중이에요. 고객행복센터로 연락해 주세요");
      const btn = $("#rsvBtn"); btn.disabled = true;
      try {
        const { booking } = await api("/booking", body);
        if (!me) store.set("fg_ship", { ...store.get("fg_ship", {}), name: body.name, tel: body.tel });
        document.title = `문의 접수 완료 | ${SITE.name}`;
        const sl = slots.find(x => x.id === slotId);
        const b = { kind: p ? (stay ? "stay" : "craft") : "general", date_from: body.dateFrom, date_to: body.dateTo, slot_time: mode === "slot" && sl ? sl.time : "" };
        view.innerHTML = `<div class="wrap"><div class="done">
          <div class="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
          <h2>${p ? "예약 문의가" : "문의가"} 접수되었어요</h2>
          <p style="color:var(--sub);margin:0">확인 후 <b class="num">${esc(body.tel)}</b> 로 연락드릴게요.${p ? "<br>예약은 상담 후 확정돼요." : ""}</p>
          <dl>
            <dt>접수번호</dt><dd class="num"><b>${esc(booking.booking_no)}</b></dd>
            ${p ? `<dt>상품</dt><dd>${esc(p.name)}</dd><dt>${stay ? "일정" : "희망 날짜"}</dt><dd>${bookingWhen(b)}</dd><dt>인원</dt><dd>${body.people}명</dd>` : `<dt>종류</dt><dd>1:1 문의</dd>`}
          </dl>
          <div class="d-actions"><a class="btn primary" href="index.html">홈으로</a></div>
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
  function openSimulator(order, method, onOk, onCancel) {
    const root = $("#modalRoot"), p = PAYS[method] || { name: "테스트", cls: "primary" };
    root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="simTitle">
      <div class="sheet-h ${p.cls}"><span id="simTitle">${p.name} 결제 시뮬레이터</span><button aria-label="닫기" data-close style="color:inherit;font-size:22px">×</button></div>
      <div class="sheet-b">
        <div class="warn">${PAYS[method] ? `테스트 화면입니다. 실제 ${p.name} 결제창이 아니며 결제가 일어나지 않습니다.` : "관리자 시연용 테스트 결제입니다. 실제 결제는 일어나지 않습니다."}${API() ? " 주문은 '테스트 결제'로 저장됩니다." : ""}</div>
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
      if (ev.target.id === "scrim" || ev.target.closest("[data-close]")) { close(); return onCancel && onCancel(); }
      if (ev.target.closest("[data-simfail]")) { close(); if (onCancel) onCancel(); return toast("결제가 취소되었어요"); }
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
  // 구매자 취소 요청 (결제완료 상태일 때만)
  const CANCEL_REASONS = ["단순 변심", "주문 실수 (상품·수량·옵션)", "배송·이용 일정이 맞지 않음", "다른 상품으로 다시 주문", "기타 (직접 입력)"];
  function cancelNote(o) {
    const c = o.cancel_req; if (!c) return "";
    if (c.state === "requested") return `<div class="creq st-req"><b>취소 요청 접수</b> · ${esc(c.reason)}${c.detail ? `<br><span>${esc(c.detail)}</span>` : ""}<br><small class="num">${fmtDate(c.at)} 요청 · 확인 후 처리해 드려요</small></div>`;
    if (c.state === "approved") return `<div class="creq st-ok"><b>취소 완료</b> · 구매자 요청 (${esc(c.reason)})<br><small>결제한 수단으로 환불돼요${o.method === "test" ? " (테스트 결제라 실제 환불은 없어요)" : ""}</small></div>`;
    if (c.state === "rejected") return `<div class="creq st-no"><b>취소 요청이 거절됐어요</b><br><span>${esc(c.answer || "")}</span><br><small>궁금한 점은 고객행복센터(${esc(SITE.cs.tel)})로 연락해 주세요</small></div>`;
    return "";
  }
  const canCancelReq = o => o.status === "paid" && !o.cancel_req;
  const cancelBtn = o => canCancelReq(o) ? `<div class="creq-act"><button class="btn ghost" data-creq="${esc(o.order_no)}">취소 요청</button><span class="mode-note">상품 준비가 시작되기 전까지 요청할 수 있어요</span></div>` : "";
  // 취소 요청 창. done(order) 는 접수 뒤 호출
  function openCancelForm(o, phone, done) {
    const root = $("#modalRoot");
    root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet creq-sheet" role="dialog" aria-modal="true" aria-labelledby="crTitle">
      <div class="sheet-h"><span id="crTitle">주문 취소 요청</span><button aria-label="닫기" data-close style="font-size:22px">×</button></div>
      <div class="sheet-b">
        <div class="r"><span>주문번호</span><span class="num">${esc(o.order_no)}</span></div>
        <div class="r"><span>상품</span><span style="text-align:right">${esc(o.product_name || (o.items || []).map(i => i.name).join(", "))}</span></div>
        <div class="r"><span>환불 예정 금액</span><b class="num">${won(o.total)}원</b></div>
        <div class="r"><span>환불 방법</span><span>${o.method === "test" ? "테스트 결제 (실제 환불 없음)" : `결제한 수단(${esc(payName(o.method))})으로 환불`}</span></div>
        <fieldset class="cr-reasons"><legend>취소 사유 <span class="req">필수</span></legend>
          ${CANCEL_REASONS.map((r, i) => `<label class="chk"><input type="radio" name="cr-reason" value="${esc(r)}" ${i === 0 ? "" : ""}><span>${esc(r)}</span></label>`).join("")}
        </fieldset>
        <label class="cr-detail"><span>자세한 내용 <small id="cr-need">(선택)</small></span><textarea id="cr-detail" rows="3" maxlength="500" placeholder="사장님께 전할 말이 있으면 적어 주세요"></textarea></label>
        <ul class="cr-notice">
          <li>사장님이 확인한 뒤 결제를 취소하고 환불해 드려요. 카드사에 따라 환불까지 3~7일 걸릴 수 있어요.</li>
          <li>상품 준비가 이미 시작됐다면 요청이 거절될 수 있어요.</li>
          ${o.booking ? "<li>체험·숙박 예약은 취소가 승인되면 예약도 함께 취소돼요.</li>" : ""}
        </ul>
        <label class="chk agree-pay"><input type="checkbox" id="cr-agree"><span>[필수] 위 내용을 확인했고 주문 취소를 요청합니다.</span></label>
      </div>
      <div class="sheet-f"><button class="btn ghost" data-close>닫기</button><button class="btn primary" data-cr-send>취소 요청하기</button></div>
    </div></div>`;
    const close = () => { root.innerHTML = ""; root.onclick = root.onchange = null; };
    root.onchange = e => { if (e.target.name === "cr-reason") $("#cr-need").textContent = e.target.value.startsWith("기타") ? "(필수)" : "(선택)"; };
    root.onclick = async ev => {
      if (ev.target.id === "scrim" || ev.target.closest("[data-close]")) return close();
      const b = ev.target.closest("[data-cr-send]"); if (!b) return;
      const r = $("[name=cr-reason]:checked", root), detail = $("#cr-detail").value.trim();
      if (!r) return toast("취소 사유를 골라 주세요");
      if (r.value.startsWith("기타") && !detail) { $("#cr-detail").focus(); return toast("취소 사유를 적어 주세요"); }
      if (!$("#cr-agree").checked) return toast("확인 항목에 체크해 주세요");
      b.disabled = true;
      try { const { order } = await api("/orders/cancel-request", { orderNo: o.order_no, reason: r.value, detail, phone }); close(); toast("취소 요청이 접수됐어요"); done(order); }
      catch (err) { toast(err.message); b.disabled = false; }
    };
  }

  function orderCard(o, extra = "") {
    return `<article class="ord">
      <div class="ord-h"><span class="num">${fmtDate(o.created_at)}</span><span class="st st-${esc(o.status)}">${STATUS[o.status] || esc(o.status)}</span>${o.cancel_req && o.cancel_req.state === "requested" ? `<span class="st st-q-new">취소 요청</span>` : ""}</div>
      <div class="ord-no num">주문번호 ${esc(o.order_no)}</div>
      <ul class="ord-items">${(o.items || []).map(i => `<li><span>${esc(i.name)}</span><span class="num">${i.qty}개</span></li>`).join("")}</ul>
      <div class="ord-f"><span>${esc(payName(o.method))}${o.discount ? ` · 할인 ${won(o.discount)}원` : ""}</span><b class="num">${won(o.total)}원</b></div>
      ${o.tracking_no ? `<div class="ord-track">${esc(o.courier || "택배")} 운송장 <span class="num">${esc(o.tracking_no)}</span></div>` : ""}
      ${cancelNote(o)}
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
    // 네이버 로그인: 검수 전까지 site.json 의 login.naver=false 로 고객에게는 숨김.
    // 단, 관리자 화면으로 가는 로그인(next=admin.html)에서는 보여 줌 (개발 중 앱이라 멤버관리에 등록한 네이버 아이디만 로그인됨)
    const adminLogin = next.startsWith("admin.html");
    const kakao = !!(SB && API() && L.kakao && L.kakaoRestKey), naver = !!(SB && API() && L.naverClientId && (L.naver !== false || adminLogin));
    const perk = Number(SITE.member && SITE.member.firstOrderDiscount) || 0;
    view.innerHTML = `<div class="wrap"><div class="auth">
      <div class="page-title"><h2>${adminLogin ? "관리자 로그인" : "로그인 · 회원가입"}</h2><p>${adminLogin ? "ADMIN_EMAILS 에 등록한 카카오·네이버 계정으로 로그인하세요" : `${[kakao && "카카오", naver && "네이버"].filter(Boolean).join("·") || "소셜"} 계정으로 바로 가입하고 로그인해요`}</p></div>
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
        <div class="ord-list">${error ? `<p class="empty">주문 내역을 불러오지 못했어요.</p>` : orders.length ? orders.map(o => orderCard(o, cancelBtn(o))).join("") : `<p class="empty">아직 주문 내역이 없어요.</p>`}</div>
      </div>` : ""}
      </div>
      <div class="sum">
        <div id="adminBox"></div>
        <form class="box" id="profForm" novalidate>
          <div class="box-h"><b>회원 정보</b></div>
          <div class="form stack">
            <div class="field"><label>로그인 계정</label><input value="${esc(loginLabel(USER))}" disabled></div>
            <div class="field"><label>회원번호 <span class="mode-note">(관리자 지정용)</span></label><div class="mid-row"><input value="${esc(USER.email || "")}" readonly id="p-mid"><button type="button" class="btn ghost" data-copy-mid>복사</button></div></div>
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
    view.addEventListener("click", e => {
      const b = e.target.closest("[data-creq]"); if (!b) return;
      const o = (orders || []).find(x => x.order_no === b.dataset.creq);
      if (o) openCancelForm(o, "", () => pageMypage(view));
    });
    $("[data-copy-mid]", view).onclick = async () => {
      const v = $("#p-mid").value;
      try { await navigator.clipboard.writeText(v); } catch { $("#p-mid").select(); document.execCommand("copy"); }
      toast("회원번호를 복사했어요");
    };
    // 관리자면 '관리자 페이지' 버튼 (화면을 먼저 그린 뒤 서버에 확인)
    if (API()) api("/me", null, "GET").then(me => {
      if (!me.isAdmin) return;
      const c = me.counts || {}, total = (c.bookings || 0) + (c.inquiries || 0) + (c.questions || 0) + (c.cancels || 0);
      const parts = [c.cancels && `취소 요청 ${c.cancels}`, c.bookings && `예약·문의 ${c.bookings}`, c.inquiries && `구매 문의 ${c.inquiries}`, c.questions && `상품 문의 ${c.questions}`].filter(Boolean);
      $("#adminBox").innerHTML = `<div class="box admin-box">
        <div class="box-h"><b>관리자</b><span class="pill">관리자 계정</span></div>
        <a class="btn primary" href="admin.html${c.cancels ? "?sec=order&tab=cancelreq" : ""}">관리자 페이지${total ? `<span class="badge-n num">${total}</span>` : ""}</a>
        <p class="mode-note">${parts.length ? `새로 들어온 건: ${parts.join(" · ")}` : "새로 들어온 예약·문의가 없어요"}</p>
      </div>`;
    }).catch(() => {});
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
        out.innerHTML = `<div class="box ord-list">${orderCard(o, `<dl class="ord-ship"><dt>받는 분</dt><dd>${esc(o.ship.name)}</dd><dt>주소</dt><dd>${esc(o.ship.addr)}</dd></dl>${cancelBtn(o)}`)}</div>
          <p class="mode-note" style="text-align:center">상품 준비가 시작된 뒤의 취소·교환은 고객행복센터(${esc(SITE.cs.tel)}) 또는 ${esc(SITE.company.email)} 로 문의해 주세요.</p>`;
        out.onclick = e => { if (e.target.closest("[data-creq]")) openCancelForm(o, phone, () => $("#lkForm").requestSubmit()); };
      } catch (err) {
        out.innerHTML = `<p class="empty" style="padding-block:24px">${esc(err.message)}</p>`;
      }
    };
  }

  /* ---------- 관리자: 체험 일정 · 숙박 달력 · 상품 관리 ---------- */
  const WD = [..."일월화수목금토"];
  const prodPicker = (list, cur, attr) => `<select ${attr} class="adm-pick">${list.map(p => `<option value="${p.id}" ${p.id === cur ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`;

  // 체험 일정: 회차 만들기, 시간·정원 바꾸기, 닫기, 삭제
  function admSlots(box) {
    const list = PRODUCTS.filter(p => p.ticket && !isStay(p));
    if (!list.length) { box.innerHTML = `<p class="empty">체험 상품이 없어요. 상품 관리에서 '체험·숙박 예약 상품'을 켠 상품을 만들어 주세요.</p>`; return; }
    let product = admSlots.last && byId(admSlots.last) && !isStay(byId(admSlots.last)) ? admSlots.last : list[0].id, rows = [];
    const today = ymdLocal();
    const draw = () => {
      const byDate = {};
      rows.filter(s => s.slot_date >= today).forEach(s => (byDate[s.slot_date] = byDate[s.slot_date] || []).push(s));
      box.innerHTML = `
        <div class="adm-bar">${prodPicker(list, product, "data-s-prod")}<span class="mode-note">손님은 남은 자리가 있는 일정 중에서 골라 예약 문의를 남겨요. 일정이 하나도 없으면 희망 날짜를 직접 적어요.</span></div>
        <details class="box adm-make" ${rows.length ? "" : "open"}><summary><b>+ 일정 한꺼번에 만들기</b></summary>
          <div class="form">
            <div class="field"><label>기간</label><div class="row2"><input type="date" data-mk="from" min="${today}" value="${today}"><span>~</span><input type="date" data-mk="to" min="${today}" value="${addDays(today, 27)}"></div></div>
            <div class="field"><label>요일</label><div class="wd">${WD.map((d, i) => `<label><input type="checkbox" data-mk-wd="${i}" ${i === 6 || i === 0 ? "checked" : ""}>${d}</label>`).join("")}</div></div>
            <div class="field"><label>시간</label><input data-mk="times" value="10:00, 14:00" placeholder="10:00, 14:00 처럼 쉼표로"></div>
            <div class="field"><label>정원 (회차당)</label><input data-mk="cap" type="number" min="1" max="500" value="10" inputmode="numeric"></div>
            <button class="btn primary" type="button" data-s-make>일정 만들기</button>
          </div>
        </details>
        <div class="box ord-list adm">${Object.keys(byDate).length ? Object.entries(byDate).map(([d, list]) => `<div class="slot-adm-day"><b>${dayLabel(d)}</b>${list.map(s => `
          <div class="slot-adm ${s.closed ? "closed" : ""}" data-sid="${s.id}">
            <input type="time" value="${esc(s.slot_time)}" data-sf="time" aria-label="시간">
            <span class="cap">정원 <input type="number" min="1" max="500" value="${s.capacity}" data-sf="cap" inputmode="numeric" aria-label="정원">명</span>
            <span class="used ${s.booked >= s.capacity ? "full" : ""}">예약 ${s.booked}명 · 남은 ${Math.max(0, s.capacity - s.booked)}</span>
            ${s.closed ? `<span class="pill" style="background:var(--soft);color:var(--mute)">닫힘</span>` : ""}
            <span class="acts"><button class="btn ghost" data-s-save>저장</button><button class="btn ghost" data-s-close="${s.closed ? 0 : 1}">${s.closed ? "열기" : "닫기"}</button><button class="btn ghost" data-s-del>삭제</button></span>
          </div>`).join("")}</div>`).join("") : `<p class="empty">앞으로 예정된 일정이 없어요. 위에서 일정을 만들어 주세요.</p>`}</div>`;
    };
    const load = async () => {
      admSlots.last = product;
      box.innerHTML = `<p class="loading">잠시만 기다려 주세요</p>`;
      try { rows = (await api(`/admin/slots?product=${encodeURIComponent(product)}`, null, "GET")).slots || []; draw(); }
      catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    };
    box.onchange = e => { if (e.target.matches("[data-s-prod]")) { product = e.target.value; load(); } };
    box.onclick = async e => {
      const t = e.target.closest("button"); if (!t) return;
      const row = t.closest("[data-sid]"), id = row && +row.dataset.sid;
      const v = k => $(`[data-mk="${k}"]`, box).value.trim();
      try {
        if ("sMake" in t.dataset) {
          const weekdays = [...box.querySelectorAll("[data-mk-wd]:checked")].map(x => +x.dataset.mkWd);
          const times = v("times").split(/[,\s]+/).filter(Boolean).map(x => /^\d:\d\d$/.test(x) ? "0" + x : x);
          t.disabled = true;
          const r = await api("/admin/slots", { product, from: v("from"), to: v("to"), weekdays, times, capacity: +v("cap") });
          toast(`일정 ${r.created}개를 만들었어요${r.skipped ? ` (이미 있는 ${r.skipped}개는 건너뜀)` : ""}`); return load();
        }
        if (!row) return;
        if ("sSave" in t.dataset) { await api("/admin/slot", { id, time: $("[data-sf=time]", row).value, capacity: +$("[data-sf=cap]", row).value }); toast("저장했어요"); return load(); }
        if (t.dataset.sClose) { await api("/admin/slot", { id, closed: t.dataset.sClose === "1" }); toast(t.dataset.sClose === "1" ? "일정을 닫았어요 (손님에게 안 보여요)" : "일정을 다시 열었어요"); return load(); }
        if ("sDel" in t.dataset) { if (!confirm("이 일정을 삭제할까요?")) return; await api("/admin/slot", { id, remove: true }); toast("삭제했어요"); return load(); }
      } catch (err) { toast(err.message); t.disabled = false; }
    };
    load();
  }

  // 숙박 달력: 예약확정·문의 중·막은 날 보기, 날짜 눌러 막기/풀기
  function admStay(box) {
    const list = PRODUCTS.filter(p => p.ticket && isStay(p));
    if (!list.length) { box.innerHTML = `<p class="empty">숙박 상품이 없어요.</p>`; return; }
    let product = list[0].id, ym = ymdLocal().slice(0, 7), data = null;
    const BK_ST = { new: "새 문의", contacted: "연락함", confirmed: "예약확정" };
    const draw = () => {
      const night = {};   // 날짜 → 그날 밤 묵는 예약들
      data.bookings.forEach(b => { for (let d = b.date_from; d < b.date_to; d = addDays(d, 1)) (night[d] = night[d] || []).push(b); });
      const blocked = new Map(data.blocks.map(b => [b.block_date, b.note]));
      const cell = d => {
        const bs = night[d] || [], conf = bs.find(b => b.status === "confirmed"), ask = bs.filter(b => b.status !== "confirmed");
        const cls = [blocked.has(d) ? "blk" : "", conf ? "conf" : "", ask.length ? "ask" : "", d < data.today ? "past" : "", d === data.today ? "today" : ""].join(" ");
        const html = (conf ? `<em class="t conf">${esc(conf.name)}</em>` : "") + (ask.length ? `<em class="t ask">문의 ${ask.length}</em>` : "") + (blocked.has(d) ? `<em class="t blk">막음</em>` : "");
        return { cls, html };
      };
      box.innerHTML = `
        <div class="adm-bar">${prodPicker(list, product, "data-st-prod")}<span class="mode-note">날짜를 누르면 그날을 막거나 풀어요 (휴무·정비 등). 손님에게는 <b>예약확정</b>된 날과 <b>막은 날</b>이 '예약 불가'로 보여요.</span></div>
        <div class="box cal adm-cal">
          <div class="cal-h"><button type="button" data-st-m="-1" aria-label="이전 달">‹</button><b>${ym.slice(0, 4)}년 ${+ym.slice(5)}월</b><button type="button" data-st-m="1" aria-label="다음 달">›</button></div>
          ${monthGrid(ym, cell)}
          <p class="cal-legend"><span class="lg conf"></span>예약확정 <span class="lg ask"></span>문의 중 (아직 안 막힘) <span class="lg blk"></span>관리자가 막은 날</p>
        </div>
        <div class="box ord-list adm"><div class="box-h"><b>${+ym.slice(5)}월 숙박 예약·문의</b><span class="num">${data.bookings.length}건</span></div>
          ${data.bookings.length ? data.bookings.map(b => `<div class="stay-row"><span class="st st-q-${b.status}">${BK_ST[b.status]}</span><b>${dayLabel(b.date_from)} → ${dayLabel(b.date_to)} · ${nightsOf(b.date_from, b.date_to)}박</b><span>${esc(b.name)} · ${b.people || "-"}명 · <a class="num" href="tel:${esc(String(b.tel).replace(/\D/g, ""))}">${esc(b.tel)}</a></span><span class="mode-note num">${esc(b.booking_no)}</span></div>`).join("")
            : `<p class="empty">이 달에는 숙박 예약·문의가 없어요.</p>`}
          <p class="mode-note" style="padding:0 20px 16px">예약 확정·취소는 <b>예약·문의</b> 탭에서 상태를 바꿔 주세요.</p>
        </div>`;
    };
    const load = async () => {
      box.innerHTML = `<p class="loading">잠시만 기다려 주세요</p>`;
      try { data = await api(`/admin/stay?product=${encodeURIComponent(product)}&month=${ym}`, null, "GET"); draw(); }
      catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    };
    box.onchange = e => { if (e.target.matches("[data-st-prod]")) { product = e.target.value; load(); } };
    box.onclick = async e => {
      const m = e.target.closest("[data-st-m]"); if (m) { ym = ymAdd(ym, +m.dataset.stM); return load(); }
      const d = e.target.closest("[data-day]"); if (!d || !data) return;
      const day = d.dataset.day, isBlk = data.blocks.some(b => b.block_date === day);
      if (day < data.today) return toast("지난 날짜예요");
      if (!isBlk && !confirm(`${dayLabel(day)}을(를) 막을까요?\n손님 달력에 '예약 불가'로 보여요.`)) return;
      try { await api("/admin/stay-block", { product, date: day, blocked: !isBlk }); toast(isBlk ? "막은 날을 풀었어요" : "그날을 막았어요"); load(); }
      catch (err) { toast(err.message); }
    };
    load();
  }

  // 상품 관리: GitHub 의 data/products.json 을 고쳐서 저장 (1~2분 뒤 홈페이지 반영)
  function admProducts(box) {
    let items = [], sha = "", cats = [], filter = "all", editing = null;
    const catName = id => (cats.find(c => c.id === id) || { name: id }).name;
    const won0 = n => n ? won(n) + "원" : "가격 문의";
    const nextId = () => { let n = items.reduce((m, p) => Math.max(m, +(/^p(\d+)$/.exec(p.id) || [0, 0])[1]), 0) + 1; return "p" + String(n).padStart(2, "0"); };
    const thumb = p => p.image ? `<img src="${esc(p._preview || p.image)}" alt="">` : `<span class="noimg">사진 없음</span>`;
    const save = async (note, msgOk) => {
      const r = await api("/admin/products", { items: items.map(({ _preview, ...p }) => p), sha, note });
      sha = r.sha; toast(msgOk || "저장했어요. 1~2분 뒤 홈페이지에 반영돼요");
    };
    const drawList = () => {
      const shown = items.map((p, i) => ({ p, i })).filter(x => filter === "all" || x.p.cat === filter);
      box.innerHTML = `
        <div class="adm-bar"><div class="sorts">${[["all", "전체"], ...cats.map(c => [c.id, c.name])].map(([k, v]) => `<button data-pf="${k}" aria-pressed="${filter === k}">${esc(v)} <span class="num">${k === "all" ? items.length : items.filter(p => p.cat === k).length}</span></button>`).join("")}</div>
          <button class="btn primary" data-p-new>+ 새 상품</button></div>
        <p class="mode-note">저장하면 GitHub 에 바로 기록되고, 1~2분 뒤 홈페이지에 반영돼요. 순서는 ▲▼로 바꿀 수 있어요 (같은 분류 안의 순서가 화면 순서).</p>
        <div class="box ord-list adm">${shown.length ? shown.map(({ p, i }) => `<div class="prod-adm" data-pi="${i}">
          <div class="th">${thumb(p)}</div>
          <div class="tx"><b>${esc(p.name)}</b><span>${esc(catName(p.cat))} · ${won0(p.price)}${p.was ? ` <s>${won(p.was)}원</s>` : ""}</span>
            <span class="tags">${p.flag ? `<span class="pill">${esc(p.flag)}</span>` : ""}${p.ticket ? `<span class="pill">예약 상품</span>` : ""}${p.soon ? `<span class="pill" style="background:var(--soft);color:var(--mute)">오픈 예정</span>` : ""}</span></div>
          <div class="acts"><button class="btn ghost" data-p-up aria-label="위로">▲</button><button class="btn ghost" data-p-down aria-label="아래로">▼</button><button class="btn ghost" data-p-edit>수정</button><button class="btn ghost" data-p-del>삭제</button></div>
        </div>`).join("") : `<p class="empty">이 분류에 상품이 없어요.</p>`}</div>`;
    };
    const fld = (k, label, val, extra = "") => `<div class="field"><label for="pe-${k}">${label}</label><input id="pe-${k}" data-pe="${k}" value="${esc(val == null ? "" : val)}" ${extra}></div>`;
    const drawEdit = () => {
      const p = editing.p;
      box.innerHTML = `<form class="box prod-edit" novalidate>
        <div class="box-h"><b>${editing.isNew ? "새 상품" : "상품 수정"}</b><span class="mode-note num">상품 코드 ${esc(p.id)}</span></div>
        <div class="form">
          <div class="field"><label for="pe-cat">분류</label><select id="pe-cat" data-pe="cat">${cats.map(c => `<option value="${c.id}" ${p.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          ${fld("name", "상품 이름", p.name, 'maxlength="80" placeholder="예: 강화속노란고구마 5kg"')}
          ${fld("sub", "한 줄 소개", p.sub, 'maxlength="120" placeholder="카드에 이름 아래로 보이는 짧은 설명"')}
          <div class="field"><label>사진</label><div class="pe-photo"><div class="th">${thumb(p)}</div><div><input type="file" accept="image/jpeg,image/png,image/webp" data-pe-file><p class="mode-note">JPG·PNG 사진을 고르면 자동으로 줄여서 올려요.</p></div></div></div>
          ${fld("price", "판매가 (원)", p.price || 0, 'type="number" min="0" inputmode="numeric" placeholder="0 이면 \'가격 문의\'"')}
          ${fld("was", "할인 전 가격 (원)", p.was || 0, 'type="number" min="0" inputmode="numeric" placeholder="할인 표시 안 하면 0"')}
          ${fld("flag", "배지", p.flag, 'maxlength="16" placeholder="예: BEST, 햅쌀, 체험 (비우면 없음)"')}
          ${fld("unit", "판매 단위", p.unit, 'maxlength="80" placeholder="예: 1박스 (5kg)"')}
          ${fld("pack", "포장 타입", p.pack, 'maxlength="80" placeholder="예: 상온 (종이박스)"')}
          ${fld("origin", "원산지", p.origin, 'maxlength="80" placeholder="예: 인천 강화군"')}
          <div class="field"><label>설정</label><div class="pe-checks">
            <label class="chk"><input type="checkbox" data-pe-chk="taxFree" ${p.taxFree ? "checked" : ""}><span>면세 상품 (농산물 등)</span></label>
            <label class="chk"><input type="checkbox" data-pe-chk="ticket" ${p.ticket ? "checked" : ""}><span>체험·숙박 예약 상품 ('담기' 대신 '예약 문의' 버튼)</span></label>
            <label class="chk"><input type="checkbox" data-pe-chk="soon" ${p.soon ? "checked" : ""}><span>오픈 예정 (목록에 보이지만 상세로 못 들어감)</span></label>
          </div></div>
          <div class="field top"><label for="pe-detail">요약 설명</label><textarea id="pe-detail" data-pe="detail" rows="3" maxlength="2000">${esc(p.detail || "")}</textarea></div>
          <div class="field top"><label>상품설명 단락</label><div class="pe-story">${(p.story || []).map((s, i) => `<div class="pe-st" data-st="${i}">
              <input data-st-f="title" value="${esc(s.title || "")}" placeholder="단락 제목" maxlength="120">
              <textarea data-st-f="text" rows="3" maxlength="3000" placeholder="본문">${esc(s.text || "")}</textarea>
              <textarea data-st-f="list" rows="2" placeholder="체크 목록 (한 줄에 하나, 비워도 돼요)">${esc((s.list || []).join("\n"))}</textarea>
              <button type="button" class="btn ghost" data-st-del>이 단락 삭제</button></div>`).join("")}
            <button type="button" class="btn ghost" data-st-add>+ 단락 추가</button></div></div>
          <div class="field top"><label for="pe-info">상세정보 표</label><div><textarea id="pe-info" data-pe="info" rows="4" placeholder="항목 | 내용 (한 줄에 하나)&#10;예: 보관방법 | 서늘한 곳">${esc((p.info || []).map(r => r.join(" | ")).join("\n"))}</textarea></div></div>
        </div>
        <div class="pe-actions"><button type="button" class="btn ghost" data-p-cancel>취소</button><button type="button" class="btn primary" data-p-save>저장</button></div>
      </form>`;
    };
    const readForm = () => {
      const p = editing.p, v = k => { const el = $(`[data-pe="${k}"]`, box); return el ? el.value.trim() : ""; };
      ["cat", "name", "sub", "flag", "unit", "pack", "origin", "detail"].forEach(k => (p[k] = v(k)));
      p.price = Math.max(0, Math.floor(+v("price") || 0)); p.was = Math.max(0, Math.floor(+v("was") || 0));
      box.querySelectorAll("[data-pe-chk]").forEach(c => { if (c.checked) p[c.dataset.peChk] = true; else delete p[c.dataset.peChk]; });
      p.story = [...box.querySelectorAll("[data-st]")].map(el => {
        const g = f => $(`[data-st-f="${f}"]`, el).value.trim();
        const o = { title: g("title"), text: g("text") }, list = g("list").split("\n").map(x => x.trim()).filter(Boolean);
        if (list.length) o.list = list;
        return o;
      }).filter(s => s.title || s.text);
      p.info = v("info").split("\n").map(l => l.split("|").map(x => x.trim())).filter(r => r[0] && r[1]).map(r => [r[0], r.slice(1).join(" | ")]);
    };
    const resizeJpeg = async file => {
      const img = await createImageBitmap(file);
      const r = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    };
    const load = async () => {
      box.innerHTML = `<p class="loading">잠시만 기다려 주세요</p>`;
      try { const d = await api("/admin/products", null, "GET"); items = d.items; sha = d.sha; cats = d.categories; drawList(); }
      catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
    };
    box.onchange = async e => {
      const f = e.target.closest("[data-pe-file]"); if (!f || !f.files[0]) return;
      readForm();
      try {
        toast("사진을 올리는 중이에요");
        const url = await resizeJpeg(f.files[0]);
        const { path } = await api("/admin/image", { id: editing.p.id, data: url.split(",")[1] });
        editing.p.image = path; editing.p._preview = url; drawEdit(); toast("사진을 올렸어요. 저장을 눌러야 상품에 적용돼요");
      } catch (err) { toast(err.message || "사진을 읽지 못했어요. JPG·PNG 사진을 골라 주세요"); }
    };
    box.onclick = async e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.pf) { filter = t.dataset.pf; return drawList(); }
      if ("pNew" in t.dataset) { editing = { isNew: true, p: { id: nextId(), cat: filter !== "all" ? filter : (cats[0] || {}).id, name: "", sub: "", price: 0, was: 0, image: "", flag: "", taxFree: false, origin: "", unit: "", pack: "", sold: 0, detail: "", story: [], info: [] } }; return drawEdit(); }
      if ("stAdd" in t.dataset) { readForm(); editing.p.story.push({ title: "", text: "" }); return drawEdit(); }
      if ("stDel" in t.dataset) { readForm(); editing.p.story.splice(+t.closest("[data-st]").dataset.st, 1); return drawEdit(); }
      if ("pCancel" in t.dataset) { editing = null; return load(); }
      if ("pSave" in t.dataset) {
        readForm();
        if (!editing.p.name) return toast("상품 이름을 입력해 주세요");
        const before = items;
        items = editing.isNew ? [...items, editing.p] : items.map(p => p.id === editing.p.id ? editing.p : p);
        t.disabled = true;
        try { await save(`${editing.isNew ? "추가" : "수정"}: ${editing.p.name}`); editing = null; drawList(); }
        catch (err) { items = before; toast(err.message); t.disabled = false; }
        return;
      }
      const row = t.closest("[data-pi]"); if (!row) return;
      const i = +row.dataset.pi, p = items[i];
      if ("pEdit" in t.dataset) { editing = { isNew: false, p: JSON.parse(JSON.stringify(p)) }; return drawEdit(); }
      if ("pDel" in t.dataset) {
        if (!confirm(`'${p.name}' 상품을 삭제할까요?\n홈페이지에서 바로 사라져요. (사진 파일은 남아 있어요)`)) return;
        const before = items; items = items.filter((_, k) => k !== i);
        try { await save(`삭제: ${p.name}`, "삭제했어요. 1~2분 뒤 홈페이지에 반영돼요"); drawList(); } catch (err) { items = before; toast(err.message); }
        return;
      }
      if ("pUp" in t.dataset || "pDown" in t.dataset) {
        // 같은 분류 안에서 바로 위/아래 상품과 자리 바꾸기
        const dir = "pUp" in t.dataset ? -1 : 1;
        let j = i + dir; while (j >= 0 && j < items.length && items[j].cat !== p.cat) j += dir;
        if (j < 0 || j >= items.length) return;
        const before = items; items = items.slice(); [items[i], items[j]] = [items[j], items[i]];
        try { await save(`순서 변경: ${p.name}`, "순서를 바꿨어요"); drawList(); } catch (err) { items = before; toast(err.message); }
      }
    };
    load();
  }

  /* ---------- 페이지: 관리자 주문 관리 ---------- */
  function pageAdmin(view) {
    document.title = `관리자 | ${SITE.name}`;
    if (!API() || !SB) { view.innerHTML = msgPage("서버(api)와 Supabase 설정 후 사용할 수 있어요."); return; }
    if (!USER) { location.replace("login.html?next=admin.html"); return; }
    const SECTIONS = {
      booking: { name: "예약·문의", tabs: { new: "새 문의", upcoming: "다가오는 예약", contacted: "연락함", confirmed: "예약확정", done: "완료", cancelled: "취소", all: "전체" }, first: "new", api: "bookings" },
      inquiry: { name: "구매 문의", tabs: { new: "새 문의", contacted: "연락함", done: "완료", cancelled: "취소", all: "전체" }, first: "new", api: "inquiries" },
      review: { name: "상품 후기", tabs: { all: "전체", shown: "공개", hidden: "숨김" }, first: "all", api: "reviews" },
      question: { name: "상품 문의", tabs: { open: "답변대기", answered: "답변완료", all: "전체" }, first: "open", api: "questions" },
      slots: { name: "체험 일정", custom: admSlots },
      stay: { name: "숙박 달력", custom: admStay },
      products: { name: "상품 관리", custom: admProducts },
      order: { name: "주문", tabs: { paid: "결제완료", cancelreq: "취소 요청", preparing: "상품준비중", shipped: "배송중", delivered: "배송완료", cancelled: "취소", all: "전체" }, first: "paid", api: "orders" }
    };
    let section = SECTIONS[params.get("sec")] ? params.get("sec") : INQUIRY() ? "booking" : "order", status = SECTIONS[section].first, rows = [];
    if (SECTIONS[section].tabs && SECTIONS[section].tabs[params.get("tab")]) status = params.get("tab");
    const BK_STATUS = { new: "새 문의", contacted: "연락함", confirmed: "예약확정", done: "완료", cancelled: "취소" };
    const BK_KIND = { craft: "체험", stay: "숙박", general: "1:1 문의" };
    const bkRow = b => `<article class="ord">
      <div class="ord-h"><span class="num">접수 ${fmtDate(b.created_at)}</span><span class="st st-q-${esc(b.status)}">${BK_STATUS[b.status] || esc(b.status)}</span></div>
      <div class="ord-no num">접수번호 ${esc(b.booking_no)}</div>
      <div class="bk-title"><span class="pill">${BK_KIND[b.kind] || esc(b.kind)}</span>${b.product_id ? `<a href="product.html?id=${esc(b.product_id)}" style="font-weight:700">${esc(b.product_name || pname(b.product_id))}</a>` : ""}</div>
      ${b.date_from ? `<div class="bk-when"><b>${bookingWhen(b)}</b>${b.people ? ` · ${b.people}명` : ""}${b.date_from < ymdLocal() ? ` <span class="mode-note">(지난 날짜)</span>` : ""}</div>` : ""}
      <dl class="ord-ship">
        <dt>이름</dt><dd>${esc(b.name)}${b.user_id ? ` <span class="pill">회원</span>` : ""}</dd>
        <dt>휴대폰</dt><dd><a class="num" href="tel:${esc(b.tel.replace(/[^\d]/g, ""))}" style="color:var(--brand);text-decoration:underline">${esc(b.tel)}</a></dd>
        <dt>문의 내용</dt><dd style="white-space:pre-wrap">${esc(b.message || "-")}</dd>
      </dl>
      <div class="adm-edit" data-bk="${esc(b.booking_no)}">
        <select data-f="status">${Object.keys(BK_STATUS).map(s => `<option value="${s}" ${b.status === s ? "selected" : ""}>${BK_STATUS[s]}</option>`).join("")}</select>
        <input data-f="memo" placeholder="관리자 메모 (고객에게 안 보여요)" value="${esc(b.admin_memo || "")}" maxlength="500">
        <button class="btn primary" data-save>저장</button>
      </div>
    </article>`;
    const orderRow = o => orderCard(o, `
      <dl class="ord-ship">
        ${o.method === "test" ? `<dt>결제</dt><dd><span class="pill">테스트 결제</span> 실제 돈은 오가지 않아요</dd>` : ""}
        ${o.booking ? `<dt>예약</dt><dd><b>${o.booking.kind === "stay" ? `${dayLabel(o.booking.date_from)} → ${dayLabel(o.booking.date_to)} · ${nightsOf(o.booking.date_from, o.booking.date_to)}박` : dayLabel(o.booking.date_from) + (o.booking.slot_time ? " " + o.booking.slot_time : "")}</b> · ${o.booking.people}명${o.status === "cancelled" ? " (결제 취소로 예약도 취소됨)" : ""}</dd>` : ""}
        <dt>받는 분</dt><dd>${esc(o.ship.name)} · <span class="num">${esc(o.ship.tel)}</span></dd>
        <dt>주소</dt><dd>${esc(o.ship.addr)}</dd>
        <dt>요청</dt><dd>${esc(o.ship.memo || "")}</dd>
        <dt>결제번호</dt><dd class="num">${esc(o.payment_id || "")}</dd>
      </dl>
      ${o.cancel_req && o.cancel_req.state === "requested" && o.status === "paid" ? `<div class="adm-edit creq-adm" data-no="${esc(o.order_no)}">
        <p class="mode-note" style="margin:0;grid-column:1/-1">구매자가 취소를 요청했어요. 승인하면 결제가 전액 취소(환불)되고${o.booking ? " 예약도 취소돼요" : "요"}. 거절하면 아래 사유가 구매자에게 보여요.</p>
        <input data-f="answer" placeholder="거절 사유 (예: 이미 발송 준비가 끝났어요)" maxlength="300">
        <button class="btn ghost" data-reject>거절</button>
        <button class="btn primary" data-cancel>취소 승인 (환불)</button>
      </div>` : o.status === "cancelled" || o.status === "pending" ? "" : `<div class="adm-edit" data-no="${esc(o.order_no)}">
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
    const pname = id => (byId(id) || { name: id }).name;
    const revRow = r => `<article class="ord">
      <div class="ord-h"><span class="num">${fmtDate(r.created_at)}</span><span class="st ${r.hidden ? "st-cancelled" : ""}">${r.hidden ? "숨김" : "공개"}</span></div>
      <div><a href="product.html?id=${esc(r.product_id)}#tab-review" style="font-weight:700">${esc(pname(r.product_id))}</a></div>
      <div class="pitem-h"><span class="stars">${"★".repeat(r.rating)}<span>${"★".repeat(5 - r.rating)}</span></span><span>${esc(r.name || "회원")}</span></div>
      <p class="pitem-b" style="margin:0">${esc(r.content)}</p>
      <div class="adm-edit"><button class="btn ghost" data-rev="${r.id}" data-hide="${r.hidden ? "0" : "1"}">${r.hidden ? "다시 보이기" : "숨기기"}</button></div>
    </article>`;
    const qRow = q => `<article class="ord">
      <div class="ord-h"><span class="num">${fmtDate(q.created_at)}</span><span class="st ${q.answer ? "" : "st-q-new"}">${q.answer ? "답변완료" : "답변대기"}</span></div>
      <div><a href="product.html?id=${esc(q.product_id)}#tab-qna" style="font-weight:700">${esc(pname(q.product_id))}</a> ${q.is_secret ? `<span class="pill">비밀글</span>` : ""}</div>
      <p class="pitem-b" style="margin:0"><b class="qa">Q</b>${esc(q.question)} <span class="mode-note">— ${esc(q.name || "회원")}</span></p>
      <div class="adm-edit" style="display:grid;grid-template-columns:1fr auto;align-items:start">
        <textarea data-ans-text="${q.id}" rows="3" maxlength="2000" placeholder="답변을 적어 주세요 (고객에게 공개돼요)" style="border:1px solid var(--line);border-radius:4px;padding:8px 10px;resize:vertical;line-height:1.6">${esc(q.answer || "")}</textarea>
        <button class="btn primary" data-ans="${q.id}">답변 저장</button>
      </div>
    </article>`;
    const draw = () => {
      const sec = SECTIONS[section];
      view.innerHTML = `<div class="wrap"><div class="page-title"><h2>관리자</h2><p>관리자 전용 화면</p></div>
        <div class="adm-sec">${Object.entries(SECTIONS).map(([k, s]) => `<button data-sec="${k}" aria-pressed="${section === k}">${s.name}</button>`).join("")}</div>
        <div class="toolbar"><span class="num">총 ${rows.length}건</span>
          <div class="sorts">${Object.entries(sec.tabs).map(([k, v]) => `<button data-tab="${k}" aria-pressed="${status === k}">${v}</button>`).join("")}</div></div>
        <div class="box ord-list adm">${rows.length ? rows.map({ booking: bkRow, inquiry: inqRow, order: orderRow, review: revRow, question: qRow }[section]).join("") : `<p class="empty">${sec.name} 내역이 없어요.</p>`}</div>
        <div style="height:72px"></div></div>`;
    };
    const load = async () => {
      if (SECTIONS[section].custom) {
        // 체험 일정·숙박 달력·상품 관리는 각자 화면을 그림
        view.innerHTML = `<div class="wrap"><div class="page-title"><h2>관리자</h2><p>관리자 전용 화면</p></div>
          <div class="adm-sec">${Object.entries(SECTIONS).map(([k, s]) => `<button data-sec="${k}" aria-pressed="${section === k}">${s.name}</button>`).join("")}</div>
          <div id="admBody"></div><div style="height:72px"></div></div>`;
        return SECTIONS[section].custom($("#admBody"));
      }
      view.innerHTML = `<p class="loading">불러오는 중…</p>`;
      try {
        const d = await api(`/admin/${SECTIONS[section].api}?status=${status}`, null, "GET");
        rows = d[SECTIONS[section].api] || []; draw();
      } catch (err) {
        view.innerHTML = msgPage(esc(err.message) + (/권한/.test(err.message)
          ? `<br><small>이 계정을 관리자로 쓰려면 Cloudflare 워커의 ADMIN_EMAILS 에<br><b class="num" style="color:var(--ink)">${esc(USER.email)}</b> 를 넣으세요.</small>` : ""),
          `<button class="btn ghost" style="display:inline-flex;height:44px" data-relogin>다른 계정으로 로그인</button>`);
      }
    };
    view.onclick = async e => {
      if (e.target.closest("[data-relogin]")) { await signOutClean(); location.href = "login.html?next=admin.html"; return; }
      const sec = e.target.closest("[data-sec]");
      if (sec) { section = sec.dataset.sec; status = SECTIONS[section].first || ""; return load(); }
      const tab = e.target.closest("[data-tab]");
      if (tab) { status = tab.dataset.tab; return load(); }
      const rv = e.target.closest("[data-rev]"), an = e.target.closest("[data-ans]");
      try {
        if (rv) { await api("/admin/review", { id: +rv.dataset.rev, hidden: rv.dataset.hide === "1" }); toast(rv.dataset.hide === "1" ? "후기를 숨겼어요" : "후기를 다시 보이게 했어요"); return load(); }
        if (an) { await api("/admin/question", { id: +an.dataset.ans, answer: $(`[data-ans-text="${an.dataset.ans}"]`, view).value }); toast("답변을 저장했어요"); return load(); }
      } catch (err) { return toast(err.message); }
      const box = e.target.closest(".adm-edit"); if (!box || !box.dataset.inq && !box.dataset.no && !box.dataset.bk) return;
      const f = k => $(`[data-f=${k}]`, box).value.trim();
      try {
        if (box.dataset.bk) {
          if (!e.target.closest("[data-save]")) return;
          await api("/admin/booking", { bookingNo: box.dataset.bk, status: f("status"), memo: f("memo") });
          toast("저장했어요"); load();
          return;
        }
        if (box.dataset.inq) {
          if (!e.target.closest("[data-save]")) return;
          await api("/admin/inquiry", { inquiryNo: box.dataset.inq, status: f("status"), memo: f("memo") });
          toast("저장했어요"); load();
          return;
        }
        const orderNo = box.dataset.no;
        if (e.target.closest("[data-reject]")) {
          if (!f("answer")) { $("[data-f=answer]", box).focus(); return toast("거절 사유를 적어 주세요"); }
          await api("/admin/cancel-reject", { orderNo, answer: f("answer") });
          toast("취소 요청을 거절했어요"); return load();
        }
        if (e.target.closest("[data-save]")) {
          await api("/admin/order", { orderNo, status: f("status"), courier: f("courier"), trackingNo: f("tracking") });
          toast("저장했어요"); load();
        } else if (e.target.closest("[data-cancel]")) {
          if (!confirm(`${orderNo} 주문을 전액 결제 취소할까요?\n고객에게 바로 환불되며 되돌릴 수 없어요.${box.classList.contains("creq-adm") ? "\n(구매자 취소 요청 승인)" : ""}`)) return;
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
    if (cart.some(l => !byId(l.id) || byId(l.id).soon)) { cart = cart.filter(l => byId(l.id) && !byId(l.id).soon); store.set("fg_cart", cart); }
    await initAuth();
    await syncCart();
    shell();
    ({ home: pageHome, shop: pageShop, product: pageProduct, cart: pageCart, order: pageOrder,
       reserve: pageReserve, login: pageLogin, naver: pageOAuth, kakao: pageOAuth, mypage: pageMypage, lookup: pageLookup, admin: pageAdmin, policy: pagePolicy }[PAGE] || pageHome)(view);
  })();
})();
