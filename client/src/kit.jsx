// kit.jsx — shared building blocks for the "Menus & QR" studio:
// icons, small UI pieces, the styled-QR drawing engine, QR designer panel,
// print sheets (PDF) and NFC writing. Nothing in here talks to the server.
import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { api } from "./api.js";

/* ------------------------------------------------------------------ colors */
export const K = {
  ink: "#14112C", violet: "#7C5CFC", violetDeep: "#5B3FE0", blue: "#4A5FD9",
  fog: "#EEF0F8", fogDeep: "#E3E6F4", line: "#DADDEE", mist: "#8A8FA8",
  ok: "#2F9E44", warn: "#E0431F", white: "#fff",
};

/* ------------------------------------------------------------------- icons */
const P = {
  wifi: "M5 12.55a11 11 0 0 1 14 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01",
  text: "M17 10H3 M21 6H3 M21 14H3 M17 18H3",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6",
  sms: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  calendar: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18",
  video: "M23 7l-7 5 7 5V7z M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  chat: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M21 15l-5-5L5 21",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  gift: "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  ticket: "M2 9a3 3 0 0 1 0 6v3a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z M13 5v2 M13 17v2 M13 11v2",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  cart: "M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
  utensils: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7",
  coffee: "M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  trash: "M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  edit: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  copy: "M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  chevR: "M9 18l6-6-6-6",
  chevL: "M15 18l-6-6 6-6",
  chevD: "M6 9l6 6 6-6",
  chevU: "M18 15l-6-6-6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  qr: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v.01 M14 20h3 M20 17v4",
  nfc: "M6 8.32a7.43 7.43 0 0 1 0 7.36 M9.46 6.21a11.76 11.76 0 0 1 0 11.58 M12.91 4.1a15.91 15.91 0 0 1 .01 15.8 M16.37 2a20.16 20.16 0 0 1 0 20",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M7 11V7a5 5 0 0 1 10 0v4",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z",
  mobile: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  paw: "M11 4.5a1.5 2 0 1 1-3 0 1.5 2 0 0 1 3 0z M16 4.5a1.5 2 0 1 1-3 0 1.5 2 0 0 1 3 0z M20 9a1.5 2 0 1 1-3 0 1.5 2 0 0 1 3 0z M7 9a1.5 2 0 1 1-3 0 1.5 2 0 0 1 3 0z M12 11c-3 0-6 3-6 6 0 2 2 3 3.5 3 1 0 1.5-.5 2.5-.5s1.5.5 2.5.5c1.5 0 3.5-1 3.5-3 0-3-3-6-6-6z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  dollar: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  palette: "M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1 3.7c.6.4.3 2.3-3 2.3z M7.5 11h.01 M10.5 7h.01 M15.5 8h.01",
  print: "M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  up: "M12 19V5 M5 12l7-7 7 7",
  down: "M12 5v14 M19 12l-7 7-7-7",
  ext: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  store: "M3 9l1.5-5h15L21 9 M3 9v11h18V9 M3 9h18 M9 20v-6h6v6",
  bag: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  wand: "M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M17.8 11.8L19 13 M15 9h.01 M17.8 6.2L19 5 M3 21l9-9 M12.2 6.2L11 5",
  layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  receipt: "M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z M8 8h8 M8 12h8 M8 16h5",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
};

