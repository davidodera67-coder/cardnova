// Organisation portal: member sign-up / sign-in, 3 admin levels, one-time messages
// (to everyone or selected members), unlimited NFC cards that can be deactivated,
// and tap tracking. Written with no paid services: SMTP email is optional and
// every code is stored hashed.
import Org from "../models/Org.js";
import OrgMember from "../models/OrgMember.js";
import OrgMessage from "../models/OrgMessage.js";
import OrgCard from "../models/OrgCard.js";
import OrgScan from "../models/OrgScan.js";
import User from "../models/User.js";
import { signToken, verifyToken, hashCode, checkCode, sha256, newToken, cardToken, joinCode, tempCode, clientIp, maskIp, limiter, geoLookup } from "../utils/orgAuth.js";
import { sendMail, mailReady, siteOrigin } from "../utils/orgMail.js";

/* ------------------------------------------------------------ helpers */
const S = (v) => String(v ?? "");
const clean = (v, n) => S(v).trim().slice(0, n);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{2,39}$/.test(s) && !["public", "card", "mine", "api", "admin"].includes(s);
const codeOk = (c) => S(c).length >= 6 && S(c).length <= 64;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const id = (doc) => String(doc?._id ?? doc?.id ?? "");
const lower = (s) => S(s).trim().toLowerCase();
const tooBig = (v, max = 200000) => { try { return JSON.stringify(v ?? {}).length > max; } catch { return true; } };

const loginLimit = limiter(10, 15 * 60 * 1000);
const signupLimit = limiter(8, 60 * 60 * 1000);
const mailLimit = limiter(5, 60 * 60 * 1000);
const scanDedupe = limiter(1, 20 * 1000);
const locLimit = limiter(6, 10 * 60 * 1000);

const LEVEL_NAMES = ["Member", "Messenger", "Manager", "Owner"];
const publicMember = (m, admin = true) => admin
  ? { id: id(m), name: m.name, email: m.email, phone: m.phone || "", level: m.level || 0, levelName: LEVEL_NAMES[m.level || 0], status: m.status, emailVerified: !!m.emailVerified, lastLoginAt: m.lastLoginAt || null, createdAt: m.createdAt, mustChange: !!m.mustChange }
  : { id: id(m), name: m.name, level: m.level || 0, levelName: LEVEL_NAMES[m.level || 0], status: m.status };

async function orgBySlug(slug) { return Org.findOne({ slug: lower(slug) }); }

// Every portal request after sign-in comes through here: valid token, same organisation, active member.
async function auth(req, res, minLevel = 0) {
  const org = await orgBySlug(req.params.slug);
  if (!org) { res.status(404).json({ message: "Organisation not found." }); return null; }
  const m = String(req.headers?.authorization || "").match(/^Bearer (.+)$/);
  const p = m && verifyToken(m[1]);
  if (!p || p.oid !== id(org)) { res.status(401).json({ message: "Please sign in again.", signedOut: true }); return null; }
  const member = await OrgMember.findById(p.mid);
  if (!member || id({ _id: member.org }) !== id(org) || member.status !== "active") { res.status(401).json({ message: "Please sign in again.", signedOut: true }); return null; }
  if ((member.level || 0) < minLevel) { res.status(403).json({ message: `This needs ${LEVEL_NAMES[minLevel]} access or higher.` }); return null; }
  return { org, member };
}
const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res); }
  catch (e) { if (e?.name === "CastError") return res.status(404).json({ message: "Not found." }); next(e); }
};

// Public email flows answer at once and send in the background (no waiting, and no timing clue about which emails exist).
const bg = (p) => { Promise.resolve(p).catch((e) => console.error("[org mail]", e?.message)); };
async function sendResetEmail(org, member, kind = "reset") {
  const token = newToken();
  await OrgMember.updateOne({ _id: id(member) }, { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + (kind === "invite" ? 7 * 24 * 3600 : 1800) * 1000) });
  const link = `${siteOrigin()}/o/${org.slug}?reset=${token}`;
  const text = kind === "invite"
    ? `Hello ${member.name},\n\nYou have been added to ${org.name}. Open this link to choose your own access code and sign in:\n${link}\n\nThe link works once and expires in 7 days.`
    : `Hello ${member.name},\n\nSomeone asked to reset your access code for ${org.name}. Open this link to choose a new code:\n${link}\n\nIt works once and expires in 30 minutes. If this wasn't you, ignore this email — your code stays the same.`;
  return sendMail({ to: member.email, subject: kind === "invite" ? `You're invited to ${org.name}` : `Reset your ${org.name} access code`, text });
}

