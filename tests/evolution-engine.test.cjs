"use strict";
const assert = require("node:assert/strict");
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

assert.equal(engine.inferForm(p1, 4310, "land") === "fish", false);
assert.equal(engine.selfTest().ok, true);
console.log("Planet evolution engine tests passed:", engine.selfTest());
