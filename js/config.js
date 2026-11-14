/**
 * CRRT Rx — configuration.
 * Signed off by Dr D (Amar Damodar) on 14 Nov 2026 and published at his request.
 * DRAFT=false. Educational CRRT prescribing tool for nephrologists.
 */
(function (global) {
  "use strict";

  const DRAFT = false;
  const DRAFT_BANNER = "Draft – not for clinical use until reviewed by Dr D";
  const CITRATE_DRAFT_LABEL = "Draft · awaiting Dr D sign-off";
  const APP_NAME = "CRRT Rx";
  const APP_VERSION = "1.0.0";
  const SUPPORT_EMAIL = "amardamodar@gmail.com";
  const PUBLISHER = "Wellness Tech LLC";

  const config = { DRAFT, DRAFT_BANNER, CITRATE_DRAFT_LABEL, APP_NAME, APP_VERSION, SUPPORT_EMAIL, PUBLISHER };
  global.CrrtConfig = config;
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
