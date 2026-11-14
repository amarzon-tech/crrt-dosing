# CRRT Rx — App Store Connect listing (draft)

Price: **Free**. Account: Dr D’s current individual Apple Developer account (same team as K Swipe). Bundle ID: `com.drd.crrtrx`. Version **1.0**, build **1**. Category: **Medical**.

Privacy Policy and Support URLs are not live yet. `privacy.html` and `support.html` are on the `ios-wrap` branch only. After Dr D OKs a merge to `main`:

- Privacy: https://amarzon-tech.github.io/crrt-dosing/privacy.html
- Support: https://amarzon-tech.github.io/crrt-dosing/support.html
- Support email: akd.nephrology@gmail.com

Do not enter those GitHub Pages URLs in App Store Connect until the pages are actually on the live site.

---

## Name
CRRT Prescriber

(App Store name, confirmed in App Store Connect on Nov 14 2026. "CRRT Rx" was already taken. The home-screen name stays "CRRT Rx".)

## Subtitle (30 characters max)
CRRT dosing for nephrology

(26 characters. The example “CRRT prescribing for nephrology” is 31 and would be rejected.)

## Promotional text (170 characters max)
Educational CRRT prescribing for nephrologists. Effluent dose, heparin, and Prismocitrate 18 citrate rates — offline, with no login or data collection.

(151 characters, including spaces and the em dash.)

## Description
CRRT Rx is an educational CRRT prescribing tool for nephrologists, published by Wellness Tech LLC.

Work through four steps to build a machine prescription: modality (CVVH, CVVHD, CVVHDF, or SCUF), blood flow and filtration, anticoagulation (heparin, citrate, or none), and a clean prescription card plus a separate dose check.

The app suggests effluent rates from a prescribed target (default 25 mL/kg/h) and shows a delivered-dose estimate after downtime (default 10%). KDIGO 2012 recommendation 5.8.4 is to deliver 20–25 mL/kg/h, which usually means prescribing 25–30 mL/kg/h.

Heparin defaults are the Joannidis 2007 bolus of 30 IU/kg and infusion of 7 IU/kg/h, with an aPTT target of 40–45 seconds. KDIGO does not recommend a single heparin dose. The bolus can be switched off.

When citrate is selected, the app calculates a Prismocitrate 18 pre-filter rate from blood flow and a target of 3 mmol/L of blood (NCT05399537), using the labelled 18 mmol/L concentration, and counts that rate toward the effluent-dose target. Calcium infusion is listed as per protocol.

Works fully offline. No account, no ads, and no data collection. Inputs are never stored or sent.

Sources include:
• KDIGO Clinical Practice Guideline for Acute Kidney Injury (2012), recommendation 5.8.4
• Safety Evaluation of Prismocitrate 18 in Patients Receiving CRRT, ClinicalTrials.gov NCT05399537
• Prismocitrate 18/0 Instruction for use, Bieffe Medital S.p.A. (Baxter), D13000165 Ver. 4.0
• Schultheiß C, et al. Crit Care. 2012;16:R162 (lactate and prothrombin-time predictors)

For nephrologists. Educational use only; not a substitute for clinical judgment or your unit protocol.

## Keywords (100 characters max, comma-separated)
rx,dialysis,nephrology,aki,citrate,heparin,effluent,cvvh,cvvhdf,cvvhd,kdigo,icu,dose,scuf,renal

(95 characters. Do not repeat words from the name “CRRT Prescriber”; Apple ignores words already in the name.)

## What’s New (version 1.0)
First release. Educational CRRT prescribing tool for nephrologists.

## App Privacy
**Data Not Collected.** The app does not collect, store, share, or sell personal information. There are no accounts, analytics, ads, or tracking. Inputs stay on screen only and are never saved or sent. The iOS app works fully offline.

## Age rating (questionnaire)
- Made for Kids: **No**
- Unrestricted Web Access: **No**
- Gambling and Contests: **None**
- Mature/Suggestive Themes: **None**
- Profanity or Crude Humor: **None**
- Horror/Fear Themes: **None**
- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Alcohol, Tobacco, or Drug Use or References: **None** (medications are discussed only as professional dosing; use the Medical/Treatment item below)
- Sexual Content or Nudity: **None**
- Graphic Sexual Content and Nudity: **None**
- Medical or Treatment Information: **Yes — Frequent or Intense**, because the app’s purpose is CRRT prescribing. This typically rates **17+**. There are no graphic images or procedure videos. If Apple’s wording for this item is clearly limited to graphic medical imagery, choose None and expect a possible 12+ rating instead.

## Copyright
2026 Wellness Tech LLC

## Review notes (App Review Information)

CRRT Rx is a fully offline educational calculator for nephrologists. It is a Capacitor iOS app that bundles its HTML, CSS, and JavaScript in the app binary (ios/App/App/public/). It does not load a remote website, does not require a network connection, and has no login, ads, or analytics.

The content was signed off by Dr Amar Damodar (nephrologist) on 14 November 2026. Every formula and citation is listed in the in-app About sheets and in CONTENT_REVIEW.md, which is included in the app bundle.

Demo path for reviewers (no account needed):
1. Leave the default modality: CVVH, Replacement Post.
2. On step 2, choose blood flow 150 mL/min, enter weight 80 kg and hematocrit 30%.
3. On step 3, choose Heparin (defaults: bolus 30 IU/kg, infusion 7 IU/kg/h).
4. On step 4, the prescription shows post-filter replacement 2,000 mL/h, heparin bolus 2,400 units and infusion 560 units/h. Dose check shows a prescribed dose of 25.0 mL/kg/h and a delivered dose of 22.5 mL/kg/h after the default 10% downtime.

Guideline 1.4.1 (Physical Harm): This is an educational tool, not a device and not a treatment. The on-screen disclaimer reads: “For nephrologists. Educational use only; not a substitute for clinical judgment or your unit protocol.” Numbers are drawn from cited sources (KDIGO 2012 5.8.4, Joannidis 2007, NCT05399537, Prismocitrate 18 IFU, Schultheiß 2012). We do not recommend electrolyte or bath composition.

Guideline 4.2 (Minimum Functionality): The app is more than a website wrapper. It runs entirely offline from bundled files, walks through a four-step prescription flow, calculates rates as the user types, and offers Copy and Print of the prescription. It supports iPhone and iPad in all orientations and respects safe-area insets.

Export compliance: ITSAppUsesNonExemptEncryption is false (no exempt or non-exempt encryption). Contact: akd.nephrology@gmail.com.