export function Ic({ n, size = 18, color = "currentColor", sw = 1.8, style }) {
  const d = P[n] || P.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", ...style }} aria-hidden="true">
      {d.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}
export const ICON_NAMES = Object.keys(P);

/* ------------------------------------------------------------------ styles */
const CSS = `
.sx{font-family:Inter,'Segoe UI',system-ui,sans-serif;color:${K.ink};font-size:14px;line-height:1.45;-webkit-text-size-adjust:100%}
.sx *{box-sizing:border-box}
.sx h1,.sx h2,.sx h3,.sx p{margin:0}
.sx button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;padding:0}
.sx input,.sx textarea,.sx select{font-family:inherit;font-size:14px;color:${K.ink};width:100%;padding:9px 11px;border:1.5px solid ${K.line};border-radius:9px;background:#fff;outline:none}
.sx input:focus,.sx textarea:focus,.sx select:focus{border-color:${K.violet}}
.sx input[type=checkbox],.sx input[type=radio]{width:auto;padding:0}
.sx input[type=color]{padding:0;width:34px;height:30px;border-radius:8px;cursor:pointer}
.sx textarea{resize:vertical;min-height:70px}
.sx-row{display:flex;gap:8px;align-items:center}
.sx-wrap{flex-wrap:wrap}
.sx-grow{flex:1;min-width:0}
.sx-card{background:#fff;border:1px solid ${K.line};border-radius:14px;padding:14px}
.sx-h{font-family:'Space Grotesk',Inter,sans-serif;font-weight:600;font-size:20px}
.sx-h3{font-family:'Space Grotesk',Inter,sans-serif;font-weight:600;font-size:15px}
.sx-mut{color:${K.mist};font-size:12px}
.sx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:9px;font-weight:600;font-size:13px;background:${K.violet};color:#fff;transition:transform .08s}
.sx-btn:active{transform:scale(.97)}
.sx-btn[disabled]{opacity:.45;cursor:not-allowed}
.sx-btn.sec{background:#fff;color:${K.ink};border:1.5px solid ${K.ink}}
.sx-btn.soft{background:${K.fog};color:${K.ink}}
.sx-btn.dark{background:${K.ink}}
.sx-btn.sm{padding:6px 10px;font-size:12px;border-radius:8px}
.sx-btn.danger{background:#fff;color:${K.warn};border:1.5px solid #F4C7BC}
.sx-chip{padding:6px 11px;border-radius:999px;font-size:12px;font-weight:600;background:${K.fog};color:${K.ink};border:1.5px solid transparent;white-space:nowrap}
.sx-chip.on{background:${K.ink};color:#fff}
.sx-lbl{display:block;font-size:12px;font-weight:600;color:${K.mist};margin:0 0 5px}
.sx-fld{margin-bottom:12px}
.sx-hint{font-size:11.5px;color:${K.mist};margin-top:4px}
.sx-note{font-size:12px;padding:9px 11px;border-radius:9px;background:#FFF4E5;color:#8A4B00}
.sx-ok{background:#E6F6EA;color:#1B6B2E}
.sx-err{background:#FDECEA;color:#A32A12}
.sx-grid{display:grid;gap:10px}
.sx-tabs{display:flex;gap:4px;overflow-x:auto;padding:4px;background:${K.fog};border-radius:11px;scrollbar-width:none}
.sx-tabs::-webkit-scrollbar{display:none}
.sx-tab{padding:7px 12px;border-radius:8px;font-size:12.5px;font-weight:600;color:${K.mist};white-space:nowrap;display:inline-flex;gap:6px;align-items:center}
.sx-tab.on{background:#fff;color:${K.ink};box-shadow:0 1px 3px rgba(20,17,44,.12)}
.sx-modal{position:fixed;inset:0;z-index:80;background:rgba(20,17,44,.55);display:flex;align-items:flex-end;justify-content:center}
.sx-sheet{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px}
@media(min-width:700px){.sx-modal{align-items:center}.sx-sheet{border-radius:18px}}
.sx-two{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:560px){.sx-two{grid-template-columns:1fr 1fr}}
.sx-split{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:980px){.sx-split{grid-template-columns:minmax(0,1fr) 330px;align-items:start}.sx-stick{position:sticky;top:76px}}
.sx-phone{width:100%;max-width:300px;margin:0 auto;border:7px solid ${K.ink};border-radius:30px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(20,17,44,.18)}
.sx-phone-in{height:520px;overflow:auto;scrollbar-width:thin}
.sx-pill{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${K.fog};color:${K.mist}}
.sx-pill.ok{background:#E6F6EA;color:#1B6B2E}
.sx-tile{display:flex;flex-direction:column;gap:6px;text-align:left;padding:12px;border:1.5px solid ${K.line};border-radius:13px;background:#fff;transition:border-color .1s,transform .1s}
.sx-tile:hover{border-color:${K.violet};transform:translateY(-1px)}
.sx-tile.on{border-color:${K.violet};background:#F6F3FF}
.sx-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#F0EBFF;color:${K.violetDeep}}
.sx-table{width:100%;border-collapse:collapse;font-size:13px}
.sx-table th{text-align:left;font-size:11.5px;color:${K.mist};padding:8px 10px;background:${K.fog}}
.sx-table td{padding:9px 10px;border-top:1px solid ${K.line};vertical-align:middle}
.sx-prev-col{display:none}
@media(min-width:980px){.sx-prev-col{display:block}.sx-prev-btn{display:none!important}}
.sx-hide-sm{display:none}
@media(min-width:760px){.sx-hide-sm{display:table-cell}.sx-only-sm{display:none!important}}
.sx-sw{width:24px;height:24px;border-radius:50%;border:1px solid ${K.line};flex:none}
.sx-sw.on{outline:2px solid ${K.violet};outline-offset:1px}
@keyframes sxspin{to{transform:rotate(360deg)}}
.sx-spin{animation:sxspin .8s linear infinite}
`;

export function StudioStyles() {
  useEffect(() => {
    if (document.getElementById("sx-css")) return;
    const s = document.createElement("style");
    s.id = "sx-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }, []);
  return null;
}

/* ------------------------------------------------------------- small pieces */
export function Btn({ children, kind = "", size = "", icon, ...rest }) {
  return (
    <button type="button" className={`sx-btn ${kind} ${size}`} {...rest}>
      {icon && <Ic n={icon} size={size === "sm" ? 14 : 16} />}{children}
    </button>
  );
}

export function Fld({ label, hint, children }) {
  return (
    <div className="sx-fld">
      {label && <span className="sx-lbl">{label}</span>}
      {children}
      {hint && <p className="sx-hint">{hint}</p>}
    </div>
  );
}

export function Chips({ value, onChange, options, multi }) {
  const isOn = (id) => (multi ? (value || []).includes(id) : value === id);
  const click = (id) => {
    if (!multi) return onChange(id);
    const cur = value || [];
    onChange(cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };
  return (
    <div className="sx-row sx-wrap">
      {options.map(o => {
        const opt = typeof o === "string" ? { id: o, label: o } : o;
        return <button key={opt.id} type="button" className={`sx-chip ${isOn(opt.id) ? "on" : ""}`} onClick={() => click(opt.id)}>{opt.label}</button>;
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="sx-row" style={{ cursor: "pointer", marginBottom: 8 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}

export function Swatches({ value, onChange, colors }) {
  return (
    <div className="sx-row sx-wrap" style={{ gap: 6 }}>
      {colors.map(c => <button key={c} type="button" aria-label={c} className={`sx-sw ${value === c ? "on" : ""}`} style={{ background: c }} onClick={() => onChange(c)} />)}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000"} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="sx sx-modal" onClick={onClose}>
      <div className="sx-sheet" onClick={e => e.stopPropagation()}>
        <div className="sx-row" style={{ marginBottom: 10 }}>
          <h3 className="sx-h3 sx-grow">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose}><Ic n="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Note({ kind = "", children }) {
  return <p className={`sx-note ${kind === "ok" ? "sx-ok" : kind === "err" ? "sx-err" : ""}`} style={{ marginBottom: 10 }}>{children}</p>;
}

export function Spinner() {
  return <span className="sx-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #ddd", borderTopColor: K.violet, borderRadius: "50%" }} />;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
      return true;
    } catch { return false; }
  }
}

export function CopyBtn({ text, label = "Copy", size = "sm" }) {
  const [done, setDone] = useState(false);
  return (
    <Btn kind="soft" size={size} icon={done ? "check" : "copy"} onClick={async () => { await copyText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "Copied" : label}
    </Btn>
  );
}

// Upload a picture/PDF to Cloudinary through the existing /api/upload route.
// Images are shrunk in the browser first so phone photos stay under the 5 MB limit.
async function shrinkImage(file, max = 1600) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5e6) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

export function ImgUpload({ value, onChange, token, label = "Add picture", pdf = false, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      const file = pdf ? f : await shrinkImage(f);
      const { url } = await api.uploadFile(file, pdf ? "pdf" : "photo", token);
      onChange(url);
    } catch (ex) { setErr(ex.message || "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ marginBottom: compact ? 0 : 10 }}>
      <div className="sx-row">
        {value && !pdf && <img src={value} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: `1px solid ${K.line}` }} />}
        {value && pdf && <span className="sx-pill ok">PDF added</span>}
        <label className="sx-btn soft sm" style={{ cursor: "pointer" }}>
          <Ic n="upload" size={14} />{busy ? "Uploading…" : value ? "Change" : label}
          <input type="file" accept={pdf ? "application/pdf" : "image/*"} onChange={pick} style={{ display: "none" }} />
        </label>
        {value && <button type="button" className="sx-mut" onClick={() => onChange("")}>Remove</button>}
      </div>
      {err && <p className="sx-hint" style={{ color: K.warn }}>{err}</p>}
    </div>
  );
}

export function download(href, name) {
  const a = document.createElement("a");
  a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
export function downloadText(text, name, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
export const randomSlug = (base = "") => `${slugify(base) || "page"}-${Math.random().toString(36).slice(2, 6)}`;

// Only ever allow http(s) (and a few safe schemes) in links that visitors can click.
export function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:|sms:|geo:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "";   // javascript:, data:, etc.
  return "https://" + s.replace(/^\/+/, "");
}
export const digits = (s) => String(s || "").replace(/\D/g, "");
// Kenyan-friendly: 0712… -> 254712…
export function waNumber(s) {
  let d = digits(s);
  if (d.startsWith("0")) d = "254" + d.slice(1);
  return d;
}
export function money(n, cur = "KSh") {
  const v = Number(n);
  if (!isFinite(v)) return "";
  return `${cur} ${v.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}
export const siteOrigin = () => window.location.origin;
export const pageUrl = (slug) => `${siteOrigin()}/p/${slug}`;

/* --------------------------------------------------------------- QR engine */
export const QR_SHAPES = [
  { id: "square", label: "Square" }, { id: "dots", label: "Dots" }, { id: "rounded", label: "Rounded" },
  { id: "diamond", label: "Diamond" }, { id: "classy", label: "Classy" }, { id: "barsV", label: "Bars ↕" },
  { id: "barsH", label: "Bars ↔" }, { id: "tiny", label: "Tiny" },
];
export const QR_EYES = [{ id: "square", label: "Square" }, { id: "rounded", label: "Rounded" }, { id: "circle", label: "Circle" }];
export const QR_SILS = [
  { id: "none", label: "Plain" }, { id: "circle", label: "Circle" }, { id: "hexagon", label: "Hexagon" },
  { id: "heart", label: "Heart" }, { id: "shield", label: "Shield" }, { id: "burst", label: "Burst" }, { id: "diamond", label: "Diamond" },
];
export const QR_FRAMES = [
  { id: "none", label: "No frame" }, { id: "below", label: "Label below" }, { id: "above", label: "Label above" }, { id: "outline", label: "Outline" },
];
export const QR_PRESETS = [
  { id: "classic", label: "Classic", o: { shape: "square", eye: "square", fgMode: "single", fg1: "#14112C", bg: "#FFFFFF" } },
  { id: "violet", label: "Violet", o: { shape: "rounded", eye: "square", fgMode: "gradient", fg1: "#14112C", fg2: "#5B3FE0", gradDir: "diag", bg: "#FFFFFF" } },
  { id: "forest", label: "Forest", o: { shape: "dots", eye: "square", fgMode: "single", fg1: "#0F5132", bg: "#F1FAF3" } },
  { id: "sunset", label: "Sunset", o: { shape: "rounded", eye: "square", fgMode: "gradient", fg1: "#7A1E3A", fg2: "#C2410C", gradDir: "v", bg: "#FFF7ED" } },
  { id: "ocean", label: "Ocean", o: { shape: "classy", eye: "square", fgMode: "gradient", fg1: "#0B2A6F", fg2: "#0E7490", gradDir: "h", bg: "#F0F9FF" } },
  { id: "mono", label: "Mono", o: { shape: "tiny", eye: "square", fgMode: "single", fg1: "#000000", bg: "#FFFFFF" } },
  { id: "gold", label: "Gold", o: { shape: "diamond", eye: "square", fgMode: "single", fg1: "#3B2A06", bg: "#FFF8E1" } },
  { id: "berry", label: "Berry", o: { shape: "dots", eye: "rounded", fgMode: "single", fg1: "#6B1D5C", bg: "#FDF4FF" } },
];
export const DEFAULT_QR = { shape: "square", eye: "square", fgMode: "single", fg1: "#14112C", fg2: "#7C5CFC", gradDir: "diag", bg: "#FFFFFF", sil: "none", frame: "none", frameText: "SCAN ME", frameColor: "#14112C", logoOn: false };

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
function drawModule(ctx, shape, x, y, s) {
  if (shape === "dots") { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.44, 0, Math.PI * 2); ctx.fill(); }
  else if (shape === "rounded") { ctx.beginPath(); rrect(ctx, x, y, s, s, s * 0.3); ctx.fill(); }
  else if (shape === "diamond") { ctx.beginPath(); ctx.moveTo(x + s / 2, y - s * 0.05); ctx.lineTo(x + s * 1.05, y + s / 2); ctx.lineTo(x + s / 2, y + s * 1.05); ctx.lineTo(x - s * 0.05, y + s / 2); ctx.closePath(); ctx.fill(); }
  else if (shape === "classy") {
    const r = s * 0.5; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s - r);
    ctx.arcTo(x + s, y + s, x + s - r, y + s, r); ctx.lineTo(x, y + s); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); ctx.fill();
  }
  else if (shape === "barsV") ctx.fillRect(x + s * 0.12, y - 0.5, s * 0.76, s + 1);
  else if (shape === "barsH") ctx.fillRect(x - 0.5, y + s * 0.12, s + 1, s * 0.76);
  else if (shape === "tiny") ctx.fillRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72);
  else ctx.fillRect(x, y, s, s);
}
function drawEye(ctx, style, x, y, s) {
  const outer = 7 * s, inner = 5 * s, core = 3 * s;
  ctx.beginPath();
  if (style === "circle") { ctx.arc(x + outer / 2, y + outer / 2, outer / 2, 0, Math.PI * 2); ctx.moveTo(x + outer / 2 + inner / 2, y + outer / 2); ctx.arc(x + outer / 2, y + outer / 2, inner / 2, 0, Math.PI * 2, true); }
  else if (style === "rounded") { rrect(ctx, x, y, outer, outer, s * 2); rrect(ctx, x + s, y + s, inner, inner, s * 1.3); }
  else { ctx.rect(x, y, outer, outer); ctx.rect(x + s, y + s, inner, inner); }
  ctx.fill("evenodd");
  ctx.beginPath();
  if (style === "circle") ctx.arc(x + outer / 2, y + outer / 2, core / 2, 0, Math.PI * 2);
  else if (style === "rounded") rrect(ctx, x + 2 * s, y + 2 * s, core, core, s * 0.9);
  else ctx.rect(x + 2 * s, y + 2 * s, core, core);
  ctx.fill();
}
const SIL = {
  circle: (u, v) => u * u + v * v <= 1,
  hexagon: (u, v) => Math.abs(v) <= 0.866 && Math.abs(u) * 0.866 + Math.abs(v) * 0.5 <= 0.866,
  heart: (u, v) => { const x = u * 1.25, y = -v * 1.25 + 0.15; return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0; },
  shield: (u, v) => { if (v < -0.95 || v > 0.95) return false; const hw = v <= 0.1 ? 0.88 : 0.88 * Math.sqrt(Math.max(0, (0.95 - v) / 0.85)); return Math.abs(u) <= hw; },
  burst: (u, v) => Math.hypot(u, v) <= 0.9 + 0.09 * Math.cos(14 * Math.atan2(v, u)),
  diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1,
};
function silFit(fn) {
  const ok = (h) => [[h, h], [-h, h], [h, -h], [-h, -h], [h, 0], [-h, 0], [0, h], [0, -h]].every(([u, v]) => fn(u, v));
  let lo = 0.2, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
  return lo * 0.96;
}
function noise(i, j) {
  let x = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ 0x5bd1e995;
  x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16;
  return ((x >>> 0) % 1000) / 1000;
}
export function lum(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 0;
  const v = parseInt(m[1], 16);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f((v >> 16) & 255) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f(v & 255);
}
export function qrContrastWarning(o) {
  const fg = o.fgMode === "gradient" ? Math.max(lum(o.fg1), lum(o.fg2)) : lum(o.fg1);
  const bg = lum(o.bg);
  const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
  return ratio < 3 || fg > bg;
}

function loadImg(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  });
}

// Draws the styled QR for `value` into `canvas`. `cell` = pixels per QR square.
export async function drawStyledQR(canvas, value, o = {}, logoSrc = null, cell = 10) {
  const opt = { ...DEFAULT_QR, ...o };
  const withLogo = !!(opt.logoOn && logoSrc);
  const qr = QRCode.create(String(value || " "), { errorCorrectionLevel: withLogo ? "H" : "M" });
  const modules = qr.modules, count = modules.size, margin = 2, Q = count + margin * 2;
  const silFn = opt.sil !== "none" ? SIL[opt.sil] : null;
  let S = Q;
  if (silFn) { S = Math.ceil(Q / silFit(silFn)); if ((S - Q) % 2) S += 1; }
  const off = (S - Q) / 2, size = S * cell;

  const qc = document.createElement("canvas");
  qc.width = size; qc.height = size;
  const ctx = qc.getContext("2d");
  ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, size, size);
  let paint = opt.fg1;
  if (opt.fgMode === "gradient") {
    const g = opt.gradDir === "v" ? ctx.createLinearGradient(0, 0, 0, size) : opt.gradDir === "h" ? ctx.createLinearGradient(0, 0, size, 0) : ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, opt.fg1); g.addColorStop(1, opt.fg2); paint = g;
  }
  ctx.fillStyle = paint;
  const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
  if (silFn) {
    for (let gi = 0; gi < S; gi++) for (let gj = 0; gj < S; gj++) {
      if (gi >= off - 1 && gi < off + Q + 1 && gj >= off - 1 && gj < off + Q + 1) continue;
      if (!silFn(((gj + 0.5) / S) * 2 - 1, ((gi + 0.5) / S) * 2 - 1)) continue;
      if (noise(gi, gj) < 0.48) drawModule(ctx, opt.shape, gj * cell, gi * cell, cell);
    }
  }
  for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) {
    if (!modules.get(r, c) || inEye(r, c)) continue;
    drawModule(ctx, opt.shape, (c + margin + off) * cell, (r + margin + off) * cell, cell);
  }
  drawEye(ctx, opt.eye, (margin + off) * cell, (margin + off) * cell, cell);
  drawEye(ctx, opt.eye, (count - 7 + margin + off) * cell, (margin + off) * cell, cell);
  drawEye(ctx, opt.eye, (margin + off) * cell, (count - 7 + margin + off) * cell, cell);

  if (withLogo) {
    const im = await loadImg(logoSrc);
    if (im) {
      const ls = size * 0.2, cx = size / 2, cy = size / 2;
      ctx.save(); ctx.fillStyle = opt.bg; ctx.beginPath(); ctx.arc(cx, cy, ls / 2 + cell * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, ls / 2, 0, Math.PI * 2); ctx.clip();
      const sc = Math.max(ls / im.width, ls / im.height);
      ctx.drawImage(im, cx - (im.width * sc) / 2, cy - (im.height * sc) / 2, im.width * sc, im.height * sc);
      ctx.restore();
    }
  }

  // optional frame with a call-to-action label ("SCAN ME", "SCAN FOR MENU"…)
  const fr = opt.frame;
  if (!fr || fr === "none") { canvas.width = size; canvas.height = size; canvas.getContext("2d").drawImage(qc, 0, 0); return; }
  const p = Math.round(size * 0.05), bar = Math.round(size * 0.17);
  const W = size + p * 2, H = size + p * 2 + bar;
  canvas.width = W; canvas.height = H;
  const c2 = canvas.getContext("2d");
  c2.fillStyle = "#fff"; c2.fillRect(0, 0, W, H);
  const col = opt.frameColor || "#14112C";
  const textCol = lum(col) > 0.5 ? "#14112C" : "#FFFFFF";
  const qy = fr === "above" ? bar + p : p;
  const by = fr === "above" ? 0 : size + p * 2 - p * 0.0;
  if (fr === "outline") {
    c2.strokeStyle = col; c2.lineWidth = p * 0.55; c2.beginPath(); rrect(c2, p * 0.3, p * 0.3, W - p * 0.6, size + p * 1.4 - 0, p); c2.stroke();
  } else {
    c2.fillStyle = col; c2.beginPath(); rrect(c2, 0, 0, W, H, p * 1.2); c2.fill();
  }
  c2.save(); c2.beginPath(); rrect(c2, p, qy, size, size, p * 0.5); c2.clip(); c2.drawImage(qc, p, qy, size, size); c2.restore();
  const txt = String(opt.frameText || "SCAN ME").toUpperCase().slice(0, 24);
  const barY = fr === "above" ? 0 : size + p;
  const midY = fr === "outline" ? size + p * 1.2 + bar * 0.45 : barY + (fr === "above" ? bar / 2 + p * 0.3 : bar / 2 + p * 0.55);
  let fs = bar * 0.5;
  c2.font = `700 ${fs}px Inter, Arial, sans-serif`;
  while (c2.measureText(txt).width > W * 0.86 && fs > 8) { fs -= 2; c2.font = `700 ${fs}px Inter, Arial, sans-serif`; }
  c2.textAlign = "center"; c2.textBaseline = "middle";
  c2.fillStyle = fr === "outline" ? col : textCol;
  c2.fillText(txt, W / 2, midY);
  void by;
}

// Renders to a data URL (used by the print sheets)
export async function qrDataUrl(value, o, logoSrc, cell = 14) {
  const c = document.createElement("canvas");
  await drawStyledQR(c, value, o, logoSrc, cell);
  return { url: c.toDataURL("image/png"), w: c.width, h: c.height };
}

/* ---------------------------------------------------------- print sheets */
const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); const v = m ? parseInt(m[1], 16) : 0x14112c; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };

// One A4 poster: big title, big QR, short instructions, optional NFC line
export async function posterPdf({ title, subtitle, value, qr, logo, accent = "#14112C", nfc = true, filename = "poster" }) {
  const { url, w, h } = await qrDataUrl(value, qr, logo, 16);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const [r, g, b] = hexRgb(accent);
  doc.setFillColor(r, g, b); doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  doc.text(String(title || "Scan me").slice(0, 34), W / 2, 24, { align: "center" });
  const qw = 140, qh = (qw * h) / w;
  doc.addImage(url, "PNG", (W - qw) / 2, 58, qw, qh);
  doc.setTextColor(20, 17, 44); doc.setFontSize(20);
  doc.text(String(subtitle || "Scan with your phone camera").slice(0, 50), W / 2, 58 + qh + 18, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(110, 114, 140);
  if (nfc) doc.text("No camera? Tap your phone on the NFC tag.", W / 2, 58 + qh + 30, { align: "center" });
  doc.setFontSize(10); doc.text(String(value).replace(/^https?:\/\//, ""), W / 2, 284, { align: "center" });
  doc.save(`${filename}-poster.pdf`);
}

// Table cards: 4 per A4 page (A6 size), one per table, each with its own QR (?t=N)
export async function tableCardsPdf({ title, baseUrl, tables, qr, logo, accent = "#14112C", filename = "tables" }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [r, g, b] = hexRgb(accent);
  const cw = 105, ch = 148.5;
  for (let i = 0; i < tables.length; i++) {
    if (i > 0 && i % 4 === 0) doc.addPage();
    const slot = i % 4, x = (slot % 2) * cw, y = Math.floor(slot / 2) * ch;
    const link = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(tables[i])}`;
    const { url, w, h } = await qrDataUrl(link, qr, logo, 12);
    doc.setDrawColor(210, 214, 230); doc.setLineWidth(0.2); doc.rect(x + 0.1, y + 0.1, cw - 0.2, ch - 0.2);
    doc.setFillColor(r, g, b); doc.rect(x, y, cw, 26, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(String(title || "Menu").slice(0, 26), x + cw / 2, y + 16, { align: "center" });
    const qw = 70, qh = (qw * h) / w;
    doc.addImage(url, "PNG", x + (cw - qw) / 2, y + 36, qw, qh);
    doc.setTextColor(20, 17, 44); doc.setFontSize(22);
    doc.text(`Table ${tables[i]}`, x + cw / 2, y + 36 + qh + 14, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(110, 114, 140);
    doc.text("Scan to see the menu & order", x + cw / 2, y + 36 + qh + 22, { align: "center" });
  }
  doc.save(`${filename}-table-cards.pdf`);
}

/* -------------------------------------------------------------------- NFC */
export const nfcSupported = () => typeof window !== "undefined" && "NDEFReader" in window;
export async function writeNfcTag(url) {
  if (!nfcSupported()) throw new Error("This browser can't write NFC tags. Use Chrome on an Android phone, or an NFC app (steps below).");
  const reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: "url", data: url }] });
}

export function NfcPanel({ url }) {
  const [state, setState] = useState("idle"); // idle | waiting | done | error
  const [msg, setMsg] = useState("");
  const go = async () => {
    setState("waiting"); setMsg("");
    try { await writeNfcTag(url); setState("done"); }
    catch (e) { setState("error"); setMsg(e.name === "NotAllowedError" ? "NFC permission was denied. Allow it in Chrome's site settings and try again." : e.message); }
  };
  return (
    <div className="sx-card">
      <div className="sx-row" style={{ marginBottom: 8 }}><Ic n="nfc" color={K.violetDeep} /><h3 className="sx-h3">Tap-to-open NFC tag</h3></div>
      <p className="sx-mut" style={{ marginBottom: 10 }}>Write this page's link to an NFC sticker or table stand. Customers tap their phone — no camera needed. The QR code keeps working too.</p>
      <div className="sx-row sx-wrap" style={{ marginBottom: 10 }}>
        <Btn icon="nfc" onClick={go} disabled={state === "waiting"}>{state === "waiting" ? "Hold a tag to the back of your phone…" : "Write to NFC tag"}</Btn>
        <CopyBtn text={url} label="Copy link" size="" />
      </div>
      {state === "done" && <Note kind="ok">Done! Tap the tag with another phone to test it.</Note>}
      {state === "error" && <Note kind="err">{msg}</Note>}
      {!nfcSupported() && <Note>This browser can't write NFC directly. Open this page in <b>Chrome on an Android phone</b>, or use the free "NFC Tools" app (Android and iPhone): Write → Add a record → URL → paste the link above.</Note>}
      <details>
        <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>What do I buy and how do I set it up?</summary>
        <ol className="sx-mut" style={{ paddingLeft: 18, marginTop: 8, lineHeight: 1.7 }}>
          <li>Buy NFC stickers or cards called <b>NTAG213 or NTAG215</b> (cheap, work on all phones; ask on Jumia, Kilimall or an electronics shop).</li>
          <li>Open this page on an Android phone with NFC switched on, press <b>Write to NFC tag</b>, and hold the tag to the back of the phone.</li>
          <li>Stick it on the table stand or menu board. iPhones (XS and newer) read it automatically; no app is needed for customers.</li>
          <li>Optional: lock the tag in NFC Tools so nobody can overwrite it.</li>
          <li>If you change the menu later, nothing needs rewriting — the link stays the same.</li>
        </ol>
      </details>
    </div>
  );
}

/* ----------------------------------------------------------- QR designer */
// Live QR preview + styling controls + downloads. `value` is what the QR encodes.
export function QRDesigner({ value, initial, onChange, logo, filename = "qr", title = "", caption = "Scan with your phone camera", posterAccent, extraDownloads, allowFrameText = true }) {
  const ref = useRef(null);
  const [o, setO] = useState({ ...DEFAULT_QR, ...(initial || {}) });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const oRef = useRef(o);
  oRef.current = o;
  const upd = (patch) => { const n = { ...oRef.current, ...patch }; oRef.current = n; setO(n); onChange && onChange(n); };
  const warn = qrContrastWarning(o);

  useEffect(() => {
    let dead = false;
    setReady(false);
    drawStyledQR(ref.current, value, o, logo, 10).then(() => { if (!dead) setReady(true); }).catch(() => {});
    return () => { dead = true; };
  }, [value, o, logo]);

  const png = () => download(ref.current.toDataURL("image/png"), `${filename}.png`);
  const jpg = () => {
    // JPG has no transparency; the QR already paints its own background
    download(ref.current.toDataURL("image/jpeg", 0.95), `${filename}.jpg`);
  };
  const pdf = async () => {
    setBusy(true);
    try { await posterPdf({ title, subtitle: caption, value, qr: o, logo: o.logoOn ? logo : null, accent: posterAccent || o.frameColor || "#14112C", filename }); }
    finally { setBusy(false); }
  };
  const hiRes = async () => {
    const { url } = await qrDataUrl(value, o, o.logoOn ? logo : null, 40);
    download(url, `${filename}-print.png`);
  };

  const seg = (arr, key) => <Chips value={o[key]} onChange={v => upd({ [key]: v })} options={arr} />;
  return (
    <div className="sx-card">
      <div className="sx-row" style={{ marginBottom: 10 }}><Ic n="qr" color={K.violetDeep} /><h3 className="sx-h3">Your QR code</h3></div>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <canvas ref={ref} style={{ width: "100%", maxWidth: 240, height: "auto", border: `1px solid ${K.line}`, borderRadius: 12 }} />
        <p className="sx-hint" style={{ wordBreak: "break-all" }}>Scans to: {value}</p>
      </div>

      <Fld label="Quick styles">
        <div className="sx-row sx-wrap">
          {QR_PRESETS.map(p => <button key={p.id} type="button" className="sx-chip" onClick={() => upd(p.o)}>{p.label}</button>)}
        </div>
      </Fld>
      <details style={{ marginBottom: 10 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Customise further</summary>
        <Fld label="Frame & call-to-action">{seg(QR_FRAMES, "frame")}</Fld>
        {o.frame !== "none" && allowFrameText && (
          <div className="sx-two">
            <Fld label="Label text"><input maxLength={24} value={o.frameText} onChange={e => upd({ frameText: e.target.value })} /></Fld>
            <Fld label="Frame colour"><Swatches value={o.frameColor} onChange={v => upd({ frameColor: v })} colors={["#14112C", "#7C5CFC", "#0F5132", "#B91C1C", "#C2410C", "#0E7490"]} /></Fld>
          </div>
        )}
        <Fld label="Shape of the whole code">{seg(QR_SILS, "sil")}</Fld>
        <Fld label="Dot style">{seg(QR_SHAPES, "shape")}</Fld>
        <Fld label="Corner style">{seg(QR_EYES, "eye")}</Fld>
        {o.eye !== "square" && <p className="sx-hint" style={{ marginTop: -6, marginBottom: 10 }}>Rounded corners look great but a few scanner apps struggle with them. Scan your printout before using it widely.</p>}
        <Fld label="Dot colour">
          <Chips value={o.fgMode} onChange={v => upd({ fgMode: v })} options={[{ id: "single", label: "Single" }, { id: "gradient", label: "Gradient" }]} />
          <div style={{ marginTop: 8 }}><Swatches value={o.fg1} onChange={v => upd({ fg1: v })} colors={["#14112C", "#7C5CFC", "#1C3FAA", "#000000", "#0F5132", "#B91C1C"]} /></div>
          {o.fgMode === "gradient" && (
            <div style={{ marginTop: 8 }}>
              <Swatches value={o.fg2} onChange={v => upd({ fg2: v })} colors={["#7C5CFC", "#0E7490", "#C2410C", "#5B3FE0", "#065F46", "#BE185D"]} />
              <div style={{ marginTop: 8 }}><Chips value={o.gradDir} onChange={v => upd({ gradDir: v })} options={[{ id: "diag", label: "Diagonal" }, { id: "v", label: "Vertical" }, { id: "h", label: "Horizontal" }]} /></div>
            </div>
          )}
        </Fld>
        <Fld label="Background"><Swatches value={o.bg} onChange={v => upd({ bg: v })} colors={["#FFFFFF", "#F4F1FF", "#FFF7E6", "#E8F7EE", "#F0F9FF"]} /></Fld>
        {logo && <Toggle checked={o.logoOn} onChange={v => upd({ logoOn: v })} label="Put my logo in the middle" />}
      </details>
      {warn && <Note>Keep the dots clearly darker than the background or some phones won't scan the code.</Note>}

      <div className="sx-row sx-wrap">
        <Btn kind="soft" size="sm" icon="download" disabled={!ready} onClick={png}>PNG</Btn>
        <Btn kind="soft" size="sm" icon="download" disabled={!ready} onClick={jpg}>JPG</Btn>
        <Btn kind="soft" size="sm" icon="download" disabled={!ready || busy} onClick={pdf}>{busy ? "…" : "Poster PDF"}</Btn>
        <Btn kind="soft" size="sm" icon="print" disabled={!ready} onClick={hiRes}>Print-size PNG</Btn>
        {extraDownloads}
      </div>
      <p className="sx-hint">Tip: print the QR at least 3 cm wide. High-contrast colours scan fastest.</p>
    </div>
  );
}
