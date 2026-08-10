import React, { useState, useMemo, useEffect, useContext, createContext } from "react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ReferenceLine
} from "recharts";
import {
  Home, Wallet, RefreshCw, TrendingUp, Flag, Eye, EyeOff,
  ChevronDown, Check, AlertTriangle, Settings, X
} from "lucide-react";

/* ============================ 디자인 토큰 ============================ */
const C = {
  ink: "#F2F5FA",     // 페이지 배경
  surf: "#FFFFFF",    // 카드
  surf2: "#F0F4FA",   // 카드 안쪽 영역
  line: "#E1E7F0",
  txt: "#101B2D",
  mute: "#5A6A85",
  dim: "#8E9BB0",
  on: "#FFFFFF",      // 색 채움 위의 글자
  up: "#E04447",      // 한국 관례: 상승 = 빨강
  down: "#1F6FE0",    // 하락 = 파랑
  brass: "#A9761A",   // 금 (글자·강조)
  violet: "#6A55D8",  // 주식
  teal: "#12907A",    // 채권
  steel: "#7C8CA6",   // 현금
  shadow: "0 1px 2px rgba(16,27,45,0.05), 0 10px 28px -16px rgba(16,27,45,0.18)",
};
const TYPE_COLOR = { 주식: "#7B67E8", 금: "#D19A2E", 채권: "#1BA98F", 현금: "#93A2BA", 부동산: "#3A8FCC" };
const FIN_COLOR = { 자본: "#8FA2C0", 투자: "#7B67E8", 부채: "#C6CEDC" };
const FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif';
const NUM = { fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };

/* ============================ 포맷 ============================ */
const nf = (n, d = 0) =>
  Number(n).toLocaleString("ko-KR", { maximumFractionDigits: d, minimumFractionDigits: d });
const won = (n) => (n < 0 ? "-" : "") + "₩" + nf(Math.abs(Math.round(n)));
const kor = (n) => {
  const s = n < 0 ? "-" : "";
  const v = Math.abs(Math.round(n));
  const eok = Math.floor(v / 1e8);
  const man = Math.floor((v % 1e8) / 1e4);
  if (eok) return s + eok + "억" + (man ? " " + nf(man) + "만" : "");
  if (man) return s + nf(man) + "만";
  return s + nf(v);
};
const pct = (n, d = 1) => (n > 0 ? "+" : "") + nf(n, d) + "%";
const sgn = (n) => (n > 0 ? C.up : n < 0 ? C.down : C.mute);

/* ============================ 시세 (한국거래소 시트) ============================ */
const P_0 = {
  "360200": { n: "ACE 미국 S&P500", p: 27565, y: 27365, t: "주식", r: "미국" },
  "379810": { n: "KODEX 미국 나스닥100", p: 27960, y: 27605, t: "주식", r: "미국" },
  "278530": { n: "KODEX 200TR", p: 35560, y: 35525, t: "주식", r: "한국" },
  "283580": { n: "KODEX 차이나 CSI300", p: 15930, y: 15805, t: "주식", r: "중국" },
  "241180": { n: "TIGER 일본 니케이225", p: 36075, y: 35435, t: "주식", r: "일본" },
  "453810": { n: "KODEX 인도 Nifty50", p: 12280, y: 12310, t: "주식", r: "인도" },
  "308620": { n: "KODEX 미국 10년국채선물", p: 11880, y: 11840, t: "채권", r: "미국" },
  "476760": { n: "ACE 미국 30년국채액티브", p: 9200, y: 9170, t: "채권", r: "미국" },
  "468380": { n: "KODEX iShares 미국 하이일드", p: 11245, y: 11240, t: "채권", r: "미국" },
  "385560": { n: "RISE KIS 국고채30년", p: 51650, y: 52420, t: "채권", r: "한국" },
  "411060": { n: "ACE KRX 금현물", p: 27800, y: 27330, t: "금", r: "기타" },
  "456880": { n: "ACE 미국달러 SOFR금리", p: 12425, y: 12420, t: "현금", r: "미국" },
  "357870": { n: "TIGER CD금리 KIS", p: 57880, y: 57875, t: "현금", r: "한국" },
  "005930": { n: "삼성전자", p: 230000, y: 231000, t: "주식", r: "한국" },
  "000660": { n: "SK하이닉스", p: 1420000, y: 1422000, t: "주식", r: "한국" },
  "353200": { n: "대덕전자", p: 107600, y: 103800, t: "주식", r: "한국" },
  "104530": { n: "KIWOOM 코리아 고배당", p: 17890, y: 17830, t: "주식", r: "한국" },
};

/* ============================ 계좌 ============================ */
const ACCT_0 = [
  { id: "t-ps", o: "탱", nm: "연금저축", br: "삼성증권", cash: 8438, cost: 12000000, liq: false },
  { id: "t-pp", o: "탱", nm: "연금저축", br: "프리즘", cash: 5790, cost: 5000000, liq: false },
  { id: "t-isa", o: "탱", nm: "ISA", br: "KB증권", cash: 164879, cost: 31500000, liq: true },
  { id: "d-ps", o: "둥", nm: "연금저축", br: "삼성증권", cash: 6605, cost: 14607784, liq: false },
  { id: "d-isa", o: "둥", nm: "ISA", br: "하나증권", cash: 1900994, cost: 55000000, liq: true },
  { id: "d-tr", o: "둥", nm: "위탁", br: "하나증권", cash: 25060, cost: 1422248, liq: true },
];

/* 보유: [계좌, 티커, 평단가, 수량, 목표비중%] */
const HOLD_0 = [
  ["t-ps", "360200", 19470, 77, 13], ["t-ps", "379810", 21215, 47, 8],
  ["t-ps", "278530", 29340, 23, 5], ["t-ps", "283580", 14299, 41, 4],
  ["t-ps", "241180", 26762, 18, 4], ["t-ps", "453810", 12892, 66, 5],
  ["t-ps", "308620", 11828, 41, 3], ["t-ps", "476760", 9852, 35, 2],
  ["t-ps", "468380", 11524, 29, 2], ["t-ps", "385560", 68299, 46, 15],
  ["t-ps", "411060", 21872, 132, 22], ["t-ps", "456880", 12285, 39, 3],
  ["t-ps", "357870", 56791, 39, 14],

  ["t-pp", "360200", 18614, 37, 13], ["t-pp", "379810", 19621, 21, 8],
  ["t-pp", "278530", 15350, 9, 5], ["t-pp", "283580", 12388, 16, 4],
  ["t-pp", "241180", 21093, 8, 4], ["t-pp", "453810", 13070, 32, 5],
  ["t-pp", "308620", 11608, 22, 3], ["t-pp", "476760", 9491, 15, 2],
  ["t-pp", "468380", 11354, 13, 2], ["t-pp", "385560", 72432, 22, 15],
  ["t-pp", "411060", 20822, 61, 22], ["t-pp", "456880", 11872, 15, 3],
  ["t-pp", "357870", 56030, 19, 14],

  ["t-isa", "360200", 23178, 161, 15], ["t-isa", "379810", 24467, 102, 10],
  ["t-isa", "278530", 28913, 42, 8], ["t-isa", "283580", 0, 0, 8],
  ["t-isa", "453810", 0, 0, 8], ["t-isa", "411060", 26248, 36, 20],
  ["t-isa", "456880", 0, 0, 6], ["t-isa", "000660", 2178111, 9, 15],
  ["t-isa", "005930", 302118, 15, 10], ["t-isa", "353200", 174100, 5, 0],

  ["d-ps", "360200", 19671, 98, 13], ["d-ps", "379810", 21661, 60, 8],
  ["d-ps", "278530", 23634, 28, 5], ["d-ps", "283580", 12870, 48, 4],
  ["d-ps", "241180", 23110, 23, 4], ["d-ps", "453810", 13767, 82, 5],
  ["d-ps", "308620", 11620, 50, 3], ["d-ps", "476760", 9853, 42, 2],
  ["d-ps", "468380", 11411, 35, 2], ["d-ps", "385560", 72680, 60, 15],
  ["d-ps", "411060", 20366, 169, 22], ["d-ps", "456880", 11978, 48, 3],
  ["d-ps", "357870", 56339, 50, 14],

  ["d-isa", "360200", 22943, 289, 15], ["d-isa", "379810", 23435, 153, 10],
  ["d-isa", "278530", 20554, 78, 0], ["d-isa", "283580", 13350, 105, 0],
  ["d-isa", "241180", 24519, 70, 0], ["d-isa", "453810", 13572, 100, 0],
  ["d-isa", "411060", 26120, 489, 10], ["d-isa", "456880", 12266, 50, 5],
  ["d-isa", "357870", 56032, 40, 10], ["d-isa", "005930", 205792, 30, 15],
  ["d-isa", "000660", 2184444, 9, 35], ["d-isa", "353200", 157613, 15, 0],

  ["d-tr", "104530", 7687, 185, 0],
];

/* ============================ 투자 외 자산 (자산 시트) ============================ */
const ASSET_0 = [
  { o: "탱", k: "자본", t: "현금", nm: "주택청약", v: 9730000, liq: false },
  { o: "탱", k: "자본", t: "부동산", nm: "임대보증금", v: 46900000, liq: true },
  { o: "탱", k: "자본", t: "현금", nm: "퇴직급여", v: 40000000, liq: true },
  { o: "둥", k: "자본", t: "현금", nm: "주택청약", v: 250000, liq: false },
  { o: "둥", k: "자본", t: "부동산", nm: "분양계약금", v: 51000000, liq: true },
  { o: "둥", k: "자본", t: "금", nm: "금 현물", v: 4102264, liq: true },
  { o: "둥", k: "자본", t: "현금", nm: "현금", v: -3500000, liq: true },
];
const DEBT_0 = { o: "탱", nm: "임대보증금", v: 187500000 };


/* ============================ 시장 지표 (종합 시트) ============================ */
const MARKET_0 = [
  { nm: "KOSPI", v: 6300, hi: 9386, lo: 3079, d: 0 },
  { nm: "S&P 500", v: 7758, hi: 7794, lo: 6317, d: 0 },
  { nm: "NASDAQ", v: 26691, hi: 27190, lo: 20690, d: 0 },
  { nm: "달러인덱스", v: 100, hi: 102, lo: 96, d: 0 },
  { nm: "원/달러", v: 1418, hi: 1558, lo: 1378, d: 0 },
  { nm: "원/엔(100)", v: 893, hi: 971, lo: 883, d: 0 },
];

