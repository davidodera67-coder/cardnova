// solutions.jsx — every QR "solution" except the food menu: instant QR codes
// (WiFi, text, email, SMS, WhatsApp, maps, calendar), tracked redirects (URL,
// smart, video, review, app) and hosted mini-pages (links, landing, files,
// gallery, feedback, form, coupon, event, payment, medical, pet, product…).
import React, { useState, useEffect } from "react";
import { Ic, K, Btn, Fld, Chips, Toggle, Swatches, Note, ImgUpload, CopyBtn, uid, safeUrl, waNumber, digits, money, downloadText } from "./kit.jsx";
import { PAL, DARK, FONTS, fontStack, useFonts } from "./menu.jsx";

/* --------------------------------------------------------------- helpers */
const esc = (s) => String(s ?? "").replace(/([\\;,:"])/g, "\\$1");
const icsEsc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
const icsDate = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length >= 12 ? d.slice(0, 12) + "00" : d.length === 8 ? d : ""; };

export function makeIcs({ title, start, end, location, description }) {
  const s = icsDate(start); const e = icsDate(end) || s;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CardNova//EN", "BEGIN:VEVENT",
    `UID:${uid()}@cardnova`, s.length === 8 ? `DTSTART;VALUE=DATE:${s}` : `DTSTART:${s}`, e.length === 8 ? `DTEND;VALUE=DATE:${e}` : `DTEND:${e}`,
    `SUMMARY:${icsEsc(title)}`, location ? `LOCATION:${icsEsc(location)}` : "", description ? `DESCRIPTION:${icsEsc(description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}


const vEsc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
export function makeVcard(d) {
  const first = (d.first || "").trim(), last = (d.last || "").trim();
  return [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${vEsc(last)};${vEsc(first)};;;`, `FN:${vEsc([first, last].filter(Boolean).join(" "))}`,
    d.org ? `ORG:${vEsc(d.org)}` : "", d.title ? `TITLE:${vEsc(d.title)}` : "",
    d.phone ? `TEL;TYPE=CELL:${String(d.phone).replace(/\s/g, "")}` : "", d.phone2 ? `TEL;TYPE=WORK:${String(d.phone2).replace(/\s/g, "")}` : "",
    d.email ? `EMAIL:${vEsc(d.email)}` : "", d.website ? `URL:${safeUrl(d.website)}` : "", d.address ? `ADR;TYPE=WORK:;;${vEsc(d.address)};;;;` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}
// GS1 check digit: weights 3,1,3,1… counted from the right, ignoring the check digit itself.
export function gtinProblem(raw) {
  const g = String(raw || "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(g.length)) return "A GTIN has 8, 12, 13 or 14 digits (the number under the barcode).";
  const body = g.slice(0, -1).split("").reverse();
  const sum = body.reduce((n, ch, i) => n + Number(ch) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(g.slice(-1)) ? "" : "That GTIN's last (check) digit doesn't match — please re-check the number.";
}
export const gtin14 = (raw) => String(raw || "").replace(/\D/g, "").padStart(14, "0");

export function youtubeId(u) {
  const m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(String(u || ""));
  return m ? m[1] : "";
}
export function vimeoId(u) { const m = /vimeo\.com\/(?:video\/)?(\d{5,})/.exec(String(u || "")); return m ? m[1] : ""; }

export function smartTarget(d, now = new Date(), ua = "") {
  const day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const tm = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  for (const w of d.windows || []) {
    if (!safeUrl(w.url)) continue;
    if ((w.days || []).length && !(w.days || []).includes(day)) continue;
    const a = tm(w.from), b = tm(w.to);
    if (a != null && b != null) { const inside = a <= b ? mins >= a && mins < b : mins >= a || mins < b; if (!inside) continue; }
    return safeUrl(w.url);
  }
  if (/iPhone|iPad|iPod/i.test(ua) && safeUrl(d.iosUrl)) return safeUrl(d.iosUrl);
  if (/Android/i.test(ua) && safeUrl(d.androidUrl)) return safeUrl(d.androidUrl);
  return safeUrl(d.url);
}

/* ------------------------------------------------------- solution catalog */
const DAYS = [["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]].map(([label, id]) => ({ id, label }));
const SOCIAL = [
  ["website", "Website", "#14112C", "globe"], ["whatsapp", "WhatsApp", "#25D366", "chat"], ["instagram", "Instagram", "#E1306C", "image"],
  ["facebook", "Facebook", "#1877F2", "users"], ["tiktok", "TikTok", "#111111", "video"], ["x", "X / Twitter", "#111111", "text"],
  ["youtube", "YouTube", "#FF0000", "video"], ["linkedin", "LinkedIn", "#0A66C2", "users"], ["email", "Email", "#7C5CFC", "mail"],
  ["phone", "Call", "#2F9E44", "phone"], ["maps", "Location", "#EA4335", "pin"], ["other", "Link", "#7C5CFC", "link"],
];
const socialOf = (k) => SOCIAL.find(s => s[0] === k) || SOCIAL[SOCIAL.length - 1];

const link = (label = "", url = "", kind = "website") => ({ id: uid(), label, url, kind });

// Field kinds: text, area, url, tel, email, num, date, datetime, time, select, toggle, image, pdf, list
export const SOL = {
  wifi: { mode: "static", icon: "wifi", name: "WiFi", desc: "Guests scan and join your network — no typing the password.",
    defaults: () => ({ ssid: "", password: "", security: "WPA", hidden: false }),
    fields: [
      { k: "ssid", label: "Network name (SSID)", req: true },
      { k: "security", label: "Security", kind: "select", options: [["WPA", "WPA / WPA2 (most routers)"], ["WEP", "WEP (old)"], ["nopass", "No password"]] },
      { k: "password", label: "Password", show: d => d.security !== "nopass" },
      { k: "hidden", label: "This network is hidden", kind: "toggle" },
    ],
    payload: d => `WIFI:T:${d.security === "nopass" ? "nopass" : d.security};S:${esc(d.ssid)};${d.security === "nopass" ? "" : `P:${esc(d.password)};`}${d.hidden ? "H:true;" : ""};` },
  text: { mode: "static", icon: "text", name: "Text", desc: "Show any message on the phone that scans — works offline.",
    defaults: () => ({ text: "" }),
    fields: [{ k: "text", label: "Your text", kind: "area", req: true, max: 600 }],
    payload: d => d.text },
  email: { mode: "static", icon: "mail", name: "Email", desc: "Opens a new email with the address, subject and message filled in.",
    defaults: () => ({ to: "", subject: "", body: "" }),
    fields: [{ k: "to", label: "Send to", kind: "email", req: true }, { k: "subject", label: "Subject" }, { k: "body", label: "Message", kind: "area" }],
    payload: d => `mailto:${d.to}?subject=${encodeURIComponent(d.subject || "")}&body=${encodeURIComponent(d.body || "")}` },
  sms: { mode: "static", icon: "sms", name: "SMS", desc: "Opens a text message to your number with the words ready.",
    defaults: () => ({ phone: "", message: "" }),
    fields: [{ k: "phone", label: "Phone number", kind: "tel", req: true, ph: "0712 345 678" }, { k: "message", label: "Message", kind: "area" }],
    payload: d => `SMSTO:${(d.phone || "").replace(/\s/g, "")}:${d.message || ""}` },
  whatsapp: { mode: "static", icon: "chat", name: "WhatsApp", desc: "Customers scan and start a WhatsApp chat with you.",
    defaults: () => ({ phone: "", message: "Hello! I scanned your QR code." }),
    fields: [{ k: "phone", label: "WhatsApp number", kind: "tel", req: true, ph: "0712 345 678", hint: "Kenyan numbers starting with 0 are converted automatically." }, { k: "message", label: "First message", kind: "area" }],
    payload: d => `https://wa.me/${waNumber(d.phone)}${d.message ? `?text=${encodeURIComponent(d.message)}` : ""}` },
  maps: { mode: "static", icon: "pin", name: "Google Maps", desc: "Scan to get directions to your shop, venue or office.",
    defaults: () => ({ place: "" }),
    fields: [{ k: "place", label: "Address, place name, or coordinates", req: true, ph: "Westgate Mall, Nairobi  —or—  -1.2921, 36.8219" }],
    payload: d => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((d.place || "").trim())}` },
  calendar: { mode: "static", icon: "calendar", name: "Calendar event", desc: "Scan to add your event straight to their calendar.",
    defaults: () => ({ title: "", start: "", end: "", location: "", description: "" }),
    fields: [{ k: "title", label: "Event title", req: true }, { k: "start", label: "Starts", kind: "datetime", req: true }, { k: "end", label: "Ends", kind: "datetime" }, { k: "location", label: "Where" }, { k: "description", label: "Details", kind: "area" }],
    payload: d => makeIcs(d) },
  google: { mode: "static", icon: "search", name: "Google search", desc: "Scan to open Google results for the words you choose.",
    defaults: () => ({ query: "" }),
    fields: [{ k: "query", label: "What should people search for?", req: true, ph: "best nyama choma in Nairobi", hint: "Great for a brand name, a hashtag or “near me” searches." }],
    payload: d => `https://www.google.com/search?q=${encodeURIComponent((d.query || "").trim())}` },
  vcard: { mode: "static", icon: "users", name: "Contact card (vCard)", desc: "Scan to save your name, phone and email straight into their contacts.",
    defaults: () => ({ first: "", last: "", org: "", title: "", phone: "", phone2: "", email: "", website: "", address: "" }),
    fields: [
      { k: "first", label: "First name", req: true }, { k: "last", label: "Last name" }, { k: "org", label: "Company" }, { k: "title", label: "Job title" },
      { k: "phone", label: "Mobile phone", kind: "tel", ph: "+254 712 345 678" }, { k: "phone2", label: "Work phone (optional)", kind: "tel" },
      { k: "email", label: "Email", kind: "email" }, { k: "website", label: "Website", kind: "url" }, { k: "address", label: "Address" } ],
    payload: d => makeVcard(d) },
  gs1: { mode: "static", icon: "tag", name: "GS1 product code", desc: "Link a product's GTIN (barcode number) to the GS1 digital-link page.",
    defaults: () => ({ gtin: "" }),
    fields: [{ k: "gtin", label: "GTIN (barcode number)", req: true, kind: "tel", ph: "6161101234567", hint: "The 8, 12, 13 or 14 digits printed under the barcode." }],
    check: d => gtinProblem(d.gtin),
    payload: d => `https://id.gs1.org/01/${gtin14(d.gtin)}` },

  url: { mode: "page", icon: "link", name: "Dynamic URL", desc: "A short QR that sends people to your link. Change the link any time; see how many scans.",
    defaults: () => ({ url: "", title: "" }),
    fields: [{ k: "url", label: "Where should it go?", kind: "url", req: true, ph: "https://" }, { k: "title", label: "Name for your own reference (optional)" }] },
  smart: { mode: "page", icon: "zap", name: "Smart redirect", desc: "Send people to different places by phone type, day or time of day.",
    defaults: () => ({ url: "", iosUrl: "", androidUrl: "", windows: [] }),
    fields: [
      { k: "url", label: "Default link (everyone else)", kind: "url", req: true, ph: "https://" },
      { k: "iosUrl", label: "iPhone link (optional)", kind: "url" }, { k: "androidUrl", label: "Android link (optional)", kind: "url" },
      { k: "windows", label: "Time & day rules (optional)", kind: "list", add: "Add a rule", hint: "First matching rule wins. Example: lunch menu 11:00–15:00, Mon–Fri.", sub: [
        { k: "label", label: "Rule name", ph: "Lunch menu" }, { k: "days", label: "Days (none = every day)", kind: "days" },
        { k: "from", label: "From", kind: "time" }, { k: "to", label: "Until", kind: "time" }, { k: "url", label: "Send them to", kind: "url" } ] },
    ] },
  video: { mode: "page", icon: "video", name: "Video", desc: "Play a YouTube or Vimeo video right on the page.",
    defaults: () => ({ url: "", title: "", note: "", image: "" }),
    fields: [{ k: "url", label: "Video link", kind: "url", req: true, ph: "https://youtu.be/…" }, { k: "title", label: "Title" }, { k: "note", label: "Short description", kind: "area" }] },
  review: { mode: "page", icon: "star", name: "Google review", desc: "Make it one tap for happy customers to rate you on Google.",
    defaults: () => ({ business: "", url: "", message: "Enjoyed your visit? A quick Google review helps a small business a lot.", image: "", auto: false }),
    fields: [
      { k: "business", label: "Business name", req: true }, { k: "url", label: "Your Google review link", kind: "url", req: true, ph: "https://g.page/r/…/review", hint: "In Google Maps open your business → “Get more reviews” → copy the link." },
      { k: "message", label: "Message", kind: "area" }, { k: "image", label: "Logo", kind: "image" }, { k: "auto", label: "Skip this page and open Google straight away", kind: "toggle" } ] },
  app: { mode: "page", icon: "mobile", name: "App download", desc: "One QR for both stores. Android users get Play Store, iPhone users get the App Store.",
    defaults: () => ({ name: "", tagline: "", image: "", iosUrl: "", androidUrl: "", webUrl: "", auto: false }),
    fields: [
      { k: "name", label: "App name", req: true }, { k: "tagline", label: "One-line description" }, { k: "image", label: "App icon", kind: "image" },
      { k: "androidUrl", label: "Google Play link", kind: "url" }, { k: "iosUrl", label: "App Store link", kind: "url" }, { k: "webUrl", label: "Website link (other devices)", kind: "url" },
      { k: "auto", label: "Send people straight to their store (no page)", kind: "toggle" } ] },

  links: { mode: "page", icon: "link", name: "Links & social page", desc: "A Linktree-style page with all your links, social accounts and contact buttons.",
    defaults: () => ({ title: "", subtitle: "", image: "", links: [link("Visit my website", "", "website"), link("Chat on WhatsApp", "", "whatsapp")] }),
    fields: [
      { k: "title", label: "Page title", req: true, ph: "e.g. Mama Njeri's Bakery" }, { k: "subtitle", label: "Short bio" }, { k: "image", label: "Logo or photo", kind: "image" },
      { k: "links", label: "Your links", kind: "list", add: "Add a link", sub: [
        { k: "kind", label: "Type", kind: "select", options: SOCIAL.map(s => [s[0], s[1]]) }, { k: "label", label: "Button text" }, { k: "url", label: "Link / number / email", ph: "https://… or 0712…" } ] },
    ] },
  landing: { mode: "page", icon: "layers", name: "Landing page", desc: "A one-screen promo page for a product, service or campaign.",
    defaults: () => ({ image: "", headline: "", text: "", cta: "Learn more", ctaUrl: "", features: [], phone: "", whatsapp: "", email: "" }),
    fields: [
      { k: "image", label: "Hero picture", kind: "image" }, { k: "headline", label: "Headline", req: true, ph: "e.g. Fresh bread, baked at 5am" }, { k: "text", label: "Description", kind: "area" },
      { k: "cta", label: "Button text" }, { k: "ctaUrl", label: "Button link", kind: "url" },
      { k: "features", label: "Highlights", kind: "list", add: "Add highlight", sub: [{ k: "label", label: "Highlight", ph: "Free delivery within CBD" }] },
      { k: "phone", label: "Call button number", kind: "tel" }, { k: "whatsapp", label: "WhatsApp number", kind: "tel" }, { k: "email", label: "Email", kind: "email" } ] },
  meeting: { mode: "page", icon: "video", name: "Online meeting", desc: "Zoom, Google Meet, Teams or Skype — join with one scan.",
    defaults: () => ({ platform: "Zoom", title: "", url: "", when: "", host: "", meetingId: "", passcode: "", notes: "" }),
    fields: [
      { k: "platform", label: "Platform", kind: "select", options: ["Zoom", "Google Meet", "Microsoft Teams", "Skype", "Other"].map(x => [x, x]) },
      { k: "title", label: "Meeting title", req: true }, { k: "url", label: "Join link", kind: "url", req: true }, { k: "when", label: "When (optional)", kind: "datetime" },
      { k: "host", label: "Host" }, { k: "meetingId", label: "Meeting ID" }, { k: "passcode", label: "Passcode" }, { k: "notes", label: "Notes", kind: "area" } ] },
  files: { mode: "page", icon: "file", name: "Documents", desc: "PDFs, CV, presentation or brochures people can open and download.",
    defaults: () => ({ title: "", intro: "", image: "", files: [{ id: uid(), title: "", url: "", note: "" }] }),
    fields: [
      { k: "title", label: "Page title", req: true }, { k: "intro", label: "Intro (optional)", kind: "area" }, { k: "image", label: "Cover or photo", kind: "image" },
      { k: "files", label: "Documents", kind: "list", add: "Add a document", sub: [{ k: "title", label: "Title", ph: "Product brochure" }, { k: "url", label: "File", kind: "pdf" }, { k: "note", label: "Note (optional)" }] } ] },
  gallery: { mode: "page", icon: "image", name: "Image gallery", desc: "Show a photo collection — portfolio, property, products or events.",
    defaults: () => ({ title: "", text: "", whatsapp: "", images: [] }),
    fields: [
      { k: "title", label: "Gallery title", req: true }, { k: "text", label: "Description", kind: "area" },
      { k: "images", label: "Pictures", kind: "list", add: "Add picture", sub: [{ k: "url", label: "Picture", kind: "image" }, { k: "caption", label: "Caption (optional)" }] },
      { k: "whatsapp", label: "WhatsApp number for enquiries (optional)", kind: "tel" } ] },
  feedback: { mode: "page", icon: "star", name: "Feedback & rating", desc: "Collect star ratings and comments from customers, privately.",
    defaults: () => ({ business: "", prompt: "How was your experience today?", askComment: true, askContact: false, thanks: "Thank you! Your feedback helps us improve.", reviewUrl: "", image: "" }),
    fields: [
      { k: "business", label: "Business name", req: true }, { k: "image", label: "Logo", kind: "image" }, { k: "prompt", label: "Question" },
      { k: "askComment", label: "Ask for a comment", kind: "toggle" }, { k: "askContact", label: "Ask for name and phone (so you can reply)", kind: "toggle" },
      { k: "thanks", label: "Thank-you message" }, { k: "reviewUrl", label: "Google review link (shown to everyone after they submit)", kind: "url", hint: "Optional. Shown to every customer, not just happy ones." } ] },
  form: { mode: "page", icon: "text", name: "Form", desc: "Build a simple form — enquiries, sign-ups, bookings — answers saved in your dashboard.",
    defaults: () => ({ title: "", intro: "", submit: "Send", thanks: "Thank you! We'll be in touch.", fields: [{ id: uid(), label: "Your name", type: "text", required: true }, { id: uid(), label: "Phone number", type: "tel", required: true }, { id: uid(), label: "Message", type: "area", required: false }] }),
    fields: [
      { k: "title", label: "Form title", req: true }, { k: "intro", label: "Intro (optional)", kind: "area" },
      { k: "fields", label: "Questions", kind: "list", add: "Add a question", sub: [
        { k: "label", label: "Question" }, { k: "type", label: "Answer type", kind: "select", options: [["text", "Short text"], ["area", "Long text"], ["tel", "Phone"], ["email", "Email"], ["number", "Number"], ["select", "Choose one"]] },
        { k: "options", label: "Choices (comma separated)", show: s => s.type === "select" }, { k: "required", label: "Required", kind: "toggle" }] },
      { k: "submit", label: "Button text" }, { k: "thanks", label: "Thank-you message" } ] },
  coupon: { mode: "page", icon: "gift", name: "Coupon", desc: "A discount page with a code, expiry date and terms.",
    defaults: () => ({ business: "", headline: "", text: "", code: "", expires: "", terms: "", image: "", btn: "", btnUrl: "" }),
    fields: [
      { k: "business", label: "Business name", req: true }, { k: "headline", label: "Offer", req: true, ph: "20% OFF your next order" }, { k: "text", label: "Details", kind: "area" },
      { k: "code", label: "Coupon code", ph: "NOVA20" }, { k: "expires", label: "Expires on", kind: "date" }, { k: "terms", label: "Terms & conditions", kind: "area" },
      { k: "image", label: "Logo or picture", kind: "image" }, { k: "btn", label: "Button text (optional)", ph: "Order now" }, { k: "btnUrl", label: "Button link", kind: "url" } ] },
  event: { mode: "page", icon: "ticket", name: "Event", desc: "An event page with date, place, map, add-to-calendar and optional RSVP.",
    defaults: () => ({ title: "", image: "", start: "", end: "", venue: "", address: "", text: "", rsvp: true, ticketUrl: "", organizer: "", phone: "" }),
    fields: [
      { k: "title", label: "Event name", req: true }, { k: "image", label: "Poster / cover", kind: "image" }, { k: "start", label: "Starts", kind: "datetime", req: true }, { k: "end", label: "Ends", kind: "datetime" },
      { k: "venue", label: "Venue" }, { k: "address", label: "Address (for the map button)" }, { k: "text", label: "About the event", kind: "area" },
      { k: "rsvp", label: "Let people RSVP", kind: "toggle" }, { k: "ticketUrl", label: "Ticket link (optional)", kind: "url" }, { k: "organizer", label: "Organiser" }, { k: "phone", label: "Contact phone", kind: "tel" } ] },
  payment: { mode: "page", icon: "dollar", name: "M-Pesa payment", desc: "Show your Till, Paybill or number with step-by-step pay instructions.",
    defaults: () => ({ business: "", method: "till", number: "", account: "", amount: "", note: "", image: "" }),
    fields: [
      { k: "business", label: "Business / payee name", req: true }, { k: "image", label: "Logo", kind: "image" },
      { k: "method", label: "How do customers pay?", kind: "select", options: [["till", "Buy Goods — Till number"], ["paybill", "Paybill"], ["send", "Send money — phone number"]] },
      { k: "number", label: "Till / Paybill / phone number", kind: "tel", req: true }, { k: "account", label: "Account number", show: d => d.method === "paybill", ph: "e.g. customer's name or order no." },
      { k: "amount", label: "Fixed amount (optional)", kind: "num" }, { k: "note", label: "Note to customer", kind: "area" } ] },
  medical: { mode: "page", icon: "pulse", name: "Medical alert ID", desc: "Emergency info for first responders: blood group, allergies, contacts.",
    defaults: () => ({ name: "", image: "", dob: "", blood: "", allergies: "", conditions: "", medication: "", insurance: "", doctor: "", notes: "", contacts: [{ id: uid(), name: "", relation: "", phone: "" }] }),
    fields: [
      { k: "name", label: "Full name", req: true }, { k: "image", label: "Photo", kind: "image" }, { k: "dob", label: "Date of birth", kind: "date" },
      { k: "blood", label: "Blood group", kind: "select", options: [["", "—"], ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(x => [x, x])] },
      { k: "allergies", label: "Allergies" }, { k: "conditions", label: "Medical conditions" }, { k: "medication", label: "Medication" }, { k: "insurance", label: "Insurance / NHIF number" }, { k: "doctor", label: "Doctor / hospital" }, { k: "notes", label: "Other notes", kind: "area" },
      { k: "contacts", label: "Emergency contacts", kind: "list", add: "Add contact", sub: [{ k: "name", label: "Name" }, { k: "relation", label: "Relationship" }, { k: "phone", label: "Phone", kind: "tel" }] } ],
    privacy: "Anyone who scans this code can read everything on the page. Only add what you're comfortable sharing in an emergency." },
  pet: { mode: "page", icon: "paw", name: "Pet ID tag", desc: "Put it on a collar. Whoever finds your pet can call or WhatsApp you instantly.",
    defaults: () => ({ name: "", image: "", kind: "", breed: "", owner: "", phone: "", whatsapp: "", address: "", notes: "", reward: "" }),
    fields: [
      { k: "name", label: "Pet's name", req: true }, { k: "image", label: "Photo", kind: "image" }, { k: "kind", label: "Dog, cat…" }, { k: "breed", label: "Breed / colour" },
      { k: "owner", label: "Owner's name" }, { k: "phone", label: "Phone", kind: "tel", req: true }, { k: "whatsapp", label: "WhatsApp (if different)", kind: "tel" },
      { k: "address", label: "Area you live in (optional)" }, { k: "notes", label: "Notes (medication, shy, friendly…)", kind: "area" }, { k: "reward", label: "Reward message (optional)" } ] },
  product: { mode: "page", icon: "bag", name: "Product page", desc: "Showcase one product with photos, price and a Buy / Order button.",
    defaults: () => ({ name: "", price: "", oldPrice: "", text: "", images: [], features: [], whatsapp: "", buyUrl: "", cta: "Order on WhatsApp", sku: "" }),
    fields: [
      { k: "name", label: "Product name", req: true }, { k: "price", label: "Price (KSh)", kind: "num" }, { k: "oldPrice", label: "Old price (optional)", kind: "num" }, { k: "text", label: "Description", kind: "area" },
      { k: "images", label: "Photos", kind: "list", add: "Add photo", sub: [{ k: "url", label: "Photo", kind: "image" }] },
      { k: "features", label: "Key features", kind: "list", add: "Add feature", sub: [{ k: "label", label: "Feature" }] },
      { k: "whatsapp", label: "WhatsApp number for orders", kind: "tel" }, { k: "buyUrl", label: "Or a web link to buy", kind: "url" }, { k: "cta", label: "Button text" }, { k: "sku", label: "SKU / code (optional)" } ] },
};

// What the "Create" screen shows. `type` points into SOL; `preset` overrides defaults.
export const CHOOSER = [
  { id: "menu", special: "menu", cat: "food", icon: "utensils", name: "Food & drinks menu", desc: "A digital menu with 50 templates, ordering on WhatsApp and table QR codes.", badge: "Popular" },
  { id: "card", special: "card", cat: "business", icon: "users", name: "Digital business card", desc: "Your contact card with NFC and QR — opens the card builder." },
  { id: "links", type: "links", cat: "links", badge: "Popular" },
  { id: "social", type: "links", cat: "links", icon: "users", name: "Social media page", desc: "All your social accounts on one page.", preset: { title: "Follow us", links: [link("Instagram", "", "instagram"), link("Facebook", "", "facebook"), link("TikTok", "", "tiktok"), link("YouTube", "", "youtube")] } },
  { id: "url", type: "url", cat: "links" }, { id: "smart", type: "smart", cat: "links" },
  { id: "landing", type: "landing", cat: "business" },
  { id: "review", type: "review", cat: "business", badge: "Popular" }, { id: "feedback", type: "feedback", cat: "business" },
  { id: "form", type: "form", cat: "business" }, { id: "coupon", type: "coupon", cat: "business" }, { id: "product", type: "product", cat: "business" },
  { id: "payment", type: "payment", cat: "business", badge: "M-Pesa" }, { id: "app", type: "app", cat: "business" },
  { id: "wifi", type: "wifi", cat: "connect", badge: "Instant" }, { id: "whatsapp", type: "whatsapp", cat: "connect", badge: "Instant" },
  { id: "text", type: "text", cat: "connect", badge: "Instant" }, { id: "email", type: "email", cat: "connect", badge: "Instant" }, { id: "sms", type: "sms", cat: "connect", badge: "Instant" },
  { id: "maps", type: "maps", cat: "connect", badge: "Instant" }, { id: "meeting", type: "meeting", cat: "connect" },
  { id: "google", type: "google", cat: "connect", badge: "Instant" },
  { id: "vcard", type: "vcard", cat: "business", badge: "Instant" }, { id: "gs1", type: "gs1", cat: "business", badge: "New" },
  { id: "facebook", type: "links", cat: "links", icon: "users", name: "Facebook page", desc: "Send people to your Facebook page so they can follow and message you.", preset: { title: "Find us on Facebook", links: [link("Like us on Facebook", "", "facebook"), link("Message us on WhatsApp", "", "whatsapp"), link("Visit our website", "", "website")] } },
  { id: "gform", type: "url", cat: "links", icon: "list", name: "Google Form / survey", desc: "Send people to your Google Form, survey or sign-up sheet.", preset: { title: "Survey" } },
  { id: "pdf", type: "files", cat: "media", icon: "file", name: "PDF", desc: "Let people open and download a PDF — brochure, price list, manual.", preset: { title: "Download our PDF" } },
  { id: "resume", type: "files", cat: "media", icon: "file", name: "Resume / CV", desc: "Share your CV or portfolio with employers in one scan.", preset: { title: "My CV", files: [{ id: uid(), title: "Curriculum Vitae", url: "", note: "" }] } },
  { id: "presentation", type: "files", cat: "media", icon: "layers", name: "Presentation", desc: "Share your slides as a PDF after a talk or pitch.", preset: { title: "Presentation slides" } },
  { id: "pdfgallery", type: "files", cat: "media", icon: "list", name: "PDF gallery", desc: "Several PDFs on one page — manuals, catalogues, price lists.", preset: { title: "Documents", files: [{ id: uid(), title: "", url: "", note: "" }, { id: uid(), title: "", url: "", note: "" }] } },
  { id: "gallery", type: "gallery", cat: "media" }, { id: "video", type: "video", cat: "media" },
  { id: "youtube", type: "video", cat: "media", icon: "video", name: "YouTube", desc: "Take people to your YouTube video or channel — plays right on the page.", preset: { title: "Watch on YouTube" } },
  { id: "event", type: "event", cat: "events", badge: "RSVP" }, { id: "ticket", type: "event", cat: "events", icon: "ticket", name: "Event ticket", desc: "An invitation page with RSVP — see who is coming in your Responses tab.", preset: { rsvp: true, title: "Admit one — " } }, { id: "calendar", type: "calendar", cat: "events", badge: "Instant" },
  { id: "medical", type: "medical", cat: "safety" }, { id: "pet", type: "pet", cat: "safety" },
].map(c => c.type ? { icon: SOL[c.type].icon, name: SOL[c.type].name, desc: SOL[c.type].desc, ...c } : c);

export const CHOOSER_CATS = [
  { id: "all", label: "All" }, { id: "food", label: "Food & drink" }, { id: "business", label: "Business" }, { id: "links", label: "Links" },
  { id: "connect", label: "Connect" }, { id: "media", label: "Files & media" }, { id: "events", label: "Events" }, { id: "safety", label: "Safety & ID" },
];

export const isStatic = (type) => SOL[type]?.mode === "static";
export function staticPayload(type, data) { try { return SOL[type].payload(data); } catch { return ""; } }
export function solutionReady(type, data) {
  const s = SOL[type]; if (!s) return "Unknown type";
  for (const f of s.fields) {
    if (f.req && !String(data[f.k] ?? "").trim()) return `Please fill in “${f.label}”.`;
  }
  if (s.check) return s.check(data) || "";
  return "";
}
export function newSolutionData(c) { return { ...SOL[c.type].defaults(), ...(c.preset ? JSON.parse(JSON.stringify(c.preset)) : {}) }; }

/* ----------------------------------------------------------------- editor */
function SubField({ f, val, onChange, token, row }) {
  if (f.show && !f.show(row)) return null;
  const ph = f.ph || "";
  if (f.kind === "select") return <Fld label={f.label}><select value={val ?? ""} onChange={e => onChange(e.target.value)}>{f.options.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Fld>;
  if (f.kind === "toggle") return <Toggle checked={val} onChange={onChange} label={f.label} />;
  if (f.kind === "image") return <Fld label={f.label}><ImgUpload value={val} onChange={onChange} token={token} /></Fld>;
  if (f.kind === "pdf") return <Fld label={f.label} hint="Upload a PDF (max 10 MB) or paste a link below."><ImgUpload pdf value={val} onChange={onChange} token={token} label="Upload PDF" /><input value={val || ""} onChange={e => onChange(e.target.value)} placeholder="…or paste a link" style={{ marginTop: 6 }} /></Fld>;
  if (f.kind === "days") return <Fld label={f.label}><Chips multi value={val || []} onChange={onChange} options={DAYS} /></Fld>;
  if (f.kind === "time") return <Fld label={f.label}><input type="time" value={val || ""} onChange={e => onChange(e.target.value)} /></Fld>;
  if (f.kind === "area") return <Fld label={f.label} hint={f.hint}><textarea rows={3} value={val || ""} maxLength={f.max || 2000} onChange={e => onChange(e.target.value)} placeholder={ph} /></Fld>;
  const type = f.kind === "datetime" ? "datetime-local" : f.kind === "date" ? "date" : f.kind === "num" ? "text" : f.kind === "tel" ? "tel" : f.kind === "email" ? "email" : "text";
  return <Fld label={f.label + (f.req ? " *" : "")} hint={f.hint}><input type={type} inputMode={f.kind === "num" ? "decimal" : undefined} value={val ?? ""} placeholder={ph || (f.kind === "url" ? "https://" : "")} onChange={e => onChange(f.kind === "num" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)} /></Fld>;
}

function ListField({ f, items, onChange, token }) {
  const list = items || [];
  const mv = (i, d) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const blank = () => { const o = { id: uid() }; f.sub.forEach(s => { o[s.k] = s.kind === "days" ? [] : s.kind === "toggle" ? false : s.kind === "select" ? s.options[0][0] : ""; }); return o; };
  return (
    <Fld label={f.label} hint={f.hint}>
      {list.map((row, i) => (
        <div key={row.id || i} style={{ background: K.fog, borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div className="sx-row" style={{ marginBottom: 6 }}>
            <b className="sx-grow" style={{ fontSize: 12 }}>#{i + 1}</b>
            <button type="button" aria-label="Move up" onClick={() => mv(i, -1)}><Ic n="up" size={14} /></button>
            <button type="button" aria-label="Move down" onClick={() => mv(i, 1)}><Ic n="down" size={14} /></button>
            <button type="button" aria-label="Remove" onClick={() => onChange(list.filter((_, k) => k !== i))}><Ic n="trash" size={14} color={K.warn} /></button>
          </div>
          {f.sub.map(sf => <SubField key={sf.k} f={sf} row={row} val={row[sf.k]} token={token} onChange={v => onChange(list.map((r, k) => k === i ? { ...r, [sf.k]: v } : r))} />)}
        </div>
      ))}
      <Btn kind="soft" size="sm" icon="plus" onClick={() => onChange([...list, blank()])}>{f.add || "Add"}</Btn>
    </Fld>
  );
}

export function SolutionFields({ type, data, set, token }) {
  const s = SOL[type];
  return (
    <div>
      {s.privacy && <Note>{s.privacy}</Note>}
      {s.fields.map(f => {
        if (f.show && !f.show(data)) return null;
        if (f.kind === "list") return <ListField key={f.k} f={f} items={data[f.k]} token={token} onChange={v => set({ ...data, [f.k]: v })} />;
        return <SubField key={f.k} f={f} row={data} val={data[f.k]} token={token} onChange={v => set({ ...data, [f.k]: v })} />;
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- look */
const LOOKS = ["lavender", "snow", "noir", "navy", "matcha", "sky", "coral", "sunrise", "blush", "forest"];
const LOOK_NAMES = { lavender: "Violet", snow: "Clean", noir: "Night gold", navy: "Navy", matcha: "Matcha", sky: "Sky", coral: "Coral", sunrise: "Sunrise", blush: "Blush", forest: "Forest" };
export function lookTokens(design = {}) {
  const key = PAL[design.pal] ? design.pal : "lavender";
  const [bg, fg, muted, accent, card, line] = PAL[key];
  const acc = design.accent || accent;
  const m = /^#?([0-9a-f]{6})$/i.exec(acc); const v = m ? parseInt(m[1], 16) : 0;
  const l = (((v >> 16) & 255) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000;
  return { bg, fg, muted, accent: acc, accentFg: l > 150 ? "#111" : "#fff", card, line, dark: DARK.has(key), hFont: design.font || "Space Grotesk", bFont: "Inter", radius: design.round === "sharp" ? 6 : 16 };
}
export function SolutionLook({ design, setDesign }) {
  const t = lookTokens(design);
  return (
    <div>
      <Fld label="Colour theme">
        <div className="sx-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {LOOKS.map(k => (
            <button key={k} type="button" aria-label={LOOK_NAMES[k]} onClick={() => setDesign({ ...design, pal: k })} style={{ border: `2px solid ${(design.pal || "lavender") === k ? K.violet : K.line}`, borderRadius: 10, padding: 4, background: "#fff" }}>
              <div style={{ background: PAL[k][0], borderRadius: 6, height: 30, display: "flex", alignItems: "flex-end", padding: 3 }}><div style={{ background: PAL[k][3], height: 8, width: "70%", borderRadius: 3 }} /></div>
              <div style={{ fontSize: 10, marginTop: 3 }}>{LOOK_NAMES[k]}</div>
            </button>
          ))}
        </div>
      </Fld>
      <Fld label="Button colour"><Swatches value={t.accent} onChange={x => setDesign({ ...design, accent: x })} colors={["#7C5CFC", "#1D7FC4", "#2F9E44", "#E8492A", "#BE185D", "#111111", "#C99A00"]} /></Fld>
      <Fld label="Heading font"><select value={design.font || "Space Grotesk"} onChange={e => setDesign({ ...design, font: e.target.value })}>{FONTS.map(f => <option key={f}>{f}</option>)}</select></Fld>
      <Fld label="Corners"><Chips value={design.round || "soft"} onChange={x => setDesign({ ...design, round: x })} options={[{ id: "soft", label: "Rounded" }, { id: "sharp", label: "Sharp" }]} /></Fld>
    </div>
  );
}

/* ---------------------------------------------------------- scan preview */
// For instant QR types: shows what the visitor's phone will do.
export function StaticPreview({ type, data }) {
  const s = SOL[type];
  const box = { border: `1px solid ${K.line}`, borderRadius: 14, padding: 14, background: "#fff", margin: 14 };
  let body = null;
  if (type === "wifi") body = <><b>Join “{data.ssid || "network"}”?</b><p className="sx-mut">{data.security === "nopass" ? "Open network" : `Password: ${data.password ? "••••••••" : "—"}`}</p><Btn size="sm">Join network</Btn></>;
  else if (type === "text") body = <p style={{ whiteSpace: "pre-wrap" }}>{data.text || "Your text appears here."}</p>;
  else if (type === "email") body = <><b>New email</b><p className="sx-mut">To: {data.to || "—"}<br />Subject: {data.subject || "—"}</p><p style={{ whiteSpace: "pre-wrap" }}>{data.body}</p></>;
  else if (type === "sms") body = <><b>New message to {data.phone || "—"}</b><p style={{ background: K.fog, borderRadius: 12, padding: 8, marginTop: 6, whiteSpace: "pre-wrap" }}>{data.message || "…"}</p></>;
  else if (type === "whatsapp") body = <><b>Open WhatsApp chat</b><p className="sx-mut">with +{waNumber(data.phone) || "—"}</p><p style={{ background: "#DCF8C6", borderRadius: 12, padding: 8, whiteSpace: "pre-wrap" }}>{data.message}</p></>;
  else if (type === "maps") body = <><b>Open in Google Maps</b><p className="sx-mut">{data.place || "—"}</p></>;
  else if (type === "google") body = <><b>Open Google search</b><p className="sx-mut">“{data.query || "—"}”</p></>;
  else if (type === "vcard") body = <><b>Add to contacts</b><p>{[data.first, data.last].filter(Boolean).join(" ") || "—"}</p><p className="sx-mut">{[data.title, data.org].filter(Boolean).join(" · ")}{data.phone ? <><br />{data.phone}</> : null}{data.email ? <><br />{data.email}</> : null}</p></>;
  else if (type === "gs1") body = <><b>Open product page</b><p className="sx-mut">GTIN {gtin14(data.gtin)}</p><p className="sx-mut">Opens the GS1 digital link for this product.</p></>;
  else if (type === "calendar") body = <><b>Add to calendar</b><p>{data.title || "—"}</p><p className="sx-mut">{data.start ? new Date(data.start).toLocaleString() : "—"}{data.location ? ` · ${data.location}` : ""}</p></>;
  return (
    <div style={{ padding: "26px 0" }}>
      <div style={{ textAlign: "center", color: K.violetDeep }}><Ic n={s.icon} size={30} /></div>
      <p className="sx-mut" style={{ textAlign: "center", margin: "4px 14px 0" }}>This is what happens when someone scans:</p>
      <div style={box}>{body}</div>
      <p className="sx-mut" style={{ margin: "0 14px", textAlign: "center" }}>Works with the normal phone camera — no app, no internet needed for this type.</p>
    </div>
  );
}

/* -------------------------------------------------------------- public views */
const pb = (t, kind = "solid") => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 16px", borderRadius: t.radius, fontWeight: 700, fontSize: 15, textDecoration: "none", cursor: "pointer", fontFamily: "inherit",
  background: kind === "solid" ? t.accent : t.card, color: kind === "solid" ? t.accentFg : t.fg, border: kind === "solid" ? "none" : `1.5px solid ${t.line}`, marginBottom: 10,
});
const box = (t) => ({ background: t.card, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 16, marginBottom: 12 });
const inp = (t) => ({ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${t.line}`, background: t.bg, color: t.fg, fontSize: 15, outline: "none", fontFamily: "inherit", marginBottom: 10 });
const Lbl = ({ t, children }) => <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 4 }}>{children}</span>;
const Avatar = ({ src, t, size = 84, round = true }) => src ? <img src={src} alt="" style={{ width: size, height: size, borderRadius: round ? "50%" : t.radius, objectFit: "cover", border: `3px solid ${t.card}` }} /> : null;

function Frame({ t, children, preview }) {
  useFonts([t.hFont]);
  return (
    <div style={{ background: t.bg, color: t.fg, fontFamily: fontStack(t.bFont), minHeight: preview ? "100%" : "100vh", fontSize: 15, lineHeight: 1.5 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 36px" }}>
        {children}
        <p style={{ textAlign: "center", fontSize: 11, color: t.muted, marginTop: 22 }}>Made with CardNova</p>
      </div>
    </div>
  );
}
const H1 = ({ t, children, style }) => <h1 style={{ fontFamily: fontStack(t.hFont), fontSize: 26, fontWeight: 700, lineHeight: 1.15, margin: 0, ...style }}>{children}</h1>;

function useSubmit(onEntry) {
  const [state, setState] = useState("idle"); const [err, setErr] = useState("");
  const submit = async (entry) => {
    setState("busy"); setErr("");
    try { if (onEntry) await onEntry(entry); setState("done"); }
    catch (e) { setErr(e.message || "Couldn't send. Try again."); setState("idle"); }
  };
  return { state, err, submit };
}

function Redirecting({ t, to, label }) {
  useEffect(() => { if (to) { const id = setTimeout(() => { window.location.replace(to); }, 350); return () => clearTimeout(id); } }, [to]);
  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${t.line}`, borderTopColor: t.accent, borderRadius: "50%", margin: "0 auto 14px", animation: "sxspin .8s linear infinite" }} />
      <p style={{ color: t.muted }}>{label || "Opening…"}</p>
      {to ? <p style={{ marginTop: 14 }}><a href={to} style={{ color: t.accent, fontWeight: 600 }}>Tap here if nothing happens</a></p> : <p style={{ color: t.muted, marginTop: 14 }}>This link hasn't been set up yet.</p>}
    </div>
  );
}

export function SolutionView({ type, data, design, title, onEntry, preview }) {
  const t = lookTokens(design);
  const d = data || {};
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const [zoom, setZoom] = useState("");
  const sub = useSubmit(onEntry);
  const [vals, setVals] = useState({});
  const [stars, setStars] = useState(0);
  const [copied, setCopied] = useState("");
  const copy = async (txt, key) => { try { await navigator.clipboard.writeText(txt); } catch { /* ignore */ } setCopied(key); setTimeout(() => setCopied(""), 1500); };
  const setV = (k, v) => setVals(x => ({ ...x, [k]: v }));
  const A = ({ href, kind, icon, children, ...r }) => <a href={href} style={pb(t, kind)} target={/^https?:/.test(href || "") ? "_blank" : undefined} rel="noreferrer" {...r}>{icon && <Ic n={icon} size={17} />}{children}</a>;

  /* redirects */
  if (type === "url") { const to = preview ? "" : safeUrl(d.url); return <Frame t={t} preview={preview}>{preview ? <Preview1 t={t} text={`Visitors are sent to ${safeUrl(d.url) || "your link"}`} /> : <Redirecting t={t} to={to} />}</Frame>; }
  if (type === "smart") { const to = smartTarget(d, new Date(), ua); return <Frame t={t} preview={preview}>{preview ? <Preview1 t={t} text={`Right now this opens: ${to || "(set a default link)"}`} /> : <Redirecting t={t} to={to} />}</Frame>; }
  if (type === "review" && d.auto && !preview && safeUrl(d.url)) return <Frame t={t}><Redirecting t={t} to={safeUrl(d.url)} label="Opening Google reviews…" /></Frame>;
  if (type === "app" && d.auto && !preview) {
    const to = /iPhone|iPad|iPod/i.test(ua) ? safeUrl(d.iosUrl) : /Android/i.test(ua) ? safeUrl(d.androidUrl) : safeUrl(d.webUrl);
    if (to) return <Frame t={t}><Redirecting t={t} to={to} label="Taking you to the store…" /></Frame>;
  }

  const head = (name, subtitle, img, round = true) => (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      {img && <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Avatar src={img} t={t} round={round} /></div>}
      <H1 t={t}>{name}</H1>
      {subtitle && <p style={{ color: t.muted, marginTop: 6 }}>{subtitle}</p>}
    </div>
  );

  switch (type) {
    case "video": {
      const yt = youtubeId(d.url), vm = vimeoId(d.url);
      const src = yt ? `https://www.youtube-nocookie.com/embed/${yt}` : vm ? `https://player.vimeo.com/video/${vm}` : "";
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || title || "Watch the video", d.note)}
          {src ? <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: t.radius, overflow: "hidden", marginBottom: 14, background: "#000" }}><iframe title="Video" src={src} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div> : null}
          {safeUrl(d.url) && <A href={safeUrl(d.url)} icon="video">{src ? "Open in app" : "Watch video"}</A>}
        </Frame>
      );
    }
    case "review":
      return (
        <Frame t={t} preview={preview}>
          {head(d.business || "Thank you!", d.message, d.image)}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, color: "#F5B400", margin: "6px 0 18px" }}>{[1, 2, 3, 4, 5].map(i => <Ic key={i} n="star" size={34} sw={1.5} style={{ fill: "#F5B400" }} />)}</div>
          {safeUrl(d.url) ? <A href={safeUrl(d.url)} icon="star">Leave a Google review</A> : <p style={{ textAlign: "center", color: t.muted }}>Add your review link to finish setting this up.</p>}
        </Frame>
      );
    case "app":
      return (
        <Frame t={t} preview={preview}>
          {head(d.name || "Get the app", d.tagline, d.image, false)}
          {safeUrl(d.androidUrl) && <A href={safeUrl(d.androidUrl)} icon="download">Get it on Google Play</A>}
          {safeUrl(d.iosUrl) && <A href={safeUrl(d.iosUrl)} icon="download" kind={safeUrl(d.androidUrl) ? "ghost" : "solid"}>Download on the App Store</A>}
          {safeUrl(d.webUrl) && <A href={safeUrl(d.webUrl)} kind="ghost" icon="globe">Visit the website</A>}
        </Frame>
      );
    case "links":
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || title || "My links", d.subtitle, d.image)}
          {(d.links || []).filter(l => l.url || l.label).map(l => {
            const [kind, name, col, icon] = socialOf(l.kind);
            const raw = String(l.url || "").trim();
            const href = kind === "whatsapp" ? `https://wa.me/${waNumber(raw)}` : kind === "email" ? (raw.startsWith("mailto:") ? raw : `mailto:${raw}`) : kind === "phone" ? `tel:${raw.replace(/\s/g, "")}` : kind === "maps" && !/^https?:/i.test(raw) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}` : kind === "instagram" && !/^https?:/i.test(raw) && raw ? `https://instagram.com/${raw.replace(/^@/, "")}` : safeUrl(raw);
            return href ? (
              <a key={l.id} href={href} target="_blank" rel="noreferrer" style={{ ...pb(t, "ghost"), justifyContent: "flex-start" }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: col, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ic n={icon} size={16} /></span>
                <span style={{ flex: 1, textAlign: "center", paddingRight: 30 }}>{l.label || name}</span>
              </a>
            ) : null;
          })}
        </Frame>
      );
    case "landing":
      return (
        <Frame t={t} preview={preview}>
          {d.image && <img src={d.image} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: t.radius, marginBottom: 16 }} />}
          <H1 t={t} style={{ fontSize: 30 }}>{d.headline || title || "Your headline"}</H1>
          {d.text && <p style={{ color: t.muted, margin: "10px 0 16px", whiteSpace: "pre-wrap" }}>{d.text}</p>}
          {(d.features || []).filter(f => f.label).map(f => <p key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span style={{ color: t.accent, display: "flex" }}><Ic n="check" size={17} sw={2.5} /></span>{f.label}</p>)}
          <div style={{ marginTop: 16 }}>
            {safeUrl(d.ctaUrl) && <A href={safeUrl(d.ctaUrl)}>{d.cta || "Learn more"}</A>}
            {d.whatsapp && <A href={`https://wa.me/${waNumber(d.whatsapp)}`} kind="ghost" icon="chat">WhatsApp us</A>}
            {d.phone && <A href={`tel:${d.phone.replace(/\s/g, "")}`} kind="ghost" icon="phone">Call {d.phone}</A>}
            {d.email && <A href={`mailto:${d.email}`} kind="ghost" icon="mail">Email us</A>}
          </div>
        </Frame>
      );
    case "meeting": {
      const when = d.when ? new Date(d.when) : null;
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || "Join the meeting", d.platform)}
          <div style={box(t)}>
            {when && <p style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><Ic n="clock" size={16} />{when.toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</p>}
            {d.host && <p style={{ color: t.muted }}>Host: {d.host}</p>}
            {d.meetingId && <p style={{ color: t.muted }}>Meeting ID: <b style={{ color: t.fg }}>{d.meetingId}</b></p>}
            {d.passcode && <p style={{ color: t.muted }}>Passcode: <b style={{ color: t.fg }}>{d.passcode}</b></p>}
            {d.notes && <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{d.notes}</p>}
          </div>
          {safeUrl(d.url) && <A href={safeUrl(d.url)} icon="video">Join {d.platform || "meeting"}</A>}
          {when && <button type="button" style={pb(t, "ghost")} onClick={() => downloadText(makeIcs({ title: d.title, start: d.when, end: d.when, location: d.url, description: d.notes }), "meeting.ics", "text/calendar")}><Ic n="calendar" size={17} />Add to calendar</button>}
        </Frame>
      );
    }
    case "files":
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || title || "Documents", d.intro, d.image)}
          {(d.files || []).filter(f => safeUrl(f.url)).map(f => (
            <a key={f.id} href={safeUrl(f.url)} target="_blank" rel="noreferrer" style={{ ...box(t), display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: t.fg }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, background: `${t.accent}22`, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ic n="file" size={20} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block" }}>{f.title || "Document"}</b>{f.note && <span style={{ color: t.muted, fontSize: 13 }}>{f.note}</span>}</span>
              <Ic n="download" size={18} color={t.accent} />
            </a>
          ))}
        </Frame>
      );
    case "gallery": {
      const imgs = (d.images || []).filter(i => i.url);
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || title || "Gallery", d.text)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {imgs.map(i => <button key={i.id} type="button" onClick={() => setZoom(i.url)} style={{ padding: 0, borderRadius: t.radius, overflow: "hidden", position: "relative", aspectRatio: "1" }}><img src={i.url} alt={i.caption || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />{i.caption && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, padding: "3px 6px", textAlign: "left" }}>{i.caption}</span>}</button>)}
          </div>
          {d.whatsapp && <A href={`https://wa.me/${waNumber(d.whatsapp)}`} icon="chat">Enquire on WhatsApp</A>}
          {zoom && <div onClick={() => setZoom("")} style={{ position: preview ? "absolute" : "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}><img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /></div>}
        </Frame>
      );
    }
    case "feedback":
      return (
        <Frame t={t} preview={preview}>
          {head(d.business || title || "Feedback", d.prompt, d.image)}
          {sub.state === "done" ? (
            <div style={box(t)}>
              <p style={{ textAlign: "center", fontWeight: 600 }}>{d.thanks || "Thank you!"}</p>
              {safeUrl(d.reviewUrl) && <div style={{ marginTop: 12 }}><A href={safeUrl(d.reviewUrl)} icon="star">Also review us on Google</A></div>}
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (!stars) return; sub.submit({ kind: "feedback", rating: stars, message: vals.comment || "", name: vals.name || "", phone: vals.phone || "" }); }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "4px 0 14px" }}>
                {[1, 2, 3, 4, 5].map(i => <button key={i} type="button" aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setStars(i)} style={{ color: "#F5B400" }}><Ic n="star" size={40} sw={1.5} style={{ fill: i <= stars ? "#F5B400" : "none" }} /></button>)}
              </div>
              {d.askComment !== false && <textarea rows={3} placeholder="Tell us more (optional)" value={vals.comment || ""} onChange={e => setV("comment", e.target.value)} style={{ ...inp(t), resize: "vertical" }} />}
              {d.askContact && <><input placeholder="Your name" value={vals.name || ""} onChange={e => setV("name", e.target.value)} style={inp(t)} /><input placeholder="Phone (optional)" value={vals.phone || ""} onChange={e => setV("phone", e.target.value)} style={inp(t)} /></>}
              {sub.err && <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 8 }}>{sub.err}</p>}
              <button type="submit" disabled={!stars || sub.state === "busy"} style={{ ...pb(t), opacity: stars ? 1 : 0.5 }}>{sub.state === "busy" ? "Sending…" : stars ? "Send feedback" : "Tap a star to rate"}</button>
            </form>
          )}
        </Frame>
      );
    case "form":
      return (
        <Frame t={t} preview={preview}>
          {head(d.title || title || "Form", d.intro)}
          {sub.state === "done" ? <div style={box(t)}><p style={{ textAlign: "center", fontWeight: 600 }}>{d.thanks || "Thank you!"}</p></div> : (
            <form onSubmit={e => { e.preventDefault(); const fields = {}; (d.fields || []).forEach(f => { fields[f.label || "Answer"] = vals[f.id] || ""; }); sub.submit({ kind: "form", name: "", fields }); }}>
              {(d.fields || []).map(f => (
                <label key={f.id} style={{ display: "block" }}>
                  <Lbl t={t}>{f.label}{f.required ? " *" : ""}</Lbl>
                  {f.type === "area" ? <textarea rows={3} required={f.required} value={vals[f.id] || ""} onChange={e => setV(f.id, e.target.value)} style={{ ...inp(t), resize: "vertical" }} />
                    : f.type === "select" ? <select required={f.required} value={vals[f.id] || ""} onChange={e => setV(f.id, e.target.value)} style={inp(t)}><option value="">Choose…</option>{String(f.options || "").split(",").map(o => o.trim()).filter(Boolean).map(o => <option key={o}>{o}</option>)}</select>
                    : <input type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} required={f.required} value={vals[f.id] || ""} onChange={e => setV(f.id, e.target.value)} style={inp(t)} />}
                </label>
              ))}
              {sub.err && <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 8 }}>{sub.err}</p>}
              <button type="submit" disabled={sub.state === "busy"} style={pb(t)}>{sub.state === "busy" ? "Sending…" : d.submit || "Send"}</button>
            </form>
          )}
        </Frame>
      );
    case "coupon": {
      const exp = d.expires ? new Date(d.expires + "T23:59:59") : null;
      const expired = exp && exp < new Date();
      return (
        <Frame t={t} preview={preview}>
          {head(d.business || title || "Coupon", "", d.image)}
          <div style={{ ...box(t), textAlign: "center", borderStyle: "dashed", borderWidth: 2, borderColor: t.accent, opacity: expired ? 0.55 : 1 }}>
            <p style={{ fontFamily: fontStack(t.hFont), fontSize: 30, fontWeight: 700, color: t.accent, lineHeight: 1.1 }}>{d.headline || "Your offer"}</p>
            {d.text && <p style={{ color: t.muted, margin: "8px 0", whiteSpace: "pre-wrap" }}>{d.text}</p>}
            {d.code && <div style={{ margin: "14px 0 6px" }}><span style={{ display: "inline-block", padding: "9px 18px", border: `1.5px solid ${t.line}`, borderRadius: 10, fontWeight: 800, letterSpacing: ".18em", fontSize: 20, background: t.bg }}>{d.code}</span></div>}
            {d.code && <button type="button" onClick={() => copy(d.code, "code")} style={{ color: t.accent, fontWeight: 600, fontSize: 13 }}>{copied === "code" ? "Copied ✓" : "Tap to copy code"}</button>}
            {exp && <p style={{ fontSize: 12.5, color: expired ? "#C0392B" : t.muted, marginTop: 10 }}>{expired ? "This offer has expired" : `Valid until ${exp.toLocaleDateString([], { dateStyle: "long" })}`}</p>}
          </div>
          {safeUrl(d.btnUrl) && !expired && <A href={safeUrl(d.btnUrl)}>{d.btn || "Redeem"}</A>}
          {d.terms && <p style={{ fontSize: 12, color: t.muted, whiteSpace: "pre-wrap" }}><b>Terms:</b> {d.terms}</p>}
        </Frame>
      );
    }
    case "event": {
      const st = d.start ? new Date(d.start) : null;
      return (
        <Frame t={t} preview={preview}>
          {d.image && <img src={d.image} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: t.radius, marginBottom: 14 }} />}
          <H1 t={t}>{d.title || title || "Your event"}</H1>
          <div style={{ ...box(t), marginTop: 14 }}>
            {st && <p style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><Ic n="calendar" size={16} />{st.toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</p>}
            {(d.venue || d.address) && <p style={{ display: "flex", gap: 8, alignItems: "center" }}><Ic n="pin" size={16} />{[d.venue, d.address].filter(Boolean).join(", ")}</p>}
            {d.organizer && <p style={{ color: t.muted, marginTop: 6 }}>By {d.organizer}</p>}
          </div>
          {d.text && <p style={{ whiteSpace: "pre-wrap", marginBottom: 14 }}>{d.text}</p>}
          {d.address && <A href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.venue, d.address].filter(Boolean).join(", "))}`} kind="ghost" icon="pin">Directions</A>}
          {st && <button type="button" style={pb(t, "ghost")} onClick={() => downloadText(makeIcs({ title: d.title, start: d.start, end: d.end, location: [d.venue, d.address].filter(Boolean).join(", "), description: d.text }), "event.ics", "text/calendar")}><Ic n="calendar" size={17} />Add to my calendar</button>}
          {safeUrl(d.ticketUrl) && <A href={safeUrl(d.ticketUrl)} icon="ticket">Get tickets</A>}
          {d.phone && <A href={`tel:${d.phone.replace(/\s/g, "")}`} kind="ghost" icon="phone">Call organiser</A>}
          {d.rsvp && (
            <div style={box(t)}>
              {sub.state === "done" ? <p style={{ textAlign: "center", fontWeight: 600 }}>You're on the list. See you there!</p> : (
                <form onSubmit={e => { e.preventDefault(); sub.submit({ kind: "rsvp", name: vals.name || "", phone: vals.phone || "", email: vals.email || "", fields: { guests: vals.guests || "1" } }); }}>
                  <p style={{ fontWeight: 700, marginBottom: 8 }}>RSVP</p>
                  <input required placeholder="Your name" value={vals.name || ""} onChange={e => setV("name", e.target.value)} style={inp(t)} />
                  <input required placeholder="Phone or email" value={vals.phone || ""} onChange={e => setV("phone", e.target.value)} style={inp(t)} />
                  <input type="number" min="1" max="20" placeholder="Number of guests" value={vals.guests || ""} onChange={e => setV("guests", e.target.value)} style={inp(t)} />
                  {sub.err && <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 8 }}>{sub.err}</p>}
                  <button type="submit" disabled={sub.state === "busy"} style={pb(t)}>{sub.state === "busy" ? "Sending…" : "I'm coming"}</button>
                </form>
              )}
            </div>
          )}
        </Frame>
      );
    }
    case "payment": {
      const label = d.method === "paybill" ? "Paybill number" : d.method === "send" ? "Phone number" : "Till number";
      const steps = d.method === "paybill"
        ? ["Open M-Pesa and choose Lipa na M-Pesa", "Select Pay Bill", `Enter business number ${d.number || "…"}`, `Enter account number ${d.account || "…"}`, `Enter the amount${d.amount ? ` (${money(d.amount)})` : ""} and your PIN`]
        : d.method === "send" ? ["Open M-Pesa and choose Send Money", `Enter ${d.number || "…"}`, `Enter the amount${d.amount ? ` (${money(d.amount)})` : ""} and your PIN`]
        : ["Open M-Pesa and choose Lipa na M-Pesa", "Select Buy Goods and Services", `Enter Till number ${d.number || "…"}`, `Enter the amount${d.amount ? ` (${money(d.amount)})` : ""} and your PIN`];
      return (
        <Frame t={t} preview={preview}>
          {head(d.business || title || "Pay with M-Pesa", "", d.image)}
          <div style={{ ...box(t), textAlign: "center" }}>
            <p style={{ color: t.muted, fontSize: 13 }}>{label}</p>
            <p style={{ fontSize: 34, fontWeight: 800, letterSpacing: ".06em", margin: "2px 0 8px" }}>{d.number || "—"}</p>
            {d.method === "paybill" && d.account && <p style={{ color: t.muted }}>Account: <b style={{ color: t.fg }}>{d.account}</b></p>}
            {d.amount && <p style={{ color: t.muted }}>Amount: <b style={{ color: t.fg }}>{money(d.amount)}</b></p>}
            <div style={{ marginTop: 10 }}><button type="button" onClick={() => copy(d.number, "n")} style={{ ...pb(t), width: "auto", display: "inline-flex", padding: "9px 18px", marginBottom: 0 }}><Ic n={copied === "n" ? "check" : "copy"} size={16} />{copied === "n" ? "Copied" : `Copy ${label.toLowerCase()}`}</button></div>
          </div>
          <div style={box(t)}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>How to pay</p>
            <ol style={{ margin: 0, paddingLeft: 20, color: t.muted }}>{steps.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}</ol>
          </div>
          {d.note && <p style={{ color: t.muted, fontSize: 13, whiteSpace: "pre-wrap" }}>{d.note}</p>}
        </Frame>
      );
    }
    case "medical": {
      const rows = [["Blood group", d.blood], ["Date of birth", d.dob], ["Allergies", d.allergies], ["Conditions", d.conditions], ["Medication", d.medication], ["Insurance / NHIF", d.insurance], ["Doctor / hospital", d.doctor], ["Notes", d.notes]].filter(r => r[1]);
      return (
        <Frame t={t} preview={preview}>
          <div style={{ background: "#C62828", color: "#fff", borderRadius: t.radius, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><Ic n="pulse" size={22} /><b>MEDICAL ALERT</b></div>
          {head(d.name || title || "Medical ID", "", d.image)}
          <div style={box(t)}>{rows.length ? rows.map(([k, v]) => <p key={k} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${t.line}` }}><span style={{ width: 120, color: t.muted, flex: "none" }}>{k}</span><b style={{ whiteSpace: "pre-wrap" }}>{v}</b></p>) : <p style={{ color: t.muted }}>No details added yet.</p>}</div>
          <p style={{ fontWeight: 700, margin: "14px 0 8px" }}>Emergency contacts</p>
          {(d.contacts || []).filter(c => c.phone).map(c => <A key={c.id} href={`tel:${c.phone.replace(/\s/g, "")}`} icon="phone">Call {c.name || "contact"}{c.relation ? ` (${c.relation})` : ""}</A>)}
        </Frame>
      );
    }
    case "pet": {
      const wa = waNumber(d.whatsapp || d.phone);
      return (
        <Frame t={t} preview={preview}>
          {head(d.name || title || "Pet", [d.kind, d.breed].filter(Boolean).join(" · "), d.image)}
          <p style={{ textAlign: "center", fontWeight: 700, marginBottom: 12 }}>I'm lost? Please contact my owner 💛</p>
          {d.phone && <A href={`tel:${d.phone.replace(/\s/g, "")}`} icon="phone">Call {d.owner || "owner"}</A>}
          {wa && <A href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I found ${d.name || "your pet"}!`)}`} kind="ghost" icon="chat">WhatsApp the owner</A>}
          <div style={box(t)}>
            {d.owner && <p><span style={{ color: t.muted }}>Owner:</span> <b>{d.owner}</b></p>}
            {d.address && <p><span style={{ color: t.muted }}>Lives in:</span> <b>{d.address}</b></p>}
            {d.notes && <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{d.notes}</p>}
            {d.reward && <p style={{ marginTop: 6, color: t.accent, fontWeight: 700 }}>{d.reward}</p>}
          </div>
        </Frame>
      );
    }
    case "product": {
      const imgs = (d.images || []).filter(i => i.url);
      const href = d.whatsapp ? `https://wa.me/${waNumber(d.whatsapp)}?text=${encodeURIComponent(`Hi, I'd like to order: ${d.name}${d.price ? ` (${money(d.price)})` : ""}`)}` : safeUrl(d.buyUrl);
      return (
        <Frame t={t} preview={preview}>
          {imgs.length > 0 && <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, scrollSnapType: "x mandatory" }}>{imgs.map(i => <img key={i.id} src={i.url} alt="" style={{ width: imgs.length > 1 ? "85%" : "100%", flex: "none", aspectRatio: "1", objectFit: "cover", borderRadius: t.radius, scrollSnapAlign: "start" }} />)}</div>}
          <H1 t={t}>{d.name || title || "Product"}</H1>
          {d.price && <p style={{ fontSize: 24, fontWeight: 800, color: t.accent, margin: "6px 0" }}>{money(d.price)} {d.oldPrice && <s style={{ fontSize: 15, color: t.muted, fontWeight: 400 }}>{money(d.oldPrice)}</s>}</p>}
          {d.text && <p style={{ color: t.muted, whiteSpace: "pre-wrap", margin: "8px 0 14px" }}>{d.text}</p>}
          {(d.features || []).filter(f => f.label).map(f => <p key={f.id} style={{ display: "flex", gap: 8, marginBottom: 5 }}><span style={{ color: t.accent, display: "flex" }}><Ic n="check" size={17} sw={2.5} /></span>{f.label}</p>)}
          <div style={{ marginTop: 16 }}>{href && <A href={href} icon={d.whatsapp ? "chat" : "bag"}>{d.cta || "Order now"}</A>}</div>
          {d.sku && <p style={{ fontSize: 12, color: t.muted }}>Code: {d.sku}</p>}
        </Frame>
      );
    }
    default:
      return <Frame t={t} preview={preview}><p style={{ textAlign: "center", color: t.muted }}>This page type isn't supported yet.</p></Frame>;
  }
}
const Preview1 = ({ t, text }) => <div style={{ textAlign: "center", paddingTop: 50, color: t.muted }}><Ic n="link" size={28} /><p style={{ marginTop: 10 }}>{text}</p><p style={{ fontSize: 12, marginTop: 8 }}>Visitors see a quick “Opening…” screen, then land on your link.</p></div>;
