/**
 * 구글 시트를 통째로 내려받아 data.json 으로 바꿉니다.
 * GitHub Actions 에서 실행됩니다. 로컬 확인: SOURCE_FILE=book.xlsx node scripts/build-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const CONFIG = JSON.parse(fs.readFileSync(new URL("../config.json", import.meta.url), "utf8"));
const SHEET_ID = process.env.SHEET_ID || CONFIG.sheetId;
const OUT = new URL("../data.json", import.meta.url);

const TAB_SPEC = [
  { k: "invest", tab: "투자", label: "계좌 · 보유 · 목표비중" },
  { k: "asset", tab: "자산", label: "자산 · 부채" },
  { k: "price", tab: "한국거래소", label: "시세" },
  { k: "series", tab: "수익률시계열", label: "수익률 시계열" },
  { k: "market", tab: "종합(요약)", label: "시장 지표" },
];
const PARSER = { invest: parseInvest, asset: parseAssets, price: parsePrices, series: parseSeries, market: parseMarket };

function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n") { row.push(f); f = ""; rows.push(row); row = []; }
    else if (ch !== "\r") f += ch;
  }
  row.push(f); rows.push(row);
  return rows;
}
const nz = (v) => String(v == null ? "" : v).replace(/\s+/g, "");
const cell = (rows, r, c) => (rows[r] && rows[r][c] != null ? String(rows[r][c]) : "");
const toNum = (v) => {
  const t = String(v == null ? "" : v).trim();
  if (!t || t === "-" || t === "#DIV/0!") return 0;
  const neg = t.indexOf("-") >= 0 || /^\(.*\)$/.test(t);
  const d = t.replace(/[^0-9.]/g, "");
  if (!d) return 0;
  const n = parseFloat(d);
  return isNaN(n) ? 0 : (neg ? -n : n);
};
const tk6 = (v) => { const t = nz(v).replace(/\D/g, ""); return t ? t.padStart(6, "0") : ""; };
const findHeader = (rows, need) => {
  for (let r = 0; r < rows.length; r++) {
    const set = (rows[r] || []).map(nz);
    if (need.every((n) => set.indexOf(n) >= 0)) return r;
  }
  return -1;
};
const colMap = (rowArr, from) => {
  const H = {};
  (rowArr || []).forEach((h, i) => { const k = nz(h); if (k && i >= (from || 0) && H[k] === undefined) H[k] = i; });
  return H;
};
const findLabel = (rows, label) => {
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < (rows[r] || []).length; c++)
      if (nz(rows[r][c]) === nz(label)) return { r, c };
  return null;
};

/* --- 한국거래소: 시세 --- */
function parsePrices(rows) {
  const hr = findHeader(rows, ["ticker", "종목명", "price"]);
  if (hr < 0) return null;
  const H = colMap(rows[hr]);
  const out = {};
  for (let r = hr + 1; r < rows.length; r++) {
    const tk = tk6(cell(rows, r, H["ticker"]));
    if (!tk) continue;
    out[tk] = { n: cell(rows, r, H["종목명"]).trim(), p: toNum(cell(rows, r, H["price"])), y: toNum(cell(rows, r, H["closeyest"])) };
  }
  return Object.keys(out).length ? out : null;
}