/* ------------------------------------- CardNova account holder (owner) */
export const createOrg = wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Please sign in again." });
  const allowed = S(process.env.ORG_OWNER_EMAILS).split(",").map(lower).filter(Boolean);
  if (process.env.ORG_OPEN !== "1" && !allowed.includes(lower(user.email))) return res.status(403).json({ message: "Organisation portals are switched on per account. Contact CardNova to enable it for yours." });
  const { name, slug, adminCode } = req.body || {};
  const nm = clean(name, 80), sl = lower(slug);
  if (!nm) return res.status(400).json({ message: "Enter the organisation's name." });
  if (!slugOk(sl)) return res.status(400).json({ message: "The link name must be 3–40 characters: lowercase letters, numbers and dashes." });
  if (!codeOk(adminCode)) return res.status(400).json({ message: "Choose an admin code of at least 6 characters." });
  if ((await Org.find({ owner: req.userId })).length >= 5) return res.status(403).json({ message: "You can have up to 5 organisations on one account." });
  if (await Org.findOne({ slug: sl })) return res.status(409).json({ message: "That link name is already taken." });
  const org = await Org.create({ owner: req.userId, name: nm, slug: sl, joinCode: joinCode(), settings: { requireApproval: true, cardLocationPrompt: false }, profile: { name: nm }, design: { tpl: "t01" } });
  await OrgMember.create({ org: id(org), name: clean(user.name, 80) || "Owner", email: lower(user.email), codeHash: await hashCode(adminCode), level: 3, status: "active", emailVerified: true, consentAt: new Date() });
  res.status(201).json({ id: id(org), name: org.name, slug: org.slug, joinCode: org.joinCode });
});

export const myOrgs = wrap(async (req, res) => {
  const list = await Org.find({ owner: req.userId });
  res.json(list.map((o) => ({ id: id(o), name: o.name, slug: o.slug, joinCode: o.joinCode })));
});

// Lets the CardNova account holder open their own portal as Owner without a second sign-in.
export const ownerPortalToken = wrap(async (req, res) => {
  const org = await Org.findOne({ _id: req.params.id, owner: req.userId });
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  const user = await User.findById(req.userId);
  const member = await OrgMember.findOne({ org: id(org), email: lower(user?.email) });
  if (!member || member.level < 3 || member.status !== "active") return res.status(403).json({ message: "Your owner access isn't active for this organisation." });
  res.json({ token: signToken({ mid: id(member), oid: id(org) }), slug: org.slug });
});

/* ------------------------------------------------------------ public */
export const publicOrg = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  res.json({ name: org.name, slug: org.slug, logo: org.profile?.image || "", tagline: org.profile?.line1 || "", design: org.design || {}, requireApproval: !!org.settings?.requireApproval, emailEnabled: mailReady() });
});

export const signup = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  if (signupLimit(clientIp(req))) return res.status(429).json({ message: "Too many attempts. Please try again later." });
  const b = req.body || {};
  const name = clean(b.name, 80), email = lower(b.email), phone = clean(b.phone, 30);
  if (!name) return res.status(400).json({ message: "Please enter your name." });
  if (!emailOk(email)) return res.status(400).json({ message: "Please enter a valid email address." });
  if (!codeOk(b.code)) return res.status(400).json({ message: "Create a code of at least 6 characters." });
  if (lower(b.joinCode) !== lower(org.joinCode)) return res.status(403).json({ message: "That join code isn't right. Ask an admin for the current one." });
  if (b.consent !== true) return res.status(400).json({ message: "Please tick the box to agree to how your details and card taps are used." });
  const exists = await OrgMember.findOne({ org: id(org), email });
  const generic = { message: mailReady() ? "Almost there! Check your email to confirm your address." + (org.settings?.requireApproval ? " An admin will then approve your account." : "") : (org.settings?.requireApproval ? "Thanks! An admin will approve your account soon." : "You're in! You can sign in now.") };
  if (exists) return res.status(201).json(generic); // don't reveal which emails already have accounts
  const verified = !mailReady();
  const m = await OrgMember.create({ org: id(org), name, email, phone, codeHash: await hashCode(b.code), level: 0, status: org.settings?.requireApproval ? "pending" : "active", emailVerified: verified, consentAt: new Date() });
  if (!verified) {
    const token = newToken();
    await OrgMember.updateOne({ _id: id(m) }, { verifyTokenHash: sha256(token), verifyExpires: new Date(Date.now() + 24 * 3600 * 1000) });
    bg(sendMail({ to: email, subject: `Confirm your email for ${org.name}`, text: `Hello ${name},\n\nConfirm your email to finish joining ${org.name}:\n${siteOrigin()}/o/${org.slug}?verify=${token}\n\nThe link expires in 24 hours.` }));
  }
  res.status(201).json(generic);
});

