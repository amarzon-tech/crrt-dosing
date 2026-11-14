/**
 * Tests for the machine-setting CRRT prescription (standalone, no PD).
 * Run: node tests/prescription.test.js
 * These tests check wording and formatting only. They do not re-compute formulas.
 */
"use strict";

const Rx = require("../js/prescription.js");

let passed = 0;
let failed = 0;
const failures = [];

function eq(actual, expected, msg) {
  if (actual === expected) passed++;
  else {
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

function includes(text, snippet, msg) {
  isTrue(typeof text === "string" && text.includes(snippet), msg + ` (looking for ${JSON.stringify(snippet)})`);
}

function excludes(text, snippet, msg) {
  isTrue(typeof text === "string" && !text.includes(snippet), msg + ` (should not contain ${JSON.stringify(snippet)})`);
}

function section(name) {
  console.log("\n· " + name);
}

const DATE = "November 13, 2026";
const FOOTER = "Draft – verify before use; clinical judgment required";

section("Machine prescription — CVVH post with citrate");

const crrt = Rx.formatCrrtPrescription({
  date: DATE,
  weightKg: 80,
  modality: "cvvh-post",
  targetMlKgH: 25,
  qbMlMin: 200,
  qpreMlH: 0,
  qpostMlH: 2000,
  qdMlH: 0,
  qnetMlH: 0,
  anticoagulation: "citrate",
  prescribedMlKgH: 25,
  deliveredMlKgH: 25,
  ffPct: 23.8,
});

eq(crrt.title, "CRRT PRESCRIPTION", "title");
eq(crrt.footer, FOOTER, "footer constant still exported");
includes(crrt.text, "CRRT PRESCRIPTION", "title in text");
includes(crrt.text, "Draft", "draft label");
includes(crrt.text, "Modality: CVVH (post-filter replacement)", "modality");
includes(crrt.text, "Blood flow: 200 mL/min", "blood flow");
includes(crrt.text, "Post-filter replacement: 2,000 mL/h", "post-filter rate");
includes(crrt.text, "Patient fluid removal: 0 mL/h", "net UF including a zero goal");
includes(crrt.text, "Anticoagulation: Citrate per unit protocol", "citrate wording when no rate is calculated");
includes(crrt.text, "Calcium: per unit protocol", "calcium stays protocol-only without entered solution values");
excludes(crrt.text, "Prismocitrate 18 (pre-filter)", "no Prismocitrate rate without citrateRateMlH");
excludes(crrt.text, "Pre-filter replacement", "omits unused pre-filter line");
excludes(crrt.text, "Dialysate:", "omits unused / zero dialysate");
excludes(crrt.text, "Weight:", "weight is not on the prescription card");
excludes(crrt.text, "Prescribed dose", "prescribed dose is not on the prescription card");
excludes(crrt.text, "Delivered dose", "delivered dose is not on the prescription card");
excludes(crrt.text, "Filtration fraction", "FF is not on the prescription card");
excludes(crrt.text, "Target effluent", "target dose is not on the prescription card");
excludes(crrt.text, "Citrate solution", "no citrate rate");
excludes(crrt.text, "mmol/h", "no invented citrate dose");
excludes(crrt.text, "Fluid composition", "no bath section");
excludes(crrt.text, "Bicarbonate", "no bicarbonate composition");
excludes(crrt.text, "Patient:", "no patient write-in on the machine list");
excludes(crrt.text, "github", "no GitHub URL");
excludes(crrt.text, "amarzon-tech", "no repo name");

section("CVVHDF rates — only used lines");

const hdf = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvhdf",
  qbMlMin: 150,
  qpreMlH: 500,
  qpostMlH: 500,
  qdMlH: 1000,
  qnetMlH: 100,
});
includes(hdf.text, "Modality: CVVHDF", "HDF modality");

const hdfPost = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvhdf",
  qbMlMin: 200,
  qdMlH: 1000,
  qpreMlH: 0,
  qpostMlH: 1000,
  qnetMlH: 0,
  anticoagulation: "citrate",
});
includes(hdfPost.text, "Dialysate: 1,000 mL/h", "CVVHDF Post dialysate");
includes(hdfPost.text, "Post-filter replacement: 1,000 mL/h", "CVVHDF Post replacement");
excludes(hdfPost.text, "Pre-filter replacement", "CVVHDF Post omits unused pre line");

