// org.jsx — the Organisation member portal (/o/<name>) and the lost-card-aware NFC card page (/c/<token>).
// Members sign up with a join code, wait for admin approval, then sign in with a code they chose themselves.
// Three admin levels: 1 Messenger · 2 Manager · 3 Owner. Everything talks to /api/org.
import React, { useState, useEffect, useMemo } from "react";
import { Ic, K, StudioStyles, Btn, Fld, Chips, Toggle, Note, Spinner, CopyBtn, NfcPanel, uid, downloadText, safeUrl, waNumber, qrDataUrl, DEFAULT_QR } from "./kit.jsx";
import { PhoneFrame } from "./menu.jsx";
import { OrgView, OrgLook, orgTokens, orgContacts, FieldsEditor, makeOrgVcard, SOL } from "./solutions.jsx";

/* ------------------------------------------------------------------ api */
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
async function oreq(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}/org${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || `Request failed (${res.status})`); e.status = res.status; e.data = data; throw e; }
  return data;
}
export const orgApi = {
  mine: (t) => oreq("/mine", { token: t }),
  create: (b, t) => oreq("/", { method: "POST", body: b, token: t }),
  portalToken: (id, t) => oreq(`/${id}/portal-token`, { method: "POST", token: t }),
  pub: (slug) => oreq(`/public/${encodeURIComponent(slug)}`),
  card: (tok) => oreq(`/card/${encodeURIComponent(tok)}`),
  cardLoc: (tok, b) => oreq(`/card/${encodeURIComponent(tok)}/location`, { method: "POST", body: b }),
  post: (slug, p, b) => oreq(`/${encodeURIComponent(slug)}/${p}`, { method: "POST", body: b }),
  as: (slug, tk) => {
    const u = (p) => `/${encodeURIComponent(slug)}/${p}`;
    return { get: (p) => oreq(u(p), { token: tk }), post: (p, b) => oreq(u(p), { method: "POST", body: b || {}, token: tk }), put: (p, b) => oreq(u(p), { method: "PUT", body: b, token: tk }), patch: (p, b) => oreq(u(p), { method: "PATCH", body: b, token: tk }), del: (p) => oreq(u(p), { method: "DELETE", token: tk }) };
  },
};
const skey = (slug) => `org-session-${slug}`;
export const saveOrgSession = (slug, tk) => { try { localStorage.setItem(skey(slug), tk); } catch { /* private mode */ } };
const readSession = (slug) => { try { return localStorage.getItem(skey(slug)) || ""; } catch { return ""; } };
const clearSession = (slug) => { try { localStorage.removeItem(skey(slug)); } catch { /* ignore */ } };