export const verifyEmail = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  const m = await OrgMember.findOne({ org: id(org), verifyTokenHash: sha256(req.body?.token) });
  if (!m || !m.verifyExpires || new Date(m.verifyExpires) < new Date()) return res.status(400).json({ message: "This confirmation link is invalid or has expired." });
  await OrgMember.updateOne({ _id: id(m) }, { emailVerified: true, verifyTokenHash: "", verifyExpires: null });
  res.json({ message: m.status === "pending" ? "Email confirmed. An admin still needs to approve you." : "Email confirmed. You can sign in now." });
});

export const login = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  const email = lower(req.body?.email), code = S(req.body?.code);
  if (loginLimit(`${clientIp(req)}|${email}`)) return res.status(429).json({ message: "Too many tries. Please wait a few minutes." });
  const m = email ? await OrgMember.findOne({ org: id(org), email }) : null;
  if (m?.lockUntil && new Date(m.lockUntil) > new Date()) return res.status(429).json({ message: "This account is locked for a few minutes after too many wrong codes." });
  const ok = await checkCode(code, m?.codeHash);
  if (!m || !ok) {
    if (m) {
      const fails = (m.failedLogins || 0) + 1;
      await OrgMember.updateOne({ _id: id(m) }, fails >= 8 ? { failedLogins: 0, lockUntil: new Date(Date.now() + 15 * 60 * 1000) } : { failedLogins: fails });
    }
    return res.status(401).json({ message: "Wrong email or code." });
  }
  if (!m.emailVerified) return res.status(403).json({ message: "Please confirm your email first — check your inbox for the link.", needsVerify: true });
  if (m.status === "pending") return res.status(403).json({ message: "Your account is waiting for admin approval." });
  if (m.status !== "active") return res.status(403).json({ message: "This account isn't active. Please contact an admin." });
  await OrgMember.updateOne({ _id: id(m) }, { failedLogins: 0, lockUntil: null, lastLoginAt: new Date() });
  res.json({ token: signToken({ mid: id(m), oid: id(org) }), member: publicMember(m), mustChange: !!m.mustChange });
});

export const resendVerify = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  const email = lower(req.body?.email);
  const done = { message: "If that email is waiting for confirmation, we've sent a new link." };
  if (!mailReady() || mailLimit(`${clientIp(req)}|${email}`)) return res.json(done);
  const m = await OrgMember.findOne({ org: id(org), email });
  if (m && !m.emailVerified) {
    const token = newToken();
    await OrgMember.updateOne({ _id: id(m) }, { verifyTokenHash: sha256(token), verifyExpires: new Date(Date.now() + 24 * 3600 * 1000) });
    bg(sendMail({ to: email, subject: `Confirm your email for ${org.name}`, text: `Confirm your email:\n${siteOrigin()}/o/${org.slug}?verify=${token}` }));
  }
  res.json(done);
});

// "Forgot code": emails a single-use link that expires in 30 minutes.
export const forgot = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  const email = lower(req.body?.email);
  if (!mailReady()) return res.json({ message: "Email isn't set up for this organisation yet. Please ask an admin to give you a temporary code.", manual: true });
  if (!mailLimit(`${clientIp(req)}|${email}`) && emailOk(email)) {
    const m = await OrgMember.findOne({ org: id(org), email });
    if (m && (m.status === "active" || m.status === "pending")) bg(sendResetEmail(org, m, "reset"));
  }
  res.json({ message: "If that email belongs to a member, we've sent a link to choose a new code. It works once and expires in 30 minutes." });
});

