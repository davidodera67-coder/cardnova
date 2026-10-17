import Page from "../models/Page.js";
import PageEntry from "../models/PageEntry.js";
import User from "../models/User.js";

const FREE_PAGE_LIMIT = 3;
const PRO_PAGE_LIMIT = 30;
const MAX_JSON_CHARS = 400000;   // a big menu with many items still fits comfortably
const MAX_ENTRIES_PER_PAGE = 3000; // keeps the free database from filling up with spam

// Every kind of page the "Menus & QR" studio can make.
const SOLUTION_TYPES = new Set([
  "wifi", "text", "email", "sms", "whatsapp", "maps", "calendar", "google", "vcard", "gs1",
  "url", "smart", "video", "review", "app",
  "links", "landing", "meeting", "files", "gallery", "feedback", "form", "coupon", "event",
  "payment", "medical", "pet", "product",
]);

const clean = (s, n) => String(s ?? "").slice(0, n);
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{2,59}$/.test(s);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function pageLimit(user) {
  return user.plan === "pro" ? PRO_PAGE_LIMIT : FREE_PAGE_LIMIT;
}

function tooBig(...vals) {
  try {
    return vals.reduce((n, v) => n + JSON.stringify(v ?? {}).length, 0) > MAX_JSON_CHARS;
  } catch {
    return true;
  }
}

// Very small in-memory brake so one phone can't flood a form with junk.
// (Resets when the server restarts — good enough for a free-tier API.)
const hits = new Map();
function tooManyRequests(req, slug) {
  const ip = String(req.headers?.["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || "unknown";
  const key = `${ip}|${slug}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 12) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

// GET /api/pages — everything the signed-in user has made
export async function listPages(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Please sign in again." });
    const pages = await Page.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({ pages, limit: pageLimit(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/pages
export async function createPage(req, res, next) {
  try {
    const { kind, type, title, slug, status, data, design } = req.body || {};
    const typeOk = kind === "menu" ? type === "menu" : kind === "solution" && SOLUTION_TYPES.has(type);
    if (!typeOk) return res.status(400).json({ message: "Choose what you want to create first." });
    if (!slugOk(slug)) return res.status(400).json({ message: "The link name must be 3–60 characters: lowercase letters, numbers and dashes." });
    if ((data !== undefined && !isObj(data)) || (design !== undefined && !isObj(design))) return res.status(400).json({ message: "That page's content isn't valid." });
    if (tooBig(data, design)) return res.status(413).json({ message: "This page is too large. Try smaller images or fewer items." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Please sign in again." });
    const count = await Page.countDocuments({ owner: req.userId });
    if (count >= pageLimit(user)) {
      return res.status(403).json({ message: `You've reached your ${user.plan} plan limit of ${pageLimit(user)} menus & QR pages. Upgrade to add more.` });
    }
    if (await Page.findOne({ slug })) return res.status(409).json({ message: "That link name is already taken." });

    const page = await Page.create({
      owner: req.userId, kind, type: clean(type, 40), title: clean(title, 120), slug,
      status: status === "Draft" ? "Draft" : "Published", data: data || {}, design: design || {},
    });
    res.status(201).json(page);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "That link name is already taken." });
    next(err);
  }
}

// PUT /api/pages/:id
export async function updatePage(req, res, next) {
  try {
    const { title, slug, status, data, design } = req.body || {};
    const patch = {};
    if (title !== undefined) patch.title = clean(title, 120);
    if (status !== undefined) patch.status = status === "Draft" ? "Draft" : "Published";
    if (data !== undefined) { if (!isObj(data)) return res.status(400).json({ message: "That page's content isn't valid." }); patch.data = data; }
    if (design !== undefined) { if (!isObj(design)) return res.status(400).json({ message: "That page's design isn't valid." }); patch.design = design; }
    if (tooBig(patch.data, patch.design)) return res.status(413).json({ message: "This page is too large. Try smaller images or fewer items." });

    if (slug !== undefined) {
      if (!slugOk(slug)) return res.status(400).json({ message: "The link name must be 3–60 characters: lowercase letters, numbers and dashes." });
      const taken = await Page.findOne({ slug, _id: { $ne: req.params.id } });
      if (taken) return res.status(409).json({ message: "That link name is already taken." });
      patch.slug = slug;
    }

    const page = await Page.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, patch, { new: true });
    if (!page) return res.status(404).json({ message: "Page not found." });
    res.json(page);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "That link name is already taken." });
    next(err);
  }
}

// DELETE /api/pages/:id
export async function deletePage(req, res, next) {
  try {
    const page = await Page.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!page) return res.status(404).json({ message: "Page not found." });
    await PageEntry.deleteMany({ page: page._id });
    res.json({ message: "Deleted." });
  } catch (err) {
    next(err);
  }
}

// GET /api/pages/public/:slug — what a visitor sees after scanning. Only the
// fields needed to draw the page are returned (never the owner's id).
export async function getPublicPage(req, res, next) {
  try {
    const page = await Page.findOneAndUpdate(
      { slug: String(req.params.slug).toLowerCase(), status: "Published" },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: "This page doesn't exist or isn't published." });
    res.json({ kind: page.kind, type: page.type, title: page.title, slug: page.slug, data: page.data, design: page.design });
  } catch (err) {
    next(err);
  }
}

// POST /api/pages/public/:slug/entry — feedback, form answers, RSVPs, orders
export async function submitEntry(req, res, next) {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const page = await Page.findOne({ slug, status: "Published" });
    if (!page) return res.status(404).json({ message: "This page doesn't exist or isn't published." });
    if (tooManyRequests(req, slug)) return res.status(429).json({ message: "Too many submissions — please wait a few minutes and try again." });
    if ((page.entryCount || 0) >= MAX_ENTRIES_PER_PAGE) return res.status(429).json({ message: "This inbox is full. Please contact the owner directly." });

    const b = req.body || {};
    const fields = {};
    if (isObj(b.fields)) {
      Object.entries(b.fields).slice(0, 30).forEach(([k, v]) => { fields[clean(k, 60)] = clean(Array.isArray(v) ? v.join(", ") : v, 1000); });
    }
    const rating = Math.max(0, Math.min(5, Math.round(Number(b.rating)) || 0));
    const hasContent = b.name || b.email || b.phone || b.message || rating || Object.keys(fields).length;
    if (!hasContent) return res.status(400).json({ message: "Please fill in at least one field." });

    const defaultKind = page.kind === "menu" ? "order" : page.type === "feedback" ? "feedback" : page.type === "event" ? "rsvp" : "lead";
    await PageEntry.create({
      page: page._id, owner: page.owner,
      kind: clean(b.kind || defaultKind, 20),
      name: clean(b.name, 120), email: clean(b.email, 160), phone: clean(b.phone, 40),
      message: clean(b.message, 2000), rating, fields,
    });
    await Page.updateOne({ _id: page._id }, { $inc: { entryCount: 1 } });
    res.status(201).json({ message: "Thank you!" });
  } catch (err) {
    next(err);
  }
}

// GET /api/pages/entries — every entry across the owner's pages (newest first)
export async function listEntries(req, res, next) {
  try {
    const entries = await PageEntry.find({ owner: req.userId }).sort({ createdAt: -1 }).limit(500).populate("page", "title slug type kind");
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/pages/entries/:id
export async function deleteEntry(req, res, next) {
  try {
    const e = await PageEntry.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!e) return res.status(404).json({ message: "Entry not found." });
    await Page.updateOne({ _id: e.page }, { $inc: { entryCount: -1 } });
    res.json({ message: "Deleted." });
  } catch (err) {
    next(err);
  }
}
