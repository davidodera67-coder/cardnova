import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* =====================================================================
   CardNova card design engine
   One renderer (CardView) is used by the wizard preview, the template
   thumbnails AND the public card page — so what you design is exactly
   what visitors see. All sizes are in `em`, so the card scales with its
   container (set fontSize on the wrapper).
   ===================================================================== */

const INK = "#14112C";
const VIOLET = "#7C5CFC";
const LINE = "#DADDEE";
const MIST = "#8A8FA8";
const FOG = "#EEF0F8";

export const THEME_SWATCHES = [
  { id: "light", label: "Light", bg: "#FFFFFF", fg: "#14171C" },
  { id: "dark", label: "Dark", bg: "#14171C", fg: "#FFFFFF" },
  { id: "blue", label: "Blue", bg: "#1C3FAA", fg: "#FFFFFF" },
  { id: "purple", label: "Purple", bg: "#4B2E83", fg: "#FFFFFF" },
  { id: "gold", label: "Gold", bg: "#B08D57", fg: "#14171C" },
  { id: "minimal", label: "Minimal", bg: "#EDEFF3", fg: "#14171C" },
  { id: "corporate", label: "Corporate", bg: "#0F2540", fg: "#FFFFFF" },
  { id: "luxury", label: "Luxury", bg: "#1A1A1A", fg: "#D4AF37" },
];

export const FONT_OPTIONS = [
  { id: "modern", label: "Modern", stack: "'Inter', 'Segoe UI', sans-serif" },
  { id: "grotesk", label: "Grotesk", stack: "'Space Grotesk', 'Segoe UI', sans-serif" },
  { id: "serif", label: "Classic serif", stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", stack: "ui-monospace, 'Courier New', monospace" },
];

export const BUTTON_LABELS = {
  save: "Save Contact", call: "Call Me", whatsapp: "WhatsApp Me", email: "Email Me", website: "Visit Website",
};

export const DEFAULT_DESIGN = {
  template: "classic",
  bgMode: "theme",        // theme | single | gradient
  bg1: "#EEF0F8",
  bg2: "#7C5CFC",
  angle: 160,
  textColor: "",          // "" = automatic (readable on the background)
  accent: VIOLET,
  font: "modern",
  btnStyle: "filled",     // filled | outline | soft
  btnShape: "rounded",    // rounded | pill | square
  photoShape: "circle",   // circle | rounded | square | hex
};

/* ------------------------------ colour helpers ------------------------------ */
function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [255, 255, 255];
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function readableOn(hex) {
  return luminance(hex) > 0.45 ? "#14112C" : "#FFFFFF";
}
function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* --------------------------- resolve a card's design --------------------------- */
export function resolveDesign(card) {
  const d = { ...DEFAULT_DESIGN, ...(card.design || {}) };
  const theme = THEME_SWATCHES.find(s => s.id === card.theme) || THEME_SWATCHES[0];

  let bgCss, bgRep;
  if (d.bgMode === "gradient") { bgCss = `linear-gradient(${d.angle}deg, ${d.bg1}, ${d.bg2})`; bgRep = d.bg1; }
  else if (d.bgMode === "single") { bgCss = d.bg1; bgRep = d.bg1; }
  else { bgCss = theme.bg; bgRep = theme.bg; }

  const fg = d.textColor || (d.bgMode === "theme" ? theme.fg : readableOn(bgRep));
  const accent = d.accent || VIOLET;
  const dark = luminance(bgRep) < 0.45;

  const tk = {
    ...d, bgCss, bgRep, fg, accent, dark,
    font: (FONT_OPTIONS.find(f => f.id === d.font) || FONT_OPTIONS[0]).stack,
  };
  // Some templates put the buttons on a "sheet" that sits over the background
  const sheetBg = dark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  tk.sheet = { ...tk, bgCss: sheetBg, fg: dark ? fg : INK, dark };
  return tk;
}

export function buttonCss(tk) {
  const radius = tk.btnShape === "pill" ? 999 : tk.btnShape === "square" ? "0.2em" : "0.7em";
  const base = {
    width: "100%", display: "block", textAlign: "center", fontWeight: 600, fontSize: "0.8em",
    padding: "0.85em 1em", borderRadius: radius, textDecoration: "none", cursor: "pointer",
    fontFamily: tk.font, boxSizing: "border-box",
  };
  if (tk.btnStyle === "outline") return { ...base, background: "transparent", border: `0.15em solid ${tk.accent}`, color: tk.fg };
  if (tk.btnStyle === "soft") return { ...base, background: withAlpha(tk.accent, 0.18), border: "0.15em solid transparent", color: tk.fg };
  return { ...base, background: tk.accent, border: "0.15em solid transparent", color: readableOn(tk.accent) };
}

/* ------------------------------- small pieces ------------------------------- */
const HEX = "polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)";

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function Photo({ card, tk, size = 6, shape, ring }) {
  const s = shape || tk.photoShape;
  const radius = s === "circle" ? "50%" : s === "rounded" ? "22%" : s === "square" ? "4%" : 0;
  return (
    <div style={{
      width: `${size}em`, height: `${size}em`, flexShrink: 0, overflow: "hidden", borderRadius: radius,
      clipPath: s === "hex" ? HEX : undefined,
      background: card.photo ? "#ccc" : withAlpha(tk.accent, 0.25),
      border: ring && s !== "hex" ? `0.25em solid ${ring}` : undefined,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: tk.accent, fontWeight: 700, fontSize: `${size * 0.3}em`, boxSizing: "border-box",
    }}>
      {card.photo ? <img src={card.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "0.5em" }}>{initials(card.name)}</span>}
    </div>
  );
}