/* ============================ 수익률 시계열 ============================ */
const SERIES_0 = {
  all: [
    { m: "1월", end: 147559862, cost: 118030032, pl: 8762373, r: 6.31, twr: 6.31, mwr: 7.38, ks: 23.97, sp: 1.37 },
    { m: "2월", end: 146092603, cost: 114030032, pl: 2532741, r: 1.76, twr: 8.19, mwr: 8.80, ks: 48.17, sp: 0.49 },
    { m: "3월", end: 143221472, cost: 118030032, pl: -6871131, r: -4.58, twr: 3.24, mwr: 3.39, ks: 19.89, sp: -4.63 },
    { m: "4월", end: 149201551, cost: 118030032, pl: 5980079, r: 4.18, twr: 7.55, mwr: 7.85, ks: 56.59, sp: 5.31 },
    { m: "5월", end: 157255340, cost: 118030032, pl: 8053789, r: 5.40, twr: 13.35, mwr: 13.79, ks: 101.13, sp: 10.73 },
    { m: "6월", end: 157646354, cost: 118530032, pl: -108986, r: -0.07, twr: 7.47, mwr: 13.62, ks: 101.14, sp: 9.55 },
    { m: "7월", end: 138194766, cost: 118530032, pl: -19451588, r: -12.34, twr: -0.63, mwr: -0.81, ks: 56.51, sp: 9.41 },
  ],
  탱: [
    { m: "1월", end: 58665556, cost: 47000000, pl: 2987803, r: 5.37, twr: 5.37 },
    { m: "2월", end: 58914252, cost: 47000000, pl: 248696, r: 0.42, twr: 5.81 },
    { m: "3월", end: 56322324, cost: 47000000, pl: -2591928, r: -4.40, twr: 1.16 },
    { m: "4월", end: 58321890, cost: 47000000, pl: 1999566, r: 3.55, twr: 4.75 },
    { m: "5월", end: 60828417, cost: 47000000, pl: 2506527, r: 4.30, twr: 9.25 },
    { m: "6월", end: 60936458, cost: 47500000, pl: -391959, r: -0.64, twr: 4.08 },
    { m: "7월", end: 51894048, cost: 47500000, pl: -9042410, r: -14.84, twr: -6.96 },
  ],
  둥: [
    { m: "1월", end: 88894306, cost: 71030032, pl: 5774570, r: 6.95, twr: 6.95 },
    { m: "2월", end: 87178351, cost: 67030032, pl: 2284045, r: 2.69, twr: 9.82 },
    { m: "3월", end: 86899148, cost: 71030032, pl: -4279203, r: -4.69, twr: 4.67 },
    { m: "4월", end: 90879661, cost: 71030032, pl: 3980513, r: 4.58, twr: 9.46 },
    { m: "5월", end: 96426923, cost: 71030032, pl: 5547262, r: 6.10, twr: 16.15 },
    { m: "6월", end: 96709896, cost: 71030032, pl: 282973, r: 0.29, twr: 9.79 },
    { m: "7월", end: 86300718, cost: 71030032, pl: -10409178, r: -10.76, twr: 3.65 },
  ],
};

/* ============================ 은퇴 시뮬 ============================ */
/* [나이, 자산, 물가반영 목표, 연간 저축(음수=인출)] */
const RET = [
  [37, 60000000, 1000000000, 6000000], [38, 76800000, 1025000000, 12000000],
  [39, 94944000, 1050625000, 12000000], [40, 134539520, 1076890625, 32000000],
  [41, 177302682, 1103812891, 32000000], [42, 223486896, 1131408213, 32000000],
  [43, 273365848, 1159693418, 32000000], [44, 327235116, 1188685754, 32000000],
  [45, 385413925, 1218402898, 32000000], [46, 448247039, 1248862970, 32000000],
  [47, 516106802, 1280084544, 32000000], [48, 589395346, 1312086658, 32000000],
  [49, 668546974, 1344888824, 32000000], [50, 754030732, 1378511045, 32000000],
  [51, 846353190, 1412973821, 32000000], [52, 946061446, 1448298166, 32000000],
  [53, 1053746361, 1484505621, 32000000], [54, 1170046070, 1521618261, 32000000],
  [55, 1295649756, 1559658718, 32000000], [56, 1399301736, 1598650186, 0],
  [57, 1511245875, 1638616440, 0], [58, 1632145545, 1679581851, 0],
  [59, 1762717189, 1721571398, 0], [60, 1903734564, 1764610683, 0],
  [61, 1979883946, 1808725950, -76149383], [62, 2059079304, 1853944098, -79195358],
  [63, 2141442476, 1900292701, -82363172], [64, 2227100175, 1947800018, -85657699],
  [65, 2316184182, 1996495019, -89084007], [66, 2408831550, 2046407394, -92647367],
  [67, 2505184812, 2097567579, -96353262], [68, 2605392204, 2150006769, -100207392],
  [69, 2709607892, 2203756938, -104215688], [70, 2817992208, 2258850861, -108384316],
  [71, 2930711896, 2315322133, -112719688], [72, 3047940372, 2373205186, -117228476],
  [73, 3169857987, 2432535316, -121917615], [74, 3296652306, 2493348699, -126794319],
  [75, 3428518399, 2555682416, -131866092], [76, 3565659135, 2619574476, -137140736],
  [77, 3708285500, 2685063838, -142626365], [78, 3856616920, 2752190434, -148331420],
  [79, 4010881597, 2820995195, -154264677], [80, 4171316861, 2891520075, -160435264],
  [81, 4338169535, 2963808077, -166852674], [82, 4511696317, 3037903279, -173526781],
  [83, 4692164169, 3113850861, -180467853], [84, 4879850736, 3191697132, -187686567],
  [85, 5075044765, 3271489561, -195194029],
];
const RET_ASSUME = { ret: 8, infl: 2.5, save: 1.5, goalToday: 1000000000, stop: 55, draw: 61 };

/* ============================ 부동산 ============================ */
const RE = {
  price: 500000000, seed: 250000000, loan: 250000000, rate: 1.3, pay: 840000,
  altPrice: 650000000, altLoan: 400000000, altRate: 5, altPay: 2150000,
  gapM: 1310000, gapY: 15720000, gap3: 47160000, share: 30,
  target26: 900000000, target32: 992250000, bump: 5, bumpN: 2, saveM: 1400000, saveTot: 100800000,
  loanAmt: 500000000, months: 72,
  unit: {
    name: "구리갈매역세권 A1", addr: "구리시 갈매동",
    supply: 81, area: 55, pyeong: 24, year: 2028, units: 1791,
    rooms: 3, baths: 2, parking: 1.2, station: 12,
    school: "초품아", district: "경기 상위 85%",
  },
  salary2: { after: 92026564, before: 120000000 },
  cases: [
    { k: "보수", v2032: 700000000, gain: 200000000, after: 140000000, withInt: 187160000, net: -12840000, avail: 990000000 },
    { k: "중립", v2032: 730000000, gain: 230000000, after: 161000000, withInt: 208160000, net: -21840000, avail: 1011000000 },
    { k: "낙관", v2032: 790000000, gain: 290000000, after: 203000000, withInt: 250160000, net: -39840000, avail: 1053000000 },
  ],
};
const SEV = { pay: 42764000, avg: 4656667, days: 3352, inDate: "2017.06.07", outDate: "2026.08.10", salary: 53000000 };

/* ============================ 파생 계산 ============================ */
function buildAccounts() {
  return ACCT.map((a) => {
    const rows = HOLD.filter((h) => h[0] === a.id).map(([, tk, avg, q, w]) => {
      const p = P[tk];
      return { tk, avg, q, w, ...p, val: p.p * q };
    });
    const inv = rows.reduce((s, r) => s + r.val, 0);
    const total = inv + a.cash;
    const wsum = rows.reduce((s, r) => s + r.w, 0);
    const managed = wsum > 0;
    const items = rows.map((r) => {
      const tgtVal = managed ? (total * r.w) / 100 : r.val;
      const tgtQ = managed ? Math.floor(tgtVal / r.p) : r.q;
      const wNow = total ? (r.val / total) * 100 : 0;
      const gap = r.val > 0 ? Math.abs(tgtVal - r.val) / r.val : r.w > 0 ? 999 : 0;
      return {
        ...r, tgtVal, tgtQ, wNow, gap: gap * 100,
        diff: tgtQ - r.q,
        pl: r.avg ? (r.p - r.avg) * r.q : 0,
        plPct: r.avg ? (r.p / r.avg - 1) * 100 : 0,
        chg: r.y ? (r.p / r.y - 1) * 100 : 0,
      };
    });
    const maxGap = managed ? Math.max(...items.map((i) => i.gap)) : 0;
    return {
      ...a, label: a.o + " · " + a.nm, sub: a.br, items, inv, total, managed, maxGap,
      pl: total - a.cost, plPct: a.cost ? ((total - a.cost) / a.cost) * 100 : 0,
    };
  });
}
/* 시트에서 새 데이터가 들어오면 아래 값들이 통째로 다시 계산됩니다 */
let P, ACCT, HOLD, ASSET, DEBT, MARKET, SERIES, SUMMARY;
let ACCOUNTS, INV_TOTAL, INV_COST, TYPE_MIX, REGION_MIX, BY_TICKER;
let CAP_TOTAL, FIN, AVAIL, NET_TOTAL;

const capEntries = (o) =>
  ASSET.filter((a) => (!o || a.o === o))
    .map((a) => ({ o: a.o, t: a.t, v: a.v, nm: a.nm, liq: a.liq }));