const hdfMixed = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvhdf",
  qbMlMin: 200,
  qdMlH: 1000,
  qpreMlH: 500,
  qpostMlH: 500,
  qnetMlH: 0,
  anticoagulation: "citrate",
});
includes(hdfMixed.text, "Pre-filter replacement: 500 mL/h", "CVVHDF Mixed shows pre and post rates");
includes(hdfMixed.text, "Post-filter replacement: 500 mL/h", "CVVHDF Mixed post rate");
includes(hdf.text, "Blood flow: 150 mL/min", "HDF blood flow");
includes(hdf.text, "Dialysate: 1,000 mL/h", "HDF dialysate");
includes(hdf.text, "Pre-filter replacement: 500 mL/h", "HDF pre");
includes(hdf.text, "Post-filter replacement: 500 mL/h", "HDF post");
includes(hdf.text, "Patient fluid removal: 100 mL/h", "HDF net UF");
excludes(hdf.text, "Replacement: 1,000", "no combined replacement total line");

section("Omit unused blood flow and rates");

const noQb = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvh-pre",
  qpreMlH: 2000,
  qpostMlH: 0,
  qdMlH: 0,
  qnetMlH: 50,
});
excludes(noQb.text, "Blood flow:", "omits blood flow when not entered");
includes(noQb.text, "Pre-filter replacement: 2,000 mL/h", "pre rate shown");
excludes(noQb.text, "Post-filter replacement", "omits zero post-filter");
includes(noQb.text, "Modality: CVVH (pre-filter replacement)", "pre modality");

section("Anticoagulation as entered");

const acBlank = Rx.formatCrrtPrescription({ date: DATE, modality: "cvvh-post" });
includes(acBlank.text, "Anticoagulation: ________________", "unspecified is a blank write-in");
excludes(acBlank.text, "Citrate per unit protocol", "does not invent citrate");
excludes(acBlank.text, "Anticoagulation: Heparin", "does not invent heparin");
excludes(acBlank.text, "Anticoagulation: None", "does not invent none");

const acNone = Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "none" });
includes(acNone.text, "Anticoagulation: None", "none as entered");
excludes(acNone.text, "Bolus:", "no heparin bolus when none");

const acHepBlank = Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "heparin" });
includes(acHepBlank.text, "Anticoagulation: Heparin", "heparin as entered");
includes(acHepBlank.text, "Bolus: ________________", "bolus blank when not calculated");
includes(acHepBlank.text, "Infusion: ________________", "infusion blank when not calculated");
excludes(acHepBlank.text, "Target aPTT", "no aPTT line on the machine list");
excludes(acHepBlank.text, "Monitoring:", "no monitoring line");
excludes(acHepBlank.text, "mL/h", "no mL/h when concentration not entered");

const acHepFull = Rx.formatCrrtPrescription({
  date: DATE,
  weightKg: 80,
  anticoagulation: "heparin",
  heparinBolusGiven: true,
  heparinBolusUnits: 2400,
  heparinBolusIuPerKg: 30,
  heparinInfusionUnitsH: 560,
  heparinInfusionIuPerKgH: 7,
  heparinInfusionMlH: 5.6,
});
includes(acHepFull.text, "Anticoagulation: Heparin", "full heparin header");
includes(acHepFull.text, "Bolus: 2,400 units", "bolus in units");
includes(acHepFull.text, "Infusion: 560 units/h", "infusion in units/h");
includes(acHepFull.text, "Infusion pump: 5.6 mL/h", "pump rate when bag strength entered");
excludes(acHepFull.text, "IU/kg", "IU/kg is not a machine setting");

const acHepNoBolus = Rx.formatCrrtPrescription({
  date: DATE,
  anticoagulation: "heparin",
  heparinBolusGiven: false,
  heparinInfusionUnitsH: 400,
  heparinInfusionIuPerKgH: 5,
});
includes(acHepNoBolus.text, "Bolus: none", "no-bolus option");
includes(acHepNoBolus.text, "Infusion: 400 units/h", "infusion without mL/h");
excludes(acHepNoBolus.text, "mL/h", "no mL/h without concentration");

section("Dose check is separate from the prescription");

const dc = Rx.formatDoseCheck({
  weightKg: 80,
  prescribedMlKgH: 25,
  deliveredMlKgH: 22.5,
  ffPct: 18.2,
});
includes(dc.text, "Dose check", "dose-check title");
includes(dc.text, "Weight: 80 kg", "weight on dose check");
includes(dc.text, "Prescribed dose: 25.0 mL/kg/h", "prescribed on dose check");
includes(dc.text, "Delivered dose: 22.5 mL/kg/h", "delivered on dose check");
includes(dc.text, "Filtration fraction: 18.2%", "FF on dose check");
excludes(crrt.text, dc.text.split("\n")[0] === "Dose check" ? "Dose check" : "___", "prescription text is not the dose-check block");

section("No fluid composition");
excludes(crrt.text, "bath", "no bath");
excludes(crrt.text, "K 4", "does not invent a K bath");
excludes(Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "heparin" }).text, "Bicarbonate", "heparin card has no bicarbonate");