function BannerMedia({ card, style }) {
  if (!card.banner) return null;
  const common = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
  return (
    <div style={style}>
      {card.bannerType === "video"
        ? <video src={card.banner} autoPlay muted loop playsInline style={common} />
        : <img src={card.banner} alt="" style={common} />}
    </div>
  );
}

function TextBlock({ card, tk, align = "center", color, nameSize = 1.5, upper, nameColor }) {
  const c = color || tk.fg;
  return (
    <div style={{ textAlign: align, color: c, fontFamily: tk.font }}>
      <div style={{ fontSize: `${nameSize}em`, fontWeight: 700, lineHeight: 1.15, textTransform: upper ? "uppercase" : "none", color: nameColor || c, wordBreak: "break-word" }}>
        {card.name || "Your name"}
      </div>
      <div style={{ fontSize: "0.82em", opacity: 0.85, marginTop: "0.35em", fontWeight: 500 }}>
        {card.title || "Job title"}{card.company ? ` · ${card.company}` : ""}
      </div>
      {card.bio ? <p style={{ fontSize: "0.75em", opacity: 0.8, margin: "0.7em 0 0", lineHeight: 1.5 }}>{card.bio}</p> : null}
    </div>
  );
}

function Actions({ card, tk, actions }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.6em" }}>{actions(tk)}</div>;
}

