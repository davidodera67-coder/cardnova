// studio.jsx — the "Menus & QR" dashboard section (list, chooser, editor,
// responses) and the public page a scan opens (/p/your-link).
import React, { useState, useEffect, useMemo } from "react";
import { Ic, K, StudioStyles, Btn, Fld, Chips, Toggle, Modal, Note, Spinner, CopyBtn, QRDesigner, NfcPanel, tableCardsPdf, menuPdf, nfcSupported, pageUrl, randomSlug, slugify, downloadText, copyText, uid, DEFAULT_QR } from "./kit.jsx";
import { MenuView, PhoneFrame, VenueTab, MenuItemsTab, OrderingTab, LookTab, emptyMenu, sampleMenu, resolveTokens } from "./menu.jsx";
import { SOL, CHOOSER, CHOOSER_CATS, SolutionFields, SolutionLook, SolutionView, StaticPreview, isStatic, staticPayload, solutionReady, newSolutionData } from "./solutions.jsx";

/* ---------------------------------------------------------------- api */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
async function req(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || `Request failed (${res.status})`); e.status = res.status; throw e; }
  return data;
}
export const pagesApi = {
  list: (token) => req("/pages", { token }),
  create: (p, token) => req("/pages", { method: "POST", body: p, token }),
  update: (id, p, token) => req(`/pages/${id}`, { method: "PUT", body: p, token }),
  remove: (id, token) => req(`/pages/${id}`, { method: "DELETE", token }),
  entries: (token) => req("/pages/entries", { token }),
  removeEntry: (id, token) => req(`/pages/entries/${id}`, { method: "DELETE", token }),
  getPublic: (slug) => req(`/pages/public/${encodeURIComponent(slug)}`),
  submit: (slug, body) => req(`/pages/public/${encodeURIComponent(slug)}/entry`, { method: "POST", body }),
};

/* -------------------------------------------------------------- helpers */
function typeLabel(p) { return p.kind === "menu" ? "Food menu" : SOL[p.type]?.name || p.type; }
function typeIcon(p) { return p.kind === "menu" ? "utensils" : SOL[p.type]?.icon || "qr"; }
export function deriveTitle(kind, type, data) {
  if (kind === "menu") return data.venue?.name || "My menu";
  const d = data || {};
  return d.title || d.business || d.name || d.headline || d.ssid || d.to || d.phone || d.place || (d.text ? String(d.text).slice(0, 30) : "") || SOL[type]?.name || "QR page";
}
const qrValueOf = (draft) => (draft.kind === "solution" && isStatic(draft.type) ? staticPayload(draft.type, draft.data) : draft.id ? pageUrl(draft.slug) : "");

