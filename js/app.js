/**
 * CRRT Dosing — UI. Live results, no Calculate button.
 * Inputs are never stored. No network after first load.
 */
(function () {
  "use strict";

  const F = window.CrrtFormulas;
  const CFG = window.CrrtConfig;
  const RX = window.CrrtPrescription;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function num(el) {
    if (!el) return null;
    let s = String(el.value || "").trim().replace(/,/g, ".");
    s = s.replace("−", "-").replace("–", "-").replace("—", "-");
    if (s === "" || s === "." || s === "-" || s === "+") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function fmt(n, d) {
    if (!F.isNum(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function setText(id, t) {
    const el = $(id);
    if (el) el.textContent = t;
  }
  function metricState(el, state) {
    if (!el) return;
    el.classList.remove("ok", "warn", "bad");
    if (state) el.classList.add(state);
  }
  function chipState(el, state, text) {
    if (!el) return;
    el.className = "status-chip " + (state || "info");
    el.textContent = text;
  }

  /* ── theme (in-memory only; no storage) ── */
  function currentTheme() {
    if (document.documentElement.hasAttribute("data-theme")) {
      return document.documentElement.getAttribute("data-theme");
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintThemeIcon() {
    const dark = currentTheme() === "dark";
    const svg = $("theme-icon");
    if (!svg) return;
    svg.innerHTML = dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/>'
      : '<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/>';
  }
  $("theme-btn").addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    paintThemeIcon();
  });
  paintThemeIcon();

  /* ── draft flag (covers the citrate content too) ── */
  if (CFG && CFG.DRAFT) {
    $("draft-banner").textContent = CFG.DRAFT_BANNER;
    $("draft-banner").hidden = false;
    $("cit-draft-tag").textContent = CFG.CITRATE_DRAFT_LABEL;
    $("cit-draft-tag").hidden = false;
  } else {
    $("draft-banner").hidden = true;
    $("cit-draft-tag").hidden = true;
  }

  /* ── chip radios ── */
  function bindChips(rootId, onChange) {
    const root = $(rootId);
    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn || !root.contains(btn)) return;
      $$(".chip", root).forEach((c) => {
        c.classList.remove("is-on");
        c.setAttribute("aria-checked", "false");
      });
      btn.classList.add("is-on");
      btn.setAttribute("aria-checked", "true");
      onChange(btn);
    });
  }

  let modality = "cvvh";
  let replacementMode = "post";

  function isScuf() {
    return modality === "scuf";
  }

  function rateModality() {
    if (modality === "cvvh") {
      if (replacementMode === "pre") return "cvvh-pre";
      if (replacementMode === "mixed") return "cvvh-mixed";
      return "cvvh-post";
    }
    return modality;
  }

  function replacementPreFraction() {
    if (replacementMode === "pre") return 1;
    if (replacementMode === "post") return 0;
    return 0.5;
  }

  function syncScufUfPrompt() {
    const el = $("c-qnet-scuf-msg");
    if (!el) return;
    const qnet = num($("c-qnet"));
    const show = isScuf() && !(F.isNum(qnet) && qnet > 0);
    el.classList.toggle("hidden", !show);
    el.classList.toggle("warn-text", show);
  }

  function syncModalityUi() {
    const cvvh = modality === "cvvh";
    const hdf = modality === "cvvhdf";
    const scuf = isScuf();
    if ($("c-cvvh-repl-wrap")) $("c-cvvh-repl-wrap").classList.toggle("hidden", !(cvvh || hdf));
    if ($("c-split-note")) $("c-split-note").classList.toggle("hidden", !hdf);
    if ($("c-kdigo-mod-note")) $("c-kdigo-mod-note").classList.toggle("hidden", scuf);
    if ($("c-scuf-mod-note")) $("c-scuf-mod-note").classList.toggle("hidden", !scuf);
    if ($("optional-card")) $("optional-card").classList.toggle("hidden", scuf);
    ["dc-pres-row", "dc-del-row", "c-corr-metric", "c-flow-dose-note"].forEach((id) => {
      if ($(id)) $(id).classList.toggle("hidden", scuf);
    });
    const wtTag = $("c-wt-tag");
    if (wtTag) {
      wtTag.textContent = scuf ? "optional" : "required";
      wtTag.classList.toggle("req", !scuf);
    }
    const wtMsg = $("c-wt-msg");
    if (wtMsg && !wtMsg.classList.contains("warn-text")) {
      wtMsg.textContent = scuf
        ? "Weight is optional for SCUF. It is used if you choose heparin."
        : "Enter the patient’s weight in kilograms to continue.";
    }
    syncScufUfPrompt();
  }

  bindChips("c-mod", (btn) => {
    modality = btn.dataset.mod;
    syncModalityUi();
    recalc();
  });
  bindChips("c-cvvh-repl", (btn) => {
    replacementMode = btn.dataset.repl;
    recalc();
  });

  let anticoagulation = "";
  function clearRatioResults() {
    setText("c-ratio", "—");
    setText("c-ratio-st", "—");
    if ($("m-ratio")) metricState($("m-ratio"), "");
    if ($("m-ratio-st")) metricState($("m-ratio-st"), "");
  }

  function syncAnticoagPanels() {
    const hep = anticoagulation === "heparin";
    const cit = anticoagulation === "citrate";
    $("c-heparin-block").classList.toggle("hidden", !hep);
    $("citrate-card").classList.toggle("hidden", !cit);
    $("ac-none-note").classList.toggle("hidden", anticoagulation !== "");
    const ratioCard = $("ratio-card");
    if (ratioCard) {
      ratioCard.classList.toggle("hidden", !cit);
      ratioCard.setAttribute("aria-hidden", cit ? "false" : "true");
      if (!cit) clearRatioResults();
    }
  }
  bindChips("c-ac", (btn) => {
    anticoagulation = btn.dataset.ac;
    syncAnticoagPanels();
    recalc();
  });

  let heparinGiveBolus = true;
  function syncHeparinBolusUi() {
    const on = heparinGiveBolus;
    $("c-hep-bolus-wrap").classList.toggle("hidden", !on);
    if ($("c-hep-bolus-metric")) $("c-hep-bolus-metric").classList.toggle("hidden", !on);
    if ($("c-hep-metrics")) $("c-hep-metrics").classList.toggle("two", !on);
  }
  bindChips("c-hep-bolus-on", (btn) => {
    heparinGiveBolus = btn.dataset.bolus === "yes";
    syncHeparinBolusUi();
    recalc();
  });

  function bindUnit(id, units) {
    const b = $(id);
    b.addEventListener("click", () => {
      const i = units.indexOf(b.dataset.unit);
      const next = units[(i + 1) % units.length];
      b.dataset.unit = next;
      b.textContent = next;
      recalc();
    });
  }
  bindUnit("c-tca-u", ["mg/dL", "mmol/L"]);
  bindUnit("c-ica-u", ["mmol/L", "mg/dL"]);

  /* ── main recalculation ── */
  const ROWS_BY_MOD = {
    "cvvh-pre": ["row-qpre"],
    "cvvh-post": ["row-qpost"],
    "cvvh-mixed": ["row-qpre", "row-qpost"],
    cvvhd: ["row-qd"],
    cvvhdf: ["row-qd", "row-qpre", "row-qpost"],
    scuf: [],
  };

  function ffFlagFromPct(ffPct) {
    if (!F.isNum(ffPct)) return "";
    const frac = ffPct / 100;
    if (frac > F.TARGETS.FF_WARN) return "warning";
    if (frac >= F.TARGETS.FF_CAUTION) return "caution";
    return "";
  }

  function recalc() {
    const wt = num($("c-wt"));
    const target = num($("c-target"));
    const qnetIn = num($("c-qnet"));
    const qnet = qnetIn === null ? 0 : qnetIn;
    const qb = num($("c-qb"));
    const hct = num($("c-hct"));
    const down = num($("c-down"));
    // CVVHDF dialysate/replacement split stays locked at 50/50.
    // Replacement pre/post follows Pre / Post / Mixed (Mixed = 0.5).
    const preFrac = replacementPreFraction();
    const dFrac = 0.5;

    ["row-qpre", "row-qpost", "row-qd"].forEach((r) => {
      if ($(r)) $(r).classList.toggle("dim", (ROWS_BY_MOD[rateModality()] || []).indexOf(r) < 0);
    });

    syncScufUfPrompt();
    const scuf = isScuf();
    const mod = rateModality();

    let s = null;
    let msg = "Enter weight to see rates. Results update as you type.";
    let msgWarn = false;
    if (!scuf && F.isNum(wt) && wt > 0 && F.isNum(target) && target > 0) {
      try {
        s = F.suggestCrrtPrescription({
          weightKg: wt,
          targetMlKgH: target,
          qnetMlH: qnet,
          modality: mod,
          preFraction: preFrac,
          dialysateFraction: dFrac,
        });
        if (s.netExceedsTarget) {
          msg = "Net UF is more than the target effluent. Lower net UF or raise the dose.";
          msgWarn = true;
        } else {
          msg = "Suggested rates for " + fmt(wt, wt % 1 ? 1 : 0) + " kg at " + fmt(target, target % 1 ? 1 : 0) + " mL/kg/h.";
        }
      } catch (e) {
        s = null;
      }
    } else if (F.isNum(wt) && wt <= 0) {
      msg = "Weight must be more than 0.";
      msgWarn = true;
    } else if (F.isNum(wt) && !(F.isNum(target) && target > 0)) {
      msg = "Enter a target dose (default 25 mL/kg/h).";
      msgWarn = true;
    }
    const msgEl = $("c-dose-msg");
    msgEl.textContent = msg;
    msgEl.classList.toggle("warn-text", msgWarn);

    const ok = !scuf && s && !s.netExceedsTarget;

    let citrateRate = null;
    const citTargetIn = $("c-cit-target") ? num($("c-cit-target")) : null;
    if (anticoagulation === "citrate") {
      let citTarget = null;
      if (F.isNum(citTargetIn) && citTargetIn > 0) citTarget = citTargetIn;
      else if (!F.isNum(citTargetIn)) citTarget = F.TARGETS.CITRATE_DOSE_DEFAULT;
      if (F.isNum(qb) && qb > 0 && F.isNum(citTarget)) {
        try {
          citrateRate = F.prismocitrate18Rate({
            qbMlMin: qb,
            targetMmolPerLBlood: citTarget,
          }).rateMlH;
        } catch (e) {
          citrateRate = null;
        }
      }
    }

    let qpreExtra = ok ? s.qpreMlH : null;
    let qpreUse = ok ? s.qpreMlH : null;
    let qpostUse = ok ? s.qpostMlH : null;
    let qdUse = ok ? s.qdMlH : null;
    let qnetUse = (scuf || ok) && F.isNum(qnet) ? qnet : null;
    let qeffUse = ok ? s.qeffMlH : null;
    let citrateApplied = false;
    let citrateExceeds = false;
    let citrateCounted = false;
    if (F.isNum(citrateRate) && (ok || scuf)) {
      const rec = F.applyPrismocitratePreFilter({
        citrateRateMlH: citrateRate,
        modality: scuf ? "scuf" : mod,
        qpreMlH: ok ? s.qpreMlH : 0,
        qpostMlH: ok ? s.qpostMlH : 0,
        qdMlH: ok ? s.qdMlH : 0,
        qnetMlH: F.isNum(qnet) ? qnet : 0,
        remainingMlH: ok ? s.remainingMlH : null,
        preFraction: preFrac,
        dialysateFraction: dFrac,
      });
      qpreExtra = rec.qpreMlH;
      qpreUse = citrateRate + rec.qpreMlH;
      qpostUse = rec.qpostMlH;
      qdUse = rec.qdMlH;
      qnetUse = rec.qnetMlH;
      qeffUse = rec.qeffMlH;
      citrateApplied = true;
      citrateExceeds = !!rec.citrateExceedsTarget;
      citrateCounted = !!rec.citrateCountedTowardDose;
    } else if (F.isNum(citrateRate)) {
      qpreExtra = 0;
      qpreUse = citrateRate;
    }

    if (ok && citrateApplied && !s.netExceedsTarget) {
      if (citrateExceeds && F.isNum(wt) && wt > 0 && F.isNum(qeffUse)) {
        msg = "Citrate alone exceeds the target dose (" + fmt(qeffUse / wt, 1) + " mL/kg/h). Other rates set to 0. Consider lowering blood flow.";
        msgEl.textContent = msg;
        msgEl.classList.toggle("warn-text", true);
      } else {
        msg = "Citrate is counted toward the dose; other rates are reduced to keep " + fmt(target, target % 1 ? 1 : 0) + " mL/kg/h.";
        msgEl.textContent = msg;
        msgEl.classList.toggle("warn-text", false);
      }
    }

    if (anticoagulation === "citrate") {
      setText("c-cit-qb", F.isNum(qb) && qb > 0 ? fmt(qb, 0) + " mL/min" : "—");
      setText("c-cit-rate", F.isNum(citrateRate) ? fmt(citrateRate, 0) + " mL/h" : "—");
      const citNotes = [];
      if (F.isNum(citTargetIn) && citTargetIn <= 0) {
        citNotes.push("Target citrate dose must be greater than 0.");
      } else if (!F.isNum(citrateRate)) {
        citNotes.push("Enter blood flow on the previous step to calculate the rate.");
      } else {
        citNotes.push("Prismocitrate 18 is pre-dilution only. The rate is set by blood flow and the citrate target, and is counted toward the effluent dose.");
        if (citrateExceeds && F.isNum(wt) && wt > 0 && F.isNum(qeffUse)) {
          citNotes.push("Citrate alone exceeds the target dose (" + fmt(qeffUse / wt, 1) + " mL/kg/h). Consider lowering blood flow.");
        }
        if (mod === "cvvhd" || scuf) {
          citNotes.push("The Prismocitrate 18 trial (NCT05399537) studied CVVH and CVVHDF only, not " + (scuf ? "SCUF" : "CVVHD") + ".");
        }
      }
      setText("c-cit-note", citNotes.join(" "));
      if ($("c-cit-note")) $("c-cit-note").classList.toggle("warn-text", citrateExceeds);
    } else {
      if ($("c-cit-rate")) setText("c-cit-rate", "—");
      if ($("c-cit-qb")) setText("c-cit-qb", "—");
      if ($("c-cit-note")) {
        setText("c-cit-note", "");
        $("c-cit-note").classList.remove("warn-text");
      }
    }

    const ratesOk = ok || (scuf && citrateApplied);
    setText("r-qeff", (ok || ratesOk) && F.isNum(qeffUse) ? fmt(qeffUse, 0) + " mL/h" : "—");
    setText("r-qpre", F.isNum(qpreUse) && (ok || citrateApplied) ? fmt(qpreUse, 0) + " mL/h" : "—");
    setText("r-qpost", ok ? fmt(qpostUse, 0) + " mL/h" : "—");
    setText("r-qd", ok ? fmt(qdUse, 0) + " mL/h" : "—");
    setText("r-qnet", (scuf || ok) && F.isNum(qnet) ? fmt(qnet, 0) + " mL/h" : "—");

    let prescribed = null;
    let corrected = null;
    let delivered = null;
    let ffPct = null;
    let qbMin = null;
    let needQbHct = false;
    const haveQbHct = F.isNum(qb) && qb > 0 && F.isNum(hct) && hct > 0 && hct < 100;

    if (scuf) {
      // No dose target, delivered dose, or suggested clearance rates.
      // FF = UF / plasma flow when blood flow and hematocrit are entered.
      // No SCUF-specific numeric limits are applied.
      if (haveQbHct) {
        try {
          ffPct = F.filtrationFraction({
            qbMlMin: qb,
            hct,
            qpreMlH: citrateApplied ? qpreUse : 0,
            qpostMlH: 0,
            qnetMlH: qnet,
            // If Prismocitrate 18 is running pre-filter, that volume is
            // ultrafiltrate (plus net UF). Pure-SCUF FF (UF = net only) no longer applies.
            modality: citrateApplied ? "cvvh" : "scuf",
          }).ffUsedPct;
        } catch (e) {
          ffPct = null;
        }
      }
    } else if (ok) {
      try {
        const d = F.crrtEffluentDose({
          weightKg: wt,
          qdMlH: qdUse,
          qpreMlH: qpreUse,
          qpostMlH: qpostUse,
          qnetMlH: qnetUse,
          qbMlMin: haveQbHct ? qb : null,
          hct: haveQbHct ? hct : null,
        });
        prescribed = d.prescribedMlKgH;
        corrected = d.correctedMlKgH;
      } catch (e) {
        prescribed = (F.isNum(qeffUse) ? qeffUse : s.qeffMlH) / wt;
        corrected = null;
        needQbHct = true;
      }
      const downOk = down === null || (down >= 0 && down <= 100);
      if (F.isNum(corrected) && downOk) {
        delivered = F.deliveredDose(corrected, down === null ? 0 : down).deliveredMlKgH;
      }
      if (haveQbHct) {
        try {
          const ffOpts = {
            qbMlMin: qb,
            hct,
            qpreMlH: qpreUse,
            qpostMlH: qpostUse,
            qnetMlH: qnetUse,
            // Citrate pre-filter replacement is ultrafiltrate, so do not use the
            // pure-CVVHD (UF = net only) path when that rate is applied.
            modality: (mod === "cvvhd" && !citrateApplied) ? "cvvhd" : "cvvh",
          };
          ffPct = F.filtrationFraction(ffOpts).ffUsedPct;
          qbMin = F.minQbForFf(ffOpts, F.TARGETS.FF_WARN).qbMlMin;
        } catch (e) {
          ffPct = null;
          qbMin = null;
        }
      }
    }

    const ffFlag = scuf ? "" : ffFlagFromPct(ffPct);
    setText("c-ff", F.isNum(ffPct) && Number.isFinite(ffPct) ? fmt(ffPct, 1) + "%" : "—");
    metricState($("m-ff"), ffFlag === "warning" ? "bad" : ffFlag === "caution" ? "warn" : F.isNum(ffPct) ? "ok" : "");
    setText("c-qbmin", F.isNum(qbMin) && qbMin > 0 ? fmt(Math.ceil(qbMin), 0) + " mL/min" : "—");

    // Sticky summary + dock
    const heroVal = F.isNum(delivered) ? delivered : null;
    setText("c-hero", heroVal !== null ? fmt(heroVal, 1) : "—");
    setText("c-hero-u", heroVal !== null ? " mL/kg/h" : "");
    setText("c-r-pres", F.isNum(prescribed) ? fmt(prescribed, 1) + " mL/kg/h" : "—");
    setText("c-r-corr", F.isNum(corrected) ? fmt(corrected, 1) + " mL/kg/h" : needQbHct ? "add blood flow + Hct" : "—");
    setText("c-r-del", F.isNum(delivered) ? fmt(delivered, 1) + " mL/kg/h" : "—");
    setText("c-r-qeff", ok && F.isNum(qeffUse) ? fmt(qeffUse, 0) + " mL/h" : "—");
    setText("c-r-ff", F.isNum(ffPct) && Number.isFinite(ffPct) ? fmt(ffPct, 1) + "%" : "—");

    let chip = ["info", scuf ? "SCUF" : "Enter weight"];
    if (s && s.netExceedsTarget) chip = ["bad", "Check net UF"];
    else if (needQbHct) chip = ["info", "Pre-filter: add Qb + Hct"];
    else if (F.isNum(delivered)) {
      const st = F.kdigoDoseStatus(delivered, prescribed).deliveredStatus;
      if (st === "in-range") chip = ["ok", "KDIGO 20–25 delivered"];
      else if (st === "below") chip = ["warn", "Below KDIGO 20–25"];
      else chip = ["info", "Above KDIGO 20–25"];
    }
    chipState($("c-hero-chip"), chip[0], chip[1]);
    chipState($("dock-chip"), chip[0], chip[1]);
    setText("dock-v", heroVal !== null ? fmt(heroVal, 1) : "—");
    setText("dock-u", heroVal !== null ? "mL/kg/h" : "");
    if ($("c-qb-recap")) {
      $("c-qb-recap").textContent = F.isNum(qb) && qb > 0 ? fmt(qb, 0) + " mL/min" : "—";
    }

    // Hourly net UF → mL/24 h (unit conversion only; not a 24-h planner).
    if ($("c-qnet-24h")) {
      const q24 = qnetIn === null ? 0 : qnetIn;
      setText("c-qnet-24h", F.isNum(q24) ? "Equivalent: " + fmt(q24 * 24, 0) + " mL/24 h" : "Equivalent: —");
    }

    setText("dc-wt", F.isNum(wt) && wt > 0 ? fmt(wt, wt % 1 ? 1 : 0) + " kg" : "—");
    setText("dc-pres", F.isNum(prescribed) ? fmt(prescribed, 1) + " mL/kg/h" : "—");
    setText("dc-del", F.isNum(delivered) ? fmt(delivered, 1) + " mL/kg/h" : "—");
    setText("dc-ff", F.isNum(ffPct) && Number.isFinite(ffPct) ? fmt(ffPct, 1) + "%" : "—");
    const notes = [];
    if (!scuf) {
      if (s && s.netExceedsTarget) notes.push("Net UF is more than the target effluent. Lower net UF or raise the dose.");
      else if (needQbHct) notes.push("Add blood flow and hematocrit for the predilution-corrected dose.");
      if (ffFlag === "warning") notes.push("Filtration fraction is at or above 25%.");
      else if (ffFlag === "caution") notes.push("Filtration fraction is at or above 20%.");
    }
    if (citrateExceeds && ok && F.isNum(wt) && wt > 0 && F.isNum(qeffUse)) {
      notes.push("Citrate alone exceeds the target dose (" + fmt(qeffUse / wt, 1) + " mL/kg/h). Consider lowering blood flow.");
    }
    setText("dc-note", notes.join(" "));
    if ($("dc-note")) $("dc-note").classList.toggle("warn-text", notes.length > 0);

    // Heparin
    let hep = { given: null, bolusUnits: null, bolusIuKg: null, unitsH: null, iuKgH: null, mlH: null };
    if (anticoagulation === "heparin") {
      const bolusIuKg = num($("c-hep-bolus"));
      const rateIuKgH = num($("c-hep-rate"));
      const conc = num($("c-hep-conc"));
      hep.given = heparinGiveBolus;
      try {
        const b = F.heparinBolus({ giveBolus: heparinGiveBolus, weightKg: wt, bolusIuPerKg: bolusIuKg });
        hep.bolusUnits = b.bolusUnits;
        hep.bolusIuKg = b.given ? b.bolusIuPerKg : 0;
        setText("c-hep-bolus-u", b.given ? fmt(b.bolusUnits, 0) + " units" : "None");
      } catch (e) {
        setText("c-hep-bolus-u", heparinGiveBolus ? "—" : "None");
      }
      try {
        const inf = F.heparinInfusion({
          weightKg: wt,
          rateIuPerKgH: rateIuKgH,
          concentrationUnitsPerMl: conc !== null && conc > 0 ? conc : null,
        });
        hep.unitsH = inf.rateUnitsH;
        hep.iuKgH = inf.rateIuPerKgH;
        hep.mlH = inf.rateMlH;
        setText("c-hep-rate-out", fmt(inf.rateUnitsH, 0) + " units/h");
        setText("c-hep-ml", F.isNum(inf.rateMlH) ? fmt(inf.rateMlH, 1) + " mL/h" : "add bag");
      } catch (e) {
        setText("c-hep-rate-out", "—");
        setText("c-hep-ml", "—");
      }
    }

    // Calcium ratio — only shown when citrate is the selected anticoagulant
    if (anticoagulation !== "citrate") {
      clearRatioResults();
    } else {
      const tca = num($("c-tca"));
      const ica = num($("c-ica"));
      let ratioText = "—";
      let stText = "—";
      let ratioState = "";
      if (F.isNum(tca) && F.isNum(ica) && tca > 0 && ica > 0) {
        try {
          const r = F.citrateCalciumRatio(tca, $("c-tca-u").dataset.unit, ica, $("c-ica-u").dataset.unit);
          ratioText = fmt(r.ratio, 2);
          if (r.ratio < 1) {
            stText = "Total is lower than ionized — check units";
            ratioState = "warn";
          } else if (r.status === "accumulation") {
            stText = "Above 2.5 — accumulation by the trial definition; follow protocol";
            ratioState = "bad";
          } else if (r.status === "consider") {
            stText = "Above 2.25 — consider accumulation";
            ratioState = "warn";
          } else {
            stText = "Not above 2.25 — watch the trend";
            ratioState = "";
          }
        } catch (e) {
          ratioText = "—";
        }
      }
      setText("c-ratio", ratioText);
      setText("c-ratio-st", stText);
      metricState($("m-ratio"), ratioState);
      metricState($("m-ratio-st"), ratioState);
    }

    // Order sheet
    if (RX) {
      const rx = RX.formatCrrtPrescription({
        weightKg: F.isNum(wt) && wt > 0 ? wt : null,
        modality: scuf ? "scuf" : mod,
        targetMlKgH: scuf ? null : (F.isNum(target) && target > 0 ? target : null),
        qbMlMin: F.isNum(qb) && qb > 0 ? qb : null,
        qpreMlH: scuf ? null : (ok ? qpreExtra : null),
        qpostMlH: scuf || !ok ? null : qpostUse,
        qdMlH: scuf || !ok ? null : qdUse,
        qnetMlH: scuf ? (F.isNum(qnet) ? qnet : null) : (ok ? (F.isNum(qnetUse) ? qnetUse : s.qnetMlH) : null),
        anticoagulation,
        citrateRateMlH: F.isNum(citrateRate) ? citrateRate : null,
        citrateCountedTowardDose: citrateCounted,
        citrateExceedsTarget: citrateExceeds,
        heparinBolusGiven: anticoagulation === "heparin" ? hep.given : null,
        heparinBolusUnits: hep.bolusUnits,
        heparinBolusIuPerKg: hep.bolusIuKg,
        heparinInfusionUnitsH: hep.unitsH,
        heparinInfusionIuPerKgH: hep.iuKgH,
        heparinInfusionMlH: hep.mlH,
        ffPct: F.isNum(ffPct) && Number.isFinite(ffPct) ? ffPct : null,
        ffFlag,
        prescribedMlKgH: prescribed,
        deliveredMlKgH: delivered,
        downtimeAdjustedMlKgH: delivered,
      });
      renderSheet($("c-rx-sheet"), rx);
    }
  }

  document.addEventListener("input", (e) => {
    if (e.target && e.target.matches("input[type=text]")) recalc();
  });

  /* ── About content ── */
  const ABOUT = {
    "crrt-dose": {
      title: "CRRT effluent dose",
      html: `
        <h4>Equation</h4>
        <p class="eq">Qeff = Qd + Qr<sub>pre</sub> + Qr<sub>post</sub> + Qnet<br>
        Prescribed dose = Qeff / weight&nbsp;(mL/kg/h)<br>
        Predilution factor DF = Qp / (Qp + Qpre)<br>
        Qp = Qb × 60 × (1 − Hct)<br>
        Corrected dose = (Qeff × DF) / weight<br>
        Delivered ≈ corrected × (1 − downtime fraction)</p>
        <h4>Units</h4>
        <p>Rates in mL/h, Qb in mL/min, dose in mL/kg/h, Hct as % or fraction.</p>
        <h4>Citation</h4>
        <p>KDIGO Clinical Practice Guideline for Acute Kidney Injury. <em>Kidney Int Suppl.</em> 2012;2:1-138, recommendation <strong>5.8.4</strong> (recommendation 5.8.3 is intermittent Kt/V 3.9): “We recommend delivering an effluent volume of 20–25 ml/kg/h for CRRT in AKI (1A). This will usually require a higher prescription of effluent volume.” Rationale (p. 114): “In clinical practice, in order to achieve a delivered dose of 20–25 ml/kg/h, it is generally necessary to prescribe in the range of 25–30 ml/kg/h, and to minimize interruptions in CRRT.” Evidence: ATN — Palevsky et al., <em>N Engl J Med.</em> 2008;359:7-20. RENAL — Bellomo et al., <em>N Engl J Med.</em> 2009;361:1627-1638.</p>
        <p>Predilution factor: Macedo E, Mehta RL. Continuous dialysis therapies: Core Curriculum 2016. <em>Am J Kidney Dis.</em> 2016;68:645-661. <a href="https://doi.org/10.1053/j.ajkd.2016.03.427" target="_blank" rel="noopener">doi:10.1053/j.ajkd.2016.03.427</a>.</p>
        <h4>Caveats</h4>
        <ul>
          <li>Delivered dose here is time-weighted effluent. KDIGO also notes that filter efficiency declines; we do not invent a filter-efficiency coefficient.</li>
          <li>The predilution correction assumes a urea sieving coefficient of ≈1 and applies DF to total effluent — the usual clinical approximation.</li>
          <li>Plasma flow is Qb × (1 − Hct), without a further 0.93 plasma-water factor (same judgment as the Nephrology Toolbox).</li>
          <li>Default prescribed target is 25 mL/kg/h, the lower end of KDIGO’s usual prescription range.</li>
          <li>Net fluid removal defaults to 0 mL/h; enter your hourly net UF goal. Downtime, blood flow and hematocrit are optional and blank by default; nothing is assumed.</li>
        </ul>`,
    },
    "crrt-modality": {
      title: "CRRT modalities",
      html: `
        <h4>How rates are split</h4>
        <p class="eq">Target effluent = target dose × weight<br>
        Remaining = target effluent − net UF<br>
        CVVH: remaining → pre-filter, post-filter, or 50/50 mixed replacement (Replacement: Pre / Post / Mixed; default Post)<br>
        CVVHD: remaining → dialysate (UF is the only convection). No replacement choice.<br>
        CVVHDF: remaining split 50% dialysate and 50% replacement (fixed). That replacement follows the same Pre / Post / Mixed choice (default Post; Mixed = 50/50 pre/post).<br>
        SCUF: no dialysate, no replacement, and no dose target. The prescription is blood flow, fluid removal (net UF), and anticoagulation. No replacement choice.</p>
        <h4>Caveats</h4>
        <ul>
          <li>The CVVHDF dialysate / replacement split is fixed at 50/50 (Dr D, 14 Nov 2026). It is <strong>not</strong> a guideline target. The pre/post share of the replacement half is a separate choice (default Post).</li>
          <li>If net UF already exceeds the target effluent, rates are not auto-filled and a warning is implied by the dose numbers.</li>
          <li>SCUF has no suggested clearance rates and no SCUF-specific numeric limits. Filtration fraction is shown if blood flow and hematocrit are entered (FF = UF / plasma flow).</li>
        </ul>`,
    },
    "crrt-rates": {
      title: "Filtration fraction and blood flow",
      html: `
        <h4>Equation</h4>
        <p class="eq">Quf = Qpre + Qpost + Qnet &nbsp;(for CVVHD and SCUF, Quf = Qnet only)<br>
        FF<sub>post-style</sub> = Quf / Qp<br>
        FF<sub>pre</sub> = Quf / (Qp + Qpre)<br>
        The FF used for warnings is the pre-style when Qpre &gt; 0.<br>
        Min Qb for FF = 0.25: &nbsp;Qb = (Quf / 0.25 − Qpre) / (60 × (1 − Hct))</p>
        <h4>Citation</h4>
        <p>Neri M, et al. Nomenclature for renal replacement therapy in AKI: basic principles. <em>Crit Care.</em> 2016;20:318. <a href="https://doi.org/10.1186/s13054-016-1489-9" target="_blank" rel="noopener">doi:10.1186/s13054-016-1489-9</a>.</p>
        <p>Murugan R, Hoste E, Mehta RL, et al. Precision fluid management in CRRT. <em>Blood Purif.</em> 2016. <a href="https://doi.org/10.1159/000448528" target="_blank" rel="noopener">doi:10.1159/000448528</a> — “A high FF (&gt;0.25) is typically associated with increased risk of poor filter performance and clotting.”</p>
        <h4>Caveats / judgment</h4>
        <ul>
          <li>The 20–25% caution is practice-based, <strong>not</strong> a KDIGO numeric target.</li>
          <li>Neri distinguishes filtration fraction (ideally below 30%) from concentration ratio (keep below 20–25%). We warn at 20% (caution) and 25% (warning) and flag this for review.</li>
          <li>Minimum Qb is derived from the FF equation, not a recommended blood-flow from a guideline.</li>
        </ul>`,
    },
    anticoag: {
      title: "Anticoagulation for CRRT",
      html: `
        <h4>KDIGO AKI 2012, section 5.3 (choice of anticoagulant)</h4>
        <p>KDIGO Clinical Practice Guideline for Acute Kidney Injury. <em>Kidney Int Suppl.</em> 2012;2:1-138, chapter 5.3.</p>
        <ul>
          <li><strong>5.3.2.2 (2B):</strong> For anticoagulation in CRRT, “we suggest using regional citrate anticoagulation rather than heparin in patients who do not have contraindications for citrate.”</li>
          <li><strong>5.3.2.3 (2C):</strong> If citrate is contraindicated, “we suggest using either unfractionated or low-molecular-weight heparin, rather than other anticoagulants.”</li>
          <li><strong>5.3.3.1 (2C):</strong> If bleeding risk is increased and citrate is not contraindicated, suggest regional citrate rather than no anticoagulation.</li>
          <li><strong>5.3.3.2 (2C):</strong> “We suggest avoiding regional heparinization during CRRT in a patient with increased risk of bleeding.”</li>
          <li><strong>5.3.4 (1A):</strong> In heparin-induced thrombocytopenia, “all heparin must be stopped” (the rationale includes heparin locks) and “we recommend using direct thrombin inhibitors (such as argatroban) or Factor Xa inhibitors (such as danaparoid or fondaparinux) rather than other or no anticoagulation during RRT.”</li>
          <li><strong>5.3.4.1 (2C):</strong> In HIT without severe liver failure, “we suggest using argatroban rather than other thrombin or Factor Xa inhibitors during RRT.”</li>
        </ul>
        <p>KDIGO does <strong>not</strong> recommend a single numeric unfractionated-heparin dose. The rationale states that UFH is “mostly administered as a prefilter infusion, with large variability in the administered doses,” that the relationship among dose, aPTT, filter survival, and bleeding “is not straightforward,” and that “it is common practice to measure aPTT for safety reasons and to adapt the target to the bleeding risk of the patient.” After summarizing two small UFH-vs-LMWH RCTs, KDIGO concludes “no firm recommendations can be made.” Monitoring “should also include platelet count, allowing timely detection of HIT.”</p>
        <h4>Starting unfractionated-heparin values used in this app</h4>
        <p>The editable starting values are the UFH arm of the second trial KDIGO describes:</p>
        <p class="eq">Bolus 30 IU/kg, then 7 IU/kg/h pre-filter, titrated to aPTT 40–45 seconds.</p>
        <p>Joannidis M, Kountchev J, Rauchenzauner M, et al. Enoxaparin vs. unfractionated heparin for anticoagulation during continuous veno-venous hemofiltration: a randomized controlled crossover study. <em>Intensive Care Med.</em> 2007;33:1571-1579. <a href="https://pubmed.ncbi.nlm.nih.gov/17563874/" target="_blank" rel="noopener">PMID 17563874</a>. KDIGO reference 616.</p>
        <p>Joannidis M, Oudemans-van Straaten HM. Clinical review: Patency of the circuit in continuous renal replacement therapy. <em>Crit Care.</em> 2007;11:218. <a href="https://doi.org/10.1186/cc5937" target="_blank" rel="noopener">doi:10.1186/cc5937</a> describes “a possible scheme for UFH” of “a bolus of 30 IU/kg followed by an initial rate of 5 to 10 IU/kg per hour in patients with normal coagulation. However, the level of anticoagulation should be individualized.” That review also notes: “Retrospective analyses indicate increased bleeding if systemic aPTT is longer than 45 seconds.”</p>
        <p>The source of that bleeding observation is van de Wetering J, Westendorp RG, van der Hoeven JG, et al. Heparin use in continuous renal replacement procedures: the struggle between filter coagulation and patient hemorrhage. <em>J Am Soc Nephrol.</em> 1996;7:145-150. <a href="https://pubmed.ncbi.nlm.nih.gov/8808122/" target="_blank" rel="noopener">PMID 8808122</a> (KDIGO reference 618).</p>
        <h4>The other KDIGO-cited RCT (not the starting default)</h4>
        <p>Reeves JH, Cumming AR, Gallagher L, et al. A controlled trial of low-molecular-weight heparin (dalteparin) versus unfractionated heparin as anticoagulant during continuous venovenous hemodialysis with filtration. <em>Crit Care Med.</em> 1999;27:2224-2228 (KDIGO reference 620). UFH arm: bolus 2000–5000 U, then 10 U/kg/h, titrated to an aPTT of 70–80 seconds (mean aPTT 79 seconds). This is shown as a published alternative, not as the app’s starting value, because it conflicts with the 40–45 second target and with the bleeding observation at aPTT &gt; 45 seconds.</p>
        <h4>What the calculator does</h4>
        <p class="eq">Bolus (units) = bolus (IU/kg) × weight (kg)<br>
        Infusion (units/h) = rate (IU/kg/h) × weight (kg)<br>
        If a bag concentration (units/mL) is entered: mL/h = (units/h) ÷ (units/mL)</p>
        <p>These are unit conversions only. A no-bolus option is provided so you can match a unit protocol; it is not a cited “preferred” regimen. Bag strength has <strong>no cited default</strong> and is left blank. No monitoring interval or aPTT target is filled in on the order sheet; write in your unit’s protocol. We do not pre-fill an anti-Xa range for UFH; the anti-Xa figures in the KDIGO-cited trials were for LMWH (enoxaparin 0.25–0.30 U/ml in Joannidis 2007; a mean of 0.49 U/ml in a subset of the Reeves dalteparin arm).</p>
        <h4>Citrate</h4>
        <p>When citrate is selected, the Prismocitrate 18 pre-filter rate is calculated from blood flow and the trial target (default 3 mmol/L of blood) using the labelled 18 mmol/L citrate concentration. That rate is counted toward the effluent-dose target, and the other fluid rates are reduced to keep the target. Calcium infusion is listed as per protocol. See the Citrate anticoagulation precautions card and its Details &amp; sources.</p>
      `,
    },
    citrate: {
      title: "Citrate precautions — sources",
      html: `
        <p><strong>Follow your institution’s protocol.</strong> The reference-protocol box uses values from the Prismocitrate 18 clinical-trial protocol (NCT05399537). Those values are a trial protocol, not a Bon Secours Richmond policy. Draft — awaiting Dr D sign-off.</p>
        <h4>Prismocitrate 18 rate</h4>
        <p class="eq">Qcit (mL/h) = Qb (mL/min) × 60 × target (mmol/L blood) ÷ 18 mmol/L</p>
        <p>This is the unit conversion of the trial statement that the pre-filter infusion is “indexed to the blood flow rate (BFR) to achieve a target blood citrate concentration of 3 mmol/L of blood” (<a href="https://clinicaltrials.gov/study/NCT05399537" target="_blank" rel="noopener">NCT05399537</a>). The 18 mmol/L concentration is from the Prismocitrate 18/0 Instruction for use (Bieffe Medital / Baxter, D13000165 Ver. 4.0: “Citrate C6H5O73- 18 mmol/l”) and is confirmed by the Regiocit SmPC (HPRA, 4 November 2026, PA25288/008/001), which has the same ionic composition and states that the rate depends on the targeted citrate dose and blood flow, with the pump adapted to an operator-set target in mmol citrate per litre of blood. The SmPC adult target range is 3 to 4 mmol/L of blood; the app default remains the trial value of 3, and is editable. The solution is for pre-dilution only and is counted as pre-filter replacement in the effluent, dose, and prescription. Other fluid rates are reduced so total effluent stays at the prescribed dose target. If the citrate rate alone exceeds that target, the other rates are set to 0 and a note suggests lowering blood flow.</p>
        <h4>Calcium infusion</h4>
        <p>The trial record does not publish a starting calcium rate or titration table. The Regiocit SmPC requires a separate calcium infusion but gives no starting rate or bag strength. Effluent calcium is not usually measured, so no calcium rate is calculated. The prescription lists Calcium infusion: per protocol.</p>
        <h4>Reference protocol: Prismocitrate 18 (NCT05399537)</h4>
        <p>Safety Evaluation of Prismocitrate 18 in Patients Receiving CRRT. ClinicalTrials.gov identifier: NCT05399537. <a href="https://clinicaltrials.gov/study/NCT05399537" target="_blank" rel="noopener">clinicaltrials.gov/study/NCT05399537</a>. Record retrieved 14 Nov 2026; last update posted 5 Oct 2026. Sponsor: Vantive Health LLC. Phase 3, recruiting, no results posted. A Bon Secours Mercy Health hospital in Springfield, Ohio, was listed as a site (the record now marks that site terminated). This is not a Bon Secours Richmond policy.</p>
        <ul>
          <li><strong>Solution:</strong> “Prismocitrate 18 solution (investigational drug) will be used in pre-dilution mode only; the rate of administration depends on the targeted citrate dose and the prescribed flow rate. The pre-filter infusion rate of Prismocitrate 18 solution will be indexed to the blood flow rate (BFR) to achieve a target blood citrate concentration of 3 mmol/L of blood.”</li>
          <li><strong>Post-filter iCa:</strong> “The flow rate for the anticoagulation of the extracorporeal circuit will be titrated to achieve a post-filter concentration of iCa of 0.25 to 0.35 mmol/L.”</li>
          <li><strong>Systemic iCa range (eligibility):</strong> “Patients with a systemic ionized calcium concentration outside the normal physiologic range (1.0 - 1.3 mmol/L), or outside of the laboratory reference range (Note: It is acceptable to provide calcium supplementation or treatment for hypercalcemia to achieve a normal physiologic range prior to therapy initiation)” were excluded.</li>
          <li><strong>Safety cut-offs:</strong> symptomatic hypocalcemia with confirmed systemic ionized calcium “&lt; 0.9 mmol/L”; symptomatic hypercalcemia with confirmed systemic ionized calcium “&gt; 1.4 mmol/L”.</li>
          <li><strong>Accumulation:</strong> symptomatic citrate accumulation “with a systemic total calcium to ionized calcium ratio &gt; 2.5.”</li>
          <li><strong>Do not use if (trial exclusions used on the card):</strong> “known allergy to citrate or who have ever experienced an adverse reaction associated with citrate products, including patients with a prior history of citrate toxicity”; “acute liver failure, defined by the occurrence of encephalopathy and hepatic synthetic dysfunction within 26 weeks of the first symptoms of liver disease and without evidence of chronic liver disease”; “acute-on-chronic liver failure characterized by acute decompensation of cirrhosis and a Child-Pugh Liver Failure Score &gt;10”; “refractory shock and associated lactic acidosis (lactate &gt;4 mmol/L)”; systemic ionized calcium outside 1.0–1.3 mmol/L unless corrected first, as above.</li>
        </ul>
        <p>Other trial eligibility items (age ≥18, expected survival of at least 24 hours, pregnancy or breastfeeding, concurrent interventional study) are not shown as citrate contraindications on the card, because they are study entry criteria, not protocol rules for citrate use in practice.</p>
        <h4>1. KDIGO AKI 2012, chapter 5.3 (Anticoagulation)</h4>
        <p>KDIGO Clinical Practice Guideline for Acute Kidney Injury. <em>Kidney Int Suppl.</em> 2012;2:1-138.</p>
        <ul>
          <li><strong>5.3.2.2 (2B):</strong> “For anticoagulation in CRRT, we suggest using regional citrate anticoagulation rather than heparin in patients who do not have contraindications for citrate.”</li>
          <li><strong>5.3.3.1 (2C):</strong> regional citrate rather than no anticoagulation in a patient with increased bleeding risk and no contraindication to citrate.</li>
          <li>Rationale: “A major contra-indication for the use of citrate anticoagulation is severely impaired liver function or shock with muscle hypoperfusion, both representing a risk of citrate accumulation.” “We, therefore, only recommend the use of citrate … in patients that do not have shock or severe liver failure, and in centers that have an established protocol for citrate anticoagulation.”</li>
          <li>Protocol should include “intensive metabolic monitoring, including acid-base status, sodium, and total and ionized calcium levels.”</li>
          <li>“The most frequent metabolic complication is metabolic alkalosis, occurring in up to 50% of the patients” (observational trials).</li>
          <li>Table 19 lists citrate risks: accidental overdose; accumulation with metabolic acidosis and hypocalcemia when liver function is reduced or in shock; other metabolic complications (acidosis, alkalosis, hypernatremia, hypocalcemia, hypercalcemia).</li>
          <li>Total-to-ionized calcium ratio “appears to be the best parameter to detect citrate accumulation with an optimal cutoff at 2.1” (KDIGO ref. 613, Bakker et al. 2006).</li>
        </ul>
        <h4>2. Oudemans-van Straaten &amp; Ostermann 2012</h4>
        <p>Bench-to-bedside review: Citrate for continuous renal replacement therapy, from science to practice. <em>Crit Care.</em> 2012;16:249. <a href="https://doi.org/10.1186/cc11645" target="_blank" rel="noopener">doi:10.1186/cc11645</a> · PMID 23216871.</p>
        <ul>
          <li>Accumulation risk: liver failure, ischemic hepatitis, poor muscle perfusion (prolonged cardiogenic shock); greatest risk with persistent lactic acidosis from poor tissue perfusion.</li>
          <li>“A rise in total to ionized calcium ratio &gt;2.25 should trigger the clinician to consider citrate accumulation.” In at-risk patients, monitor ratio and acid-base “2-hourly at start”, and reduce or stop citrate “when calcium ratio increases above 2.25 to 2.5.”</li>
          <li>Management of accumulation: decrease citrate and blood flow; increase effluent; reduce or stop citrate; IV calcium; titrated bicarbonate. If citrate is in pre-dilution replacement, replace it with bicarbonate with or without heparin.</li>
          <li>Hypomagnesemia (citrate binds magnesium); hypernatremia with concentrated trisodium citrate if replacement sodium is not reduced; hypocalcemia from insufficient calcium replacement.</li>
          <li>Citrate can be used in liver disease with dose adjustment and intensified ionized calcium monitoring; standard liver tests do not predict citrate clearance.</li>
        </ul>
        <h4>3. Schneider, Journois &amp; Rimmelé 2017</h4>
        <p>Complications of regional citrate anticoagulation: accumulation or overload? <em>Crit Care.</em> 2017;21:281. <a href="https://doi.org/10.1186/s13054-017-1880-1" target="_blank" rel="noopener">doi:10.1186/s13054-017-1880-1</a> · PMID 29151020.</p>
        <ul>
          <li>Post-filter ionized calcium target range “0.2 to 0.35 mmol/l according to the protocol used”; calcium reinfusion targets a physiological systemic ionized calcium.</li>
          <li>“After the initiation phase, regular monitoring (every 6 h) of post-filter, systemic, and total calcium levels (with total/ionized ratio calculation) should be performed”; daily magnesium is advisable.</li>
          <li>“A cut-off value of 2.5 is usually recognized as indicative of significant accumulation but a trend towards this value is highly indicative of ongoing accumulation.” Rising calcium needs, hypocalcemia, high anion gap acidosis and rising lactate are warning signs.</li>
          <li>Net citrate overload: alkalosis, normal ratio and ionized calcium; benign, fix by reducing citrate delivery; do not stop therapy.</li>
          <li>Accumulation: lower blood flow, raise dialysate/filtration, or lower citrate target; if no rapid improvement, switch circuit anticoagulation but continue CRRT.</li>
          <li>Lactate threshold above which RCA should not be used “remains to be determined.” Some intoxications (metformin, cyclosporine, paracetamol, trichloroethylene, propofol) can reduce citrate metabolism.</li>
        </ul>
        <h4>4. Morabito, Pistolesi, Tritapepe &amp; Fiaccadori 2014</h4>
        <p>Regional citrate anticoagulation for RRTs in critically ill patients with AKI. <em>Clin J Am Soc Nephrol.</em> 2014;9:2173-2188. <a href="https://doi.org/10.2215/CJN.01280214" target="_blank" rel="noopener">doi:10.2215/CJN.01280214</a> · PMID 24993448.</p>
        <ul>
          <li>Circuit ionized calcium of 0.3–0.4 mmol/L, usually reached with about 3 mmol/L circuit citrate; systemic ionized calcium kept in the normal range.</li>
          <li>Ratio &gt;2.5 “is considered the critical threshold”; a lower cutoff of 2.1 has been reported; cut-offs were derived without albumin adjustment.</li>
          <li>Usual calcium monitoring every 4–6 hours, shortened in patients who may have impaired citrate metabolism.</li>
          <li>Hypernatremia is rare, related to hypertonic citrate without low-sodium fluids; calcium and magnesium losses need replacement; citrated blood products add citrate load.</li>
        </ul>
        <h4>Also cited</h4>
        <p>Link A, et al. Total-to-ionized calcium ratio predicts mortality in CRRT with citrate anticoagulation. <em>Crit Care.</em> 2012;16:R97. <a href="https://doi.org/10.1186/cc11363" target="_blank" rel="noopener">doi:10.1186/cc11363</a> — ratio ≥ 2.4 independently predicted 28-day mortality.</p>
        <p>Meier-Kriesche HU, et al. <em>Crit Care Med.</em> 2001;29:748-752 (PMID 11373461) — early report of a raised total-to-ionized calcium ratio during citrate CVVHD, all in liver failure.</p>
        <h4>Calcium ratio check (arithmetic)</h4>
        <p class="eq">Ratio = total Ca (mmol/L) ÷ ionized Ca (mmol/L)<br>mg/dL ÷ 4 = mmol/L</p>
        <p>Main flag: a ratio above 2.5 (Prismocitrate 18 trial, NCT05399537). A reading above 2.25 is noted as “consider” (Oudemans-van Straaten 2012). Exactly 2.5 is not above the trial flag, so it stays in the “consider” band. Supporting literature: Schneider 2017, usual recognized cut-off of 2.5. Screening marker only.</p>`,
    },
  };

  /* ── About sheets ── */
  const overlay = $("overlay");
  const sheet = $("sheet");
  let lastFocus = null;
  function openSheet(key) {
    const a = ABOUT[key];
    if (!a) return;
    lastFocus = document.activeElement;
    $("sheet-title").textContent = a.title;
    $("sheet-body").innerHTML = a.html;
    overlay.hidden = false;
    sheet.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("open");
      sheet.classList.add("open");
    });
    $("sheet-close").focus();
  }
  function closeSheet() {
    overlay.classList.remove("open");
    sheet.classList.remove("open");
    setTimeout(() => {
      overlay.hidden = true;
      sheet.hidden = true;
    }, 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-about]");
    if (btn) openSheet(btn.getAttribute("data-about"));
  });
  overlay.addEventListener("click", closeSheet);
  $("sheet-close").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet();
  });

  /* ── order sheet rendering (formatting only; no new math) ── */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isWriteIn(value) {
    return !value || /^_+$/.test(value.trim());
  }

  function rowHtml(line) {
    const sub = /^\s/.test(line);
    const trimmed = line.trim();
    const idx = trimmed.indexOf(":");
    if (idx < 0) {
      return trimmed
        ? '<div class="rx-section">' + esc(trimmed) + "</div>"
        : "";
    }
    const label = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1).trim();
    let cls = "rx-row" + (sub ? " sub" : "");
    if (/\bWARNING\b/.test(value)) cls += " flag-warning";
    else if (/\bCAUTION\b/.test(value)) cls += " flag-caution";
    const rv = isWriteIn(value) ? '<span class="line"></span>' : esc(value);
    return (
      '<div class="' +
      cls +
      '"><span class="rk">' +
      esc(label) +
      '</span><span class="rv">' +
      rv +
      "</span></div>"
    );
  }

  function renderSheet(el, rx) {
    if (!el || !rx) return;
    const skip = new Set(["", rx.title, "Draft", "CRRT PRESCRIPTION"]);
    const rowBits = [];
    rx.text.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (skip.has(trimmed) || trimmed === rx.footer) return;
      if (/^Wellness Tech/.test(trimmed)) return;
      rowBits.push(rowHtml(line));
    });
    el.innerHTML = '<div class="rx-rows machine">' + rowBits.join("") + "</div>";
    el.dataset.text = rx.text;
  }

  function bindCopyPrint(btnId, sheetId) {
    const btn = $(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const text = ($(sheetId) && $(sheetId).dataset.text) || "";
      const finish = (ok) => {
        if (!ok) return;
        btn.classList.add("is-copied");
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.textContent = "Copy";
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => finish(false));
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      finish(ok);
    });
  }

  bindCopyPrint("c-rx-copy", "c-rx-sheet");
  $("c-rx-print").addEventListener("click", () => window.print());

  /* ── blood-flow presets ── */
  const QB_PRESETS = ["150", "200", "250", "300"];
  function syncQbChipsFromInput() {
    const raw = String(($("c-qb") && $("c-qb").value) || "").trim();
    const wrap = $("c-qb-wrap");
    const root = $("c-qb-presets");
    if (!root) return;
    let match = "";
    if (raw === "") {
      match = "";
    } else if (QB_PRESETS.indexOf(raw) >= 0) {
      match = raw;
    } else {
      match = "custom";
    }
    $$(".chip", root).forEach((c) => {
      const on = match !== "" && c.dataset.qb === match;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (wrap) wrap.classList.toggle("hidden", match !== "custom" && QB_PRESETS.indexOf(raw) >= 0);
    if (wrap && match === "custom") wrap.classList.remove("hidden");
    if (wrap && raw === "") wrap.classList.add("hidden");
  }
  bindChips("c-qb-presets", (btn) => {
    const v = btn.dataset.qb;
    const wrap = $("c-qb-wrap");
    if (v === "custom") {
      wrap.classList.remove("hidden");
      $("c-qb").focus();
    } else {
      wrap.classList.add("hidden");
      $("c-qb").value = v;
    }
    recalc();
  });
  $("c-qb").addEventListener("input", syncQbChipsFromInput);

  /* ── step flow ── */
  let currentStep = 1;
  const TOTAL_STEPS = 4;

  function stepHint(msg) {
    setText("step-hint", msg || "");
  }

  function canLeaveStep(n) {
    if (n === 2) {
      if (isScuf()) {
        const qnet = num($("c-qnet"));
        if (!(F.isNum(qnet) && qnet > 0)) {
          stepHint("Enter a fluid removal rate greater than 0 mL/h.");
          syncScufUfPrompt();
          if ($("c-qnet")) $("c-qnet").focus();
          return false;
        }
      } else {
        const wt = num($("c-wt"));
        if (!(F.isNum(wt) && wt > 0)) {
          stepHint("Enter the patient’s weight to continue.");
          const msg = $("c-wt-msg");
          if (msg) {
            msg.textContent = "Weight is required, and must be more than 0.";
            msg.classList.add("warn-text");
          }
          if ($("c-wt")) $("c-wt").focus();
          return false;
        }
      }
    }
    if (n === 3) {
      if (!anticoagulation) {
        stepHint("Choose heparin, citrate, or none.");
        return false;
      }
    }
    return true;
  }

  function showStep(n) {
    currentStep = n;
    stepHint("");
    const wtMsg = $("c-wt-msg");
    if (wtMsg && F.isNum(num($("c-wt"))) && num($("c-wt")) > 0) {
      wtMsg.textContent = isScuf()
        ? "Weight is used if you choose heparin. Results update as you type."
        : "Weight is used for the dose and heparin amounts. Results update as you type.";
      wtMsg.classList.remove("warn-text");
    }
    $$(".step").forEach((s) => {
      const on = Number(s.dataset.step) === n;
      s.classList.toggle("is-on", on);
    });
    $$(".stepper-item", $("stepper")).forEach((btn) => {
      const g = Number(btn.dataset.go);
      btn.classList.toggle("is-on", g === n);
      btn.classList.toggle("is-done", g < n);
      if (g === n) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    $("step-back").disabled = n === 1;
    const next = $("step-next");
    if (n === TOTAL_STEPS) {
      next.hidden = true;
    } else {
      next.hidden = false;
      next.textContent = "Next";
    }
    const y = document.querySelector("header.top");
    window.scrollTo(0, 0);
  }

  $("step-back").addEventListener("click", () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });
  $("step-next").addEventListener("click", () => {
    if (currentStep >= TOTAL_STEPS) return;
    if (!canLeaveStep(currentStep)) return;
    showStep(currentStep + 1);
  });
  $("stepper").addEventListener("click", (e) => {
    const btn = e.target.closest(".stepper-item");
    if (!btn) return;
    const go = Number(btn.dataset.go);
    if (!go || go === currentStep) return;
    if (go < currentStep) {
      showStep(go);
      return;
    }
    for (let i = currentStep; i < go; i++) {
      if (!canLeaveStep(i)) return;
    }
    showStep(go);
  });

  /* first paint */
  syncModalityUi();
  syncHeparinBolusUi();
  syncAnticoagPanels();
  syncQbChipsFromInput();
  showStep(1);
  recalc();
})();
