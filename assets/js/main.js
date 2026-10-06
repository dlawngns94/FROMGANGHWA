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
  const saveCart = () => { cart = cart.filter(l => byId(l.id)); store.set("fg_cart", cart); renderBadge(); };
  const cartCount = () => cart.reduce((s, l) => s + l.qty, 0);

  function totals(lines) {
    const goods = lines.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
    const shipNeeded = lines.some(l => !byId(l.id).ticket);
    const ship = !shipNeeded || goods === 0 || goods >= SITE.shipping.freeOver ? 0 : SITE.shipping.fee;
    const taxEx = lines.reduce((s, l) => s + (byId(l.id).taxFree ? byId(l.id).price * l.qty : 0), 0);
    const total = goods + ship;
    return { goods, ship, total, taxEx, taxScope: total - taxEx };
  }

  /* ---------- 공통: 헤더 · 푸터 ---------- */
  function shell() {
    const activeCat = PAGE === "shop" ? (params.get("cat") || (params.get("q") ? "" : "all")) : "";
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="topbar">${esc(SITE.topbar)}</div>
      <header class="site"><div class="wrap">
        <div class="h-row">
          <a class="logo" href="index.html" aria-label="${esc(SITE.name)} 홈"><img src="assets/images/logo.png" alt="${esc(SITE.name)}"><span class="tag">${esc(SITE.nameEn)}</span></a>
          <form class="search" action="shop.html" role="search">
            <input id="q" name="q" type="search" placeholder="고구마, 섬쌀, 사자발쑥을 검색해 보세요" aria-label="상품 검색" value="${esc(params.get("q") || "")}">
            <button aria-label="검색"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
          </form>
          <div class="h-icons">
            <button class="link" data-toast="회원 기능은 오픈 준비 중입니다">회원가입</button>
            <button class="link" data-toast="회원 기능은 오픈 준비 중입니다">로그인</button>
            <a class="cart-btn" href="cart.html" aria-label="장바구니">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>
              <span class="badge num" id="cartCount" hidden>0</span>
            </a>
          </div>
        </div>
        <nav class="cats" aria-label="카테고리">${SITE.categories.map(c =>
          `<a href="shop.html?cat=${c.id}" aria-current="${activeCat === c.id}">${esc(c.name)}</a>`).join("")}</nav>
      </div></header>`);
    const c = SITE.company;
    document.body.insertAdjacentHTML("beforeend", `
      <footer class="site"><div class="wrap">
        <div class="f-row">
          <div><h4>고객행복센터</h4><p class="tel num">${esc(SITE.cs.tel)}</p><p>${esc(SITE.cs.hours)}</p></div>
          <div>
            <div class="f-links"><span>회사소개</span><span>이용약관</span><b>개인정보처리방침</b><span>이용안내</span></div>
            <p>법인명(상호): ${esc(c.corpName)} · 대표자: ${esc(c.ceo)} · 사업자등록번호: ${esc(c.businessNumber)}<br>
            통신판매업신고: ${esc(c.mailOrderNumber)}<br>
            주소: ${esc(c.address)} · 이메일: ${esc(c.email)}<br>
            결제대행: 네이버페이 · 고객님의 결제 정보는 프롬강화에 저장되지 않습니다.</p>
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
  const shipLabel = p => p.ticket ? "모바일 발송" : "산지직송";
  function card(p) {
    const r = rate(p), href = `product.html?id=${p.id}`;
    return `<article class="card">
      <a class="thumb" href="${href}" aria-label="${esc(p.name)} 상세보기">${visual(p)}${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ""}</a>
      <button class="add" data-add="${p.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/></svg>담기</button>
      <div class="c-ship">${shipLabel(p)}</div>
      <a class="c-name" href="${href}">${esc(p.name)}</a>
      <div class="c-desc">${esc(p.sub)}</div>
      <div class="c-price num">${r ? `<span class="rate">${r}%</span>` : ""}<span class="now">${won(p.price)}원</span>${p.was ? `<span class="was">${won(p.was)}원</span>` : ""}</div>
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
    const base = q ? PRODUCTS.filter(p => (p.name + p.sub).includes(q)) : PRODUCTS.filter(p => cat === "all" || p.cat === cat);
    const title = q ? `'${q}' 검색 결과` : (SITE.categories.find(c => c.id === cat) || SITE.categories[0]).name;
    document.title = `${title} | ${SITE.name}`;
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
            <div class="d-price num">${r ? `<span class="rate">${r}%</span>` : ""}<span class="now">${won(p.price)}<small>원</small></span></div>
            ${p.was ? `<div class="d-was num">${won(p.was)}원</div>` : ""}
            <dl class="info">
              <dt>배송</dt><dd>${p.ticket ? "결제 후 문자로 이용권 발송" : `산지직송 · ${esc(SITE.shipping.cutoff)}<br><span style="color:var(--mute);font-size:13px">${won(SITE.shipping.freeOver)}원 이상 무료배송</span>`}</dd>
              <dt>판매단위</dt><dd>${esc(p.unit)}</dd>
              <dt>포장타입</dt><dd>${esc(p.pack)}</dd>
              <dt>원산지</dt><dd>${esc(p.origin)}</dd>
              <dt>수량</dt><dd><div class="qty"><button data-q="-1" aria-label="수량 빼기" ${qty <= 1 ? "disabled" : ""}>−</button><span class="num">${qty}</span><button data-q="1" aria-label="수량 더하기">+</button></div></dd>
            </dl>
            <div class="d-total"><span class="lbl">총 상품금액:</span><span class="v num">${won(p.price * qty)}</span><span>원</span></div>
            <div class="d-actions">
              <button class="btn ghost" data-addqty>장바구니 담기</button>
              <button class="btn primary" data-buynow>바로 구매</button>
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
      <div class="pr num">${won(p.price * l.qty)}원</div>
      ${editable ? `<button class="x" data-del="${p.id}" aria-label="${esc(p.name)} 삭제">×</button>` : "<span></span>"}
    </div>`;
  }
  function summaryBox(t, cta) {
    const free = SITE.shipping.freeOver;
    return `<div class="sum"><div class="box">
        <div class="r"><span>상품금액</span><span class="num">${won(t.goods)}원</span></div>
        <div class="r"><span>배송비</span><span class="num">${t.ship ? "+" + won(t.ship) + "원" : "0원"}</span></div>
        ${t.ship ? `<div class="hint num">${won(free - t.goods)}원 더 담으면 무료배송</div>` : ""}
        <div class="r tot"><span>결제예정금액</span><b class="num">${won(t.total)}원</b></div>
      </div>${cta}</div>`;
  }

  /* ---------- 페이지: 장바구니 ---------- */
  function pageCart(view) {
    const draw = () => {
      if (!cart.length) { view.innerHTML = `<div class="wrap"><div class="page-title"><h2>장바구니</h2></div><p class="empty">장바구니에 담긴 상품이 없어요.<br><br><a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a></p></div>`; return; }
      view.innerHTML = `<div class="wrap"><div class="page-title"><h2>장바구니</h2></div><div class="two">
        <div class="box"><div class="box-h"><b>담은 상품 <span class="num">${cartCount()}</span>개</b><button data-clear style="color:var(--sub);font-size:13px">전체 삭제</button></div>${cart.map(l => lineRow(l, true)).join("")}</div>
        ${summaryBox(totals(cart), `<a class="btn primary" href="order.html">주문하기</a>`)}
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

  /* ---------- 페이지: 주문서 + 네이버페이 ---------- */
  const NP = () => SITE.naverpay || {};
  const naverLive = () => !!(window.Naver && window.Naver.Pay && NP().clientId && NP().approveEndpoint);

  function pageOrder(view) {
    // 결제창(page 방식)에서 돌아온 경우
    if (params.get("resultCode")) return handleReturn(view);

    const fromBuyNow = params.get("from") === "buynow";
    const lines = (fromBuyNow ? store.get("fg_buynow", [], sessionStorage) : cart).filter(l => byId(l.id)).map(l => ({ ...l }));
    if (!lines.length) { view.innerHTML = `<p class="empty">주문할 상품이 없어요.<br><br><a class="btn ghost" style="display:inline-flex" href="shop.html">상품 보러 가기</a></p>`; return; }
    const t = totals(lines), live = naverLive();
    const mode = live ? (NP().mode === "production" ? "실결제" : "개발(Sandbox)") : "테스트 시뮬레이터";
    const saved = store.get("fg_ship", {});
    view.innerHTML = `<div class="wrap"><div class="page-title"><h2>주문서</h2></div><div class="two">
      <div style="display:grid;gap:20px;min-width:0">
        <div class="box"><div class="box-h"><b>주문 상품</b><span class="num" style="color:var(--sub)">${lines.reduce((s, l) => s + l.qty, 0)}개</span></div>${lines.map(l => lineRow(l, false)).join("")}</div>
        <form class="box" id="shipForm" novalidate>
          <div class="box-h"><b>배송 정보</b>${saved.name ? "" : `<span style="color:var(--mute);font-size:12px">예시 정보가 채워져 있어요</span>`}</div>
          <div class="form">
            <div class="field"><label for="f-name">받는 분</label><input id="f-name" required value="${esc(saved.name || "김강화")}" autocomplete="name"></div>
            <div class="field"><label for="f-tel">휴대폰</label><input id="f-tel" required value="${esc(saved.tel || "010-0000-0000")}" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><label for="f-addr">주소</label><input id="f-addr" required value="${esc(saved.addr || "인천광역시 강화군 강화읍 (예시 주소)")}" autocomplete="street-address"></div>
            <div class="field"><label for="f-memo">배송 요청</label><select id="f-memo"><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전 연락주세요</option></select></div>
          </div>
        </form>
        <div class="box"><div class="box-h"><b>결제 수단</b></div>
          <div class="pay-opt"><input type="radio" id="pm-npay" name="pm" checked><label for="pm-npay"><b>네이버페이</b></label><span class="pill">${mode}</span></div>
          <div class="pay-opt mode-note">${live
            ? "네이버페이 결제창이 새 창으로 열립니다. 결제 인증 후 서버에서 승인 API를 호출해 주문을 확정합니다."
            : "<span><b>지금은 테스트 모드입니다.</b> 가맹점 키가 아직 없어 실제 결제창 대신 결제 흐름을 흉내 내는 시뮬레이터가 열리고, 돈은 나가지 않습니다. data/site.json 에 네이버페이 키와 승인 서버 주소를 넣으면 실제 결제창으로 바뀝니다.</span>"}</div>
        </div>
      </div>
      ${summaryBox(t, `<button class="btn npay" id="payBtn"><span class="n">N</span>${won(t.total)}원 네이버페이 결제</button><p class="mode-note" style="margin:0">주문 내용을 확인했으며 결제에 동의합니다.</p>`)}
    </div></div>`;

    $("#payBtn").onclick = () => {
      for (const id of ["f-name", "f-tel", "f-addr"]) {
        const el = $("#" + id); if (!el.value.trim()) { el.focus(); return toast("배송 정보를 모두 입력해 주세요"); }
      }
      const ship = { name: $("#f-name").value.trim(), tel: $("#f-tel").value.trim(), addr: $("#f-addr").value.trim(), memo: $("#f-memo").value };
      const order = buildOrder(lines, ship, fromBuyNow);
      store.set("fg_pending", order, sessionStorage);
      if (live) openNaverPay(order, view); else openSimulator(order, view);
    };
  }

  function buildOrder(lines, ship, fromBuyNow) {
    const t = totals(lines), first = byId(lines[0].id);
    const d = new Date(), pad = n => String(n).padStart(2, "0");
    return {
      merchantPayKey: `FG${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      productName: lines.length > 1 ? `${first.name} 외 ${lines.length - 1}건` : first.name,
      productCount: lines.reduce((s, l) => s + l.qty, 0),
      total: t.total, taxScope: t.taxScope, taxEx: t.taxEx,
      items: lines.map(l => ({ id: l.id, qty: l.qty })),
      ship, fromBuyNow
    };
  }

  /* 실제 네이버페이 결제창 */
  function openNaverPay(order, view) {
    const cfg = NP();
    const oPay = window.Naver.Pay.create({
      mode: cfg.mode, clientId: cfg.clientId, chainId: cfg.chainId || undefined,
      openType: "popup", payType: "normal",
      onAuthorize: o => {
        if (o.resultCode === "Success") approve(o.paymentId, order, view);
        else toast(`결제가 완료되지 않았어요 (${o.resultMessage || o.resultCode})`);
      }
    });
    const back = location.href.split("?")[0];
    oPay.open({
      merchantPayKey: order.merchantPayKey,
      merchantUserKey: "guest",
      productName: order.productName,
      productCount: order.productCount,
      totalPayAmount: order.total,
      taxScopeAmount: order.taxScope,
      taxExScopeAmount: order.taxEx,
      returnUrl: back,
      productItems: order.items.map(i => ({ categoryType: "PRODUCT", categoryId: "GENERAL", uid: i.id, name: byId(i.id).name, count: i.qty }))
    });
  }

  async function approve(paymentId, order, view) {
    toast("결제를 승인하는 중이에요…");
    try {
      const res = await fetch(NP().approveEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, merchantPayKey: order.merchantPayKey, items: order.items })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "승인 실패");
      finishOrder({ ...order, paymentId, simulated: false }, view);
    } catch (err) {
      toast(`결제 승인에 실패했어요: ${err.message}`);
    }
  }

  function handleReturn(view) {
    const code = params.get("resultCode"), pid = params.get("paymentId");
    const order = store.get("fg_pending", null, sessionStorage);
    history.replaceState(null, "", location.pathname);
    if (code === "Success" && pid && order) { view.innerHTML = `<p class="loading">결제를 승인하는 중이에요…</p>`; approve(pid, order, view); }
    else { view.innerHTML = `<p class="empty">결제가 취소되었어요.<br><br><a class="btn ghost" style="display:inline-flex" href="cart.html">장바구니로 돌아가기</a></p>`; }
  }

  /* 테스트 시뮬레이터 — 키가 없을 때 결제 흐름만 확인 (실결제 없음) */
  function openSimulator(order, view) {
    const root = $("#modalRoot");
    root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="simTitle">
      <div class="sheet-h"><span id="simTitle">결제 시뮬레이터</span><button aria-label="닫기" data-close style="color:inherit;font-size:22px">×</button></div>
      <div class="sheet-b">
        <div class="warn">테스트 모드 화면입니다. 실제 네이버페이 결제창이 아니며 결제가 일어나지 않습니다. 실제 결제창에서 '결제하기'를 눌렀을 때와 같은 응답(resultCode, paymentId)을 만들어 다음 단계를 확인합니다.</div>
        <div class="r"><span>주문번호</span><span class="num">${order.merchantPayKey}</span></div>
        <div class="r"><span>상품</span><span style="text-align:right">${esc(order.productName)}</span></div>
        <div class="r"><span>과세 / 면세</span><span class="num">${won(order.taxScope)} / ${won(order.taxEx)}원</span></div>
        <div class="r" style="align-items:baseline"><span>결제금액</span><span class="big num">${won(order.total)}원</span></div>
      </div>
      <div class="sheet-f"><button class="btn ghost" data-simfail>결제 취소 응답</button><button class="btn npay" data-simok>결제 성공 응답</button></div>
    </div></div>`;
    $("[data-simok]", root).focus();
    const close = () => { root.innerHTML = ""; root.onclick = null; };
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
    root.onclick = ev => {
      if (ev.target.id === "scrim" || ev.target.closest("[data-close]")) return close();
      if (ev.target.closest("[data-simfail]")) { close(); return toast("결제가 취소되었어요 (resultCode: UserCancel)"); }
      if (ev.target.closest("[data-simok]")) { close(); finishOrder({ ...order, paymentId: "SIM" + Date.now(), simulated: true }, view); }
    };
  }

  function finishOrder(o, view) {
    if (!o.fromBuyNow) { const bought = new Set(o.items.map(i => i.id)); cart = cart.filter(l => !bought.has(l.id)); saveCart(); }
    store.set("fg_ship", o.ship);
    store.del("fg_pending", sessionStorage); store.del("fg_buynow", sessionStorage);
    document.title = `주문 완료 | ${SITE.name}`;
    view.innerHTML = `<div class="wrap"><div class="done">
      <div class="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
      <h2>주문이 완료되었어요</h2>
      <p style="color:var(--sub);margin:0">${o.simulated ? "테스트 시뮬레이터로 처리된 주문입니다. 실제 결제는 일어나지 않았어요." : "네이버페이 결제가 승인되었습니다."}</p>
      <dl>
        <dt>주문번호</dt><dd class="num">${esc(o.merchantPayKey)}</dd>
        <dt>네이버페이 결제번호</dt><dd class="num">${esc(o.paymentId)}</dd>
        <dt>상품</dt><dd>${esc(o.productName)}</dd>
        <dt>결제금액</dt><dd class="num"><b>${won(o.total)}원</b>${o.taxEx ? ` (면세 ${won(o.taxEx)}원 포함)` : ""}</dd>
        <dt>받는 분</dt><dd>${esc(o.ship.name)}</dd>
      </dl>
      <a class="btn primary" style="width:100%;flex:none" href="index.html">쇼핑 계속하기</a>
    </div></div>`;
    window.scrollTo({ top: 0 });
  }

  /* ---------- 전역 이벤트 ---------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-add], [data-toast]"); if (!t) return;
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
    shell();
    ({ home: pageHome, shop: pageShop, product: pageProduct, cart: pageCart, order: pageOrder }[PAGE] || pageHome)(view);
  })();
})();