const when = (iso) => { try { return new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const LEVELS = ["Member", "Messenger", "Manager", "Owner"];
const LEVEL_HELP = ["Reads messages and manages their own cards.", "Writes, edits and deletes messages.", "Messenger + approves members, issues & deactivates cards, sees card tracking.", "Everything, plus admin levels, page design, settings and deleting."];
const cur = (t) => ({ ink: t.title, accent: t.accent, btn: t.btn });
const useAsync = (fn, deps) => {
  const [st, setSt] = useState({ loading: true, data: null, err: "" });
  const run = async () => { setSt(s => ({ ...s, loading: true, err: "" })); try { setSt({ loading: false, data: await fn(), err: "" }); } catch (e) { setSt({ loading: false, data: null, err: e.message, status: e.status }); } };
  useEffect(() => { run(); }, deps || []);
  return [st, run, setSt];
};

/* --------------------------------------------------------- page chrome */
function Shell({ info, children, wide }) {
  const t = orgTokens(info?.design);
  return (
    <div className="sx" style={{ minHeight: "100vh", background: `linear-gradient(170deg, ${t.bg1}, ${t.bg2})`, padding: "20px 14px 40px" }}>
      <StudioStyles />
      <div style={{ maxWidth: wide ? 1040 : 440, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
function Brand({ info }) {
  const t = orgTokens(info?.design);
  const dark = true;
  return (
    <div style={{ textAlign: "center", color: "#fff", marginBottom: 16 }}>
      {info?.logo && <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fff", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,.28)" }}><img src={info.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>}
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{info?.name}</h1>
      {info?.tagline && <p style={{ opacity: .9, marginTop: 2 }}>{info.tagline}</p>}
    </div>
  );
}

/* ------------------------------------------------------- sign in / up */
function AuthScreen({ slug, info, onSignedIn }) {
  const qs = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(qs.get("reset") ? "reset" : qs.get("verify") ? "verify" : "in");
  const [f, setF] = useState({ name: "", email: "", phone: "", code: "", code2: "", joinCode: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const say = (kind, text) => setMsg({ kind, text });
  const clearQs = () => { try { window.history.replaceState({}, "", window.location.pathname); } catch { /* ignore */ } };
  const t = orgTokens(info.design);

  useEffect(() => {
    if (mode !== "verify") return;
    const tok = qs.get("verify");
    orgApi.post(slug, "verify", { token: tok }).then(r => { say("ok", r.message); setMode("in"); clearQs(); }).catch(e => { say("err", e.message); setMode("in"); clearQs(); });
  }, []);

  const go = async (fn) => { setBusy(true); say("", ""); try { await fn(); } catch (e) { say("err", e.message); } finally { setBusy(false); } };
  const signIn = (e) => { e.preventDefault(); go(async () => { const r = await orgApi.post(slug, "login", { email: f.email, code: f.code }); saveOrgSession(slug, r.token); onSignedIn(r.token); }); };
  const signUp = (e) => {
    e.preventDefault();
    if (f.code !== f.code2) return say("err", "The two codes don't match.");
    go(async () => { const r = await orgApi.post(slug, "signup", { name: f.name, email: f.email, phone: f.phone, code: f.code, joinCode: f.joinCode, consent: f.consent }); say("ok", r.message); setMode("in"); setF(x => ({ ...x, code: "", code2: "" })); });
  };
  const forgot = (e) => { e.preventDefault(); go(async () => { const r = await orgApi.post(slug, "forgot", { email: f.email }); say("ok", r.message); }); };
  const reset = (e) => {
    e.preventDefault();
    if (f.code !== f.code2) return say("err", "The two codes don't match.");
    go(async () => { const r = await orgApi.post(slug, "reset", { token: qs.get("reset"), code: f.code }); say("ok", r.message); clearQs(); setMode("in"); setF(x => ({ ...x, code: "", code2: "" })); });
  };

  const card = { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 8px 30px rgba(0,0,0,.25)" };
  return (
    <Shell info={info}>
      <Brand info={info} />
      <div style={card}>
        {mode !== "reset" && <div className="sx-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={`sx-tab ${mode === "in" || mode === "forgot" ? "on" : ""}`} onClick={() => { setMode("in"); say("", ""); }}>Sign in</button>
          <button type="button" className={`sx-tab ${mode === "up" ? "on" : ""}`} onClick={() => { setMode("up"); say("", ""); }}>Join</button>
        </div>}
        {msg.text && <Note kind={msg.kind}>{msg.text}</Note>}

        {mode === "in" && (
          <form onSubmit={signIn}>
            <Fld label="Email"><input type="email" autoComplete="username" value={f.email} onChange={e => set("email", e.target.value)} required /></Fld>
            <Fld label="Your access code"><input type="password" autoComplete="current-password" value={f.code} onChange={e => set("code", e.target.value)} required /></Fld>
            <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</Btn>
            <p style={{ textAlign: "center", marginTop: 12 }}><button type="button" className="sx-mut" style={{ textDecoration: "underline", fontSize: 13 }} onClick={() => { setMode("forgot"); say("", ""); }}>Forgot code?</button></p>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={forgot}>
            <p className="sx-mut" style={{ marginBottom: 10 }}>Enter your email. We'll send a one-time link (valid for 30 minutes) to choose a new code.</p>
            <Fld label="Email"><input type="email" value={f.email} onChange={e => set("email", e.target.value)} required /></Fld>
            <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending…" : "Send reset link"}</Btn>
            <p style={{ textAlign: "center", marginTop: 12 }}><button type="button" className="sx-mut" style={{ textDecoration: "underline", fontSize: 13 }} onClick={() => { setMode("in"); say("", ""); }}>Back to sign in</button></p>
          </form>
        )}

        {mode === "up" && (
          <form onSubmit={signUp}>
            <p className="sx-mut" style={{ marginBottom: 10 }}>Ask an admin for the join code. After you join, an admin approves your account{info.emailEnabled ? " and you confirm your email" : ""}.</p>
            <Fld label="Join code"><input value={f.joinCode} onChange={e => set("joinCode", e.target.value)} autoCapitalize="characters" required /></Fld>
            <Fld label="Your name"><input value={f.name} onChange={e => set("name", e.target.value)} required /></Fld>
            <Fld label="Email"><input type="email" value={f.email} onChange={e => set("email", e.target.value)} required /></Fld>
            <Fld label="Phone (optional)"><input type="tel" value={f.phone} onChange={e => set("phone", e.target.value)} /></Fld>
            <Fld label="Create your access code" hint="At least 6 characters. You choose it — nobody else knows it."><input type="password" autoComplete="new-password" value={f.code} onChange={e => set("code", e.target.value)} required minLength={6} /></Fld>
            <Fld label="Repeat your code"><input type="password" autoComplete="new-password" value={f.code2} onChange={e => set("code2", e.target.value)} required /></Fld>
            <Toggle checked={f.consent} onChange={v => set("consent", v)} label="I agree that my name, email and phone are stored by this organisation, and that taps of my organisation card are recorded (time, device and approximate area)." />
            <Btn type="submit" disabled={busy || !f.consent} style={{ width: "100%" }}>{busy ? "Joining…" : "Join"}</Btn>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={reset}>
            <h3 className="sx-h3" style={{ marginBottom: 8 }}>Choose your new code</h3>
            <Fld label="New access code" hint="At least 6 characters."><input type="password" autoComplete="new-password" value={f.code} onChange={e => set("code", e.target.value)} required minLength={6} /></Fld>
            <Fld label="Repeat it"><input type="password" autoComplete="new-password" value={f.code2} onChange={e => set("code2", e.target.value)} required /></Fld>
            <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Saving…" : "Save new code"}</Btn>
          </form>
        )}
      </div>
      <p style={{ textAlign: "center", color: "#fff", opacity: .7, fontSize: 11, marginTop: 14 }}>Members' area · Powered by CardNova</p>
    </Shell>
  );
}

/* ------------------------------------------------------------ portal */
export function OrgPortal({ slug }) {
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [token, setToken] = useState(() => readSession(slug));
  useEffect(() => { orgApi.pub(slug).then(setInfo).catch(e => setErr(e.message)); }, [slug]);
  if (err) return <div className="sx" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}><StudioStyles /><div><h2 className="sx-h">Organisation not found</h2><p className="sx-mut" style={{ marginTop: 6 }}>{err}</p></div></div>;
  if (!info) return <div className="sx" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><StudioStyles /><Spinner /></div>;
  if (!token) return <AuthScreen slug={slug} info={info} onSignedIn={setToken} />;
  return <Signed slug={slug} info={info} token={token} onOut={() => { clearSession(slug); setToken(""); }} />;
}

function ForceChange({ api, onDone }) {
  const [f, setF] = useState({ a: "", b: "", c: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    if (f.b !== f.c) return setMsg("The two new codes don't match.");
    setBusy(true); setMsg("");
    try { await api.post("me/code", { oldCode: f.a, newCode: f.b }); onDone(); } catch (ex) { setMsg(ex.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={go}>
      <Note>An admin gave you a temporary code. Please choose your own code now — only you will know it.</Note>
      {msg && <Note kind="err">{msg}</Note>}
      <Fld label="Temporary code"><input type="password" value={f.a} onChange={e => setF({ ...f, a: e.target.value })} required /></Fld>
      <Fld label="New code (6+ characters)"><input type="password" value={f.b} onChange={e => setF({ ...f, b: e.target.value })} required minLength={6} /></Fld>
      <Fld label="Repeat new code"><input type="password" value={f.c} onChange={e => setF({ ...f, c: e.target.value })} required /></Fld>
      <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save my code"}</Btn>
    </form>
  );
}

function Signed({ slug, info, token, onOut }) {
  const api = useMemo(() => orgApi.as(slug, token), [slug, token]);
  const [st, reload] = useAsync(() => api.get("me"), [slug, token]);
  const [tab, setTab] = useState("home");
  useEffect(() => { if (st.status === 401) onOut(); }, [st.status]);
  if (st.loading && !st.data) return <Shell info={info}><div style={{ textAlign: "center", padding: 40 }}><Spinner /></div></Shell>;
  if (st.err && !st.data) return <Shell info={info}><Note kind="err">{st.err}</Note><Btn onClick={reload}>Try again</Btn></Shell>;
  const me = st.data;
  const lv = me.member.level || 0;
  const tabs = [
    { id: "home", label: "Home", icon: "home", min: 0 },
    ...(lv >= 1 ? [{ id: "messages", label: "Messages", icon: "bell", min: 1 }, { id: "members", label: "Members", icon: "users", min: 1, badge: lv >= 2 && me.pending ? me.pending : 0 }] : []),
    ...(lv >= 2 ? [{ id: "cards", label: "Cards", icon: "nfc", min: 2 }, { id: "tracking", label: "Tracking", icon: "pin", min: 2 }] : []),
    { id: "mycards", label: "My cards", icon: "ticket", min: 0 },
    { id: "account", label: "My account", icon: "lock", min: 0 },
    ...(lv >= 3 ? [{ id: "settings", label: "Settings", icon: "palette", min: 3 }] : []),
  ];
  const orgInfo = { ...info, name: me.org.name, design: me.org.design, logo: me.org.profile?.image || info.logo };
  const profile = { ...(me.org.profile || {}), name: me.org.name };
  return (
    <Shell info={orgInfo} wide>
      <div className="sx-row" style={{ color: "#fff", marginBottom: 12 }}>
        <div className="sx-grow"><b>{me.org.name}</b><div style={{ fontSize: 12, opacity: .85 }}>{me.member.name} · {LEVELS[lv]}</div></div>
        <button type="button" onClick={onOut} style={{ color: "#fff", border: "1.5px solid rgba(255,255,255,.5)", borderRadius: 9, padding: "6px 12px", fontSize: 13 }}>Sign out</button>
      </div>
      <div className="sx-tabs" style={{ marginBottom: 12 }}>
        {tabs.map(x => <button key={x.id} type="button" className={`sx-tab ${tab === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}><Ic n={x.icon} size={14} />{x.label}{x.badge ? <span className="sx-pill" style={{ background: K.warn, color: "#fff" }}>{x.badge}</span> : null}</button>)}
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: tab === "home" ? 0 : 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
        {me.mustChange ? <div style={{ padding: 16 }}><ForceChange api={api} onDone={reload} /></div> : (
          <>
            {tab === "home" && <>
              {lv >= 2 && me.pending > 0 && <div style={{ padding: 12 }}><Note>{me.pending} new member{me.pending > 1 ? "s are" : " is"} waiting for approval. <button type="button" style={{ textDecoration: "underline", fontWeight: 700 }} onClick={() => setTab("members")}>Review now</button></Note></div>}
              <OrgView data={profile} design={me.org.design} title={me.org.name} chrome={false} messagesNode={<PortalMessages messages={me.messages} t={orgTokens(me.org.design)} />} />
            </>}
            {tab === "messages" && <MessagesAdmin api={api} me={me} />}
            {tab === "members" && <MembersAdmin api={api} me={me} slug={slug} onChanged={reload} />}
            {tab === "cards" && <CardsAdmin api={api} me={me} />}
            {tab === "tracking" && <Tracking api={api} />}
            {tab === "mycards" && <MyCards api={api} />}
            {tab === "account" && <Account api={api} me={me} onSaved={reload} />}
            {tab === "settings" && <OrgSettings slug={slug} orgToken={token} onSaved={reload} />}
          </>
        )}
      </div>
    </Shell>
  );
}

function PortalMessages({ messages, t }) {
  return (
    <div id="org-msgs" style={{ background: t.card, borderRadius: 14, padding: "16px 18px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.12)" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 700, color: t.title, display: "flex", alignItems: "center", gap: 8 }}><Ic n="bell" size={19} />Messages</h2>
      {messages.length === 0 && <p style={{ color: "#777", margin: "6px 0 0" }}>No messages yet.</p>}
      {messages.map((m, i) => (
        <div key={m.id} style={{ padding: "12px 0", borderTop: i ? "1px solid #ececec" : "none" }}>
          {m.title && <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: t.title }}>{m.title}</p>}
          <p style={{ margin: "2px 0 6px", fontSize: 11.5, color: t.accent }}>{when(m.at)}{m.edited ? " · edited" : ""}{m.targeted ? " · just for you" : ""}{m.author ? ` · ${m.author}` : ""}</p>
          {m.body && <p style={{ margin: 0, fontSize: 14.5, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</p>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------- shared: QR, preview */
function QrBox({ value, name, size = 150 }) {
  const [url, setUrl] = useState("");
  useEffect(() => { let dead = false; qrDataUrl(value, { ...DEFAULT_QR, frame: "none" }, null).then(r => { if (!dead) setUrl(r.url); }).catch(() => {}); return () => { dead = true; }; }, [value]);
  return (
    <div style={{ textAlign: "center" }}>
      {url ? <img src={url} alt="QR code" style={{ width: size, height: size, background: "#fff", borderRadius: 8, border: "1px solid #ddd" }} /> : <Spinner />}
      <div style={{ marginTop: 6 }}><Btn size="sm" kind="soft" icon="download" disabled={!url} onClick={() => { const a = document.createElement("a"); a.href = url; a.download = `${name || "qr"}.png`; a.click(); }}>Download QR</Btn></div>
    </div>
  );
}
// Editor on the left, live preview on the right (drops below on a phone).
function WithPreview({ label = "Live preview", preview, children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 340px", minWidth: 0 }}>{children}</div>
      <div style={{ flex: "0 0 300px", maxWidth: "100%", position: "sticky", top: 8, margin: "0 auto" }}>
        <p className="sx-mut" style={{ textAlign: "center", marginBottom: 6, fontWeight: 600 }}>{label}</p>
        <PhoneFrame>{preview}</PhoneFrame>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ small helpers */
const Empty = ({ children }) => <p className="sx-mut" style={{ padding: "14px 0" }}>{children}</p>;
function useAct() {
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const run = async (fn, ok) => { setMsg({ kind: "", text: "" }); try { const r = await fn(); if (ok !== false) setMsg({ kind: "ok", text: (typeof ok === "string" ? ok : r?.message) || "Done." }); return r; } catch (e) { setMsg({ kind: "err", text: e.message }); return null; } };
  return [msg, run, setMsg];
}
const Msg = ({ m }) => (m.text ? <Note kind={m.kind}>{m.text}</Note> : null);
const mapLink = (s) => (s.lat != null ? `https://www.google.com/maps?q=${s.lat},${s.lng}` : s.city ? `https://www.google.com/maps/search/${encodeURIComponent([s.city, s.region, s.country].filter(Boolean).join(", "))}` : "");
const place = (s) => (s.gps ? `GPS ±${Math.round(s.accuracy || 0)} m` : [s.city, s.region, s.country].filter(Boolean).join(", ") || "Location unknown");

/* ----------------------------------------------------------- messages */
function MessagesAdmin({ api, me }) {
  const [st, reload] = useAsync(async () => ({ msgs: await api.get("admin/messages"), members: await api.get("admin/members") }), []);
  const [form, setForm] = useState(null); // {id?, title, body, audience, to}
  const [msg, act] = useAct();
  if (st.loading && !st.data) return <Spinner />;
  if (st.err) return <Note kind="err">{st.err}</Note>;
  const { msgs, members } = st.data;
  const active = members.filter(m => m.status === "active");
  const save = async () => {
    const body = { title: form.title, body: form.body, audience: form.audience, to: form.to };
    const r = await act(() => (form.id ? api.put(`admin/messages/${form.id}`, body) : api.post("admin/messages", body)), form.id ? "Message updated. Every member sees the new version." : "Message sent to the chosen members.");
    if (r) { setForm(null); reload(); }
  };
  const del = async (m) => { if (!window.confirm("Delete this message for everyone?")) return; if (await act(() => api.del(`admin/messages/${m.id}`), "Message deleted.")) reload(); };
  return (
    <div>
      <Msg m={msg} />
      {!form && <Btn icon="plus" onClick={() => setForm({ title: "", body: "", audience: "all", to: [] })}>Write a message</Btn>}
      {form && (
        <div className="sx-card" style={{ marginBottom: 14 }}>
          <h3 className="sx-h3">{form.id ? "Edit message" : "New message"}</h3>
          <Fld label="Heading"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Fld>
          <Fld label="Message"><textarea rows={5} maxLength={4000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></Fld>
          <Fld label="Who gets it?">
            <Chips value={form.audience} onChange={v => setForm({ ...form, audience: v })} options={[{ id: "all", label: "Every member" }, { id: "some", label: "Only selected members" }]} />
          </Fld>
          {form.audience === "some" && (
            <Fld label={`Selected members (${form.to.length})`} hint="Everyone else will not see this message at all.">
              <Chips multi value={form.to} onChange={v => setForm({ ...form, to: v })} options={active.map(m => ({ id: m.id, label: m.name }))} />
            </Fld>
          )}
          <div className="sx-row"><Btn onClick={save} disabled={!form.title && !form.body}>{form.id ? "Save changes" : "Send"}</Btn><Btn kind="soft" onClick={() => setForm(null)}>Cancel</Btn></div>
        </div>
      )}
      {msgs.length === 0 && <Empty>No messages yet.</Empty>}
      {msgs.map(m => (
        <div key={m.id} className="sx-card" style={{ marginTop: 10 }}>
          <div className="sx-row"><div className="sx-grow"><b>{m.title || "(no heading)"}</b>
            <div className="sx-mut" style={{ fontSize: 12 }}>{when(m.at)}{m.edited ? " · edited" : ""} · {m.author} · {m.audience === "all" ? "Everyone" : `Only: ${m.toNames.join(", ")}`}</div></div>
            <Btn kind="soft" size="sm" icon="edit" onClick={() => setForm({ id: m.id, title: m.title, body: m.body, audience: m.audience, to: m.to })}>Edit</Btn>
            <Btn kind="danger" size="sm" icon="trash" onClick={() => del(m)}>Delete</Btn></div>
          <p style={{ marginTop: 6, whiteSpace: "pre-wrap", fontSize: 14 }}>{m.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ members */
function MembersAdmin({ api, me, slug, onChanged }) {
  const lv = me.member.level;
  const [st, reload] = useAsync(() => api.get("admin/members"), []);
  const [msg, act] = useAct();
  const [add, setAdd] = useState(null);
  const [temp, setTemp] = useState(null);
  if (st.loading && !st.data) return <Spinner />;
  if (st.err) return <Note kind="err">{st.err}</Note>;
  const list = st.data;
  const canManage = (m) => lv >= 2 && m.id !== me.member.id && (lv >= 3 || m.level < lv);
  const patch = async (m, p, ok) => { if (await act(() => api.patch(`admin/members/${m.id}`, p), ok || "Saved.")) { reload(); onChanged && onChanged(); } };
  const resetCode = async (m) => { const r = await act(() => api.post(`admin/members/${m.id}/reset-code`), false); if (r?.tempCode) setTemp({ name: m.name, code: r.tempCode }); else if (r) setTemp({ name: m.name, text: r.message }); };
  const remove = async (m) => { if (!window.confirm(`Remove ${m.name} permanently?`)) return; if (await act(() => api.del(`admin/members/${m.id}`), "Member removed.")) reload(); };
  const addSave = async () => { const r = await act(() => api.post("admin/members", add), false); if (r) { setTemp({ name: add.name, code: r.tempCode, text: r.tempCode ? "" : r.message }); setAdd(null); reload(); } };
  const pending = list.filter(m => m.status === "pending");
  const Row = ({ m }) => (
    <div className="sx-card" style={{ marginTop: 8 }}>
      <div className="sx-row sx-wrap">
        <div className="sx-grow" style={{ minWidth: 150 }}><b>{m.name}</b><div className="sx-mut" style={{ fontSize: 12 }}>{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
          <div className="sx-mut" style={{ fontSize: 12 }}>{LEVELS[m.level]} · <span className={`sx-pill ${m.status === "active" ? "ok" : ""}`}>{m.status}</span>{m.lastLoginAt ? ` · last in ${when(m.lastLoginAt)}` : ""}</div></div>
        {canManage(m) && <div className="sx-row sx-wrap">
          {m.status === "pending" && <><Btn size="sm" icon="check" onClick={() => patch(m, { status: "active" }, "Approved.")}>Approve</Btn><Btn size="sm" kind="danger" onClick={() => patch(m, { status: "rejected" }, "Rejected.")}>Reject</Btn></>}
          {m.status === "active" && <Btn size="sm" kind="soft" onClick={() => patch(m, { status: "suspended" }, "Suspended — they can't sign in.")}>Suspend</Btn>}
          {(m.status === "suspended" || m.status === "rejected") && <Btn size="sm" kind="soft" onClick={() => patch(m, { status: "active" }, "Member is active.")}>Activate</Btn>}
          <Btn size="sm" kind="soft" icon="lock" onClick={() => resetCode(m)}>Reset code</Btn>
          {lv >= 3 && <select value={m.level} onChange={e => patch(m, { level: Number(e.target.value) }, "Level changed.")} style={{ width: "auto" }}>{LEVELS.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>}
          {lv >= 3 && <Btn size="sm" kind="danger" icon="trash" onClick={() => remove(m)}>Remove</Btn>}
        </div>}
      </div>
    </div>
  );
  return (
    <div>
      <Msg m={msg} />
      {temp && (
        <Note kind="ok">
          {temp.code ? <>Temporary code for <b>{temp.name}</b>: <b style={{ fontSize: 18, letterSpacing: 2 }}>{temp.code}</b> <CopyBtn text={temp.code} /> — shown once. They choose their own after signing in.</> : temp.text}
          {" "}<button type="button" style={{ textDecoration: "underline" }} onClick={() => setTemp(null)}>Hide</button>
        </Note>
      )}
      {lv >= 2 && !add && <Btn icon="plus" onClick={() => setAdd({ name: "", email: "", phone: "", level: 0 })}>Add a member</Btn>}
      {add && (
        <div className="sx-card" style={{ marginBottom: 12 }}>
          <h3 className="sx-h3">Add a member</h3>
          <Fld label="Name"><input value={add.name} onChange={e => setAdd({ ...add, name: e.target.value })} /></Fld>
          <Fld label="Email"><input type="email" value={add.email} onChange={e => setAdd({ ...add, email: e.target.value })} /></Fld>
          <Fld label="Phone (optional)"><input type="tel" value={add.phone} onChange={e => setAdd({ ...add, phone: e.target.value })} /></Fld>
          {lv >= 3 && <Fld label="Level" hint={LEVEL_HELP[add.level]}><Chips value={add.level} onChange={v => setAdd({ ...add, level: v })} options={LEVELS.map((n, i) => ({ id: i, label: n }))} /></Fld>}
          <div className="sx-row"><Btn onClick={addSave} disabled={!add.name || !add.email}>Add</Btn><Btn kind="soft" onClick={() => setAdd(null)}>Cancel</Btn></div>
        </div>
      )}
      {pending.length > 0 && <><h3 className="sx-h3" style={{ marginTop: 14 }}>Waiting for approval ({pending.length})</h3>{pending.map(m => <Row key={m.id} m={m} />)}</>}
      <h3 className="sx-h3" style={{ marginTop: 14 }}>All members ({list.length})</h3>
      {list.filter(m => m.status !== "pending").map(m => <Row key={m.id} m={m} />)}
      {lv >= 3 && <p className="sx-mut" style={{ fontSize: 12, marginTop: 14 }}>{LEVELS.slice(1).map((n, i) => `${n}: ${LEVEL_HELP[i + 1]}`).join("  ·  ")}</p>}
    </div>
  );
}

/* -------------------------------------------------------------- cards */
// The member card as a visitor sees it (used on /c/<token> and in the editor preview).
function CardFace({ org, card, preview }) {
  const t = orgTokens(org.design);
  const c = orgContacts(card);
  const links = (card.links || []).filter(l => safeUrl(l.url));
  const vcf = () => downloadText(makeOrgVcard({ name: card.name, phone: card.phone, email: card.email, whatsapp: card.whatsapp, phones: card.phones, emails: card.emails, whatsapps: card.whatsapps, links: [...(card.website ? [{ url: card.website }] : []), ...(card.links || [])] }, ""), `${(card.name || "contact").replace(/\s+/g, "_")}.vcf`, "text/vcard");
  const A = ({ href, soft, children }) => <a className={`sx-btn ${soft ? "soft" : ""}`} href={preview ? undefined : href} onClick={preview ? e => e.preventDefault() : undefined}>{children}</a>;
  return (
    <div style={{ background: t.card, borderRadius: 16, padding: 20, textAlign: "center", color: "#333", boxShadow: "0 8px 30px rgba(0,0,0,.25)" }}>
      {card.photo && safeUrl(card.photo) && <img src={card.photo} alt="" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px", display: "block" }} />}
      <h2 style={{ fontSize: 21, fontWeight: 700, color: t.title }}>{card.name || (preview ? "Member name" : "")}</h2>
      {(card.title || card.company) && <p style={{ color: t.accent, fontWeight: 600 }}>{[card.title, card.company].filter(Boolean).join(" · ")}</p>}
      {card.bio && <p style={{ marginTop: 8, fontSize: 14, whiteSpace: "pre-wrap" }}>{card.bio}</p>}
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {c.phones.map((x, i) => <A key={"p" + i} href={`tel:${x.value.replace(/\s/g, "")}`}>Call {x.label ? `${x.label}: ` : ""}{x.value}</A>)}
        {c.whatsapps.map((x, i) => <A key={"w" + i} href={`https://wa.me/${waNumber(x.value)}`}>WhatsApp{x.label ? ` ${x.label}` : ""}: {x.value}</A>)}
        {c.emails.map((x, i) => <A key={"e" + i} href={`mailto:${x.value}`}>{x.label ? `${x.label}: ` : ""}{x.value}</A>)}
        {card.website && safeUrl(card.website) && <A soft href={card.website}>Website</A>}
        {links.map((l, i) => <A key={i} soft href={l.url}>{l.title || l.url}</A>)}
        <button type="button" className="sx-btn dark" onClick={preview ? undefined : vcf}>Save contact</button>
      </div>
    </div>
  );
}

// Add-as-many-as-you-like rows: label + value.
function MultiList({ title, kind, items, onChange, add, ph }) {
  const list = items || [];
  const set = (i, k, v) => onChange(list.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <Fld label={title}>
      {list.map((x, i) => (
        <div key={i} className="sx-row" style={{ marginBottom: 6 }}>
          <input placeholder="Label (optional)" value={x.label || ""} onChange={e => set(i, "label", e.target.value)} style={{ maxWidth: 130 }} />
          <input type={kind} placeholder={ph} value={x.value || ""} onChange={e => set(i, "value", e.target.value)} />
          <Btn size="sm" kind="danger" icon="x" onClick={() => onChange(list.filter((_, j) => j !== i))} />
        </div>
      ))}
      {list.length < 8 && <Btn size="sm" kind="soft" icon="plus" onClick={() => onChange([...list, { label: "", value: "" }])}>{add}</Btn>}
    </Fld>
  );
}

function CardEditor({ card, members, org, onSave, onCancel }) {
  const [f, setF] = useState({ label: card?.label || "", memberId: card?.member || "", profile: { links: [], phones: [], emails: [], whatsapps: [], ...(card?.profile || {}) } });
  const p = f.profile, setP = (k, v) => setF({ ...f, profile: { ...p, [k]: v } });
  const pickMember = (id) => { const m = members.find(x => x.id === id); setF({ ...f, memberId: id, label: f.label || m?.name || "", profile: { ...p, name: p.name || m?.name || "", phone: p.phone || m?.phone || "", email: p.email || m?.email || "" } }); };
  const links = p.links || [];
  const ot = orgTokens(org.design);
  return (
    <div className="sx-card" style={{ marginBottom: 12 }}>
      <h3 className="sx-h3">{card ? "Edit card" : "New card"}</h3>
      <WithPreview label="What the card will show" preview={<div style={{ background: `linear-gradient(170deg, ${ot.bg1}, ${ot.bg2})`, minHeight: "100%", padding: 14 }}><CardFace org={org} card={p} preview /></div>}>
        <Fld label="Belongs to member"><select value={f.memberId} onChange={e => pickMember(e.target.value)}><option value="">— nobody yet —</option>{members.filter(m => m.status === "active").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Fld>
        <Fld label="Card label (only admins see this)"><input value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="e.g. Jane – spare card" /></Fld>
        <div className="sx-two">
          <Fld label="Name on card"><input value={p.name || ""} onChange={e => setP("name", e.target.value)} /></Fld>
          <Fld label="Job title"><input value={p.title || ""} onChange={e => setP("title", e.target.value)} /></Fld>
          <Fld label="Main phone"><input type="tel" value={p.phone || ""} onChange={e => setP("phone", e.target.value)} /></Fld>
          <Fld label="Main email"><input type="email" value={p.email || ""} onChange={e => setP("email", e.target.value)} /></Fld>
          <Fld label="Main WhatsApp"><input type="tel" value={p.whatsapp || ""} onChange={e => setP("whatsapp", e.target.value)} /></Fld>
          <Fld label="Website"><input value={p.website || ""} onChange={e => setP("website", e.target.value)} /></Fld>
        </div>
        <MultiList title="More phone numbers" kind="tel" ph="0712 345 678" add="Add a phone number" items={p.phones} onChange={v => setP("phones", v)} />
        <MultiList title="More emails" kind="email" ph="name@example.com" add="Add an email" items={p.emails} onChange={v => setP("emails", v)} />
        <MultiList title="More WhatsApp numbers" kind="tel" ph="0712 345 678" add="Add a WhatsApp number" items={p.whatsapps} onChange={v => setP("whatsapps", v)} />
        <Fld label="Short bio"><textarea rows={3} maxLength={600} value={p.bio || ""} onChange={e => setP("bio", e.target.value)} /></Fld>
        <Fld label="Links">
          {links.map((l, i) => (
            <div key={i} className="sx-row" style={{ marginBottom: 6 }}>
              <input placeholder="Title" value={l.title} onChange={e => setP("links", links.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <input placeholder="https://…" value={l.url} onChange={e => setP("links", links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <Btn size="sm" kind="danger" icon="x" onClick={() => setP("links", links.filter((_, j) => j !== i))} />
            </div>
          ))}
          {links.length < 8 && <Btn size="sm" kind="soft" icon="plus" onClick={() => setP("links", [...links, { title: "", url: "" }])}>Add link</Btn>}
        </Fld>
        <div className="sx-row"><Btn onClick={() => onSave(f)}>{card ? "Save card" : "Create card"}</Btn><Btn kind="soft" onClick={onCancel}>Cancel</Btn></div>
      </WithPreview>
    </div>
  );
}

function CardsAdmin({ api, me }) {
  const lv = me.member.level;
  const [st, reload] = useAsync(async () => ({ cards: await api.get("admin/cards"), members: await api.get("admin/members") }), []);
  const [edit, setEdit] = useState(null); // "new" | card
  const [open, setOpen] = useState("");
  const [msg, act] = useAct();
  const [q, setQ] = useState("");
  if (st.loading && !st.data) return <Spinner />;
  if (st.err) return <Note kind="err">{st.err}</Note>;
  const { cards, members } = st.data;
  const save = async (f) => {
    const body = { label: f.label, memberId: f.memberId, profile: f.profile };
    const r = await act(() => (edit === "new" ? api.post("admin/cards", body) : api.put(`admin/cards/${edit.id}`, body)), "Card saved.");
    if (r) { setEdit(null); reload(); }
  };
  const doit = async (path, ok, confirm) => { if (confirm && !window.confirm(confirm)) return; if (await act(() => path(), ok)) reload(); };
  const shown = cards.filter(c => !q || `${c.label} ${c.memberName}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Msg m={msg} />
      <p className="sx-mut" style={{ marginBottom: 10 }}>Each card has its own link. Write it onto an NFC tag (or print its QR). Unlimited cards.</p>
      <div className="sx-row sx-wrap" style={{ marginBottom: 10 }}>
        {!edit && <Btn icon="plus" onClick={() => setEdit("new")}>New card</Btn>}
        <input placeholder="Search cards…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>
      {edit && <CardEditor card={edit === "new" ? null : edit} members={members} org={{ name: me.org.name, design: me.org.design }} onSave={save} onCancel={() => setEdit(null)} />}
      {shown.length === 0 && <Empty>No cards yet.</Empty>}
      {shown.map(c => (
        <div key={c.id} className="sx-card" style={{ marginTop: 8, borderColor: c.status === "deactivated" ? "#e0a0a0" : undefined }}>
          <div className="sx-row sx-wrap">
            <div className="sx-grow" style={{ minWidth: 160 }}><b>{c.label}</b> <span className={`sx-pill ${c.status === "active" ? "ok" : ""}`}>{c.status}</span>
              <div className="sx-mut" style={{ fontSize: 12 }}>{c.memberName || "Not assigned"} · {c.scans} tap{c.scans === 1 ? "" : "s"}{c.lastScanAt ? ` · last ${when(c.lastScanAt)}` : ""}</div>
              {c.status === "deactivated" && <div style={{ fontSize: 12, color: "#b03030" }}>Deactivated {when(c.deactivatedAt)} by {c.deactivatedBy}{c.deactivatedReason ? ` — ${c.deactivatedReason}` : ""}</div>}
            </div>
            <Btn size="sm" kind="soft" onClick={() => setOpen(open === c.id ? "" : c.id)}>{open === c.id ? "Hide link" : "Link / NFC"}</Btn>
            <Btn size="sm" kind="soft" icon="edit" onClick={() => setEdit(c)}>Edit</Btn>
            {c.status === "active"
              ? <Btn size="sm" kind="danger" onClick={() => doit(() => api.post(`admin/cards/${c.id}/deactivate`, { reason: "Deactivated by an admin" }), "Card deactivated.", "Deactivate this card? Anyone tapping it will see that it is no longer valid.")}>Deactivate</Btn>
              : <Btn size="sm" onClick={() => doit(() => api.post(`admin/cards/${c.id}/reactivate`), "Card is active again.")}>Reactivate</Btn>}
          </div>
          {open === c.id && (
            <div style={{ marginTop: 10 }}>
              <div className="sx-row"><input readOnly value={c.link} onFocus={e => e.target.select()} /><CopyBtn text={c.link} /></div>
              <div className="sx-row sx-wrap" style={{ marginTop: 10, alignItems: "flex-start", gap: 16 }}><QrBox value={c.link} name={`card-${(c.label || "member").replace(/\s+/g, "-")}`} size={130} /><div className="sx-grow" style={{ minWidth: 220 }}><NfcPanel url={c.link} /></div></div>
              <div className="sx-row sx-wrap" style={{ marginTop: 8 }}>
                <Btn size="sm" kind="soft" onClick={() => doit(async () => { const r = await api.post(`admin/cards/${c.id}/reissue`); setOpen(c.id); window.alert(`New link:\n${r.link}\n\nWrite it onto the replacement tag.`); return r; }, "New link created. The old link now shows “card replaced”.", "Create a new link for a replacement tag? The old link stops working.")}>Replace tag (new link)</Btn>
                {lv >= 3 && <Btn size="sm" kind="danger" icon="trash" onClick={() => doit(() => api.del(`admin/cards/${c.id}`), "Card deleted.", "Delete this card for good?")}>Delete</Btn>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- tracking */
function Tracking({ api }) {
  const [st, reload] = useAsync(() => api.get("admin/scans"), []);
  const [only, setOnly] = useState("all");
  if (st.loading && !st.data) return <Spinner />;
  if (st.err) return <Note kind="err">{st.err}</Note>;
  const scans = st.data;
  const bad = scans.filter(s => s.cardStatus !== "active");
  const list = only === "alerts" ? bad : scans;
  // last known place per card
  const last = {}; scans.forEach(s => { if (!last[s.card]) last[s.card] = s; });
  return (
    <div>
      <Note>Each tap records the time, the type of phone and an approximate area (from the network). Exact GPS is only saved when the person presses “Share my location”.</Note>
      {bad.length > 0 && <Note kind="err"><b>{bad.length}</b> tap{bad.length > 1 ? "s" : ""} on deactivated or replaced cards — see where below.</Note>}
      <div className="sx-row sx-wrap" style={{ marginBottom: 10 }}>
        <Chips value={only} onChange={setOnly} options={[{ id: "all", label: `All taps (${scans.length})` }, { id: "alerts", label: `Lost / replaced cards (${bad.length})` }]} />
        <Btn size="sm" kind="soft" onClick={reload}>Refresh</Btn>
      </div>
      {Object.keys(last).length > 0 && only === "all" && (
        <div className="sx-card" style={{ marginBottom: 12 }}>
          <h3 className="sx-h3">Where each card was last used</h3>
          {Object.values(last).map(s => (
            <div key={s.card} className="sx-row" style={{ padding: "4px 0" }}>
              <div className="sx-grow"><b>{s.cardLabel || "Card"}</b><div className="sx-mut" style={{ fontSize: 12 }}>{place(s)} · {when(s.at)}</div></div>
              {mapLink(s) && <a href={mapLink(s)} target="_blank" rel="noreferrer" className="sx-btn soft sm"><Ic n="pin" size={14} />Map</a>}
            </div>
          ))}
        </div>
      )}
      {list.length === 0 && <Empty>No taps recorded yet.</Empty>}
      <div style={{ overflowX: "auto" }}>
        {list.length > 0 && <table className="sx-table"><thead><tr><th>When</th><th>Card</th><th>Where</th><th>Device</th><th></th></tr></thead>
          <tbody>{list.map(s => (
            <tr key={s.id} style={s.cardStatus !== "active" ? { background: "#fdecec" } : undefined}>
              <td>{when(s.at)}</td><td>{s.cardLabel || "—"}{s.cardStatus !== "active" ? <> <span className="sx-pill">{s.cardStatus}</span></> : null}</td>
              <td>{place(s)}</td><td>{s.device || "—"}</td>
              <td>{mapLink(s) ? <a href={mapLink(s)} target="_blank" rel="noreferrer">Map</a> : ""}</td>
            </tr>))}</tbody></table>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- my cards */
function MyCards({ api }) {
  const [st, reload] = useAsync(() => api.get("me/cards"), []);
  const [msg, act] = useAct();
  if (st.loading && !st.data) return <Spinner />;
  if (st.err) return <Note kind="err">{st.err}</Note>;
  const lose = async (c) => {
    if (!window.confirm("Deactivate this card? Anyone who taps it will see it is no longer valid. Ask an admin for a replacement.")) return;
    if (await act(() => api.post(`me/cards/${c.id}/deactivate`, { reason: "Reported lost by the member" }))) reload();
  };
  return (
    <div>
      <Msg m={msg} />
      {st.data.length === 0 && <Empty>You don't have a card yet. An admin will issue one for you.</Empty>}
      {st.data.map(c => (
        <div key={c.id} className="sx-card" style={{ marginTop: 8 }}>
          <div className="sx-row"><div className="sx-grow"><b>{c.label}</b> <span className={`sx-pill ${c.status === "active" ? "ok" : ""}`}>{c.status}</span>
            <div className="sx-mut" style={{ fontSize: 12 }}>{c.scans} tap{c.scans === 1 ? "" : "s"}{c.lastScanAt ? ` · last ${when(c.lastScanAt)}` : ""}</div></div>
            {c.status === "active" && <Btn kind="danger" size="sm" onClick={() => lose(c)}>I lost this card</Btn>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ account */
function Account({ api, me, onSaved }) {
  const [p, setP] = useState({ name: me.member.name, phone: me.member.phone || "" });
  const [c, setC] = useState({ a: "", b: "", c: "" });
  const [m1, act1] = useAct(); const [m2, act2] = useAct();
  return (
    <div>
      <div className="sx-card"><h3 className="sx-h3">My details</h3><Msg m={m1} />
        <Fld label="Name"><input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Fld>
        <Fld label="Phone"><input type="tel" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} /></Fld>
        <p className="sx-mut" style={{ fontSize: 12, marginBottom: 8 }}>Email: {me.member.email}</p>
        <Btn onClick={async () => { if (await act1(() => api.put("me", p), "Saved.")) onSaved(); }}>Save</Btn></div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Change my access code</h3><Msg m={m2} />
        <Fld label="Current code"><input type="password" value={c.a} onChange={e => setC({ ...c, a: e.target.value })} /></Fld>
        <Fld label="New code (6+ characters)"><input type="password" value={c.b} onChange={e => setC({ ...c, b: e.target.value })} /></Fld>
        <Fld label="Repeat new code"><input type="password" value={c.c} onChange={e => setC({ ...c, c: e.target.value })} /></Fld>
        <Btn onClick={async () => { if (c.b !== c.c) return act2(async () => { throw new Error("The new codes don't match."); }); if (await act2(() => api.post("me/code", { oldCode: c.a, newCode: c.b }), "Your new code is saved.")) setC({ a: "", b: "", c: "" }); }}>Change code</Btn></div>
    </div>
  );
}

/* ----------------------------------------------------------- settings */
const PAGE_FIELDS = (SOL_FIELDS) => SOL_FIELDS.filter(f => !["members", "messagesPin", "messages"].includes(f.k));
export function OrgSettings({ slug, orgToken, cnToken, onSaved }) {
  const api = useMemo(() => orgApi.as(slug, orgToken), [slug, orgToken]);
  const [st] = useAsync(() => api.get("admin/settings"), [slug]);
  const [d, setD] = useState(null);
  const [msg, act] = useAct();
  useEffect(() => { if (st.data) setD({ name: st.data.name, profile: st.data.profile || {}, design: st.data.design || {}, settings: { requireApproval: st.data.settings?.requireApproval !== false, cardLocationPrompt: !!st.data.settings?.cardLocationPrompt }, joinCode: st.data.joinCode }); }, [st.data]);
  const fields = useMemo(() => PAGE_FIELDS(SOL.org.fields), []);
  if (st.loading || !d) return st.err ? <Note kind="err">{st.err}</Note> : <Spinner />;
  const save = async () => {
    const body = { name: d.name, profile: { ...d.profile, name: d.name }, design: d.design, settings: d.settings };
    if (await act(() => api.put("admin/settings", body), "Saved — the organisation name and page are updated.")) onSaved && onSaved();
  };
  const newCode = async () => { if (!window.confirm("Make a new join code? The old one stops working for new sign-ups.")) return; const r = await act(() => api.post("admin/join-code"), "New join code created."); if (r) setD({ ...d, joinCode: r.joinCode }); };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const invite = `Join ${d.name} on CardNova: ${origin}/o/${slug}\nJoin code: ${d.joinCode}`;
  const memberUrl = `${origin}/o/${slug}`;
  const pagePreview = <OrgView data={{ ...d.profile, name: d.name }} design={d.design} title={d.name} preview chrome={false} messagesNode={<PortalMessages messages={[{ id: "s", title: "Example message", body: "Your messages appear here.", at: new Date().toISOString(), author: "Admin" }]} t={orgTokens(d.design)} />} />;
  return (
    <WithPreview label="Live preview of your members' page" preview={pagePreview}>
      <Msg m={msg} />
      <div className="sx-card"><h3 className="sx-h3">Members' page link &amp; QR</h3>
        <div className="sx-row sx-wrap" style={{ alignItems: "flex-start", gap: 16 }}>
          <QrBox value={memberUrl} name={`${slug}-members`} />
          <div className="sx-grow" style={{ minWidth: 200 }}>
            <p className="sx-mut" style={{ marginBottom: 6 }}>Members sign in or join here. Put this QR on posters, forms or ID cards.</p>
            <div className="sx-row"><input readOnly value={memberUrl} onFocus={e => e.target.select()} /><CopyBtn text={memberUrl} /></div>
          </div>
        </div>
      </div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Organisation</h3>
        <Fld label="Organisation name" hint="Saved together with everything below when you press Save."><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></Fld>
      </div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Join code</h3>
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>{d.joinCode}</p>
        <div className="sx-row sx-wrap"><CopyBtn text={invite} label="Copy invitation" /><a className="sx-btn soft sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(invite)}`}>Send on WhatsApp</a><Btn size="sm" kind="soft" onClick={newCode}>New join code</Btn></div>
      </div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Rules</h3>
        <Toggle checked={d.settings.requireApproval} onChange={v => setD({ ...d, settings: { ...d.settings, requireApproval: v } })} label="An admin must approve every new member (recommended)" />
        <Toggle checked={d.settings.cardLocationPrompt} onChange={v => setD({ ...d, settings: { ...d.settings, cardLocationPrompt: v } })} label="Ask people tapping an active card to share their exact location (optional, they can say no)" />
      </div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Page design — 10 templates</h3>
        <OrgLook design={d.design} setDesign={v => setD({ ...d, design: v })} />
      </div>
      <div className="sx-card" style={{ marginTop: 12 }}><h3 className="sx-h3">Page content</h3>
        {!cnToken && <Note>To upload pictures and PDFs, edit this from your CardNova dashboard (Organisation portals → Edit page). Here you can paste links.</Note>}
        <FieldsEditor fields={fields} data={d.profile} set={v => setD({ ...d, profile: v })} token={cnToken} canUpload={!!cnToken} />
      </div>
      <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "10px 0", marginTop: 12 }}><Btn onClick={save}>Save everything</Btn></div>
    </WithPreview>
  );
}

/* ---------------------------------------------------------- card page */
export function CardPage({ token }) {
  const [st, setSt] = useState({ loading: true });
  const [loc, setLoc] = useState({ state: "idle", text: "" });
  useEffect(() => { orgApi.card(token).then(d => setSt({ data: d })).catch(e => setSt({ err: e.message })); }, [token]);
  if (st.loading) return <div className="sx" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><StudioStyles /><Spinner /></div>;
  if (st.err) return <div className="sx" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}><StudioStyles /><div><h2 className="sx-h">Card not found</h2><p className="sx-mut">{st.err}</p></div></div>;
  const { status, org, card, scanId, askLocation } = st.data;
  const t = orgTokens(org.design);
  const share = () => {
    if (!navigator.geolocation) return setLoc({ state: "err", text: "This phone can't share its location." });
    setLoc({ state: "wait", text: "" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => { try { const r = await orgApi.cardLoc(token, { scanId, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); setLoc({ state: "ok", text: r.message }); } catch (e) { setLoc({ state: "err", text: e.message }); } },
      () => setLoc({ state: "err", text: "No problem — location was not shared." }), { enableHighAccuracy: true, timeout: 12000 });
  };
  const LocBox = ({ strong }) => askLocation ? (
    <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginTop: 12, textAlign: "center", color: "#333" }}>
      {loc.state === "ok" ? <p style={{ color: "#1a7f37" }}>{loc.text}</p> : (<>
        <p style={{ fontSize: 13.5, marginBottom: 8 }}>{strong ? "Found this card? Help return it to its owner." : "Optional: tell the organisation where you are."} Your phone will ask permission; nothing is shared unless you press the button.</p>
        <button type="button" onClick={share} disabled={loc.state === "wait"} style={{ background: t.btn, color: "#fff", borderRadius: 10, padding: "10px 16px", fontWeight: 700 }}>{loc.state === "wait" ? "Locating…" : "Share my location"}</button>
        {loc.state === "err" && <p style={{ color: "#b03030", fontSize: 12.5, marginTop: 6 }}>{loc.text}</p>}
      </>)}
    </div>
  ) : null;
  const Foot = () => <p style={{ textAlign: "center", color: "#fff", opacity: .75, fontSize: 11, marginTop: 14 }}>Taps on this card are recorded (time, device, approximate area) so lost cards can be traced.</p>;

  if (status !== "active") {
    const contacts = [org.phone && { h: `tel:${org.phone}`, l: "Call" }, org.whatsapp && { h: `https://wa.me/${waNumber(org.whatsapp)}`, l: "WhatsApp" }, org.email && { h: `mailto:${org.email}`, l: "Email" }].filter(Boolean);
    return (
      <Shell info={org}>
        <Brand info={{ name: org.name, logo: org.logo, design: org.design }} />
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>⚠️</div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "6px 0" }}>{status === "replaced" ? "This card has been replaced" : "This card is no longer valid"}</h2>
          <p style={{ color: "#555" }}>{status === "replaced" ? "The member has a newer card. Please contact the organisation if you need their details." : "It was reported lost or switched off. If you found it, please contact the organisation."}</p>
          <div className="sx-row sx-wrap" style={{ justifyContent: "center", marginTop: 12 }}>{contacts.map(c => <a key={c.l} className="sx-btn" href={c.h}>{c.l}</a>)}</div>
        </div>
        <LocBox strong />
        <Foot />
      </Shell>
    );
  }
  return (
    <Shell info={org}>
      <Brand info={{ name: org.name, logo: org.logo, design: org.design }} />
      <CardFace org={org} card={card} />
      <LocBox />
      <p style={{ textAlign: "center", marginTop: 12 }}><a href={`/o/${org.slug}`} style={{ color: "#fff", textDecoration: "underline", fontSize: 13 }}>Members' area</a></p>
      <Foot />
    </Shell>
  );
}

/* ------------------------------------------- Studio: Organisation portals */
export function OrgPanel({ token }) {
  const [st, reload] = useAsync(() => orgApi.mine(token), [token]);
  const [f, setF] = useState(null);
  const [edit, setEdit] = useState(null); // {slug, orgToken}
  const [msg, act] = useAct();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portal = async (o) => { const r = await act(() => orgApi.portalToken(o.id, token), false); return r; };
  const open = async (o) => { const r = await portal(o); if (r) { saveOrgSession(r.slug, r.token); window.location.href = `/o/${r.slug}`; } };
  const editPage = async (o) => { const r = await portal(o); if (r) setEdit({ slug: r.slug, orgToken: r.token }); };
  const create = async () => { const r = await act(() => orgApi.create(f, token), "Organisation created."); if (r) { setF(null); reload(); } };
  if (edit) return (
    <div>
      <Btn kind="soft" size="sm" onClick={() => { setEdit(null); reload(); }}>← Back</Btn>
      <div style={{ marginTop: 10 }}><OrgSettings slug={edit.slug} orgToken={edit.orgToken} cnToken={token} /></div>
    </div>
  );
  const notOn = st.status === 403;
  return (
    <div>
      <Msg m={msg} />
      <p className="sx-mut" style={{ marginBottom: 10 }}>A private members' area for a party, church, club or company: its own sign-up and sign-in, 3 admin levels, unlimited member cards, messages to everyone or chosen members, lost-card deactivation and tap tracking.</p>
      {st.loading && !st.data && <Spinner />}
      {st.err && !notOn && <Note kind="err">{st.err}</Note>}
      {notOn && <Note>Organisation portals are switched on per account. Contact CardNova to enable it for yours.</Note>}
      {!notOn && !f && <Btn icon="plus" onClick={() => setF({ name: "", slug: "", adminCode: "" })}>New organisation</Btn>}
      {f && (
        <div className="sx-card" style={{ marginTop: 10 }}>
          <h3 className="sx-h3">New organisation</h3>
          <Fld label="Organisation name"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value, slug: f.slug || "" })} /></Fld>
          <Fld label="Link name" hint={`Members open ${origin}/o/<this name>`}><input value={f.slug} onChange={e => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="safina-nairobi" /></Fld>
          <Fld label="Your owner access code" hint="At least 6 characters. You sign in to the portal with your CardNova email and this code."><input type="password" value={f.adminCode} onChange={e => setF({ ...f, adminCode: e.target.value })} /></Fld>
          <div className="sx-row"><Btn onClick={create} disabled={!f.name || !f.slug || f.adminCode.length < 6}>Create</Btn><Btn kind="soft" onClick={() => setF(null)}>Cancel</Btn></div>
        </div>
      )}
      {(st.data || []).map(o => (
        <div key={o.id} className="sx-card" style={{ marginTop: 10 }}>
          <div className="sx-row sx-wrap">
            <div className="sx-grow"><b>{o.name}</b><div className="sx-mut" style={{ fontSize: 12 }}>{origin}/o/{o.slug} · join code <b>{o.joinCode}</b></div></div>
            <CopyBtn text={`${origin}/o/${o.slug}`} label="Copy link" />
            <Btn size="sm" onClick={() => open(o)}>Open portal</Btn>
            <Btn size="sm" kind="soft" icon="edit" onClick={() => editPage(o)}>Edit page &amp; settings</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
