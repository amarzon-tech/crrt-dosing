/**
 * Tests for the plain-text CRRT prescription generator (standalone, no PD).
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

/* ── CRRT full order ─────────────────────────────────────────────────────── */
section("CRRT full order sheet");

const crrt = Rx.formatCrrtPrescription({
  date: DATE,
  weightKg: 80,
  modality: "cvvh-post",
  targetMlKgH: 25,
  qbMlMin: 150,
  qpreMlH: 0,
  qpostMlH: 1850,
  qdMlH: 0,
  qnetMlH: 150,
  anticoagulation: "citrate",
  prescribedMlKgH: 25,
  deliveredMlKgH: 22.5,
});

eq(crrt.title, "CRRT PRESCRIPTION", "CRRT title");
eq(crrt.date, DATE, "injected date");
eq(crrt.footer, FOOTER, "footer constant");
includes(crrt.text, "CRRT PRESCRIPTION", "starts with title");
includes(crrt.text, "Wellness Tech LLC — CRRT Dosing (draft)", "publisher line");
includes(crrt.text, "Date: November 13, 2026", "date line");
includes(crrt.text, "Patient: ________________", "blank patient name");
includes(crrt.text, "MRN: ________________", "blank MRN");
includes(crrt.text, "Weight: 80 kg", "weight");
includes(crrt.text, "Modality: CVVH (post-filter replacement)", "CVVH post label");
includes(crrt.text, "Target effluent dose: 25.0 mL/kg/h  (2,000 mL/h)", "target in both units");
includes(crrt.text, "Blood flow (Qb): 150 mL/min", "blood flow");
includes(crrt.text, "Replacement: 1,850 mL/h", "total replacement");
includes(crrt.text, "Pre-filter:  0 mL/h", "pre split");
includes(crrt.text, "Post-filter: 1,850 mL/h", "post split");
includes(crrt.text, "Dialysate: 0 mL/h", "dialysate rate");
includes(crrt.text, "Net UF: 150 mL/h", "net UF");
includes(crrt.text, "Anticoagulation: Regional citrate — per institutional protocol", "citrate as entered, protocol-driven");
excludes(crrt.text, "Citrate solution", "no citrate solution write-in");
excludes(crrt.text, "Calcium replacement", "no calcium-replacement line on the prescription card");
excludes(crrt.text, "mmol/h", "no citrate dose is invented");
excludes(crrt.text, "ACD-A", "no citrate solution is invented");
excludes(crrt.text, "0.35", "no iCa target is invented");
includes(crrt.text, "Prescribed dose: 25.0 mL/kg/h", "prescribed dose");
includes(crrt.text, "Delivered dose: 22.5 mL/kg/h", "delivered dose");
excludes(crrt.text, "Filtration fraction", "FF stays on the filter-check, not the prescription card");
excludes(crrt.text, "Fluid composition", "no fluid composition section");
excludes(crrt.text, "bath", "no bath write-in");
excludes(crrt.text, "Bicarbonate", "no bicarbonate composition");
excludes(crrt.text, "Monitoring labs", "no monitoring-labs line on the prescription card");
includes(crrt.text, "Prescriber: ________________", "blank signature");
includes(crrt.text, "Date/time: ________________", "blank sign date");
includes(crrt.text, FOOTER, "required footer");
excludes(crrt.text, "github", "no GitHub URL");
excludes(crrt.text, "amarzon-tech", "no repo name");

/* target mL/h from weight × target when targetMlH omitted */
const targetOnly = Rx.formatCrrtPrescription({
  date: DATE,
  weightKg: 70,
  targetMlKgH: 25,
});
includes(targetOnly.text, "Target effluent dose: 25.0 mL/kg/h  (1,750 mL/h)", "target mL/h is weight × mL/kg/h");

/* ── modality labels ─────────────────────────────────────────────────────── */
section("CRRT modality labels");
eq(Rx.modalityOrderLabel("cvvh-pre"), "CVVH (pre-filter replacement)", "pre");
eq(Rx.modalityOrderLabel("cvvh-mixed"), "CVVH (mixed pre- and post-filter replacement)", "mixed");
eq(Rx.modalityOrderLabel("cvvhd"), "CVVHD", "CVVHD");
eq(Rx.modalityOrderLabel("cvvhdf"), "CVVHDF", "CVVHDF");

const hdf = Rx.formatCrrtPrescription({
  date: DATE,
  modality: "cvvhdf",
  qpreMlH: 500,
  qpostMlH: 500,
  qdMlH: 1000,
  qnetMlH: 100,
});
includes(hdf.text, "Modality: CVVHDF", "HDF modality on sheet");
includes(hdf.text, "Replacement: 1,000 mL/h", "HDF replacement total");
includes(hdf.text, "Pre-filter:  500 mL/h", "HDF pre");
includes(hdf.text, "Post-filter: 500 mL/h", "HDF post");
includes(hdf.text, "Dialysate: 1,000 mL/h", "HDF dialysate");