/* --- 투자: 계좌 · 보유 · 목표비중 --- */
const acctIdOf = (o, means, broker) => {
  const t = o === "탱" ? "t" : "d";
  const m = nz(means), b = nz(broker);
  if (m.indexOf("연금") >= 0) return t + (b.indexOf("프리즘") >= 0 ? "-pp" : "-ps");
  if (m.indexOf("ISA") >= 0) return t + "-isa";
  return t + "-tr";
};
const acctIdOfLabel = (lab) => {
  const s = nz(lab);
  const o = s.indexOf("탱") === 0 ? "t" : s.indexOf("둥") === 0 ? "d" : null;
  if (!o) return null;
  if (s.indexOf("연저") >= 0 || s.indexOf("연금") >= 0) return o + (s.indexOf("프리즘") >= 0 ? "-pp" : "-ps");
  if (s.indexOf("ISA") >= 0) return o + "-isa";
  if (s.indexOf("위탁") >= 0) return o + "-tr";
  return null;
};
function parseInvest(rows) {
  const OFF = {
    "대상": -5, "유형": -4, "수단": -3, "회사": -2, "지역": -1,
    "종목": 1, "시장가": 2, "평단가": 3, "손익": 4, "보유수량": 5,
    "평가액": 6, "실포트비중": 7, "제안포트비중": 8, "제안보유수량": 9,
  };
  const fill = (H, T) => {
    Object.keys(OFF).forEach((k) => { if (H[k] === undefined && T + OFF[k] >= 0) H[k] = T + OFF[k]; });
    return H;
  };
  let hr = findHeader(rows, ["대상", "유형", "수단", "회사", "지역", "TICKER"]);
  if (hr < 0) hr = findHeader(rows, ["TICKER", "종목", "보유수량", "제안포트비중"]);
  let H = null;
  if (hr >= 0) {
    H = colMap(rows[hr]);
    if (H["TICKER"] !== undefined) fill(H, H["TICKER"]);
  } else {
    /* 헤더가 통째로 지워진 경우: 데이터 행에서 열 위치를 찾아냅니다 */
    for (let r = 0; r < rows.length && !H; r++) {
      const row = rows[r] || [];
      let oi = -1;
      for (let i = 0; i < row.length; i++) { const v = nz(row[i]); if (v === "탱" || v === "둥") { oi = i; break; } }
      if (oi < 0) continue;
      const ti = oi + 5;
      if (!/^\d{6}$/.test(nz(row[ti]))) continue;
      if (!toNum(row[ti + 2]) || !toNum(row[ti + 5])) continue;
      H = fill({ "대상": oi, "TICKER": ti }, ti);
      hr = r - 1;
    }
  }
  if (!H || H["보유수량"] === undefined || H["제안포트비중"] === undefined) return null;
  const accts = [], byId = {}, holds = [], meta = {};
  for (let r = hr + 1; r < rows.length; r++) {
    const o = nz(cell(rows, r, H["대상"]));
    if (o !== "탱" && o !== "둥") { if (accts.length) break; else continue; }
    const means = cell(rows, r, H["수단"]).trim(), broker = cell(rows, r, H["회사"]).trim();
    const id = acctIdOf(o, means, broker);
    if (!byId[id]) {
      byId[id] = { id, o, nm: means, br: broker, cash: 0, cost: 0, liq: nz(means).indexOf("연금") < 0 };
      accts.push(byId[id]);
    }
    const tk = tk6(cell(rows, r, H["TICKER"]));
    const name = cell(rows, r, H["종목"]).trim();
    if (!tk) { if (name.indexOf("현금") >= 0) byId[id].cash += toNum(cell(rows, r, H["평가액"])); continue; }
    holds.push([id, tk, toNum(cell(rows, r, H["평단가"])), toNum(cell(rows, r, H["보유수량"])), toNum(cell(rows, r, H["제안포트비중"]))]);
    meta[tk] = {
      n: name, p: toNum(cell(rows, r, H["시장가"])),
      t: cell(rows, r, H["유형"]).trim() || "주식",
      r: cell(rows, r, H["지역"]).trim() || "기타",
    };
  }
  if (!accts.length) return null;

  /* 계좌별 실제 평가액 (원금 열을 찾아내는 대조용) */
  const invBy = {};
  holds.forEach(([id, tk, , q]) => { invBy[id] = (invBy[id] || 0) + (meta[tk] ? meta[tk].p * q : 0); });

  /* 원금: 먼저 라벨로, 못 찾으면 평가잔고 값으로 열을 대조 */
  const rowOf = (name) => {
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < Math.min((rows[r] || []).length, 3); c++)
        if (nz(rows[r][c]) === name) return r;
    return -1;
  };
  const pr = rowOf("투자원금"), vr = rowOf("계좌평가잔고");
  if (pr >= 0) {
    const lr = findHeader(rows, ["투자요약"]);
    if (lr >= 0) (rows[lr] || []).forEach((lab, i) => {
      const id = acctIdOfLabel(lab);
      if (id && byId[id]) byId[id].cost += toNum(cell(rows, pr, i));
    });
    if (vr >= 0) accts.forEach((a) => {
      if (a.cost) return;
      const want = invBy[a.id] || 0;
      if (!want) return;
      for (let c = 2; c < (rows[vr] || []).length; c++) {
        if (Math.abs(toNum(cell(rows, vr, c)) - want) < 2) { a.cost = toNum(cell(rows, pr, c)); break; }
      }
    });
  }
  return { accounts: accts, holdings: holds, meta };
}

