# 프롬강화 쇼핑몰

GitHub Pages로 무료 호스팅하는 정적 쇼핑몰입니다. (이매진 프로덕션 홈페이지와 같은 방식)
**상품·가격·문구·배너는 `data/` 폴더의 JSON 파일에 있어서, 코드를 몰라도 JSON만 수정하면 사이트가 바뀝니다.**

## 폴더 구조

```
index.html        메인 (배너 · 추천 상품)
shop.html         상품 목록 (카테고리 · 검색 · 정렬)
product.html      상품 상세
cart.html         장바구니
order.html        주문서 · 네이버페이/카카오페이 결제 · 주문 완료
login.html        카카오·네이버 로그인 = 회원가입 (처음이면 약관 동의 화면)
naver-callback.html, kakao-callback.html  로그인 후 돌아오는 화면 (직접 열 일 없음)
mypage.html       마이페이지 (주문 내역 · 회원 정보 · 탈퇴)
lookup.html       비회원 주문조회 (주문번호 + 휴대폰)
admin.html        관리자 주문 관리 (ADMIN_EMAILS 계정만)
privacy.html      개인정보처리방침 (초안 — 검토 필요)
terms.html        이용약관 (초안 — 검토 필요)
404.html          없는 주소 접속 시 표시
data/
  site.json       상호, 대표, 사업자번호, 고객센터, 배송비, 카테고리, 회원·결제 설정
  home.json       메인 배너(슬라이드), 메인 상품 묶음
  products.json   상품 목록 (이름, 가격, 할인 전 가격, 이미지, 원산지 …)
assets/
  css/style.css   디자인 (맨 위 :root 에서 색상·폰트 변경)
  js/main.js      화면 구성 · 장바구니 · 회원 · 결제 로직 (보통 수정할 필요 없음)
  images/         이미지 파일 (logo.png = 상단 로고)
server/
  worker.js       서버 — 결제 승인 · 주문 저장 · 네이버 로그인 · 관리자 (4장 참고)
  schema.sql      Supabase 데이터베이스 설정 (처음 한 번 실행)
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
- **사업자 정보**: `data/site.json` 의 `company` — 통신판매업 신고번호가 아직 `(입력 필요)` 입니다.
  **전자상거래법상 쇼핑몰 하단 표시 의무 항목이라 오픈 전 반드시 채우세요.**
  개인정보처리방침(`privacy.html`)의 보호책임자·연락처도 여기 값(대표자, 이메일, 고객센터 전화)이 자동으로 들어갑니다.
- **배송비 정책**: `site.json` 의 `shipping` (`freeOver` 무료배송 기준, `fee` 배송비)

## 4. 회원 · 주문 · 결제 설정

### 전체 구조

| 기능 | 담당 | 비용 |
|---|---|---|
| 화면 (지금 사이트) | GitHub Pages | 무료 |
| 회원 · 주문 저장 | Supabase (서울 리전) | 무료 플랜 |
| 결제 승인 · 네이버 로그인 · 비회원 조회 · 관리자 | Cloudflare Workers (`server/worker.js`) | 무료 플랜 |
| 로그인 | 카카오 로그인, 네이버 로그인 (비밀번호를 저장하지 않음) | 무료 |
| 결제 | 네이버페이, 카카오페이 | 결제 수수료만 |

아무 설정도 안 한 지금 상태에서도 사이트는 그대로 동작합니다. 로그인 화면에는 '오픈 준비 중'이 뜨고, 결제는 브라우저 안의 **시뮬레이터**로만 흉내 냅니다 (저장되지 않음).
아래 4-1, 4-2 를 마치면 **주문이 실제로 저장**되고(테스트 결제), 비회원 주문조회와 관리자 화면이 동작합니다. 그다음 로그인과 결제를 하나씩 붙이면 됩니다.

### 지금 상태: 결제 보류 · 구매 문의로 운영 중

`data/site.json` 의 `"checkout": { "mode": "inquiry" }` 라서, 장바구니의 버튼이 **구매 문의하기** 로 바뀌고 결제 화면 대신 **구매 문의서**(이름·휴대폰·주소·문의 내용)가 열립니다.
- 접수된 문의는 `admin.html` → **구매 문의** 에서 보고 전화로 연락한 뒤, 상태(새 문의 → 연락함 → 완료)와 메모를 남깁니다.
- 회원은 마이페이지에서 자기 문의 내역을 볼 수 있습니다.
- 상품 `price` 를 `0` 으로 두면 '가격 문의' 로 표시됩니다 (체험 상품 등).
- 카테고리에 `"disabled": true` 를 넣으면 메뉴에 '준비중' 으로 회색 표시되고 들어갈 수 없습니다.
- **결제를 다시 켜려면** `"mode": "payment"` 로 바꾸면 됩니다. 결제 코드(네이버페이·카카오페이)는 지우지 않고 그대로 두었습니다.
- 처음 한 번: `server/schema.sql` 의 **구매 문의(inquiries)** 부분을 Supabase SQL Editor 에서 실행하고, `server/worker.js` 를 Cloudflare 에 다시 붙여넣어 Deploy 해야 문의가 저장됩니다.

### 키 보관 원칙 (가장 중요)

| 키 | 넣는 곳 | 공개돼도 되나 |
|---|---|---|
| Supabase URL · anon(publishable) 키 | `data/site.json` | 됩니다 (RLS 로 보호) |
| 네이버 로그인 Client ID · 네이버페이 Client ID | `data/site.json` | 됩니다 |
| **Supabase service_role(secret) 키** | Cloudflare **Secret** | **절대 안 됩니다** (모든 회원·주문 접근 가능) |
| **카카오 Client Secret** | Supabase 관리 화면 | 안 됩니다 |
| **네이버 로그인 · 네이버페이 Client Secret, 카카오페이 Secret key** | Cloudflare **Secret** | 안 됩니다 |

비밀 키는 GitHub, 카톡, 메일 어디에도 붙여넣지 마세요. 저장소가 공개라서 누구나 볼 수 있습니다.

### 4-1. Supabase (회원 · 주문 저장소)

1. https://supabase.com 가입 → **New project**
   - Region: **Northeast Asia (Seoul)**
   - Database password 는 따로 적어 두세요 (사이트에는 쓰지 않음)
2. 왼쪽 **SQL Editor → New query** → `server/schema.sql` 내용을 전부 붙여넣고 **Run**
   - 회원(profiles)·주문(orders) 표와 RLS(본인 것만 보기) 규칙이 만들어집니다
3. **Project Settings → API Keys** 에서 확인
   - Project URL, **anon / publishable** 키 → `data/site.json` 의 `supabase`
   - **service_role / secret** 키 → 4-2 의 Cloudflare Secret 에만
4. **Authentication → URL Configuration**
   - Site URL: `https://www.fromganghwa.co.kr/`
   - Redirect URLs 에 추가: `https://www.fromganghwa.co.kr/login.html`