export const resetCode = wrap(async (req, res) => {
  const org = await orgBySlug(req.params.slug);
  if (!org) return res.status(404).json({ message: "Organisation not found." });
  if (!codeOk(req.body?.code)) return res.status(400).json({ message: "Choose a code of at least 6 characters." });
  const m = await OrgMember.findOne({ org: id(org), resetTokenHash: sha256(req.body?.token) });
  if (!m || !m.resetExpires || new Date(m.resetExpires) < new Date()) return res.status(400).json({ message: "This link is invalid or has expired. Ask for a new one." });
  await OrgMember.updateOne({ _id: id(m) }, { codeHash: await hashCode(req.body.code), resetTokenHash: "", resetExpires: null, mustChange: false, emailVerified: true, failedLogins: 0, lockUntil: null });
  res.json({ message: m.status === "pending" ? "Code saved. An admin still needs to approve your account." : "Your new code is saved. You can sign in now." });
});

/* --------------------------------------------------------- members */
export const me = wrap(async (req, res) => {
  const a = await auth(req, res); if (!a) return;
  const { org, member } = a;
  const msgs = (await OrgMessage.find({ org: id(org) }).sort({ createdAt: -1 })).filter((m) => m.audience !== "some" || (m.to || []).includes(id(member)));
  const out = { member: publicMember(member), mustChange: !!member.mustChange, org: { name: org.name, slug: org.slug, profile: org.profile || {}, design: org.design || {}, settings: { requireApproval: !!org.settings?.requireApproval } }, messages: msgs.map((m) => ({ id: id(m), title: m.title, body: m.body, author: m.author, at: m.createdAt, edited: !!m.edited, targeted: m.audience === "some" })), emailEnabled: mailReady() };
  if (member.level >= 2) out.pending = (await OrgMember.find({ org: id(org) })).filter((x) => x.status === "pending").length;
  res.json(out);
});

export const updateMe = wrap(async (req, res) => {
  const a = await auth(req, res); if (!a) return;
  const patch = {};
  if (req.body?.name !== undefined) { const n = clean(req.body.name, 80); if (!n) return res.status(400).json({ message: "Name can't be empty." }); patch.name = n; }
  if (req.body?.phone !== undefined) patch.phone = clean(req.body.phone, 30);
  await OrgMember.updateOne({ _id: id(a.member) }, patch);
  res.json({ message: "Saved." });
});

// Members make their own code. The old code is required unless an admin issued a temporary one.
export const changeCode = wrap(async (req, res) => {
  const a = await auth(req, res); if (!a) return;
  const { oldCode, newCode } = req.body || {};
  if (!codeOk(newCode)) return res.status(400).json({ message: "Choose a code of at least 6 characters." });
  if (loginLimit(`chg|${id(a.member)}`)) return res.status(429).json({ message: "Too many tries. Please wait a few minutes." });
  if (!(await checkCode(S(oldCode), a.member.codeHash))) return res.status(403).json({ message: "Your current code isn't right." });
  await OrgMember.updateOne({ _id: id(a.member) }, { codeHash: await hashCode(newCode), mustChange: false });
  res.json({ message: "Your new code is saved." });
});

export const myCards = wrap(async (req, res) => {
  const a = await auth(req, res); if (!a) return;
  const cards = (await OrgCard.find({ org: id(a.org) })).filter((c) => c.member === id(a.member));
  res.json(cards.map((c) => cardOut(c, a.org)));
});

export const myCardDeactivate = wrap(async (req, res) => {
  const a = await auth(req, res); if (!a) return;
  const c = await OrgCard.findOne({ _id: req.params.cardId, org: id(a.org) });
  if (!c || c.member !== id(a.member)) return res.status(404).json({ message: "Card not found." });
  await OrgCard.updateOne({ _id: id(c) }, { status: "deactivated", deactivatedAt: new Date(), deactivatedBy: a.member.name, deactivatedReason: clean(req.body?.reason, 200) || "Reported lost by the member" });
  res.json({ message: "Card deactivated. Anyone who taps it will now see that it is no longer valid." });
});

/* ------------------------------------------------- admin: messages */
const msgOut = (m, names = {}) => ({ id: id(m), title: m.title, body: m.body, audience: m.audience, to: m.to || [], toNames: (m.to || []).map((x) => names[x] || "member"), author: m.author, at: m.createdAt, updatedAt: m.updatedAt, edited: !!m.edited });

