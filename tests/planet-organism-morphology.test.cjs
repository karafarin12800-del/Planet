"use strict";
const assert=require("node:assert/strict");
const morphology=require("../planet-organism-morphology.js");
function specimen(form,habitat,appearance,extras){return Object.assign({form,habitat,traits:{appearance:Object.assign({bodyLength:1.2,bodyWidth:.8,bodyHeight:.9,limbCount:4,segmentCount:4},appearance||{})}},extras||{});}
const cases=[
 [specimen("digital-photosynthetic-colony","land",{limbCount:0},{diet:"photosynthetic"}),"photosynthetic-colony"],
 [specimen("digital-filament","shore",{limbCount:0}),"filamentous"],
 [specimen("aquatic","ocean",{limbCount:4}),"aquatic"],
 [specimen("insectoid","land",{limbCount:6,segmentCount:9}),"insectoid"],
 [specimen("serpentine","land",{limbCount:0,tailLength:2}),"serpentine"],
 [specimen("digital-motile-form","land",{limbCount:4}),"quadruped"],
 [specimen("digital-multicellular","land",{limbCount:2}),"biped"],
 [specimen("dragon","land",{limbCount:4,wingSpan:1.7,tailLength:1.8}),"draconic"]
];
for(const [subject,expected] of cases){const profile=morphology.describe(subject);assert.equal(profile.family,expected);assert.ok(profile.instructions.length>80);}
assert.ok(morphology.describe(cases[0][0]).appendages.includes("non-animal"));
assert.ok(morphology.describe(cases[3][0]).appendages.includes("exactly 6"));
assert.ok(morphology.describe(cases[5][0]).appendages.includes("exactly 4"));
assert.ok(morphology.describe(cases[6][0]).appendages.includes("exactly 2"));
console.log("Planet organism morphology diversity tests passed.");
