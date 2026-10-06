# 프롬강화 쇼핑몰

GitHub Pages로 무료 호스팅하는 정적 쇼핑몰입니다. (이매진 프로덕션 홈페이지와 같은 방식)
**상품·가격·문구·배너는 `data/` 폴더의 JSON 파일에 있어서, 코드를 몰라도 JSON만 수정하면 사이트가 바뀝니다.**

## 폴더 구조

```
index.html        메인 (배너 · 추천 상품)
shop.html         상품 목록 (카테고리 · 검색 · 정렬)
product.html      상품 상세
cart.html         장바구니
order.html        주문서 · 네이버페이 결제 · 주문 완료
404.html          없는 주소 접속 시 표시
data/
  site.json       상호, 대표, 사업자번호, 고객센터, 배송비 정책, 카테고리, 네이버페이 설정
  home.json       메인 배너(슬라이드), 메인 상품 묶음
  products.json   상품 목록 (이름, 가격, 할인 전 가격, 이미지, 원산지 …)
assets/
  css/style.css   디자인 (맨 위 :root 에서 색상·폰트 변경)
  js/main.js      화면 구성 · 장바구니 · 결제 로직 (보통 수정할 필요 없음)
  images/         이미지 파일 (logo.png = 상단 로고)
server/
  naverpay-approve-worker.js   네이버페이 결제 승인 서버 (실결제 때만 필요, 4장 참고)
```

## 1. GitHub에 올리기 (최초 1회)

1. GitHub에서 새 저장소(Repository) 생성 — 예: `fromganghwa` (Public)
   - 기존 `FROMGANGHWA` 저장소(AI Studio 버전)는 그대로 두고 새로 만드는 걸 권장합니다.
2. **Add file → Upload files** 로 이 폴더 안의 파일/폴더를 전부 끌어다 놓고 **Commit changes**
   - `.nojekyll` 파일도 같이 올라가야 합니다 (숨김 파일이라 안 보이면 탐색기에서 '숨긴 항목 표시')
3. 저장소 **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save
4. 1~2분 후 `https://dlawngns94.github.io/fromganghwa/` 에서 확인

> 내 컴퓨터에서 index.html 을 더블클릭하면 상품이 안 뜹니다 (브라우저 보안상 JSON을 못 읽음). GitHub Pages 주소로 확인하세요.

## 2. 상품 추가 · 가격 변경

GitHub 웹에서 `data/products.json` 을 열고 ✏️(연필) → 수정 → **Commit changes** 하면 1~2분 뒤 반영됩니다.

```json
{ "id": "p13", "cat": "farm", "name": "강화 단호박 5kg", "sub": "한 줄 설명",
  "price": 19900, "was": 23000, "image": "assets/images/pumpkin.jpg", "flag": "NEW",
  "taxFree": true, "origin": "인천 강화군", "unit": "5kg (4–6통)", "pack": "상온 (종이박스)",
  "sold": 0, "detail": "상세 설명 문단" }
```

- `id` 는 겹치지 않게 (p13, p14 …) — 장바구니와 결제가 이 값으로 상품을 구분합니다
- `price` 판매가, `was` 할인 전 가격 (할인 없으면 `0`) → 할인율 자동 계산
- `cat` 은 `site.json` 의 `categories` 에 있는 id (farm, sea, side, own, craft)
- 사진이 없으면 `image` 대신 `"tile": ["#배경색", "#글자색"]` → 라벨 카드로 표시
- `flag` 사진 왼쪽 위 배지 (없으면 줄 삭제)
- `taxFree` 면세 상품이면 `true` (미가공 농·수산물 등 — **세무사 확인 필요**)
- `ticket: true` 체험권처럼 배송이 없는 상품 (배송비 제외)
- `sold` 판매량 — 메인 '이 상품 어때요?'와 추천순 정렬 기준

> JSON 주의: 항목 사이 쉼표(,)를 빠뜨리거나 마지막 항목 뒤에 쉼표를 붙이면 페이지가 안 뜹니다.
> 수정 후 화면에 '불러오지 못했어요'가 나오면 https://jsonlint.com 에 붙여넣어 오류를 확인하세요.

## 3. 메인 배너 · 회사 정보

- **배너**: `data/home.json` 의 `slides` (이미지, 작은 제목, 큰 제목(`\n`=줄바꿈), 설명, 클릭 시 이동할 주소)
- **메인 상품 묶음**: `sections` 의 `pick` — `"best"`(판매량순), `"sale"`(할인율순), 또는 `["p03","p04"]` 처럼 직접 지정
- **사업자 정보**: `data/site.json` 의 `company` — 현재 `(입력 필요)` 로 비어 있습니다.
  **전자상거래법상 쇼핑몰 하단 표시 의무 항목이라 오픈 전 반드시 채우세요.**
