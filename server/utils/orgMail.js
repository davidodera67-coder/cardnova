// Free email for the portal. Two ways, pick one on Render:
//  A) BREVO_API_KEY (+ MAIL_FROM = a sender you verified in Brevo). Works over HTTPS, so it works on Render's free plan.
//  B) SMTP_USER + SMTP_PASS (Gmail app password). NOTE: Render's free plan blocks SMTP ports, so this only works on a paid Render plan or another host.
// If neither is set, nothing is sent and the portal falls back to admin-issued temporary codes.
let transporter;
export const outbox = []; // only filled during automated tests (ORG_TEST_OUTBOX=1)

export const mailReady = () => !!(process.env.BREVO_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS));
export const siteOrigin = () => String(process.env.CLIENT_ORIGIN || "https://cardnova.onrender.com").split(",")[0].trim().replace(/\/$/, "");

const fromParts = () => {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER || "";
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(raw);
  return m ? { name: m[1].trim() || "CardNova", email: m[2].trim() } : { name: "CardNova", email: raw.trim() };
};

export async function sendMail({ to, subject, text, html }) {
  if (process.env.ORG_TEST_OUTBOX === "1") { outbox.push({ to, subject, text }); return true; }
  if (!mailReady()) { console.log(`[org mail not set up] would send "${subject}" to ${to}`); return false; }
  try {
    if (process.env.BREVO_API_KEY) {
      const f = fromParts();
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
      const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", signal: ctl.signal, headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: f, to: [{ email: to }], subject, textContent: text, ...(html ? { htmlContent: html } : {}) }) });
      clearTimeout(t);
      if (!r.ok) { console.error("[org mail] Brevo said", r.status, (await r.text()).slice(0, 300)); return false; }
      return true;
    }
    if (!transporter) {
      const nm = (await import("nodemailer")).default;
      const port = Number(process.env.SMTP_PORT || 465);
      transporter = nm.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    }
    await transporter.sendMail({ from: process.env.MAIL_FROM || `"CardNova" <${process.env.SMTP_USER}>`, to, subject, text, html });
    return true;
  } catch (e) {
    console.error("[org mail] failed:", e.message);
    return false;
  }
}
