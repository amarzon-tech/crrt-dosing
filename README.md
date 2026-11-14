# CRRT Dosing

Draft clinician tool for **CRRT** dosing, for Dr Amar Damodar (Dr D). Published by Wellness Tech LLC. Standalone version of the CRRT tab from CRRT & PD Dosing; PD stays in that app.

**Draft — not for clinical use until reviewed by Dr D.** `DRAFT=true` in `js/config.js`. Do not remove the banner or flip that flag without his sign-off in his own words.

Preview: https://amarzon-tech.github.io/crrt-dosing/

## What it is

A static, offline progressive web app in four steps (Back / Next and a step indicator):

- No login, ads, analytics, or data collection. Inputs are never stored. `noindex`, robots disallow.
- Simple data entry: one required field (weight); defaults pre-filled and labelled; numeric keypad; live results, no Calculate button.
- **Step 1 — Modality:** default CVVH post.
- **Step 2 — Blood flow & filtration:** common blood-flow chips (150, 200, 250, 300 mL/min) plus custom; weight; optional hematocrit; fluid removal (net UF, default 0 mL/h) with an equivalent mL/24 h line. Filtration fraction and the predilution-corrected dose update live once blood flow, hematocrit, and weight are entered.
- **Step 3 — Anticoagulant:** heparin, citrate, or none. Heparin calculator with **Bolus: Yes / No** (defaults 30 IU/kg bolus and 7 IU/kg/h, Joannidis 2007, as described in KDIGO 2012 §5.3) and a one-line aPTT target. Citrate shows compact targets (post-filter iCa 0.25–0.35, systemic iCa 1.0–1.3, Ca ratio >2.5 = accumulation), a short exclusions list, and a one-line predictors sentence (Schultheiß et al. 2012: lactate ≥3.4 mmol/L or prothrombin time ≤26%). Long explanations and citations sit behind **Details & sources**. No citrate dose calculator. Trial values are a trial protocol, not a Bon Secours Richmond policy.
- **Step 4 — Optional variables and prescription:** target (default 25 mL/kg/h), downtime, calcium ratio check (main flag: ratio >2.5). The **prescription card, labeled as a draft** (Copy / Print), lists only machine settings: modality, blood flow, used dialysate / replacement rates, patient fluid removal, and anticoagulation (heparin bolus and infusion, or “Citrate per unit protocol”). Weight, prescribed and delivered dose, and filtration fraction are in a **Dose check** below the card. No electrolyte or bath composition is shown or recommended.

Every statement, number and citation is listed for sign-off in [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

## Run tests

```bash
node tests/formulas.test.js
node tests/prescription.test.js
node tests/static.test.js
```

## Privacy and support

amardamodar@gmail.com. Works offline after the first load (service worker).
