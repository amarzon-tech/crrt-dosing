/**
 * CRRT Dosing — pure formula implementations.
 * Every coefficient and target is taken from a cited primary source
 * (see CONTENT_REVIEW.md). No network, no storage. Inputs are not persisted.
 *
 * Works in the browser (global CrrtFormulas) and in Node (module.exports).
 *
 * CRRT math is carried over unchanged from the CRRT tab of the earlier
 * CRRT & PD Dosing draft; this file is standalone (no PD).
 */
(function (global) {
  "use strict";

  const CONV = {
    CA_MGDL_PER_MMOL: 4, // conventional: 1 mmol/L = 4 mg/dL (atomic mass 40.08)
  };

  /** Historical / guideline numeric references (cited; not rigid sole targets). */
  const TARGETS = {
    // KDIGO AKI 2012, recommendation 5.8.4 (Kidney Int Suppl. 2012;2:1-138):
    // deliver 20–25 mL/kg/h. Rationale: "in order to achieve a delivered dose
    // of 20–25 ml/kg/h, it is generally necessary to prescribe in the range of
    // 25–30 ml/kg/h, and to minimize interruptions in CRRT."
    KDIGO_DELIVERED_MIN: 20,
    KDIGO_DELIVERED_MAX: 25,
    KDIGO_PRESCRIBE_MIN: 25,
    KDIGO_PRESCRIBE_MAX: 30,
    DEFAULT_PRESCRIBE: 25,
    // Filtration-fraction caution: practice-based, not a KDIGO numeric target.
    // Mehta / Murugan Blood Purif 2016: FF > 0.25 associated with clotting risk.
    // Neri et al. Crit Care 2016: FF "ideally below 30%", concentration ratio 20–25%.
    FF_CAUTION: 0.2,
    FF_WARN: 0.25,
    // Total / ionized calcium ratio during regional citrate anticoagulation.
    // 2.5: Schneider AG, Journois D, Rimmele T. Crit Care. 2017;21:281
    //   (doi:10.1186/s13054-017-1880-1): "A cut-off value of 2.5 is usually
    //   recognized as indicative of significant accumulation but a trend
    //   towards this value is highly indicative of ongoing accumulation."
    // 2.25: Oudemans-van Straaten HM, Ostermann M. Crit Care. 2012;16:249
    //   (doi:10.1186/cc11645): "A rise in total to ionized calcium ratio
    //   >2.25 should trigger the clinician to consider citrate accumulation."
    // Shown in text only (not used for flags): 2.4 (Link et al. Crit Care
    //   2012;16:R97, mortality predictor) and 2.1 (KDIGO 2012 §5.3 rationale,
    //   "optimal cutoff", citing Bakker et al. Clin Chem Lab Med 2006).
    CITRATE_RATIO_CUTOFF: 2.5,
    CITRATE_RATIO_CONSIDER: 2.25,
    // Unfractionated heparin for CRRT. KDIGO AKI 2012 §5.3 does not recommend
    // a single numeric dose ("large variability"; "no firm recommendations").
    // Starting values below are the regimen used in the second of the two
    // RCTs KDIGO describes (Joannidis et al., Intensive Care Med. 2007;
    // 33:1571-1579, KDIGO ref. 616): bolus 30 U/kg then 7 U/kg/h, titrated
    // to aPTT 40–45 s. Joannidis & Oudemans-van Straaten, Crit Care. 2007;
    // 11:218, call 30 IU/kg then 5–10 IU/kg/h "a possible scheme" in patients
    // with normal coagulation, to be individualized.
    // The other KDIGO-cited RCT (Reeves et al., Crit Care Med. 1999;27:2224-2228,
    // ref. 620) used bolus 2000–5000 U then 10 U/kg/h, titrated to aPTT 70–80 s.
    // Those alternatives are shown in the UI; they are not the starting defaults.
    HEPARIN_BOLUS_IU_KG: 30,
    HEPARIN_INFUSION_IU_KG_H: 7,
    HEPARIN_INFUSION_RANGE_MIN: 5,
    HEPARIN_INFUSION_RANGE_MAX: 10,
    HEPARIN_APTT_LOW_SEC: 40,
    HEPARIN_APTT_HIGH_SEC: 45,
    HEPARIN_REEVES_BOLUS_MIN_U: 2000,
    HEPARIN_REEVES_BOLUS_MAX_U: 5000,
    HEPARIN_REEVES_INFUSION_IU_KG_H: 10,
    HEPARIN_REEVES_APTT_LOW_SEC: 70,
    HEPARIN_REEVES_APTT_HIGH_SEC: 80,
  };

  function isNum(x) {
    return typeof x === "number" && Number.isFinite(x);
  }

  function req(name, x) {
    if (!isNum(x)) throw new Error("Missing or invalid number: " + name);
    return x;
  }

  function convertCaToMmol(value, unit) {
    req("calcium", value);
    if (unit === "mg/dL" || unit === "mgdl") return value / CONV.CA_MGDL_PER_MMOL;
    return value;
  }

  function normalizeHct(hct) {
    req("Hct", hct);
    if (hct < 0 || hct >= 1) {
      if (hct >= 1 && hct < 100) return hct / 100;
      throw new Error("Hematocrit must be a fraction (0–1) or a percent (1–99)");
    }
    return hct;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * CRRT dose, predilution, filtration fraction
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Plasma flow (mL/h) from blood flow and hematocrit.
   * Qp = Qb_mL/min × 60 × (1 − Hct)
   * We do not apply a further 0.93 plasma-water factor (judgment; stated).
   * Neri M et al. Crit Care. 2016;20:318. doi:10.1186/s13054-016-1489-9
   */
  function plasmaFlowMlH(qbMlMin, hct) {
    req("Qb", qbMlMin);
    hct = normalizeHct(hct);
    return qbMlMin * 60 * (1 - hct);
  }

  /**
   * Predilution dilution factor.
   * DF = Qp / (Qp + Qpre)
   * Effective effluent for urea (sieving coefficient ≈ 1) ≈ Qeff × DF.
   * Macedo E, Mehta RL. Continuous dialysis therapies: Core Curriculum 2016.
   *   Am J Kidney Dis. 2016;68:645-661. doi:10.1053/j.ajkd.2016.03.427
   * Also discussed in KDIGO AKI 2012 (predilution reduces actual dose vs effluent).
   */
  function predilutionFactor(qpMlH, qpreMlH) {
    req("Qp", qpMlH);
    const qpre = isNum(qpreMlH) ? qpreMlH : 0;
    if (qpMlH + qpre <= 0) throw new Error("Plasma + predilution flow must be positive");
    return qpMlH / (qpMlH + qpre);
  }

  /**
   * Prescribed and predilution-corrected effluent dose (mL/kg/h).
   * Qeff = Qd + Qr_pre + Qr_post + Qnet   (all mL/h)
   * Dose_prescribed = Qeff / weight
   * Dose_corrected  = (Qeff × DF) / weight    (DF = 1 if Qpre = 0)
   *
   * KDIGO AKI 2012, recommendation 5.8.4 (not 5.8.3, which is intermittent Kt/V):
   *   "We recommend delivering an effluent volume of 20–25 ml/kg/h for CRRT
   *    in AKI (1A). This will usually require a higher prescription of effluent
   *    volume." Evidence: ATN (Palevsky et al., NEJM 2008;359:7-20) and
   *    RENAL (Bellomo et al., NEJM 2009;361:1627-1638).
   */
  function crrtEffluentDose(opts) {
    const wt = req("weight", opts.weightKg);
    if (wt <= 0) throw new Error("Weight must be positive");
    const qd = opts.qdMlH || 0;
    const qpre = opts.qpreMlH || 0;
    const qpost = opts.qpostMlH || 0;
    const qnet = opts.qnetMlH || 0;
    const qeff = qd + qpre + qpost + qnet;
    let df = 1;
    let qp = null;
    if (qpre > 0) {
      const qb = req("Qb (required for predilution correction)", opts.qbMlMin);
      const hct = req("Hct (required for predilution correction)", opts.hct);
      qp = plasmaFlowMlH(qb, hct);
      df = predilutionFactor(qp, qpre);
    }
    return {
      qeffMlH: qeff,
      df,
      qpMlH: qp,
      prescribedMlKgH: qeff / wt,
      correctedMlKgH: (qeff * df) / wt,
    };
  }

  /**
   * Filtration fraction.
   * Quf (convective ultrafiltration) = Qpre + Qpost + Qnet
   *   For pure CVVHD, Quf = Qnet only (dialysate is not ultrafiltrate).
   * Post-style FF = Quf / Qp
   * Pre-dilution FF = Quf / (Qp + Qpre)
   *
   * Equations: Neri M et al. Crit Care. 2016;20:318.
   *   doi:10.1186/s13054-016-1489-9
   * Caution 20–25% is practice-based (Murugan / Mehta, Blood Purif. 2016;
   *   doi:10.1159/000448528 — FF > 0.25 associated with clotting risk),
   *   not a KDIGO numeric target. Neri distinguishes FF (ideally < 30%)
   *   from concentration ratio (keep < 20–25%). Stated as a judgment.
   */
  function filtrationFraction(opts) {
    const qb = req("Qb", opts.qbMlMin);
    const hct = req("Hct", opts.hct);
    const qp = plasmaFlowMlH(qb, hct);
    const qpre = opts.qpreMlH || 0;
    const qpost = opts.qpostMlH || 0;
    const qnet = opts.qnetMlH || 0;
    const modality = opts.modality || "cvvh";
    const quf = modality === "cvvhd" ? qnet : qpre + qpost + qnet;
    const ffPost = qp > 0 ? quf / qp : Infinity;
    const ffPre = qp + qpre > 0 ? quf / (qp + qpre) : Infinity;
    // The clinically used FF for warning is the pre-style when predilution
    // is present (replacement is added to the denominator); otherwise post-style.
    const ffUsed = qpre > 0 ? ffPre : ffPost;
    return {
      qpMlH: qp,
      qufMlH: quf,
      ffPost,
      ffPre,
      ffUsed,
      ffPostPct: ffPost * 100,
      ffPrePct: ffPre * 100,
      ffUsedPct: ffUsed * 100,
    };
  }

  /**
   * Minimum blood flow (mL/min) to keep the used FF at or below a threshold.
   * Derived from the FF equations above, not a separate published coefficient.
   *   FF = Quf / (Qp + Qpre)   [or Quf / Qp if Qpre = 0]
   *   Qp = Qb × 60 × (1 − Hct)
   *   Qb = (Quf / FF − Qpre) / (60 × (1 − Hct))
   * For CVVHD, Quf is net UF only.
   */
  function minQbForFf(opts, ffThreshold) {
    const ff = isNum(ffThreshold) ? ffThreshold : TARGETS.FF_WARN;
    if (ff <= 0 || ff >= 1) throw new Error("FF threshold must be between 0 and 1");
    const hct = normalizeHct(req("Hct", opts.hct));
    const qpre = opts.qpreMlH || 0;
    const qpost = opts.qpostMlH || 0;
    const qnet = opts.qnetMlH || 0;
    const modality = opts.modality || "cvvh";
    const quf = modality === "cvvhd" ? qnet : qpre + qpost + qnet;
    const denom = 60 * (1 - hct);
    if (denom <= 0) throw new Error("Hematocrit too high for plasma-flow calculation");
    const qb = (quf / ff - qpre) / denom;
    return { qbMlMin: qb, qufMlH: quf, ffThreshold: ff };
  }

  /**
   * Suggested effluent / replacement / dialysate rates from a target dose.
   * Qeff = target_mL/kg/h × weight_kg
   * Qnet is taken from the fluid-balance planner (or entered).
   * Remaining effluent (Qeff − Qnet) is split by modality:
   *   CVVH post:  all remaining → Qpost
   *   CVVH pre:   all remaining → Qpre
   *   CVVH mixed: remaining × preFraction → Qpre, rest → Qpost
   *   CVVHD:      all remaining → Qd
   *   CVVHDF:     remaining × dialysateFraction → Qd; the rest is replacement,
   *               then split by preFraction.
   * preFraction and dialysateFraction are starting splits for the clinician
   * to adjust — they are NOT guideline targets.
   */
  function suggestCrrtPrescription(opts) {
    const wt = req("weight", opts.weightKg);
    const target = req("target dose", opts.targetMlKgH);
    if (wt <= 0 || target <= 0) throw new Error("Weight and target dose must be positive");
    const qnet = isNum(opts.qnetMlH) ? opts.qnetMlH : 0;
    const qeff = target * wt;
    const remaining = qeff - qnet;
    const modality = opts.modality || "cvvh-post";
    const preFrac = isNum(opts.preFraction) ? opts.preFraction : 0.5;
    const dFrac = isNum(opts.dialysateFraction) ? opts.dialysateFraction : 0.5;
    if (preFrac < 0 || preFrac > 1) throw new Error("preFraction must be 0–1");
    if (dFrac < 0 || dFrac > 1) throw new Error("dialysateFraction must be 0–1");

    let qd = 0;
    let qpre = 0;
    let qpost = 0;
    let netExceeds = remaining < 0;

    if (!netExceeds) {
      switch (modality) {
        case "cvvh-pre":
          qpre = remaining;
          break;
        case "cvvh-post":
          qpost = remaining;
          break;
        case "cvvh-mixed":
          qpre = remaining * preFrac;
          qpost = remaining * (1 - preFrac);
          break;
        case "cvvhd":
          qd = remaining;
          break;
        case "cvvhdf": {
          qd = remaining * dFrac;
          const qrep = remaining * (1 - dFrac);
          qpre = qrep * preFrac;
          qpost = qrep * (1 - preFrac);
          break;
        }
        default:
          throw new Error("Unknown modality: " + modality);
      }
    }

    return {
      modality,
      qeffMlH: qeff,
      qdMlH: qd,
      qpreMlH: qpre,
      qpostMlH: qpost,
      qnetMlH: qnet,
      remainingMlH: remaining,
      netExceedsTarget: netExceeds,
      preFraction: preFrac,
      dialysateFraction: dFrac,
    };
  }

  /**
   * Delivered dose accounting for downtime.
   * delivered = (predilution-corrected prescribed dose) × (1 − downtime_fraction)
   *
   * This is a time-weighted effluent, the usual clinical approximation.
   * KDIGO 5.8.1 recommends frequent assessment of the actual delivered dose;
   * the rationale notes that interruptions reduce delivery, and that filter
   * efficiency also declines (we do not invent a filter-efficiency coefficient).
   */
  function deliveredDose(correctedMlKgH, downtimePct) {
    const dose = req("corrected dose", correctedMlKgH);
    const dt = isNum(downtimePct) ? downtimePct : 0;
    if (dt < 0 || dt > 100) throw new Error("Downtime must be 0–100%");
    const uptime = 1 - dt / 100;
    return { uptime, downtimePct: dt, deliveredMlKgH: dose * uptime };
  }

  /**
   * Classify a dose against KDIGO 2012 delivered and prescribed ranges.
   * Status is informational, not a treatment recommendation.
   */
  function kdigoDoseStatus(deliveredMlKgH, prescribedMlKgH) {
    const d = isNum(deliveredMlKgH) ? deliveredMlKgH : null;
    const p = isNum(prescribedMlKgH) ? prescribedMlKgH : null;
    let deliveredStatus = null;
    if (d !== null) {
      if (d < TARGETS.KDIGO_DELIVERED_MIN) deliveredStatus = "below";
      else if (d <= TARGETS.KDIGO_DELIVERED_MAX) deliveredStatus = "in-range";
      else deliveredStatus = "above";
    }
    let prescribedStatus = null;
    if (p !== null) {
      if (p < TARGETS.KDIGO_PRESCRIBE_MIN) prescribedStatus = "below-usual-prescription";
      else if (p <= TARGETS.KDIGO_PRESCRIBE_MAX) prescribedStatus = "usual-prescription";
      else prescribedStatus = "above-usual-prescription";
    }
    return { deliveredStatus, prescribedStatus };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Citrate anticoagulation helpers
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Total / ionized calcium ratio for citrate accumulation on RCA.
   * Both concentrations converted to mmol/L (mg/dL ÷ 4).
   *   ratio >= 2.5        -> "accumulation"  (Schneider 2017: usual cut-off)
   *   2.25 < ratio < 2.5  -> "consider"      (Oudemans-van Straaten 2012:
   *                                           >2.25 should trigger considering it)
   *   otherwise           -> "below"
   * Screening marker only; a rising trend matters (Schneider 2017).
   */
  function citrateCalciumRatio(totalCa, totalUnit, ica, icaUnit) {
    const totalMmol = convertCaToMmol(totalCa, totalUnit || "mmol/L");
    const icaMmol = convertCaToMmol(ica, icaUnit || "mmol/L");
    if (icaMmol <= 0) throw new Error("Ionized calcium must be positive");
    if (totalMmol <= 0) throw new Error("Total calcium must be positive");
    const ratio = totalMmol / icaMmol;
    // Compare on 3 decimals so float artefacts (e.g. 2.2500000001) don't flip status.
    const r3 = Math.round(ratio * 1000) / 1000;
    let status = "below";
    if (r3 >= TARGETS.CITRATE_RATIO_CUTOFF) status = "accumulation";
    else if (r3 > TARGETS.CITRATE_RATIO_CONSIDER) status = "consider";
    return { ratio, totalMmol, icaMmol, status };
  }



  /**
   * Unfractionated heparin bolus in units from weight and a units/kg dose.
   * Arithmetic only. Starting 30 IU/kg is the Joannidis 2007 ICM / KDIGO
   * §5.3-described regimen, not a KDIGO numeric recommendation.
   * Pass giveBolus=false for a no-bolus prescription (bolusUnits = 0).
   */
  function heparinBolus(opts) {
    const give = opts && opts.giveBolus !== false && opts.giveBolus !== 0;
    if (!give) {
      return { given: false, bolusIuPerKg: 0, bolusUnits: 0, weightKg: opts && opts.weightKg };
    }
    const w = req("weight", opts.weightKg);
    const iuKg = req("bolus IU/kg", opts.bolusIuPerKg);
    if (w <= 0) throw new Error("weight must be positive");
    if (iuKg < 0) throw new Error("bolus IU/kg cannot be negative");
    return {
      given: true,
      weightKg: w,
      bolusIuPerKg: iuKg,
      bolusUnits: w * iuKg,
    };
  }

  /**
   * Pre-filter unfractionated heparin infusion.
   * Supply either rateIuPerKgH (with weight) or an absolute rateUnitsH.
   * If concentrationUnitsPerMl is provided, also return rateMlH.
   * Concentration has no cited default and may be omitted.
   */
  function heparinInfusion(opts) {
    opts = opts || {};
    let rateUnitsH = null;
    let rateIuPerKgH = null;
    const w = isNum(opts.weightKg) ? opts.weightKg : null;
    if (isNum(opts.rateUnitsH)) {
      if (opts.rateUnitsH < 0) throw new Error("infusion rate cannot be negative");
      rateUnitsH = opts.rateUnitsH;
      if (w && w > 0) rateIuPerKgH = rateUnitsH / w;
    } else {
      const iuKgH = req("infusion IU/kg/h", opts.rateIuPerKgH);
      const wt = req("weight", opts.weightKg);
      if (wt <= 0) throw new Error("weight must be positive");
      if (iuKgH < 0) throw new Error("infusion IU/kg/h cannot be negative");
      rateIuPerKgH = iuKgH;
      rateUnitsH = wt * iuKgH;
    }
    let rateMlH = null;
    const conc = opts.concentrationUnitsPerMl;
    if (isNum(conc)) {
      if (conc <= 0) throw new Error("heparin concentration must be positive");
      rateMlH = rateUnitsH / conc;
    }
    return {
      weightKg: w,
      rateIuPerKgH,
      rateUnitsH,
      concentrationUnitsPerMl: isNum(conc) ? conc : null,
      rateMlH,
    };
  }

  /* ── bundle ────────────────────────────────────────────────────────────── */

  const api = {
    CONV,
    TARGETS,
    isNum,
    convertCaToMmol,
    normalizeHct,
    plasmaFlowMlH,
    predilutionFactor,
    crrtEffluentDose,
    filtrationFraction,
    minQbForFf,
    suggestCrrtPrescription,
    deliveredDose,
    kdigoDoseStatus,
    citrateCalciumRatio,
    heparinBolus,
    heparinInfusion,
  };

  global.CrrtFormulas = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
