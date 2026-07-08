# 브리프 작성 규칙 (STYLE_GUIDE)

`briefs_files/`에 들어가는 브리프 본문 HTML 작성 규칙. 새 원고가 들어오면
이 규칙에 맞춰 표준 양식으로 변환한다. 캐노니컬 템플릿은
**`brief-lorenz-chaos-climate.html`**.

---

## 1. 기본 원칙
- **언어**: 한국어 본문, 일반 기술 용어는 영어 그대로 (e.g., transformer, ensemble)
- **톤**: Distill 풍의 조용한 editorial — 박스/그라디언트/이모지 지양
- **레이아웃**: 단일 컬럼 760px max, 좌우 32px 패딩
- **폰트**: Paperlogy → Pretendard Variable → Inter (한글 가독성 우선)
- **컬러**: KEI 팔레트 (cream `#f6f0e3`, navy `#0f1624`, blue `#009fde` 등)

---

## 2. 파일 위치 / 명명
- 본문: `release/briefs_files/brief-{slug}.html`
- slug: 영문 kebab-case (예: `brief-cnn-traffic-noise`, `brief-lorenz-chaos-climate`)
- 보조 파일(이미지·데이터)이 많으면 `briefs_files/{slug}/` 하위 폴더 권장

---

## 3. 표준 HTML 골격

### 3.1 `<head>`
- `<title>{제목} · KEI AI 융합연구단</title>`
- `<meta name="description">` 한 줄 요약 (검색·SNS 미리보기용)
- 폰트 link: Archivo, Inter, JetBrains Mono, Space Grotesk + Paperlogy + Pretendard
- 경로 접두: `../manifest.json`, `../assets/...`

### 3.2 hero band (`<header class="hero-band">`)
- 배경: `../assets/hero-bg.jpg` + scrim
- 좌상단: KEI·AI brandmark (Mondrian 56px + 워드마크 30px)
- 우상단: `← Back` → `../briefs.html`
- KEI·AI 로고 링크: 현재 `../index.ko.html` (KEI·AI 홈)
- ※ 별도 펄스 dot은 사용하지 않음 (brandmark가 충분히 강함)

### 3.3 `<header class="article-header">`
```html
<header class="article-header">
  <div class="page-label">
    <span class="dot" aria-hidden="true"></span>
    <span>Brief</span>
  </div>
  <h1>{제목}</h1>
  <p class="article-subtitle">{부제 (생략 가능)}</p>
  <p class="byline">{저자 라인}</p>
  <p class="article-meta">
    <span class="date">YYYY.MM.DD</span> · <em>{분야 1} · {분야 2}</em>
  </p>
</header>
```

**저자 라인 패턴**
- 단독: `홍길동`
- 공동: `홍길동 · 박개똥`
- AI 협업: `AI 생성 · {검토자} 검토` (예: `AI 생성 · 김경호 검토`)

**분야 라벨** (영어, em으로 강조)
- 예: `Climate · Dynamical systems`, `Computer vision · Acoustics`,
  `Time-series · Forecasting`, `Remote sensing · Deep learning`,
  `NLP · Policy analysis`

### 3.4 abstract
```html
<p class="article-abstract">{초록 1–3문장}</p>
```
좌측 KEI 블루 선 + 18px 본문체.

### 3.5 본문
섹션 단위로 묶어 `<div class="article-body">` 내부에 배치:
```html
<div class="article-body">
  <section id="discovery">
    <h2>섹션 제목</h2>
    <p>...</p>
  </section>
  <section id="...">
    ...
  </section>
</div>
```

---

## 4. 사용 가능한 본문 컴포넌트

### 4.1 헤딩 / 강조
- `<h2>` 섹션, `<h3>` 하위 섹션
- `<strong>` 굵게(ink), `<em>` italic(ink)
- `<a>` KEI 블루 + 점선 밑줄

### 4.2 리스트 · 인용 · 코드
- `<ul>` / `<ol>` 들여쓰기 24px
- `<blockquote>` 좌측 옅은 선 + italic
- 인라인 `<code>` 옅은 회색 배경
- `<pre><code>` 블록 좌측 선 + 모노

### 4.3 callout (정보·경고)
```html
<div class="callout">
  <p class="callout-title">제목</p>
  <p>본문</p>
</div>
```
경고는 `<div class="callout callout-warn">` — 좌측 선이 amber로.

### 4.4 변수 정의 (var-list)
수식 변수/매개변수 설명용:
```html
<dl class="var-list">
  <div class="var-row">
    <dt>x</dt>
    <dd>설명…</dd>
  </div>
</dl>
```
`dt`는 serif italic.

### 4.5 수식 블록 (figure-equations)
```html
<figure class="figure-equations">
  <div class="equations-display">
    <div class="eq-line">
      <span class="eq-lhs">dx / dt</span>
      <span class="eq-op">=</span>
      <span class="eq-rhs">σ ( y − x )</span>
    </div>
  </div>
</figure>
```

### 4.6 데이터 행 (data-table)
표 대신 grid 행 형식:
```html
<div class="data-table">
  <div class="data-row">
    <span class="data-label">라벨</span>
    <span class="data-value">값</span>
    <span class="data-note">설명</span>
  </div>
</div>
```

