// Talks to Safaricom's Daraja API. Uses Node's built-in fetch (no extra package needed).
const BASE_URL = "https://sandbox.safaricom.co.ke"; // switch to https://api.safaricom.co.ke when you go live

export async function getMpesaToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Could not get an M-Pesa access token — check MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET in .env.");
  }
  return data.access_token;
}

function timestampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Accepts 07XXXXXXXX, 7XXXXXXXX, +254XXXXXXXXX, or 254XXXXXXXXX and normalizes to 254XXXXXXXXX
export function normalizePhone(input) {
  let p = String(input || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  if (!/^254\d{9}$/.test(p)) {
    throw new Error("Enter a valid Safaricom number, e.g. 0712345678.");
  }
  return p;
}

export async function initiateSTKPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getMpesaToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = timestampNow();
  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    }),
  });
  return res.json();
}

// Actively asks Safaricom for the real status of an STK push, rather than only
// waiting for their callback — callbacks are known to be unreliable in sandbox,
// and this same pattern (webhook + a "just in case" poll) is good practice in
// production too, since webhooks can occasionally be missed there as well.
export async function querySTKStatus(checkoutRequestID) {
  const token = await getMpesaToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = timestampNow();
  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID,
    }),
  });
  return res.json();
}
