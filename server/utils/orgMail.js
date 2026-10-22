// Free email through any SMTP account (Gmail app password works well: ~500 emails/day).
// Set SMTP_USER and SMTP_PASS on Render. If they're missing, nothing is sent and the
// portal falls back to admin-issued temporary codes instead.
let transporter;
export const outbox = []; // only filled during automated tests (ORG_TEST_OUTBOX=1)

export const mailReady = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);
export const siteOrigin = () => String(process.env.CLIENT_ORIGIN || "https://cardnova.onrender.com").split(",")[0].trim().replace(/\/$/, "");

export async function sendMail({ to, subject, text, html }) {
  if (process.env.ORG_TEST_OUTBOX === "1") { outbox.push({ to, subject, text }); return true; }
  if (!mailReady()) { console.log(`[org mail not set up] would send "${subject}" to ${to}`); return false; }
  try {
    if (!transporter) {
      const nm = (await import("nodemailer")).default;
      const port = Number(process.env.SMTP_PORT || 465);
      transporter = nm.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    }
    await transporter.sendMail({ from: process.env.MAIL_FROM || `"CardNova" <${process.env.SMTP_USER}>`, to, subject, text, html });
    return true;
  } catch (e) {
    console.error("[org mail] failed:", e.message);
    return false;
  }
}
