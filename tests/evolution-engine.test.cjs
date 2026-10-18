"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../evolution-engine.js");
const lineage = require("../lineage-model.js");

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

assert.ok(["sauropod", "theropod", "armoredDino"].includes(engine.inferForm(p1, 4310, "land")), "dinosaur-era terrestrial genomes must select a modeled dinosaur body plan");

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


const chronology = lineage.validate();
assert.equal(chronology.ok,true,"lineage chronology and conversion must be consistent");
assert.ok(lineage.events.every((e,i)=>i===0||lineage.events[i-1].earthAgeMa<=e.earthAgeMa),"events must be sorted by Earth age");
assert.equal(lineage.toMaBeforePresent(4539.7),0.3,"4539.7 Ma after Earth formed is about 300 ka before present");
assert.ok(lineage.branches.find(b=>b.key==="human").pathFa.includes("نخستی‌ها"),"human branch must pass through primates");
assert.ok(lineage.branches.find(b=>b.key==="insects").pathFa.includes("بندپایان"),"insects must be an arthropod branch");
const highCognition={...p1,cognition:1,motility:1,appearance:{...p1.appearance,wingSpan:.2}};
assert.equal(engine.inferForm(highCognition,4539.9,"land"),"mammal","random cognition must not infer Homo sapiens");
assert.equal(engine.selfTest().ok, true);
console.log("Planet evolution engine tests passed:", engine.selfTest());
