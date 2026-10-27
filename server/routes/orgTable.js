// The list of organisation-portal routes, kept free of Express so tests can reuse it.
// "owner" = needs a normal CardNova sign-in; everything else is checked inside the controller.
export const orgTable = (C) => [
  // CardNova account holder
  ["GET", "/access", "owner", C.orgAccess],
  ["GET", "/mine", "owner", C.myOrgs],
  ["POST", "/", "owner", C.createOrg],
  ["POST", "/invite", "owner", C.inviteOrganiser],
  ["POST", "/:id/portal-token", "owner", C.ownerPortalToken],
  ["POST", "/:id/handover", "owner", C.handOver],
  // public
  ["GET", "/public/:slug", null, C.publicOrg],
  ["GET", "/card/:token", null, C.publicCard],
  ["POST", "/card/:token/location", null, C.cardLocation],
  ["POST", "/card/:token/messages", null, C.cardMessages],
  ["POST", "/card/:token/forgot", null, C.cardForgot],
  ["POST", "/:slug/signup", null, C.signup],
  ["POST", "/:slug/verify", null, C.verifyEmail],
  ["POST", "/:slug/resend", null, C.resendVerify],
  ["POST", "/:slug/login", null, C.login],
  ["POST", "/:slug/forgot", null, C.forgot],
  ["POST", "/:slug/reset", null, C.resetCode],
  // signed-in member
  ["GET", "/:slug/me", null, C.me],
  ["PUT", "/:slug/me", null, C.updateMe],
  ["POST", "/:slug/me/code", null, C.changeCode],
  ["GET", "/:slug/me/cards", null, C.myCards],
  ["POST", "/:slug/me/cards/:cardId/deactivate", null, C.myCardDeactivate],
  // admin level 1+ (messages)
  ["GET", "/:slug/admin/messages", null, C.listMessages],
  ["POST", "/:slug/admin/messages", null, C.createMessage],
  ["PUT", "/:slug/admin/messages/:msgId", null, C.updateMessage],
  ["DELETE", "/:slug/admin/messages/:msgId", null, C.deleteMessage],
  // admin level 1+ can list; level 2+ manage
  ["GET", "/:slug/admin/members", null, C.listMembers],
  ["POST", "/:slug/admin/members", null, C.addMember],
  ["PATCH", "/:slug/admin/members/:memberId", null, C.updateMember],
  ["POST", "/:slug/admin/members/:memberId/reset-code", null, C.resetMemberCode],
  ["DELETE", "/:slug/admin/members/:memberId", null, C.removeMember],
  ["GET", "/:slug/admin/cards", null, C.listCards],
  ["POST", "/:slug/admin/cards", null, C.createCard],
  ["PUT", "/:slug/admin/cards/:cardId", null, C.updateCard],
  ["POST", "/:slug/admin/cards-design", null, C.applyDesignToAll],
  ["POST", "/:slug/admin/cards/:cardId/duplicate", null, C.duplicateCard],
  ["POST", "/:slug/admin/cards/:cardId/deactivate", null, C.deactivateCard],
  ["POST", "/:slug/admin/cards/:cardId/reactivate", null, C.reactivateCard],
  ["POST", "/:slug/admin/cards/:cardId/reissue", null, C.reissueCard],
  ["DELETE", "/:slug/admin/cards/:cardId", null, C.deleteCard],
  ["GET", "/:slug/admin/scans", null, C.listScans],
  // admin level 3 (settings)
  ["GET", "/:slug/admin/settings", null, C.getSettings],
  ["PUT", "/:slug/admin/settings", null, C.saveSettings],
  ["POST", "/:slug/admin/join-code", null, C.newJoinCode],
];
