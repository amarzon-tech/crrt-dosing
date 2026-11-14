/**
 * Worked-example tests for CRRT Rx formulas (standalone, no PD).
 * Run: node tests/formulas.test.js
 * Every numeric expectation is either a direct rearrangement of a cited
 * equation or a published value (KDIGO ranges, Joannidis heparin regimen,
 * citrate calcium-ratio cut-offs from the Prismocitrate 18 trial (NCT05399537)
 * and Oudemans-van Straaten 2012).
 */
"use strict";

const F = require("../js/formulas.js");

let passed = 0;
let failed = 0;
const failures = [];

function approx(actual, expected, eps, msg) {
  const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= eps;
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(`${msg}: got ${actual}, expected ${expected} ± ${eps}`);
  }
}

function eq(actual, expected, msg) {
  const ok = actual === expected;
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(`${msg}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

function isTrue(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(msg);
  }
}

function throws(fn, msg) {
  try {
    fn();
    failed++;
    failures.push(`${msg}: expected throw`);
  } catch (e) {
    passed++;
  }
}

function section(name) {
  console.log("\n▸ " + name);
}

section("Plasma flow, predilution factor, effluent dose (KDIGO AKI 2012 5.8.4)");
approx(F.plasmaFlowMlH(150, 0.3), 6300, 1e-12, "Qp 150 mL/min Hct 30% = 6300 mL/h");
approx(F.plasmaFlowMlH(150, 30), 6300, 1e-12, "Hct as percent 30");
approx(F.predilutionFactor(6300, 1000), 6300 / 7300, 1e-12, "DF = Qp/(Qp+Qpre) = 0.863");

{
  const d = F.crrtEffluentDose({
    weightKg: 80,
    qdMlH: 1000,
    qpreMlH: 1000,
    qpostMlH: 500,
    qnetMlH: 100,
    qbMlMin: 150,
    hct: 0.3,
  });
  approx(d.qeffMlH, 2600, 1e-12, "Qeff 2600 mL/h");
  approx(d.prescribedMlKgH, 32.5, 1e-12, "prescribed 32.5 mL/kg/h");
  // DF = 6300/(6300+1000) = 6300/7300; corrected = 2600 * DF / 80
  approx(d.df, 6300 / 7300, 1e-12, "DF");
  approx(d.correctedMlKgH, (2600 * 6300) / 7300 / 80, 1e-12, "predilution-corrected dose");
  approx(d.correctedMlKgH, 28.047945205479454, 1e-12, "corrected 28.05 mL/kg/h");

  const post = F.crrtEffluentDose({ weightKg: 80, qpostMlH: 2000, qnetMlH: 100 });
  approx(post.df, 1, 0, "post-dilution DF=1");
  approx(post.correctedMlKgH, 2100 / 80, 1e-12, "post-dilution dose 26.25");
}

{
  // 80 kg, target 25 → 2000 mL/h. Pure CVVHD, Qnet 100, Qd 1900.
  const d = F.crrtEffluentDose({ weightKg: 80, qdMlH: 1900, qnetMlH: 100 });
  approx(d.prescribedMlKgH, 25, 1e-12, "CVVHD prescribed 25 mL/kg/h");
  approx(d.correctedMlKgH, 25, 1e-12, "CVVHD no predilution, corrected = prescribed");
}

section("Filtration fraction (Neri Crit Care 2016; Mehta Blood Purif 2016)");
{
  const ff = F.filtrationFraction({
    qbMlMin: 150,
    hct: 0.3,
    qpreMlH: 1000,
    qpostMlH: 500,
    qnetMlH: 100,
    modality: "cvvhdf",
  });
  approx(ff.qufMlH, 1600, 1e-12, "Quf = Qpre+Qpost+Qnet = 1600");
  approx(ff.ffPostPct, (1600 / 6300) * 100, 1e-12, "post-style FF ~25.4%");
  approx(ff.ffPrePct, (1600 / 7300) * 100, 1e-12, "pre-dilution FF ~21.9%");
  approx(ff.ffUsedPct, ff.ffPrePct, 1e-12, "used FF is pre-style when Qpre > 0");
  const hd = F.filtrationFraction({ qbMlMin: 150, hct: 0.3, qnetMlH: 100, modality: "cvvhd" });
  approx(hd.qufMlH, 100, 1e-12, "CVVHD Quf is net UF only");
  approx(hd.ffUsedPct, (100 / 6300) * 100, 1e-12, "CVVHD used FF = Qnet/Qp");
}
{
  // SCUF: FF = UF / plasma flow. Qp = 200 × 60 × 0.7 = 8400 mL/h.
  const sc = F.filtrationFraction({ qbMlMin: 200, hct: 0.3, qnetMlH: 200, modality: "scuf" });
  approx(sc.qufMlH, 200, 1e-12, "SCUF Quf is net UF only");
  approx(sc.ffUsedPct, (200 / 8400) * 100, 1e-12, "SCUF FF = UF / Qp");
  approx(sc.ffPostPct, sc.ffUsedPct, 1e-12, "SCUF has no predilution, used FF is post-style");
}

section("Minimum Qb to keep FF at 25% (derived from FF equation)");
{
  // Post-dilution CVVH: Quf = 1900, Hct 0.3, FF 0.25, Qpre 0
  // Qb = (1900/0.25) / (60*0.7) = 7600/42
  const r = F.minQbForFf({ hct: 0.3, qpostMlH: 1800, qnetMlH: 100, modality: "cvvh-post" }, 0.25);
  approx(r.qbMlMin, 7600 / 42, 1e-12, "min Qb 180.95 mL/min for FF 25%");
  // Verify: at that Qb, FF is exactly 25%
  const ff = F.filtrationFraction({
    qbMlMin: r.qbMlMin,
    hct: 0.3,
    qpostMlH: 1800,
    qnetMlH: 100,
    modality: "cvvh",
  });
  approx(ff.ffUsed, 0.25, 1e-12, "FF at min Qb is exactly 25%");
}

section("Suggested prescription from target dose (KDIGO default 25 mL/kg/h)");
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvh-post",
  });
  approx(s.qeffMlH, 2000, 1e-12, "Qeff = 25×80 = 2000");
  approx(s.qpostMlH, 1900, 1e-12, "CVVH post: remaining 1900 is replacement");
  approx(s.qpreMlH, 0, 1e-12, "no predilution");
  approx(s.qdMlH, 0, 1e-12, "no dialysate");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvh-pre",
  });
  approx(s.qpreMlH, 1900, 1e-12, "CVVH pre: 1900 predilution");
  approx(s.qpostMlH, 0, 1e-12, "no post");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvh-mixed",
  });
  approx(s.qpreMlH, 950, 1e-12, "CVVH mixed default 50% pre");
  approx(s.qpostMlH, 950, 1e-12, "CVVH mixed default 50% post");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvhd",
  });
  approx(s.qdMlH, 1900, 1e-12, "CVVHD all remaining is dialysate");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvhdf",
    dialysateFraction: 0.5,
    preFraction: 0, // all replacement post
  });
  approx(s.qdMlH, 950, 1e-12, "CVVHDF 50% dialysate");
  approx(s.qpostMlH, 950, 1e-12, "CVVHDF remaining replacement post");
  approx(s.qpreMlH, 0, 1e-12, "no pre");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 100,
    modality: "cvvhdf",
  });
  approx(s.qdMlH, 950, 1e-12, "CVVHDF default 50% dialysate");
  approx(s.qpreMlH, 475, 1e-12, "CVVHDF default 50% of replacement is pre");
  approx(s.qpostMlH, 475, 1e-12, "CVVHDF default 50% of replacement is post");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 0,
    modality: "cvvhdf",
    dialysateFraction: 0.5,
    preFraction: 0,
  });
  approx(s.qdMlH, 1000, 1e-12, "CVVHDF 50% dialysate");
  approx(s.qpostMlH, 1000, 1e-12, "CVVHDF Post: all replacement post");
  approx(s.qpreMlH, 0, 1e-12, "CVVHDF Post: no pre");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 0,
    modality: "cvvhdf",
    dialysateFraction: 0.5,
    preFraction: 1,
  });
  approx(s.qdMlH, 1000, 1e-12, "CVVHDF 50% dialysate with Pre");
  approx(s.qpreMlH, 1000, 1e-12, "CVVHDF Pre: all replacement pre");
  approx(s.qpostMlH, 0, 1e-12, "CVVHDF Pre: no post");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 0,
    modality: "cvvhdf",
    dialysateFraction: 0.5,
    preFraction: 0.5,
  });
  approx(s.qdMlH, 1000, 1e-12, "CVVHDF Mixed: 50% dialysate");
  approx(s.qpreMlH, 500, 1e-12, "CVVHDF Mixed: 50% of replacement is pre");
  approx(s.qpostMlH, 500, 1e-12, "CVVHDF Mixed: 50% of replacement is post");
}
{
  const s = F.suggestCrrtPrescription({
    weightKg: 80,
    targetMlKgH: 25,
    qnetMlH: 2500,
    modality: "cvvh-post",
  });
  eq(s.netExceedsTarget, true, "net UF 2500 > target effluent 2000 is flagged");
}
throws(() => F.suggestCrrtPrescription({ weightKg: 80, targetMlKgH: 25, modality: "scuf" }), "SCUF has no suggested clearance rates");

section("Delivered dose with downtime (KDIGO 5.8.1 time-weighted approximation)");
{
  const d = F.deliveredDose(25, 10);
  approx(d.uptime, 0.9, 1e-12, "10% downtime → 90% uptime");
  approx(d.deliveredMlKgH, 22.5, 1e-12, "25 × 0.9 = 22.5 delivered");
  // 20% downtime on a 25 prescribed → 20 delivered, bottom of KDIGO range
  approx(F.deliveredDose(25, 20).deliveredMlKgH, 20, 1e-12, "25 × 0.8 = 20");
}
{
  const s = F.kdigoDoseStatus(22.5, 25);
  eq(s.deliveredStatus, "in-range", "22.5 is within 20–25 delivered");
  eq(s.prescribedStatus, "usual-prescription", "25 is in the 25–30 usual prescription range");
  eq(F.kdigoDoseStatus(19, 24).deliveredStatus, "below", "19 is below 20");
  eq(F.kdigoDoseStatus(19, 24).prescribedStatus, "below-usual-prescription", "24 is below 25–30");
  eq(F.kdigoDoseStatus(26, 32).deliveredStatus, "above", "26 is above 25");
  eq(F.kdigoDoseStatus(26, 32).prescribedStatus, "above-usual-prescription", "32 is above 30");
  eq(F.kdigoDoseStatus(20, 30).deliveredStatus, "in-range", "20 inclusive lower bound");
  eq(F.kdigoDoseStatus(25, 30).deliveredStatus, "in-range", "25 inclusive upper bound");
}

section("Citrate calcium ratio (Prismocitrate 18 NCT05399537 >2.5; Oudemans-van Straaten 2012 >2.25)");
{
  eq(F.TARGETS.CITRATE_RATIO_CUTOFF, 2.5, "trial accumulation flag is 2.5 (compared as >2.5)");
  eq(F.TARGETS.CITRATE_RATIO_CONSIDER, 2.25, "Oudemans-van Straaten 2012 >2.25");
  // 10 mg/dL total = 2.5 mmol/L; iCa 1.0 mmol/L -> ratio 2.5 (equal to, not above, the trial flag)
  const r = F.citrateCalciumRatio(10, "mg/dL", 1.0, "mmol/L");
  approx(r.ratio, 2.5, 1e-12, "total 10 mg/dL / iCa 1.0 mmol = 2.5");
  approx(r.totalMmol, 2.5, 1e-12, "10 mg/dL = 2.5 mmol/L");
  eq(r.status, "consider", "exactly 2.5 is not >2.5, so it stays in the consider band");
  const justOver = F.citrateCalciumRatio(2.501, "mmol/L", 1.0, "mmol/L");
  eq(justOver.status, "accumulation", "2.501 rounds to 2.501 and is >2.5");
  const hi = F.citrateCalciumRatio(3.0, "mmol/L", 1.0, "mmol/L");
  eq(hi.status, "accumulation", "3.0 is above 2.5");
  const cons = F.citrateCalciumRatio(2.45, "mmol/L", 1.0, "mmol/L");
  eq(cons.status, "consider", "2.45 is >2.25 and not >2.5");
  const justAbove = F.citrateCalciumRatio(2.26, "mmol/L", 1.0, "mmol/L");
  eq(justAbove.status, "consider", "2.26 is >2.25");
  // Exactly 2.25 is not 'above 2.25' (source wording is >2.25)
  const edge = F.citrateCalciumRatio(9, "mg/dL", 1.0, "mmol/L");
  approx(edge.ratio, 2.25, 1e-12, "9 mg/dL / 1.0 mmol/L = 2.25");
  eq(edge.status, "below", "exactly 2.25 is not >2.25");
  // Float artefact guard: 2.2500000000000004 must not flip to 'consider'
  const flo = F.citrateCalciumRatio(2.25 + 4e-16, "mmol/L", 1.0, "mmol/L");
  eq(flo.status, "below", "float artefact at 2.25 stays below");
  // 2.5004 rounds to 2.500 and must not flip to accumulation
  const flo25 = F.citrateCalciumRatio(2.5 + 4e-4, "mmol/L", 1.0, "mmol/L");
  approx(flo25.ratio, 2.5004, 1e-12, "2.5004 before rounding");
  eq(flo25.status, "consider", "2.5004 rounds to 2.5 and is not >2.5");
  const low = F.citrateCalciumRatio(2.3, "mmol/L", 1.15, "mmol/L");
  approx(low.ratio, 2.0, 1e-12, "2.3 / 1.15 = 2.0");
  eq(low.status, "below", "2.0 is below both flags");
  // Ionized Ca reported in mg/dL: 4.4 mg/dL = 1.1 mmol/L
  const icaMg = F.citrateCalciumRatio(9.0, "mg/dL", 4.4, "mg/dL");
  approx(icaMg.icaMmol, 1.1, 1e-12, "iCa 4.4 mg/dL = 1.1 mmol/L");
  approx(icaMg.ratio, 9.0 / 4.4, 1e-12, "same-unit ratio is unit-free");
  // Unit mismatch is caught in the UI by ratio < 1 (total cannot be below ionized)
  const mism = F.citrateCalciumRatio(9.0, "mg/dL", 4.4, "mmol/L");
  isTrue(mism.ratio < 1, "iCa entered in mg/dL but left as mmol/L gives ratio < 1");
  approx(F.convertCaToMmol(8, "mg/dL"), 2, 1e-12, "8 mg/dL = 2 mmol/L (÷ 4)");
  approx(F.convertCaToMmol(1.1, "mmol/L"), 1.1, 1e-12, "mmol/L unchanged");
  throws(() => F.citrateCalciumRatio(0, "mmol/L", 1.0, "mmol/L"), "total Ca must be positive");
  throws(() => F.citrateCalciumRatio(NaN, "mmol/L", 1.0, "mmol/L"), "total Ca must be a number");
}

section("Unfractionated heparin bolus and infusion (arithmetic only)");
eq(F.TARGETS.HEPARIN_BOLUS_IU_KG, 30, "default bolus 30 IU/kg (Joannidis 2007 ICM)");
eq(F.TARGETS.HEPARIN_INFUSION_IU_KG_H, 7, "default infusion 7 IU/kg/h (Joannidis 2007 ICM)");
eq(F.TARGETS.HEPARIN_INFUSION_RANGE_MIN, 5, "possible-scheme range min 5");
eq(F.TARGETS.HEPARIN_INFUSION_RANGE_MAX, 10, "possible-scheme range max 10");
eq(F.TARGETS.HEPARIN_APTT_LOW_SEC, 40, "Joannidis aPTT low 40");
eq(F.TARGETS.HEPARIN_APTT_HIGH_SEC, 45, "Joannidis aPTT high 45");
eq(F.TARGETS.HEPARIN_REEVES_INFUSION_IU_KG_H, 10, "Reeves infusion 10");
eq(F.TARGETS.HEPARIN_REEVES_APTT_LOW_SEC, 70, "Reeves aPTT 70");
eq(F.TARGETS.HEPARIN_REEVES_APTT_HIGH_SEC, 80, "Reeves aPTT 80");
eq(F.TARGETS.HEPARIN_REEVES_BOLUS_MIN_U, 2000, "Reeves bolus min 2000 U");
eq(F.TARGETS.HEPARIN_REEVES_BOLUS_MAX_U, 5000, "Reeves bolus max 5000 U");

const hepB = F.heparinBolus({ weightKg: 80, bolusIuPerKg: 30, giveBolus: true });
eq(hepB.bolusUnits, 2400, "80 kg × 30 IU/kg = 2400 units");
eq(hepB.given, true, "bolus given flag");
const hepNone = F.heparinBolus({ weightKg: 80, bolusIuPerKg: 30, giveBolus: false });
eq(hepNone.bolusUnits, 0, "no-bolus option is 0 units");
eq(hepNone.given, false, "no-bolus given flag");

const hepI = F.heparinInfusion({ weightKg: 80, rateIuPerKgH: 7 });
eq(hepI.rateUnitsH, 560, "80 kg × 7 IU/kg/h = 560 units/h");
eq(hepI.rateMlH, null, "mL/h omitted when concentration not entered");

const hepMl = F.heparinInfusion({ weightKg: 80, rateIuPerKgH: 7, concentrationUnitsPerMl: 100 });
approx(hepMl.rateMlH, 5.6, 1e-9, "560 units/h ÷ 100 units/mL = 5.6 mL/h");

const hepAbs = F.heparinInfusion({ weightKg: 80, rateUnitsH: 560 });
approx(hepAbs.rateIuPerKgH, 7, 1e-9, "absolute 560 units/h is 7 IU/kg/h at 80 kg");

throws(() => F.heparinBolus({ weightKg: 0, bolusIuPerKg: 30, giveBolus: true }), "bolus requires positive weight");
throws(() => F.heparinInfusion({ weightKg: 80, rateIuPerKgH: -1 }), "negative infusion throws");
throws(() => F.heparinInfusion({ weightKg: 80, rateIuPerKgH: 7, concentrationUnitsPerMl: 0 }), "concentration must be positive");

/* ── Guard rails ─────────────────────────────────────────────────────────── */
section("Input guards");
throws(() => F.crrtEffluentDose({ weightKg: 80, qpreMlH: 1000 }), "predilution needs Qb and Hct");
throws(() => F.citrateCalciumRatio(2.5, "mmol/L", 0, "mmol/L"), "iCa must be positive");
throws(() => F.deliveredDose(25, 110), "downtime > 100 throws");

/* ── KDIGO numeric constants ─────────────────────────────────────────────── */
section("KDIGO 2012 numeric constants");
eq(F.TARGETS.KDIGO_DELIVERED_MIN, 20, "delivered min 20");
eq(F.TARGETS.KDIGO_DELIVERED_MAX, 25, "delivered max 25");
eq(F.TARGETS.KDIGO_PRESCRIBE_MIN, 25, "prescribe min 25");
eq(F.TARGETS.KDIGO_PRESCRIBE_MAX, 30, "prescribe max 30");
eq(F.TARGETS.DEFAULT_PRESCRIBE, 25, "default prescribed target 25");
eq(F.TARGETS.FF_CAUTION, 0.2, "FF caution 20% (practice-based)");
eq(F.TARGETS.FF_WARN, 0.25, "FF warning 25% (Murugan/Mehta 2016)");
isTrue(F.pdWeeklyKtv === undefined && F.watsonTbw === undefined, "no PD functions in the standalone app");
eq(F.TARGETS.CITRATE_DOSE_DEFAULT, 3, "default citrate target 3 mmol/L blood (NCT05399537)");
eq(F.TARGETS.PRISMOCITRATE18_MMOL_PER_L, 18, "Prismocitrate 18 concentration 18 mmol/L (IFU/SmPC)");
isTrue(F.TARGETS.EFFLUENT_TCA_RANGE_MIN === undefined && F.calciumReplacementStartRate === undefined, "calcium start-rate calculator and effluent-Ca defaults are removed");

/* ── Prismocitrate 18 rate and calcium start ─────────────────────────────── */
section("Prismocitrate 18 rate (Qb × 60 × target / 18)");
eq(F.prismocitrate18Rate({ qbMlMin: 150 }).rateMlH, 1500, "Qb 150, default target 3 → 1,500 mL/h");
eq(F.prismocitrate18Rate({ qbMlMin: 200 }).rateMlH, 2000, "Qb 200 → 2,000 mL/h");
eq(F.prismocitrate18Rate({ qbMlMin: 130, targetMmolPerLBlood: 3 }).rateMlH, 1300, "Qb 130 → 1,300 mL/h");
eq(F.prismocitrate18Rate({ qbMlMin: 150, targetMmolPerLBlood: 4 }).rateMlH, 2000, "editable target 4 mmol/L");
eq(F.prismocitrate18Rate({ qbMlMin: 150 }).citrateMmolPerL, 18, "uses labelled 18 mmol/L");
eq(F.prismocitrate18Rate({ qbMlMin: 150 }).targetMmolPerLBlood, 3, "default target is 3");
throws(() => F.prismocitrate18Rate({ qbMlMin: 0 }), "Qb 0 throws");
throws(() => F.prismocitrate18Rate({ qbMlMin: 150, targetMmolPerLBlood: 0 }), "target 0 throws");

section("Apply Prismocitrate 18 — count toward dose and cut other rates (80 kg, 25 mL/kg/h, Qb 150 → 1,500 mL/h)");
const remaining2000 = 2000; // 25 * 80, net UF 0
const postRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvh-post",
  remainingMlH: remaining2000,
  qnetMlH: 0,
});
eq(postRec.qpreMlH, 0, "CVVH post: no additional pre-filter replacement");
eq(postRec.qpostMlH, 500, "CVVH post: post-filter reduced to 500 mL/h");
eq(postRec.qdMlH, 0, "CVVH post: no dialysate");
eq(postRec.qeffMlH, 2000, "CVVH post: citrate 1,500 + post 500 = 2,000 mL/h");
isTrue(postRec.citrateCountedTowardDose, "CVVH post: citrate is counted toward the dose");
isTrue(!postRec.citrateExceedsTarget, "CVVH post: citrate does not exceed the target");

const dosePost = F.crrtEffluentDose({
  weightKg: 80,
  qpreMlH: 1500,
  qpostMlH: postRec.qpostMlH,
  qdMlH: 0,
  qnetMlH: 0,
  qbMlMin: 150,
  hct: 0.30,
});
eq(dosePost.prescribedMlKgH, 25, "CVVH post: prescribed dose stays 25 mL/kg/h");
eq(dosePost.qeffMlH, 2000, "CVVH post: effluent used for the dose is 2,000 mL/h");

const preRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvh-pre",
  remainingMlH: remaining2000,
  qnetMlH: 0,
});
eq(preRec.qpreMlH, 500, "CVVH pre: remainder is additional pre-filter replacement");
eq(preRec.qpostMlH, 0, "CVVH pre: no post-filter");
eq(preRec.qeffMlH, 2000, "CVVH pre: citrate 1,500 + pre 500 = 2,000 mL/h");

const mixRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvh-mixed",
  remainingMlH: remaining2000,
  qnetMlH: 0,
  preFraction: 0.5,
});
eq(mixRec.qpreMlH, 250, "CVVH mixed: leftover 500 split 50/50 → additional pre 250");
eq(mixRec.qpostMlH, 250, "CVVH mixed: leftover 500 split 50/50 → post 250");
eq(mixRec.qeffMlH, 2000, "CVVH mixed: total effluent stays 2,000 mL/h");

const hdfPost = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvhdf",
  remainingMlH: remaining2000,
  qnetMlH: 0,
  preFraction: 0,
  dialysateFraction: 0.5,
});
eq(hdfPost.qpreMlH, 0, "CVVHDF post: replacement side exhausted");
eq(hdfPost.qpostMlH, 0, "CVVHDF post: no leftover post-filter");
eq(hdfPost.qdMlH, 500, "CVVHDF: dialysate reduced after replacement hits 0");
eq(hdfPost.qeffMlH, 2000, "CVVHDF: citrate 1,500 + dialysate 500 = 2,000 mL/h");

const hdfMixSmall = F.applyPrismocitratePreFilter({
  citrateRateMlH: 800,
  modality: "cvvhdf",
  remainingMlH: remaining2000,
  qnetMlH: 0,
  preFraction: 0.5,
  dialysateFraction: 0.5,
});
eq(hdfMixSmall.qdMlH, 1000, "CVVHDF mixed, citrate 800: dialysate unchanged at 1,000");
eq(hdfMixSmall.qpreMlH, 100, "CVVHDF mixed, citrate 800: leftover replacement 200 split pre 100");
eq(hdfMixSmall.qpostMlH, 100, "CVVHDF mixed, citrate 800: leftover replacement split post 100");
eq(hdfMixSmall.qeffMlH, 2000, "CVVHDF mixed, citrate 800: total stays 2,000 mL/h");

const hdRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvhd",
  remainingMlH: remaining2000,
  qnetMlH: 0,
});
eq(hdRec.qdMlH, 500, "CVVHD: dialysate reduced by citrate");
eq(hdRec.qpreMlH, 0, "CVVHD: no additional pre-filter replacement");
eq(hdRec.qeffMlH, 2000, "CVVHD: citrate 1,500 + dialysate 500 = 2,000 mL/h");

const netRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "cvvh-post",
  remainingMlH: 1800, // 2000 - 200 net UF
  qnetMlH: 200,
});
eq(netRec.qpostMlH, 300, "net UF 200: post-filter is remaining 1,800 − citrate 1,500");
eq(netRec.qeffMlH, 2000, "net UF is included in the 2,000 mL/h target effluent");

const scufRec = F.applyPrismocitratePreFilter({
  citrateRateMlH: 1500,
  modality: "scuf",
  qnetMlH: 100,
});
eq(scufRec.qeffMlH, 1600, "SCUF + citrate: effluent is citrate rate + net UF");
eq(scufRec.qpostMlH, 0, "SCUF: nothing to reduce");
isTrue(!scufRec.citrateCountedTowardDose, "SCUF has no dose target, so citrate is not cut to one");
isTrue(!scufRec.citrateExceedsTarget, "SCUF does not flag an over-target dose");

section("Citrate alone exceeds the target dose");
const over = F.applyPrismocitratePreFilter({
  citrateRateMlH: 2500, // Qb 250 at target 3
  modality: "cvvh-post",
  remainingMlH: remaining2000,
  qnetMlH: 0,
});
eq(over.qpostMlH, 0, "over-target: post-filter set to 0");
eq(over.qpreMlH, 0, "over-target: no additional pre-filter");
eq(over.qdMlH, 0, "over-target: no dialysate");
eq(over.qeffMlH, 2500, "over-target: effluent is citrate alone");
isTrue(over.citrateExceedsTarget, "over-target flag is set");
eq(over.qeffMlH / 80, 31.25, "over-target prescribed dose is 31.25 mL/kg/h");

const overHdf = F.applyPrismocitratePreFilter({
  citrateRateMlH: 2500,
  modality: "cvvhdf",
  remainingMlH: remaining2000,
  qnetMlH: 0,
  preFraction: 0,
  dialysateFraction: 0.5,
});
eq(overHdf.qdMlH, 0, "over-target CVVHDF: dialysate also set to 0");
isTrue(overHdf.citrateExceedsTarget, "over-target CVVHDF flag");

section("Filtration fraction counts all pre/post fluids after the citrate cut");
const ffPost = F.filtrationFraction({
  qbMlMin: 150,
  hct: 0.30,
  qpreMlH: 1500,
  qpostMlH: 500,
  qnetMlH: 0,
  modality: "cvvh",
});
eq(ffPost.qufMlH, 2000, "CVVH post + citrate: UF is citrate + post");
isTrue(Math.abs(ffPost.ffUsedPct - (2000 / (150 * 60 * 0.7 + 1500)) * 100) < 1e-9, "FF uses pre-style denominator Qp + citrate");

const ffPre = F.filtrationFraction({
  qbMlMin: 150,
  hct: 0.30,
  qpreMlH: 2000, // citrate 1500 + extra 500
  qpostMlH: 0,
  qnetMlH: 0,
  modality: "cvvh",
});
eq(ffPre.qufMlH, 2000, "CVVH pre + citrate: UF is all pre-filter fluid");
isTrue(Math.abs(ffPre.ffUsedPct - (2000 / (150 * 60 * 0.7 + 2000)) * 100) < 1e-9, "FF denominator includes citrate + extra pre");

section("Heparin path is unaffected by the citrate dose cut");
const hepSuggest = F.suggestCrrtPrescription({
  weightKg: 80,
  targetMlKgH: 25,
  qnetMlH: 0,
  modality: "cvvh-post",
});
eq(hepSuggest.qpostMlH, 2000, "without citrate, CVVH post remains 2,000 mL/h");
eq(hepSuggest.qpreMlH, 0, "without citrate, no pre-filter replacement");
eq(hepSuggest.qeffMlH, 2000, "without citrate, effluent is the 25 mL/kg/h target");
const hepB2 = F.heparinBolus({ weightKg: 80, bolusIuPerKg: 30, giveBolus: true });
eq(hepB2.bolusUnits, 2400, "heparin bolus 30 IU/kg × 80 kg is unchanged");
const hepI2 = F.heparinInfusion({ weightKg: 80, rateIuPerKgH: 7 });
eq(hepI2.rateUnitsH, 560, "heparin infusion 7 IU/kg/h × 80 kg is unchanged");

/* ── summary ────────────────────────────────────────────────────────────── */
console.log("\n────────────────────────────────────────");
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failed) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All tests passed.");
