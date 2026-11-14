/**
 * Plain-text prescription formatter for CRRT Dosing.
 * Formats values already calculated by formulas.js. No medical math here.
 * Inputs are never stored.
 */
(function (global) {
  "use strict";

  const FOOTER = "Draft – verify before use; clinical judgment required";
  const BLANK = "________________";
  const PUBLISHER = "Wellness Tech LLC";
  const APP = "CRRT Dosing (draft)";

  function isNum(x) {
    return typeof x === "number" && Number.isFinite(x);
  }

  function formatLongDate(d) {
    if (typeof d === "string" && d.trim()) return d.trim();
    const dt = d instanceof Date ? d : new Date();
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function fmt(n, digits) {
    if (!isNum(n)) return null;
    const d = digits == null ? (Number.isInteger(n) ? 0 : 1) : digits;
    return n.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function qty(n, unit, digits) {
    const s = fmt(n, digits);
    return s == null ? BLANK : s + (unit ? " " + unit : "");
  }

  function modalityOrderLabel(mod) {
    switch (mod) {
      case "cvvh-pre":
        return "CVVH (pre-filter replacement)";
      case "cvvh-post":
        return "CVVH (post-filter replacement)";
      case "cvvh-mixed":
        return "CVVH (mixed pre- and post-filter replacement)";
      case "cvvhd":
        return "CVVHD";
      case "cvvhdf":
        return "CVVHDF";
      default:
        return "";
    }
  }

  function headerLines(title, dateStr) {
    return [
      title,
      PUBLISHER + " — " + APP,
      "",
      "Date: " + dateStr,
      "Patient: " + BLANK + "          MRN: " + BLANK,
      "",
    ];
  }

  function signatureLines() {
    return [
      "",
      "Prescriber: " + BLANK + "     Date/time: " + BLANK,
      "",
      FOOTER,
    ];
  }

  function anticoagulationLines(opts) {
    const kind = (opts.anticoagulation || "").toLowerCase();
    const lines = [];
    if (kind === "citrate") {
      // No citrate doses or fluid composition are calculated in this app.
      // Settings come from the institution's RCA protocol.
      lines.push("Anticoagulation: Regional citrate — per institutional protocol");
    } else if (kind === "heparin") {
      lines.push("Anticoagulation: Unfractionated heparin (pre-filter)");
      if (opts.heparinBolusGiven === false) {
        lines.push("  Bolus: none");
      } else if (isNum(opts.heparinBolusUnits)) {
        let b = "  Bolus: " + qty(opts.heparinBolusUnits, "units", 0);
        if (isNum(opts.heparinBolusIuPerKg) && isNum(opts.weightKg)) {
          b += "  (" + fmt(opts.heparinBolusIuPerKg, 0) + " IU/kg)";
        }
        lines.push(b);
      } else {
        lines.push("  Bolus: " + BLANK);
      }
      if (isNum(opts.heparinInfusionUnitsH)) {
        let inf = "  Infusion: " + qty(opts.heparinInfusionUnitsH, "units/h", 0);
        if (isNum(opts.heparinInfusionIuPerKgH)) {
          inf += "  (" + fmt(opts.heparinInfusionIuPerKgH, 1) + " IU/kg/h)";
        }
        if (isNum(opts.heparinInfusionMlH)) {
          inf += "  (" + fmt(opts.heparinInfusionMlH, 1) + " mL/h)";
        }
        lines.push(inf);
      } else {
        lines.push("  Infusion: " + BLANK);
      }
      if (opts.heparinApttTarget && String(opts.heparinApttTarget).trim()) {
        lines.push("  Target aPTT: " + String(opts.heparinApttTarget).trim());
      }
      if (opts.heparinAntiXa && String(opts.heparinAntiXa).trim()) {
        lines.push("  Anti-Xa: " + String(opts.heparinAntiXa).trim());
      }
      if (opts.heparinMonitoring && String(opts.heparinMonitoring).trim()) {
        lines.push("  Monitoring: " + String(opts.heparinMonitoring).trim());
      }
    } else if (kind === "none") {
      lines.push("Anticoagulation: None");
    } else {
      // Not entered — leave a write-in line. Do not assume citrate.
      lines.push("Anticoagulation: " + BLANK);
    }
    return lines;
  }

  /**
   * Build a CRRT order-sheet as plain text from already-calculated values.
   * Missing numeric inputs become blank write-in lines. No defaults invented.
 * No electrolyte or bath composition (K, Ca, bicarbonate) is included;
 * fluid composition is the prescriber's choice and is not recommended here.
   *
   * @param {object} opts
   * @returns {{ title: string, date: string, text: string, footer: string }}
   */
  function formatCrrtPrescription(opts) {
    opts = opts || {};
    const dateStr = formatLongDate(opts.date);
    const lines = headerLines("CRRT PRESCRIPTION", dateStr);

    lines.push("Weight: " + qty(opts.weightKg, "kg", Number.isInteger(opts.weightKg) ? 0 : 1));
    const mod = modalityOrderLabel(opts.modality);
    lines.push("Modality: " + (mod || BLANK));
    lines.push("");

    let targetLine = "Target effluent dose: ";
    if (isNum(opts.targetMlKgH)) {
      targetLine += fmt(opts.targetMlKgH, 1) + " mL/kg/h";
      const mlH = isNum(opts.targetMlH)
        ? opts.targetMlH
        : isNum(opts.weightKg)
          ? opts.targetMlKgH * opts.weightKg
          : null;
      if (isNum(mlH)) targetLine += "  (" + fmt(mlH, 0) + " mL/h)";
    } else {
      targetLine += BLANK;
    }
    lines.push(targetLine);
    lines.push("Blood flow (Qb): " + qty(opts.qbMlMin, "mL/min", 0));
    lines.push("");

    const qpre = opts.qpreMlH;
    const qpost = opts.qpostMlH;
    const totalRep =
      isNum(qpre) && isNum(qpost) ? qpre + qpost : isNum(qpre) ? qpre : isNum(qpost) ? qpost : null;
    lines.push("Replacement: " + qty(totalRep, "mL/h", 0));
    lines.push("  Pre-filter:  " + qty(isNum(qpre) ? qpre : null, "mL/h", 0));
    lines.push("  Post-filter: " + qty(isNum(qpost) ? qpost : null, "mL/h", 0));
    lines.push("Dialysate: " + qty(opts.qdMlH, "mL/h", 0));
    lines.push("Net UF: " + qty(opts.qnetMlH, "mL/h", 0));
    lines.push("");

    const delivered = isNum(opts.deliveredMlKgH)
      ? opts.deliveredMlKgH
      : opts.downtimeAdjustedMlKgH;
    lines.push("Prescribed dose: " + qty(opts.prescribedMlKgH, "mL/kg/h", 1));
    lines.push("Delivered dose: " + qty(delivered, "mL/kg/h", 1));
    lines.push("");

    anticoagulationLines(opts).forEach((l) => lines.push(l));
    lines.push("");

    signatureLines().forEach((l) => lines.push(l));

    return {
      title: "CRRT PRESCRIPTION",
      date: dateStr,
      text: lines.join("\n"),
      footer: FOOTER,
    };
  }

  const api = {
    FOOTER,
    BLANK,
    formatLongDate,
    formatCrrtPrescription,
    modalityOrderLabel,
  };

  global.CrrtPrescription = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