/* --- 자산: 자본 · 부채 --- */
function parseAssets(rows) {
  let hr = findHeader(rows, ["대상", "재무", "유형", "내용", "금액"]);
  if (hr < 0) hr = findHeader(rows, ["대상", "재무", "유형", "내용"]);
  if (hr < 0) return null;
  const H = colMap(rows[hr]);
  if (H["금액"] === undefined && H["내용"] !== undefined) H["금액"] = H["내용"] + 1;
  if (H["금액"] === undefined) return null;
  const asset = []; let debt = null;
  for (let r = hr + 1; r < rows.length; r++) {
    const o = nz(cell(rows, r, H["대상"]));
    if (o !== "탱" && o !== "둥") { if (asset.length || debt) break; else continue; }
    const k = nz(cell(rows, r, H["재무"]));
    const nm = cell(rows, r, H["내용"]).trim();
    const v = toNum(cell(rows, r, H["금액"]));
    const t = cell(rows, r, H["유형"]).trim();
    if (k === "투자") continue;
    if (k === "부채") { debt = { o, nm, v: Math.abs(v) }; continue; }
    asset.push({ o, k: "자본", t, nm, v, liq: nm.indexOf("주택청약") < 0 });
  }
  if (!asset.length) return null;
  return { asset, debt: debt || { o: "탱", nm: "부채", v: 0 } };
}

/* --- 종합(요약): 시장 지표 --- */
function parseMarket(rows) {
  const out = []; let cur = null;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const k = nz(row[c]);
      if (k !== "현재가" && k !== "52주최고가" && k !== "52주최저가") continue;
      const v = toNum(cell(rows, r, c + 1));
      if (k === "현재가") {
        const nm = (row[0] || "").trim();
        if (cur && cur.nm && cur.hi != null && cur.lo != null) out.push(cur);
        cur = { nm: nm || (cur ? cur.nm : ""), v, hi: null, lo: null };
      } else if (cur) { if (k === "52주최고가") cur.hi = v; else cur.lo = v; }
    }
  }
  if (cur && cur.nm && cur.hi != null && cur.lo != null) out.push(cur);
  return out.length ? out.map((x) => ({ nm: x.nm, v: x.v, hi: x.hi, lo: x.lo })) : null;
}