const invEntries = (o) => {
  const out = [];
  ACCOUNTS.filter((a) => (!o || a.o === o)).forEach((a) => {
    a.items.forEach((i) => { if (i.val) out.push({ o: a.o, t: i.t, v: i.val, nm: a.label, liq: a.liq }); });
    if (a.cash) out.push({ o: a.o, t: "현금", v: a.cash, nm: a.label + " 예수금", liq: a.liq });
  });
  return out;
};
const aggType = (rows) => {
  const m = {};
  rows.forEach((e) => { m[e.t] = (m[e.t] || 0) + e.v; });
  const tot = Object.values(m).reduce((s, v) => s + v, 0);
  return Object.entries(m)
    .map(([name, value]) => ({ name, value, pctv: tot ? (value / tot) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
};
const ownerInv = (o) => ACCOUNTS.filter((a) => a.o === o).reduce((s, a) => s + a.total, 0);
const ownerCost = (o) => ACCOUNTS.filter((a) => a.o === o).reduce((s, a) => s + a.cost, 0);

function rebuild(raw) {
  P = raw.prices; ACCT = raw.accounts; HOLD = raw.holdings;
  ASSET = raw.asset; DEBT = raw.debt; MARKET = raw.market; SERIES = raw.series;

  ACCOUNTS = buildAccounts();
  INV_TOTAL = ACCOUNTS.reduce((s, a) => s + a.total, 0);
  INV_COST = ACCOUNTS.reduce((s, a) => s + a.cost, 0);

  const tm = { 주식: 0, 금: 0, 채권: 0, 현금: 0 };
  ACCOUNTS.forEach((a) => {
    a.items.forEach((i) => { tm[i.t] = (tm[i.t] || 0) + i.val; });
    tm["현금"] += a.cash;
  });
  TYPE_MIX = Object.entries(tm).map(([k, v]) => ({ name: k, value: v, pctv: INV_TOTAL ? (v / INV_TOTAL) * 100 : 0 }));

  const rm = {};
  ACCOUNTS.forEach((a) => a.items.forEach((i) => { if (i.t === "주식" && i.val) rm[i.r] = (rm[i.r] || 0) + i.val; }));
  const rtot = Object.values(rm).reduce((s, v) => s + v, 0);
  REGION_MIX = Object.entries(rm).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: k, value: v, pctv: rtot ? (v / rtot) * 100 : 0 }));

  const bt = {};
  ACCOUNTS.forEach((a) => a.items.forEach((i) => {
    if (i.q === 0) return;
    if (!bt[i.tk]) bt[i.tk] = { tk: i.tk, n: i.n, t: i.t, r: i.r, p: i.p, chg: i.chg, q: 0, val: 0, cost: 0, accts: [] };
    bt[i.tk].q += i.q; bt[i.tk].val += i.val; bt[i.tk].cost += i.avg * i.q;
    bt[i.tk].accts.push(a.label);
  }));
  BY_TICKER = Object.values(bt)
    .map((x) => ({ ...x, plPct: x.cost ? (x.val / x.cost - 1) * 100 : 0, pl: x.val - x.cost, wgt: INV_TOTAL ? (x.val / INV_TOTAL) * 100 : 0 }))
    .sort((a, b) => b.val - a.val);

  CAP_TOTAL = ASSET.reduce((s, a) => s + a.v, 0);
  FIN = { cap: CAP_TOTAL, inv: INV_TOTAL, debt: DEBT.v, net: CAP_TOTAL + INV_TOTAL, gross: CAP_TOTAL + INV_TOTAL + DEBT.v };

  const all = [...capEntries(), ...invEntries()];
  const liq = all.filter((e) => e.liq), locked = all.filter((e) => !e.liq);
  const byOwner = (o) => liq.filter((e) => e.o === o).reduce((s, e) => s + e.v, 0);
  AVAIL = {
    total: liq.reduce((s, e) => s + e.v, 0), mix: aggType(liq),
    탱: byOwner("탱"), 둥: byOwner("둥"),
    pension: locked.filter((e) => e.nm.indexOf("연금저축") >= 0).reduce((s, e) => s + e.v, 0),
    housing: locked.filter((e) => e.nm.indexOf("주택청약") >= 0).reduce((s, e) => s + e.v, 0),
  };

  SUMMARY = {};
  ["탱", "둥"].forEach((o) => {
    const net = capEntries(o).reduce((s, e) => s + e.v, 0) + ownerInv(o);
    const debt = DEBT.o === o ? DEBT.v : 0;
    SUMMARY[o] = { net, debt, tot: net + debt, re: AVAIL[o] };
  });
  NET_TOTAL = SUMMARY.탱.net + SUMMARY.둥.net;
}

const DEFAULT_RAW = {
  prices: P_0, accounts: ACCT_0, holdings: HOLD_0,
  asset: ASSET_0, debt: DEBT_0, market: MARKET_0, series: SERIES_0,
};
rebuild(DEFAULT_RAW);

/* ============================ 데이터 불러오기 ============================ */
/* 앱 옆에 있는 data.json 을 그대로 읽습니다. 파일은 GitHub Actions 가 만들어 둡니다. */
let SYNC = { at: null, src: "내장", err: "" };

async function loadData() {
  const res = await fetch("./data.json?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("data.json 을 찾지 못했습니다 (" + res.status + ")");
  const j = await res.json();
  if (!j || !j.holdings || !j.accounts) throw new Error("data.json 형식이 올바르지 않습니다.");
  rebuild(j);
  SYNC = { at: j.at ? new Date(j.at) : new Date(), src: "data.json", err: "" };
  return SYNC;
}

/* ============================ UI 프리미티브 ============================ */
const HideCtx = createContext(false);
function Amt({ v, k = false, size, weight = 700, color }) {
  const hide = useContext(HideCtx);
  return (
    <span style={{ ...NUM, fontSize: size, fontWeight: weight, color }}>
      {hide ? "•••••" : k ? kor(v) : won(v)}
    </span>
  );
}
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: C.surf, border: "1px solid " + C.line, borderRadius: 16, padding: 16, boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}
function Eyebrow({ children, right }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: "0.08em" }}>{children}</span>
      {right}
    </div>
  );
}
function Pill({ children, color = C.mute, bg }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: bg || "rgba(16,27,45,0.06)",
      padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
function Delta({ v, d = 2, size = 12 }) {
  return <span style={{ ...NUM, fontSize: size, fontWeight: 700, color: sgn(v) }}>{pct(v, d)}</span>;
}
/* 목표 대비 현재 비중 트랙 — 채움은 현재, 눈금은 목표 */
function WeightTrack({ now, tgt, color }) {
  const max = Math.max(now, tgt, 1) * 1.15;
  return (
    <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(16,27,45,0.08)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (now / max) * 100 + "%", background: color, borderRadius: 3, opacity: 0.85 }} />
      <div style={{ position: "absolute", left: (tgt / max) * 100 + "%", top: -3, bottom: -3, width: 2, background: C.txt, borderRadius: 1 }} />
    </div>
  );
}
/* 이격 게이지 — 가운데가 0, 좌우 밴드가 기준 이격률 */
function GapGauge({ gap, thr }) {
  const capped = Math.min(gap, thr * 2.5);
  const w = (capped / (thr * 2.5)) * 100;
  const over = gap >= thr;
  return (
    <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(16,27,45,0.05)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40 + "%", background: "rgba(18,144,122,0.18)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w + "%", background: over ? C.brass : C.dim, borderRadius: 2 }} />
    </div>
  );
}
function Tip({ active, payload, label, unit, lsuf }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.surf2, border: "1px solid " + C.line, borderRadius: 10, padding: "8px 10px", fontSize: 11, boxShadow: C.shadow }}>
      <div style={{ color: C.mute, marginBottom: 4 }}>{label}{lsuf || ""}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, ...NUM, fontWeight: 600 }}>
          {p.name} {unit === "won" ? kor(p.value) : nf(p.value, 1) + "%"}
        </div>
      ))}
    </div>
  );
}
function Seg({ opts, value, onChange }) {
  return (
    <div className="flex" style={{ background: C.surf2, borderRadius: 12, padding: 3, gap: 3 }}>
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          style={{
            flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: FONT,
            background: value === o.v ? C.txt : "transparent",
            color: value === o.v ? C.on : C.mute,
          }}>{o.l}</button>
      ))}
    </div>
  );
}

/* ============================ 홈 ============================ */
function StackBar({ segs, h = 12 }) {
  const tot = segs.reduce((s, x) => s + Math.abs(x.v), 0);
  return (
    <div className="flex" style={{ height: h, borderRadius: h / 2, overflow: "hidden", gap: 2 }}>
      {segs.map((x) => (
        <div key={x.nm} style={{ width: (Math.abs(x.v) / tot) * 100 + "%", background: x.c }} />
      ))}
    </div>
  );
}
function Row({ c, nm, v, p, strong }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "7px 0" }}>
      <span className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
        {c && <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />}
        <span style={{ fontSize: 12.5, color: strong ? C.txt : C.mute, fontWeight: strong ? 700 : 400 }}>{nm}</span>
      </span>
      <span className="flex items-center" style={{ gap: 10 }}>
        <Amt v={v} k size={12.5} weight={strong ? 800 : 700} color={C.txt} />
        {p !== undefined && (
          <span style={{ ...NUM, fontSize: 11, color: C.dim, width: 42, textAlign: "right" }}>{nf(p, 1)}%</span>
        )}
      </span>
    </div>
  );
}