### 4.7 비교 카드 (comparison-grid)
3–4개 사례 나열 (carousel 아닌 흐르는 텍스트):
```html
<div class="comparison-grid">
  <div class="comparison-card">
    <h3>제목</h3>
    <p>설명</p>
  </div>
</div>
```

### 4.8 캔버스 도해 (figure-canvas)
JS로 그리는 시각화:
```html
<figure class="figure-canvas">
  <canvas id="my-canvas" role="img" aria-label="..."></canvas>
  <figcaption>설명</figcaption>
</figure>
```
스크립트는 `IntersectionObserver`로 스크롤 도달 시 시작 (lazy-start).

### 4.9 슬라이더 explorer (explorer-box)
사용자 매개변수 조작:
```html
<div class="explorer-box">
  <canvas id="my-explorer" role="img"></canvas>
  <div class="slider-group">
    <div class="slider-row">
      <label for="x-slider">라벨</label>
      <input type="range" id="x-slider" min="0" max="10" value="5">
      <span class="slider-val" id="x-val">5.0</span>
    </div>
    <button id="reset-btn" class="reset-btn">초기화</button>
  </div>
</div>
```

---

## 5. References
APA 7판 hanging-indent. URL은 DOI 우선:
```html
<section class="article-refs">
  <h2>References</h2>
  <ul class="references">
    <li>저자 (연도). 제목. <em>저널명, 권</em>(호), 면.
        <a href="https://doi.org/...">https://doi.org/...</a></li>
  </ul>
</section>
```

---

## 6. Colophon (선택)
글의 출처/제작 노트가 있으면:
```html
<p class="colophon">본 고는 ...에 기초한 해설이다.</p>
```

---

## 7. 마무리 nav
```html
<nav class="article-end-nav">
  <a href="../briefs.html">← 브리프 목록</a>
</nav>
```

---

## 8. 발간 체크리스트
1. `briefs_files/brief-{slug}.html` 파일 생성 (캐노니컬 템플릿 복제)
2. 모든 자산/페이지 경로에 `../` 접두 확인
   (`../manifest.json`, `../assets/...`, `../index.ko.html`, `../briefs.html`)
3. 캔버스 시각화는 `IntersectionObserver`로 lazy-start
4. Mondrian 토픽바: `mountMondrianLogo('topbar-mondrian', { size: 56, ... })`
   (모듈 import 경로는 `../assets/logo-mondrian.js`)
5. `briefs.html` 목록에 한 줄 추가 — **항상 최상단**(역시간순):
   ```html
   <a class="brief" href="briefs_files/brief-{slug}.html">
     <span class="date">YYYY.MM</span>
     <span class="body">
       <span class="title">{제목}</span>
       <span class="meta">{저자} · <em>{분야}</em></span>
     </span>
     <span class="link">READ <span class="arrow">→</span></span>
   </a>
   ```

---

## 9. 컬러·타이포 토큰 참고
| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--bg` | `#f6f0e3` | 페이지 배경 (cream) |
| `--ink` | `#0f1624` | 본문 텍스트 (navy) |
| `--blue` | `#009fde` | KEI 블루 (강조·링크) |
| `--green` | `#00ab84` | KEI 그린 |
| `--amber` | `#ff8a2a` | KEI 앰버 |
| `--warn` | `#c46411` | 경고 callout 좌측선 |
| `--muted-strong` | `rgba(15,22,36,.82)` | 본문 회색 톤 |
| `--muted` | `rgba(15,22,36,.62)` | 캡션·메타 |
| `--line` | `rgba(15,22,36,.12)` | 섹션 구분선 |
| `--line-soft` | `rgba(15,22,36,.06)` | 표 내부 행 구분 |
| `--serif` | (sans-serif Paperlogy stack — name kept for compatibility, value is gothic) | 표·수식·변수기호 컨테이너 (시각 일관성을 위해 본문과 같은 sans) |

폰트 크기:
- h1: `clamp(28px, 3.6vw, 40px)` / line-height 1.22
- h2: `clamp(22px, 2.2vw, 28px)` / line-height 1.30
- h3: 19px
- 본문: 17px / line-height 1.85
- abstract: 18px / line-height 1.80
- caption / meta: 14–14.5px

---

## 10. 새 원고 변환 워크플로우
1. 원고 폴더(보통 `Z:\KKH_Server\Test\` 등)에서 HTML/CSS/JS 모두 읽기
2. 분야(field) 결정 (영어 라벨 1–3개)
3. 캐노니컬 템플릿(`brief-lorenz-chaos-climate.html`) 복제
4. `<head>`의 title·description 교체
5. article-header(제목·부제·저자·날짜·분야) 교체
6. abstract 1–3문장
7. 본문 섹션을 위 컴포넌트 매핑대로 재구성
   - 원문이 비표준 컴포넌트를 쓰면 → 가장 가까운 표준 컴포넌트로 매핑
8. References APA 형식으로 정리
9. 인터랙티브 요소가 있으면 스크립트 inline 또는 별도 모듈로 추가
10. `briefs.html` 목록 최상단에 항목 추가
11. 로컬 서버(`http://localhost:8765/`)로 확인 후 발간
