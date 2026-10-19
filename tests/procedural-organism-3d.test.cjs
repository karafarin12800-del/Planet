"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../procedural-organism-3d.js");

function specimen(id, form, dna) {
  return {id, nameEn:"test "+form, form, dna, habitat:form==="fish"?"ocean":"land", generation:4, population:125};
}
const dino = engine.buildMesh(specimen(1,"theropod","ACGT".repeat(42)));
const fish = engine.buildMesh(specimen(2,"fish","TGCA".repeat(42)));
const tree = engine.buildMesh(specimen(3,"tree","AAGC".repeat(42)));
assert.ok(dino.triangles > 100, "dinosaur mesh has useful geometry");
assert.ok(fish.triangles > 50, "fish mesh has useful geometry");
assert.ok(tree.triangles > 40, "plant mesh has useful geometry");
assert.notEqual(dino.triangles, fish.triangles, "different body plans generate distinct meshes");
const sameSequenceDifferentLabel = engine.buildMesh({...specimen(77,"fish","ACGT".repeat(42)), habitat:"land"});
assert.deepEqual(sameSequenceDifferentLabel.groups, dino.groups, "form labels do not select pre-authored geometry templates");
const changedSequence = engine.buildMesh(specimen(1,"theropod","ACGT".repeat(41)+"ACGA"));
assert.notDeepEqual(changedSequence.groups, dino.groups, "changing the digital sequence changes the developmental field geometry");
const wetEnvironment = engine.buildMesh({...specimen(1,"theropod","ACGT".repeat(42)), environment:{temperatureC:8,moisture:0.95,oxygen:0.21}});
assert.notDeepEqual(wetEnvironment.groups, dino.groups, "environmental conditions alter the generated geometry");
assert.equal(dino.provenance.method, "implicit tissue field + marching tetrahedra; no taxon-specific mesh template selected", "provenance records the developmental-field method");
assert.ok(dino.groups.every(g => g.positions.length === g.normals.length), "normal attributes align with positions");
assert.ok(dino.groups.every(g => g.indices.length % 3 === 0), "each mesh uses triangle indices");
assert.ok(dino.bounds.min.every(Number.isFinite) && dino.bounds.max.every(Number.isFinite), "mesh bounds are finite");
for (const g of dino.groups) {
  assert.ok(g.positions.every(Number.isFinite), "all positions are finite");
  assert.ok(g.normals.every(Number.isFinite), "all normals are finite");
  assert.ok(g.indices.every(i => Number.isInteger(i) && i >= 0 && i < g.positions.length / 3), "indices remain in range");
  assert.ok(g.materialIndex >= 0 && g.materialIndex < dino.materials.length, "material assignment is valid");
}
const repeat = engine.buildMesh(specimen(1,"theropod","ACGT".repeat(42)));
assert.deepEqual(repeat.groups, dino.groups, "same identifier and DNA produce reproducible geometry");