/* ------------------------------------------------------------- the studio */
export function Studio({ token, currentUser, onNewCard, onUpgrade }) {
  const [view, setView] = useState("list");           // list | choose | edit | responses
  const [pages, setPages] = useState([]);
  const [limit, setLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);
  const [startTab, setStartTab] = useState(null);

  const load = async () => {
    setLoading(true); setErr("");
    try { const r = await pagesApi.list(token); setPages(r.pages); setLimit(r.limit); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (token) load(); }, [token]);

  const atLimit = pages.length >= limit;
  const startNew = (c) => {
    if (c.special === "card") return onNewCard && onNewCard();
    if (atLimit) { onUpgrade && onUpgrade(); return; }
    if (c.special === "menu") {
      setDraft({ kind: "menu", type: "menu", title: "", slug: randomSlug("menu"), status: "Published", data: emptyMenu(), design: { tpl: "t01", qr: { ...DEFAULT_QR, frame: "below", frameText: "SCAN FOR MENU" } } });
    } else {
      setDraft({ kind: "solution", type: c.type, title: "", slug: randomSlug(c.type), status: "Published", data: newSolutionData(c), design: { pal: "lavender", qr: { ...DEFAULT_QR, frame: isStatic(c.type) ? "none" : "below", frameText: "SCAN ME" } } });
    }
    setStartTab(null); setView("edit");
  };
  const edit = (p, tab) => { setDraft({ ...p, id: p._id || p.id }); setStartTab(tab || null); setView("edit"); };
  const dup = async (p) => {
    if (atLimit) { onUpgrade && onUpgrade(); return; }
    try {
      const c = await pagesApi.create({ kind: p.kind, type: p.type, title: (p.title || "") + " (copy)", slug: randomSlug(p.slug.replace(/-[a-z0-9]{4}$/, "")), status: "Draft", data: p.data, design: p.design }, token);
      setPages([c, ...pages]);
    } catch (e) { setErr(e.message); }
  };
  const del = async (p) => {
    if (!window.confirm(`Delete “${p.title || typeLabel(p)}”? Its QR code will stop working.`)) return;
    try { await pagesApi.remove(p._id, token); setPages(pages.filter(x => x._id !== p._id)); }
    catch (e) { setErr(e.message); }
  };
  const saved = (p) => {
    setPages(prev => prev.some(x => x._id === p._id) ? prev.map(x => x._id === p._id ? p : x) : [p, ...prev]);
    setDraft(d => ({ ...d, id: p._id, slug: p.slug }));
  };

  if (view === "edit" && draft) {
    return (
      <div className="sx">
        <StudioStyles />
        <Editor draft={draft} setDraft={setDraft} token={token} initialTab={startTab} onSaved={saved}
          onBack={() => { setView("list"); setDraft(null); }} />
      </div>
    );
  }

  return (
    <div className="sx">
      <StudioStyles />
      <div className="sx-row sx-wrap" style={{ marginBottom: 14, alignItems: "flex-start" }}>
        <div className="sx-grow">
          <h1 className="sx-h">Menus &amp; QR pages</h1>
          <p className="sx-mut" style={{ marginTop: 2 }}>Digital menus, Wi-Fi, links, coupons, events and more — each with its own QR code and NFC tag. {pages.length} of {limit} used.</p>
        </div>
        {view === "list" && <Btn icon="plus" onClick={() => { atLimit ? onUpgrade && onUpgrade() : setView("choose"); }}>{atLimit ? "Upgrade to add more" : "Create"}</Btn>}
      </div>

      <div className="sx-tabs" style={{ marginBottom: 14 }}>
        <button type="button" className={`sx-tab ${view === "list" || view === "choose" ? "on" : ""}`} onClick={() => setView("list")}><Ic n="qr" size={14} /> My pages</button>
        <button type="button" className={`sx-tab ${view === "responses" ? "on" : ""}`} onClick={() => setView("responses")}><Ic n="users" size={14} /> Responses</button>
      </div>

      {err && <Note kind="err">{err}</Note>}

      {view === "choose" && <Chooser onPick={startNew} onCancel={() => setView("list")} />}
      {view === "responses" && <Responses token={token} />}
      {view === "list" && (
        loading ? <p className="sx-mut"><Spinner /> Loading…</p> : pages.length === 0 ? (
          <div className="sx-card" style={{ textAlign: "center", padding: 28 }}>
            <div className="sx-ico" style={{ margin: "0 auto 10px", width: 48, height: 48 }}><Ic n="utensils" size={24} /></div>
            <h3 className="sx-h3" style={{ marginBottom: 6 }}>Create your first menu or QR page</h3>
            <p className="sx-mut" style={{ marginBottom: 14 }}>Start with a food menu, a WhatsApp link, Wi-Fi sharing, a coupon… every one gets a custom QR code.</p>
            <Btn icon="plus" onClick={() => setView("choose")}>Create</Btn>
          </div>
        ) : (
          <>
            <div className="sx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 14 }}>
              {[["Scans / views", pages.reduce((s, p) => s + (p.views || 0), 0)], ["Responses", pages.reduce((s, p) => s + (p.entryCount || 0), 0)], ["Live pages", pages.filter(p => p.status === "Published").length]].map(([l, v]) => (
                <div key={l} className="sx-card" style={{ padding: 12 }}><div className="sx-h" style={{ fontSize: 22 }}>{v}</div><div className="sx-mut">{l}</div></div>
              ))}
            </div>
            {pages.map(p => {
              const stat = p.kind === "solution" && isStatic(p.type);
              return (
                <div key={p._id} className="sx-card" style={{ marginBottom: 10 }}>
                  <div className="sx-row" style={{ alignItems: "flex-start" }}>
                    <div className="sx-ico"><Ic n={typeIcon(p)} /></div>
                    <div className="sx-grow">
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || typeLabel(p)}</div>
                      <div className="sx-mut">{typeLabel(p)} · {stat ? "Instant QR" : `/p/${p.slug}`}</div>
                      <div className="sx-row sx-wrap" style={{ marginTop: 6, gap: 6 }}>
                        <span className={`sx-pill ${p.status === "Published" ? "ok" : ""}`}>{p.status}</span>
                        {!stat && <span className="sx-pill">{p.views || 0} scans</span>}
                        {(p.entryCount || 0) > 0 && <span className="sx-pill">{p.entryCount} responses</span>}
                      </div>
                    </div>
                  </div>
                  <div className="sx-row sx-wrap" style={{ marginTop: 10 }}>
                    <Btn size="sm" icon="edit" onClick={() => edit(p)}>Edit</Btn>
                    <Btn size="sm" kind="soft" icon="qr" onClick={() => edit(p, "share")}>QR &amp; NFC</Btn>
                    {!stat && <CopyBtn text={pageUrl(p.slug)} label="Copy link" />}
                    {!stat && <Btn size="sm" kind="soft" icon="ext" onClick={() => window.open(pageUrl(p.slug), "_blank")}>Open</Btn>}
                    <Btn size="sm" kind="soft" icon="copy" onClick={() => dup(p)}>Duplicate</Btn>
                    <Btn size="sm" kind="danger" icon="trash" onClick={() => del(p)}>Delete</Btn>
                  </div>
                </div>
              );
            })}
          </>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------- chooser */
function Chooser({ onPick, onCancel }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const list = CHOOSER.filter(c => (cat === "all" || c.cat === cat) && (!q || (c.name + " " + c.desc).toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div className="sx-row" style={{ marginBottom: 10 }}>
        <h2 className="sx-h3 sx-grow">What would you like to create?</h2>
        <button type="button" className="sx-mut" onClick={onCancel}>Cancel</button>
      </div>
      <input aria-label="Search" placeholder="Search — e.g. wifi, menu, coupon…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="sx-row sx-wrap" style={{ marginBottom: 12 }}>
        {CHOOSER_CATS.map(c => <button key={c.id} type="button" className={`sx-chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
      </div>
      <div className="sx-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {list.map(c => (
          <button key={c.id} type="button" className="sx-tile" onClick={() => onPick(c)}>
            <div className="sx-row"><div className="sx-ico"><Ic n={c.icon} /></div>{c.badge && <span className="sx-pill ok">{c.badge}</span>}</div>
            <b>{c.name}</b>
            <span className="sx-mut">{c.desc}</span>
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="sx-mut" style={{ textAlign: "center", padding: 20 }}>Nothing matches “{q}”.</p>}
      <p className="sx-hint" style={{ marginTop: 12 }}>“Instant” codes hold the information inside the QR itself (works offline, can't be edited later). Everything else is a live page you can edit any time without reprinting.</p>
    </div>
  );
}

/* -------------------------------------------------------------- editor */
function Editor({ draft, setDraft, token, onBack, onSaved, initialTab }) {
  const isMenu = draft.kind === "menu";
  const stat = !isMenu && isStatic(draft.type);
  const tabs = isMenu
    ? [["venue", "Venue", "store"], ["menu", "Menu", "utensils"], ["look", "Look", "palette"], ["order", "Ordering", "cart"], ["share", "QR & NFC", "qr"]]
    : stat ? [["content", "Content", "edit"], ["share", "QR code", "qr"]]
    : [["content", "Content", "edit"], ["look", "Look", "palette"], ["share", "QR & NFC", "qr"]];
  const [tab, setTab] = useState(initialTab && tabs.some(t => t[0] === initialTab) ? initialTab : tabs[0][0]);
  const [dirty, setDirty] = useState(!draft.id);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [prev, setPrev] = useState(false);

  const setData = (data) => { setDraft(d => ({ ...d, data })); setDirty(true); };
  const setDesign = (design) => { setDraft(d => ({ ...d, design })); setDirty(true); };
  const title = deriveTitle(draft.kind, draft.type, draft.data);

  const validate = () => {
    if (isMenu) {
      if (!draft.data.venue.name.trim()) return "Add your restaurant or café name on the Venue tab.";
      if (!draft.data.categories.some(c => c.items.length) && !(draft.data.ownDesign?.enabled)) return "Add at least one menu item (or upload your own menu design).";
      return "";
    }
    return solutionReady(draft.type, draft.data);
  };

  const save = async (status) => {
    const problem = validate();
    if (problem) { setMsg({ kind: "err", text: problem }); return; }
    setSaving(true); setMsg(null);
    try {
      const body = { kind: draft.kind, type: draft.type, title, slug: draft.slug, status: status || draft.status || "Published", data: draft.data, design: draft.design };
      const p = draft.id ? await pagesApi.update(draft.id, body, token) : await pagesApi.create(body, token);
      onSaved(p);
      setDraft(d => ({ ...d, status: p.status, title: p.title }));
      setDirty(false);
      setMsg({ kind: "ok", text: draft.id ? "Saved — changes are live." : "Created! Your QR code is ready on the “QR & NFC” tab." });
    } catch (e) { setMsg({ kind: "err", text: e.message }); }
    finally { setSaving(false); }
  };

  const back = () => { if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return; onBack(); };

  const previewNode = (
    <PhoneFrame>
      {isMenu ? <MenuView data={draft.data} design={draft.design} title={title} preview slug="pv" />
        : stat ? <StaticPreview type={draft.type} data={draft.data} />
        : <SolutionView type={draft.type} data={draft.data} design={draft.design} title={title} preview />}
    </PhoneFrame>
  );

  return (
    <div>
      <div className="sx-row sx-wrap" style={{ marginBottom: 12 }}>
        <button type="button" className="sx-btn soft sm" onClick={back}><Ic n="chevL" size={14} /> Back</button>
        <div className="sx-grow" style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          <div className="sx-mut">{isMenu ? "Food menu" : SOL[draft.type]?.name}{dirty ? " · unsaved changes" : ""}</div>
        </div>
        {!stat && <button type="button" className="sx-btn sec sm sx-prev-btn" onClick={() => setPrev(true)}><Ic n="eye" size={14} /> Preview</button>}
        {stat && <button type="button" className="sx-btn sec sm sx-prev-btn" onClick={() => setPrev(true)}><Ic n="eye" size={14} /> Preview</button>}
        <Btn size="sm" onClick={() => save()} disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Create & publish"}</Btn>
      </div>
      {msg && <Note kind={msg.kind}>{msg.text}</Note>}

      <div className="sx-split">
        <div style={{ minWidth: 0 }}>
          <div className="sx-tabs" style={{ marginBottom: 14 }}>
            {tabs.map(([id, label, icon]) => <button key={id} type="button" className={`sx-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}><Ic n={icon} size={14} /> {label}</button>)}
          </div>
          <div className="sx-card">
            {isMenu && tab === "venue" && <VenueTab data={draft.data} set={setData} token={token} />}
            {isMenu && tab === "menu" && <MenuItemsTab data={draft.data} set={setData} token={token} />}
            {isMenu && tab === "look" && <LookTab data={draft.data} setData={setData} design={draft.design} setDesign={setDesign} token={token} />}
            {isMenu && tab === "order" && <OrderingTab data={draft.data} set={setData} />}
            {!isMenu && tab === "content" && (
              <>
                {stat && <Note>Instant QR: the information lives inside the code itself, so it works without internet. If you change it later, download and reprint the code.</Note>}
                {!stat && <Note kind="ok">This is a live page. Edit it any time and the same QR code and NFC tag keep working.</Note>}
                <SolutionFields type={draft.type} data={draft.data} set={setData} token={token} />
              </>
            )}
            {!isMenu && tab === "look" && <SolutionLook design={draft.design} setDesign={setDesign} />}
            {tab === "share" && <SharePanel draft={draft} setDraft={setDraft} setDirty={setDirty} token={token} onSave={() => save()} saving={saving} dirty={dirty} />}
          </div>
          <div className="sx-row" style={{ marginTop: 12 }}>
            <Btn onClick={() => save()} disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Create & publish"}</Btn>
            {draft.id && <Btn kind="soft" onClick={() => save(draft.status === "Published" ? "Draft" : "Published")} disabled={saving}>{draft.status === "Published" ? "Unpublish" : "Publish"}</Btn>}
          </div>
        </div>
        <div className="sx-prev-col sx-stick">{previewNode}<p className="sx-hint" style={{ textAlign: "center" }}>Live preview</p></div>
      </div>
      {prev && <Modal title="Preview" onClose={() => setPrev(false)}>{previewNode}</Modal>}
    </div>
  );
}

/* ----------------------------------------------------------- share panel */
function SharePanel({ draft, setDraft, setDirty, token, onSave, saving, dirty }) {
  const isMenu = draft.kind === "menu";
  const stat = !isMenu && isStatic(draft.type);
  const value = qrValueOf(draft);
  const qr = draft.design?.qr || DEFAULT_QR;
  const logo = isMenu ? draft.data.venue?.logo : draft.data?.image || null;
  const [tables, setTables] = useState(10);
  const [busy, setBusy] = useState(false);
  const [slugErr, setSlugErr] = useState("");
  const [pdfTheme, setPdfTheme] = useState("design");
  const [pdfQr, setPdfQr] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState("");
  const title = deriveTitle(draft.kind, draft.type, draft.data);

  if (!value) {
    return (
      <div style={{ textAlign: "center", padding: 20 }}>
        <Ic n="qr" size={36} color={K.violetDeep} />
        <p style={{ margin: "10px 0 14px" }}>Create your page first and its QR code and NFC tag appear here.</p>
        <Btn onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Create & publish now"}</Btn>
      </div>
    );
  }

  const setQr = (o) => setDraft(d => ({ ...d, design: { ...d.design, qr: o } }));
  const slugChange = (v) => {
    const s = slugify(v).slice(0, 40);
    setDraft(d => ({ ...d, slug: s })); setDirty(true);
    setSlugErr(s.length < 3 ? "At least 3 letters or numbers." : "");
  };
  const makeTables = async () => {
    setBusy(true);
    try { await tableCardsPdf({ title, baseUrl: pageUrl(draft.slug), tables: Array.from({ length: Math.max(1, Math.min(60, tables)) }, (_, i) => String(i + 1)), qr, logo: qr.logoOn ? logo : null, accent: qr.frameColor || "#14112C", filename: draft.slug }); }
    finally { setBusy(false); }
  };

  const makeMenuPdf = async () => {
    setPdfBusy(true); setPdfErr("");
    try { await menuPdf({ menu: draft.data, tokens: resolveTokens(draft.design), value, qr, theme: pdfTheme, showQr: pdfQr, filename: draft.slug || "menu" }); }
    catch (e) { setPdfErr(e.message || "Could not build the PDF. Please try again."); }
    finally { setPdfBusy(false); }
  };

  return (
    <div>
      {dirty && !stat && <Note>You have unsaved changes. Save so the live page matches what you see.</Note>}
      {!stat && (
        <Fld label="Your link" hint="This is where the QR code and NFC tag send people. Changing it breaks codes you've already printed.">
          <div className="sx-row"><span className="sx-mut" style={{ whiteSpace: "nowrap" }}>{window.location.origin}/p/</span><input value={draft.slug} onChange={e => slugChange(e.target.value)} /></div>
          {slugErr && <p className="sx-hint" style={{ color: K.warn }}>{slugErr}</p>}
          <div className="sx-row sx-wrap" style={{ marginTop: 8 }}>
            <CopyBtn text={value} label="Copy link" />
            <Btn size="sm" kind="soft" icon="ext" onClick={() => window.open(value, "_blank")}>Open page</Btn>
            <Btn size="sm" kind="soft" icon="share" onClick={() => { const t = `${title}: ${value}`; if (navigator.share) navigator.share({ title, url: value }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank"); }}>Share</Btn>
          </div>
        </Fld>
      )}
      <QRDesigner value={value} initial={qr} onChange={setQr} logo={logo} filename={draft.slug || draft.type} title={title}
        caption={isMenu ? "Scan to see our menu" : "Scan with your phone camera"} posterAccent={qr.frameColor} />
      {isMenu && (
        <div className="sx-card" style={{ marginTop: 12 }}>
          <div className="sx-row" style={{ marginBottom: 6 }}><Ic n="print" color={K.violetDeep} /><h3 className="sx-h3">Table cards</h3></div>
          <p className="sx-mut" style={{ marginBottom: 8 }}>One printable card per table (4 per A4 page). Each QR already knows its table number, so customers don't have to type it when ordering.</p>
          <div className="sx-row sx-wrap"><span style={{ fontSize: 13 }}>How many tables?</span><input type="number" min="1" max="60" value={tables} onChange={e => setTables(Number(e.target.value) || 1)} style={{ width: 80 }} />
            <Btn icon="download" onClick={makeTables} disabled={busy}>{busy ? "Building PDF…" : "Download table cards (PDF)"}</Btn></div>
        </div>
      )}
      {isMenu && (
        <div className="sx-card" style={{ marginTop: 12 }}>
          <div className="sx-row" style={{ marginBottom: 6 }}><Ic n="download" color={K.violetDeep} /><h3 className="sx-h3">Printable menu (PDF)</h3></div>
          <p className="sx-mut" style={{ marginBottom: 8 }}>A ready-to-print A4 menu with your categories, items, prices, contact details and QR code. Save your latest changes first so the PDF matches your menu.</p>
          <Fld label="Colours"><Chips value={pdfTheme} onChange={setPdfTheme} options={[{ id: "design", label: "Match my menu design" }, { id: "print", label: "Printer-friendly (white paper)" }]} /></Fld>
          <Toggle checked={pdfQr} onChange={setPdfQr} label="Add my QR code at the bottom" />
          {pdfErr && <Note kind="err">{pdfErr}</Note>}
          <Btn icon="download" onClick={makeMenuPdf} disabled={pdfBusy}>{pdfBusy ? "Building PDF…" : "Download menu (PDF)"}</Btn>
        </div>
      )}
      {/^https?:/i.test(value) && <div style={{ marginTop: 12 }}><NfcPanel url={value} /></div>}
      {stat && <Note>NFC tags can hold links. This type stores its data in the QR itself, so for NFC pick a live page type (like Links or Landing page).</Note>}
    </div>
  );
}

/* ----------------------------------------------------------- responses */
function csvCell(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function Responses({ token }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { pagesApi.entries(token).then(setRows).catch(e => setErr(e.message)); }, [token]);
  const remove = async (id) => { try { await pagesApi.removeEntry(id, token); setRows(r => r.filter(x => x._id !== id)); } catch (e) { setErr(e.message); } };
  const exportCsv = () => {
    const head = ["Date", "Page", "Type", "Name", "Phone", "Email", "Rating", "Message", "Details"];
    const lines = rows.map(r => [new Date(r.createdAt).toLocaleString(), r.page?.title || "", r.kind, r.name, r.phone, r.email, r.rating || "", r.message, Object.entries(r.fields || {}).map(([k, v]) => `${k}: ${v}`).join(" | ")].map(csvCell).join(","));
    downloadText([head.join(","), ...lines].join("\n"), "cardnova-responses.csv", "text/csv");
  };
  if (err) return <Note kind="err">{err}</Note>;
  if (!rows) return <p className="sx-mut"><Spinner /> Loading…</p>;
  if (!rows.length) return <div className="sx-card" style={{ textAlign: "center", padding: 24 }}><Ic n="users" size={28} color={K.mist} /><p className="sx-mut" style={{ marginTop: 8 }}>No responses yet. Feedback, form answers, RSVPs and food orders will show up here.</p></div>;
  const avg = rows.filter(r => r.rating).length ? (rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.filter(r => r.rating).length).toFixed(1) : null;
  return (
    <div>
      <div className="sx-row sx-wrap" style={{ marginBottom: 10 }}>
        <span className="sx-grow sx-mut">{rows.length} responses{avg ? ` · average rating ${avg}★` : ""}</span>
        <Btn size="sm" kind="soft" icon="download" onClick={exportCsv}>Export CSV</Btn>
      </div>
      {rows.map(r => (
        <div key={r._id} className="sx-card" style={{ marginBottom: 8, padding: 12 }}>
          <div className="sx-row sx-wrap" style={{ alignItems: "flex-start" }}>
            <div className="sx-grow">
              <div style={{ fontWeight: 700 }}>{r.name || "Anonymous"} {r.rating ? <span style={{ color: "#F5B400" }}>{"★".repeat(r.rating)}</span> : null}</div>
              <div className="sx-mut">{r.page?.title || "Page"} · {r.kind} · {new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <button type="button" aria-label="Delete" onClick={() => remove(r._id)}><Ic n="trash" size={15} color={K.warn} /></button>
          </div>
          {(r.phone || r.email) && <p style={{ marginTop: 4, fontSize: 13 }}>{[r.phone, r.email].filter(Boolean).join(" · ")}</p>}
          {r.message && <p style={{ marginTop: 4, whiteSpace: "pre-wrap", fontSize: 13 }}>{r.message}</p>}
          {Object.keys(r.fields || {}).length > 0 && <div style={{ marginTop: 4, fontSize: 12.5, color: K.mist }}>{Object.entries(r.fields).map(([k, v]) => <div key={k}><b style={{ color: K.ink }}>{k}:</b> {v}</div>)}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- public page */
export function StudioPublic({ slug }) {
  const [state, setState] = useState({ phase: "loading" });
  const params = new URLSearchParams(window.location.search);
  const tableNo = params.get("t") || "";

  useEffect(() => {
    let dead = false;
    const t0 = Date.now();
    pagesApi.getPublic(slug).then(async (p) => {
      // menus and pages get a short branded splash; instant redirects skip it
      const quick = p.kind === "solution" && ["url", "smart"].includes(p.type);
      if (!quick) await new Promise(r => setTimeout(r, Math.max(0, 900 - (Date.now() - t0))));
      if (!dead) setState({ phase: "ready", page: p });
    }).catch(e => { if (!dead) setState({ phase: "error", message: e.message }); });
    return () => { dead = true; };
  }, [slug]);

  const onEntry = (entry) => pagesApi.submit(slug, entry);

  if (state.phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: K.ink, color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
        <StudioStyles />
        <div className="sx-spin" style={{ width: 34, height: 34, border: "3px solid #ffffff33", borderTopColor: "#fff", borderRadius: "50%", marginBottom: 14 }} />
        <p style={{ opacity: 0.8, fontSize: 14 }}>Opening…</p>
      </div>
    );
  }
  if (state.phase === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: K.fog, textAlign: "center", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div><p style={{ fontSize: 18, fontWeight: 600, color: K.ink }}>Page not found</p><p style={{ color: K.mist, marginTop: 6 }}>{state.message}</p></div>
      </div>
    );
  }
  const p = state.page;
  if (p.kind === "menu") {
    const t = resolveTokens(p.design);
    return <div className="sx" style={{ background: t.bg, minHeight: "100vh", fontSize: "inherit" }}><StudioStyles /><div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}><MenuView data={p.data} design={p.design} title={p.title} tableNo={tableNo} slug={p.slug} onOrder={onEntry} /></div></div>;
  }
  return <div className="sx" style={{ fontSize: "inherit" }}><StudioStyles /><SolutionView type={p.type} data={p.data} design={p.design} title={p.title} onEntry={onEntry} /></div>;
}