/* --- 수익률시계열 --- */
function parseBlock(rows, label, keys) {
  const L = nz(label);
  const need = Object.keys(keys);
  let hr = -1, c0 = -1, dateCol = -1;

  /* 1) 라벨이 한 칸에 따로 있는 보통의 경우 */
  for (let r = 0; r < rows.length && hr < 0; r++) {
    for (let c = 0; c < (rows[r] || []).length; c++) {
      if (nz(rows[r][c]) !== L) continue;
      const H = colMap(rows[r + 1], c);
      if (H["날짜"] !== undefined && need.some((k) => H[keys[k]] !== undefined)) {
        hr = r + 1; c0 = c; dateCol = H["날짜"];
      }
      break;
    }
  }
  /* 2) 구글이 라벨과 헤더를 한 줄로 합쳐 보낸 경우 ("종합 날짜") */
  if (hr < 0) {
    for (let r = 0; r < rows.length && hr < 0; r++) {
      for (let c = 0; c < (rows[r] || []).length; c++) {
        const v = nz(rows[r][c]);
        if (v.length <= L.length || v.indexOf(L) !== 0) continue;
        const H = colMap(rows[r], c);
        if (need.some((k) => H[keys[k]] !== undefined)) { hr = r; c0 = c; dateCol = c; break; }
      }
    }
  }
  if (hr < 0) return null;

  const H = colMap(rows[hr], c0);
  H["날짜"] = dateCol;
  const out = [];
  for (let r = hr + 1; r < rows.length; r++) {
    const d = cell(rows, r, H["날짜"]).trim();
    const mm = d.match(/(\d{4})[-.\/\s]+(\d{1,2})/);
    if (!mm) break;
    const rec = { m: parseInt(mm[2], 10) + "월" };
    need.forEach((k) => { const i = H[keys[k]]; rec[k] = i === undefined ? 0 : toNum(cell(rows, r, i)); });
    out.push(rec);
  }
  return out.length ? out : null;
}
function parseSeriesByShape(rows) {
  const isDate = (v) => /^\d{4}[-.\/]\s?\d{1,2}/.test(String(v == null ? "" : v).trim());
  /* 날짜 행을 모으되, 행이 끊기거나 날짜가 뒤로 돌아가면 다른 블록으로 봅니다
     (헤더가 사라지면 블록끼리 딱 붙어버리기 때문) */
  const key = (v) => { const m = String(v).match(/(\d{4})[-.\/]\s?(\d{1,2})/); return m ? +m[1] * 12 + +m[2] : -1; };
  const groups = []; let cur = null, prevRow = -9, prevKey = -1;
  for (let r = 0; r < rows.length; r++) {
    const v = cell(rows, r, 0);
    if (!isDate(v)) { cur = null; prevRow = -9; continue; }
    const k = key(v);
    if (!cur || r !== prevRow + 1 || k <= prevKey) { cur = []; groups.push(cur); }
    cur.push(r); prevRow = r; prevKey = k;
  }
  if (groups.length < 2) return null;
  const rd = (r, b) => {
    const mm = String(cell(rows, r, b)).match(/\d{4}[-.\/]\s?(\d{1,2})/);
    return {
      m: (mm ? parseInt(mm[1], 10) : 0) + "월",
      end: toNum(cell(rows, r, b + 4)), cost: toNum(cell(rows, r, b + 5)),
      pl: toNum(cell(rows, r, b + 6)), r: toNum(cell(rows, r, b + 7)), twr: toNum(cell(rows, r, b + 8)),
    };
  };
  const all = groups[0].map((r) => { const x = rd(r, 0); x.ks = toNum(cell(rows, r, 19)); x.sp = toNum(cell(rows, r, 20)); return x; });
  const t = groups[1].map((r) => rd(r, 0));
  const d = groups[1].map((r) => rd(r, 14));
  /* 종합 = 탱 + 둥 인지 확인해서 블록 배치가 맞는지 검증 */
  const ok = all.length === t.length && all.every((x, i) => x.end > 0 && Math.abs(x.end - (t[i].end + d[i].end)) < 2);
  return ok ? { all, 탱: t, 둥: d } : null;
}

function parseSeries(rows) {
  const all = parseBlock(rows, "종합", { end: "기말평가금액", cost: "투자원금", pl: "투자손익", r: "단순수익률", twr: "시간가중수익률(누적)" });
  const t = parseBlock(rows, "탱투자", { end: "기말평가금액", cost: "투자원금", pl: "투자손익", r: "투자수익률", twr: "투자수익률(누적)" });
  const d = parseBlock(rows, "둥투자", { end: "기말평가금액", cost: "투자원금", pl: "투자손익", r: "투자수익률", twr: "투자수익률(누적)" });
  if (!all || !t || !d) return parseSeriesByShape(rows);
  const bm = parseBlock(rows, "수익률 벤치마크", { ks: "KOSPI수익률(누적)", sp: "S&P500수익률(누적)" });
  if (bm) all.forEach((x, i) => { if (bm[i]) { x.ks = bm[i].ks; x.sp = bm[i].sp; } });
  return { all, 탱: t, 둥: d };
}

