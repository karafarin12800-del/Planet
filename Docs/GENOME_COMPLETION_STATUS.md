# Planet Genome — Completion Status and Acceptance Tests

Last reviewed: 2026-10-20

## Current verified baseline

- Repository: `karafarin12800-del/Planet`, default branch `main`.
- The project includes a separate full-sequence genome evidence page and a digital-life simulation.
- The genome evidence page is designed to process full input sequences for sequence statistics and recorded GenBank/GBFF annotations.
- The README explicitly states that the interactive life simulation still uses a synthetic 168-base digital genome with eight simplified coding modules. The full-genome analysis page does not currently make the life simulation a validated whole-genome biological model.
- Organism imagery is procedurally generated locally, with optional remote image-model generation. The procedural renderer is not a trained generative model and is not a scientifically validated DNA-to-anatomy predictor.
- The latest commit found during review is `ae287ebb419dea22dc9ad76d817b6f200b68d62d` (“Improve natural digital lineage modeling”).

## Remaining work required before calling the project complete

### P0 — Correctness and reproducibility
- Verify that accession lookup handles versioned accessions such as `NC_000913.3` through the correct NCBI/ENA endpoints and reports source, HTTP/API errors, and retry guidance clearly.
- Add regression tests for FASTA, multi-record FASTA, GenBank/GBFF, malformed input, empty input, ambiguous bases, large inputs, and accession lookup failure/success.
- Ensure full-genome reports never silently replace an input sequence with a short proxy. Display source accession, record count, processed length, and SHA-256 when available.
- Keep proxy-based simulation explicitly labelled as a proxy until a real genome-to-phenotype model is implemented and validated.

### P1 — Connect imported genomes to the simulation honestly
- Define an explicit genome adapter that preserves the full imported sequence and metadata.
- Separate sequence-analysis features from simulation traits. Do not pretend that GC content, genome length, or CDS count alone can predict a complete organism phenotype.
- For supported organisms, map annotated genes/features to documented model traits only where a defensible mapping exists; label unsupported traits as unknown or model assumptions.
- Keep unsupported organisms importable for analysis even when no validated simulation mapping exists.

### P1 — Organism diversity and image integrity
- Add tests ensuring that morphology is deterministically derived from genome/trait data, while variation seeds affect only the intended stochastic details.
- Check that unrelated digital genomes can produce differences in silhouette and appendages, not only hue/texture.
- Ensure organism forms and habitat constraints remain consistent, and do not label a procedural SVG as a model-generated image.
- Keep all imagery generated at runtime; do not introduce prebuilt species images as if the program generated them.

### P1 — Localization and mobile
- Regression-test Persian/English switching on the main UI and each standalone page, including dynamic labels, validation errors, accessibility text, and imported-file status.
- Test Android file-picker import and large-file failure paths on a physical device; browser/CI success is not proof of device compatibility.
- Verify keyboard/screen-reader labels, responsive layouts, and export filenames in both languages.

### P2 — Release verification
- Run the repository's actual automated tests and Android build from the latest commit.
- Inspect the generated artifact ZIP contents and confirm whether it contains an APK, AAB, or both before providing an install/release link.
- Test APK installation and file import on a physical Android device. Do not describe this as completed until it has actually been tested.
- For Google Play release, separately verify signing, version code, target SDK, privacy declarations, store assets, and AAB output.

## Acceptance criteria

The project should not be marked “complete” until:
1. Tests cover the genome parser, accession lookup, full-length preservation, and export paths.
2. Full-genome analysis and the life simulation are clearly separated in both code and UI.
3. The UI never implies that the current synthetic 168-bp genome is a real complete organism genome.
4. Organism image generation has regression tests for morphology diversity and labels its output method accurately.
5. Persian/English switching passes automated checks on all user-facing pages.
6. A fresh Android artifact is built from the latest commit, its contents are verified, and device testing status is stated accurately.

## Scientific boundary

The present project is a digital evolution/educational model. A full nucleotide sequence plus simple statistics is not enough to reconstruct an organism's metabolism, regulatory networks, physiology, or anatomy. Any future gene-to-trait mapping must state its assumptions, supported taxa, uncertainty, and validation evidence. The project should prefer transparent unknowns over fabricated biological claims.
