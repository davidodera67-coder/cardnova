import Order from "../models/Order.js";
import User from "../models/User.js";
import { initiateSTKPush, normalizePhone, querySTKStatus } from "../utils/mpesa.js";

// Sandbox note: keep this at 1 (KES) while testing — Safaricom's sandbox accepts
// small amounts fine, and it avoids any confusion with real pricing later.
// Change to your real Pro plan price once you switch to production credentials.
const PRO_PLAN_AMOUNT = Number(process.env.MPESA_TEST_AMOUNT || 1);
const PRO_CARD_LIMIT = 20;

// POST /api/payments/mpesa/stkpush — logged-in user starts an upgrade payment
export async function startMpesaUpgrade(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);

    const result = await initiateSTKPush({
      phone,
      amount: PRO_PLAN_AMOUNT,
      accountReference: "CardNova",
      transactionDesc: "CardNova Pro upgrade",
    });

    if (result.ResponseCode !== "0") {
      return res.status(400).json({
        message: result.errorMessage || result.ResponseDescription || "M-Pesa couldn't start this payment.",
      });
    }

    await Order.create({
      user: req.userId,
      type: "plan_upgrade",
      amount: PRO_PLAN_AMOUNT,
      currency: "KES",
      provider: "mpesa",
      status: "pending",
      reference: result.CheckoutRequestID,
    });

    res.status(201).json({
      checkoutRequestID: result.CheckoutRequestID,
      message: "Check your phone to complete the payment.",
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/mpesa/callback — Safaricom calls this, not the frontend.
// Must be public (no auth) since Safaricom's servers are the ones hitting it.
export async function mpesaCallback(req, res, next) {
  try {
    console.log("📞 M-Pesa callback received:", JSON.stringify(req.body));
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.status(400).json({ message: "Malformed callback." });

    const order = await Order.findOne({ reference: callback.CheckoutRequestID });
    if (!order) return res.status(200).json({ message: "Unknown order, ignoring." });

    if (callback.ResultCode === 0) {
      order.status = "paid";
      await order.save();
      await User.findByIdAndUpdate(order.user, { plan: "pro", cardLimit: PRO_CARD_LIMIT });
    } else {
      order.status = "failed";
      await order.save();
    }

    res.status(200).json({ message: "Callback processed." });
  } catch (err) {
    // Always answer Safaricom with 200 so it doesn't endlessly retry, but log the real error
    console.error("M-Pesa callback error:", err);
    res.status(200).json({ message: "Callback received." });
  }
}

// GET /api/payments/mpesa/status/:checkoutRequestID — the frontend polls this
// while waiting for the user to approve the prompt on their phone.
export async function getOrderStatus(req, res, next) {
  try {
    const order = await Order.findOne({ reference: req.params.checkoutRequestID, user: req.userId });
    if (!order) return res.status(404).json({ message: "Order not found." });

    // If Safaricom's callback hasn't arrived yet, actively ask them directly —
    // this is what makes the flow work reliably even when the callback is missed.
    if (order.status === "pending") {
      try {
        const result = await querySTKStatus(order.reference);
        console.log("🔍 M-Pesa status query result:", JSON.stringify(result));
        const code = result.ResultCode !== undefined ? String(result.ResultCode) : null;

        if (code === "0") {
          order.status = "paid";
          await User.findByIdAndUpdate(order.user, { plan: "pro", cardLimit: PRO_CARD_LIMIT });
          await order.save();
        } else if (code === "4999" || code === null) {
          // 4999 = "still under processing"; no ResultCode at all also means not finished yet.
          // Leave the order as pending — nothing to save, just keep polling.
        } else {
          // A genuine final failure code (e.g. 1032 cancelled, 1037 timed out, 2001 wrong PIN)
          order.status = "failed";
          await order.save();
        }
      } catch (queryErr) {
        // Query can fail while the transaction is still mid-flight (e.g. right after
        // sending) — safe to ignore and let the next poll try again
      }
    }

    res.json({ status: order.status });
  } catch (err) {
    next(err);
  }
}