/* --- 시트 → 앱 데이터 --- */
function buildRaw(G) {
  const raw = {}, report = [];
  /* 지정한 탭에서 먼저 찾고, 없으면 받아온 다른 탭에서도 같은 표를 찾아봅니다 */
  const find = (fn, primary) => {
    let v = G[primary] && fn(G[primary]);
    if (v) return v;
    for (const k in G) { if (k === primary || !G[k]) continue; v = fn(G[k]); if (v) return v; }
    return null;
  };
  const mark = (k, ok) => { const sp = TAB_SPEC.filter((x) => x.k === k)[0]; report.push({ k, nm: sp.tab, label: sp.label, ok: !!ok }); };

  const inv = find(parseInvest, "invest");
  const prices = find(parsePrices, "price");
  if (inv) {
    const merged = {};
    Object.keys(inv.meta).forEach((tk) => {
      const m = inv.meta[tk], q = (prices && prices[tk]) || {};
      merged[tk] = { n: q.n || m.n, p: m.p || q.p, y: q.y || m.p || q.p, t: m.t, r: m.r };
    });
    raw.prices = merged; raw.accounts = inv.accounts; raw.holdings = inv.holdings;
  }
  mark("invest", inv); mark("price", prices);

  const as = find(parseAssets, "asset");
  if (as) { raw.asset = as.asset; raw.debt = as.debt; }
  mark("asset", as);

  const se = find(parseSeries, "series");
  if (se) raw.series = se;
  mark("series", se);

  const mk = find(parseMarket, "market");
  if (mk) raw.market = mk;
  mark("market", mk);

  return { raw, report };
}


/* ---------- 실행 ---------- */
async function readWorkbook() {
  if (process.env.SOURCE_FILE) {
    console.log("파일에서 읽기:", process.env.SOURCE_FILE);
    return XLSX.read(fs.readFileSync(process.env.SOURCE_FILE), { type: "buffer", raw: false });
  }
  if (!SHEET_ID) throw new Error("config.json 의 sheetId 를 채워 주세요.");
  const url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=xlsx";
  console.log("구글 시트 내려받는 중…");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("시트를 받지 못했습니다 (" + res.status + "). 공유가 '링크가 있는 모든 사용자'인지 확인하세요.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.slice(0, 2).toString() !== "PK") throw new Error("엑셀 파일이 아닙니다. 시트가 비공개일 수 있습니다.");
  return XLSX.read(buf, { type: "buffer", raw: false });
}

const wb = await readWorkbook();
const grids = {};
wb.SheetNames.forEach((n) => {
  grids[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", blankrows: true, raw: false });
});
console.log("시트 탭:", wb.SheetNames.join(", "));

const G = {};
TAB_SPEC.forEach((sp) => { if (grids[sp.tab]) G[sp.k] = grids[sp.tab]; });
TAB_SPEC.forEach((sp) => {
  if (G[sp.k] && PARSER[sp.k](G[sp.k])) return;
  for (const n in grids) { if (PARSER[sp.k](grids[n])) { G[sp.k] = grids[n]; console.log("  " + sp.label + " → '" + n + "' 탭에서 찾음"); break; } }
});

const { raw, report } = buildRaw(G);
report.forEach((r) => console.log("  " + (r.ok ? "✓" : "✗") + " " + r.label));
const missing = report.filter((r) => !r.ok);
if (missing.length) throw new Error("표를 못 찾았습니다: " + missing.map((m) => m.label).join(", "));

/* 검산: 보유 평가액 합계가 계좌 평가액과 맞는지 */
const invTotal = raw.accounts.reduce((s, a) => {
  const h = raw.holdings.filter((x) => x[0] === a.id).reduce((t, x) => t + (raw.prices[x[1]] ? raw.prices[x[1]].p * x[3] : 0), 0);
  return s + h + a.cash;
}, 0);
const cost = raw.accounts.reduce((s, a) => s + a.cost, 0);
if (!invTotal || !cost) throw new Error("금액이 비어 있습니다. 시트 구조가 바뀌었는지 확인하세요.");

raw.at = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(raw));
const won = (n) => "₩" + Math.round(n).toLocaleString("ko-KR");
console.log("\n계좌 " + raw.accounts.length + "개 · 보유 " + raw.holdings.length + "종목");
console.log("투자자산 " + won(invTotal) + " / 원금 " + won(cost));
console.log("data.json 저장 완료 (" + Math.round(fs.statSync(OUT).size / 1024) + " KB)");
