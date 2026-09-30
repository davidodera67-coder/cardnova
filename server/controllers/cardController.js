import Card from "../models/Card.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";

// GET /api/cards — all cards belonging to the signed-in user
export async function getMyCards(req, res, next) {
  try {
    const cards = await Card.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    next(err);
  }
}

// POST /api/cards — create a new card, blocked once the user hits their plan limit
export async function createCard(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    const existingCount = await Card.countDocuments({ owner: req.userId });

    if (existingCount >= user.cardLimit) {
      return res.status(403).json({
        message: `You've reached your ${user.plan} plan limit of ${user.cardLimit} cards. Upgrade to add more.`,
      });
    }

    const slugTaken = await Card.findOne({ slug: req.body.slug });
    if (slugTaken) {
      return res.status(409).json({ message: "That URL slug is already taken." });
    }

    const card = await Card.create({ ...req.body, owner: req.userId });
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
}

// PUT /api/cards/:id — edit an existing card (must belong to the requester)
export async function updateCard(req, res, next) {
  try {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ message: "Card not found." });
    res.json(card);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cards/:id
export async function deleteCard(req, res, next) {
  try {
    const card = await Card.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!card) return res.status(404).json({ message: "Card not found." });
    res.json({ message: "Card deleted." });
  } catch (err) {
    next(err);
  }
}

// GET /api/cards/public/:slug — the public-facing profile page, respects privacy mode.
// Three ways in for a private card: a matching access code, a matching private-link
// token, or being logged in with an email on the invite list (req.userEmail comes
// from optionalAuth, which never blocks the request even if there's no token at all).
export async function getPublicCard(req, res, next) {
  try {
    const card = await Card.findOne({ slug: req.params.slug, status: "Published" });
    if (!card) return res.status(404).json({ message: "This profile doesn't exist or isn't published." });

    if (card.privacy.mode === "private") {
      const { code, link } = req.query;
      const linkOk = link && card.privacy.accessLinkToken && link === card.privacy.accessLinkToken;
      const codeOk = code && card.privacy.accessCode && code === card.privacy.accessCode;
      const emailOk = req.userEmail && card.privacy.inviteEmails.includes(req.userEmail);

      if (!linkOk && !codeOk && !emailOk) {
        return res.status(403).json({ message: "This profile is private.", private: true });
      }
    }

    card.views += 1;
    await card.save();
    res.json(card);
  } catch (err) {
    next(err);
  }
}

// POST /api/cards/public/:slug/lead — visitors submit the lead capture form, no login needed
export async function submitLead(req, res, next) {
  try {
    const card = await Card.findOne({ slug: req.params.slug, status: "Published" });
    if (!card) return res.status(404).json({ message: "This profile doesn't exist or isn't published." });
    if (!card.leadCapture?.enabled) {
      return res.status(400).json({ message: "Lead capture isn't enabled on this profile." });
    }

    await Lead.create({
      card: card._id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      message: req.body.message,
    });
    card.leadCount += 1;
    await card.save();

    res.status(201).json({ message: "Thanks — your details were sent." });
  } catch (err) {
    next(err);
  }
}
