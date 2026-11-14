# CRRT Rx

Educational CRRT prescribing tool for nephrologists. Published by Wellness Tech LLC. Standalone version of the CRRT tab from CRRT & PD Dosing; PD stays in that app.

For nephrologists. Educational use only; not a substitute for clinical judgment or your unit protocol.

Live: https://amarzon-tech.github.io/crrt-dosing/

Signed off by Dr D on 14 Nov 2026. `DRAFT=false`.

## What it is

A static, offline progressive web app in four steps (Back / Next and a step indicator):

- No login, ads, analytics, or data collection. Inputs are never stored.
- Simple data entry: one required field (weight); defaults pre-filled and labelled; numeric keypad; live results, no Calculate button.
- **Step 1 — Modality:** four chips — CVVH, CVVHD, CVVHDF, and SCUF. Default is CVVH with Replacement: Post. CVVH and CVVHDF have a Replacement: Pre / Post / Mixed choice (default Post; Mixed = 50% pre / 50% post). CVVHD and SCUF have no replacement choice. CVVHDF’s dialysate/replacement split stays locked at 50/50. SCUF has no dialysate, replacement, or dose target.
- **Step 2 — Blood flow & filtration:** common blood-flow chips (150, 200, 250, 300 mL/min) plus custom; weight (required except for SCUF, where it is optional); optional hematocrit; fluid removal (net UF, default 0 mL/h) with an equivalent mL/24 h line. For SCUF, net UF must be greater than 0. Filtration fraction and (except for SCUF) the predilution-corrected dose update live once blood flow, hematocrit, and weight are entered. For SCUF, FF = UF / plasma flow when hematocrit and blood flow are entered.
- **Step 3 — Anticoagulant:** heparin, citrate, or none. Heparin calculator with **Bolus: Yes / No** (defaults 30 IU/kg bolus and 7 IU/kg/h, Joannidis 2007, as described in KDIGO 2012 §5.3) and a one-line aPTT target. Citrate (shown only when selected) calculates a **Prismocitrate 18** pre-filter rate from blood flow and a target citrate dose (default 3 mmol/L of blood, NCT05399537) using the labelled 18 mmol/L concentration. That rate is counted toward the effluent-dose target, and the other fluid rates are reduced to keep the target. Calcium infusion is listed as per protocol. Compact targets, exclusions, and predictors remain; sources sit behind **Details & sources**. Trial values are a trial protocol, not a Bon Secours Richmond policy.
- **Step 4 — Optional variables and prescription:** target (default 25 mL/kg/h) and downtime (default 10%, editable). The calcium ratio check (main flag: ratio >2.5) is shown only when citrate is selected, under a Citrate monitoring label; it is hidden for heparin or none. The **prescription card** (Copy / Print) lists only machine settings: modality, blood flow, used dialysate / replacement rates (omitted for SCUF unless citrate is running as pre-filter replacement), patient fluid removal, and anticoagulation (heparin bolus and infusion; or, when citrate is selected, a Prismocitrate 18 pre-filter rate if blood flow is entered, otherwise “Citrate per unit protocol,” plus “Calcium infusion: per protocol,” and a one-line note when citrate was counted toward the dose). Weight, prescribed and delivered dose (hidden for SCUF), and filtration fraction are in a **Dose check** below the card. No electrolyte or bath composition is shown or recommended.

Every statement, number and citation is listed in [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

## Run tests

```bash
node tests/formulas.test.js
node tests/prescription.test.js
node tests/static.test.js
```

## Privacy and support

amardamodar@gmail.com. Works offline after the first load (service worker).