async function checkAudience(org, body) {
  const audience = body.audience === "some" ? "some" : "all";
  let to = [];
  if (audience === "some") {
    const active = new Set((await OrgMember.find({ org: id(org) })).filter((m) => m.status === "active").map(id));
    to = [...new Set((Array.isArray(body.to) ? body.to : []).map(S))].filter((x) => active.has(x));
    if (!to.length) return { error: "Choose at least one member to send this to." };
  }
  return { audience, to };
}

export const listMessages = wrap(async (req, res) => {
  const a = await auth(req, res, 1); if (!a) return;
  const names = Object.fromEntries((await OrgMember.find({ org: id(a.org) })).map((m) => [id(m), m.name]));
  res.json((await OrgMessage.find({ org: id(a.org) }).sort({ createdAt: -1 })).map((m) => msgOut(m, names)));
});
export const createMessage = wrap(async (req, res) => {
  const a = await auth(req, res, 1); if (!a) return;
  const title = clean(req.body?.title, 200), body = clean(req.body?.body, 4000);
  if (!title && !body) return res.status(400).json({ message: "Write something first." });
  const au = await checkAudience(a.org, req.body || {});
  if (au.error) return res.status(400).json({ message: au.error });
  const m = await OrgMessage.create({ org: id(a.org), title, body, audience: au.audience, to: au.to, author: a.member.name });
  res.status(201).json(msgOut(m));
});
export const updateMessage = wrap(async (req, res) => {
  const a = await auth(req, res, 1); if (!a) return;
  const m = await OrgMessage.findOne({ _id: req.params.msgId, org: id(a.org) });
  if (!m) return res.status(404).json({ message: "Message not found." });
  const patch = { edited: true };
  if (req.body?.title !== undefined) patch.title = clean(req.body.title, 200);
  if (req.body?.body !== undefined) patch.body = clean(req.body.body, 4000);
  if (req.body?.audience !== undefined) { const au = await checkAudience(a.org, req.body); if (au.error) return res.status(400).json({ message: au.error }); patch.audience = au.audience; patch.to = au.to; }
  await OrgMessage.updateOne({ _id: id(m) }, patch);
  res.json({ message: "Saved." });
});
export const deleteMessage = wrap(async (req, res) => {
  const a = await auth(req, res, 1); if (!a) return;
  const m = await OrgMessage.findOneAndDelete({ _id: req.params.msgId, org: id(a.org) });
  if (!m) return res.status(404).json({ message: "Message not found." });
  res.json({ message: "Deleted." });
});

/* -------------------------------------------------- admin: members */
export const listMembers = wrap(async (req, res) => {
  const a = await auth(req, res, 1); if (!a) return;
  const full = a.member.level >= 2;
  const list = (await OrgMember.find({ org: id(a.org) })).sort((x, y) => (y.level - x.level) || S(x.name).localeCompare(S(y.name)));
  res.json(list.map((m) => publicMember(m, full)));
});

export const addMember = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const name = clean(req.body?.name, 80), email = lower(req.body?.email), phone = clean(req.body?.phone, 30);
  if (!name || !emailOk(email)) return res.status(400).json({ message: "Enter the member's name and a valid email." });
  if (await OrgMember.findOne({ org: id(a.org), email })) return res.status(409).json({ message: "That email already has an account here." });
  const level = a.member.level >= 3 ? Math.max(0, Math.min(3, Number(req.body?.level) || 0)) : 0;
  const m = await OrgMember.create({ org: id(a.org), name, email, phone, level, status: "active", emailVerified: mailReady() ? false : true, consentAt: null, codeHash: "" });
  if (mailReady()) { await sendResetEmail(a.org, m, "invite"); return res.status(201).json({ member: publicMember(m), message: "Invitation emailed. They choose their own code from the link." }); }
  const temp = tempCode();
  await OrgMember.updateOne({ _id: id(m) }, { codeHash: await hashCode(temp), mustChange: true });
  res.status(201).json({ member: publicMember(m), tempCode: temp, message: "Give them this temporary code. They'll be asked to choose their own after signing in." });
});

