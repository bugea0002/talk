# DESIGN.md — 카카오톡 CTI 성향 & 관계 분석 리포트 디자인 시스템

> **Design Reference Engine**: `Nutlope/inspo` (`inspo-mcp`)
> **Core Direction**: AI 템플릿 특유의 다크 글래스모피즘, 과도한 검정 브루탈리즘 테두리, 애플식 라운드 스퀘어(`rounded-2xl`/`3xl`), 알약형 타원(`rounded-full`), 기본 `Pretendard` 폰트를 전면 배제하고, **한국형 성향 분석·매거진 리포트 시트(Warm Paper Editorial Sheet)** 감성으로 재구축합니다.

---

## 1. 핵심 안티 패턴 제거 원칙 (Zero AI-Slop & Zero Apple-Squircle)

1. **과도한 검정 강조 금지**:
   - 순수 검정(`#000000`, `#18181B`) 배경 블록, 두꺼운 2px 검정 테두리, 검정 하드 그림자(`shadow-[0_4px_0_0_#18181B]`)를 사용하지 않습니다.
   - 기본 잉크는 눈이 편안한 **소프트 차콜(`#262523`)**을 사용하고, 모든 경계선은 **은은한 1px 웜 스톤 보더(`#E6E1D6`)** 또는 테마별 파스텔 보더로만 처리합니다.
2. **애플식 라운드 스퀘어 & 타원(Pill) 금지**:
   - `rounded-2xl`, `rounded-3xl`, `rounded-[28px]`, `rounded-[36px]` 같은 둥글둥글한 카드와 `rounded-full` 알약 배지·원형 아바타 버블을 제거합니다.
   - 모든 시트와 카드는 **매거진/도감 리포트 규격(`4px` - `6px`)**, 배지·태그는 **사각 스탬프(`2px` - `3px`)**, 아바타는 **폴라로이드 사각 프레임(`4px`)**, 게이지 바는 **직선형 바(`2px`)**로 통일합니다.
3. **네온 글로우 및 그라데이션 텍스트 금지**:
   - `blur-3xl` 배경 오브, `bg-clip-text text-transparent` 무지개 텍스트를 제거하고, 종이 위 형광펜 마커 하이라이트로 포인트를 줍니다.

---

## 2. 컬러 토큰 (Warm Paper & Soft Tint Palette)

### 2.1 베이스 서피스 (Base Surfaces)
- **Canvas (`--color-paper`)**: `#FAF7F2` — 따뜻한 미색 리포트 용지 배경
- **Primary Sheet (`--color-surface`)**: `#FFFFFF` — 1단계 순백색 리포트 시트
- **Secondary Well (`--color-surface-subtle`)**: `#F4F1EA` — 2단계 샌드 베이지 보조 영역
- **Hairline Rule (`--color-rule`)**: `#E6E1D6` — 1px 솔리드 구분선

### 2.2 타이포그래피 잉크 (Typography Ink)
- **Primary Ink (`--color-ink`)**: `#262523` — 부드럽고 선명한 소프트 차콜 본문/제목
- **Secondary Ink (`--color-ink-secondary`)**: `#524E48` — 차분한 웜 슬레이트 부제목/설명
- **Muted Caption (`--color-muted`)**: `#78736A` — 캡션, 날짜, 보조 인덱스

### 2.3 분석 테마별 포인트 & 파스텔 틴트 (Mode Semantic Tokens)
- **Mode 01: 단톡방 전체 케미 (`chemistry`)**
  - Accent: `#EA580C` (Warm Terracotta Orange)
  - Soft Surface: `#FFF5EE` / Border: `#FDBA74`
  - Marker Highlight: `#FEF08A` (Soft Butter Marker)
- **Mode 02: 썸·연인 1:1 애정도 (`romance`)**
  - Accent A (Pink/Rose): `#E11D48` / Soft Surface: `#FFF1F3` / Border: `#FECDD3`
  - Accent B (Sky/Blue): `#0284C7` / Soft Surface: `#F0F9FF` / Border: `#BAE6FD`
- **Mode 03: 조별과제 빌런 탐지 (`villain`)**
  - Accent Hero (Teal/Emerald): `#0D9488` / Soft Surface: `#F0FDFA` / Border: `#99F6E4`
  - Accent Caution (Crimson Rose): `#E11D48` / Soft Surface: `#FFF1F2` / Border: `#FECDD3`

---

## 3. 타이포그래피 시스템 (Free Editorial Korean Fonts)

기존 `Pretendard`를 전면 제거하고, 성향 테스트·매거진·데이터 리포트에서 가독성과 개성이 뛰어난 무료 한글 웹폰트 3종을 조합합니다.

- **Display / Headline (`--font-display`)**: **`Paperlogy` (페이퍼로지)**
  - 메인 타이틀, 리포트 섹션 헤더, 핵심 점수 디스플레이에 사용하여 또렷하고 경쾌한 인상을 부여합니다.
- **Body / UI / Table (`--font-sans`)**: **`SUIT Variable` (수트)**
  - 긴 분석 문장, 대화 인용구, 성적표 테이블, 버튼 UI에서 자간과 글리프 균형이 뛰어난 본문용 무료 폰트입니다.
- **Numeric / Code (`--font-mono`)**: **`IBM Plex Mono`** (`font-variant-numeric: tabular-nums`)
  - `01 / GROUP`, `ELFA`, 백분율(`%`), 시간(`분`), 랭킹 넘버링에 고정폭 숫자를 강제합니다.