/* --------------------------------- templates --------------------------------- */
// Each template is self-contained: it receives the card, the resolved tokens (tk)
// and an `actions(tk)` function that returns the button elements.
export const TEMPLATES = [
  {
    id: "classic", label: "Classic",
    render: ({ card, tk, actions }) => (
      <div>
        {card.banner && <BannerMedia card={card} style={{ height: "8em" }} />}
        <div style={{ padding: "1.6em 1.3em 1.4em", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9em" }}>
          <Photo card={card} tk={tk} size={6} ring={tk.accent} />
          <TextBlock card={card} tk={tk} />
          <div style={{ width: "100%" }}><Actions card={card} tk={tk} actions={actions} /></div>
        </div>
      </div>
    ),
  },
  {
    id: "cover", label: "Cover",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ height: "9em", position: "relative", background: `linear-gradient(135deg, ${tk.accent}, ${withAlpha(tk.accent, 0.55)})`, overflow: "hidden" }}>
          <BannerMedia card={card} style={{ position: "absolute", inset: 0 }} />
        </div>
        <div style={{ padding: "0 1.3em 1.4em" }}>
          <div style={{ marginTop: "-3em", marginBottom: "0.8em", position: "relative" }}>
            <Photo card={card} tk={tk} size={6} ring={tk.bgRep} />
          </div>
          <TextBlock card={card} tk={tk} align="left" />
          <div style={{ marginTop: "1.1em" }}><Actions card={card} tk={tk} actions={actions} /></div>
        </div>
      </div>
    ),
  },
  {
    id: "wave", label: "Wave",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ position: "relative", height: "10.5em", background: `linear-gradient(160deg, ${tk.accent}, ${withAlpha(tk.accent, 0.6)})`, overflow: "hidden" }}>
          <BannerMedia card={card} style={{ position: "absolute", inset: 0 }} />
          <svg viewBox="0 0 400 60" preserveAspectRatio="none" style={{ position: "absolute", bottom: -1, left: 0, width: "100%", height: "3.6em" }}>
            <path d="M0 30 C 80 70, 160 0, 260 28 S 380 55, 400 20 L400 60 L0 60 Z" fill={tk.sheet.bgCss.startsWith("rgba") ? tk.bgRep : "#fff"} />
          </svg>
        </div>
        <div style={{ background: tk.sheet.bgCss.startsWith("rgba") ? tk.bgRep : "#fff", padding: "0 1.3em 1.5em", marginTop: "-0.5em" }}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-4.2em", marginBottom: "0.8em", position: "relative" }}>
            <Photo card={card} tk={tk} size={6.4} ring={tk.sheet.bgCss.startsWith("rgba") ? tk.bgRep : "#fff"} />
          </div>
          <TextBlock card={card} tk={tk.sheet} color={tk.sheet.fg} />
          <div style={{ marginTop: "1.1em" }}><Actions card={card} tk={tk.sheet} actions={actions} /></div>
        </div>
      </div>
    ),
  },
  {
    id: "hero", label: "Photo hero",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ position: "relative", height: "17em", background: `linear-gradient(160deg, ${tk.accent}, ${INK})`, overflow: "hidden" }}>
          {card.banner
            ? <BannerMedia card={card} style={{ position: "absolute", inset: 0 }} />
            : card.photo ? <img src={card.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5em", fontWeight: 800, color: "rgba(255,255,255,0.35)" }}>{initials(card.name)}</div>}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.78) 6%, rgba(0,0,0,0) 62%)" }} />
          <div style={{ position: "absolute", left: "1.2em", right: "1.2em", bottom: "1em" }}>
            <TextBlock card={card} tk={tk} align="left" color="#fff" nameSize={1.7} />
          </div>
        </div>
        <div style={{ padding: "1.2em 1.3em 1.5em" }}><Actions card={card} tk={tk} actions={actions} /></div>
      </div>
    ),
  },
  {
    id: "diagonal", label: "Diagonal",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ position: "relative", height: "11em", background: tk.accent, clipPath: "polygon(0 0, 100% 0, 100% 62%, 0 100%)", overflow: "hidden" }}>
          <BannerMedia card={card} style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
          <div style={{ position: "absolute", right: "1.3em", top: "1.3em" }}>
            <Photo card={card} tk={tk} size={5.4} shape={tk.photoShape === "hex" ? "hex" : "circle"} ring="rgba(255,255,255,0.9)" />
          </div>
        </div>
        <div style={{ padding: "0 1.3em 1.5em", marginTop: "-0.2em", position: "relative" }}>
          <TextBlock card={card} tk={tk} align="left" nameSize={1.6} />
          <div style={{ width: "2.4em", height: "0.22em", background: tk.accent, margin: "0.9em 0 1.1em", borderRadius: 4 }} />
          <Actions card={card} tk={tk} actions={actions} />
        </div>
      </div>
    ),
  },
  {
    id: "minimal", label: "Minimal",
    render: ({ card, tk, actions }) => (
      <div style={{ padding: "1.8em 1.4em 1.5em" }}>
        {card.banner && <BannerMedia card={card} style={{ height: "6.5em", borderRadius: "0.7em", overflow: "hidden", marginBottom: "1.2em" }} />}
        <Photo card={card} tk={tk} size={4.6} shape={tk.photoShape === "circle" ? "rounded" : tk.photoShape} />
        <div style={{ height: "0.15em", width: "100%", background: withAlpha(tk.fg, 0.18), margin: "1.1em 0" }} />
        <TextBlock card={card} tk={tk} align="left" nameSize={1.9} />
        <div style={{ marginTop: "1.3em" }}><Actions card={card} tk={tk} actions={actions} /></div>
      </div>
    ),
  },
  {
    id: "bold", label: "Bold",
    render: ({ card, tk, actions }) => (
      <div>
        {card.banner && <BannerMedia card={card} style={{ height: "7em" }} />}
        <div style={{ padding: "1.5em 1.3em 1.5em" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.9em" }}>
            <Photo card={card} tk={tk} size={6} ring={tk.accent} />
          </div>
          <TextBlock card={card} tk={tk} align="left" upper nameSize={2.1} nameColor={tk.accent} />
          <div style={{ width: "3.2em", height: "0.28em", background: tk.accent, margin: "0.9em 0 1.2em" }} />
          <Actions card={card} tk={tk} actions={actions} />
        </div>
      </div>
    ),
  },
  {
    id: "hexagon", label: "Hexagon",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ position: "relative", padding: "2em 1.3em 1.2em", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9em", background: `linear-gradient(180deg, ${withAlpha(tk.accent, 0.28)}, transparent)` }}>
          <div style={{ filter: `drop-shadow(0 0 0.3em ${withAlpha(tk.accent, 0.8)})` }}>
            <Photo card={card} tk={tk} size={7} shape="hex" />
          </div>
          <TextBlock card={card} tk={tk} />
        </div>
        {card.banner && <BannerMedia card={card} style={{ height: "6em", margin: "0 1.3em 1em", borderRadius: "0.7em", overflow: "hidden" }} />}
        <div style={{ padding: "0 1.3em 1.5em" }}><Actions card={card} tk={tk} actions={actions} /></div>
      </div>
    ),
  },
  {
    id: "slab", label: "Floating card",
    render: ({ card, tk, actions }) => {
      const panel = tk.dark ? withAlpha("#ffffff", 0.1) : "#fff";
      return (
        <div style={{ padding: "1.4em 1em" }}>
          <div style={{ background: panel, borderRadius: "1.2em", boxShadow: "0 0.6em 1.6em rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ height: "5.5em", position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${tk.accent}, ${withAlpha(tk.accent, 0.6)})` }}>
              <BannerMedia card={card} style={{ position: "absolute", inset: 0 }} />
            </div>
            <div style={{ padding: "0 1.1em 1.3em", marginTop: "-2.8em", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8em", position: "relative" }}>
              <Photo card={card} tk={tk} size={5.6} ring={tk.dark ? tk.bgRep : "#fff"} />
              <TextBlock card={card} tk={tk.sheet} color={tk.sheet.fg} />
              <div style={{ width: "100%" }}><Actions card={card} tk={tk.sheet} actions={actions} /></div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "stripe", label: "Stripe",
    render: ({ card, tk, actions }) => (
      <div style={{ display: "flex" }}>
        <div style={{ width: "0.9em", background: tk.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "1.8em 1.2em 1.5em" }}>
          <Photo card={card} tk={tk} size={5} shape={tk.photoShape === "circle" ? "rounded" : tk.photoShape} />
          <div style={{ height: "1em" }} />
          <TextBlock card={card} tk={tk} align="left" nameSize={1.7} />
          <div style={{ margin: "1.1em 0 0.6em", fontSize: "0.65em", letterSpacing: "0.18em", textTransform: "uppercase", color: tk.accent, fontWeight: 700 }}>Get in touch</div>
          <Actions card={card} tk={tk} actions={actions} />
        </div>
      </div>
    ),
  },
  {
    id: "spotlight", label: "Spotlight",
    render: ({ card, tk, actions }) => (
      <div style={{ padding: "2.2em 1.3em 1.5em", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9em", background: `radial-gradient(circle at 50% 16%, ${withAlpha(tk.accent, 0.55)}, transparent 58%)` }}>
        <div style={{ padding: "0.35em", borderRadius: "50%", background: `conic-gradient(${tk.accent}, ${withAlpha(tk.accent, 0.2)}, ${tk.accent})` }}>
          <Photo card={card} tk={tk} size={6.4} shape="circle" ring={tk.bgRep} />
        </div>
        <TextBlock card={card} tk={tk} />
        <div style={{ width: "100%" }}><Actions card={card} tk={tk} actions={actions} /></div>
      </div>
    ),
  },
  {
    id: "ribbon", label: "Corner ribbon",
    render: ({ card, tk, actions }) => (
      <div style={{ position: "relative", padding: "1.6em 1.3em 1.5em", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "7em", height: "7em", background: tk.accent, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
          <Photo card={card} tk={tk} size={5.6} ring={tk.accent} />
        </div>
        <div style={{ position: "relative", marginTop: "1.5em" }}><TextBlock card={card} tk={tk} align="left" nameSize={1.6} /></div>
        <div style={{ position: "relative", marginTop: "1.1em" }}><Actions card={card} tk={tk} actions={actions} /></div>
      </div>
    ),
  },
  {
    id: "magazine", label: "Magazine",
    render: ({ card, tk, actions }) => (
      <div>
        <div style={{ position: "relative", height: "15em", overflow: "hidden", background: `linear-gradient(160deg, ${tk.accent}, ${INK})` }}>
          {card.banner
            ? <BannerMedia card={card} style={{ position: "absolute", inset: 0 }} />
            : card.photo ? <img src={card.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5em", fontWeight: 800, color: "rgba(255,255,255,0.35)" }}>{initials(card.name)}</div>}
        </div>
        <div style={{ margin: "-2.4em 1.2em 0", position: "relative", background: tk.accent, color: readableOn(tk.accent), padding: "0.9em 1em", borderRadius: "0.3em", fontFamily: tk.font }}>
          <div style={{ fontSize: "1.35em", fontWeight: 800, textTransform: "uppercase", lineHeight: 1.1, wordBreak: "break-word" }}>{card.name || "Your name"}</div>
          <div style={{ fontSize: "0.78em", marginTop: "0.3em", opacity: 0.9 }}>{card.title || "Job title"}{card.company ? ` · ${card.company}` : ""}</div>
        </div>
        <div style={{ padding: "1.1em 1.3em 1.5em" }}>
          {card.bio ? <p style={{ fontSize: "0.75em", opacity: 0.8, margin: "0 0 1em", lineHeight: 1.5, color: tk.fg }}>{card.bio}</p> : null}
          <Actions card={card} tk={tk} actions={actions} />
        </div>
      </div>
    ),
  },
  {
    id: "bubbles", label: "Bubbles",
    render: ({ card, tk, actions }) => (
      <div style={{ position: "relative", overflow: "hidden", padding: "1.8em 1.3em 1.5em" }}>
        <div style={{ position: "absolute", top: "-3em", right: "-3em", width: "9em", height: "9em", borderRadius: "50%", background: withAlpha(tk.accent, 0.3) }} />
        <div style={{ position: "absolute", top: "2.2em", right: "3.4em", width: "3em", height: "3em", borderRadius: "50%", background: withAlpha(tk.accent, 0.6) }} />
        <div style={{ position: "absolute", top: "6em", right: "-0.8em", width: "2.2em", height: "2.2em", borderRadius: "50%", background: tk.accent }} />
        <div style={{ position: "relative" }}>
          <Photo card={card} tk={tk} size={5.4} ring={tk.accent} />
          <div style={{ height: "1em" }} />
          <TextBlock card={card} tk={tk} align="left" nameSize={1.6} />
          <div style={{ marginTop: "1.2em" }}><Actions card={card} tk={tk} actions={actions} /></div>
        </div>
      </div>
    ),
  },
];

/* ---------------------------------- CardView ---------------------------------- */
// The card itself. Wrap it in an element that sets `fontSize` (see PhoneMockup / public page).
export function CardView({ card, actions, bare }) {
  const tk = resolveDesign(card);
  const tpl = TEMPLATES.find(t => t.id === tk.template) || TEMPLATES[0];
  return (
    <div style={{ background: bare ? "transparent" : tk.bgCss, color: tk.fg, fontFamily: tk.font, minHeight: "100%", overflow: "hidden" }}>
      {tpl.render({ card, tk, actions })}
    </div>
  );
}

// Fake (non-clickable) buttons for previews and thumbnails
export function previewActions(card) {
  return (tk) => [
    ...(card.buttons || []).map(id => (BUTTON_LABELS[id] ? <div key={id} style={buttonCss(tk)}>{BUTTON_LABELS[id]}</div> : null)),
    card.leadCapture && card.leadCapture.enabled
      ? <div key="lead" style={{ fontSize: "0.65em", textAlign: "center", opacity: 0.75, padding: "0.4em" }}>+ Lead capture form</div>
      : null,
  ];
}

/* ------------------------------ template thumbnail ------------------------------ */
const THUMB_W = 84, THUMB_H = 150, THUMB_GAP = 8;

function TemplateThumb({ card, tpl, selected, onPick }) {
  const inner = 240;
  const scale = THUMB_W / inner;
  // Thumbnails never play video banners (14 autoplaying videos would be heavy on a phone)
  const asTpl = {
    ...card,
    banner: card.bannerType === "video" ? null : card.banner,
    design: { ...(card.design || {}), template: tpl.id },
  };
  const tk = resolveDesign(asTpl);
  return (
    <button type="button" onClick={onPick} aria-label={`${tpl.label} template`} aria-pressed={selected}
      className="shrink-0 text-left" style={{ width: THUMB_W, scrollSnapAlign: "start", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
      <div style={{ width: THUMB_W, height: THUMB_H, overflow: "hidden", borderRadius: 12, position: "relative", background: tk.bgCss, border: selected ? `2.5px solid ${VIOLET}` : `1px solid ${LINE}`, boxSizing: "border-box" }}>
        <div style={{ width: inner, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none", fontSize: 12 }}>
          <CardView card={asTpl} actions={previewActions(asTpl)} />
        </div>
        {selected && (
          <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, background: VIOLET, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: selected ? VIOLET : INK, marginTop: 4, textAlign: "center", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tpl.label}</div>
    </button>
  );
}

// Compact, paged carousel: small thumbnails, ‹ › buttons that move one "page" at a time.
export function TemplatePicker({ card, onChange }) {
  const rail = useRef(null);
  const box = useRef(null);
  const [railW, setRailW] = useState(null);
  const [pos, setPos] = useState({ page: 1, pages: 1, atStart: true, atEnd: false });
  const current = (card.design && card.design.template) || "classic";
  const currentLabel = (TEMPLATES.find(t => t.id === current) || TEMPLATES[0]).label;

  const measure = () => {
    const el = rail.current;
    if (!el) return;
    // show only whole thumbnails: size the rail to fit N of them between the two arrows
    if (box.current) {
      const avail = box.current.clientWidth - 2 * 32 - 2 * 6;
      const n = Math.max(1, Math.floor((avail + THUMB_GAP - 4) / (THUMB_W + THUMB_GAP)));
      const w = n * (THUMB_W + THUMB_GAP) - THUMB_GAP + 4;
      setRailW(prev => (prev === w ? prev : w));
    }
    const pageW = el.clientWidth || 1;
    const pages = Math.max(1, Math.ceil((el.scrollWidth - 2) / pageW));
    const page = Math.min(pages, Math.round(el.scrollLeft / pageW) + 1);
    setPos({ page, pages, atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };

  useEffect(() => {
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);

  const go = (dir) => {
    const el = rail.current;
    if (!el) return;
    // move by whole thumbnails so the next page always starts on a clean edge
    const step = THUMB_W + THUMB_GAP;
    const perPage = Math.max(1, Math.floor((el.clientWidth + THUMB_GAP) / step));
    el.scrollBy({ left: dir * perPage * step, behavior: "smooth" });
  };

  const arrow = (disabled) => ({
    width: 32, height: 32, borderRadius: 16, border: "none", flexShrink: 0,
    background: disabled ? FOG : VIOLET, color: disabled ? MIST : "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
  });

  return (
    <div style={{ marginBottom: 18, minWidth: 0, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>
          Page template <span style={{ fontWeight: 500, color: VIOLET, fontSize: 12 }}>· {currentLabel}</span>
        </p>
        <span style={{ fontSize: 11, color: MIST, whiteSpace: "nowrap" }}>{pos.page} / {pos.pages}</span>
      </div>
      <div ref={box} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0 }}>
        <button type="button" aria-label="Previous templates" disabled={pos.atStart} onClick={() => go(-1)} style={arrow(pos.atStart)}><ChevronLeft size={16} /></button>
        <div ref={rail} onScroll={measure}
          style={{ display: "flex", gap: THUMB_GAP, overflowX: "auto", flex: railW ? "none" : 1, width: railW || undefined, maxWidth: "100%", minWidth: 0, scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", padding: "2px 2px 4px" }}>
          {TEMPLATES.map(t => (
            <TemplateThumb key={t.id} card={card} tpl={t} selected={current === t.id}
              onPick={() => onChange({ design: { ...(card.design || {}), template: t.id } })} />
          ))}
        </div>
        <button type="button" aria-label="More templates" disabled={pos.atEnd} onClick={() => go(1)} style={arrow(pos.atEnd)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/* ------------------------------- design controls ------------------------------- */
const ACCENT_PRESETS = ["#7C5CFC", "#F47B20", "#E11D48", "#0EA5E9", "#16A34A", "#D4AF37", "#14112C", "#EC4899"];

function Seg({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: value === o.id ? INK : FOG, color: value === o.id ? "#fff" : INK, fontWeight: 500 }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: MIST, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>{title}</p>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: INK }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 34, height: 34, border: `1px solid ${LINE}`, borderRadius: 8, padding: 0, cursor: "pointer", background: "none" }} />
      <span>{label}</span>
      <span style={{ color: MIST, fontFamily: "ui-monospace, monospace" }}>{value}</span>
    </label>
  );
}

export function DesignControls({ card, update }) {
  const d = { ...DEFAULT_DESIGN, ...(card.design || {}) };
  const set = (patch) => update({ design: { ...(card.design || {}), ...patch } });

  return (
    <div>
      <TemplatePicker card={card} onChange={update} />

      <Group title="Background">
        <Seg value={d.bgMode} onChange={v => set({ bgMode: v })}
          options={[{ id: "theme", label: "Preset theme" }, { id: "single", label: "Single color" }, { id: "gradient", label: "Gradient" }]} />
        {d.bgMode === "theme" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 }}>
            {THEME_SWATCHES.map(t => (
              <button key={t.id} type="button" onClick={() => update({ theme: t.id })}
                style={{ borderRadius: 10, overflow: "hidden", padding: 0, cursor: "pointer", background: "#fff", border: card.theme === t.id ? `2px solid ${VIOLET}` : `1px solid ${LINE}` }}>
                <div style={{ background: t.bg, color: t.fg, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>Aa</div>
                <div style={{ fontSize: 11, padding: "3px 0", color: INK }}>{t.label}</div>
              </button>
            ))}
          </div>
        )}
        {d.bgMode !== "theme" && (
          <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ColorInput value={d.bg1} onChange={v => set({ bg1: v })} label={d.bgMode === "gradient" ? "From" : "Color"} />
            {d.bgMode === "gradient" && <ColorInput value={d.bg2} onChange={v => set({ bg2: v })} label="To" />}
            {d.bgMode === "gradient" && (
              <label style={{ fontSize: 12, color: INK, display: "flex", alignItems: "center", gap: 6 }}>
                Direction
                <select value={d.angle} onChange={e => set({ angle: Number(e.target.value) })} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8, border: `1px solid ${LINE}` }}>
                  <option value={180}>Top → Bottom</option>
                  <option value={90}>Left → Right</option>
                  <option value={135}>Diagonal ↘</option>
                  <option value={160}>Soft diagonal</option>
                  <option value={0}>Bottom → Top</option>
                </select>
              </label>
            )}
          </div>
        )}
      </Group>

      <Group title="Accent color (buttons, highlights)">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map(c => (
            <button key={c} type="button" aria-label={`Accent ${c}`} onClick={() => set({ accent: c })}
              style={{ width: 28, height: 28, borderRadius: 14, background: c, cursor: "pointer", border: d.accent === c ? `3px solid ${INK}` : `1px solid ${LINE}` }} />
          ))}
          <input type="color" value={d.accent} onChange={e => set({ accent: e.target.value })} style={{ width: 34, height: 34, border: `1px solid ${LINE}`, borderRadius: 8, padding: 0, cursor: "pointer" }} />
        </div>
      </Group>

      <Group title="Text color">
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Seg value={d.textColor ? "custom" : "auto"} onChange={v => set({ textColor: v === "auto" ? "" : "#14112C" })}
            options={[{ id: "auto", label: "Automatic" }, { id: "custom", label: "Custom" }]} />
          {d.textColor ? <ColorInput value={d.textColor} onChange={v => set({ textColor: v })} label="Text" /> : null}
        </div>
      </Group>

      <Group title="Font">
        <Seg value={d.font} onChange={v => set({ font: v })} options={FONT_OPTIONS.map(f => ({ id: f.id, label: f.label }))} />
      </Group>

      <Group title="Buttons">
        <Seg value={d.btnStyle} onChange={v => set({ btnStyle: v })} options={[{ id: "filled", label: "Filled" }, { id: "outline", label: "Outline" }, { id: "soft", label: "Soft" }]} />
        <div style={{ height: 8 }} />
        <Seg value={d.btnShape} onChange={v => set({ btnShape: v })} options={[{ id: "rounded", label: "Rounded" }, { id: "pill", label: "Pill" }, { id: "square", label: "Square" }]} />
      </Group>

      <Group title="Photo shape">
        <Seg value={d.photoShape} onChange={v => set({ photoShape: v })} options={[{ id: "circle", label: "Circle" }, { id: "rounded", label: "Rounded" }, { id: "square", label: "Square" }, { id: "hex", label: "Hexagon" }]} />
      </Group>
    </div>
  );
}
