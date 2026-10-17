// menu.jsx — Digital food & drinks menus: 50 minimalist templates, the
// public menu (search, filters, cart, WhatsApp ordering), the editor and the
// "design your own template" tools.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Ic, K, Btn, Fld, Chips, Toggle, Swatches, Modal, Note, ImgUpload, CopyBtn, uid, safeUrl, waNumber, money, downloadText } from "./kit.jsx";

/* ------------------------------------------------------------------ fonts */
export const FONTS = [
  "Inter", "DM Sans", "Manrope", "Poppins", "Montserrat", "Space Grotesk",
  "Playfair Display", "DM Serif Display", "Cormorant Garamond", "Lora", "Fraunces", "Bebas Neue",
];
const SERIF = new Set(["Playfair Display", "DM Serif Display", "Cormorant Garamond", "Lora", "Fraunces"]);
export const fontStack = (f) => `'${f}', ${SERIF.has(f) ? "Georgia, serif" : "'Segoe UI', system-ui, sans-serif"}`;

export function useFonts(names) {
  const key = [...new Set(names)].sort().join("|");
  useEffect(() => {
    if (!key) return;
    const id = "sx-font-" + key.replace(/[^a-z0-9]/gi, "");
    if (document.getElementById(id)) return;
    const fam = key.split("|").map(n => `family=${n.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
    document.head.appendChild(l);
  }, [key]);
}

/* -------------------------------------------------------------- templates */
// bg, fg, muted, accent, card, line
export const PAL = {
  oat: ["#FAF7F2", "#2B2622", "#8B8178", "#B5835A", "#FFFFFF", "#E9E2D8"],
  snow: ["#FFFFFF", "#111111", "#7A7A7A", "#111111", "#F6F6F6", "#EAEAEA"],
  noir: ["#111214", "#F2F2F2", "#8E9096", "#E8C26B", "#1A1C1F", "#2A2D31"],
  matcha: ["#F3F6EE", "#1F2A1B", "#6D7B66", "#4F7A3A", "#FFFFFF", "#DCE5D2"],
  blush: ["#FFF5F5", "#3A1F26", "#9A7A82", "#D6546F", "#FFFFFF", "#F4DCE0"],
  sky: ["#F2F8FC", "#0F2A3F", "#6B8499", "#1D7FC4", "#FFFFFF", "#D9E7F2"],
  terra: ["#FBF1EA", "#3B2218", "#8F6E5E", "#C2562B", "#FFFFFF", "#EBD6C8"],
  navy: ["#0E1626", "#E8EEF8", "#8493AC", "#5BC0EB", "#16213A", "#25324F"],
  espresso: ["#1E1612", "#F1E7DE", "#A8978A", "#D99A5B", "#2A201A", "#3B2E26"],
  lemon: ["#FFFCEB", "#2A2500", "#8B8450", "#C99A00", "#FFFFFF", "#F0E8B8"],
  sage: ["#EEF1EC", "#26302A", "#75807A", "#5E7F6B", "#FAFBF9", "#D5DDD6"],
  lavender: ["#F6F3FF", "#241A45", "#8479A8", "#7C5CFC", "#FFFFFF", "#E2DBF7"],
  coral: ["#FFF3EF", "#3A1A12", "#A07A6E", "#E8492A", "#FFFFFF", "#F6D9CF"],
  charcoal: ["#1B1B1D", "#EDEDED", "#909094", "#FF6B35", "#262628", "#333336"],
  paper: ["#F5F1E8", "#1A1A1A", "#77736A", "#8C1C13", "#FBF8F1", "#E0DACB"],
  forest: ["#0F1D17", "#E6F0EA", "#86A394", "#6FCF97", "#16281F", "#223A2E"],
  mocha: ["#F4F1EC", "#3A2C25", "#8A7A70", "#2F8F83", "#FFFFFF", "#E3DDD3"],
  plum: ["#1A1020", "#F1E6F5", "#A58FB0", "#E879F9", "#24162C", "#36223F"],
  sand: ["#F8F3EA", "#403220", "#928466", "#A67C00", "#FFFFFF", "#E8DEC8"],
  mono: ["#000000", "#FFFFFF", "#9A9A9A", "#FFFFFF", "#141414", "#2A2A2A"],
  berry: ["#FDF2F8", "#3B0A2A", "#9D6B88", "#BE185D", "#FFFFFF", "#F5D5E6"],
  slate: ["#F1F5F9", "#0F172A", "#64748B", "#0F766E", "#FFFFFF", "#DCE3EC"],
  sunrise: ["#FFF8EB", "#3A1D00", "#A07A4A", "#E8650A", "#FFFFFF", "#F6E1BF"],
  teal: ["#07242B", "#E4F4F6", "#7FA9B0", "#2DD4BF", "#0D3540", "#174651"],
  cream: ["#FFF9F0", "#2A0F0F", "#8F6A6A", "#B91C1C", "#FFFFFF", "#F1DDD0"],
};
export const DARK = new Set(["noir", "navy", "espresso", "charcoal", "forest", "plum", "mono", "teal"]);

// id, name, layout, palette, heading font, body font, header, nav, radius
const T = [
  ["list", "Oat Milk", "oat", "Playfair Display", "Inter", "center", "text", 0],
  ["list", "Snow White", "snow", "Inter", "Inter", "left", "underline", 0],
  ["list", "Noir Gold", "noir", "Cormorant Garamond", "Montserrat", "center", "text", 0],
  ["list", "Old Paper", "paper", "Lora", "Inter", "split", "underline", 2],
  ["list", "Sage Serif", "sage", "DM Serif Display", "DM Sans", "left", "text", 4],
  ["cards", "Blush Cards", "blush", "Poppins", "Poppins", "banner", "pills", 14],
  ["cards", "Sky Cards", "sky", "Manrope", "Manrope", "left", "pills", 12],
  ["cards", "Charcoal Cards", "charcoal", "Space Grotesk", "Inter", "banner", "chips", 10],
  ["cards", "Lemon Cards", "lemon", "DM Sans", "DM Sans", "center", "pills", 16],
  ["cards", "Deep Teal Cards", "teal", "Inter", "Inter", "split", "chips", 12],
  ["grid", "Coral Grid", "coral", "Poppins", "Poppins", "banner", "pills", 18],
  ["grid", "Matcha Grid", "matcha", "DM Sans", "DM Sans", "center", "chips", 14],
  ["grid", "Midnight Grid", "navy", "Montserrat", "Montserrat", "banner", "pills", 12],
  ["grid", "Sunrise Grid", "sunrise", "Manrope", "Manrope", "split", "pills", 16],
  ["grid", "Lavender Grid", "lavender", "Inter", "Inter", "left", "chips", 20],
  ["compact", "Clean Compact", "snow", "Inter", "Inter", "minimal", "underline", 6],
  ["compact", "Slate Compact", "slate", "Space Grotesk", "Inter", "minimal", "pills", 8],
  ["compact", "Mono Compact", "mono", "Inter", "Inter", "minimal", "underline", 0],
  ["compact", "Sand Compact", "sand", "Lora", "Inter", "left", "text", 6],
  ["compact", "Mocha Compact", "mocha", "DM Sans", "DM Sans", "minimal", "chips", 10],
  ["accordion", "Terracotta Fold", "terra", "Fraunces", "Manrope", "center", "none", 12],
  ["accordion", "Espresso Fold", "espresso", "Playfair Display", "Inter", "left", "none", 10],
  ["accordion", "Berry Fold", "berry", "Poppins", "Poppins", "banner", "none", 16],
  ["accordion", "Forest Fold", "forest", "Manrope", "Manrope", "split", "none", 12],
  ["accordion", "Oat Fold", "oat", "DM Serif Display", "DM Sans", "center", "none", 8],
  ["magazine", "Cream Magazine", "cream", "Playfair Display", "Inter", "banner", "text", 4],
  ["magazine", "Plum Magazine", "plum", "Fraunces", "Manrope", "banner", "underline", 8],
  ["magazine", "Sky Magazine", "sky", "DM Serif Display", "DM Sans", "center", "text", 6],
  ["magazine", "Sunrise Magazine", "sunrise", "Poppins", "Poppins", "banner", "pills", 14],
  ["magazine", "Paper Magazine", "paper", "Cormorant Garamond", "Montserrat", "left", "underline", 0],
  ["centered", "Noir Fine Dining", "mono", "Cormorant Garamond", "Montserrat", "center", "text", 0],
  ["centered", "Sand Fine Dining", "sand", "Playfair Display", "Lora", "center", "text", 0],
  ["centered", "Blush Bistro", "blush", "Cormorant Garamond", "DM Sans", "center", "text", 0],
  ["centered", "Midnight Fine Dining", "navy", "DM Serif Display", "Inter", "center", "text", 0],
  ["centered", "Matcha Bistro", "matcha", "Lora", "Manrope", "center", "text", 0],
  ["boxed", "Snow Boxes", "snow", "Space Grotesk", "Inter", "left", "chips", 4],
  ["boxed", "Charcoal Boxes", "charcoal", "Inter", "Inter", "split", "chips", 6],
  ["boxed", "Lemon Boxes", "lemon", "Montserrat", "Montserrat", "left", "underline", 8],
  ["boxed", "Lavender Boxes", "lavender", "DM Sans", "DM Sans", "center", "pills", 14],
  ["boxed", "Slate Boxes", "slate", "Manrope", "Manrope", "split", "underline", 10],
  ["stack", "Coral Street", "coral", "Bebas Neue", "Poppins", "banner", "pills", 12],
  ["stack", "Mono Street", "mono", "Bebas Neue", "Inter", "left", "underline", 0],
  ["stack", "Sunrise Street", "sunrise", "Montserrat", "Montserrat", "banner", "pills", 18],
  ["stack", "Teal Street", "teal", "Space Grotesk", "Inter", "split", "chips", 10],
  ["stack", "Berry Street", "berry", "Poppins", "Poppins", "center", "pills", 20],
  ["tabs", "Oat Tabs", "oat", "Inter", "Inter", "center", "pills", 12],
  ["tabs", "Midnight Tabs", "navy", "Poppins", "Poppins", "left", "pills", 14],
  ["tabs", "Sage Tabs", "sage", "Manrope", "Manrope", "split", "chips", 10],
  ["tabs", "Cream Tabs", "cream", "Lora", "Inter", "banner", "pills", 8],
  ["tabs", "Mocha Tabs", "mocha", "Montserrat", "Montserrat", "minimal", "underline", 6],
];

export const TEMPLATES = T.map(([layout, name, pal, hFont, bFont, header, nav, radius], i) => {
  const [bg, fg, muted, accent, card, line] = PAL[pal];
  return {
    id: "t" + String(i + 1).padStart(2, "0"), name, layout, header, nav, radius, hFont, bFont,
    mode: DARK.has(pal) ? "dark" : "light", bg, fg, muted, accent, card, line,
  };
});
export const LAYOUTS = [
  { id: "list", label: "Classic list" }, { id: "cards", label: "Cards" }, { id: "grid", label: "Photo grid" },
  { id: "compact", label: "Compact" }, { id: "accordion", label: "Fold-out" }, { id: "magazine", label: "Magazine" },
  { id: "centered", label: "Fine dining" }, { id: "boxed", label: "Boxed" }, { id: "stack", label: "Bold street" }, { id: "tabs", label: "One tab at a time" },
];
const HEADERS = [{ id: "banner", label: "Cover photo" }, { id: "center", label: "Centered" }, { id: "left", label: "Left" }, { id: "split", label: "Split" }, { id: "minimal", label: "Minimal" }];
const NAVS = [{ id: "pills", label: "Pills" }, { id: "underline", label: "Underline" }, { id: "text", label: "Text" }, { id: "chips", label: "Chips" }, { id: "none", label: "None" }];

const readable = (bg, fg) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg || ""); if (!m) return fg;
  const v = parseInt(m[1], 16), l = (((v >> 16) & 255) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000;
  return l > 150 ? "#111111" : "#FFFFFF";
};

// The design object saved with a menu → ready-to-use tokens
export function resolveTokens(design = {}) {
  const base = TEMPLATES.find(t => t.id === design.tpl) || TEMPLATES[0];
  const custom = design.useCustom ? design.custom || {} : {};
  const t = { ...base, ...custom };
  if (design.accent && !design.useCustom) t.accent = design.accent;
  t.accentFg = readable(t.accent, "#fff");
  t.images = design.showImages !== false;
  return t;
}

/* ------------------------------------------------------------------- data */
export function emptyMenu() {
  return {
    venue: { name: "", tagline: "", logo: "", cover: "", about: "", phone: "", whatsapp: "", address: "", hours: "", instagram: "", website: "", pay: "", currency: "KSh" },
    categories: [],
    ordering: { enabled: true, whatsapp: "", askTable: true, askName: true, note: "" },
    ownDesign: { enabled: false, images: [], pdf: "" },
  };
}
const it = (name, price, desc = "", tags = []) => ({ id: uid(), name, price, desc, image: "", tags, soldOut: false, variants: [] });
export function sampleMenu(name = "Mama Njeri's Kitchen") {
  const m = emptyMenu();
  m.venue = { ...m.venue, name, tagline: "Fresh, local & made with love", about: "Family-run kitchen serving Kenyan favourites and good coffee since 2015.", phone: "0712 345 678", whatsapp: "0712345678", address: "Moi Avenue, Nairobi", hours: "Mon–Sat 7am – 10pm · Sun 9am – 8pm", instagram: "mamanjerikitchen", pay: "M-Pesa Till 123456" };
  m.ordering.whatsapp = "0712345678";
  m.categories = [
    { id: uid(), name: "Breakfast", note: "Served until 11am", items: [
      it("Mandazi & Chai", 150, "Three warm mandazi with a pot of spiced masala chai", ["veg", "popular"]),
      it("Full Kenyan Breakfast", 450, "Eggs, sausage, beans, arrow roots & toast", []),
      it("Chapati Rolls", 250, "Chapati rolled with eggs and kachumbari", ["new"]),
    ] },
    { id: uid(), name: "Mains", note: "", items: [
      it("Nyama Choma", 900, "Charcoal-roasted goat with kachumbari & ugali", ["popular", "spicy"]),
      it("Pilau Beef", 420, "Spiced rice slow-cooked with tender beef", ["spicy"]),
      it("Ugali Sukuma Wiki", 280, "Maize meal with sautéed greens", ["veg", "vegan"]),
      { ...it("Tilapia Fry", 700, "Whole fried tilapia, ugali and greens", []), variants: [{ label: "Medium", price: 700 }, { label: "Large", price: 950 }] },
    ] },
    { id: uid(), name: "Snacks", note: "", items: [
      it("Samosa (2)", 120, "Crispy beef samosas with chilli sauce", ["spicy"]),
      it("Bhajia", 200, "Spiced potato fritters", ["veg"]),
      it("Chips Masala", 250, "Crispy chips tossed in tangy masala", ["veg", "popular"]),
    ] },
    { id: uid(), name: "Drinks", note: "", items: [
      it("Kenyan Coffee", 180, "Single-origin, brewed fresh", ["veg"]),
      it("Dawa Cocktail", 450, "Vodka, honey, lime & crushed ice", []),
      it("Fresh Passion Juice", 200, "Blended with no added sugar", ["veg", "vegan"]),
      { ...it("Soda", 80, "", []), variants: [{ label: "300ml", price: 80 }, { label: "500ml", price: 120 }] },
    ] },
  ];
  return m;
}

// "# Category" lines + "Item - price - description" lines  →  categories
export function parseMenuText(text) {
  const cats = []; let cur = null;
  String(text || "").split(/\r?\n/).forEach(raw => {
    const line = raw.trim(); if (!line) return;
    if (line.startsWith("#")) { cur = { id: uid(), name: line.replace(/^#+\s*/, ""), note: "", items: [] }; cats.push(cur); return; }
    if (!cur) { cur = { id: uid(), name: "Menu", note: "", items: [] }; cats.push(cur); }
    const parts = line.split(/\s*\|\s*|\s+[-–—]\s+/);
    let name = parts[0], price = "", desc = "";
    if (parts.length >= 2) { price = parts[1].replace(/[^\d.]/g, ""); desc = parts.slice(2).join(" - "); if (!price && parts[1]) { desc = parts.slice(1).join(" - "); } }
    else { const m = /^(.*?)[\s:]+(?:ksh\.?|kes)?\s*(\d[\d,.]*)$/i.exec(line); if (m) { name = m[1]; price = m[2].replace(/,/g, ""); } }
    cur.items.push({ ...it(name.trim(), price === "" ? "" : Number(price), desc.trim(), []) });
  });
  return cats.filter(c => c.items.length);
}

const TAGS = [
  { id: "veg", label: "Vegetarian", icon: "leaf" }, { id: "vegan", label: "Vegan", icon: "leaf" },
  { id: "spicy", label: "Spicy", icon: "flame" }, { id: "popular", label: "Popular", icon: "star" },
  { id: "new", label: "New", icon: "sparkle" }, { id: "halal", label: "Halal", icon: "check" },
];
const itemPrice = (item) => (item.variants?.length ? Math.min(...item.variants.map(v => Number(v.price) || 0)) : Number(item.price));
const hasPrice = (item) => item.variants?.length || (item.price !== "" && item.price != null && isFinite(Number(item.price)));

/* ------------------------------------------------------------ public view */
function Thumb({ src, t, w, h, r, label }) {
  if (src) return <img src={src} alt="" loading="lazy" style={{ width: w, height: h, objectFit: "cover", borderRadius: r, flex: "none", display: "block" }} />;
  return (
    <div aria-hidden="true" style={{ width: w, height: h, borderRadius: r, flex: "none", background: `${t.accent}22`, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: Math.min(22, h * 0.35) }}>
      {(label || "").trim().charAt(0).toUpperCase() || <Ic n="utensils" size={16} />}
    </div>
  );
}

export function MenuView({ data, design, title, tableNo, preview, onOrder, slug }) {
  const t = resolveTokens(design);
  useFonts([t.hFont, t.bFont]);
  const v = data.venue || {};
  const cur = v.currency || "KSh";
  const ord = data.ordering || {};
  const own = data.ownDesign || {};
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [cart, setCart] = useState({});
  const [detail, setDetail] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState({});
  const [tab, setTab] = useState("");
  const [sent, setSent] = useState(false);
  const [guest, setGuest] = useState({ name: "", table: tableNo || "", note: "" });
  const root = useRef(null);
  useEffect(() => { if (tableNo) setGuest(g => ({ ...g, table: tableNo })); }, [tableNo]);

  const cats = (data.categories || []).filter(c => (c.items || []).length);
  const activeTab = tab && cats.some(c => c.id === tab) ? tab : cats[0]?.id;
  const usedTags = TAGS.filter(tg => cats.some(c => c.items.some(i => (i.tags || []).includes(tg.id))));
  const match = (i) => (!q || (i.name + " " + (i.desc || "")).toLowerCase().includes(q.toLowerCase())) && (!tag || (i.tags || []).includes(tag));
  const visible = cats.map(c => ({ ...c, items: c.items.filter(match) })).filter(c => c.items.length);
  const shown = t.layout === "tabs" && !q && !tag ? visible.filter(c => c.id === activeTab) : visible;
  const orderOn = !!ord.enabled && (!!preview || !!(ord.whatsapp || v.whatsapp));

  const lines = Object.values(cart);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.unit, 0);
  const add = (item, variant, d = 1) => {
    const key = item.id + "|" + (variant?.label || "");
    setCart(c => {
      const cur0 = c[key]; const qty = (cur0?.qty || 0) + d;
      const n = { ...c };
      if (qty <= 0) delete n[key]; else n[key] = { key, item, variant, qty, unit: Number(variant ? variant.price : item.price) || 0 };
      return n;
    });
  };
  const qtyOf = (item) => Object.values(cart).filter(l => l.item.id === item.id).reduce((s, l) => s + l.qty, 0);
  const quickAdd = (item) => { if (item.variants?.length) setDetail(item); else add(item, null, 1); };

  const scrollTo = (id) => {
    if (t.layout === "tabs") { setTab(id); root.current?.scrollIntoView?.({ block: "start" }); return; }
    document.getElementById("mc-" + (slug || "x") + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const css = { background: t.bg, color: t.fg, fontFamily: fontStack(t.bFont), minHeight: "100%", fontSize: 14, lineHeight: 1.45, position: "relative" };
  const H = { fontFamily: fontStack(t.hFont), fontWeight: t.hFont === "Bebas Neue" ? 400 : 600, letterSpacing: t.hFont === "Bebas Neue" ? "0.04em" : "-0.01em", margin: 0 };

  /* ---- price + tags ---- */
  const Price = ({ item, style }) => {
    if (!hasPrice(item)) return null;
    const p = itemPrice(item);
    return <span style={{ fontWeight: 700, whiteSpace: "nowrap", ...style }}>{item.variants?.length ? "from " : ""}{money(p, cur)}</span>;
  };
  const Tags = ({ item }) => (
    <span style={{ display: "inline-flex", gap: 4, marginLeft: 6, verticalAlign: "middle" }}>
      {(item.tags || []).map(id => {
        const tg = TAGS.find(x => x.id === id); if (!tg) return null;
        const col = id === "spicy" ? "#E0431F" : id === "popular" || id === "new" ? t.accent : "#3E9A4D";
        return <span key={id} title={tg.label} style={{ color: col, display: "inline-flex" }}><Ic n={tg.icon} size={12} sw={2.2} /></span>;
      })}
    </span>
  );
  const AddBtn = ({ item, big }) => {
    if (!orderOn || item.soldOut) return null;
    const n = qtyOf(item);
    const s = big ? 34 : 28;
    if (n && !item.variants?.length) {
      return (
        <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 2, background: t.accent, color: t.accentFg, borderRadius: 999, padding: 2 }}>
          <button type="button" aria-label="Less" onClick={() => add(item, null, -1)} style={{ width: s - 4, height: s - 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="minus" size={14} /></button>
          <b style={{ minWidth: 16, textAlign: "center", fontSize: 13 }}>{n}</b>
          <button type="button" aria-label="More" onClick={() => add(item, null, 1)} style={{ width: s - 4, height: s - 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="plus" size={14} /></button>
        </span>
      );
    }
    return (
      <button type="button" aria-label={`Add ${item.name}`} onClick={e => { e.stopPropagation(); quickAdd(item); }}
        style={{ width: s, height: s, borderRadius: 999, background: t.accent, color: t.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Ic n="plus" size={16} sw={2.4} />
        {n > 0 && <span style={{ position: "absolute", top: -5, right: -5, background: t.fg, color: t.bg, borderRadius: 999, fontSize: 10, minWidth: 16, height: 16, lineHeight: "16px", textAlign: "center", fontWeight: 700 }}>{n}</span>}
      </button>
    );
  };
  const Sold = ({ item }) => item.soldOut ? <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: t.muted, border: `1px solid ${t.line}`, padding: "1px 6px", borderRadius: 4, marginLeft: 6 }}>Sold out</span> : null;
  const faded = (item) => ({ opacity: item.soldOut ? 0.5 : 1 });
  const clickable = { cursor: "pointer", textAlign: "left", width: "100%", display: "block", color: "inherit" };
  const showImg = t.images;

  /* ---- layouts: how one item looks ---- */
  const renderItem = (item, idx, cat) => {
    const open_ = () => setDetail(item);
    const desc = item.desc ? <div style={{ color: t.muted, fontSize: 12.5, marginTop: 2 }}>{item.desc}</div> : null;
    switch (t.layout) {
      case "cards":
      case "tabs":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), display: "flex", gap: 12, alignItems: "center", background: t.card, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 10, marginBottom: 10 }}>
            {showImg && (item.image || t.layout === "cards") && <Thumb src={item.image} t={t} w={64} h={64} r={Math.max(4, t.radius - 4)} label={item.name} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{item.name}<Tags item={item} /><Sold item={item} /></div>
              {desc}
              <div style={{ marginTop: 4, color: t.accent }}><Price item={item} /></div>
            </div>
            <AddBtn item={item} />
          </div>
        );
      case "grid":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), background: t.card, border: `1px solid ${t.line}`, borderRadius: t.radius, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {showImg && <Thumb src={item.image} t={t} w="100%" h={104} r={0} label={item.name} />}
            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}<Tags item={item} /></div>
              {item.desc && <div style={{ color: t.muted, fontSize: 11.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.desc}</div>}
              <div style={{ marginTop: "auto", paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Price item={item} style={{ color: t.accent, fontSize: 13 }} /><AddBtn item={item} />
              </div>
              {item.soldOut && <Sold item={item} />}
            </div>
          </div>
        );
      case "compact":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), display: "flex", gap: 8, alignItems: "baseline", padding: "7px 0", borderBottom: `1px solid ${t.line}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span><Tags item={item} /><Sold item={item} />
              {item.desc && <span style={{ color: t.muted, fontSize: 12 }}> · {item.desc}</span>}
            </div>
            <Price item={item} /><AddBtn item={item} />
          </div>
        );
      case "magazine":
        if (idx === 0 && showImg) {
          return (
            <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <Thumb src={item.image} t={t} w="100%" h={170} r={t.radius} label={item.name} />
                <span style={{ position: "absolute", top: 10, left: 10, background: t.accent, color: t.accentFg, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, letterSpacing: ".06em", textTransform: "uppercase" }}>Featured</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...H, fontSize: 19 }}>{item.name}<Tags item={item} /></div>
                  {desc}
                </div>
                <div style={{ textAlign: "right" }}><Price item={item} style={{ color: t.accent, fontSize: 15 }} /><div style={{ marginTop: 6 }}><AddBtn item={item} /></div></div>
              </div>
            </div>
          );
        }
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.line}` }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{item.name}<Tags item={item} /><Sold item={item} /></div>{desc}</div>
            <Price item={item} style={{ color: t.accent }} /><AddBtn item={item} />
          </div>
        );
      case "centered":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), textAlign: "center", padding: "10px 6px" }}>
            <div style={{ ...H, fontSize: 16, textTransform: "uppercase", letterSpacing: ".08em" }}>{item.name}<Tags item={item} /><Sold item={item} /></div>
            {item.desc && <div style={{ color: t.muted, fontSize: 12.5, fontStyle: "italic", margin: "3px auto 0", maxWidth: 320 }}>{item.desc}</div>}
            <div style={{ marginTop: 4, color: t.accent, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Price item={item} /><AddBtn item={item} /></div>
          </div>
        );
      case "boxed":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderTop: idx ? `1px solid ${t.line}` : "none" }}>
            {showImg && item.image && <Thumb src={item.image} t={t} w={46} h={46} r={Math.max(2, t.radius - 4)} label={item.name} />}
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{item.name}<Tags item={item} /><Sold item={item} /></div>{desc}</div>
            <Price item={item} /><AddBtn item={item} />
          </div>
        );
      case "stack":
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `2px solid ${t.line}` }}>
            {showImg && item.image && <Thumb src={item.image} t={t} w={56} h={56} r={t.radius} label={item.name} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...H, fontSize: 21, textTransform: "uppercase", lineHeight: 1.1 }}>{item.name}<Tags item={item} /><Sold item={item} /></div>
              {desc}
            </div>
            {hasPrice(item) && <span style={{ background: t.accent, color: t.accentFg, fontWeight: 700, borderRadius: 999, padding: "4px 11px", fontSize: 13, whiteSpace: "nowrap" }}>{item.variants?.length ? "from " : ""}{money(itemPrice(item), cur)}</span>}
            <AddBtn item={item} />
          </div>
        );
      default: // list (also used by accordion)
        return (
          <div key={item.id} onClick={open_} style={{ ...clickable, ...faded(item), padding: "9px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{item.name}<Tags item={item} /><Sold item={item} /></span>
              <span style={{ flex: 1, borderBottom: `1.5px dotted ${t.line}`, transform: "translateY(-3px)", minWidth: 10 }} />
              <Price item={item} style={{ color: t.accent }} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>{desc}</div><AddBtn item={item} />
            </div>
          </div>
        );
    }
  };

  const renderCat = (c) => {
    const isAcc = t.layout === "accordion";
    const isOpen = open[c.id] !== false; // open by default
    const title = (
      <div style={{ padding: isAcc ? "12px 0" : "0 0 4px" }}>
        <h2 style={{ ...H, fontSize: t.layout === "stack" ? 30 : t.layout === "centered" ? 22 : 19, textAlign: t.layout === "centered" ? "center" : "left", textTransform: t.layout === "centered" ? "uppercase" : "none", letterSpacing: t.layout === "centered" ? ".14em" : undefined, color: t.layout === "stack" ? t.accent : t.fg }}>{c.name}</h2>
        {c.note && <p style={{ color: t.muted, fontSize: 12, textAlign: t.layout === "centered" ? "center" : "left", marginTop: 2 }}>{c.note}</p>}
        {t.layout === "centered" && <div style={{ textAlign: "center", color: t.accent, margin: "6px 0 0", letterSpacing: ".5em" }}>✦</div>}
      </div>
    );
    const itemsEl = t.layout === "grid" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 8 }}>{c.items.map((i, k) => renderItem(i, k, c))}</div>
    ) : t.layout === "boxed" ? (
      <div style={{ border: `1.5px solid ${t.line}`, borderRadius: t.radius, background: t.card, marginTop: 8, overflow: "hidden" }}>{c.items.map((i, k) => renderItem(i, k, c))}</div>
    ) : (
      <div style={{ marginTop: 4 }}>{c.items.map((i, k) => renderItem(i, k, c))}</div>
    );
    return (
      <section key={c.id} id={"mc-" + (slug || "x") + c.id} style={{ padding: "16px 16px 6px", scrollMarginTop: 52 }}>
        {isAcc ? (
          <>
            <button type="button" onClick={() => setOpen(o => ({ ...o, [c.id]: !isOpen }))} style={{ ...clickable, display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${t.line}` }}>
              <div style={{ flex: 1 }}>{title}</div>
              <span style={{ color: t.accent, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", display: "flex" }}><Ic n="chevD" /></span>
            </button>
            {isOpen && itemsEl}
          </>
        ) : (<>{title}{itemsEl}</>)}
      </section>
    );
  };

  /* ---- header ---- */
  const links = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: t.header === "center" ? "center" : "flex-start", marginTop: 10 }}>
      {v.phone && <a href={`tel:${v.phone.replace(/\s/g, "")}`} style={linkBtn(t)}><Ic n="phone" size={13} /> Call</a>}
      {v.whatsapp && <a href={`https://wa.me/${waNumber(v.whatsapp)}`} target="_blank" rel="noreferrer" style={linkBtn(t)}><Ic n="chat" size={13} /> WhatsApp</a>}
      {v.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`} target="_blank" rel="noreferrer" style={linkBtn(t)}><Ic n="pin" size={13} /> Directions</a>}
      {v.instagram && <a href={`https://instagram.com/${v.instagram.replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, "")}`} target="_blank" rel="noreferrer" style={linkBtn(t)}><Ic n="image" size={13} /> Instagram</a>}
      {safeUrl(v.website) && <a href={safeUrl(v.website)} target="_blank" rel="noreferrer" style={linkBtn(t)}><Ic n="globe" size={13} /> Website</a>}
    </div>
  );
  const logo = v.logo ? <img src={v.logo} alt="" style={{ width: 64, height: 64, borderRadius: Math.min(t.radius + 6, 32), objectFit: "cover", border: `2px solid ${t.bg}` }} /> : null;
  const info = (
    <>
      <h1 style={{ ...H, fontSize: 26, lineHeight: 1.15 }}>{v.name || title || "Your venue"}</h1>
      {v.tagline && <p style={{ color: t.muted, marginTop: 3 }}>{v.tagline}</p>}
      {v.hours && <p style={{ color: t.muted, fontSize: 12, marginTop: 6, display: "flex", gap: 5, alignItems: "center", justifyContent: t.header === "center" ? "center" : "flex-start" }}><Ic n="clock" size={12} />{v.hours}</p>}
      {links}
    </>
  );
  const header = t.header === "banner" ? (
    <header>
      <div style={{ height: 130, background: v.cover ? `url(${v.cover}) center/cover` : `linear-gradient(135deg, ${t.accent}, ${t.accent}88)` }} />
      <div style={{ padding: "0 16px 6px", marginTop: -32 }}>{logo}<div style={{ marginTop: logo ? 8 : 40 }}>{info}</div></div>
    </header>
  ) : t.header === "center" ? (
    <header style={{ padding: "26px 16px 6px", textAlign: "center" }}>{logo && <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{logo}</div>}{info}</header>
  ) : t.header === "split" ? (
    <header style={{ padding: "22px 16px 6px", display: "flex", gap: 12, alignItems: "flex-start", borderBottom: `3px solid ${t.accent}`, marginBottom: 2 }}>{logo}<div style={{ flex: 1 }}>{info}</div></header>
  ) : t.header === "minimal" ? (
    <header style={{ padding: "18px 16px 4px" }}>
      <h1 style={{ ...H, fontSize: 20 }}>{v.name || title || "Your venue"}</h1>
      {(v.tagline || v.hours) && <p style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{[v.tagline, v.hours].filter(Boolean).join(" · ")}</p>}
      {links}
    </header>
  ) : (
    <header style={{ padding: "22px 16px 6px", display: "flex", gap: 12, alignItems: "flex-start" }}><div style={{ flex: 1 }}>{info}</div>{logo}</header>
  );

  /* ---- nav ---- */
  const navBtn = (c) => {
    const on = (t.layout === "tabs" ? activeTab : "") === c.id;
    const base = { padding: "6px 12px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: on ? t.accentFg : t.muted };
    if (t.nav === "pills") return { ...base, borderRadius: 999, background: on ? t.accent : "transparent", color: on ? t.accentFg : t.fg };
    if (t.nav === "chips") return { ...base, borderRadius: t.radius, border: `1.5px solid ${on ? t.accent : t.line}`, color: on ? t.accent : t.fg, background: on ? `${t.accent}18` : "transparent" };
    if (t.nav === "underline") return { ...base, borderBottom: `2px solid ${on ? t.accent : "transparent"}`, color: on ? t.fg : t.muted, borderRadius: 0 };
    return { ...base, textTransform: "uppercase", letterSpacing: ".1em", fontSize: 11.5, color: on ? t.accent : t.muted };
  };
  const nav = t.nav !== "none" && cats.length > 1 && (
    <nav style={{ position: "sticky", top: 0, zIndex: 5, background: t.bg, borderBottom: `1px solid ${t.line}`, display: "flex", gap: 4, overflowX: "auto", padding: "8px 12px", scrollbarWidth: "none" }}>
      {cats.map(c => <button key={c.id} type="button" onClick={() => scrollTo(c.id)} style={navBtn(c)}>{c.name}</button>)}
    </nav>
  );

  /* ---- own uploaded design ---- */
  const ownBlock = own.enabled && ((own.images || []).length > 0 || own.pdf) && (
    <div style={{ padding: 12 }}>
      {(own.images || []).map((src, i) => <img key={i} src={src} alt={`Menu page ${i + 1}`} onClick={() => setDetail({ zoom: src })} style={{ width: "100%", display: "block", borderRadius: t.radius, marginBottom: 10, cursor: "zoom-in" }} />)}
      {own.pdf && <a href={safeUrl(own.pdf)} target="_blank" rel="noreferrer" style={{ ...linkBtn(t), justifyContent: "center", padding: 12 }}><Ic n="file" size={15} /> Open the full menu (PDF)</a>}
    </div>
  );
  const useOwn = own.enabled && ((own.images || []).length > 0 || own.pdf);

  /* ---- order sheet ---- */
  const sendOrder = () => {
    const num = waNumber(ord.whatsapp || v.whatsapp);
    const msg = [
      `*New order — ${v.name || title || "Menu"}*`,
      guest.table ? `Table: ${guest.table}` : "", guest.name ? `Name: ${guest.name}` : "", "",
      ...lines.map(l => `${l.qty} x ${l.item.name}${l.variant ? ` (${l.variant.label})` : ""} — ${money(l.qty * l.unit, cur)}`),
      "", `*Total: ${money(total, cur)}*`, guest.note ? `Note: ${guest.note}` : "",
    ].filter((x, i, a) => x !== "" || (a[i - 1] !== "" && i)).join("\n");
    onOrder && onOrder({ kind: "order", name: guest.name, message: msg, fields: { table: guest.table, total: String(total), items: lines.map(l => `${l.qty}x ${l.item.name}${l.variant ? ` (${l.variant.label})` : ""}`).join("; ") } });
    if (!preview) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true); setCart({}); setSheet(false);
  };

  return (
    <div ref={root} style={css}>
      {header}
      {!useOwn && (
        <div style={{ padding: "8px 16px 0", display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: 9, color: t.muted, display: "flex" }}><Ic n="search" size={15} /></span>
            <input aria-label="Search the menu" value={q} onChange={e => setQ(e.target.value)} placeholder="Search the menu"
              style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 999, border: `1.5px solid ${t.line}`, background: t.card, color: t.fg, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          </div>
        </div>
      )}
      {!useOwn && usedTags.length > 0 && (
        <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {usedTags.map(tg => (
            <button key={tg.id} type="button" onClick={() => setTag(tag === tg.id ? "" : tg.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", border: `1.5px solid ${tag === tg.id ? t.accent : t.line}`, color: tag === tg.id ? t.accent : t.muted, background: tag === tg.id ? `${t.accent}18` : "transparent" }}>
              <Ic n={tg.icon} size={11} /> {tg.label}
            </button>
          ))}
        </div>
      )}
      {!useOwn && <div style={{ marginTop: 8 }}>{nav}</div>}
      {sent && <div style={{ margin: "10px 16px 0", padding: "9px 12px", borderRadius: 10, background: `${t.accent}22`, fontSize: 12.5 }}>Your order was sent to the restaurant — they'll confirm on WhatsApp.</div>}

      {useOwn ? ownBlock : cats.length === 0 ? (
        <p style={{ padding: 30, textAlign: "center", color: t.muted }}>The menu is empty. Add some items to see them here.</p>
      ) : shown.length === 0 ? (
        <p style={{ padding: 30, textAlign: "center", color: t.muted }}>Nothing matches your search.</p>
      ) : shown.map(renderCat)}

      {(v.about || v.address || v.pay) && (
        <footer style={{ margin: "22px 16px 0", padding: "14px 0", borderTop: `1px solid ${t.line}`, color: t.muted, fontSize: 12, textAlign: t.layout === "centered" ? "center" : "left" }}>
          {v.about && <p style={{ marginBottom: 6 }}>{v.about}</p>}
          {v.address && <p><b>Find us:</b> {v.address}</p>}
          {v.pay && <p><b>Pay:</b> {v.pay}</p>}
        </footer>
      )}
      <p style={{ textAlign: "center", fontSize: 11, color: t.muted, padding: "10px 0 " + (count ? 80 : 18) + "px", opacity: 0.8 }}>Menu by CardNova</p>

      {orderOn && count > 0 && (
        <div style={{ position: "sticky", bottom: 0, padding: 12, zIndex: 6 }}>
          <button type="button" onClick={() => setSheet(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: t.accent, color: t.accentFg, padding: "12px 16px", borderRadius: Math.max(t.radius, 12), boxShadow: "0 6px 20px rgba(0,0,0,.25)", fontWeight: 700 }}>
            <Ic n="cart" size={18} /> <span style={{ flex: 1, textAlign: "left" }}>View order · {count} item{count > 1 ? "s" : ""}</span><span>{money(total, cur)}</span>
          </button>
        </div>
      )}

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: preview ? "absolute" : "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {detail.zoom ? <img src={detail.zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", margin: "auto" }} /> : (
            <DetailSheet item={detail} t={t} cur={cur} orderOn={orderOn} H={H} showImg={showImg}
              onAdd={(variant, qty) => { add(detail, variant, qty); setDetail(null); }} onClose={() => setDetail(null)} />
          )}
        </div>
      )}

      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: preview ? "absolute" : "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.bg, color: t.fg, width: "100%", maxWidth: 520, maxHeight: "92%", overflow: "auto", borderRadius: "18px 18px 0 0", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}><h3 style={{ ...H, fontSize: 19, flex: 1 }}>Your order</h3><button type="button" aria-label="Close" onClick={() => setSheet(false)}><Ic n="x" /></button></div>
            {lines.map(l => (
              <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${t.line}` }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{l.item.name}</div>{l.variant && <div style={{ color: t.muted, fontSize: 12 }}>{l.variant.label}</div>}</div>
                <button type="button" aria-label="Less" onClick={() => add(l.item, l.variant, -1)} style={{ width: 26, height: 26, borderRadius: 999, border: `1.5px solid ${t.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="minus" size={13} /></button>
                <b>{l.qty}</b>
                <button type="button" aria-label="More" onClick={() => add(l.item, l.variant, 1)} style={{ width: 26, height: 26, borderRadius: 999, border: `1.5px solid ${t.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="plus" size={13} /></button>
                <span style={{ width: 78, textAlign: "right", fontWeight: 600 }}>{money(l.qty * l.unit, cur)}</span>
              </div>
            ))}
            <div style={{ display: "flex", padding: "10px 0", fontWeight: 700, fontSize: 16 }}><span style={{ flex: 1 }}>Total</span><span>{money(total, cur)}</span></div>
            {ord.askTable !== false && <OrderInput t={t} label="Table number" value={guest.table} onChange={x => setGuest(g => ({ ...g, table: x }))} />}
            {ord.askName !== false && <OrderInput t={t} label="Your name" value={guest.name} onChange={x => setGuest(g => ({ ...g, name: x }))} />}
            <OrderInput t={t} label="Notes for the kitchen (optional)" value={guest.note} onChange={x => setGuest(g => ({ ...g, note: x }))} />
            {ord.note && <p style={{ color: t.muted, fontSize: 12, marginBottom: 8 }}>{ord.note}</p>}
            {v.pay && <p style={{ fontSize: 12.5, marginBottom: 8 }}><b>Pay:</b> {v.pay}</p>}
            <button type="button" onClick={sendOrder} style={{ width: "100%", padding: 13, borderRadius: Math.max(t.radius, 10), background: "#25D366", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ic n="chat" size={18} /> Send order on WhatsApp
            </button>
            <p style={{ color: t.muted, fontSize: 11.5, textAlign: "center", marginTop: 6 }}>{preview ? "(Preview — nothing is sent from here)" : "WhatsApp opens with your order ready to send."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const linkBtn = (t) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, border: `1.5px solid ${t.line}`, fontSize: 12, fontWeight: 600, color: t.fg, textDecoration: "none", background: t.card });

function OrderInput({ t, label, value, onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <span style={{ display: "block", fontSize: 11.5, color: t.muted, fontWeight: 600, marginBottom: 3 }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${t.line}`, background: t.card, color: t.fg, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
    </label>
  );
}

function DetailSheet({ item, t, cur, orderOn, H, showImg, onAdd, onClose }) {
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  const variant = item.variants?.length ? item.variants[vi] : null;
  const unit = Number(variant ? variant.price : item.price) || 0;
  return (
    <div onClick={e => e.stopPropagation()} style={{ background: t.bg, color: t.fg, width: "100%", maxWidth: 520, maxHeight: "92%", overflow: "auto", borderRadius: "18px 18px 0 0" }}>
      {showImg && item.image && <img src={item.image} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <h3 style={{ ...H, fontSize: 21, flex: 1 }}>{item.name}</h3>
          <button type="button" aria-label="Close" onClick={onClose}><Ic n="x" /></button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
          {(item.tags || []).map(id => { const tg = TAGS.find(x => x.id === id); return tg ? <span key={id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `${t.accent}1f`, color: t.accent, fontWeight: 600 }}>{tg.label}</span> : null; })}
        </div>
        {item.desc && <p style={{ color: t.muted, margin: "6px 0 10px" }}>{item.desc}</p>}
        {item.variants?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {item.variants.map((vr, i) => (
              <button key={i} type="button" onClick={() => setVi(i)} style={{ padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1.5px solid ${i === vi ? t.accent : t.line}`, background: i === vi ? `${t.accent}18` : "transparent" }}>
                {vr.label} · {money(vr.price, cur)}
              </button>
            ))}
          </div>
        )}
        {!item.variants?.length && hasPrice(item) && <p style={{ fontWeight: 700, fontSize: 18, color: t.accent, marginBottom: 10 }}>{money(item.price, cur)}</p>}
        {item.soldOut ? <p style={{ color: t.muted }}>This item is sold out right now.</p> : orderOn && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: `1.5px solid ${t.line}`, borderRadius: 999, padding: "4px 8px" }}>
              <button type="button" aria-label="Less" onClick={() => setQty(q => Math.max(1, q - 1))}><Ic n="minus" size={16} /></button><b>{qty}</b>
              <button type="button" aria-label="More" onClick={() => setQty(q => q + 1)}><Ic n="plus" size={16} /></button>
            </div>
            <button type="button" onClick={() => onAdd(variant, qty)} style={{ flex: 1, padding: 12, borderRadius: 12, background: t.accent, color: t.accentFg, fontWeight: 700 }}>
              Add to order{unit ? ` · ${money(unit * qty, cur)}` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- phone frame */
export function PhoneFrame({ children }) {
  return <div className="sx-phone"><div className="sx-phone-in" style={{ position: "relative" }}>{children}</div></div>;
}

/* ----------------------------------------------------- template thumbnails */
export function TemplateThumb({ tpl, name }) {
  const t = tpl;
  const bar = (w, c = t.fg, o = 0.85, h = 5) => <div style={{ width: w, height: h, borderRadius: 3, background: c, opacity: o }} />;
  const row = (k) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
      {["cards", "tabs"].includes(t.layout) && <div style={{ width: 14, height: 14, borderRadius: 3, background: t.accent, opacity: 0.35 }} />}
      <div style={{ flex: 1 }}>{bar(k % 2 ? "60%" : "75%")}{t.layout !== "compact" && <div style={{ marginTop: 3 }}>{bar("90%", t.muted, 0.6, 3)}</div>}</div>
      {bar(14, t.accent, 1, 5)}
    </div>
  );
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 10, padding: 8, height: 118, overflow: "hidden", position: "relative" }} aria-label={name}>
      {t.header === "banner" && <div style={{ height: 22, margin: "-8px -8px 6px", background: t.accent, opacity: 0.8 }} />}
      <div style={{ textAlign: t.header === "center" || t.layout === "centered" ? "center" : "left", display: "flex", flexDirection: "column", alignItems: t.header === "center" || t.layout === "centered" ? "center" : "flex-start", gap: 3 }}>
        <div style={{ fontFamily: fontStack(t.hFont), fontSize: 11, fontWeight: 700, color: t.fg, lineHeight: 1 }}>{name}</div>
        {t.nav !== "none" && <div style={{ display: "flex", gap: 3, marginTop: 2 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 16, height: 6, borderRadius: t.nav === "pills" ? 9 : 2, background: i === 0 && t.nav !== "text" ? t.accent : "transparent", border: t.nav === "chips" ? `1px solid ${t.accent}` : "none", borderBottom: t.nav === "underline" ? `2px solid ${i ? "transparent" : t.accent}` : undefined, opacity: i ? 0.5 : 1 }} />)}</div>}
      </div>
      {t.layout === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 7 }}>{[0, 1].map(i => <div key={i} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 5, height: 36, overflow: "hidden" }}><div style={{ height: 18, background: t.accent, opacity: 0.3 }} />{bar("70%", t.fg, 0.8, 3)}</div>)}</div>
      ) : t.layout === "boxed" ? (
        <div style={{ border: `1px solid ${t.line}`, borderRadius: 5, background: t.card, padding: "0 5px 5px", marginTop: 6 }}>{[0, 1, 2].map(row)}</div>
      ) : t.layout === "stack" ? (
        <div style={{ marginTop: 6 }}>{[0, 1].map(i => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: `2px solid ${t.line}`, padding: "4px 0" }}><div style={{ flex: 1, height: 8, background: t.fg, borderRadius: 2, opacity: 0.85 }} /><div style={{ width: 20, height: 9, borderRadius: 9, background: t.accent }} /></div>)}</div>
      ) : t.layout === "accordion" ? (
        <div style={{ marginTop: 6 }}>{[0, 1, 2].map(i => <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${t.line}`, padding: "5px 0" }}><div style={{ flex: 1 }}>{bar("50%")}</div><div style={{ color: t.accent, fontSize: 8 }}>⌄</div></div>)}</div>
      ) : t.layout === "magazine" ? (
        <div style={{ marginTop: 6 }}><div style={{ height: 28, background: t.accent, opacity: 0.3, borderRadius: 5 }} />{[0, 1].map(row)}</div>
      ) : (
        <div style={{ marginTop: 3 }}>{[0, 1, 2].map(row)}</div>
      )}
    </div>
  );
}

/* =========================================================================
   EDITOR PIECES
   ========================================================================= */
export function VenueTab({ data, set, token }) {
  const v = data.venue;
  const up = (patch) => set({ ...data, venue: { ...v, ...patch } });
  const tx = (k, label, ph, hint) => <Fld label={label} hint={hint}><input value={v[k] || ""} placeholder={ph} onChange={e => up({ [k]: e.target.value })} /></Fld>;
  return (
    <div>
      <div className="sx-two">
        {tx("name", "Restaurant / café name", "e.g. Mama Njeri's Kitchen")}
        {tx("tagline", "Tagline (optional)", "Fresh, local & made with love")}
      </div>
      <div className="sx-two">
        <Fld label="Logo"><ImgUpload value={v.logo} onChange={x => up({ logo: x })} token={token} label="Upload logo" /></Fld>
        <Fld label="Cover photo" hint="Used by templates with a cover header"><ImgUpload value={v.cover} onChange={x => up({ cover: x })} token={token} label="Upload cover" /></Fld>
      </div>
      <Fld label="About (optional)"><textarea rows={2} value={v.about || ""} onChange={e => up({ about: e.target.value })} placeholder="A sentence or two about your place" /></Fld>
      <div className="sx-two">
        {tx("phone", "Phone", "0712 345 678")}
        {tx("whatsapp", "WhatsApp number", "0712 345 678", "Orders and the WhatsApp button use this")}
        {tx("address", "Address / area", "Moi Avenue, Nairobi", "Adds a Directions button")}
        {tx("hours", "Opening hours", "Mon–Sat 7am – 10pm")}
        {tx("instagram", "Instagram username", "mamanjerikitchen")}
        {tx("website", "Website", "www.example.co.ke")}
      </div>
      <Fld label="How customers pay (optional)" hint="Shown at checkout, e.g. “M-Pesa Till 123456” or “Pay at the counter”"><input value={v.pay || ""} onChange={e => up({ pay: e.target.value })} placeholder="M-Pesa Till 123456" /></Fld>
      <Fld label="Currency symbol"><input value={v.currency || "KSh"} onChange={e => up({ currency: e.target.value.slice(0, 5) })} style={{ maxWidth: 110 }} /></Fld>
    </div>
  );
}

export function MenuItemsTab({ data, set, token }) {
  const [openItem, setOpenItem] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [text, setText] = useState("");
  const cats = data.categories;
  const setCats = (c) => set({ ...data, categories: c });
  const patchCat = (id, p) => setCats(cats.map(c => c.id === id ? { ...c, ...p } : c));
  const patchItem = (cid, iid, p) => setCats(cats.map(c => c.id === cid ? { ...c, items: c.items.map(i => i.id === iid ? { ...i, ...p } : i) } : c));
  const move = (arr, i, d) => { const n = [...arr]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; };

  const importText = () => {
    const parsed = parseMenuText(text);
    if (!parsed.length) return;
    setCats([...cats, ...parsed]); setText(""); setBulk(false);
  };

  return (
    <div>
      {cats.length === 0 && (
        <Note>New here? Press <b>Load sample menu</b> to see how it works (sample dishes only — your venue details stay yours; edit or delete them any time), or <b>Paste a list</b> to type your whole menu in one go.</Note>
      )}
      <div className="sx-row sx-wrap" style={{ marginBottom: 12 }}>
        <Btn icon="plus" onClick={() => setCats([...cats, { id: uid(), name: "New category", note: "", items: [] }])}>Add category</Btn>
        <Btn kind="soft" icon="list" onClick={() => setBulk(!bulk)}>Paste a list</Btn>
        <Btn kind="soft" icon="sparkle" onClick={() => { if (!cats.length || window.confirm("Replace your current categories with the sample menu?")) setCats(sampleMenu().categories); }}>Load sample menu</Btn>
      </div>
      {bulk && (
        <div className="sx-card" style={{ marginBottom: 12 }}>
          <p className="sx-mut" style={{ marginBottom: 6 }}>One item per line: <b>Name - price - description</b>. Start a category with <b>#</b>.</p>
          <textarea rows={7} value={text} onChange={e => setText(e.target.value)} placeholder={"# Starters\nSamosa - 120 - Crispy beef samosa\nBhajia - 200\n# Drinks\nMasala Chai - 100 - Spiced tea"} />
          <div className="sx-row" style={{ marginTop: 8 }}><Btn onClick={importText} disabled={!text.trim()}>Add to my menu</Btn><Btn kind="soft" onClick={() => setBulk(false)}>Cancel</Btn></div>
        </div>
      )}

      {cats.map((c, ci) => (
        <div key={c.id} className="sx-card" style={{ marginBottom: 12 }}>
          <div className="sx-row" style={{ marginBottom: 8 }}>
            <input aria-label="Category name" value={c.name} onChange={e => patchCat(c.id, { name: e.target.value })} style={{ fontWeight: 700 }} />
            <button type="button" aria-label="Move category up" onClick={() => setCats(move(cats, ci, -1))}><Ic n="up" size={16} /></button>
            <button type="button" aria-label="Move category down" onClick={() => setCats(move(cats, ci, 1))}><Ic n="down" size={16} /></button>
            <button type="button" aria-label="Delete category" onClick={() => { if (window.confirm(`Delete “${c.name}” and its ${c.items.length} items?`)) setCats(cats.filter(x => x.id !== c.id)); }}><Ic n="trash" size={16} color={K.warn} /></button>
          </div>
          <input aria-label="Category note" value={c.note || ""} onChange={e => patchCat(c.id, { note: e.target.value })} placeholder="Short note, e.g. “Served until 11am” (optional)" style={{ marginBottom: 8, fontSize: 12.5 }} />

          {c.items.map((i, ii) => {
            const isOpen = openItem === i.id;
            return (
              <div key={i.id} style={{ borderTop: `1px solid ${K.line}`, padding: "8px 0" }}>
                <div className="sx-row">
                  <button type="button" className="sx-grow" style={{ textAlign: "left" }} onClick={() => setOpenItem(isOpen ? null : i.id)}>
                    <span style={{ fontWeight: 600 }}>{i.name || "Untitled item"}</span>{" "}
                    <span className="sx-mut">{i.variants?.length ? `${i.variants.length} sizes` : i.price !== "" ? money(i.price, data.venue.currency) : "no price"}{i.soldOut ? " · sold out" : ""}</span>
                  </button>
                  <button type="button" aria-label="Move up" onClick={() => patchCat(c.id, { items: move(c.items, ii, -1) })}><Ic n="up" size={15} /></button>
                  <button type="button" aria-label="Move down" onClick={() => patchCat(c.id, { items: move(c.items, ii, 1) })}><Ic n="down" size={15} /></button>
                  <button type="button" aria-label="Edit item" onClick={() => setOpenItem(isOpen ? null : i.id)}><Ic n={isOpen ? "chevU" : "edit"} size={15} /></button>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 8, background: K.fog, borderRadius: 10, padding: 10 }}>
                    <div className="sx-two">
                      <Fld label="Name"><input value={i.name} onChange={e => patchItem(c.id, i.id, { name: e.target.value })} /></Fld>
                      <Fld label="Price"><input inputMode="decimal" value={i.price} onChange={e => patchItem(c.id, i.id, { price: e.target.value === "" ? "" : e.target.value.replace(/[^\d.]/g, "") })} placeholder="e.g. 350" /></Fld>
                    </div>
                    <Fld label="Description"><textarea rows={2} value={i.desc || ""} onChange={e => patchItem(c.id, i.id, { desc: e.target.value })} /></Fld>
                    <Fld label="Photo (optional)"><ImgUpload value={i.image} onChange={x => patchItem(c.id, i.id, { image: x })} token={token} label="Add photo" /></Fld>
                    <Fld label="Labels"><Chips multi value={i.tags} onChange={x => patchItem(c.id, i.id, { tags: x })} options={TAGS.map(t => ({ id: t.id, label: t.label }))} /></Fld>
                    <Fld label="Sizes / options (optional)" hint="If you add sizes, the price above is ignored and the customer picks one.">
                      {(i.variants || []).map((vr, vi) => (
                        <div key={vi} className="sx-row" style={{ marginBottom: 6 }}>
                          <input placeholder="e.g. Large" value={vr.label} onChange={e => patchItem(c.id, i.id, { variants: i.variants.map((x, k) => k === vi ? { ...x, label: e.target.value } : x) })} />
                          <input placeholder="Price" inputMode="decimal" style={{ maxWidth: 100 }} value={vr.price} onChange={e => patchItem(c.id, i.id, { variants: i.variants.map((x, k) => k === vi ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x) })} />
                          <button type="button" aria-label="Remove size" onClick={() => patchItem(c.id, i.id, { variants: i.variants.filter((_, k) => k !== vi) })}><Ic n="x" size={15} /></button>
                        </div>
                      ))}
                      <Btn kind="soft" size="sm" icon="plus" onClick={() => patchItem(c.id, i.id, { variants: [...(i.variants || []), { label: "", price: "" }] })}>Add size</Btn>
                    </Fld>
                    <Toggle checked={i.soldOut} onChange={x => patchItem(c.id, i.id, { soldOut: x })} label="Sold out right now (shown greyed-out)" />
                    <div className="sx-row sx-wrap">
                      <Btn kind="soft" size="sm" icon="copy" onClick={() => patchCat(c.id, { items: [...c.items.slice(0, ii + 1), { ...i, id: uid(), name: i.name + " (copy)" }, ...c.items.slice(ii + 1)] })}>Duplicate</Btn>
                      <Btn kind="danger" size="sm" icon="trash" onClick={() => patchCat(c.id, { items: c.items.filter(x => x.id !== i.id) })}>Delete item</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Btn kind="soft" size="sm" icon="plus" onClick={() => { const n = { id: uid(), name: "", price: "", desc: "", image: "", tags: [], soldOut: false, variants: [] }; patchCat(c.id, { items: [...c.items, n] }); setOpenItem(n.id); }}>Add item</Btn>
        </div>
      ))}
    </div>
  );
}

export function OrderingTab({ data, set }) {
  const o = data.ordering;
  const up = (p) => set({ ...data, ordering: { ...o, ...p } });
  return (
    <div>
      <Note kind="ok">Customers add dishes to a basket and tap <b>Send order on WhatsApp</b>. You get a ready-made message with the table number, items and total. No extra apps or fees.</Note>
      <Toggle checked={o.enabled} onChange={x => up({ enabled: x })} label="Let customers build an order" />
      {o.enabled && (
        <>
          <Fld label="WhatsApp number that receives orders" hint="Leave blank to use the WhatsApp number from the Venue tab."><input value={o.whatsapp || ""} onChange={e => up({ whatsapp: e.target.value })} placeholder={data.venue.whatsapp || "0712 345 678"} /></Fld>
          <Toggle checked={o.askTable !== false} onChange={x => up({ askTable: x })} label="Ask for a table number" />
          <Toggle checked={o.askName !== false} onChange={x => up({ askName: x })} label="Ask for the customer's name" />
          <Fld label="Message shown at checkout (optional)"><input value={o.note || ""} onChange={e => up({ note: e.target.value })} placeholder="e.g. Please pay at the counter after eating." /></Fld>
        </>
      )}
      {!o.enabled && <p className="sx-mut">Ordering is off — the menu is view-only.</p>}
      {o.enabled && !(o.whatsapp || data.venue.whatsapp || "").trim() && <Note>Add a WhatsApp number (above, or on the Venue tab) — until then customers can't send orders and the basket stays hidden on your live menu.</Note>}
    </div>
  );
}

/* ---- Look tab: template gallery, custom designer, own upload ---- */
const FILTERS = [
  { id: "all", label: "All 50" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" },
  { id: "photos", label: "With photos" }, { id: "text", label: "Text only" },
];
const PHOTO_LAYOUTS = new Set(["cards", "grid", "magazine", "stack"]);
const PAGE = 6;

export function LookTab({ data, setData, design, setDesign, token }) {
  const ownOn = !!data.ownDesign?.enabled;
  const [mode, setMode] = useState(ownOn ? "own" : design.useCustom ? "custom" : "gallery");
  const leaveOwn = () => { if (ownOn) setData({ ...data, ownDesign: { ...data.ownDesign, enabled: false } }); };
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const list = TEMPLATES.filter(t => filter === "all" || (filter === "light" && t.mode === "light") || (filter === "dark" && t.mode === "dark") || (filter === "photos" && PHOTO_LAYOUTS.has(t.layout)) || (filter === "text" && !PHOTO_LAYOUTS.has(t.layout)));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const cur = TEMPLATES.find(t => t.id === design.tpl) || TEMPLATES[0];
  useFonts(list.slice(pg * PAGE, pg * PAGE + PAGE).flatMap(t => [t.hFont]));

  const pick = (id) => { leaveOwn(); setDesign({ ...design, tpl: id, useCustom: false }); };
  const startCustom = () => { leaveOwn(); setDesign({ ...design, useCustom: true, custom: design.custom && Object.keys(design.custom).length ? design.custom : { ...cur } }); setMode("custom"); };

  return (
    <div>
      <div className="sx-tabs" style={{ marginBottom: 12 }}>
        <button type="button" className={`sx-tab ${mode === "gallery" ? "on" : ""}`} onClick={() => { setMode("gallery"); leaveOwn(); setDesign({ ...design, useCustom: false }); }}><Ic n="grid" size={14} /> 50 templates</button>
        <button type="button" className={`sx-tab ${mode === "custom" ? "on" : ""}`} onClick={startCustom}><Ic n="palette" size={14} /> Design my own</button>
        <button type="button" className={`sx-tab ${mode === "own" ? "on" : ""}`} onClick={() => setMode("own")}><Ic n="upload" size={14} /> Upload my design</button>
      </div>

      {mode === "gallery" && (
        <>
          <p className="sx-mut" style={{ marginBottom: 8 }}>Current: <b>{cur.name}</b>. Tap any design — the preview updates instantly.</p>
          <div className="sx-row sx-wrap" style={{ marginBottom: 10 }}>
            {FILTERS.map(f => <button key={f.id} type="button" className={`sx-chip ${filter === f.id ? "on" : ""}`} onClick={() => { setFilter(f.id); setPage(0); }}>{f.label}</button>)}
          </div>
          <div className="sx-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            {list.slice(pg * PAGE, pg * PAGE + PAGE).map(t => (
              <button key={t.id} type="button" className={`sx-tile ${design.tpl === t.id && !design.useCustom ? "on" : ""}`} onClick={() => pick(t.id)} style={{ padding: 8 }}>
                <TemplateThumb tpl={t} name={t.name} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</span>
                <span className="sx-mut" style={{ marginTop: -4 }}>{LAYOUTS.find(l => l.id === t.layout)?.label}</span>
              </button>
            ))}
          </div>
          <div className="sx-row" style={{ justifyContent: "center", marginTop: 12 }}>
            <Btn kind="soft" size="sm" icon="chevL" disabled={pg === 0} onClick={() => setPage(pg - 1)}>Back</Btn>
            <span className="sx-mut">{pg + 1} / {pages}</span>
            <Btn kind="soft" size="sm" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>Next <Ic n="chevR" size={14} /></Btn>
          </div>
          <div style={{ marginTop: 14 }}>
            <Fld label="Accent colour (buttons & prices)"><Swatches value={design.accent || cur.accent} onChange={x => setDesign({ ...design, accent: x })} colors={[cur.accent, "#C2562B", "#1D7FC4", "#4F7A3A", "#BE185D", "#7C5CFC", "#111111"]} /></Fld>
            {design.accent && <Btn kind="soft" size="sm" onClick={() => setDesign({ ...design, accent: "" })}>Reset accent</Btn>}
            <Toggle checked={design.showImages !== false} onChange={x => setDesign({ ...design, showImages: x })} label="Show item photos" />
          </div>
        </>
      )}

      {mode === "custom" && <CustomDesigner design={design} setDesign={setDesign} token={token} />}

      {mode === "own" && <OwnDesign data={data} setData={setData} token={token} />}
    </div>
  );
}

function CustomDesigner({ design, setDesign, token }) {
  const c = design.custom || {};
  const base = TEMPLATES.find(t => t.id === design.tpl) || TEMPLATES[0];
  const t = { ...base, ...c };
  const up = (p) => setDesign({ ...design, useCustom: true, custom: { ...c, ...p } });
  const [name, setName] = useState("");
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState("");
  const mine = design.myTemplates || [];
  useFonts([t.hFont, t.bFont]);

  const save = () => {
    if (!name.trim()) { setMsg("Give your design a name first."); return; }
    const next = [...mine.filter(x => x.name !== name.trim()), { id: uid(), name: name.trim(), tokens: { ...t } }].slice(-12);
    setDesign({ ...design, myTemplates: next }); setMsg(`Saved “${name.trim()}”.`); setName("");
  };
  const exportJson = () => { const out = JSON.stringify({ cardnovaTemplate: 1, name: name || "My template", tokens: pickTokens(t) }, null, 2); downloadText(out, "my-menu-template.json", "application/json"); };
  const importJson = () => {
    try {
      const o = JSON.parse(json);
      const tk = pickTokens(o.tokens || o);
      if (!tk.bg || !tk.fg || !tk.accent) throw new Error("bad");
      setDesign({ ...design, useCustom: true, custom: { ...c, ...tk } }); setJson(""); setMsg("Template loaded.");
    } catch { setMsg("That doesn't look like a CardNova template. Paste the whole file contents."); }
  };

  return (
    <div>
      <Note kind="ok">Start from any template, then change what you like. Everything updates live in the preview.</Note>
      <Fld label="Start from"><select value={design.tpl} onChange={e => { const b = TEMPLATES.find(x => x.id === e.target.value); setDesign({ ...design, tpl: b.id, useCustom: true, custom: { ...b } }); }}>{TEMPLATES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Fld>
      <Fld label="Layout"><Chips value={t.layout} onChange={x => up({ layout: x })} options={LAYOUTS} /></Fld>
      <div className="sx-two">
        <Fld label="Background"><Swatches value={t.bg} onChange={x => up({ bg: x })} colors={["#FFFFFF", "#FAF7F2", "#F3F6EE", "#111214", "#0E1626", "#1E1612"]} /></Fld>
        <Fld label="Text"><Swatches value={t.fg} onChange={x => up({ fg: x })} colors={["#111111", "#2B2622", "#F2F2F2", "#E8EEF8"]} /></Fld>
        <Fld label="Accent"><Swatches value={t.accent} onChange={x => up({ accent: x })} colors={["#B5835A", "#C2562B", "#1D7FC4", "#4F7A3A", "#BE185D", "#7C5CFC", "#E8C26B"]} /></Fld>
        <Fld label="Cards / boxes"><Swatches value={t.card} onChange={x => up({ card: x })} colors={["#FFFFFF", "#F6F6F6", "#1A1C1F", "#16213A"]} /></Fld>
        <Fld label="Lines"><Swatches value={t.line} onChange={x => up({ line: x })} colors={["#E9E2D8", "#EAEAEA", "#2A2D31", "#25324F"]} /></Fld>
        <Fld label="Secondary text"><Swatches value={t.muted} onChange={x => up({ muted: x })} colors={["#8B8178", "#7A7A7A", "#8E9096", "#8493AC"]} /></Fld>
      </div>
      <div className="sx-two">
        <Fld label="Heading font"><select value={t.hFont} onChange={e => up({ hFont: e.target.value })}>{FONTS.map(f => <option key={f}>{f}</option>)}</select></Fld>
        <Fld label="Text font"><select value={t.bFont} onChange={e => up({ bFont: e.target.value })}>{FONTS.filter(f => f !== "Bebas Neue").map(f => <option key={f}>{f}</option>)}</select></Fld>
      </div>
      <Fld label="Header style"><Chips value={t.header} onChange={x => up({ header: x })} options={HEADERS} /></Fld>
      <Fld label="Category bar"><Chips value={t.nav} onChange={x => up({ nav: x })} options={NAVS} /></Fld>
      <Fld label={`Corner roundness: ${t.radius}px`}><input type="range" min="0" max="24" value={t.radius} onChange={e => up({ radius: Number(e.target.value) })} style={{ padding: 0 }} /></Fld>
      <Toggle checked={design.showImages !== false} onChange={x => setDesign({ ...design, showImages: x })} label="Show item photos" />

      <div className="sx-card" style={{ marginTop: 10 }}>
        <h3 className="sx-h3" style={{ marginBottom: 8 }}>Save &amp; reuse my templates</h3>
        <div className="sx-row" style={{ marginBottom: 8 }}><input placeholder="Name, e.g. “Sunday brunch”" value={name} onChange={e => setName(e.target.value)} /><Btn onClick={save}>Save</Btn></div>
        {mine.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {mine.map(m => (
              <div key={m.id} className="sx-row" style={{ padding: "5px 0", borderTop: `1px solid ${K.line}` }}>
                <span className="sx-grow" style={{ fontWeight: 600 }}>{m.name}</span>
                <Btn kind="soft" size="sm" onClick={() => setDesign({ ...design, useCustom: true, custom: { ...c, ...m.tokens } })}>Use</Btn>
                <button type="button" aria-label="Delete saved template" onClick={() => setDesign({ ...design, myTemplates: mine.filter(x => x.id !== m.id) })}><Ic n="trash" size={15} color={K.warn} /></button>
              </div>
            ))}
          </div>
        )}
        <details>
          <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Share or import a template file</summary>
          <div style={{ marginTop: 8 }}>
            <Btn kind="soft" size="sm" icon="download" onClick={exportJson}>Download this design</Btn>
            <textarea rows={3} value={json} onChange={e => setJson(e.target.value)} placeholder="Paste a template file's contents here to use it" style={{ marginTop: 8 }} />
            <div style={{ marginTop: 6 }}><Btn kind="soft" size="sm" onClick={importJson} disabled={!json.trim()}>Use pasted template</Btn></div>
          </div>
        </details>
        {msg && <p className="sx-hint">{msg}</p>}
      </div>
    </div>
  );
}
const pickTokens = (t) => {
  const o = {};
  ["layout", "header", "nav", "radius", "hFont", "bFont", "bg", "fg", "muted", "accent", "card", "line", "mode"].forEach(k => { if (t[k] !== undefined) o[k] = t[k]; });
  if (!LAYOUTS.some(l => l.id === o.layout)) o.layout = "list";
  if (!FONTS.includes(o.hFont)) o.hFont = "Inter";
  if (!FONTS.includes(o.bFont)) o.bFont = "Inter";
  const hex = /^#[0-9a-f]{6}$/i;
  ["bg", "fg", "muted", "accent", "card", "line"].forEach(k => { if (o[k] && !hex.test(o[k])) delete o[k]; });
  o.radius = Math.max(0, Math.min(30, Number(o.radius) || 0));
  return o;
};

function OwnDesign({ data, setData, token }) {
  const own = data.ownDesign || { enabled: false, images: [], pdf: "" };
  const setOwn = (o) => setData({ ...data, ownDesign: o });
  return (
    <div>
      <Note>Already have a designed menu (Canva, Photoshop, a photo of your printed menu)? Upload it here and customers will see <b>your</b> design, with your QR code and NFC tag.</Note>
      <Toggle checked={own.enabled} onChange={x => setOwn({ ...own, enabled: x })} label="Show my uploaded menu instead of a template" />
      <Fld label="Menu pages (images)" hint="Add one picture per page, in order. JPG/PNG, best when 1200px+ wide.">
        {(own.images || []).map((src, i) => (
          <div key={i} className="sx-row" style={{ marginBottom: 6 }}>
            <img src={src} alt="" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 6, border: `1px solid ${K.line}` }} />
            <span className="sx-grow">Page {i + 1}</span>
            <button type="button" aria-label="Move up" onClick={() => { const n = [...own.images]; if (i) { [n[i - 1], n[i]] = [n[i], n[i - 1]]; setOwn({ ...own, images: n }); } }}><Ic n="up" size={15} /></button>
            <button type="button" aria-label="Remove page" onClick={() => setOwn({ ...own, images: own.images.filter((_, k) => k !== i) })}><Ic n="trash" size={15} color={K.warn} /></button>
          </div>
        ))}
        <ImgUpload value="" onChange={x => x && setOwn({ ...own, enabled: true, images: [...(own.images || []), x] })} token={token} label="Add a page" />
      </Fld>
      <Fld label="Or a PDF menu"><ImgUpload pdf value={own.pdf} onChange={x => setOwn({ ...own, pdf: x, enabled: own.enabled || !!x })} token={token} label="Upload PDF" /></Fld>
    </div>
  );
}