export const updateMember = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const t = await OrgMember.findOne({ _id: req.params.memberId, org: id(a.org) });
  if (!t) return res.status(404).json({ message: "Member not found." });
  if (id(t) === id(a.member)) return res.status(400).json({ message: "You can't change your own status or level." });
  if (a.member.level < 3 && (t.level || 0) >= a.member.level) return res.status(403).json({ message: "You can only manage people below your level." });
  const patch = {};
  if (req.body?.status !== undefined) {
    if (!["active", "suspended", "rejected", "pending"].includes(req.body.status)) return res.status(400).json({ message: "Unknown status." });
    patch.status = req.body.status;
  }
  if (req.body?.level !== undefined) {
    if (a.member.level < 3) return res.status(403).json({ message: "Only an Owner can change admin levels." });
    const lv = Number(req.body.level);
    if (![0, 1, 2, 3].includes(lv)) return res.status(400).json({ message: "Unknown level." });
    patch.level = lv;
  }
  await OrgMember.updateOne({ _id: id(t) }, patch);
  res.json({ message: "Saved." });
});

export const resetMemberCode = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const t = await OrgMember.findOne({ _id: req.params.memberId, org: id(a.org) });
  if (!t) return res.status(404).json({ message: "Member not found." });
  if (a.member.level < 3 && (t.level || 0) >= a.member.level) return res.status(403).json({ message: "You can only manage people below your level." });
  if (mailReady()) { await sendResetEmail(a.org, t, "reset"); return res.json({ message: `A reset link was emailed to ${t.email}.` }); }
  const temp = tempCode();
  await OrgMember.updateOne({ _id: id(t) }, { codeHash: await hashCode(temp), mustChange: true, failedLogins: 0, lockUntil: null });
  res.json({ tempCode: temp, message: "Give them this temporary code. They'll choose a new one after signing in." });
});

export const removeMember = wrap(async (req, res) => {
  const a = await auth(req, res, 3); if (!a) return;
  if (req.params.memberId === id(a.member)) return res.status(400).json({ message: "You can't remove yourself." });
  const t = await OrgMember.findOneAndDelete({ _id: req.params.memberId, org: id(a.org) });
  if (!t) return res.status(404).json({ message: "Member not found." });
  res.json({ message: "Removed." });
});

/* ----------------------------------------------------- admin: cards */
const CARD_FIELDS = ["name", "title", "company", "phone", "email", "whatsapp", "website", "photo", "bio"];
function cleanProfile(p) {
  const o = {};
  if (isObj(p)) {
    CARD_FIELDS.forEach((k) => { if (p[k] !== undefined) o[k] = clean(p[k], k === "bio" ? 600 : k === "photo" ? 600 : 160); });
    o.links = (Array.isArray(p.links) ? p.links : []).slice(0, 8).map((l) => ({ title: clean(l?.title, 80), url: clean(l?.url, 400) })).filter((l) => l.title || l.url);
  }
  return o;
}
const cardOut = (c, org) => ({ id: id(c), label: c.label, member: c.member, status: c.status, link: `${siteOrigin()}/c/${c.token}`, token: c.token, profile: c.profile || {}, scans: c.scans || 0, lastScanAt: c.lastScanAt || null, deactivatedAt: c.deactivatedAt || null, deactivatedBy: c.deactivatedBy || "", deactivatedReason: c.deactivatedReason || "", createdAt: c.createdAt });

