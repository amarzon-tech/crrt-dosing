# CRRT Dosing

Draft clinician tool for **CRRT** dosing, for Dr Amar Damodar (Dr D). Published by Wellness Tech LLC. Standalone version of the CRRT tab from CRRT & PD Dosing; PD stays in that app.

**Draft — not for clinical use until reviewed by Dr D.** `DRAFT=true` in `js/config.js`. Do not remove the banner or flip that flag without his sign-off in his own words.

Preview: https://amarzon-tech.github.io/crrt-dosing/

## What it is

A static, offline progressive web app on one screen:

- No login, ads, analytics, or data collection. Inputs are never stored. `noindex`, robots disallow.
- Simple data entry: one required field (weight); defaults pre-filled and labelled; numeric keypad; live results, no Calculate button.
- **Dose:** weight, target (default 25 mL/kg/h), net UF (default 0), modality → suggested replacement / dialysate rates and prescribed dose.
- **Filter check (optional):** blood flow, hematocrit, downtime → filtration fraction, minimum Qb for FF 25%, predilution-corrected and delivered dose.
- **Heparin:** bolus 30 IU/kg and 7 IU/kg/h defaults (Joannidis 2007, as described in KDIGO 2012 §5.3), optional bag strength → units, units/h, mL/h.
- **Citrate anticoagulation precautions:** contraindications, monitoring, metabolic complications, and what to do if accumulation is suspected, cited to KDIGO 2012 §5.3 and published reviews; plus a total/ionized calcium ratio check. No citrate dose calculator.
- **Order sheet** (Copy / Print) built from those values, with blank write-ins for anything not calculated.

Every statement, number and citation is listed for sign-off in [CONTENT_REVIEW.md](CONTENT_REVIEW.md).

## Run tests

```bash
node tests/formulas.test.js
node tests/prescription.test.js
node tests/static.test.js
```

## Privacy and support

amardamodar@gmail.com. Works offline after the first load (service worker).