section("No PD in the standalone app");
isTrue(Rx.formatPdPrescription === undefined, "no PD order sheet");
excludes(crrt.text, "PD", "CRRT sheet has no PD text");

section("Modality labels");
eq(Rx.modalityOrderLabel("cvvh-pre"), "CVVH (pre-filter replacement)", "pre");
eq(Rx.modalityOrderLabel("scuf"), "SCUF", "SCUF");
eq(Rx.modalityOrderLabel("cvvh-mixed"), "CVVH (mixed pre- and post-filter replacement)", "mixed");
eq(Rx.modalityOrderLabel("cvvhd"), "CVVHD", "CVVHD");
eq(Rx.modalityOrderLabel("cvvhdf"), "CVVHDF", "CVVHDF");
eq(Rx.modalityOrderLabel("cvvh-post"), "CVVH (post-filter replacement)", "post");

section("SCUF prescription");
const scuf = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "scuf",
  qbMlMin: 200,
  qnetMlH: 100,
  qdMlH: 999,
  qpreMlH: 999,
  qpostMlH: 999,
  anticoagulation: "none",
});
includes(scuf.text, "Modality: SCUF", "SCUF modality");
includes(scuf.text, "Blood flow: 200 mL/min", "SCUF blood flow");
includes(scuf.text, "Patient fluid removal: 100 mL/h", "SCUF fluid removal");
includes(scuf.text, "Anticoagulation: None", "SCUF anticoagulation");
excludes(scuf.text, "Dialysate", "SCUF has no dialysate line");
excludes(scuf.text, "replacement", "SCUF has no replacement line");
excludes(scuf.text, "Prescribed dose", "SCUF prescription has no prescribed dose");
excludes(scuf.text, "Delivered dose", "SCUF prescription has no delivered dose");
excludes(scuf.text, "mL/kg/h", "SCUF prescription has no dose in mL/kg/h");
const scufDc = Rx.formatDoseCheck({ modality: "scuf", weightKg: 80, prescribedMlKgH: 25, deliveredMlKgH: 22.5, ffPct: 2.4 });
excludes(scufDc.text, "Prescribed dose", "SCUF dose check hides prescribed dose");
excludes(scufDc.text, "Delivered dose", "SCUF dose check hides delivered dose");
includes(scufDc.text, "Filtration fraction: 2.4%", "SCUF dose check can show FF");

section("Machine prescription — citrate rate and optional calcium");
const citRx = Rx.formatCrrtPrescription({
  date: DATE,
  weightKg: 80,
  modality: "cvvh-post",
  targetMlKgH: 25,
  qbMlMin: 150,
  qpreMlH: 1500,
  qpostMlH: 2000,
  qdMlH: 0,
  qnetMlH: 0,
  anticoagulation: "citrate",
  citrateRateMlH: 1500,
});
includes(citRx.text, "Blood flow: 150 mL/min", "citrate rx blood flow");
includes(citRx.text, "Prismocitrate 18 (pre-filter): 1,500 mL/h", "verified citrate rate is a machine line");
includes(citRx.text, "Post-filter replacement: 2,000 mL/h", "post-filter remains");
includes(citRx.text, "Anticoagulation: Citrate", "citrate label when a rate is calculated");
includes(citRx.text, "Calcium: per unit protocol", "calcium protocol when no start rate");
excludes(citRx.text, "Citrate per unit protocol", "protocol-only citrate line is replaced when a rate is verified");
excludes(citRx.text, "Pre-filter replacement", "does not list pre-filter twice");

const citCa = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvh-post",
  qbMlMin: 150,
  qpostMlH: 2000,
  qnetMlH: 0,
  anticoagulation: "citrate",
  citrateRateMlH: 1500,
  calciumRateMlH: 29.41176470588235,
});
includes(citCa.text, "Calcium infusion: 29.4 mL/h", "calculated calcium start rate on the card");
excludes(citCa.text, "Calcium: per unit protocol", "protocol calcium line is replaced when a rate is verified");

const scufCit = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "scuf",
  qbMlMin: 150,
  qnetMlH: 100,
  anticoagulation: "citrate",
  citrateRateMlH: 1500,
});
includes(scufCit.text, "Modality: SCUF", "SCUF + citrate modality");
includes(scufCit.text, "Prismocitrate 18 (pre-filter): 1,500 mL/h", "citrate pre-filter is shown even on SCUF");
includes(scufCit.text, "Patient fluid removal: 100 mL/h", "SCUF net UF kept");
excludes(scufCit.text, "Dialysate", "SCUF + citrate still has no dialysate");
excludes(scufCit.text, "Post-filter", "SCUF + citrate has no post-filter line");

console.log("\n────────────────────────────────────────");
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failed) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All tests passed.");