```json
"supabase": { "url": "https://프로젝트ID.supabase.co", "anonKey": "anon 또는 publishable 키" }
```

### 4-2. 서버 (Cloudflare Workers)

1. https://dash.cloudflare.com 가입 → **Workers & Pages → Create → Worker** → 이름 `fromganghwa-api` → Deploy
2. **Edit code** → 기존 코드를 지우고 `server/worker.js` 내용을 붙여넣기 → Deploy
3. **Settings → Variables and Secrets** 에 추가 (🔒 는 Type 을 **Secret** 으로)

   | 이름 | 값 |
   |---|---|
   | `SITE_URL` | `https://www.fromganghwa.co.kr` (끝에 `/` 없이) |
   | `SUPABASE_URL` | `https://프로젝트ID.supabase.co` |
   | `SUPABASE_SERVICE_KEY` 🔒 | Supabase service_role(secret) 키 |
   | `ADMIN_EMAILS` | 관리자로 쓸 카카오·네이버 계정 이메일 (여러 개면 쉼표) |
   | `TEST_MODE` | `true` — 결제 키 없이 '테스트 결제' 주문 허용. **실오픈 때 삭제** |

4. 워커 주소(예: `https://fromganghwa-api.아이디.workers.dev`)를 `data/site.json` 에 넣고 커밋

```json
"api": "https://fromganghwa-api.아이디.workers.dev"
```

→ 여기까지 하면 주문이 Supabase 에 저장되고, **비회원 주문조회(`lookup.html`)** 와 **관리자 화면(`admin.html`)** 이 동작합니다.
결제창은 아직 시뮬레이터이고, 주문은 '테스트 결제'로 저장됩니다.

### 4-3. 카카오 로그인

이메일 없이 **닉네임만** 받아 로그인합니다. 비즈 앱 전환 전에도 쓸 수 있어요. (로그인 처리는 워커가 직접 하고, Supabase 의 Kakao 설정은 쓰지 않습니다)