- **배송비 정책**: `site.json` 의 `shipping` (`freeOver` 무료배송 기준, `fee` 배송비)

## 4. 네이버페이 결제

### 지금 상태: 테스트 시뮬레이터
`site.json` 의 `naverpay.clientId` 가 비어 있으면, 결제 버튼이 **시뮬레이터**를 엽니다.
실제 결제창이 아니고 돈도 나가지 않습니다. 주문 → 결제 → 완료 흐름을 확인하는 용도입니다.

### 실제 결제창 연결 순서

GitHub Pages 는 서버가 없어서, **결제 승인**만 따로 처리할 작은 서버가 필요합니다.
`server/naverpay-approve-worker.js` 를 Cloudflare Workers(무료)에 올리면 됩니다.

1. **네이버페이 키 발급**
   - 테스트: https://developers.pay.naver.com 개발자 등록 → 개발용 Partner ID / Client ID / Client Secret / Chain ID
   - 실결제: 사업자등록 + 통신판매업 신고 → 네이버페이 가맹 신청·심사 → 운영 키 발급
   - 개발자센터에 서비스 도메인(예: `https://www.도메인.co.kr`) 등록
2. **승인 서버 만들기 (Cloudflare)**
   1. https://dash.cloudflare.com 가입 → **Workers & Pages → Create → Worker** → 이름 `fromganghwa-pay` → Deploy
   2. **Edit code** → 기존 코드를 지우고 `server/naverpay-approve-worker.js` 내용을 붙여넣기 → Deploy
   3. **Settings → Variables and Secrets** 에 추가
      - `SITE_URL` = 사이트 주소 (예: `https://dlawngns94.github.io/fromganghwa` 또는 `https://www.도메인.co.kr`, 끝에 `/` 없이)
      - `NAVERPAY_MODE` = `development` (실결제 때 `production`)
      - `NAVERPAY_PARTNER_ID`, `NAVERPAY_CLIENT_ID`, `NAVERPAY_CHAIN_ID`
      - `NAVERPAY_CLIENT_SECRET` ← **Type 을 Secret 으로**
   4. 워커 주소 확인 (예: `https://fromganghwa-pay.아이디.workers.dev`)
3. **사이트에 연결**: `data/site.json`
   ```json
   "naverpay": {
     "mode": "development",
     "clientId": "발급받은 Client ID",
     "chainId": "발급받은 Chain ID",
     "approveEndpoint": "https://fromganghwa-pay.아이디.workers.dev"
   }
   ```
   → 커밋하면 주문서의 결제 수단 표시가 '개발(Sandbox)'로 바뀌고 실제 네이버페이 결제창이 열립니다.
4. 테스트 결제 확인 후 실결제 전환: `site.json` 의 `mode` 와 워커의 `NAVERPAY_MODE` 를 둘 다 `production` 으로.

> **Client Secret 은 절대 `site.json` 이나 GitHub 에 올리지 마세요.** 저장소가 공개라서 누구나 볼 수 있습니다. Cloudflare 의 Secret 에만 둡니다.
>
> 승인 서버는 사이트의 `products.json` 을 직접 읽어 금액을 다시 계산하고, 결제 금액이 다르면 자동 취소합니다. 그래서 가격은 `products.json` 한 곳만 고치면 됩니다.

### 아직 없는 것 (다음 단계)
- **주문 저장**: 지금은 승인 서버 로그(Cloudflare → Logs)에만 남습니다. 워커의 `TODO` 위치에 구글 시트(Apps Script) 저장이나 알림을 붙이세요.
- 회원가입·로그인, 주문 조회, 부분 취소/환불 화면

## 5. 공식 도메인 연결

1. 저장소 **Settings → Pages → Custom domain** 에 도메인 입력 → Save (`CNAME` 파일 자동 생성)
2. 도메인 구입처 DNS에 추가
   - `A` 레코드 4개: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www` → `CNAME` → `dlawngns94.github.io`
3. 연결 후 **Enforce HTTPS** 체크
4. 도메인을 바꿨으면 Cloudflare 워커의 `SITE_URL` 과 네이버페이 개발자센터 도메인도 같이 변경

## 6. 색상 · 로고 바꾸기

- `assets/css/style.css` 맨 위 `:root` — `--brand`(로고 리본 블루), `--sale`(할인율 색) 등
- 로고: `assets/images/logo.png` 를 같은 이름으로 덮어쓰기 (가로형, 투명 배경 PNG 권장)