export const listCards = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const names = Object.fromEntries((await OrgMember.find({ org: id(a.org) })).map((m) => [id(m), m.name]));
  const cards = (await OrgCard.find({ org: id(a.org) }).sort({ createdAt: -1 })).map((c) => ({ ...cardOut(c, a.org), memberName: names[c.member] || "" }));
  res.json(cards);
});
export const createCard = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  let memberId = "", memberName = "";
  if (req.body?.memberId) {
    const m = await OrgMember.findOne({ _id: req.body.memberId, org: id(a.org) });
    if (!m) return res.status(400).json({ message: "That member doesn't exist." });
    memberId = id(m); memberName = m.name;
  }
  if (tooBig(req.body?.profile, 20000)) return res.status(413).json({ message: "That card has too much content." });
  const profile = cleanProfile(req.body?.profile);
  if (!profile.name) profile.name = memberName || clean(req.body?.label, 80);
  const c = await OrgCard.create({ org: id(a.org), member: memberId, label: clean(req.body?.label, 80) || profile.name || "Card", token: cardToken(), profile });
  res.status(201).json(cardOut(c, a.org));
});
export const updateCard = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const c = await OrgCard.findOne({ _id: req.params.cardId, org: id(a.org) });
  if (!c) return res.status(404).json({ message: "Card not found." });
  const patch = {};
  if (req.body?.label !== undefined) patch.label = clean(req.body.label, 80);
  if (req.body?.profile !== undefined) { if (tooBig(req.body.profile, 20000)) return res.status(413).json({ message: "That card has too much content." }); patch.profile = cleanProfile(req.body.profile); }
  if (req.body?.memberId !== undefined) {
    if (req.body.memberId === "") patch.member = "";
    else { const m = await OrgMember.findOne({ _id: req.body.memberId, org: id(a.org) }); if (!m) return res.status(400).json({ message: "That member doesn't exist." }); patch.member = id(m); }
  }
  await OrgCard.updateOne({ _id: id(c) }, patch);
  res.json({ message: "Saved." });
});
export const deactivateCard = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const c = await OrgCard.findOne({ _id: req.params.cardId, org: id(a.org) });
  if (!c) return res.status(404).json({ message: "Card not found." });
  await OrgCard.updateOne({ _id: id(c) }, { status: "deactivated", deactivatedAt: new Date(), deactivatedBy: a.member.name, deactivatedReason: clean(req.body?.reason, 200) || "Deactivated by an admin" });
  res.json({ message: "Card deactivated." });
});
export const reactivateCard = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const c = await OrgCard.findOne({ _id: req.params.cardId, org: id(a.org) });
  if (!c) return res.status(404).json({ message: "Card not found." });
  await OrgCard.updateOne({ _id: id(c) }, { status: "active", deactivatedAt: null, deactivatedBy: "", deactivatedReason: "" });
  res.json({ message: "Card is active again." });
});
// Replacement for a lost card: a brand-new link. The old link keeps working only as a "replaced" notice.
export const reissueCard = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const c = await OrgCard.findOne({ _id: req.params.cardId, org: id(a.org) });
  if (!c) return res.status(404).json({ message: "Card not found." });
  const token = cardToken();
  await OrgCard.updateOne({ _id: id(c) }, { token, oldTokens: [...(c.oldTokens || []), c.token], status: "active", deactivatedAt: null, deactivatedBy: "", deactivatedReason: "" });
  res.json({ link: `${siteOrigin()}/c/${token}`, message: "New link created. Write it onto the replacement NFC tag. The old link now shows that the card was replaced." });
});
export const deleteCard = wrap(async (req, res) => {
  const a = await auth(req, res, 3); if (!a) return;
  const c = await OrgCard.findOneAndDelete({ _id: req.params.cardId, org: id(a.org) });
  if (!c) return res.status(404).json({ message: "Card not found." });
  await OrgScan.deleteMany({ card: id(c) });
  res.json({ message: "Deleted." });
});

const scanOut = (s, cardNames = {}) => ({ id: id(s), card: String(s.card), cardLabel: cardNames[String(s.card)] || "", at: s.at, cardStatus: s.cardStatus, city: s.city || "", region: s.region || "", country: s.country || "", lat: s.lat ?? null, lng: s.lng ?? null, accuracy: s.accuracy ?? null, gps: !!s.gps, device: s.device || "", ipMask: s.ipMask || "" });
export const listScans = wrap(async (req, res) => {
  const a = await auth(req, res, 2); if (!a) return;
  const names = Object.fromEntries((await OrgCard.find({ org: id(a.org) })).map((c) => [id(c), c.label]));
  let list = await OrgScan.find({ org: id(a.org) }).sort({ at: -1 });
  if (req.query?.card) list = list.filter((s) => String(s.card) === S(req.query.card));
  res.json(list.slice(0, 300).map((s) => scanOut(s, names)));
});

/* ------------------------------------------------ admin: settings */
export const getSettings = wrap(async (req, res) => {
  const a = await auth(req, res, 3); if (!a) return;
  res.json({ name: a.org.name, slug: a.org.slug, joinCode: a.org.joinCode, settings: a.org.settings || {}, profile: a.org.profile || {}, design: a.org.design || {} });
});
// One Save: the organisation name, page content, template and options are stored together.
export const saveSettings = wrap(async (req, res) => {
  const a = await auth(req, res, 3); if (!a) return;
  const b = req.body || {};
  const patch = {};
  if (b.name !== undefined) { const n = clean(b.name, 80); if (!n) return res.status(400).json({ message: "The organisation needs a name." }); patch.name = n; }
  if (b.profile !== undefined) { if (!isObj(b.profile) || tooBig(b.profile)) return res.status(400).json({ message: "That page content isn't valid or is too large." }); patch.profile = b.profile; }
  if (b.design !== undefined) { if (!isObj(b.design) || tooBig(b.design, 20000)) return res.status(400).json({ message: "That design isn't valid." }); patch.design = b.design; }
  if (b.settings !== undefined && isObj(b.settings)) patch.settings = { requireApproval: b.settings.requireApproval !== false, cardLocationPrompt: !!b.settings.cardLocationPrompt };
  await Org.updateOne({ _id: id(a.org) }, patch);
  res.json({ message: "Saved.", name: patch.name || a.org.name });
});
export const newJoinCode = wrap(async (req, res) => {
  const a = await auth(req, res, 3); if (!a) return;
  const code = joinCode();
  await Org.updateOne({ _id: id(a.org) }, { joinCode: code });
  res.json({ joinCode: code });
});

