# CRRT Dosing

Draft clinician tool for **CRRT** dosing, for Dr Amar Damodar (Dr D). Published by Wellness Tech LLC. Standalone version of the CRRT tab from CRRT & PD Dosing; PD stays in that app.

**Draft — not for clinical use until reviewed by Dr D.** `DRAFT=true` in `js/config.js`. Do not remove the banner or flip that flag without his sign-off in his own words.

Preview: https://amarzon-tech.github.io/crrt-dosing/

## What it is

A static, offline progressive web app in four steps (Back / Next and a step indicator):

- No login, ads, analytics, or data collection. Inputs are never stored. `noindex`, robots disallow.
- Simple data entry: one required field (weight); defaults pre-filled and labelled; numeric keypad; live results, no Calculate button.
- **Step 1 — Modality:** default CVVH post.
- **Step 2 — Blood flow and weight:** common blood-flow chips (150, 200, 250, 300 mL/min) plus custom; then weight.
- **Step 3 — Anticoagulant:** heparin, citrate, or none. Heparin calculator with **Bolus: Yes / No** (defaults 30 IU/kg bolus and 7 IU/kg/h, Joannidis 2007, as described in KDIGO 2012 §5.3). Citrate shows precautions, the Prismocitrate 18 (NCT05399537) reference-protocol block, and study predictors of accumulation risk (Schultheiß et al. 2012: lactate ≥3.4 mmol/L and prothrombin time ≤26%). No citrate dose calculator. Trial values are a trial protocol, not a Bon Secours Richmond policy.
- **Step 4 — Optional variables and prescription:** target (default 25 mL/kg/h), net UF (default 0), hematocrit, downtime, filter check, calcium ratio check (main flag: ratio >2.5). The final output is one clean **prescription card, labeled as a draft** (Copy / Print): modality, blood flow, weight, dialysate / replacement / net UF rates, prescribed and delivered dose, and the anticoagulant with its settings. No electrolyte or bath composition is shown or recommended.

Every statement, number and citation is listed for sign-off in [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

## Run tests

```bash
node tests/formulas.test.js
node tests/prescription.test.js
node tests/static.test.js
```

## Privacy and support

amardamodar@gmail.com. Works offline after the first load (service worker).