const glb = engine.toGLB(dino);
const dv = new DataView(glb);
assert.equal(dv.getUint32(0,true),0x46546c67,"GLB magic bytes are correct");
assert.equal(dv.getUint32(4,true),2,"GLB container version is 2");
assert.equal(dv.getUint32(8,true),glb.byteLength,"GLB total length matches header");
const jsonLength = dv.getUint32(12,true);
assert.equal(dv.getUint32(16,true),0x4e4f534a,"first chunk is JSON");
const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb,20,jsonLength)).trim());
const binHeader = 20 + jsonLength;
assert.equal(dv.getUint32(binHeader+4,true),0x004e4942,"second chunk is BIN");
const binLength = dv.getUint32(binHeader,true);
const binStart = binHeader+8;
assert.ok(json.asset.version === "2.0" && json.asset.extras.scientificCaveat, "scientific limitation is stored in the exported file");
assert.ok(json.meshes[0].primitives.length > 0 && json.materials.length === dino.materials.length, "GLB contains mesh primitives and materials");
assert.ok(json.buffers[0].byteLength <= binLength, "buffer byte length fits binary chunk");
for (const view of json.bufferViews) {
  assert.ok(view.byteOffset >= 0 && view.byteOffset + view.byteLength <= json.buffers[0].byteLength, "buffer view is within the binary buffer");
  assert.equal(view.byteOffset % 4,0,"buffer views begin at four-byte-aligned offsets");
}
for (const primitive of json.meshes[0].primitives) {
  assert.ok(primitive.material >= 0 && primitive.material < json.materials.length, "primitive material index is valid");
  const p = json.accessors[primitive.attributes.POSITION];
  const n = json.accessors[primitive.attributes.NORMAL];
  const ix = json.accessors[primitive.indices];
  assert.equal(p.type,"VEC3");
  assert.equal(n.count,p.count,"normal and position counts match");
  const iv = json.bufferViews[ix.bufferView];
  const indexData = new Uint16Array(glb, binStart + iv.byteOffset, ix.count);
  for (const index of indexData) assert.ok(index < p.count,"every exported index is within the vertex range");
}
const proxyModel = engine.buildMesh({...specimen(5,"mammal","ACGT".repeat(42)),referenceGenome:{accession:"NC_TEST.1"}});
assert.equal(proxyModel.provenance.realGenomeDecodedAsPhenotype,false,"reference genome never claims direct morphology decoding");
assert.match(proxyModel.provenance.claim,/not a scientifically validated prediction/i);
assert.equal(engine.selfTest().ok,true,"built-in self test passes");
const html = fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
assert.match(html,/getSpeciesSnapshot:function\(\)/,"the simulator exposes its organism catalog to the 3D tool");
assert.match(html,/procedural-organism-3d\.js/,"the 3D engine is loaded by the app");
assert.match(html,/id="habitatShow3D"/,"each habitat view can request a procedural model");
assert.match(html,/مدل سه‌بعدی در استودیوی نمایش مستقل/,"3D model preview is labeled as a separate studio view");
const lifeStart = html.indexOf("function drawLife(t)");
const lifeEnd = html.indexOf("function updateLifeUI()", lifeStart);
assert.ok(lifeStart >= 0 && lifeEnd > lifeStart, "Earth globe renderer can be isolated for regression checks");
const globeRenderer = html.slice(lifeStart, lifeEnd);
assert.doesNotMatch(globeRenderer,/PlanetEvolutionModel\.drawOrganism|activeSpecies\(\)/,
  "generated animals must not be drawn or stamped onto the Earth globe");
assert.match(html,/const projected=!!s\.genomeProjectionEvidence/,"reference metadata is distinguished from an imported genome proxy");
const sw = fs.readFileSync(path.join(__dirname,"..","sw.js"),"utf8");
assert.match(sw,/procedural-organism-3d\.js/,"the PWA caches the 3D engine");
async function validateWithKhronos() {
  const validator = require("gltf-validator");
  const report = await validator.validateBytes(new Uint8Array(glb), {
    uri: "planet-procedural-organism.glb",
    maxIssues: 100
  });
  const issues = report.issues || {};
  const errors = (issues.messages || []).filter(issue => issue.severity === 0);
  assert.equal(Number(issues.numErrors || errors.length), 0, "official Khronos glTF Validator must report zero errors: " + JSON.stringify(errors));
  console.log("Khronos glTF Validator:", JSON.stringify({
    errors: issues.numErrors || 0,
    warnings: issues.numWarnings || 0,
    infos: issues.numInfos || 0
  }));
}
validateWithKhronos().then(() => {
  console.log("Planet procedural 3D tests passed:", JSON.stringify({
    version: engine.version, vertices: dino.vertices, triangles: dino.triangles,
    glbBytes: glb.byteLength, forms: ["theropod","fish","tree"]
  }));
}).catch(error => {
  console.error("Procedural GLB validation failed:", error);
  process.exitCode = 1;
});