/* --------------------------------------------- public card (NFC tap) */
function deviceOf(ua) {
  const u = S(ua);
  const os = /Android/i.test(u) ? "Android" : /iPhone|iPad|iOS/i.test(u) ? "iPhone/iPad" : /Windows/i.test(u) ? "Windows" : /Mac OS/i.test(u) ? "Mac" : /Linux/i.test(u) ? "Linux" : "Unknown";
  const br = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : "";
  return [os, br].filter(Boolean).join(" · ");
}
async function findCardByToken(token) {
  const t = S(token);
  const c = await OrgCard.findOne({ token: t });
  if (c) return { card: c, replaced: false };
  const old = await OrgCard.findOne({ oldTokens: t });
  return old ? { card: old, replaced: true } : null;
}

export const publicCard = wrap(async (req, res) => {
  const hit = await findCardByToken(req.params.token);
  if (!hit) return res.status(404).json({ message: "This card link isn't valid." });
  const { card, replaced } = hit;
  const org = await Org.findById(String(card.org));
  const inactive = replaced || card.status !== "active";
  // log the tap (without storing the full IP address)
  const ip = clientIp(req);
  let scanId = "";
  const cstat = replaced ? "replaced" : card.status;
  if (!scanDedupe(`${ip}|${id(card)}|${cstat}`)) {
    const g = await geoLookup(ip);
    const s = await OrgScan.create({ org: String(card.org), card: id(card), at: new Date(), cardStatus: replaced ? "replaced" : card.status, ipMask: maskIp(ip), city: g.city || "", region: g.region || "", country: g.country || "", device: deviceOf(req.headers?.["user-agent"]) });
    scanId = id(s);
    await OrgCard.updateOne({ _id: id(card) }, { scans: (card.scans || 0) + 1, lastScanAt: new Date() });
  } else {
    // repeat tap/refresh: don't log again, but let the visitor still attach a location to their latest tap
    const mine = (await OrgScan.find({ card: id(card) }).sort({ at: -1 })).find((x) => x.ipMask === maskIp(ip) && x.cardStatus === cstat);
    if (mine) scanId = id(mine);
  }
  const prof = org?.profile || {};
  const contact = { phone: prof.phone || "", email: prof.email || "", whatsapp: prof.whatsapp || "" };
  const orgOut = { name: org?.name || "", logo: prof.image || "", design: org?.design || {}, slug: org?.slug || "", ...contact };
  const askLocation = inactive || !!org?.settings?.cardLocationPrompt;
  if (inactive) return res.json({ status: replaced ? "replaced" : "deactivated", org: orgOut, scanId, askLocation: true });
  res.json({ status: "active", org: orgOut, card: card.profile || {}, scanId, askLocation });
});

// Only called when the person presses "Share my location" — never silently.
export const cardLocation = wrap(async (req, res) => {
  const hit = await findCardByToken(req.params.token);
  if (!hit) return res.status(404).json({ message: "This card link isn't valid." });
  if (locLimit(`${clientIp(req)}|${id(hit.card)}`)) return res.status(429).json({ message: "Too many requests." });
  const lat = Number(req.body?.lat), lng = Number(req.body?.lng), acc = Number(req.body?.accuracy);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ message: "That location isn't valid." });
  const s = await OrgScan.findOne({ _id: S(req.body?.scanId), card: id(hit.card) });
  if (!s || s.gps) return res.status(404).json({ message: "Nothing to update." });
  await OrgScan.updateOne({ _id: id(s) }, { gps: true, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, accuracy: isFinite(acc) ? Math.round(acc) : undefined });
  res.json({ message: "Thank you. The organisation has been told where this card is." });
});
