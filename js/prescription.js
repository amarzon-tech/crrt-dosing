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

  function usedRate(n) {
    return isNum(n) && n > 0;
  }

  function anticoagulationLines(opts) {
    const kind = (opts.anticoagulation || "").toLowerCase();
    const lines = [];
    if (kind === "citrate") {
      // No citrate rates are calculated. Machine setting is protocol-driven only.
      lines.push("Anticoagulation: Citrate per unit protocol");
    } else if (kind === "heparin") {
      lines.push("Anticoagulation: Heparin");
      if (opts.heparinBolusGiven === false) {
        lines.push("Bolus: none");
      } else if (isNum(opts.heparinBolusUnits)) {
        lines.push("Bolus: " + qty(opts.heparinBolusUnits, "units", 0));
      } else {
        lines.push("Bolus: " + BLANK);
      }
      if (isNum(opts.heparinInfusionUnitsH)) {
        lines.push("Infusion: " + qty(opts.heparinInfusionUnitsH, "units/h", 0));
        if (isNum(opts.heparinInfusionMlH)) {
          lines.push("Infusion pump: " + qty(opts.heparinInfusionMlH, "mL/h", 1));
        }
      } else {
        lines.push("Infusion: " + BLANK);
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
   * Machine-setting prescription: only values entered into the CRRT machine.
   * Unused or zero dialysate / replacement lines are omitted. No bath
   * composition, doses, weight, or notes. Fluid composition is the
   * prescriber's choice and is not recommended here.
   *
   * @param {object} opts
   * @returns {{ title: string, date: string, text: string, footer: string }}
   */
  function formatCrrtPrescription(opts) {
    opts = opts || {};
    const dateStr = formatLongDate(opts.date);
    const lines = [ "CRRT PRESCRIPTION", "Draft", "" ];

    const mod = modalityOrderLabel(opts.modality);
    if (mod) lines.push("Modality: " + mod);

    if (usedRate(opts.qbMlMin)) {
      lines.push("Blood flow: " + qty(opts.qbMlMin, "mL/min", 0));
    }
    if (usedRate(opts.qdMlH)) {
      lines.push("Dialysate: " + qty(opts.qdMlH, "mL/h", 0));
    }
    if (usedRate(opts.qpreMlH)) {
      lines.push("Pre-filter replacement: " + qty(opts.qpreMlH, "mL/h", 0));
    }
    if (usedRate(opts.qpostMlH)) {
      lines.push("Post-filter replacement: " + qty(opts.qpostMlH, "mL/h", 0));
    }
    if (isNum(opts.qnetMlH)) {
      lines.push("Patient fluid removal: " + qty(opts.qnetMlH, "mL/h", 0));
    }

    anticoagulationLines(opts).forEach((l) => lines.push(l));

    return {
      title: "CRRT PRESCRIPTION",
      date: dateStr,
      text: lines.join("\n"),
      footer: FOOTER,
    };
  }

  /**
   * Dose-check values (weight, prescribed and delivered dose, FF).
   * These are not machine settings and must not appear on the prescription card.
   */
  function formatDoseCheck(opts) {
    opts = opts || {};
    const lines = ["Dose check"];
    lines.push("Weight: " + qty(opts.weightKg, "kg", Number.isInteger(opts.weightKg) ? 0 : 1));
    lines.push("Prescribed dose: " + qty(opts.prescribedMlKgH, "mL/kg/h", 1));
    const delivered = isNum(opts.deliveredMlKgH)
      ? opts.deliveredMlKgH
      : opts.downtimeAdjustedMlKgH;
    lines.push("Delivered dose: " + qty(delivered, "mL/kg/h", 1));
    if (isNum(opts.ffPct)) {
      lines.push("Filtration fraction: " + fmt(opts.ffPct, 1) + "%");
    } else {
      lines.push("Filtration fraction: " + BLANK);
    }
    return { title: "Dose check", text: lines.join("\n") };
  }

  const api = {
    FOOTER,
    BLANK,
    formatLongDate,
    formatCrrtPrescription,
    formatDoseCheck,
    modalityOrderLabel,
  };

  global.CrrtPrescription = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
