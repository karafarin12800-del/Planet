(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.PlanetEvolutionModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GENE_LENGTH = 21;
  const GENE_COUNT = 8;
  const GENOME_LENGTH = GENE_LENGTH * GENE_COUNT;
  const BASES = ["A", "C", "G", "T"];
  const CODON_TABLE = {
    TTT:"F",TTC:"F",TTA:"L",TTG:"L",TCT:"S",TCC:"S",TCA:"S",TCG:"S",TAT:"Y",TAC:"Y",TAA:"*",TAG:"*",TGT:"C",TGC:"C",TGA:"*",TGG:"W",
    CTT:"L",CTC:"L",CTA:"L",CTG:"L",CCT:"P",CCC:"P",CCA:"P",CCG:"P",CAT:"H",CAC:"H",CAA:"Q",CAG:"Q",CGT:"R",CGC:"R",CGA:"R",CGG:"R",
    ATT:"I",ATC:"I",ATA:"I",ATG:"M",ACT:"T",ACC:"T",ACA:"T",ACG:"T",AAT:"N",AAC:"N",AAA:"K",AAG:"K",AGT:"S",AGC:"S",AGA:"R",AGG:"R",
    GTT:"V",GTC:"V",GTA:"V",GTG:"V",GCT:"A",GCC:"A",GCA:"A",GCG:"A",GAT:"D",GAC:"D",GAA:"E",GAG:"E",GGT:"G",GGC:"G",GGA:"G",GGG:"G"
  };
  const SENSE_CODONS = Object.keys(CODON_TABLE).filter(function (c) {
    return CODON_TABLE[c] !== "*" && c !== "ATG";
  });
  const HYDROPATHY = {A:1.8,R:-4.5,N:-3.5,D:-3.5,C:2.5,Q:-3.5,E:-3.5,G:-0.4,H:-3.2,I:4.5,L:3.8,K:-3.9,M:1.9,F:2.8,P:-1.6,S:-0.8,T:-0.7,W:-0.9,Y:-1.3,V:4.2};
  const POLARITY = {A:0.1,R:1,N:0.9,D:0.9,C:0.2,Q:0.9,E:0.9,G:0.2,H:0.8,I:0.1,L:0.1,K:0.9,M:0.1,F:0.1,P:0.5,S:0.8,T:0.7,W:0.3,Y:0.6,V:0.1};
  const MASS = {A:89,R:174,N:132,D:133,C:121,Q:146,E:147,G:75,H:155,I:131,L:131,K:146,M:149,F:165,P:115,S:105,T:119,W:204,Y:181,V:117};
  const POSITIVE = {R:1,K:1,H:0.12};
  const NEGATIVE = {D:1,E:1};
  const LABELS = [
    "energy_metabolism", "motility_and_body_plan", "environmental_sensing", "protection_and_surface",
    "replication_and_growth", "thermal_tolerance", "learning_and_memory", "social_cooperation"
  ];
  const ALLOWED_FORMS = new Set([
    "microbe","bacterium","aquatic","fish","amphibian","reptile","plant","tree","fungus",
    "dinosaur","sauropod","theropod","armoredDino","mammal","dog","cat","horse","elephant",
    "bird","insect","earlyHorse","earlyElephant","primate","hominin","earlyHomo","humanoid"
  ]);

  function clamp(value, min, max) {
    const n = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }
  function hash32(value) {
    const s = String(value == null ? "" : value);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function hashUnit(value) {
    return hash32(value) / 4294967295;
  }
  function normalizeSyntheticGenome(input) {
    if (typeof input !== "string") return null;
    const seq = input.toUpperCase().replace(/[\s0-9]/g, "");
    return seq.length === GENOME_LENGTH && /^[ACGT]+$/.test(seq) ? seq : null;
  }
  function translateGene(gene) {
    let protein = "";
    for (let i = 0; i + 2 < gene.length; i += 3) {
      const aa = CODON_TABLE[gene.slice(i, i + 3)];
      if (!aa || aa === "*") break;
      protein += aa;
    }
    return protein;
  }
  function translateGenome(dna) {
    const seq = normalizeSyntheticGenome(dna);
    if (!seq) return [];
    const proteins = [];
    for (let i = 0; i < GENE_COUNT; i++) {
      proteins.push(translateGene(seq.slice(i * GENE_LENGTH, (i + 1) * GENE_LENGTH)));
    }
    return proteins;
  }
  function signalFromProtein(protein) {
    const seq = String(protein || "");
    if (!seq) return 0.05;
    let hydro = 0, polar = 0, mass = 0, charge = 0, aromatic = 0;
    const unique = new Set();
    for (let i = 0; i < seq.length; i++) {
      const aa = HYDROPATHY[seq[i]] !== undefined ? seq[i] : "A";
      unique.add(aa);
      hydro += (HYDROPATHY[aa] + 4.5) / 9;
      polar += POLARITY[aa];
      mass += MASS[aa] / 204;
      charge += (POSITIVE[aa] || 0) - (NEGATIVE[aa] || 0);
      aromatic += "FWY".indexOf(aa) >= 0 ? 1 : 0;
    }
    const n = seq.length;
    const diversity = unique.size / Math.min(6, n);
    const balancedCharge = clamp((charge / n + 1) / 2, 0, 1);
    return clamp(
      0.26 * hydro / n + 0.21 * polar / n + 0.14 * mass / n +
      0.19 * diversity + 0.10 * balancedCharge + 0.10 * aromatic / n,
      0.02, 0.98
    );
  }
  function signalsFromProteins(proteins) {
    return LABELS.map(function (_, i) { return signalFromProtein(proteins[i] || "A"); });
  }
  function appearanceFromDNA(dna, signals) {
    const seq = String(dna || "");
    const v = Array.isArray(signals) && signals.length >= GENE_COUNT
      ? signals.map(function (n) { return clamp(n, 0, 1); })
      : signalsFromProteins(translateGenome(seq));
    const mix = function (a, b, wa) { return clamp(a * wa + b * (1 - wa), 0, 1); };
    const variation = hashUnit(seq + "|morphology");
    const surfaceSignal = mix(v[3], variation, 0.7);
    return {
      hue: Math.round((variation * 360 + v[0] * 67) % 360),
      bodyLength: 0.72 + 0.76 * mix(v[1], v[4], 0.62),
      bodyWidth: 0.62 + 0.72 * mix(v[3], v[0], 0.58),
      bodyHeight: 0.42 + 0.88 * mix(v[5], v[3], 0.55),
      headSize: 0.42 + 0.88 * mix(v[2], v[6], 0.72),
      limbLength: 0.35 + 1.15 * v[1],
      limbThickness: 0.30 + 1.12 * v[3],
      appendageLength: 0.25 + 1.40 * mix(v[1], v[2], 0.57),
      tailLength: 0.22 + 1.58 * mix(v[1], variation, 0.68),
      neckLength: 0.18 + 1.48 * mix(v[4], v[2], 0.65),
      wingSpan: 0.04 + 1.35 * mix(v[1], v[6], 0.56),
      finSize: 0.18 + 1.18 * v[2],
      armorCoverage: clamp((v[3] * 0.72 + v[7] * 0.28 - 0.24) * 1.26, 0, 1),
      hornLength: clamp((v[3] * 0.58 + v[7] * 0.42 - 0.43) * 1.8, 0, 1),
      eyeSize: 0.30 + 0.84 * v[2],
      limbCount: v[1] < 0.22 ? 0 : (v[1] > 0.78 && v[6] > 0.64 ? 2 : 4),
      segmentCount: 2 + Math.floor(v[7] * 5),
      pattern: Math.floor(hashUnit(seq + "|pattern") * 5),
      surface: Math.floor(surfaceSignal * 4),
      symmetry: 0.72 + 0.27 * hashUnit(seq + "|symmetry"),
      crestHeight: 0.04 + 0.78 * hashUnit(seq + "|crest") + 0.18 * v[7],
      frillSize: 0.08 + 0.82 * hashUnit(seq + "|frill") * (0.35 + 0.65 * v[3]),
      jawLength: 0.35 + 0.95 * ((v[2] * 0.58) + (hashUnit(seq + "|jaw") * 0.42)),
      legSpread: 0.72 + 0.56 * hashUnit(seq + "|stance"),
      stripeCount: 1 + Math.floor(hashUnit(seq + "|stripes") * 5),
      model: "synthetic-educational",
      evidence: "hypothesis-only; not a real-organism phenotype prediction"
    };
  }
  function stageSize(age) {
    if (age < 3900) return 0.45;
    if (age < 4070) return 0.70;
    if (age < 4120) return 1.05;
    if (age < 4220) return 1.45;
    if (age < 4250) return 1.90;
    return 2.25;
  }
  function phenotypeFromDNA(dna, options) {
    const seq = normalizeSyntheticGenome(dna);
    if (!seq) throw new Error("The synthetic life engine requires exactly 168 unambiguous A/C/G/T bases (8 model genes).");
    const proteins = translateGenome(seq);
    const signals = signalsFromProteins(proteins);
    const energy = signals[0];
    const metabolism = energy < 0.22 ? "anaerobic" :
      energy < 0.44 ? "fermentative" : energy < 0.69 ? "chemosynthetic" : "photosynthetic";
    const learning = 0.05 + 0.90 * signals[6];
    const cooperation = 0.05 + 0.90 * signals[7];
    const sensing = 0.10 + 0.86 * signals[2];
    const motility = 0.08 + 0.88 * signals[1];
    const protection = 0.12 + 0.82 * signals[3];
    const replication = 0.18 + 0.80 * signals[4];
    const thermalTolerance = 0.05 + 0.90 * signals[5];
    const age = clamp(options && options.ageMa, 0, 4540);
    const appearance = appearanceFromDNA(seq, signals);
    const cognition = Math.min(1, 0.08 + 0.34 * sensing + 0.36 * learning + 0.12 * motility + 0.10 * cooperation);
    const geneModules = proteins.map(function (protein, index) {
      return {
        index: index,
        name: LABELS[index],
        protein: protein,
        signal: Number(signals[index].toFixed(5)),
        lengthAa: protein.length,
        interpretation: "operational digital module; orthology and biochemical function are not established"
      };
    });
    return {
      proteins: proteins,
      signals: signals,
      geneModules: geneModules,
      appearance: appearance,
      metabolism: metabolism,
      metabolicEfficiency: clamp(0.35 + signals[0] * 0.62, 0.35, 0.97),
      motility: motility,
      sensing: sensing,
      protection: protection,
      replication: replication,
      thermalTolerance: thermalTolerance,
      learning: learning,
      cooperation: cooperation,
      cognition: cognition,
      memoryCapacity: Math.round(2 + 10 * learning),
      decisionAccuracy: 0.08 + 0.57 * learning + 0.30 * sensing,
      growthRate: 0.004 + 0.028 * replication,
      feedingEfficiency: clamp(0.60 + 0.55 * ((signals[0] + signals[2]) / 2), 0.60, 1.15),
      waterNeed: clamp(0.15 + 0.72 * (1 - thermalTolerance), 0.15, 0.87),
      preferredTemperatureC: -5 + 40 * thermalTolerance,
      preferredHabitat: metabolism === "photosynthetic" ? "light-rich" : (motility > 0.55 ? "mobile" : "sheltered"),
      trophicStrategy: metabolism === "photosynthetic" ? "light-driven model autotrophy" :
        metabolism === "chemosynthetic" ? "chemical-energy model" : "resource-dependent model heterotrophy",
      size: (0.12 + 0.95 * signals[3]) * stageSize(age),
      photosynthetic: metabolism === "photosynthetic",
      swims: motility > 0.48,
      model: {
        type: "eight-module synthetic genome",
        sourceLengthBp: GENOME_LENGTH,
        verifiedBiologicalPhenotype: false,
        confidence: "low; illustrative digital mapping only",
        limitation: "These 168 bases are a toy genome. The module labels are not verified genes or validated genotype-to-phenotype rules."
      }
    };
  }
  function inferForm(phenotype, ageMa, habitat) {
    const p = phenotype || {};
    const a = p.appearance || {};
    const age = clamp(ageMa, 0, 4540);
    const home = habitat || "ocean";
    if (age < 1000) return "microbe";
    if (age < 3900) return home === "ocean" && p.motility > 0.54 ? "aquatic" : "microbe";
    if (age < 4070) return home === "land" ? "fungus" : (p.motility > 0.54 ? "fish" : "aquatic");
    if (age < 4120) return home === "land" ? (p.protection > 0.56 && a.bodyHeight > 0.9 ? "tree" : "plant") : "fish";
    if (age < 4170) return home === "land" ? "tree" : "fish";
    if (age < 4220) return home === "ocean" ? "fish" : "amphibian";
    if (age < 4305) return home === "ocean" ? "fish" : (p.motility > 0.48 ? "reptile" : "amphibian");
    if (age < 4473) {
      if (home !== "land") return "fish";
      if (a.neckLength > 1.00 && a.bodyLength > 1.05) return "sauropod";
      if (a.armorCoverage > 0.52) return "armoredDino";
      return "theropod";
    }
    if (age < 4535) return home === "ocean" ? "fish" : (a.wingSpan > 0.96 ? "bird" : "mammal");
    // Homo sapiens is a curated lineage milestone, never inferred from a random toy-genome cognition score.
    return home === "ocean" ? "fish" : (a.wingSpan > 0.99 ? "bird" : "mammal");
  }
  function mutateSyntheticGenome(dna, rate, random) {
    const seq = normalizeSyntheticGenome(dna);
    if (!seq) throw new Error("Invalid synthetic genome.");
    const rng = typeof random === "function" ? random : Math.random;
    const mutationRate = clamp(rate, 0, 1);
    const bases = seq.split("");
    for (let gene = 0; gene < GENE_COUNT; gene++) {
      const start = gene * GENE_LENGTH;
      for (let i = 3; i < 18; i++) {
        if (rng() < mutationRate) {
          const oldBase = bases[start + i];
          let next = oldBase;
          while (next === oldBase) next = BASES[Math.floor(rng() * BASES.length)];
          bases[start + i] = next;
        }
      }
    }
    return bases.join("");
  }
  function projectReferenceGenome(data) {
    if (!data || !Array.isArray(data.records) || !data.records.length) {
      throw new Error("Load a FASTA or GenBank genome before creating a model proxy.");
    }
    const records = data.records.filter(function (r) { return r && typeof r.seq === "string" && r.seq.length > 0; });
    if (!records.length) throw new Error("No sequence records are available.");
    const total = Number(data.total) || records.reduce(function (sum, r) { return sum + r.seq.length; }, 0);
    if (!Number.isFinite(total) || total < 1 || total > 100000000) {
      throw new Error("The model proxy supports a total sequence size from 1 bp to 100 Mb in this step.");
    }
    function codonAtFraction(fraction, salt) {
      let target = Math.floor(clamp(fraction, 0, 0.999999) * total);
      let record = records[records.length - 1];
      for (let i = 0; i < records.length; i++) {
        const length = records[i].seq.length;
        if (target < length) { record = records[i]; break; }
        target -= length;
      }
      const seq = record.seq;
      let start = clamp(target, 0, Math.max(0, seq.length - 3));
      const end = Math.min(seq.length - 2, start + 120);
      for (let pos = start; pos <= end; pos++) {
        const codon = seq.slice(pos, pos + 3).toUpperCase().replace(/U/g, "T");
        if (/^[ACGT]{3}$/.test(codon) && CODON_TABLE[codon] && CODON_TABLE[codon] !== "*" && codon !== "ATG") return codon;
      }
      const local = seq.slice(start, start + 3).toUpperCase().replace(/U/g, "T");
      return SENSE_CODONS[hash32(local + ":" + salt + ":" + String(data.name || "")) % SENSE_CODONS.length];
    }
    const proxyGenes = [];
    const stops = ["TAA", "TAG", "TGA"];
    for (let g = 0; g < GENE_COUNT; g++) {
      let gene = "ATG";
      for (let c = 0; c < 5; c++) {
        const fraction = (g * 5 + c + 0.5) / (GENE_COUNT * 5);
        gene += codonAtFraction(fraction, g * 10 + c);
      }
      gene += stops[hash32(String(data.name || "") + ":" + g) % stops.length];
      proxyGenes.push(gene);
    }
    const proxyDNA = proxyGenes.join("");
    const summary = {
      sourceName: String(data.name || "Imported reference sequence").slice(0, 300),
      format: String(data.format || "FASTA / GenBank").slice(0, 80),
      sourceGenomeBp: total,
      gcPercent: Number.isFinite(Number(data.gcPct)) ? Number(Number(data.gcPct).toFixed(5)) : null,
      ambiguousSymbols: Math.max(0, Number(data.amb) || 0),
      recordCount: records.length,
      loadedAt: String(data.loadedAt || ""),
      proxyGenomeBp: GENOME_LENGTH,
      confidence: "very-low / hypothesis-only"
    };
    return {
      proxyDNA: proxyDNA,
      summary: summary,
      evidence: {
        sequenceWasReduced: true,
        sourceSequenceUsedAsFullGenotype: false,
        verifiedBiologicalPhenotype: false,
        statement: "The actual sequence was reduced to a 168-bp digital proxy. This does not reconstruct the organism's genes, regulation, proteins, anatomy, or real phenotype."
      },
      note: "A reference sequence was sampled into an artificial 168-bp simulation proxy. The chosen body template and resulting anatomy are illustrative, not a prediction from the real genome."
    };
  }
  function drawOrganism(ctx, species, agent, x, y, size, dpr, depthScale) {
    if (!ctx || !species || !agent) return;
    const traits = agent.traits || species.traits || {};
    const a = traits.appearance || species.appearance || {};
    const form = String(species.form || "microbe");
    const k = Math.max(0.7, Number(size) || 1);
    const hue = clamp(a.hue, 0, 359);
    const body = clamp(a.bodyLength, 0.72, 1.48);
    const width = clamp(a.bodyWidth, 0.66, 1.32);
    const head = clamp(a.headSize, 0.42, 1.30);
    const bodyHeight = clamp(a.bodyHeight, 0.42, 1.36);
    const eye = clamp(a.eyeSize, 0.30, 1.14);
    const crest = clamp(a.crestHeight, 0.04, 1.25);
    const frill = clamp(a.frillSize, 0.08, 1.00);
    const jaw = clamp(a.jawLength, 0.35, 1.30);
    const legSpread = clamp(a.legSpread, 0.72, 1.28);
    const stripeCount = Math.round(clamp(a.stripeCount, 1, 5));
    const limb = clamp(a.limbLength, 0.35, 1.50);
    const tail = clamp(a.tailLength, 0.22, 1.80);
    const neck = clamp(a.neckLength, 0.18, 1.66);
    const fin = clamp(a.finSize, 0.18, 1.36);
    const wing = clamp(a.wingSpan, 0.04, 1.39);
    const armor = clamp(a.armorCoverage, 0, 1);
    const legWidth = clamp(a.limbThickness, 0.30, 1.42);
    const stroke = "hsla(" + hue + ",78%,92%,.90)";
    const solid = "hsl(" + hue + ",58%,56%)";
    const light = "hsl(" + hue + ",80%,78%)";
    const dark = "hsl(" + hue + ",58%,28%)";
    const fill = typeof ctx.createLinearGradient === "function" ? (function(){const g=ctx.createLinearGradient(-1.25*k,-1.1*k,1.15*k,1.1*k);g.addColorStop(0,"hsl("+hue+",74%,78%)");g.addColorStop(.34,"hsl("+hue+",64%,58%)");g.addColorStop(.72,"hsl("+hue+",59%,42%)");g.addColorStop(1,"hsl("+hue+",55%,27%)");return g;})() : solid;
    const lw = Math.max(0.55, (Number(dpr) || 1) * 0.62);
    const sc = Number(depthScale) || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Number(agent.angle) || 0);
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    function ellipse(cx, cy, rx, ry, color) {
      ctx.beginPath();
      ctx.ellipse(cx * k, cy * k, Math.max(0.4, rx * k), Math.max(0.4, ry * k), 0, 0, Math.PI * 2);
      ctx.fillStyle = color || fill;
      ctx.fill();
      ctx.stroke();
    }
    function path(points, color, close) {
      if (!points || points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0][0] * k, points[0][1] * k);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * k, points[i][1] * k);
      if (close !== false) ctx.closePath();
      ctx.fillStyle = color || fill;
      if (close !== false) ctx.fill();
      ctx.stroke();
    }
    function line(points, color, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(points[0][0] * k, points[0][1] * k);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * k, points[i][1] * k);
      ctx.strokeStyle = color || stroke;
      ctx.lineWidth = lineWidth || lw;
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
    }
    function groundPlant() {
      line([[0, 0.25], [0, -0.72]], "#72dca7", Math.max(lw, 1.3 * lw));
      path([[0, -0.28], [-0.62, -0.52], [-0.40, -0.02]], "#45b77e", true);
      path([[0.02, -0.42], [0.62, -0.70], [0.40, -0.18]], "#63d996", true);
      line([[-0.02, 0.20], [-0.20, 0.45]], "#72dca7");
      line([[0.02, 0.20], [0.22, 0.45]], "#72dca7");
    }
    if (/^tree$/.test(form)) {
      path([[-0.16, 0.9], [-0.12, -0.20], [0.12, -0.20], [0.18, 0.9]], "#8f6848", true);
      ellipse(-0.25, -0.43, 0.55, 0.48, "#337f5c");
      ellipse(0.25, -0.52, 0.58, 0.51, "#368f66");
      ellipse(0.02, -0.88, 0.48, 0.40, "#4aa873");
      ellipse(-0.32, -0.57, 0.12, 0.12, "#a1e9a7");
    } else if (/^plant$/.test(form)) {
      groundPlant();
      ellipse(-0.26, -0.52, 0.37, 0.18, "#3eaf77");
      ellipse(0.28, -0.66, 0.34, 0.18, "#60d795");
    } else if (/^fungus$/.test(form)) {
      path([[-0.20, 0.55], [-0.16, -0.18], [0.16, -0.18], [0.23, 0.55]], "#e1d2b2", true);
      ctx.beginPath();
      ctx.moveTo(-0.90 * k, -0.18 * k);
      ctx.quadraticCurveTo(-0.76 * k, -1.03 * k, 0, -0.94 * k);
      ctx.quadraticCurveTo(0.78 * k, -1.03 * k, 0.90 * k, -0.18 * k);
      ctx.closePath();
      ctx.fillStyle = "#cc746c";
      ctx.fill();
      ctx.stroke();
      ellipse(-0.34, -0.50, 0.08, 0.08, "#fff0d2");
      ellipse(0.30, -0.62, 0.10, 0.10, "#fff0d2");
    } else if (/microbe|bacter|cell|virus/i.test(form)) {
      ctx.save();
      ctx.rotate(-0.18 + (1 - a.symmetry) * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.86 * k * body, 0.44 * k * width, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < Math.max(3, Math.floor(3 + (Number(a.segmentCount) || 3))); i++) {
        ellipse(-0.54 + i * 0.25, (i % 2 ? 0.14 : -0.14), 0.055, 0.055, "#e3fff4");
      }
      for (let i = 0; i < 3; i++) line([[0.42 + i * 0.10, (i - 1) * 0.15], [0.70 + i * 0.10, (i - 1) * 0.24], [0.82 + i * 0.11, (i - 1) * 0.12]], light);
      ctx.restore();
    } else if (/fish|aquatic|earlyFish/i.test(form)) {
      path([[-1.05 * body, 0], [-1.42 * body, -0.46 * fin], [-1.40 * body, 0.45 * fin], [-1.05 * body, 0]], dark, true);
      ellipse(-0.08, 0, 0.97 * body, 0.46 * width * bodyHeight, fill);
      path([[0.02, -0.34 * width], [0.32, -0.80 * fin], [0.56, -0.27 * width]], light, true);
      path([[-0.08, 0.30 * width], [0.25, 0.70 * fin], [0.47, 0.28 * width]], dark, true);
      ellipse(0.57 * body, -0.13, 0.08 * head * eye, 0.08 * head * eye, "#f5ffff");
      ellipse(0.59 * body, -0.13, 0.035 * eye, 0.035 * eye, "#14243a");
      for (let i = 0; i < 4; i++) line([[-0.48 + i * 0.24, -0.18], [-0.38 + i * 0.24, 0.17]], "rgba(240,255,255,.42)", lw * 0.7);
    } else if (/insect/i.test(form)) {
      // Membranous wings, abdomen segments, compound eyes and articulated legs make the insect plan distinct.
      ctx.save();ctx.globalAlpha=.34;
      path([[-0.22*body,-0.08],[-0.50*body,-0.66*wing],[-0.05*body,-0.48*wing],[0.22*body,-0.04]],"rgba(182,235,255,.72)",true);
      path([[0.00,-0.10],[-0.04*body,-0.82*wing],[0.33*body,-0.60*wing],[0.42*body,-0.03]],"rgba(155,220,255,.66)",true);
      ctx.restore();
      ellipse(0.38, 0, 0.30 * body, 0.28 * width, dark);
      ellipse(0, 0, 0.31 * body, 0.42 * width, fill);
      ellipse(-0.42, 0, 0.22 * body, 0.24 * width, light);
      ellipse(-0.62, -0.24, 0.15 * head, 0.15 * head, fill);
      path([[-0.62, -0.33], [-0.82, -0.72], [-0.92, -0.75]], "rgba(205,250,255,.36)", true);
      path([[-0.48, -0.13], [-0.35, -0.64], [0.04, -0.49]], "rgba(175,230,255,.28)", true);
      for (let side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const joint=0.02+i*0.15;
        line([[side*joint,0.14],[side*(0.18+i*0.17),0.36+i*0.08],[side*(0.28+i*0.19),0.61+i*0.07]],dark,Math.max(lw,1.05*lw));
        ellipse(side*(0.28+i*0.19),0.61+i*0.07,.055,.045,light);
      }
      line([[-0.52,-0.12],[-0.70,-0.50],[-0.82,-0.55]],stroke,Math.max(lw,1.2*lw));
      line([[-0.42,-0.18],[-0.40,-0.58],[-0.49,-0.64]],stroke,Math.max(lw,1.2*lw));
      ellipse(-0.68,-0.10,.22,.20,light);ellipse(-0.72,-0.12,.08,.09,"#102238");
    } else if (/bird/i.test(form)) {
      ellipse(-0.05, 0.05, 0.72 * body, 0.50 * width * bodyHeight, fill);
      path([[0.35 * body, -0.04], [0.90 * head, -0.16], [0.42 * body, 0.10]], "#e7c777", true);
      ellipse(0.40 * body, -0.36 * head, 0.28 * head, 0.27 * head, light);
      path([[-0.52, 0.03], [-0.72 * wing, -0.64 * wing], [0.10, -0.20]], dark, true);
      path([[-0.58, 0.13], [-1.0 * body, 0.25], [-0.78 * body, -0.02]], light, true);
      line([[-0.16, 0.40], [-0.20, 0.78], [-0.40, 0.82]], "#e7c777");
      line([[0.15, 0.40], [0.20, 0.78], [0.38, 0.82]], "#e7c777");
      ellipse(0.48 * body, -0.40 * head, 0.045 * eye, 0.045 * eye, "#122238");
    } else if (/amphibian/i.test(form)) {
      ellipse(-0.02, 0.12, 0.76 * body, 0.43 * width * bodyHeight, fill);
      ellipse(0.45 * body, -0.19, 0.30 * head, 0.27 * head, light);
      ellipse(0.33 * body, -0.39 * head, 0.12, 0.13, light);
      ellipse(0.52 * body, -0.41 * head, 0.12, 0.13, light);
      ellipse(0.34 * body, -0.40 * head, 0.04, 0.04, "#102238");
      ellipse(0.53 * body, -0.42 * head, 0.04, 0.04, "#102238");
      line([[-0.42, 0.30], [-0.86 * limb, 0.65], [-0.50, 0.73]], stroke);
      line([[0.25, 0.32], [0.70 * limb, 0.62], [0.82, 0.72]], stroke);
    } else if (/sauropod/i.test(form)) {
      ellipse(-0.06, 0.03, 1.02 * body, 0.43 * width, fill);
      line([[-0.88 * body, 0.02], [-1.27 * tail, 0.15], [-1.65 * tail, 0.05]], dark, 1.1 * lw);
      line([[0.45 * body, -0.06], [0.52 * body, -0.30 * neck], [0.72 * body, -0.75 * neck], [1.12 * body, -0.94 * neck]], fill, 2.2 * lw);
      ellipse(1.12 * body, -0.95 * neck, 0.25 * head, 0.17 * head, light);
      ellipse(1.20 * body, -0.99 * neck, 0.035, 0.035, "#102238");
      for (const lx of [-0.70, -0.28, 0.36, 0.72]) {
        line([[lx * body, 0.25 * width], [lx * body, 0.70 * limb], [lx * body + 0.08, 0.72 * limb]], dark, Math.max(lw, legWidth * lw));
      }
    } else if (/theropod|armoredDino|dinosaur|reptile/i.test(form)) {
      const biped = /theropod|dinosaur/.test(form);
      ellipse(-0.04, 0.02, 0.92 * body, 0.42 * width * bodyHeight, fill);
      line([[-0.74 * body, 0.00], [-1.22 * tail, 0.16], [-1.82 * tail, 0.05]], dark, 1.3 * lw);
      line([[0.45 * body, -0.10], [0.72 * body, -0.37 * neck], [0.95 * body, -0.43 * neck]], fill, 1.7 * lw);
      path([[0.79 * body, -0.47 * neck], [1.10 * body, -0.48 * neck], [1.00 * body, -0.20 * neck]], light, true);
      ellipse(0.94 * body, -0.43 * neck, 0.035 * eye, 0.035 * eye, "#102238");
      if (biped) {
        line([[-0.08, 0.27 * width], [-0.12, 0.72 * limb], [0.06, 0.75 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[0.38, 0.25 * width], [0.46, 0.72 * limb], [0.62, 0.75 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[0.20, -0.08], [0.38, 0.20], [0.50, 0.08]], stroke);
      } else {
        for (const lx of [-0.62, -0.25, 0.36, 0.70]) {
          line([[lx * body * legSpread, 0.23 * width * bodyHeight], [lx * body * legSpread, 0.63 * limb], [lx * body * legSpread + 0.07, 0.65 * limb]], dark, Math.max(lw, legWidth * lw));
        }
      }
      if (/armoredDino/.test(form) || armor > 0.50) {
        for (let i = -2; i <= 2; i++) {
          const x = i * 0.30 * body;
          path([[x - 0.14 * body, -0.28 * width * bodyHeight], [x, -0.32 * width * bodyHeight - 0.10 - armor * (0.10 + crest * 0.22)], [x + 0.14 * body, -0.28 * width * bodyHeight]], dark, true);
        }
      }
      if (Number(a.hornLength) > 0.42) {
        path([[0.62 * body, -0.37 * neck], [0.74 * body, -(0.42 + crest * 0.28) * neck], [0.80 * body, -0.35 * neck]], light, true);
      }
      if (frill > 0.52 && biped) {
        path([[0.55 * body, -0.28 * neck], [0.72 * body, -(0.42 + frill * 0.28) * neck], [0.90 * body, -0.28 * neck]], dark, true);
      }
    } else if (/earlyHorse|horse|equid/i.test(form)) {
      const early=/earlyHorse/i.test(form);
      ellipse(-0.06,0.00,0.66*body,0.38*width*bodyHeight,fill);
      ellipse(0.36*body,-0.12,0.30*head,0.31*head,light);
      path([[0.20*body,-0.20],[0.35*body,-0.54*neck],[0.55*body,-0.77*neck],[0.79*body,-0.71*neck],[0.68*body,-0.49*neck],[0.53*body,-0.25]],fill,true);
      ellipse(0.73*body,-0.69*head,0.25*head,0.17*head,light);
      path([[0.52*body,-0.81*head],[0.53*body,-1.12*head],[0.64*body,-0.83*head]],dark,true);
      path([[0.67*body,-0.80*head],[0.80*body,-1.07*head],[0.77*body,-0.73*head]],dark,true);
      path([[0.69*body,-0.59*head],[0.96*body,-0.60*head],[0.83*body,-0.46*head]],light,true);
      ellipse(0.76*body,-0.73*head,0.035*eye,0.04*eye,"#102238");
      path([[0.19*body,-0.27],[0.28*body,-0.57*neck],[0.47*body,-0.82*neck],[0.54*body,-0.78*neck],[0.44*body,-0.55*neck],[0.31*body,-0.23]],dark,true);
      line([[-0.62*body,-0.10],[-0.86*tail,-0.37*tail],[-0.98*tail,-0.56*tail]],dark,Math.max(lw,1.8*lw));
      for(const pair of [[-0.47,0.63],[-0.20,0.67],[0.30,0.64],[0.52,0.61]]){
        const lx=pair[0]*body*legSpread,stride=pair[1]*limb;
        line([[lx,0.22*width*bodyHeight],[lx+(early?-.02:.03),stride],[lx+(early?-.08:.06),stride+.12]],dark,Math.max(lw,(early?1.7:2.2)*lw));
        path([[lx+(early?-.10:.02),stride+.09],[lx+(early?-.02:.13),stride+.08],[lx+(early?-.01:.12),stride+.19],[lx+(early?-.12:.02),stride+.19]],"#302b28",true);
      }
      if(early)for(const side of [-1,1])for(const toe of [0,1])line([[(side*.40+toe*.12)*body,.66*limb],[(side*.40+toe*.12)*body+side*.035,.73*limb]],light,Math.max(lw,.7*lw));
    } else if (/earlyElephant|elephant/i.test(form)) {
      const early=/earlyElephant/i.test(form);
      ellipse(-0.03,0.02,0.70*body,0.48*width*bodyHeight,fill);
      ellipse(0.43*body,-0.08,0.34*head,0.36*head,light);
      path([[0.28*body,-0.15],[0.12*body,-0.55],[0.26*body,-0.63],[0.49*body,-0.39],[0.47*body,-0.09]],dark,true);
      path([[0.52*body,-0.19],[0.60*body,0.10],[0.58*body,0.33],[0.67*body,0.43],[0.78*body,0.34],[0.73*body,0.24],[0.72*body,0.03],[0.67*body,-0.19]],fill,true);
      if(!early){path([[0.49*body,0.10],[0.64*body,0.20],[0.77*body,0.12]],"#f5e7bb",true);path([[0.45*body,0.09],[0.57*body,0.25],[0.66*body,0.13]],"#e7d6a4",true);}
      ellipse(0.62*body,-0.19*head,0.045*eye,0.05*eye,"#16212a");
      path([[-0.65*body,-0.02],[-0.91*body,-0.25],[-0.86*body,0.25],[-0.65*body,0.30]],light,true);
      line([[-0.58*body,0.17*width],[-0.60*body,0.70*limb],[-0.46*body,0.73*limb]],dark,Math.max(lw,3.1*lw));
      line([[-0.22*body,0.26*width],[-0.23*body,0.70*limb],[-0.08*body,0.73*limb]],dark,Math.max(lw,3.1*lw));
      line([[0.27*body,0.26*width],[0.28*body,0.70*limb],[0.43*body,0.73*limb]],dark,Math.max(lw,3.1*lw));
      line([[0.50*body,0.16*width],[0.50*body,0.68*limb],[0.64*body,0.72*limb]],dark,Math.max(lw,3.1*lw));
      line([[-0.69*body,-0.04],[-0.86*tail,0.13],[-0.91*tail,0.32]],dark,Math.max(lw,1.3*lw));
    } else if (/primate|hominin|earlyHomo/i.test(form)) {
      const upright=!/primate/i.test(form),early=/earlyHomo/i.test(form);
      ellipse(-0.05,0.00,0.54*body,0.34*width,fill);
      ellipse(0.46*body,-0.25*head,0.24*head,0.24*head,light);
      ellipse(0.56*body,-0.30*head,0.035*eye,0.035*eye,"#102238");
      if(!upright){
        line([[-0.25,0.17],[-0.57*limb,0.58*limb],[-0.94*limb,0.62*limb]],dark,Math.max(lw,2.1*lw));
        line([[0.10,0.16],[0.38*limb,0.54*limb],[0.76*limb,0.56*limb]],dark,Math.max(lw,2.1*lw));
        line([[-0.49,0.05],[-0.78*tail,0.35],[-1.04*tail,0.08]],dark,Math.max(lw,1.3*lw));
        line([[-0.10,0.23],[0.05,0.53],[0.20,0.56]],dark,Math.max(lw,1.8*lw));
        line([[0.16,0.20],[0.33,0.50],[0.48,0.52]],dark,Math.max(lw,1.8*lw));
      }else{
        ellipse(0,-0.66,early?0.23*head:0.25*head,early?0.24*head:0.27*head,light);
        path([[-0.23,-0.43],[0.21,-0.43],[0.28,0.12],[0.16,0.26],[0.11,0.74],[-0.10,0.74],[-0.13,0.24],[-0.29,0.13]],fill,true);
        line([[-0.18,-0.24],[-0.40*limb,0.17],[-0.48*limb,0.39]],dark,Math.max(lw,2.0*lw));
        line([[0.18,-0.24],[0.45*limb,0.14],[0.52*limb,0.34]],dark,Math.max(lw,2.0*lw));
        line([[-0.10,0.22],[-0.24*limb,0.69],[-0.31*limb,0.77]],dark,Math.max(lw,2.2*lw));
        line([[0.10,0.22],[0.26*limb,0.69],[0.34*limb,0.77]],dark,Math.max(lw,2.2*lw));
        ellipse(-0.08,-0.69,0.026,0.03,"#102238");ellipse(0.08,-0.69,0.026,0.03,"#102238");
      }
    } else if (/mammal|dog|cat|humanoid|human/i.test(form)) {
      if (/humanoid|human/i.test(form)) {
        ellipse(0, -0.73, 0.28 * head, 0.30 * head, light);
        path([[-0.26, -0.39], [0.25, -0.39], [0.31, 0.23], [0.12, 0.33], [0.06, 0.82], [-0.12, 0.82], [-0.10, 0.28], [-0.30, 0.20]], fill, true);
        line([[-0.20, -0.25], [-0.53 * limb, 0.22], [-0.42 * limb, 0.38]], stroke);
        line([[0.20, -0.25], [0.52 * limb, 0.18], [0.43 * limb, 0.35]], stroke);
        line([[-0.10, 0.24], [-0.28 * limb, 0.83], [-0.38 * limb, 0.85]], dark, Math.max(lw, legWidth * lw));
        line([[0.10, 0.24], [0.28 * limb, 0.83], [0.38 * limb, 0.85]], dark, Math.max(lw, legWidth * lw));
        ellipse(-0.09, -0.77, 0.025, 0.03, "#102238");
        ellipse(0.09, -0.77, 0.025, 0.03, "#102238");
      } else {
        ellipse(-0.08, 0.02, 0.90 * body, 0.44 * width * bodyHeight, fill);
        ellipse(0.68 * body, -0.30 * head, 0.30 * head, 0.29 * head, light);
        line([[-0.72, 0.28 * width], [-0.72, 0.72 * limb], [-0.58, 0.75 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[-0.28, 0.30 * width], [-0.28, 0.70 * limb], [-0.12, 0.73 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[0.35, 0.28 * width], [0.38, 0.71 * limb], [0.54, 0.74 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[0.68, 0.10], [0.73, 0.62 * limb], [0.86, 0.65 * limb]], dark, Math.max(lw, legWidth * lw));
        line([[-0.84, -0.02], [-1.12 * tail, -0.36]], dark);
        if (/elephant/i.test(form)) line([[0.87 * body, -0.13], [1.00 * body, 0.12], [0.88 * body, 0.40]], dark, 1.8 * lw);
        if (/dog|cat/i.test(form)) {
          path([[0.52 * body, -0.47 * head], [0.56 * body, -0.77 * head], [0.71 * body, -0.48 * head]], dark, true);
        }
        ellipse(0.77 * body, -0.34 * head, 0.035 * eye, 0.035 * eye, "#102238");
      }
    } else {
      ellipse(0, 0, 0.82 * body, 0.62 * width, fill);
      ellipse(0.38 * body, -0.42 * head, 0.22 * head, 0.20 * head, light);
      ellipse(0.43 * body, -0.44 * head, 0.035, 0.035, "#102238");
      line([[-0.55, 0.18], [-0.83 * limb, 0.53]], stroke);
      line([[0.45, 0.18], [0.78 * limb, 0.48]], stroke);
    }
    if (Number(a.pattern) > 0 && /dinosaur|theropod|sauropod|armoredDino|reptile|mammal|dog|cat|horse|amphibian|bird/i.test(form)) {
      for (let i = 0; i < Math.min(5, Math.max(1, Number(a.pattern))); i++) {
        const sx = -0.52 + i * (0.22 + stripeCount * 0.012);
        ellipse(sx, -0.10 * bodyHeight, 0.045 + (Number(a.surface) || 0) * 0.012, 0.055 * bodyHeight, light);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function selfTest() {
    const gene = "ATGGCTGACGTTCCAAAGTAA";
    const dna = Array(8).fill(gene).join("");
    const first = phenotypeFromDNA(dna, { ageMa: 4320 });
    const second = phenotypeFromDNA(dna, { ageMa: 4320 });
    const proxy = projectReferenceGenome({
      name: "NC_000913.3 test",
      format: "FASTA",
      total: 420,
      gcPct: 50.2,
      amb: 0,
      records: [{ id: "test", seq: "ATGGCTGACGTTCCAAAGTAA".repeat(20) }]
    });
    const problems = [];
    if (dna.length !== GENOME_LENGTH) problems.push("test genome length");
    if (first.proteins.length !== GENE_COUNT) problems.push("gene module count");
    if (first.signals.some(function (v) { return !Number.isFinite(v) || v < 0 || v > 1; })) problems.push("signal range");
    if (JSON.stringify(first) !== JSON.stringify(second)) problems.push("determinism");
    if (!Number.isFinite(first.appearance.tailLength) || first.appearance.tailLength <= 0) problems.push("morphology");
    const randomHumanLike = inferForm(Object.assign({}, first, { cognition: 1, motility: 1, appearance: Object.assign({}, first.appearance, { wingSpan: 0.2 }) }), 4539.9, "land");
    if (randomHumanLike === "humanoid") problems.push("random-human-inference");
    if (proxy.proxyDNA.length !== GENOME_LENGTH) problems.push("reference proxy length");
    if (!proxy.evidence || proxy.evidence.verifiedBiologicalPhenotype !== false) problems.push("scientific provenance");
    return { ok: problems.length === 0, problems: problems, checks: 8, engine: "PlanetEvolutionModel-v1.2.0" };
  }
  return {
    version: "1.2.0",
    geneLength: GENE_LENGTH,
    geneCount: GENE_COUNT,
    genomeLength: GENOME_LENGTH,
    allowedForms: Array.from(ALLOWED_FORMS),
    normalizeSyntheticGenome: normalizeSyntheticGenome,
    translateGene: translateGene,
    translateGenome: translateGenome,
    signalsFromProteins: signalsFromProteins,
    appearanceFromDNA: appearanceFromDNA,
    phenotypeFromDNA: phenotypeFromDNA,
    inferForm: inferForm,
    mutateSyntheticGenome: mutateSyntheticGenome,
    projectReferenceGenome: projectReferenceGenome,
    drawOrganism: drawOrganism,
    selfTest: selfTest
  };
});