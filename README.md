# 탱둥 자산

구글 시트를 읽어 모바일에서 보는 자산·리밸런싱 앱입니다.
GitHub Actions 가 하루 두 번 시트를 내려받아 `data.json` 으로 바꿔 두고, 앱은 그 파일을 읽습니다.

```
구글 시트  →  Actions (하루 2회)  →  data.json  →  앱(index.html)
```

## 설치 (10분)

### 1. 저장소 만들기

GitHub 에서 새 저장소를 만들고 이 폴더의 파일을 전부 올립니다.
웹에서 하시려면 저장소 첫 화면의 **uploading an existing file** 을 눌러 파일을 끌어다 놓으면 됩니다.

> 저장소는 **Public** 으로 둡니다. GitHub Pages 를 무료로 쓰려면 필요합니다.
> 대신 페이지 주소를 아는 사람은 금액을 볼 수 있으니 주소를 공유하지 마세요.

### 2. 구글 시트 공유 확인

시트 → **공유** → 일반 액세스를 **링크가 있는 모든 사용자 · 뷰어** 로 둡니다.
Actions 가 로그인 없이 시트를 내려받아야 해서 필요합니다.

`config.json` 의 `sheetId` 가 본인 시트인지 확인하세요.
주소 `docs.google.com/spreadsheets/d/`**`이부분`**`/edit` 이 시트 ID 입니다.

### 3. Actions 에 쓰기 권한 주기

저장소 **Settings → Actions → General → Workflow permissions** 에서
**Read and write permissions** 을 켜고 저장합니다. (data.json 을 커밋해야 합니다)

### 4. GitHub Pages 켜기

**Settings → Pages → Build and deployment → Source: Deploy from a branch**
브랜치는 `main`, 폴더는 `/ (root)` 로 두고 저장합니다.
1~2분 뒤 `https://<아이디>.github.io/<저장소이름>/` 이 열립니다.

폰에서 그 주소를 열고 **홈 화면에 추가** 하면 앱처럼 씁니다.

### 5. 첫 갱신 돌려보기

**Actions** 탭 → 왼쪽 **sync** → **Run workflow** 를 누릅니다.
초록불이 들어오면 `data.json` 이 갱신된 것입니다.

## 평소 사용

구글 시트만 고치면 됩니다. 하루 두 번(오전 6시·오후 6시) 자동으로 반영됩니다.
바로 반영하고 싶으면 Actions 탭에서 **sync → Run workflow** 를 누르세요.

앱 안에서도 우측 상단 톱니바퀴 → **다시 불러오기** 로 최신 `data.json` 을 다시 읽습니다.

## 파일 설명

| 파일 | 하는 일 |
|---|---|
| `index.html` | 앱 본체. 열리면 옆의 `data.json` 을 읽습니다 |
| `data.json` | 시트에서 뽑은 데이터. Actions 가 덮어씁니다 |
| `config.json` | 시트 ID |
| `scripts/build-data.mjs` | 시트를 내려받아 `data.json` 으로 변환 |
| `.github/workflows/sync.yml` | 실행 시각과 절차 |

## 시트 읽는 규칙

탭 이름이 아니라 **표의 머리글**로 찾습니다. 탭 순서가 바뀌거나 이름이 달라져도 동작합니다.

| 데이터 | 찾는 표 |
|---|---|
| 계좌 · 보유 · 목표비중 | `TICKER` `보유수량` `제안 포트 비중` 이 있는 표 |
| 자산 · 부채 | `대상` `재무` `유형` `내용` `금액` 이 있는 표 |
| 시세 | `ticker` `종목명` `price` 가 있는 표 |
| 수익률 시계열 | `날짜` `기말평가금액` `투자손익` 이 있는 표 |
| 시장 지표 | `현재가` `52주최고가` 가 있는 표 |

계좌 원금은 `투자요약` 블록에서 읽되, 라벨이 없으면 `계좌 평가잔고` 값과 실제 평가액을 대조해 찾습니다.
부동산 가용자산은 **순자산에서 연금저축과 주택청약을 뺀 금액**으로 계산합니다.

## 잘 안 될 때

**Actions 가 빨간불** — 로그를 열어 봅니다.
`시트를 받지 못했습니다` 면 시트 공유 설정이 풀린 것이고,
`표를 못 찾았습니다` 면 시트에서 해당 표의 머리글이 바뀐 것입니다.

**앱에 옛날 숫자** — 톱니바퀴 → 다시 불러오기. 그래도 그대로면 Actions 가 아직 안 돈 것입니다.

**data.json 을 못 찾음** — `index.html` 과 `data.json` 이 같은 폴더에 있어야 합니다.
파일을 더블클릭해서 열면 브라우저가 막을 수 있으니 Pages 주소로 여세요.

## 로컬에서 확인

```bash
npm install
SOURCE_FILE=시트.xlsx node scripts/build-data.mjs   # 내려받은 엑셀로 data.json 만들기
npx http-server .                                    # 또는: python3 -m http.server
```
