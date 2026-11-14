# Content review — CRRT Dosing (standalone draft)

**App:** CRRT Dosing, v0.1.1-draft (standalone; split from CRRT & PD Dosing, which keeps the PD content)
**Publisher:** Wellness Tech LLC
**For:** Dr Amar Damodar (Dr D)
**Status:** `DRAFT=true`. The slim banner reads “Draft – not for clinical use until reviewed by Dr D.” The citrate card also shows “Draft · awaiting Dr D sign-off” from the same flag. Do not set `DRAFT` to false, or remove the banner, without Dr D’s sign-off in his own words.

Static, offline PWA for clinicians. No login, ads, analytics, network calls after first load, or data collection. Inputs are never stored. Pages are `noindex, nofollow`, `robots.txt` disallows all, and there is no custom domain.

Please tick each item after reviewing the equation or statement, the citation, and the on-screen wording.

---

## Data entry (kept simple, per Dr D)

All on one screen, no Calculate button, no multi-step forms. Results update as you type. Every number field opens the numeric keypad (`inputmode="decimal"` or `"numeric"`). Inputs are 56 px tall; chips are 48 px. Defaults are pre-filled and labelled “default …”; nothing is hidden.

| Calculator | Number fields | Required | Pre-filled defaults | Taps |
|---|---|---|---|---|
| Dose (rates, prescribed dose) | 3 | Weight only | Target 25 mL/kg/h, Net UF 0 mL/h | Modality chip (default CVVH post); a 50% split slider appears only for CVVH mixed / CVVHDF |
| Filter check (optional) | 3 | none | none (blood flow, hematocrit, downtime blank) | — |
| Heparin | 3 (uses weight from Dose) | none beyond weight | Bolus 30 IU/kg, infusion 7 IU/kg/h; bag strength blank | Heparin chip; Give bolus / No bolus |
| Calcium ratio check (citrate) | 2 | both | none | Unit toggles (total Ca mg/dL ↔ mmol/L; ionized Ca mmol/L ↔ mg/dL) |

So a basic dose needs **1 entry** (weight). Heparin needs **0 extra entries** with defaults. The calcium ratio needs **2** lab values. Removed from the earlier draft to simplify: the 3-field 24-h fluid-balance planner (net UF is entered directly as mL/h), the “edit each rate” check mode, the free-text heparin aPTT / anti-Xa / monitoring fields, and the citrate infusion-rate helper (see “Not included”).

- [ ] Sign-off: data-entry design and defaults

---

## CRRT

### Effluent dose (prescribed, predilution-corrected, delivered)

Live prescription builder: weight (required), target prescribed dose (default **25 mL/kg/h**), net UF (default **0 mL/h**), modality (default CVVH post), suggested rates, predilution correction (needs blood flow + hematocrit), and delivered dose after downtime (optional, blank = 0%).

**Equation**

```
Qeff = Qd + Qr_pre + Qr_post + Qnet
Prescribed dose = Qeff / weight                 (mL/kg/h)
Qp = Qb × 60 × (1 − Hct)
DF = Qp / (Qp + Qpre)                           (1 if Qpre = 0)
Corrected dose = (Qeff × DF) / weight
Delivered ≈ corrected × (1 − downtime fraction)
```

**Target**

- KDIGO AKI 2012, recommendation **5.8.4** (not 5.8.3, which is intermittent Kt/V 3.9): deliver an effluent volume of **20–25 mL/kg/h** for CRRT in AKI (1A). “This will usually require a higher prescription of effluent volume.”
- Rationale (Kidney Int Suppl. 2012;2, p. 114): “In clinical practice, in order to achieve a delivered dose of 20–25 ml/kg/h, it is generally necessary to prescribe in the range of **25–30 ml/kg/h**, and to minimize interruptions in CRRT.”

**Citation**

