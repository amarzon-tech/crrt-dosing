/**
 * Static checks for the standalone CRRT Dosing app:
 * draft flag, noindex, robots, offline/no-tracking, simple data entry.
 * Run: node tests/static.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0;
let failed = 0;
const failures = [];
function isTrue(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(msg);
  }
}
function section(name) {
  console.log("\n▸ " + name);
}

const html = read("index.html");
const app = read("js/app.js");
const cfg = require("../js/config.js");
const sw = read("sw.js");
const shipped = ["index.html", "404.html", "js/app.js", "js/formulas.js", "js/prescription.js", "js/config.js", "css/styles.css", "css/standalone.css", "manifest.json", "sw.js"];

section("Draft flag, banner, noindex, robots");
isTrue(cfg.DRAFT === true, "DRAFT must be true until Dr D signs off");
isTrue(/id="draft-banner"/.test(html), "draft banner element present");
isTrue(/<meta name="robots" content="noindex, nofollow">/.test(html), "index.html noindex");
isTrue(/<meta name="robots" content="noindex/.test(read("404.html")), "404.html noindex");
isTrue(/User-agent: \*\s+Disallow: \//.test(read("robots.txt")), "robots.txt disallows all");
isTrue(/id="cit-draft-tag"/.test(html) && /CITRATE_DRAFT_LABEL/.test(app), "citrate content carries the draft label from config");
isTrue(!fs.existsSync(path.join(root, "CNAME")), "no custom domain");
const review = read("CONTENT_REVIEW.md");
isTrue(/Dr D confirmed defaults Nov 14 2026/.test(review), "CONTENT_REVIEW records confirmed defaults");
isTrue(!(/^- \[x\]/m).test(review) && !(/^- \[X\]/m).test(review), "no sign-off boxes ticked");
isTrue(/DRAFT=true/.test(review), "review file still requires DRAFT=true");

section("Offline, no login, no tracking, no stored data");
shipped.forEach((f) => {
  const t = read(f);
  isTrue(!/github\.com/i.test(t), f + ": no github.com URL");
  isTrue(!/google-analytics|googletagmanager|gtag\(|plausible|segment\.io|hotjar|mixpanel|facebook\.net/i.test(t), f + ": no analytics");
  isTrue(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(t), f + ": no stored data");
  isTrue(!/fetch\(\s*["']http|XMLHttpRequest|navigator\.sendBeacon/.test(t), f + ": no outbound requests");
});
isTrue(!/<script[^>]+src="http/i.test(html), "no remote scripts");
isTrue(!/<link[^>]+href="http/i.test(html), "no remote stylesheets or fonts");
isTrue(!/type="password"|<form|sign in|log in/i.test(html), "no login form");
["./css/standalone.css", "./js/app.js", "./js/formulas.js", "./js/prescription.js", "./js/config.js"].forEach((a) =>
  isTrue(sw.includes('"' + a + '"'), "service worker caches " + a)
);

section("No PD content");
isTrue(!/peritoneal|Kt\/V|PET\b|CAPD|APD\b/i.test(html), "index.html has no PD content");
isTrue(!/panel-pd|tab-pd/.test(html + app), "no PD tab");

section("Simple data entry");
const inputs = html.match(/<input [^>]*>/g) || [];
const textInputs = inputs.filter((i) => /type="text"/.test(i));
isTrue(textInputs.length > 0, "has text inputs");
textInputs.forEach((i) => {
  const id = (i.match(/id="([^"]+)"/) || [])[1];
  isTrue(/inputmode="(decimal|numeric)"/.test(i), id + ": numeric keypad");
  isTrue(/aria-label="[^"]+"/.test(i), id + ": has a label");
});
isTrue(textInputs.length === 11, "11 number fields total (dose 3, filter check 3, heparin 3, calcium ratio 2); got " + textInputs.length);
isTrue(!/>\s*Calculate\s*</i.test(html), "no Calculate button");
isTrue(/id="c-target"[^>]*value="25"/.test(html), "target dose prefilled 25");
isTrue(/id="c-qnet"[^>]*value="0"/.test(html), "net UF prefilled 0");
isTrue(/id="c-hep-bolus"[^>]*value="30"/.test(html), "heparin bolus prefilled 30");
isTrue(/id="c-hep-rate"[^>]*value="7"/.test(html), "heparin infusion prefilled 7");
isTrue((html.match(/class="tag">default/g) || []).length >= 5, "defaults are labeled as defaults");
isTrue(/document\.addEventListener\("input"/.test(app), "results update live on input");


section("Step-by-step flow");
["id=\"step-1\"", "id=\"step-2\"", "id=\"step-3\"", "id=\"step-4\""].forEach((k) =>
  isTrue(html.includes(k), "has " + k)
);
isTrue(/id="step-back"/.test(html) && /id="step-next"/.test(html), "Back and Next buttons");
isTrue(/id="stepper"/.test(html) && /data-go="1"/.test(html) && /data-go="4"/.test(html), "step indicator");
isTrue(/data-qb="150"/.test(html) && /data-qb="200"/.test(html) && /data-qb="250"/.test(html) && /data-qb="300"/.test(html), "common blood-flow chips");
isTrue(/data-qb="custom"/.test(html), "custom blood-flow option");
isTrue(/function showStep/.test(app), "wizard showStep is implemented");
isTrue(/Enter the patient.s weight/.test(app), "weight is required before leaving step 2");

section("Heparin bolus Yes / No");
isTrue(/id="c-hep-bolus-lbl">Bolus</.test(html), "plain Bolus label");
isTrue(/data-bolus="yes">Yes</.test(html) && /data-bolus="no">No</.test(html), "Yes / No toggle");
isTrue(!/>Give bolus</.test(html) && !/>No bolus</.test(html), "old Give bolus / No bolus labels are gone");
isTrue(/syncHeparinBolusUi/.test(app) && /c-hep-bolus-metric/.test(app), "No bolus hides the bolus output");
isTrue(/giveBolus: heparinGiveBolus/.test(app), "no-bolus flag is passed to the calculator");

section("Citrate accumulation predictors (Schultheiß 2012)");
["Predictors of citrate accumulation risk", "≥3.4 mmol/L", "≤26%", "Prothrombin time",
 "not trial exclusions", "not as INR", "Schultheiß", "10.1186/cc11485", "R162"].forEach((k) =>
  isTrue(html.includes(k), "predictors mention: " + k)
);
isTrue(!/INR \d/.test(html) && !/INR of/.test(html) && !/INR ≥/.test(html) && !/INR ≤/.test(html), "no invented INR cut-off");

section("Draft prescription card, no fluid composition");
isTrue(/id="rx-card"/.test(html) && /id="rx-draft-tag"/.test(html), "prescription card is labeled as a draft");
const rxjs = read("js/prescription.js");
isTrue(!(html + app + rxjs).includes("Fluid composition / bath"), "no bath composition section in the app");
isTrue(!/Bicarbonate/.test(rxjs), "prescription formatter does not mention bicarbonate");
isTrue(/Prescribed dose:/.test(rxjs) && /Delivered dose:/.test(rxjs), "prescription includes prescribed and delivered dose");

section("Citrate precautions content");
["Follow your institution", "Severe liver failure", "shock liver", "lactic acidosis", "Post-filter ionized calcium",
 "Systemic ionized calcium", "Total-to-ionized calcium ratio", "2.5", "Metabolic alkalosis", "Hypernatremia",
 "Hypocalcemia", "Hypomagnesemia", "If accumulation is suspected", "keep CRRT running", "KDIGO"].forEach((k) =>
  isTrue(html.includes(k), "precautions mention: " + k)
);
["10.1186/cc11645", "10.1186/s13054-017-1880-1", "10.2215/CJN.01280214", "Kidney Int Suppl"].forEach((k) =>
  isTrue(html.includes(k), "reference listed: " + k)
);

section("Prismocitrate 18 reference protocol (NCT05399537)");
["Reference protocol: Prismocitrate 18 (NCT05399537)", "not a Bon Secours Richmond policy",
 "0.25–0.35", "1.0–1.3", "&gt;2.5", "above 2.5", "pre-dilution only", "3 mmol/L of blood",
 "Child-Pugh score &gt;10", "lactate &gt;4 mmol/L", "prior citrate toxicity",
 "does not calculate citrate or calcium doses"].forEach((k) =>
  isTrue(html.includes(k), "protocol block mentions: " + k)
);
isTrue(html.includes("&lt;0.9") && html.includes("&gt;1.4"), "trial safety cut-offs <0.9 and >1.4 are shown");
isTrue(html.includes("NCT05399537") && html.includes("clinicaltrials.gov/study/NCT05399537"), "trial identifier and record URL are listed");
isTrue(/Main flag: a ratio <strong>above 2.5<\/strong>/.test(html), "ratio check names >2.5 as the main flag");
isTrue(app.includes("Above 2.5 — accumulation by the trial definition"), "ratio reading uses the trial >2.5 wording");
isTrue(app.includes("Above 2.25 — consider accumulation"), "softer >2.25 consider note is kept");
isTrue(!/citrateInfusionRate|calciumReplacement|citrate dose calculator/i.test(html + app), "no citrate or calcium dose calculator added");

console.log("\n────────────────────────────────────────");
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failed) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All tests passed.");