1. https://developers.kakao.com → 내 애플리케이션 → **애플리케이션 추가**
2. 앱 설정 → **플랫폼 → Web** 사이트 도메인: `https://www.fromganghwa.co.kr`
3. **카카오 로그인** 활성화 ON → **Redirect URI** 에 추가:
   `https://www.fromganghwa.co.kr/kakao-callback.html`
4. **동의항목**: **닉네임** 을 '필수 동의'로 설정 (이메일·프로필 사진은 설정하지 않아도 됨)
5. **REST API 키** → `data/site.json` 의 `"login": { "kakao": true, "kakaoRestKey": "…" }` (공개돼도 되는 값)
6. **보안 → Client Secret** 을 켰다면, 그 코드를 Cloudflare 워커 변수 `KAKAO_LOGIN_CLIENT_SECRET` 🔒 에 넣기
7. 워커 코드를 바꿨다면 Cloudflare 에서 `server/worker.js` 를 다시 붙여넣고 Deploy

> 카카오 회원은 Supabase 에 `kakao_회원번호@kakao.invalid` 라는 내부용 주소로 저장됩니다 (메일은 가지 않음).
> 관리자로 쓰려면 로그인 후 `admin.html` 에 들어가면 화면에 이 주소가 나오니, 그대로 `ADMIN_EMAILS` 에 넣으세요.
> 나중에 비즈 앱으로 전환해도 같은 회원번호로 계속 로그인됩니다.

### 4-4. 네이버 로그인

1. https://developers.naver.com → Application → **애플리케이션 등록**
   - 사용 API: **네이버 로그인** / 제공 정보: **이메일(필수)**, 이름
   - 환경: PC 웹 / 서비스 URL: `https://www.fromganghwa.co.kr`
   - Callback URL: `https://www.fromganghwa.co.kr/naver-callback.html`
2. Client ID → `data/site.json` 의 `"login": { "naverClientId": "…" }`
3. Cloudflare 워커 변수: `NAVER_LOGIN_CLIENT_ID`, `NAVER_LOGIN_CLIENT_SECRET` 🔒
4. 처음엔 '개발 중' 상태라 **멤버 관리에 등록한 네이버 아이디만** 로그인됩니다. 테스트 후 **검수 요청**을 하면 모두에게 열립니다.

> 같은 이메일로 카카오·네이버 둘 다 로그인하면 같은 회원으로 합쳐집니다.

### 4-5. 네이버페이 결제

1. https://developers.pay.naver.com 개발자 등록 → 개발용 Partner ID / Client ID / Client Secret / Chain ID
   - 실결제: 사업자등록 + 통신판매업 신고 → 네이버페이 가맹 신청·심사 → 운영 키 발급
   - 개발자센터에 서비스 도메인 등록
2. Cloudflare 워커 변수: `NAVERPAY_MODE`(`development`), `NAVERPAY_PARTNER_ID`, `NAVERPAY_CLIENT_ID`, `NAVERPAY_CLIENT_SECRET` 🔒, (그룹형만) `NAVERPAY_CHAIN_ID`
3. `data/site.json`
   ```json
   "naverpay": { "mode": "development", "clientId": "발급받은 Client ID", "chainId": "" }
   ```
   → 주문서의 네이버페이 표시가 '테스트 결제'로 바뀌고 실제 결제창(개발 환경)이 열립니다.

### 4-6. 카카오페이 결제

1. https://developers.kakaopay.com 가입 → 애플리케이션 추가 → **Secret key(dev)** 확인
2. Cloudflare 워커 변수: `KAKAOPAY_CID` = `TC0ONETIME` (테스트용), `KAKAOPAY_SECRET_KEY` 🔒
3. `data/site.json`
   ```json
   "kakaopay": { "enabled": true, "mode": "development" }
   ```
4. 실결제: 카카오페이 가맹 계약 → 운영 CID 와 운영 Secret key(PRD…) 로 교체 → `mode` 를 `production`

### 4-7. 실오픈 전 체크리스트

- [ ] 워커의 `TEST_MODE` 삭제 (남겨 두면 누구나 '테스트 결제' 주문을 만들 수 있음)
- [ ] 네이버페이: 워커 `NAVERPAY_MODE` 와 `site.json` 의 `naverpay.mode` 를 둘 다 `production`
- [ ] 카카오페이: 운영 CID·Secret key, `site.json` 의 `kakaopay.mode` 를 `production`
- [ ] 네이버 로그인 검수 완료, 카카오 비즈 앱 전환 완료
- [ ] `privacy.html`(개인정보처리방침) · `terms.html`(이용약관) 초안을 전문가에게 검토받고 시행일 수정
- [ ] `site.json` 의 통신판매업 신고번호 · 고객센터 전화번호 입력
- [ ] 테스트 주문은 관리자 화면에서 정리 (Supabase → Table Editor → orders 에서 삭제 가능)

