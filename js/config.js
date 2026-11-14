/**
 * CRRT Dosing — configuration.
 * DRAFT=true until Dr D (Amar Damodar) signs off on medical content.
 * Do not remove the draft banner or set DRAFT to false without his sign-off
 * in his own words. The citrate calcium-ratio check and the citrate
 * precautions are shown only as draft content while DRAFT is true
 * (CITRATE_DRAFT_LABEL) and are covered by the same sign-off.
 */
(function (global) {
  "use strict";

  const DRAFT = true;
  const DRAFT_BANNER = "Draft – not for clinical use until reviewed by Dr D";
  const CITRATE_DRAFT_LABEL = "Draft · awaiting Dr D sign-off";
  const APP_NAME = "CRRT Dosing";
  const APP_VERSION = "0.1.1-draft";
  const SUPPORT_EMAIL = "amardamodar@gmail.com";
  const PUBLISHER = "Wellness Tech LLC";

  const config = { DRAFT, DRAFT_BANNER, CITRATE_DRAFT_LABEL, APP_NAME, APP_VERSION, SUPPORT_EMAIL, PUBLISHER };
  global.CrrtConfig = config;
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