KDIGO Clinical Practice Guideline for Acute Kidney Injury. *Kidney Int Suppl.* 2012;2:1-138. Evidence: Palevsky PM et al. (ATN). *N Engl J Med.* 2008;359:7-20. Bellomo R et al. (RENAL). *N Engl J Med.* 2009;361:1627-1638. Predilution factor: Macedo E, Mehta RL. Continuous dialysis therapies: Core Curriculum 2016. *Am J Kidney Dis.* 2016;68:645-661. [doi:10.1053/j.ajkd.2016.03.427](https://doi.org/10.1053/j.ajkd.2016.03.427)

**Caveats**

- Delivered dose is time-weighted effluent. KDIGO also notes that filter efficiency declines; we do **not** invent a filter-efficiency coefficient.
- Predilution correction assumes a urea sieving coefficient ≈ 1 and applies DF to total effluent (usual clinical approximation).
- Plasma flow has **no** further 0.93 plasma-water factor (judgment, same as the earlier CRRT & PD Dosing draft and the Nephrology Toolbox).
- The default prescribed target of 25 is the lower end of KDIGO’s usual *prescription* range, not the delivered-dose target.

- With pre-filter replacement and no blood flow/hematocrit, the app shows prescribed dose only and asks for Qb + Hct; it does not assume a hematocrit.

- [ ] Sign-off: CRRT effluent dose (prescribed, corrected, delivered)

---

### Suggested rates by modality

Remaining effluent after net UF is assigned as:

- CVVH post → post-filter replacement
- CVVH pre → pre-filter replacement
- CVVH mixed → split by a clinician-adjustable predilution share (default 50%, **not** a guideline target)
- CVVHD → dialysate (convection is net UF only)
- CVVHDF → remaining split by a clinician-adjustable dialysate share (default 50%, **not** a guideline target), then replacement by the predilution share

**Citation:** assignment is a description of the modalities, not a dose recommendation. Dose numbers come from KDIGO 5.8.4 as above.

**Caveats:** if net UF already exceeds the target effluent, rates are not shown and the app says “Net UF is more than the target effluent. Lower net UF or raise the dose.” Rates are suggestions from the target dose; the standalone app does not have an “edit each rate to check a running prescription” mode (that remains in CRRT & PD Dosing).

- [ ] Sign-off: Suggested rates by modality

---

### Filtration fraction and minimum Qb

**Equation**

```
Quf = Qpre + Qpost + Qnet     (for CVVHD, Quf = Qnet only)
FF_post-style = Quf / Qp
FF_pre        = Quf / (Qp + Qpre)
Used FF       = FF_pre if Qpre > 0, else FF_post-style
Min Qb for FF = 0.25:
  Qb = (Quf / 0.25 − Qpre) / (60 × (1 − Hct))
```

The minimum-Qb rearrangement is derived from the FF equation, not a published “recommended Qb.”

**Caution thresholds:** 20% (caution) and 25% (warning). Practice-based, **not** a KDIGO numeric target.

**Citation**

Neri M, et al. Nomenclature for renal replacement therapy in AKI: basic principles. *Crit Care.* 2016;20:318. [doi:10.1186/s13054-016-1489-9](https://doi.org/10.1186/s13054-016-1489-9)

Murugan R, Hoste E, Mehta RL, et al. Precision fluid management in CRRT. *Blood Purif.* 2016. [doi:10.1159/000448528](https://doi.org/10.1159/000448528) — “A high FF (>0.25) is typically associated with increased risk of poor filter performance and clotting.”

**Judgment / disagreement (please decide)**

Neri distinguishes **filtration fraction** (ideally below 30%) from **concentration ratio** (keep below 20–25%). We warn at 20% and 25% on the used FF, and state this in the About sheet.

- [ ] Sign-off: Filtration fraction and minimum Qb

---

## Unfractionated heparin calculator (CRRT)

Appears when **Heparin** is selected. Computes bolus in units and infusion in units/h (and mL/h if a bag strength is entered) from the weight in the Dose card. **Arithmetic only — no new pharmacologic model.** Three number fields: bolus IU/kg (default 30), infusion IU/kg/h (default 7), bag strength units/mL (optional, blank). Plus a Give bolus / No bolus toggle. The free-text aPTT, anti-Xa and monitoring fields from the earlier draft were removed to keep data entry simple; the order sheet keeps blank write-in lines for Target aPTT and Monitoring. The 40–45 second aPTT from Joannidis 2007 is shown in the on-screen note.

**Starting values (editable), from the UFH arm of the second trial described in KDIGO AKI 2012, §5.3 rationale**

- Bolus **30 IU/kg** (optional; a no-bolus toggle is provided so a unit protocol can omit it — not a cited preferred regimen)
- Pre-filter infusion **7 IU/kg/h**
- Target aPTT **40–45 seconds**

Joannidis M, Kountchev J, Rauchenzauner M, et al. Enoxaparin vs. unfractionated heparin for anticoagulation during continuous veno-venous hemofiltration: a randomized controlled crossover study. *Intensive Care Med.* 2007;33:1571-1579. [PMID 17563874](https://pubmed.ncbi.nlm.nih.gov/17563874/). KDIGO reference 616.

Joannidis M, Oudemans-van Straaten HM. Clinical review: Patency of the circuit in continuous renal replacement therapy. *Crit Care.* 2007;11:218. [doi:10.1186/cc5937](https://doi.org/10.1186/cc5937) describes “a possible scheme for UFH” of a 30 IU/kg bolus then an initial **5–10 IU/kg/h**, to be individualized, in patients with normal coagulation. That review notes increased bleeding if systemic aPTT is longer than 45 seconds, citing van de Wetering J, Westendorp RG, van der Hoeven JG, et al. *J Am Soc Nephrol.* 1996;7:145-150. [PMID 8808122](https://pubmed.ncbi.nlm.nih.gov/8808122/) (KDIGO reference 618).

**KDIGO does not recommend a single numeric heparin dose.** Chapter 5.3 rationale: UFH is “mostly administered as a prefilter infusion, with large variability in the administered doses”; the dose–aPTT–filter–bleeding relationship “is not straightforward”; “it is common practice to measure aPTT for safety reasons and to adapt the target to the bleeding risk of the patient”; after the two small UFH-vs-LMWH RCTs, “no firm recommendations can be made.”

**The other KDIGO-cited RCT (shown as an alternative, not the starting default):** Reeves JH, Cumming AR, Gallagher L, et al. *Crit Care Med.* 1999;27:2224-2228 (KDIGO reference 620). UFH arm: bolus **2000–5000 U**, then **10 U/kg/h**, titrated to aPTT **70–80 seconds** (mean 79 seconds).

**Not defaulted, because no citable standard number was used as a starting value**

- Bag concentration (mL/h appears only if you enter units/mL)
- Monitoring interval (KDIGO says measure aPTT and also the platelet count for HIT, but does not give a frequency)
- Anti-Xa for UFH (the anti-Xa figures in those two trials were for LMWH)

**Bleeding / HIT caution (verbatim recommendation numbers, checked in the 2012 PDF)**

- 5.3.2.2 (2B): suggest regional citrate rather than heparin when citrate is not contraindicated
- 5.3.2.3 (2C): if citrate is contraindicated, UFH or LMWH rather than other anticoagulants
- 5.3.3.1 (2C): if bleeding risk is increased and citrate is not contraindicated, suggest citrate rather than no anticoagulation
- 5.3.3.2 (2C): suggest avoiding regional heparinization in a patient with increased bleeding risk
- 5.3.4 (1A): in HIT, all heparin must be stopped (rationale includes heparin locks); recommend a DTI (e.g. argatroban) or Factor Xa inhibitor (e.g. danaparoid or fondaparinux) rather than other or no anticoagulation during RRT
- 5.3.4.1 (2C): in HIT without severe liver failure, suggest argatroban

- [ ] Sign-off: Unfractionated heparin starting values, source disagreements, HIT/bleeding wording


---

## Citrate anticoagulation precautions (new)

Educational text only. **No citrate or calcium dose is calculated.** The only citrate arithmetic is the total/ionized calcium ratio (below). All of it sits under `DRAFT=true` with an extra “Draft · awaiting Dr D sign-off” label on the card.

**Sources (all opened and read online for this draft)**

1. KDIGO Clinical Practice Guideline for Acute Kidney Injury. *Kidney Int Suppl.* 2012;2:1-138, **chapter 5.3 (Anticoagulation)**: recommendations 5.3.2.2, 5.3.3.1, the rationale on pp. 97–98, and Table 19. PDF: kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf. *Note: the request mentioned KDIGO section 5.6; in the 2012 guideline, 5.6 is “Modality of RRT”. Citrate is covered in 5.3, so 5.3 is cited.*
2. Oudemans-van Straaten HM, Ostermann M. Bench-to-bedside review: Citrate for continuous renal replacement therapy, from science to practice. *Crit Care.* 2012;16(6):249. [doi:10.1186/cc11645](https://doi.org/10.1186/cc11645), PMID 23216871, PMC3672558.
3. Schneider AG, Journois D, Rimmelé T. Complications of regional citrate anticoagulation: accumulation or overload? *Crit Care.* 2017;21(1):281. [doi:10.1186/s13054-017-1880-1](https://doi.org/10.1186/s13054-017-1880-1), PMID 29151020, PMC5694623.
4. Morabito S, Pistolesi V, Tritapepe L, Fiaccadori E. Regional citrate anticoagulation for RRTs in critically ill patients with AKI. *Clin J Am Soc Nephrol.* 2014;9(12):2173-2188. [doi:10.2215/CJN.01280214](https://doi.org/10.2215/CJN.01280214), PMID 24993448, PMC4255392. (Review that tabulates published RCA protocols.)
5. Also named on screen: Link A, et al. *Crit Care.* 2012;16:R97 ([doi:10.1186/cc11363](https://doi.org/10.1186/cc11363)), ratio ≥ 2.4 predicted 28-day mortality (abstract read). Meier-Kriesche HU, et al. *Crit Care Med.* 2001;29:748-752 (PMID 11373461), early report of raised ratio with citrate CVVHD, all in liver failure (abstract read; the abstract gives no numeric cut-off; full text not checked).
6. **Reference protocol (added after Dr D said “Use that one”):** Safety Evaluation of Prismocitrate 18 in Patients Receiving CRRT. ClinicalTrials.gov identifier: [NCT05399537](https://clinicaltrials.gov/study/NCT05399537). Official title: “A Safety Evaluation of Prismocitrate 18 in Patients Receiving Continuous Renal Replacement Therapy (CRRT).” Sponsor: Vantive Health LLC (collaborator Baxter Healthcare Corporation). Record retrieved from `https://clinicaltrials.gov/api/v2/studies/NCT05399537` on 14 Nov 2026 (America/New_York). Last update posted 5 Oct 2026; status verified September 2026; overall status recruiting; no results posted; Phase 3. A Bon Secours Mercy Health–Springfield Regional Medical Center (Springfield, Ohio) site is listed; the record now marks that site **terminated**. This is **not** a Bon Secours Richmond policy.

### Disclaimer (top of card)

| On-screen statement | Source |
|---|---|
| “Follow your institution’s protocol. The numbers in the reference-protocol box come from the Prismocitrate 18 clinical-trial protocol (NCT05399537). They are a trial protocol, not a Bon Secours Richmond policy. A Bon Secours Mercy Health hospital in Springfield, Ohio, was listed as a trial site. Use your local RCA protocol for solution, dose, calcium replacement, targets, and monitoring times.” | App disclaimer (judgment), plus the trial record [6] and the Springfield site listing (now terminated). KDIGO: RCA “requires a strict protocol, adapted to the local treatment modality and flow settings.” |
| “KDIGO advises citrate only in centers with an established protocol.” | [1] “…only recommend the use of citrate for anticoagulation during CRRT in patients that do not have shock or severe liver failure, and in centers that have an established protocol for citrate anticoagulation.” |

- [ ] Sign-off: disclaimer


### Reference protocol: Prismocitrate 18 (NCT05399537)

Labeled on screen as **“Reference protocol: Prismocitrate 18 (NCT05399537)”**. Primary displayed values are the post-filter range, the systemic range, and the ratio flag. Every number below was re-checked against the ClinicalTrials.gov API record on 14 Nov 2026. No citrate or calcium dose is calculated from these values.

| On-screen statement | Exact source text in the NCT05399537 record [6] |
|---|---|
| Phase 3 safety study of investigational Prismocitrate 18. These are trial values, not a Bon Secours Richmond policy, and not a substitute for your institution’s protocol. | Study type interventional, phases PHASE3; Prismocitrate 18 is described as “(investigational drug)”; PrisMax System Version 3.x with calcium line accessory as “(investigational device)”; `hasResults`: false. Springfield, Ohio site listing as above. The “not a Bon Secours Richmond policy / not a substitute” wording is an app disclaimer (judgment). |
| **Post-filter ionized calcium: 0.25–0.35 mmol/L** (primary displayed target) | Intervention, Prismocitrate 18: “The flow rate for the anticoagulation of the extracorporeal circuit will be titrated to achieve a post-filter concentration of iCa of 0.25 to 0.35 mmol/L.” |
| **Systemic ionized calcium: 1.0–1.3 mmol/L** (primary displayed range). “Trial’s normal physiologic range; correct into this range before starting.” | Exclusion criteria: “Patients with a systemic ionized calcium concentration outside the normal physiologic range (1.0 - 1.3 mmol/L), or outside of the laboratory reference range (Note: It is acceptable to provide calcium supplementation or treatment for hypercalcemia to achieve a normal physiologic range prior to therapy initiation).” The record does **not** separately state a during-therapy titration target; the card labels this as the trial’s normal physiologic range and the pre-start correction band, not as an invented titration protocol. |
| Safety cut-offs used in the trial: **<0.9** and **>1.4 mmol/L**. | Primary outcome, symptomatic hypocalcemia: “with a confirmed systemic ionized calcium < 0.9 mmol/L.” Primary outcome, symptomatic hypercalcemia: “with a confirmed systemic ionized calcium > 1.4 mmol/L.” (The outcome definitions also require attributable symptoms; the card shows the numeric cut-offs, not the symptom lists.) |
| **Accumulation (total / ionized calcium): >2.5** (primary displayed flag) | Primary outcome, symptomatic citrate accumulation: “with a systemic total calcium to ionized calcium ratio > 2.5.” |
| Prismocitrate 18, pre-dilution only. Citrate dose indexed to blood flow, target 3 mmol/L of blood. This app does not calculate citrate or calcium doses. | “Prismocitrate 18 solution (investigational drug) will be used in pre-dilution mode only; the rate of administration depends on the targeted citrate dose and the prescribed flow rate. The pre-filter infusion rate of Prismocitrate 18 solution will be indexed to the blood flow rate (BFR) to achieve a target blood citrate concentration of 3 mmol/L of blood.” No infusion-rate or calcium-replacement calculator was added. |
| Do not use if: known citrate allergy, adverse reaction to citrate, or prior citrate toxicity | “Patients with a known allergy to citrate or who have ever experienced an adverse reaction associated with citrate products, including patients with a prior history of citrate toxicity” |
| Do not use if: acute liver failure | “Patients with acute liver failure, defined by the occurrence of encephalopathy and hepatic synthetic dysfunction within 26 weeks of the first symptoms of liver disease and without evidence of chronic liver disease.” The short label is on the card; the full 26-week definition is in the Sources sheet. |
| Do not use if: acute-on-chronic liver failure with Child-Pugh score >10 | “Patients with acute-on-chronic liver failure characterized by acute decompensation of cirrhosis and a Child-Pugh Liver Failure Score >10” |
| Do not use if: refractory shock with lactic acidosis (lactate >4 mmol/L) | “Patients with refractory shock and associated lactic acidosis (lactate >4 mmol/L)” |
| Do not use if: systemic ionized calcium outside 1.0–1.3 mmol/L, unless first corrected into that range | Same exclusion quote as the systemic range row above. |

*In the record but not shown on the card (judgment):* the full acute-liver-failure definition (on the Sources sheet instead); “or outside of the laboratory reference range”; symptom examples in the primary outcomes (tetany/spasms, seizures, prolonged or shortened QT, mental-status changes, refractory acidosis); other study eligibility (age ≥18, expected survival of at least 24 hours, pregnancy or breastfeeding, concurrent interventional study, contraindication to heparin / increased hemorrhage risk); PrisMax Version 3.x / calcium line accessory; treatment period up to 10 days; current recruiting status and lack of posted results (mentioned briefly as Phase 3 / investigational). The earlier “available but not shown” lactate ≥3.4 mmol/L and prothrombin time ≤26% predictors from [4] remain off the card; they are not in this trial record, and [3] still says no lactate threshold has been established.

- [ ] Sign-off: Prismocitrate 18 reference-protocol block and the values taken from NCT05399537

### Avoid or use with caution

| On-screen statement | Source (quote) |
|---|---|
| Severe liver failure and shock with muscle hypoperfusion are the major contraindications in KDIGO, because both risk citrate accumulation. KDIGO recommends citrate only without shock or severe liver failure. | [1] “A major contra-indication for the use of citrate anticoagulation is severely impaired liver function or shock with muscle hypoperfusion, both representing a risk of citrate accumulation.” |
| Persistent lactic acidosis / poor tissue perfusion carries the highest risk (citrate metabolism needs oxygen). Accumulation likely with persistent severe heart failure, ischemic hepatitis (shock liver), poor muscle perfusion. | [2] “patients at greatest risk of accumulation seem to be those with persistent lactic acidosis due to poor tissue perfusion”; “citrate is likely to accumulate in patients with persistent severe heart failure, ischemic hepatitis and poor muscle perfusion, because the Krebs cycle only operates under aerobic conditions.” |
| A high lactate at the start of CRRT should raise concern. Reviews have not established a universal lactate cut-off for avoiding citrate. The trial protocol above excludes refractory shock with lactate >4 mmol/L. | [2] “A high lactate concentration in patients with shock at the start of CRRT should raise awareness of the risk of citrate accumulation.” [3] “the lactate threshold above which RCA should not be used remains to be determined.” [6] exclusion: “refractory shock and associated lactic acidosis (lactate >4 mmol/L).” |
| Liver disease is not an absolute bar in recent reviews: with dose reduction and closer monitoring, citrate has been used in liver failure. Standard liver tests do not reliably predict citrate clearance. | [2] “adjustment of dose and intensified monitoring of ionized calcium levels seem to allow the safe use of citrate in patients with decompensated cirrhosis”; “citrate clearance cannot be reliably predicted from standard liver function tests.” [3] most such patients “could process citrate anyway … classic markers of liver function were poor predictors.” [4] same point. |
| Some poisonings that block mitochondria (e.g. metformin, paracetamol, propofol) may lower citrate metabolism. | [3] “some commonly encountered intoxications (biguanides (e.g., metformin), cyclosporine, paracetamol, trichloroethylene, or propofol) can lead to mitochondrial blockage and decrease citrate metabolization capacity.” |
| Large transfusions of citrated blood products add citrate load. | [4] “liberal administration of citrate-containing blood products … may significantly increase the citrate metabolic load.” |

*Available but not shown (for your decision):* [4] reports that, in liver failure, “a prothrombin time ≤26% … and elevation of the serum lactate to ≥3.4 mmol/L seem to be the best predictors of RCA-related metabolic complications” (from one observational study it cites). Not put on screen, because [3] says no lactate threshold has been established.

- [ ] Sign-off: contraindications and cautions

### What to monitor

| On-screen statement | Source (quote) |
|---|---|
| Post-filter ionized calcium checks circuit anticoagulation. Primary target in the reference protocol: **0.25–0.35 mmol/L** (Prismocitrate 18 trial). Other published ranges include 0.2–0.35 mmol/L or 0.3–0.4 mmol/L. Use your protocol’s range. | [6] “titrated to achieve a post-filter concentration of iCa of 0.25 to 0.35 mmol/L.” Supporting: [3] “target range (0.2 to 0.35 mmol/l according to the protocol used)”; [4] “0.3–0.4 mmol/L.” ([2] also uses “<0.35 mmol/L”.) |
| Systemic ionized calcium guides calcium replacement. Primary range in the reference protocol: **1.0–1.3 mmol/L** (the trial’s normal physiologic range). Reviews also say to target the normal or physiological range. Target per protocol. | [6] “normal physiologic range (1.0 - 1.3 mmol/L)” (eligibility / correct before start). Supporting: [3] “targeting physiological range.” [4] “maintain systemic ionized calcium levels within the normal range.” |
| Total-to-ionized calcium ratio is the most reliable bedside sign of accumulation. Primary flag in the reference protocol: a ratio **above 2.5**. Supporting literature: about 2.5 is the usual recognized cut-off; a rising trend toward it also matters. One review: a rise above **2.25** should prompt you to consider accumulation. | [6] “a systemic total calcium to ionized calcium ratio > 2.5.” Supporting: [3] “A cut-off value of 2.5 is usually recognized as indicative of significant accumulation but a trend towards this value is highly indicative of ongoing accumulation.” [2] “A rise in total to ionized calcium ratio >2.25 should trigger the clinician to consider citrate accumulation.” |
| Blood gas, sodium, magnesium. KDIGO: monitoring should include acid-base status, sodium, total and ionized calcium. One review: post-filter, systemic and total calcium about **every 6 hours** after the start, magnesium **daily**. Another: usual calcium checks every **4–6 hours**, shortened if at risk. Timing per protocol. | [1] “intensive metabolic monitoring, including acid-base status, sodium, and total and ionized calcium levels.” [3] “After the initiation phase, regular monitoring (every 6 h) of post-filter, systemic, and total calcium levels (with total/ionized ratio calculation) should be performed”; “daily monitoring of serum magnesium levels is also advisable.” [4] “the usual calcium monitoring intervals (4–6 hours) … should be shortened in patients who may have impaired citrate metabolism.” ([2] advises “2-hourly at start” in at-risk patients — in the Sources sheet.) |
| Rising calcium replacement needs are an early warning sign. | [3] “an increase in calcium substitution needs … should prompt particular attention.” [4] “progressively higher calcium infusion rates may be required.” |

- [ ] Sign-off: monitoring

### Metabolic complications

| On-screen statement | Source (quote) |
|---|---|
| Metabolic alkalosis — most frequent metabolic complication in observational studies (**up to 50%** in KDIGO’s summary). Usually net citrate overload with normal metabolism (too much citrate or too little clearance); the calcium ratio stays normal. | [1] “the most frequent metabolic complication is metabolic alkalosis, occurring in up to 50% of the patients.” [3] net overload: “plasma alkalinization … No increase in total/ionized calcium is observed”; “a sign of excessive citrate administration or, more frequently, of low clearance in the hemofilter.” |
| Hypernatremia — mainly with concentrated (hypertonic) trisodium citrate if replacement/dialysate sodium is not lowered. Depends on the solutions. | [2] “highly concentrated trisodium citrate solutions may lead to hypernatremia if the sodium content of the replacement solutions is not proportionally reduced.” [4] “a potential but rarely observed complication related to the use of hypertonic solutions without low-sodium concentration dialysate and/or replacement fluids.” |
| Hypocalcemia — from accumulation, or from calcium replacement lower than effluent loss. | [2] “Systemic hypocalcemia … may also be due to insufficient replacement”; “Ionized hypocalcemia is the most sensitive indicator of citrate accumulation.” [1] Table 19. |
| Hypomagnesemia — citrate binds magnesium, lost in effluent; needs depend on fluid magnesium. | [2] “Citrate also binds to magnesium and this may cause hypomagnesemia due to increased magnesium loss.” [4] “the need for supplementation is related to exchanged volumes and the magnesium concentration in CRRT solutions.” |
| Metabolic acidosis — with accumulation (often high lactate and high anion gap), or too little buffer delivered. | [3] “recurrence of high anion gap metabolic acidosis and increased serum lactate levels are also frequently observed concomitant to citrate accumulation”; insufficient trisodium-citrate delivery causes residual acidosis. [4] acidosis “when impaired citrate metabolism prevents bicarbonate generation or, alternatively, from an insufficient buffer supply.” |

- [ ] Sign-off: metabolic complications

### If accumulation is suspected

| On-screen statement | Source (quote) |
|---|---|
| Signs: rising ratio, falling systemic iCa, rising calcium needs, worsening acidosis. | [2] and [3] as above. |
| Lower the citrate load: reduce blood flow (citrate is coupled to it) or the citrate target, and/or raise effluent flow. | [3] “1) decreasing the blood flow rate … 2) increasing the dialysate rate (CVVHD) or the filtration rate (CVVH) … or 3) decreasing the targeted citrate concentration within the filter.” [2] “a) decreasing both citrate flow and blood flow if feasible, b) increasing citrate clearance (effluent flow).” |
| Give IV calcium for ionized hypocalcemia; titrate bicarbonate for acidosis. | [2] “d) administration of intravenous calcium to correct hypocalcemia, and e) titrated replacement of bicarbonate to correct acidosis.” |
| Reduce or stop citrate and switch circuit anticoagulation if no quick improvement, but keep CRRT running to clear citrate–calcium complexes. | [3] “Unless rapid improvement after citrate delivery decrease is observed, RCA should be replaced by alternative circuit anticoagulation. Of note, in this situation, CRRT should be continued to enable CCC clearance.” [2] “c) reducing or discontinuing citrate flow.” |
| If citrate is in the pre-dilution replacement, its dose is tied to the CRRT dose; replace it with bicarbonate fluid ± heparin. | [2] “when citrate is part of the pre-dilution replacement, reduction of citrate dose is not an option … citrate should be replaced by bicarbonate with or without heparin.” |
| Net citrate overload (alkalosis, normal ratio) is benign; reduce citrate delivery and do not stop therapy for it. | [3] “citrate overload is a benign process and should not prompt therapy discontinuation. It is usually fixed with citrate delivery reduction.” |

- [ ] Sign-off: management of suspected accumulation

### Calcium ratio check (the only citrate calculation)

```
ratio = total Ca (mmol/L) ÷ ionized Ca (mmol/L)
mg/dL ÷ 4 = mmol/L   (each value has its own unit toggle)
ratio > 2.5          → "Above 2.5 — accumulation by the trial definition; follow protocol"   [6]
2.25 < ratio ≤ 2.5   → "Above 2.25 — consider accumulation"                                 [2]
otherwise            → "Not above 2.25 — watch the trend"
ratio < 1            → "Total is lower than ionized — check units"  (unit-entry sanity check, not clinical)
```

The main flag is now **strictly greater than 2.5**, to match the trial wording (“ratio > 2.5”). Exactly 2.5 is therefore not an accumulation flag; it stays in the “consider” band because it is still above 2.25. Comparison is on the ratio rounded to 3 decimals so a float artefact at exactly 2.25 or 2.5 does not flip the reading. Supporting literature on the note under the box: Schneider 2017 usual cut-off of 2.5 [3]. Shown as text, not flags: 2.4 (Link 2012, mortality predictor) and 2.1 (KDIGO: “optimal cutoff at 2.1”, citing Bakker et al. *Clin Chem Lab Med* 2006;44:962-966). [4] notes the published cut-offs were derived without albumin adjustment; this is on screen. On-screen hint “Both values use the same blood draw” is a usage instruction (judgment).

- [ ] Sign-off: calcium ratio check, thresholds and wording

### Citrate on the order sheet

If Citrate is chosen, the sheet says “Anticoagulation: Regional citrate — per institutional protocol” with blank write-in lines for: citrate solution and rate, post-filter ionized Ca target, calcium replacement, citrate monitoring. No citrate number is printed.

- [ ] Sign-off: citrate order-sheet lines

---

## Order sheet (formatting only)

Same format as CRRT & PD Dosing’s CRRT sheet: weight, modality, target dose (mL/kg/h and mL/h = target × weight), blood flow, replacement (pre/post), dialysate, net UF goal, anticoagulation as chosen, filtration fraction with the 20% caution / 25% warning flags, downtime-adjusted dose, and blank write-ins for bath (K / Ca / bicarbonate), monitoring labs, patient, MRN, prescriber. Footer: “Draft – verify before use; clinical judgment required.” No anticoagulant is pre-selected. Heparin lines show bolus and infusion from the calculator; Target aPTT and Monitoring stay blank write-ins.

- [ ] Sign-off: order sheet

---

## Not included, on purpose

- No PD content (stays in CRRT & PD Dosing).
- No citrate infusion-rate or calcium-replacement calculator. (The earlier draft’s citrate-in-blood helper — Qb × 60 × target ÷ solution mmol/L, target 3 mmol/L, ACD-A 113 / 4% TSC 136 mmol/L — remains only in CRRT & PD Dosing. Say if you want it here behind the same flag.)
- No 24-h fluid-balance planner (net UF entered directly).
- No 0.93 plasma-water correction. No assumed insensible losses. No filter-efficiency coefficient.
- No default heparin bag strength, monitoring interval, or UFH anti-Xa.

---

## Judgment calls for your review

1. **KDIGO section number for citrate.** Cited as chapter **5.3** (Anticoagulation). Section 5.6 in the 2012 guideline is “Modality of RRT”.
2. **Ratio thresholds.** Primary flag is now **above 2.5**, from the Prismocitrate 18 trial [6] (“ratio > 2.5”). The softer “consider” flag above 2.25 (Oudemans-van Straaten 2012) is kept. Exactly 2.5 is not above the trial flag, so the checker leaves it in the consider band. Schneider 2017 (“usually recognized” cut-off of 2.5) remains as supporting text. KDIGO’s 2.1 and Link’s 2.4 are mentioned, not flagged.
3. **Post-filter and systemic iCa.** Primary displayed values are now the trial’s post-filter **0.25–0.35 mmol/L** and the trial’s normal physiologic / pre-start range **1.0–1.3 mmol/L**, plus safety cut-offs **<0.9** and **>1.4 mmol/L**. The record does not separately state a during-therapy systemic titration target; the card labels 1.0–1.3 as the trial’s normal physiologic range. Review ranges (0.2–0.35 and 0.3–0.4 mmol/L; “physiological / normal range”) stay as supporting sources, with “use your protocol’s range”.
4. **Monitoring intervals** (every 6 h; 4–6 h; 2-hourly at start if at risk) are shown as what the reviews describe, with “timing per protocol”. The trial record does not give a monitoring interval, so none was invented.
5. **Liver failure wording.** The trial block lists acute liver failure and acute-on-chronic liver failure with Child-Pugh >10 as exclusions. Below that, KDIGO 2012 still calls severe liver failure a major contraindication, and the 2012–2017 reviews still say citrate can be used with dose reduction and closer monitoring. Both layers are shown.
6. **Lactate.** The trial exclusion **lactate >4 mmol/L** (with refractory shock) is now shown in the reference-protocol block. The reviews’ statement that no universal lactate cut-off has been established is kept as supporting text. The earlier “available but not shown” lactate ≥3.4 mmol/L and prothrombin time ≤26% predictors from [4] remain off the card.
7. FF thresholds, plasma-water factor, 50% default splits, and heparin defaults: same as the earlier draft (sections above).
8. **Bon Secours.** Dr D asked to check the Bon Secours citrate protocol, then said “Use that one” after being told the public record is the Prismocitrate 18 trial (a Springfield, Ohio Bon Secours Mercy Health site, now marked terminated). The card states clearly that these values are a trial protocol, not a Bon Secours Richmond policy.