function Home_({ go }) {
  const [scope, setScope] = useState("net");
  const invPL = INV_TOTAL - INV_COST;
  const last = SERIES.all[SERIES.all.length - 1];

  const finSegs = [
    { nm: "자본", v: FIN.cap, c: FIN_COLOR.자본 },
    { nm: "투자", v: FIN.inv, c: FIN_COLOR.투자 },
    { nm: "부채", v: FIN.debt, c: FIN_COLOR.부채 },
  ];
  const scopeData = {
    net: { label: "순자산", total: FIN.net, mix: aggType([...capEntries(), ...invEntries()]) },
    cap: { label: "자본", total: FIN.cap, mix: aggType(capEntries()) },
    inv: { label: "투자자산", total: FIN.inv, mix: aggType(invEntries()) },
  }[scope];

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {/* 1. 총자산 재무 구조 */}
      <Card style={{ background: "linear-gradient(160deg,#E8EFFB 0%,#FFFFFF 62%)" }}>
        <Eyebrow right={<Pill color={C.mute}>자본 · 투자 · 부채</Pill>}>총자산</Eyebrow>
        <Amt v={FIN.gross} size={30} weight={800} color={C.txt} />
        <div style={{ marginTop: 14 }}>
          <StackBar segs={finSegs} />
        </div>
        <div style={{ marginTop: 6 }}>
          {finSegs.map((x) => (
            <Row key={x.nm} c={x.c} nm={x.nm === "자본" ? "자본 (투자 외)" : x.nm} v={x.v} p={(x.v / FIN.gross) * 100} />
          ))}
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 10, paddingTop: 12, borderTop: "1px solid " + C.line }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>투자 비중 (총자산)</div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 800, color: C.violet, marginTop: 3 }}>
              {nf((FIN.inv / FIN.gross) * 100, 1)}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>투자 비중 (순자산)</div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 800, color: C.violet, marginTop: 3 }}>
              {nf((FIN.inv / FIN.net) * 100, 1)}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>부채 비율</div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 800, color: C.mute, marginTop: 3 }}>
              {nf((FIN.debt / FIN.gross) * 100, 1)}%
            </div>
          </div>
        </div>
      </Card>

      {/* 2. 유형 분포 */}
      <Card>
        <Eyebrow right={<span style={{ fontSize: 10, color: C.dim }}>부채 제외</span>}>유형 분포</Eyebrow>
        <Seg
          opts={[{ v: "net", l: "순자산" }, { v: "cap", l: "자본" }, { v: "inv", l: "투자자산" }]}
          value={scope} onChange={setScope} />

        <div className="flex items-center" style={{ marginTop: 14 }}>
          <div style={{ width: 128, height: 128, position: "relative", flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scopeData.mix.filter((m) => m.value > 0)} dataKey="value"
                  innerRadius={42} outerRadius={60} paddingAngle={2} stroke={C.surf} strokeWidth={1.5}>
                  {scopeData.mix.filter((m) => m.value > 0).map((e) => (
                    <Cell key={e.name} fill={TYPE_COLOR[e.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: C.dim }}>{scopeData.label}</span>
              <Amt v={scopeData.total} k size={13} weight={800} color={C.txt} />
            </div>
          </div>
          <div className="flex-1" style={{ marginLeft: 4 }}>
            {scopeData.mix.map((e) => (
              <div key={e.name} style={{ marginBottom: 9 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span className="flex items-center" style={{ gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[e.name] }} />
                    <span style={{ fontSize: 12, color: C.mute }}>{e.name}</span>
                  </span>
                  <span style={{ ...NUM, fontSize: 12, fontWeight: 700, color: e.value < 0 ? C.down : C.txt }}>
                    {nf(e.pctv, 1)}%
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(16,27,45,0.08)" }}>
                    <div style={{ height: 4, borderRadius: 2, width: Math.max(0, e.pctv) + "%", background: TYPE_COLOR[e.name], opacity: 0.75 }} />
                  </div>
                  <Amt v={e.value} k size={10} weight={600} color={C.dim} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {scope === "inv" && (
          <div className="flex" style={{ gap: 10, marginTop: 6, paddingTop: 12, borderTop: "1px solid " + C.line }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim }}>원금</div>
              <Amt v={INV_COST} k size={13} color={C.mute} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim }}>평가손익</div>
              <Amt v={invPL} k size={13} color={sgn(invPL)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim }}>수익률</div>
              <div style={{ marginTop: 2 }}><Delta v={(invPL / INV_COST) * 100} size={13} /></div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. 부동산 가용자산 */}
      <Card>
        <Eyebrow right={<Pill color={C.brass} bg="rgba(209,154,46,0.16)">
          순자산의 {nf((AVAIL.total / FIN.net) * 100, 0)}%
        </Pill>}>부동산 가용자산</Eyebrow>
        <Amt v={AVAIL.total} size={26} weight={800} color={C.txt} />
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
          순자산에서 묶여 있는 연금저축과 주택청약을 뺀 금액입니다.
        </div>

        <div style={{ marginTop: 14 }}>
          <StackBar segs={AVAIL.mix.map((m) => ({ nm: m.name, v: m.value, c: TYPE_COLOR[m.name] }))} h={10} />
        </div>
        <div style={{ marginTop: 6 }}>
          {AVAIL.mix.map((m) => (
            <Row key={m.name} c={TYPE_COLOR[m.name]} nm={m.name} v={m.value} p={m.pctv} />
          ))}
        </div>

        <div style={{ background: C.surf2, borderRadius: 12, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 8, fontWeight: 700, letterSpacing: "0.06em" }}>제외된 자금</div>
          <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: C.mute }}>연금저축 3계좌</span>
            <Amt v={AVAIL.pension} k size={12} color={C.mute} />
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: C.mute }}>주택청약</span>
            <Amt v={AVAIL.housing} k size={12} color={C.mute} />
          </div>
        </div>

        <div className="flex" style={{ gap: 10, marginTop: 12 }}>
          {["탱", "둥"].map((o) => (
            <div key={o} style={{ flex: 1, background: C.surf2, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: C.dim }}>{o}</div>
              <Amt v={AVAIL[o]} k size={14} color={C.txt} />
            </div>
          ))}
        </div>
      </Card>

      {/* 4. 사람별 */}
      <div className="flex" style={{ gap: 12 }}>
        {["탱", "둥"].map((o) => {
          const inv = ownerInv(o), cost = ownerCost(o);
          return (
            <Card key={o} style={{ flex: 1, padding: 14 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.txt }}>{o}</span>
                <Delta v={((inv - cost) / cost) * 100} size={11} />
              </div>
              <div style={{ fontSize: 10, color: C.dim }}>순자산</div>
              <Amt v={SUMMARY[o].net} k size={16} color={C.txt} />
              <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>투자자산</div>
              <Amt v={inv} k size={13} weight={600} color={C.mute} />
              {SUMMARY[o].debt > 0 && (
                <>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>부채</div>
                  <Amt v={SUMMARY[o].debt} k size={13} weight={600} color={C.mute} />
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* 5. 시장 */}
      <Card>
        <Eyebrow>시장 · 52주 위치</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {MARKET.map((m) => {
            const pos = ((m.v - m.lo) / (m.hi - m.lo)) * 100;
            return (
              <div key={m.nm}>
                <div className="flex items-baseline justify-between">
                  <span style={{ fontSize: 11, color: C.mute }}>{m.nm}</span>
                  <span style={{ ...NUM, fontSize: 13, fontWeight: 700, color: C.txt }}>{nf(m.v)}</span>
                </div>
                <div style={{ position: "relative", height: 3, background: "rgba(16,27,45,0.09)", borderRadius: 2, marginTop: 6 }}>
                  <div style={{ position: "absolute", left: pos + "%", top: -3, width: 3, height: 9, background: C.brass, borderRadius: 2 }} />
                </div>
                <div className="flex justify-between" style={{ ...NUM, fontSize: 9, color: C.dim, marginTop: 3 }}>
                  <span>{nf(m.lo)}</span><span>{nf(m.hi)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 6. 누적 수익률 */}
      <Card onClick={() => go("perf")} style={{ cursor: "pointer" }}>
        <Eyebrow right={<Delta v={last.twr} />}>누적 수익률 · 시간가중</Eyebrow>
        <div style={{ height: 96 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SERIES.all} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gTwr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TYPE_COLOR.주식} stopOpacity={0.30} />
                  <stop offset="100%" stopColor={TYPE_COLOR.주식} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin-3", "dataMax+3"]} />
              <ReferenceLine y={0} stroke={C.line} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="twr" name="누적" stroke={C.violet} strokeWidth={2} fill="url(#gTwr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
          7월 월간 {pct(last.r)} · 손익 {kor(last.pl)}
        </div>
      </Card>
    </div>
  );
}

/* ============================ 자산 ============================ */
function Assets() {
  const [who, setWho] = useState("전체");
  const [view, setView] = useState("계좌");
  const [open, setOpen] = useState(null);

  const owners = who === "전체" ? ["탱", "둥"] : [who];
  const accts = ACCOUNTS.filter((a) => owners.includes(a.o));
  const net = owners.reduce((s, o) => s + SUMMARY[o].net, 0);
  const inv = accts.reduce((s, a) => s + a.total, 0);
  const cost = accts.reduce((s, a) => s + a.cost, 0);
  const others = ASSET.filter((a) => owners.includes(a.o));
  const stack = [
    { nm: "투자자산", v: inv, c: C.violet },
    ...others.filter((o) => o.v > 0).map((o) => ({ nm: o.nm, v: o.v, c: o.t === "부동산" ? TYPE_COLOR.부동산 : o.t === "금" ? TYPE_COLOR.금 : C.steel })),
  ];
  const stackTot = stack.reduce((s, x) => s + x.v, 0);

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Seg opts={[{ v: "전체", l: "전체" }, { v: "탱", l: "탱" }, { v: "둥", l: "둥" }]} value={who} onChange={setWho} />

      <Card>
        <Eyebrow>순자산 구성</Eyebrow>
        <Amt v={net} size={26} weight={800} color={C.txt} />
        <div className="flex" style={{ height: 10, borderRadius: 5, overflow: "hidden", marginTop: 14, gap: 2 }}>
          {stack.map((s) => (
            <div key={s.nm} style={{ width: (s.v / stackTot) * 100 + "%", background: s.c }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {stack.map((s) => (
            <div key={s.nm} className="flex items-center justify-between">
              <span className="flex items-center" style={{ gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
                <span style={{ fontSize: 12, color: C.mute }}>{s.nm}</span>
              </span>
              <span className="flex items-center" style={{ gap: 8 }}>
                <Amt v={s.v} k size={12} color={C.txt} />
                <span style={{ ...NUM, fontSize: 11, color: C.dim, width: 38, textAlign: "right" }}>{nf((s.v / stackTot) * 100, 1)}%</span>
              </span>
            </div>
          ))}
          {others.filter((o) => o.v < 0).map((o) => (
            <div key={o.nm} className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: C.mute, paddingLeft: 16 }}>{o.nm}</span>
              <Amt v={o.v} k size={12} color={C.down} />
            </div>
          ))}
          {owners.includes("탱") && (
            <div className="flex items-center justify-between" style={{ borderTop: "1px dashed " + C.line, paddingTop: 8, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: C.mute }}>부채 · {DEBT.nm}</span>
              <Amt v={-DEBT.v} k size={12} color={C.down} />
            </div>
          )}
        </div>
      </Card>

      <Seg opts={[{ v: "계좌", l: "계좌별" }, { v: "종목", l: "종목별" }]} value={view} onChange={setView} />

      {view === "계좌" && accts.map((a) => (
        <Card key={a.id} style={{ padding: 0 }}>
          <div onClick={() => setOpen(open === a.id ? null : a.id)} style={{ padding: 16, cursor: "pointer" }}>
            <div className="flex items-start justify-between">
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{a.label}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{a.sub} · 원금 {kor(a.cost)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Amt v={a.total} k size={15} color={C.txt} />
                <div><Delta v={a.plPct} size={11} /></div>
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
              <div className="flex" style={{ gap: 4, flex: 1, marginRight: 12 }}>
                {["주식", "금", "채권", "현금"].map((t) => {
                  const v = a.items.filter((i) => i.t === t).reduce((s, i) => s + i.val, 0) + (t === "현금" ? a.cash : 0);
                  if (!v) return null;
                  return <div key={t} style={{ height: 6, borderRadius: 3, background: TYPE_COLOR[t], width: (v / a.total) * 100 + "%" }} />;
                })}
              </div>
              <ChevronDown size={16} color={C.dim} style={{ transform: open === a.id ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </div>
          </div>
          {open === a.id && (
            <div style={{ borderTop: "1px solid " + C.line, padding: "6px 16px 14px" }}>
              {a.items.filter((i) => i.q > 0).sort((x, y) => y.val - x.val).map((i) => (
                <div key={i.tk} className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid rgba(16,27,45,0.06)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.txt, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.n}</div>
                    <div style={{ ...NUM, fontSize: 10, color: C.dim, marginTop: 2 }}>{i.q}주 · 평단 {nf(i.avg)}</div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 10 }}>
                    <Amt v={i.val} k size={12} color={C.txt} />
                    <div><Delta v={i.plPct} size={10} /></div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between" style={{ padding: "9px 0" }}>
                <span style={{ fontSize: 12, color: C.mute }}>예수금</span>
                <Amt v={a.cash} size={12} color={C.mute} />
              </div>
            </div>
          )}
        </Card>
      ))}

      {view === "종목" && (
        <Card>
          <Eyebrow right={<span style={{ fontSize: 10, color: C.dim }}>전 계좌 합산</span>}>보유 종목 {BY_TICKER.length}개</Eyebrow>
          {BY_TICKER.map((b, idx) => (
            <div key={b.tk} style={{ padding: "10px 0", borderTop: idx ? "1px solid rgba(16,27,45,0.06)" : "none" }}>
              <div className="flex items-center justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: TYPE_COLOR[b.t] }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.n}</span>
                  </div>
                  <div style={{ ...NUM, fontSize: 10, color: C.dim, marginTop: 3 }}>
                    {b.q}주 · {b.accts.length}개 계좌 · 전일 {pct(b.chg)}
                  </div>
                </div>
                <div style={{ textAlign: "right", marginLeft: 10 }}>
                  <Amt v={b.val} k size={12.5} color={C.txt} />
                  <div><Delta v={b.plPct} size={10} /></div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(16,27,45,0.08)" }}>
                  <div style={{ height: 4, borderRadius: 2, width: (b.wgt / BY_TICKER[0].wgt) * 100 + "%", background: TYPE_COLOR[b.t], opacity: 0.7 }} />
                </div>
                <span style={{ ...NUM, fontSize: 10, color: C.dim, width: 34, textAlign: "right" }}>{nf(b.wgt, 1)}%</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <Eyebrow>주식 지역 배분</Eyebrow>
        {REGION_MIX.map((r) => (
          <div key={r.name} className="flex items-center" style={{ gap: 10, marginBottom: 9 }}>
            <span style={{ fontSize: 12, color: C.mute, width: 34 }}>{r.name}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(16,27,45,0.08)" }}>
              <div style={{ height: 6, borderRadius: 3, width: r.pctv + "%", background: C.violet, opacity: 0.8 }} />
            </div>
            <span style={{ ...NUM, fontSize: 11, color: C.txt, width: 40, textAlign: "right" }}>{nf(r.pctv, 1)}%</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ============================ 리밸런싱 ============================ */
function Rebal({ thr, setThr }) {
  const [open, setOpen] = useState(ACCOUNTS.find((a) => a.managed && a.maxGap >= thr)?.id || null);
  const [done, setDone] = useState({});
  const [showW, setShowW] = useState({});

  const plans = ACCOUNTS.map((a) => {
    const orders = a.items
      .filter((i) => i.diff !== 0 && a.managed)
      .map((i) => ({ ...i, amt: Math.abs(i.diff) * i.p }))
      .sort((x, y) => x.diff - y.diff);
    const sell = orders.filter((o) => o.diff < 0).reduce((s, o) => s + o.amt, 0);
    const buy = orders.filter((o) => o.diff > 0).reduce((s, o) => s + o.amt, 0);
    return { ...a, orders, sell, buy, after: a.cash + sell - buy, need: a.managed && a.maxGap >= thr };
  });
  const needList = plans.filter((p) => p.need);
  const totBuy = needList.reduce((s, p) => s + p.buy, 0);
  const totSell = needList.reduce((s, p) => s + p.sell, 0);
  const totOrders = needList.reduce((s, p) => s + p.orders.length, 0);
  const doneCnt = Object.values(done).filter(Boolean).length;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Card>
        <Eyebrow right={<span style={{ ...NUM, fontSize: 13, fontWeight: 800, color: C.brass }}>{thr}%</span>}>
          기준 이격률
        </Eyebrow>
        <input type="range" min={3} max={20} step={1} value={thr}
          onChange={(e) => setThr(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.brass, height: 24 }} />
        <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
          종목의 목표금액이 현재 평가액에서 {thr}% 넘게 벌어지면 해당 계좌를 매매 대상으로 표시합니다.
        </div>
      </Card>

      <Card style={{ background: needList.length ? "linear-gradient(160deg,#FBF1DC 0%,#FFFFFF 70%)" : C.surf }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
          {needList.length ? <AlertTriangle size={16} color={C.brass} /> : <Check size={16} color={C.teal} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>
            {needList.length ? `${needList.length}개 계좌 · 주문 ${totOrders}건` : "매매할 계좌가 없습니다"}
          </span>
        </div>
        {needList.length > 0 && (
          <>
            <div className="flex" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.dim }}>매도</div>
                <Amt v={totSell} k size={15} color={C.down} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.dim }}>매수</div>
                <Amt v={totBuy} k size={15} color={C.up} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.dim }}>체결 표시</div>
                <span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: C.txt }}>{doneCnt}/{totOrders}</span>
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(16,27,45,0.09)", marginTop: 12 }}>
              <div style={{ height: 4, borderRadius: 2, width: totOrders ? (doneCnt / totOrders) * 100 + "%" : 0, background: C.brass, transition: "width .2s" }} />
            </div>
          </>
        )}
      </Card>

      {plans.map((p) => {
        const isOpen = open === p.id;
        return (
          <Card key={p.id} style={{ padding: 0, borderColor: p.need ? "rgba(169,118,26,0.40)" : C.line }}>
            <div onClick={() => setOpen(isOpen ? null : p.id)} style={{ padding: 16, cursor: "pointer" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center" style={{ gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{p.label}</span>
                    {!p.managed ? <Pill color={C.dim}>목표 미설정</Pill>
                      : p.need ? <Pill color={C.on} bg={C.brass}>매매</Pill>
                        : <Pill color={C.teal}>유지</Pill>}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
                    {p.sub} · 평가 {kor(p.total)} · 예수금 {kor(p.cash)}
                  </div>
                </div>
                <ChevronDown size={16} color={C.dim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", marginTop: 4 }} />
              </div>
              {p.managed && (
                <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: C.dim, width: 44 }}>최대이격</span>
                  <div style={{ flex: 1 }}><GapGauge gap={p.maxGap} thr={thr} /></div>
                  <span style={{ ...NUM, fontSize: 11, fontWeight: 700, color: p.need ? C.brass : C.mute, width: 52, textAlign: "right" }}>
                    {p.maxGap > 900 ? "신규편입" : nf(p.maxGap, 1) + "%"}
                  </span>
                </div>
              )}
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid " + C.line, padding: "12px 16px 16px" }}>
                {!p.managed && <div style={{ fontSize: 12, color: C.mute }}>목표 비중이 지정되지 않은 계좌입니다. 시트에서 제안 비중을 넣으면 주문이 계산됩니다.</div>}

                {p.managed && p.orders.length === 0 && (
                  <div style={{ fontSize: 12, color: C.mute }}>목표 수량과 보유 수량이 같습니다. 주문할 것이 없습니다.</div>
                )}

                {p.managed && p.orders.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: p.need ? C.dim : C.brass, marginBottom: 8, lineHeight: 1.5 }}>
                      {p.need
                        ? "매도 먼저, 매수 나중 · 탭하면 체결 표시"
                        : `최대 이격 ${nf(p.maxGap, 1)}%로 기준 ${thr}% 아래입니다. 아래는 참고용 미세 조정이라 지금 실행하지 않아도 됩니다.`}
                    </div>
                    {p.orders.map((o) => {
                      const key = p.id + "-" + o.tk;
                      const ok = !!done[key];
                      const isBuy = o.diff > 0;
                      return (
                        <div key={key} onClick={() => setDone({ ...done, [key]: !ok })}
                          className="flex items-center"
                          style={{ gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(16,27,45,0.06)", cursor: "pointer", opacity: ok ? 0.45 : 1 }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: "1.5px solid " + (ok ? C.teal : C.line),
                            background: ok ? C.teal : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{ok && <Check size={13} color={C.on} strokeWidth={3} />}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.txt, textDecoration: ok ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.n}</div>
                            <div style={{ ...NUM, fontSize: 10, color: C.dim, marginTop: 2 }}>
                              {o.tk} · {nf(o.p)}원 · 보유 {o.q} → {o.tgtQ}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ ...NUM, fontSize: 13, fontWeight: 800, color: isBuy ? C.up : C.down }}>
                              {isBuy ? "매수 " : "매도 "}{Math.abs(o.diff)}주
                            </div>
                            <Amt v={o.amt} k size={10} weight={600} color={C.dim} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between" style={{ marginTop: 12, gap: 8 }}>
                      <Pill color={C.down}>매도 {kor(p.sell)}</Pill>
                      <Pill color={C.up}>매수 {kor(p.buy)}</Pill>
                      <Pill color={p.after < 0 ? C.up : C.mute}>주문 후 예수금 {kor(p.after)}</Pill>
                    </div>
                  </>
                )}

                {p.managed && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setShowW({ ...showW, [p.id]: !showW[p.id] }); }}
                      style={{ marginTop: 14, background: "transparent", border: "1px solid " + C.line, color: C.mute, borderRadius: 10, padding: "8px 12px", fontSize: 11, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: FONT }}>
                      {showW[p.id] ? "비중 비교 접기" : "목표 대비 비중 보기"}
                    </button>
                    {showW[p.id] && (
                      <div style={{ marginTop: 12 }}>
                        {p.items.filter((i) => i.q > 0 || i.w > 0).sort((a, b) => b.w - a.w).map((i) => (
                          <div key={i.tk} style={{ marginBottom: 11 }}>
                            <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: C.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{i.n}</span>
                              <span style={{ ...NUM, fontSize: 11, color: C.txt, fontWeight: 700 }}>{nf(i.wNow, 1)}%</span>
                              <span style={{ ...NUM, fontSize: 10, color: C.dim, width: 44, textAlign: "right" }}>목표 {nf(i.w, 0)}%</span>
                            </div>
                            <WeightTrack now={i.wNow} tgt={i.w} color={TYPE_COLOR[i.t]} />
                          </div>
                        ))}
                        <div className="flex items-center" style={{ gap: 12, marginTop: 10 }}>
                          <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: C.dim }}>
                            <span style={{ width: 12, height: 5, borderRadius: 2, background: C.violet }} /> 현재
                          </span>
                          <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: C.dim }}>
                            <span style={{ width: 2, height: 10, background: C.txt }} /> 목표
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, padding: "0 4px 4px" }}>
        목표 수량 = 계좌 평가액(예수금 포함) × 목표 비중 ÷ 현재가, 소수점 버림. 시트의 제안 수량과 같은 방식입니다.
      </div>
    </div>
  );
}

/* ============================ 수익률 ============================ */
function Perf() {
  const [who, setWho] = useState("all");
  const [bm, setBm] = useState(true);
  const d = SERIES[who];
  const last = d[d.length - 1];
  const best = d.reduce((a, b) => (b.r > a.r ? b : a));
  const worst = d.reduce((a, b) => (b.r < a.r ? b : a));
  const cur = who === "all" ? INV_TOTAL : ownerInv(who);
  const curCost = who === "all" ? INV_COST : ownerCost(who);

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Seg opts={[{ v: "all", l: "종합" }, { v: "탱", l: "탱" }, { v: "둥", l: "둥" }]} value={who} onChange={setWho} />

      <Card>
        <Eyebrow>현재 평가 · 8월 10일</Eyebrow>
        <div className="flex items-end justify-between">
          <Amt v={cur} size={26} weight={800} color={C.txt} />
          <Delta v={((cur - curCost) / curCost) * 100} size={16} />
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 14 }}>
          {[
            { l: "원금", v: kor(curCost), c: C.mute },
            { l: "평가손익", v: kor(cur - curCost), c: sgn(cur - curCost) },
            { l: "누적(TWR)", v: pct(last.twr), c: sgn(last.twr) },
          ].map((x) => (
            <div key={x.l} style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim }}>{x.l}</div>
              <div style={{ ...NUM, fontSize: 13, fontWeight: 700, color: x.c, marginTop: 2 }}>{x.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow right={who === "all" ? (
          <button onClick={() => setBm(!bm)} style={{ background: "transparent", border: "none", color: bm ? C.brass : C.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            벤치마크 {bm ? "끄기" : "켜기"}
          </button>) : null}>누적 수익률</Eyebrow>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="m" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v + "%"} width={44} />
              <ReferenceLine y={0} stroke={C.line} />
              <Tooltip content={<Tip />} />
              {who === "all" && bm && <Line type="monotone" dataKey="ks" name="KOSPI" stroke={C.steel} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />}
              {who === "all" && bm && <Line type="monotone" dataKey="sp" name="S&P500" stroke={C.teal} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />}
              <Line type="monotone" dataKey="twr" name="내 포트" stroke={C.violet} strokeWidth={2.5} dot={{ r: 2.5, fill: C.violet }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex" style={{ gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: C.mute }}><span style={{ width: 12, height: 3, background: C.violet }} />내 포트</span>
          {who === "all" && bm && <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: C.mute }}><span style={{ width: 12, height: 2, background: C.steel }} />KOSPI</span>}
          {who === "all" && bm && <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: C.mute }}><span style={{ width: 12, height: 2, background: C.teal }} />S&P500</span>}
        </div>
      </Card>

      <Card>
        <Eyebrow>월별 손익</Eyebrow>
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
              <XAxis dataKey="m" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <ReferenceLine y={0} stroke={C.line} />
              <Tooltip content={<Tip unit="won" />} />
              <Bar dataKey="pl" name="손익" radius={[3, 3, 3, 3]}>
                {d.map((x, i) => <Cell key={i} fill={x.pl >= 0 ? C.up : C.down} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 8 }}>
          <Pill color={C.up}>최고 {best.m} {pct(best.r)}</Pill>
          <Pill color={C.down}>최저 {worst.m} {pct(worst.r)}</Pill>
        </div>
      </Card>

      <Card>
        <Eyebrow>월별 상세</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="flex" style={{ fontSize: 10, color: C.dim, paddingBottom: 8, borderBottom: "1px solid " + C.line }}>
            <span style={{ flex: 1 }}>월</span>
            <span style={{ width: 74, textAlign: "right" }}>평가금액</span>
            <span style={{ width: 62, textAlign: "right" }}>손익</span>
            <span style={{ width: 52, textAlign: "right" }}>월</span>
          </div>
          {d.map((x) => (
            <div key={x.m} className="flex items-center" style={{ padding: "9px 0", borderBottom: "1px solid rgba(16,27,45,0.06)" }}>
              <span style={{ flex: 1, fontSize: 12, color: C.txt }}>{x.m}</span>
              <span style={{ width: 74, textAlign: "right" }}><Amt v={x.end} k size={11} weight={600} color={C.mute} /></span>
              <span style={{ width: 62, textAlign: "right" }}><Amt v={x.pl} k size={11} weight={600} color={sgn(x.pl)} /></span>
              <span style={{ width: 52, textAlign: "right", ...NUM, fontSize: 11, fontWeight: 700, color: sgn(x.r) }}>{pct(x.r)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================ 계획 ============================ */
const SIM_DEFAULT = {
  seed: 50000000, ret: 8, infl: 2.5, saveY: 32000000,
  saveGrow: 1.5, stop: 55, draw: 61,
};
const START_AGE = 37, END_AGE = 85, GOAL_TODAY = 1000000000, DRAW_RATE = 4;

function simulate(a) {
  const out = [];
  let amt = a.seed, sv = a.saveY;
  for (let age = START_AGE; age <= END_AGE; age++) {
    const contrib = age <= a.stop ? sv : 0;
    const withdraw = age >= a.draw ? (amt * DRAW_RATE) / 100 : 0;
    amt = amt * (1 + a.ret / 100) + contrib - withdraw;
    out.push({
      age, amt, flow: contrib - withdraw,
      tgt: GOAL_TODAY * Math.pow(1 + a.infl / 100, age - START_AGE),
    });
    if (age <= a.stop) sv = sv * (1 + a.saveGrow / 100);
  }
  return out;
}

function Field({ label, display, value, min, max, step, onChange, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.mute }}>{label}</span>
        <span style={{ ...NUM, fontSize: 13.5, fontWeight: 800, color: C.brass }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.brass, height: 22, display: "block" }} />
      {hint && <div style={{ fontSize: 10, color: C.dim, marginTop: -2 }}>{hint}</div>}
    </div>
  );
}
function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        border: "1px solid " + (on ? C.brass : C.line), background: on ? "rgba(209,154,46,0.16)" : "transparent",
        color: on ? C.brass : C.mute, borderRadius: 999, padding: "7px 12px", fontSize: 11.5,
        fontWeight: 700, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
      }}>{children}</button>
  );
}

/* ---------- 계획 › 자산 ---------- */
function PlanAsset() {
  const [a, setA] = useState(SIM_DEFAULT);
  const set = (k) => (v) => setA({ ...a, [k]: v });
  const data = useMemo(() => simulate(a), [a]);
  const cross = data.find((d) => d.amt >= d.tgt);
  const atStop = data.find((d) => d.age === a.stop) || data[data.length - 1];
  const at65 = data.find((d) => d.age === 65);
  const drawAt65 = at65 && a.draw <= 65 ? Math.abs(at65.flow) / 12 : 0;
  const dirty = JSON.stringify(a) !== JSON.stringify(SIM_DEFAULT);

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Card style={{ background: "linear-gradient(160deg,#E8EFFB 0%,#FFFFFF 65%)" }}>
        <Eyebrow>은퇴자금 시뮬레이션</Eyebrow>
        <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.6 }}>
          목표는 지금 가치로 <span style={{ color: C.txt, fontWeight: 700 }}>10억</span>.
          물가 {nf(a.infl, 1)}%를 반영하면 이 목표선도 매년 올라갑니다.
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>목표선 통과</div>
            <div style={{ ...NUM, fontSize: 20, fontWeight: 800, color: cross ? C.brass : C.dim, marginTop: 2 }}>
              {cross ? cross.age + "세" : "미달"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>{a.stop}세 자산</div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 700, color: C.txt, marginTop: 5 }}>{kor(atStop.amt)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim }}>65세 월 인출</div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 700, color: C.txt, marginTop: 5 }}>
              {drawAt65 ? kor(drawAt65) : "—"}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow right={
          <button onClick={() => setA(SIM_DEFAULT)} disabled={!dirty}
            style={{ background: "transparent", border: "none", cursor: dirty ? "pointer" : "default", fontFamily: FONT, fontSize: 11, fontWeight: 700, color: dirty ? C.brass : C.dim }}>
            기본값
          </button>}>가정 조절</Eyebrow>

        <Field label="초기 자금" display={kor(a.seed)} value={a.seed}
          min={0} max={500000000} step={5000000} onChange={set("seed")} />
        <div className="flex" style={{ gap: 8, marginTop: -6, marginBottom: 14 }}>
          <Chip on={a.seed === INV_TOTAL} onClick={() => set("seed")(Math.round(INV_TOTAL / 5000000) * 5000000)}>
            투자자산 {kor(INV_TOTAL)}
          </Chip>
          <Chip on={false} onClick={() => set("seed")(Math.round(AVAIL.total / 5000000) * 5000000)}>
            가용자산 {kor(AVAIL.total)}
          </Chip>
        </div>

        <Field label="매년 저축액" display={kor(a.saveY) + " (월 " + kor(a.saveY / 12) + ")"} value={a.saveY}
          min={0} max={80000000} step={1000000} onChange={set("saveY")} />
        <Field label="기대 수익률" display={nf(a.ret, 1) + "%"} value={a.ret}
          min={0} max={15} step={0.5} onChange={set("ret")} />
        <Field label="물가 상승률" display={nf(a.infl, 1) + "%"} value={a.infl}
          min={0} max={6} step={0.1} onChange={set("infl")} />
        <Field label="저축 상승률" display={nf(a.saveGrow, 1) + "%"} value={a.saveGrow}
          min={0} max={10} step={0.5} onChange={set("saveGrow")}
          hint="0%로 두면 저축액이 매년 고정됩니다" />
        <Field label="적립 종료" display={a.stop + "세"} value={a.stop}
          min={45} max={75} step={1} onChange={(v) => setA({ ...a, stop: v, draw: Math.max(a.draw, v + 1) })} />
        <Field label="인출 시작" display={a.draw + "세"} value={a.draw}
          min={a.stop + 1} max={80} step={1} onChange={set("draw")}
          hint={`인출 시작 후 매년 자산의 ${DRAW_RATE}%를 꺼내 씁니다`} />
      </Card>

      <Card>
        <Eyebrow right={<Pill color={C.dim}>{START_AGE}세 시작</Pill>}>자산 vs 물가 반영 목표</Eyebrow>
        <div style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TYPE_COLOR.금} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={TYPE_COLOR.금} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="age" ticks={[37, 45, 55, 65, 75, 85]} tick={{ fill: C.dim, fontSize: 10 }}
                axisLine={false} tickLine={false} tickFormatter={(v) => v + "세"} />
              <YAxis tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                tickFormatter={(v) => Math.round(v / 1e8) + "억"} />
              <Tooltip content={<Tip unit="won" lsuf="세" />} />
              {cross && <ReferenceLine x={cross.age} stroke={C.brass} strokeDasharray="3 3" />}
              <ReferenceLine x={a.stop} stroke={C.line} />
              <Area type="monotone" dataKey="amt" name="예상 자산" stroke={C.brass} strokeWidth={2} fill="url(#gAmt)" />
              <Area type="monotone" dataKey="tgt" name="목표(물가반영)" stroke={C.steel} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
          {START_AGE}~{a.stop}세 적립, {a.stop + 1}~{a.draw - 1}세 유지, {a.draw}세부터 인출.
          {cross
            ? ` 목표선을 넘어서는 시점은 ${cross.age}세입니다.`
            : " 현재 가정으로는 85세까지 목표선을 넘지 못합니다."}
        </div>
      </Card>

      <Card>
        <Eyebrow right={<Pill color={C.dim}>간이 계산</Pill>}>퇴직급여</Eyebrow>
        <Amt v={SEV.pay} size={22} weight={800} color={C.txt} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          {[["평균임금", nf(SEV.avg) + "원"], ["근속일수", nf(SEV.days) + "일"], ["입사", SEV.inDate], ["퇴사", SEV.outDate]].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: C.dim }}>{l}</span>
              <span style={{ ...NUM, fontSize: 12, fontWeight: 600, color: C.mute }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- 계획 › 부동산 ---------- */
const pmtLoan = (principal, annual, years) => {
  const n = years * 12;
  if (!n) return 0;
  if (!annual) return principal / n;
  const i = annual / 100 / 12;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
};
const pmtNeeded = (fv, months, annual) => {
  if (!months) return 0;
  if (!annual) return fv / months;
  const i = annual / 100 / 12;
  return (fv * i) / (Math.pow(1 + i, months) - 1);
};

function PlanEstate() {
  const [ci, setCi] = useState(1);
  const [months, setMonths] = useState(RE.months);
  const [rate, setRate] = useState(0);
  const [base, setBase] = useState(RE.target26);
  const [loan, setLoan] = useState(RE.loanAmt);
  const [lrate, setLrate] = useState(5);
  const [lterm, setLterm] = useState(30);
  const [dti, setDti] = useState(35);
  const rc = RE.cases[ci];
  const pay = pmtLoan(loan, lrate, lterm);
  const payUp = pmtLoan(loan, lrate + 1, lterm) - pay;
  const totalPay = pay * lterm * 12;
  const needPay = dti ? pay / (dti / 100) : 0;
  const target = Math.round(base * Math.pow(1 + RE.bump / 100, RE.bumpN));

  const parts = [
    { nm: "시드", v: RE.seed, c: C.steel },
    { nm: "시세차익 (수익공유 후)", v: rc.after, c: C.brass },
    { nm: "주담대", v: loan, c: FIN_COLOR.부채 },
  ];
  const secured = parts.reduce((s, x) => s + x.v, 0);
  const gap = Math.max(0, target - secured);
  const monthly = pmtNeeded(gap, months, rate);
  const extra = monthly - RE.saveM;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Card style={{ background: "linear-gradient(160deg,#FBF1DC 0%,#FFFFFF 70%)" }}>
        <Eyebrow right={<Pill color={C.dim}>2032년</Pill>}>상급지 갈아타기 로드맵</Eyebrow>
        <div style={{ fontSize: 12, color: C.mute }}>목표 상급지 가격 (2032년)</div>
        <Amt v={target} size={28} weight={800} color={C.txt} />
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
          26년 시세 {kor(base)}에 3년마다 {RE.bump}%씩 {RE.bumpN}번 반영한 값입니다.
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="26년 상급지 시세" display={kor(base)} value={base}
            min={500000000} max={2000000000} step={50000000} onChange={setBase} />
        </div>
      </Card>

      <Card>
        <Eyebrow right={<span style={{ fontSize: 10, color: C.dim }}>분양가 {kor(RE.price)}</span>}>
          시세 시나리오
        </Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {RE.cases.map((c, i) => {
            const on = ci === i;
            return (
              <button key={c.k} onClick={() => setCi(i)}
                style={{
                  textAlign: "left", cursor: "pointer", fontFamily: FONT,
                  background: on ? "rgba(209,154,46,0.16)" : C.surf2,
                  border: "1px solid " + (on ? C.brass : C.line),
                  borderRadius: 12, padding: "10px 9px 11px",
                }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: on ? C.brass : C.mute }}>{c.k}</div>
                <div style={{ fontSize: 9.5, color: C.dim, marginTop: 7 }}>매도 예상시세</div>
                <div style={{ marginTop: 1 }}>
                  <Amt v={c.v2032} k size={13} weight={800} color={C.txt} />
                </div>
                <div style={{ ...NUM, fontSize: 10, fontWeight: 700, color: C.up, marginTop: 4 }}>
                  +<Amt v={c.gain} k size={10} weight={700} color={C.up} />
                </div>
                <div style={{ ...NUM, fontSize: 9.5, color: C.dim, marginTop: 3 }}>
                  공유후 <Amt v={c.after} k size={9.5} weight={600} color={C.dim} />
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <StackBar segs={[...parts, { nm: "부족", v: gap, c: "rgba(16,27,45,0.10)" }]} h={12} />
        </div>
        <div style={{ marginTop: 8 }}>
          {parts.map((x) => <Row key={x.nm} c={x.c} nm={x.nm} v={x.v} p={(x.v / target) * 100} />)}
          <div style={{ borderTop: "1px solid " + C.line, marginTop: 6, paddingTop: 4 }}>
            <Row nm="확보 금액" v={secured} p={(secured / target) * 100} strong />
          </div>
        </div>
        <div style={{ borderTop: "1px solid " + C.line, marginTop: 12, paddingTop: 14 }}>
          <Field label="주담대 금액" display={kor(loan)} value={loan}
            min={0} max={800000000} step={25000000} onChange={setLoan}
            hint={`금리 ${nf(lrate, 1)}% · ${lterm}년 기준 월 ${nf(Math.round(pay))}원 상환`} />
        </div>
        <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
          {rc.k} 기준으로 2032년에 {kor(rc.v2032)}에 팔면 차익 {kor(rc.gain)},
          여기서 수익공유 {RE.share}%를 뺀 {kor(rc.after)}이 갈아타기 재원으로 들어갑니다.
        </div>
      </Card>

      {/* 부족액과 필요 저축 — 핵심 */}
      <Card style={{ borderColor: gap > 0 ? "rgba(224,68,71,0.35)" : "rgba(18,144,122,0.35)" }}>
        <Eyebrow right={<Pill color={gap > 0 ? C.up : C.teal}>{rc.k}</Pill>}>부족 금액</Eyebrow>
        <Amt v={gap} size={26} weight={800} color={gap > 0 ? C.up : C.teal} />

        {gap > 0 && (
          <>
            <div style={{ background: C.surf2, borderRadius: 14, padding: 14, marginTop: 14 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>매월 저축해야 할 금액</div>
              <div style={{ ...NUM, fontSize: 28, fontWeight: 800, color: C.brass, letterSpacing: "-0.03em" }}>
                {nf(Math.round(monthly))}<span style={{ fontSize: 15, fontWeight: 600, color: C.mute }}>원</span>
              </div>
              <div className="flex items-center justify-between" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid " + C.line }}>
                <span style={{ fontSize: 11.5, color: C.mute }}>현재 계획 {nf(RE.saveM)}원 대비</span>
                <span style={{ ...NUM, fontSize: 13, fontWeight: 800, color: extra > 0 ? C.up : C.teal }}>
                  {extra > 0 ? "월 " + nf(Math.round(extra)) + "원 부족" : "월 " + nf(Math.round(-extra)) + "원 여유"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Field label="모으는 기간" display={months + "개월 (" + nf(months / 12, 1) + "년)"} value={months}
                min={12} max={120} step={6} onChange={setMonths} />
              <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>저축 운용 수익률</div>
              <div className="flex" style={{ gap: 8 }}>
                {[0, 3, 5, 8].map((r) => (
                  <Chip key={r} on={rate === r} onClick={() => setRate(r)}>{r === 0 ? "안 굴림" : r + "%"}</Chip>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10.5, color: C.dim, marginTop: 14, lineHeight: 1.6 }}>
              {rate === 0
                ? "이자 없이 그대로 모으는 기준입니다."
                : `연 ${rate}% 복리로 매월 적립할 때 필요한 금액입니다. 수익률이 흔들리면 실제로는 더 필요할 수 있습니다.`}
            </div>
          </>
        )}
        {gap === 0 && (
          <div style={{ fontSize: 12, color: C.mute, marginTop: 10, lineHeight: 1.6 }}>
            이 시나리오에서는 시드·시세차익·주담대만으로 목표가를 넘습니다. 추가 저축은 대출을 줄이는 데 쓸 수 있습니다.
          </div>
        )}
      </Card>

      <Card>
        <Eyebrow right={<Pill color={C.dim}>{kor(loan)}</Pill>}>주담대 상환 조건</Eyebrow>
        <div style={{ background: C.surf2, borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>월 원리금</div>
          <div style={{ ...NUM, fontSize: 28, fontWeight: 800, color: C.txt, letterSpacing: "-0.03em" }}>
            {nf(Math.round(pay))}<span style={{ fontSize: 15, fontWeight: 600, color: C.mute }}>원</span>
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8 }}>
            금리가 1%p 오르면 월 {nf(Math.round(payUp))}원 늘어납니다.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="금리" display={nf(lrate, 1) + "%"} value={lrate}
            min={2} max={10} step={0.1} onChange={setLrate} />
          <Field label="만기" display={lterm + "년"} value={lterm}
            min={10} max={40} step={5} onChange={setLterm} />
        </div>

        <div style={{ borderTop: "1px solid " + C.line, paddingTop: 6 }}>
          <Row nm="총 상환액" v={totalPay} />
          <Row nm="총 이자 (원금 대비)" v={totalPay - loan} p={loan ? ((totalPay - loan) / loan) * 100 : 0} />
        </div>

        <div style={{ borderTop: "1px solid " + C.line, marginTop: 10, paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>소득 대비 상환 비율</div>
          <div className="flex" style={{ gap: 8 }}>
            {[30, 35, 40].map((r) => (
              <Chip key={r} on={dti === r} onClick={() => setDti(r)}>{r}%</Chip>
            ))}
          </div>
          <div style={{ background: C.surf2, borderRadius: 12, padding: 12, marginTop: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
              <span style={{ fontSize: 11.5, color: C.mute }}>필요 세후 월급</span>
              <Amt v={needPay} size={13} color={C.txt} />
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11.5, color: C.mute }}>필요 세후 연봉</span>
              <Amt v={needPay * 12} k size={13} color={C.txt} />
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>
            시트 기준 부양가족 2인은 세후 {kor(RE.salary2.after)}이 세전 {kor(RE.salary2.before)}에 해당합니다.
            상환은 갈아탄 뒤부터 시작하므로 위의 월 저축액과 겹치지 않습니다.
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow right={<Pill color={C.dim}>{RE.unit.addr}</Pill>}>{RE.unit.name} 분양현황</Eyebrow>
        <div style={{ fontSize: 11, color: C.dim, marginTop: -2, marginBottom: 12, lineHeight: 1.5 }}>
          전용 {RE.unit.area}㎡ ({RE.unit.pyeong}평) · {RE.unit.rooms}룸 {RE.unit.baths}욕실 ·
          {" "}{RE.unit.year}년 입주 · {nf(RE.unit.units)}세대 · 역까지 도보 {RE.unit.station}분
        </div>
        <div className="flex" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <Pill color={C.teal}>{RE.unit.school}</Pill>
          <Pill color={C.mute}>학군 {RE.unit.district}</Pill>
          <Pill color={C.mute}>세대당 주차 {RE.unit.parking}</Pill>
        </div>
        <div className="flex" style={{ gap: 10, marginBottom: 14 }}>
          {[["분양가", RE.price], ["시드", RE.seed], ["대출", RE.loan]].map(([l, v]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim }}>{l}</div>
              <div style={{ ...NUM, fontSize: 13, fontWeight: 700, color: C.txt, marginTop: 2 }}>{kor(v)}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.surf2, borderRadius: 12, padding: 12 }}>
          <div className="flex items-start justify-between" style={{ marginBottom: 8, gap: 12 }}>
            <span style={{ fontSize: 11, color: C.mute, lineHeight: 1.45, flex: 1 }}>
              신희타 전용 모기지 {RE.rate}% · 월 원리금
            </span>
            <span style={{ ...NUM, fontSize: 12, fontWeight: 700, color: C.txt, whiteSpace: "nowrap" }}>{nf(RE.pay)}원</span>
          </div>
          <div className="flex items-start justify-between" style={{ gap: 12 }}>
            <span style={{ fontSize: 11, color: C.mute, lineHeight: 1.45, flex: 1 }}>
              동일 시세(6억5천 기준) 타 물건 일반 주담대 {RE.altRate}% · 월 원리금
            </span>
            <span style={{ ...NUM, fontSize: 12, color: C.mute, whiteSpace: "nowrap" }}>{nf(RE.altPay)}원</span>
          </div>
          <div className="flex items-center justify-between" style={{ borderTop: "1px solid " + C.line, paddingTop: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.brass, fontWeight: 700 }}>3년 이자 절감</span>
            <span style={{ ...NUM, fontSize: 13, fontWeight: 800, color: C.brass }}>{kor(RE.gap3)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 11.5, color: C.mute }}>{rc.k} 기준 이자절감 포함 실익</span>
          <Amt v={rc.withInt} k size={13} color={C.txt} />
        </div>
      </Card>
    </div>
  );
}

function Plan() {
  const [sub, setSub] = useState("asset");
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Seg opts={[{ v: "asset", l: "자산" }, { v: "estate", l: "부동산" }]} value={sub} onChange={setSub} />
      {sub === "asset" ? <PlanAsset /> : <PlanEstate />}
    </div>
  );
}

/* ============================ 데이터 상태 ============================ */
function DataPanel({ onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [st, setSt] = useState(SYNC);

  const run = async () => {
    setBusy(true);
    try { const r = await loadData(); setSt({ ...r }); onDone(); }
    catch (e) { SYNC = { ...SYNC, err: (e && e.message) || "불러오지 못했습니다." }; setSt({ ...SYNC }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: C.ink, zIndex: 50, display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between"
        style={{ padding: "14px 16px", borderBottom: "1px solid " + C.line, background: C.surf, flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>데이터</span>
        <button onClick={onClose}
          style={{ background: C.surf2, border: "1px solid " + C.line, borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={17} color={C.mute} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <Eyebrow right={st.src === "data.json"
            ? <Pill color={C.on} bg={C.teal}>최신</Pill>
            : <Pill color={C.mute}>내장 데이터</Pill>}>상태</Eyebrow>
          <div style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.65 }}>
            {st.src === "data.json"
              ? "데이터 기준 " + (st.at ? st.at.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-")
              : "앱에 저장된 값을 보고 있습니다. data.json 이 옆에 있으면 자동으로 최신 값을 읽어옵니다."}
          </div>
          {st.err && (
            <div style={{ background: "rgba(224,68,71,0.10)", borderRadius: 12, padding: 12, marginTop: 12 }}>
              <div className="flex items-start" style={{ gap: 8 }}>
                <AlertTriangle size={15} color={C.up} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: C.txt, lineHeight: 1.55 }}>{st.err}</span>
              </div>
            </div>
          )}
          <button onClick={run} disabled={busy}
            style={{
              width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none", fontFamily: FONT,
              fontSize: 13.5, fontWeight: 800, cursor: busy ? "default" : "pointer",
              background: busy ? C.surf2 : C.txt, color: busy ? C.dim : C.on,
            }}>{busy ? "불러오는 중…" : "다시 불러오기"}</button>
        </Card>

        <Card>
          <Eyebrow>어떻게 갱신되나요</Eyebrow>
          {[
            "구글 시트를 고칩니다.",
            "GitHub Actions 가 정해진 시각에 시트를 통째로 내려받아 data.json 으로 바꿔 올립니다.",
            "앱을 열면 그 파일을 읽어 최신 숫자를 보여줍니다.",
          ].map((t, i) => (
            <div key={i} className="flex items-start" style={{ gap: 10, padding: "8px 0" }}>
              <span style={{ ...NUM, fontSize: 11, fontWeight: 800, color: C.brass, width: 14, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.55 }}>{t}</span>
            </div>
          ))}
          <div style={{ background: C.surf2, borderRadius: 12, padding: 12, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
              기다리지 않고 바로 갱신하려면 저장소의 Actions 탭에서 sync 워크플로를 직접 실행하면 됩니다.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================ 앱 셸 ============================ */
const TABS = [
  { id: "home", l: "홈", I: Home },
  { id: "asset", l: "자산", I: Wallet },
  { id: "rebal", l: "리밸런싱", I: RefreshCw },
  { id: "perf", l: "수익률", I: TrendingUp },
  { id: "plan", l: "계획", I: Flag },
];

export default function App() {
  const [tab, setTab] = useState("home");
  const [hide, setHide] = useState(false);
  const [thr, setThr] = useState(8);
  const [rev, setRev] = useState(0);
  const [panel, setPanel] = useState(false);
  const bump = () => setRev((r) => r + 1);

  useEffect(() => {
    loadData().then(bump).catch((e) => { SYNC = { ...SYNC, err: (e && e.message) || "" }; });
  }, []);

  const needCnt = ACCOUNTS.filter((a) => a.managed && a.maxGap >= thr).length;

  return (
    <HideCtx.Provider value={hide}>
      <div style={{ background: C.surf, color: C.txt, fontFamily: FONT, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* 헤더 */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid " + C.line, background: C.surf, flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em", fontWeight: 700 }}>
                2026.08.10 기준
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>
                {TABS.find((t) => t.id === tab).l === "홈" ? "탱둥 자산" : TABS.find((t) => t.id === tab).l}
              </div>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button onClick={() => setHide(!hide)}
                style={{ background: C.surf2, border: "1px solid " + C.line, borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {hide ? <EyeOff size={17} color={C.mute} /> : <Eye size={17} color={C.mute} />}
              </button>
              <button onClick={() => setPanel(true)}
                style={{ background: C.surf2, border: "1px solid " + C.line, borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                <Settings size={17} color={C.mute} />
                {SYNC.at && <span style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: 3, background: C.teal }} />}
              </button>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div key={rev} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px 24px", background: C.ink, WebkitOverflowScrolling: "touch" }}>
          {tab === "home" && <Home_ go={setTab} />}
          {tab === "asset" && <Assets />}
          {tab === "rebal" && <Rebal thr={thr} setThr={setThr} />}
          {tab === "perf" && <Perf />}
          {tab === "plan" && <Plan />}
        </div>

        {/* 하단 탭 */}
        <div style={{ display: "flex", borderTop: "1px solid " + C.line, background: C.surf, paddingBottom: 6, flexShrink: 0, boxShadow: "0 -4px 16px -8px rgba(16,27,45,0.15)" }}>
          {TABS.map((t) => {
            const on = tab === t.id;
            const Icon = t.I;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, background: "transparent", border: "none", cursor: "pointer",
                  padding: "10px 0 4px", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4, position: "relative", fontFamily: FONT,
                }}>
                <Icon size={19} color={on ? C.txt : C.dim} strokeWidth={on ? 2.3 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: on ? 800 : 500, color: on ? C.txt : C.dim }}>{t.l}</span>
                {t.id === "rebal" && needCnt > 0 && (
                  <span style={{ position: "absolute", top: 8, right: "50%", marginRight: -18, width: 7, height: 7, borderRadius: 4, background: C.brass }} />
                )}
              </button>
            );
          })}
        </div>
        {panel && <DataPanel onClose={() => setPanel(false)} onDone={bump} />}
      </div>
    </HideCtx.Provider>
  );
}