/* ── anticoagulation as entered; no invented default ─────────────────────── */
section("Anticoagulation as entered");
const acBlank = Rx.formatCrrtPrescription({ date: DATE });
includes(acBlank.text, "Anticoagulation: ________________", "unspecified is a blank write-in");
excludes(acBlank.text, "Regional citrate", "does not invent citrate");
excludes(acBlank.text, "Anticoagulation: Heparin", "does not invent heparin");
excludes(acBlank.text, "Anticoagulation: None", "does not invent none");
excludes(acBlank.text, "Infusion rate:", "no citrate rate when AC not entered");

const acNone = Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "none" });
includes(acNone.text, "Anticoagulation: None", "none as entered");
excludes(acNone.text, "Dose: ________________", "no heparin blanks when none");

const acHepBlank = Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "heparin" });
includes(acHepBlank.text, "Anticoagulation: Unfractionated heparin (pre-filter)", "heparin as entered, pre-filter");
includes(acHepBlank.text, "  Bolus: ________________", "bolus blank when not calculated");
includes(acHepBlank.text, "  Infusion: ________________", "infusion blank when not calculated");
excludes(acHepBlank.text, "Target aPTT:", "no aPTT line unless entered");
excludes(acHepBlank.text, "Monitoring:", "no monitoring line unless entered");
excludes(acHepBlank.text, "Anti-Xa:", "no anti-Xa line unless entered");
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
  heparinApttTarget: "40–45 seconds",
  heparinAntiXa: "",
  heparinMonitoring: "aPTT and platelet count (unit protocol)",
});
includes(acHepFull.text, "Anticoagulation: Unfractionated heparin (pre-filter)", "full heparin header");
includes(acHepFull.text, "  Bolus: 2,400 units  (30 IU/kg)", "computed bolus");
includes(acHepFull.text, "  Infusion: 560 units/h  (7.0 IU/kg/h)  (5.6 mL/h)", "computed infusion with mL/h");
includes(acHepFull.text, "  Target aPTT: 40–45 seconds", "entered aPTT target");
includes(acHepFull.text, "  Monitoring: aPTT and platelet count (unit protocol)", "entered monitoring");
excludes(acHepFull.text, "Anti-Xa:", "anti-Xa omitted when blank");
excludes(acHepFull.text, "  Dose: ________________", "no leftover generic dose blank");

const acHepNoBolus = Rx.formatCrrtPrescription({
  date: DATE,
  anticoagulation: "heparin",
  heparinBolusGiven: false,
  heparinInfusionUnitsH: 400,
  heparinInfusionIuPerKgH: 5,
  heparinApttTarget: "40–45 seconds",
});
includes(acHepNoBolus.text, "  Bolus: none", "no-bolus option");
includes(acHepNoBolus.text, "  Infusion: 400 units/h  (5.0 IU/kg/h)", "infusion without mL/h");
excludes(acHepNoBolus.text, "mL/h", "still no mL/h without concentration");

/* ── missing calculated values stay blank ────────────────────────────────── */
section("CRRT blanks when values are missing");
const empty = Rx.formatCrrtPrescription({ date: DATE });
includes(empty.text, "Weight: ________________", "blank weight");
includes(empty.text, "Modality: ________________", "blank modality");
includes(empty.text, "Target effluent dose: ________________", "blank target");
includes(empty.text, "Blood flow (Qb): ________________", "blank Qb");
includes(empty.text, "Prescribed dose: ________________", "blank prescribed");
includes(empty.text, "Delivered dose: ________________", "blank delivered");
excludes(empty.text, "Filtration fraction", "FF is not on the prescription card");
excludes(empty.text, "Fluid composition", "no bath header when empty");
excludes(empty.text, "K 4", "does not invent a K bath");
excludes(empty.text, "Bicarbonate 25", "does not invent a bicarbonate bath");
excludes(empty.text, "Bicarbonate ______", "no bicarbonate write-in");


section("No fluid composition on the prescription card");
excludes(crrt.text, "Fluid composition / bath", "no bath section on a filled card");
excludes(crrt.text, "    Ca ", "no Ca bath write-in");
excludes(Rx.formatCrrtPrescription({ date: DATE, anticoagulation: "heparin" }).text, "Bicarbonate", "heparin card has no bicarbonate line");

section("No PD in the standalone app");
isTrue(Rx.formatPdPrescription === undefined, "no PD order sheet");
excludes(crrt.text, "PD", "CRRT sheet has no PD text");

/* ── summary ────────────────────────────────────────────────────────────── */
console.log("\n────────────────────────────────────────");
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failed) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All tests passed.");
