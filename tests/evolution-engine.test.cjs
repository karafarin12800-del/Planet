"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../evolution-engine.js");

const gene = "ATGGCTGACGTTCCAAAGTAA";
const dna = Array(8).fill(gene).join("");

assert.equal(dna.length, 168, "synthetic model genome is 8 x 21 bp");
assert.equal(engine.normalizeSyntheticGenome(dna), dna);
assert.equal(engine.normalizeSyntheticGenome("ACGT"), null);
assert.equal(engine.translateGenome(dna).length, 8);

const p1 = engine.phenotypeFromDNA(dna, { ageMa: 4305 });
const p2 = engine.phenotypeFromDNA(dna, { ageMa: 4305 });
assert.deepEqual(p1, p2, "same genotype and age must produce deterministic phenotype");
assert.equal(p1.proteins.length, 8);
assert.equal(p1.geneModules.length, 8);
assert.ok(p1.signals.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
assert.ok(p1.appearance.bodyLength > 0);
assert.ok(p1.appearance.tailLength > 0);
assert.ok(p1.appearance.headSize > 0);
assert.equal(p1.model.verifiedBiologicalPhenotype, false);

// Regression: small sequence changes must influence multiple visible morphology channels,
// not only hue. The synthetic mapping remains illustrative, not a validated biological decoder.
const shapeVariants = Array.from({length: 12}, (_, i) => {
  const bases = dna.split("");
  bases[3 + i] = "ACGT"[(i + 1) % 4];
  return engine.phenotypeFromDNA(bases.join(""), { ageMa: 4320 }).appearance;
});
assert.ok(new Set(shapeVariants.map(a => a.bodyProfile)).size >= 10,
  "different DNA sequences should produce diverse body profiles");
assert.ok(new Set(shapeVariants.map(a => a.headProfile)).size >= 10,
  "different DNA sequences should produce diverse head profiles");
assert.ok(shapeVariants.every(a => a.limbCount === 0 || a.limbCount === 2 || a.limbCount === 4 || a.limbCount === 6),
  "appendage count stays within supported modeled categories");

let rngState = 123456789;
const deterministicRng = () => { rngState = (1664525 * rngState + 1013904223) >>> 0; return rngState / 4294967296; };
const mutated = engine.mutateSyntheticGenome(dna, 1, deterministicRng);
assert.equal(mutated.length, dna.length);
assert.ok(mutated.startsWith("ATG"), "start codons remain protected");
for (let i = 0; i < 8; i++) assert.ok(["TAA", "TAG", "TGA"].includes(mutated.slice(i * 21 + 18, i * 21 + 21)));

const proxy = engine.projectReferenceGenome({
  name: "NC_000913.3",
  format: "FASTA",
  total: 420,
  gcPct: 50.2,
  amb: 0,
  records: [{ id: "NC_000913.3", seq: "ATGGCTGACGTTCCAAAGTAA".repeat(20) }],
  loadedAt: "2026-10-18T00:00:00Z"
});
assert.equal(proxy.proxyDNA.length, 168);
assert.equal(proxy.summary.sourceGenomeBp, 420);
assert.equal(proxy.evidence.verifiedBiologicalPhenotype, false);
assert.equal(proxy.evidence.sourceSequenceUsedAsFullGenotype, false);

assert.ok(["digital-multicellular", "digital-filament", "digital-photosynthetic-colony"].includes(engine.inferForm(p1, 4310, "land")),
  "late terrestrial lineages must receive generic digital morphologies, not real taxon names");
assert.ok(p1.cellSizeMicrometers >= 0.5 && p1.cellSizeMicrometers <= 5,
  "cell-size estimate must remain within the illustrative microbial range");
assert.ok(p1.preferredPH >= 5 && p1.preferredPH <= 9, "model pH preference must be bounded");
assert.ok(p1.preferredSalinityPsu >= 0.5 && p1.preferredSalinityPsu <= 40, "model salinity preference must be bounded");
assert.equal(typeof p1.estimatedBodyLengthMm, "number",
  "multicellular-stage organisms expose an explicitly uncalibrated body-size estimate");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /function renderSpeciesArtworks\(container\)/, "species cards must use the procedural renderer");
assert.match(html, /renderSpeciesArtworks\(box\)/, "species cards must draw canvas thumbnails after DOM creation");
const habitatStartForTest = html.indexOf("function drawHabitatScene(time)");
const habitatEndForTest = html.indexOf("function drawLife(t)", habitatStartForTest);
assert.ok(habitatStartForTest >= 0 && habitatEndForTest > habitatStartForTest, "habitat and globe renderer functions must be present");
assert.match(html.slice(habitatStartForTest, habitatEndForTest), /PlanetEvolutionModel\.drawOrganism/, "habitat agents must render their form, not a shared cell ellipse");

function rendererCounts(form) {
  const counts = {};
  const methods = ["beginPath","closePath","ellipse","fill","lineTo","moveTo","quadraticCurveTo","rotate","save","restore","stroke","translate"];
  const ctx = {};
  for (const method of methods) ctx[method] = () => { counts[method] = (counts[method] || 0) + 1; };
  const agent = { traits: p1, angle: 0 };
  engine.drawOrganism(ctx, { form, traits: p1, appearance: p1.appearance }, agent, 40, 40, 12, 1, 1);
  return counts;
}
const visualForms = ["microbe","fish","amphibian","bird","sauropod","theropod","armoredDino","mammal","humanoid","insect","tree","fungus"];
const visualSignatures = visualForms.map(form => {
  const counts = rendererCounts(form);
  assert.ok((counts.beginPath || 0) > 0, form + " must produce visible paths");
  assert.ok((counts.fill || 0) > 0 || (counts.stroke || 0) > 0, form + " must draw non-empty shapes");
  return JSON.stringify(counts);
});
assert.ok(new Set(visualSignatures).size >= 7, "distinct body plans must render as different shapes rather than one generic cell");

assert.equal(engine.selfTest().ok, true);
console.log("Planet evolution engine tests passed:", engine.selfTest());
