const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const html = fs.readFileSync('genome-evidence.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match, 'the evidence page must contain its analysis script');

const elements = new Map();
function fakeElement(id) {
  if (elements.has(id)) return elements.get(id);
  const el = {
    id, value: '', textContent: '', innerHTML: '', className: '', disabled: false,
    files: [], style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, setAttribute() {}, appendChild() {}, remove() {},
    click() {}, focus() {}
  };
  elements.set(id, el);
  return el;
}
const document = {
  getElementById: fakeElement,
  createElement: fakeElement,
  body: { appendChild() {} }
};
const windowStub = { addEventListener() {}, crypto: webcrypto };
windowStub.parent = windowStub;
const context = {
  window: windowStub, document, crypto: webcrypto, TextEncoder, TextDecoder,
  Uint8Array, DataView, Blob, Response, DecompressionStream, URL,
  setTimeout, clearTimeout, history: { back() {} }, console
};
vm.createContext(context);
vm.runInContext(match[1], context, { filename: 'genome-evidence-inline.js' });
const core = windowStub.PlanetGenomeEvidenceCore;
assert.ok(core, 'analysis core should be exported for deterministic tests');

(async () => {
  const fasta = '>chromosome test\nACGTNN\n>plasmid\nGGCC\n';
  const records = core.parseFasta(fasta);
  assert.equal(records.length, 2);
  assert.equal(records[0].seq, 'ACGTNN');
  const report = await core.analyzeRecords(records);
  assert.equal(report.total_length_bp, 10);
  assert.equal(report.record_count, 2);
  assert.equal(report.canonical_bases, 8);
  assert.equal(report.ambiguous_bases, 2);
  assert.equal(report.n_count, 2);
  assert.equal(report.base_counts.A, 1);
  assert.equal(report.base_counts.C, 3);
  assert.equal(report.base_counts.G, 3);
  assert.equal(report.base_counts.T, 1);
  assert.equal(report.gc_percent_canonical, 75);
  assert.equal(report.kmer_2_total_windows, 6);
  assert.equal(report.kmer_3_total_windows, 4);
  assert.equal(report.features.length, 0);

  const gb = [
    'LOCUS       TESTSEQ                 12 bp    DNA     linear   BCT 01-JAN-2000',
    'DEFINITION  Test sequence for parser validation.',
    'ACCESSION   TEST123',
    'VERSION     TEST123.1',
    'FEATURES             Location/Qualifiers',
    '     source          1..12',
    '                     /organism="Bacillus testus"',
    '     gene            1..9',
    '                     /gene="abc"',
    '     CDS             1..9',
    '                     /gene="abc"',
    '                     /locus_tag="ABC_1"',
    '                     /product="hypothetical protein"',
    '                     /translation="MPK"',
    'ORIGIN',
    '        1 atggccattgta',
    '//',
    ''
  ].join('\n');
  const gbRecords = core.parseGenBank(gb);
  assert.equal(gbRecords.length, 1);
  assert.equal(gbRecords[0].seq, 'ATGGCCATTGTA');
  assert.equal(gbRecords[0].accession, 'TEST123.1');
  const gbReport = await core.analyzeRecords(gbRecords);
  assert.equal(gbReport.total_length_bp, 12);
  assert.equal(gbReport.CDS_feature_count, 1);
  assert.equal(gbReport.feature_counts.source, 1);
  assert.equal(gbReport.feature_counts.gene, 1);
  assert.equal(gbReport.CDS_union_coverage_percent, 75);
  const cds = gbReport.features.find(f => f.key === 'CDS');
  assert.equal(cds.gene, 'abc');
  assert.equal(cds.locus_tag, 'ABC_1');
  assert.equal(cds.product, 'hypothetical protein');
  assert.equal(cds.translation_length_aa, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(cds.qualifiers, 'translation'), false);

  assert.throws(() => core.parseFasta('>bad protein\nMKWVTF'), /non-nucleotide|نماد غیرنوکلئوتیدی/);
  console.log('Genome evidence tests passed: whole-sequence statistics, k-mers, GenBank annotations and translation trimming.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