### 관리자 주문 관리 (`admin.html`)

`ADMIN_EMAILS` 에 넣은 계정으로 로그인한 뒤 주소창에 `…/admin.html` 을 입력하세요. (메뉴에는 일부러 링크를 두지 않았습니다)
- 결제완료 → 상품준비중 → 배송중 → 배송완료 상태 변경, 택배사·운송장 번호 입력 (고객 마이페이지·비회원 조회에 표시)
- **결제 취소**: 네이버페이·카카오페이 전액 취소(환불)까지 한 번에 처리
- 새 주문 알림은 아직 없습니다. 워커 `markPaid` 의 `TODO` 위치에 텔레그램·알림톡 등을 붙일 수 있습니다.

### 회원 혜택 · 기록 보관

- **첫 주문 할인**: `site.json` 의 `member.firstOrderDiscount` (기본 10%). 가입을 마친 회원의 첫 결제 주문에 상품금액 기준으로 적용되고, 서버가 금액을 다시 계산합니다. 0 으로 바꾸면 꺼집니다 (상단 띠배너 문구도 함께 수정).
- **회원 탈퇴**: 회원 정보는 바로 삭제되고, 주문·결제 기록은 전자상거래법에 따라 회원 연결만 끊고 5년 보관합니다.
- 결제하지 않고 떠난 주문서는 1일 뒤 자동 삭제됩니다.

## 5. 공식 도메인 (연결 완료: www.fromganghwa.co.kr)

- 도메인: `fromganghwa.co.kr` (카페24, 만료 2028-10-07) → 사이트 주소는 **`https://www.fromganghwa.co.kr`**
- 카페24 **DNS 관리**: `www` → `CNAME` → `dlawngns94.github.io`, www 없는 주소 → `A` → `185.199.108.153`
  (카페24는 A 레코드를 1개만 받아서 하나만 등록. 네임서버는 '카페24 호스팅 네임서버' 그대로 두기)
- GitHub 저장소 **Settings → Pages → Custom domain** = `www.fromganghwa.co.kr`, **Enforce HTTPS** 체크
- 예전 주소(`dlawngns94.github.io/FROMGANGHWA`)와 `fromganghwa.co.kr` 은 자동으로 www 주소로 넘어갑니다

도메인을 다시 바꾸게 되면 함께 바꿀 곳:
- Cloudflare 워커 `SITE_URL`
- 카카오 콘솔: 플랫폼 Web 사이트 도메인, Redirect URI (`…/kakao-callback.html`)
- 네이버 로그인: 서비스 URL, Callback URL (`…/naver-callback.html`)
- 네이버페이·카카오페이 개발자센터의 서비스 도메인
- 주소가 바뀌면 브라우저에 저장된 로그인·장바구니는 초기화됩니다

## 6. 색상 · 로고 바꾸기

- `assets/css/style.css` 맨 위 `:root` — `--brand`(로고 리본 블루), `--sale`(할인율 색) 등
- 로고: `assets/images/logo.png` 를 같은 이름으로 덮어쓰기 (가로형, 투명 배경 PNG 권장)

## 7. 사진 출처 (무료 상업 이용 가능 사진)

실제 상품 사진이 준비되면 같은 파일 이름으로 덮어쓰세요. 아래 사진은 분위기를 보여 주는 연출 이미지입니다.

| 파일 | 사용 상품 | 출처 (라이선스) |
|---|---|---|
| `assets/images/redbean.jpg` | 팥 찜질팩 | https://www.pexels.com/photo/a-person-holding-dried-fruits-8891623/ (Pexels License) |
| `assets/images/mugwort-leaf.jpg` | 쑥 찜질팩 | https://unsplash.com/photos/VYEJUQbQxyA (Unsplash License) |
| `assets/images/seasonal-food.jpg` | 제철음식 만들기 | https://unsplash.com/photos/q-M8nQqBJvU (Unsplash License) |
| `assets/images/season.jpg` | 계절 체험 | https://unsplash.com/photos/qIblLeN4Gg0 (Unsplash License) |
| `assets/images/hanok-stay.jpg` | 강화 한옥 스테이 (예시 숙소) | https://unsplash.com/photos/F9l4HKHzR88 (Unsplash License) |
