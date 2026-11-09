# PLANET — Product Blueprint and Technical Roadmap

## Approved product decisions

- **3D presentation:** interactive 3D galaxy, star-system, planet and biome views; touch-first orbit, zoom and selection.
- **Civilizations:** mixed autonomy. Creatures and civilizations make their own routine decisions; players may guide broad policies and intervene optionally.
- **Monetization:** hybrid model with permanent cosmetic/content purchases, earnable and purchasable premium currency, optional VIP subscription, and rewarded ads. Core simulation and essential progress remain free.
- **World structure:** a galaxy containing star systems and independently saved planets. The first playable release focuses on one complete home planet while the data model supports expansion.

## Product pillars

1. A persistent living world with fast-forward and historical simulation.
2. Distinct digital species whose inherited traits visibly influence morphology and behavior.
3. Ecosystems with resources, predation, competition, cooperation and environmental pressure.
4. Autonomous civilizations that can progress from groups to spacefaring societies.
5. Exploration and collection across multiple worlds.
6. Ethical monetization that sells optional content and convenience without paywalling core survival or progress.

## Technical architecture

- **Presentation:** existing WebGL planet renderer and procedural organism renderer; add scene transitions and a galaxy/system/planet navigation layer incrementally.
- **Galaxy metadata:** `planet-galaxy-engine.js` owns deterministic star-system and planet identities, discovery, active-world selection, and versioned serialization. It deliberately does not claim that a planet has life before a world simulation is initialized.
- **Life simulation:** keep `planet-autonomous-evolution.js` and `evolution-engine.js` separate from rendering and galaxy metadata.
- **Civilization simulation:** future independent module; consumes world resources and species capabilities, emits auditable events.
- **Persistence:** versioned per-planet world saves; later add cloud backup and account-bound entitlements. Local browser storage is not a secure source of purchase truth.
- **Performance:** detailed simulation for the active/nearby world, aggregated simulation for distant worlds, bounded catch-up, frame-sliced work and hard memory budgets.
- **Commerce:** introduce a mock catalog first; integrate store billing only after product validation, server-side purchase verification, entitlement restoration and refund handling are designed.

## Phased roadmap and acceptance gates

### Phase 0 — Protect and audit the current foundation
- Preserve current Earth/WebGL, genome, image-generation and autonomous-biosphere features.
- Run existing Node tests and Android workflow; identify performance and persistence constraints.
- Work on a feature branch; merge only after CI passes.

### Phase 1 — Galaxy foundation (this change)
- Create deterministic galaxy metadata with three initial star systems and bounded planet counts.
- Start with one discovered, active home planet; keep other planets undiscovered until exploration.
- Support discover/select, summaries and versioned save/restore.
- Acceptance: deterministic seeds, bounded catalog, no selecting undiscovered worlds, independent stable planet IDs, valid restore and tests passing.

### Phase 2 — 3D scene navigation (galaxy and procedural planet-view milestones)
- **Implemented:** a separate WebGL galaxy explorer with a rotatable/zoomable galaxy map, selectable star systems, orbital views, per-planet discovery and active-catalog-world selection.
- **Implemented:** discovered planets can open a dedicated close-up 3D globe view. A procedural surface shader uses catalog planet type and water-coverage metadata to vary surface palettes and patterns; gas giants receive a simple illustrative ring. The globe can be orbited and zoomed with the same touch/mouse controls.
- Discovery and selection use the existing versioned galaxy engine and are saved locally on the device. The existing Earth scene and renderer remain intact.
- **Boundary:** procedural surface patterns remain illustrative rather than measured terrain or scientific climate maps. Each selected planet is connected to its own digital biosphere; temperature, water coverage, gravity, atmosphere and surface class now influence modeled fitness, population pressure and habitat migration.
- **Next within this phase:** connect the selected home world to its existing Earth renderer without duplicating or resetting its saved state; then add world-specific biome scenes and profile touch/GPU performance on Android.

### Phase 3 — Ecosystems and species collection
- Connect each planet to an isolated life-simulation state.
- **Implemented foundation:** map catalog temperature, water coverage, gravity, atmosphere and surface class into each planet's independent biosphere; apply environmental suitability to fitness, population pressure and habitat migration.
- Next: add explicit biome resources, predator/prey relationships and resource competition.
- Ensure genetic changes affect visible procedural morphology and distinguish species beyond color.
- Add species archive, lineage history and discovery milestones.

### Phase 4 — Autonomous civilizations
- Add group formation, settlement, roles, tools, agriculture, trade, research and diplomacy.
- Let civilization decisions run autonomously while player interventions remain optional.
- Model transitions through measurable prerequisites, not fixed year thresholds.

### Phase 5 — Multi-planet galaxy
- Activate independent planet worlds, exploration missions and interplanetary travel.
- Add civilization-led spaceflight only when technological and resource prerequisites are met.
- Use aggregated simulation for distant worlds and detailed simulation for the active world.

### Phase 6 — Economy and commerce
- Test a non-purchasable shop catalog and earnable currency first.
- Validate retention and engagement before enabling real purchases.
- Add optional cosmetics, biome packs, creature packs, VIP and rewarded ads.
- Use platform billing, server-side receipt verification, idempotent entitlement grants and purchase restoration.

### Phase 7 — Commercial release
- Test on representative low-, mid- and high-tier Android devices.
- Verify performance, save migration, offline behavior, privacy disclosures, store compliance and payment recovery.
- Release gradually and monitor crashes, retention, conversion and refund rates.

## Monetization guardrails

- Never sell the ability to keep the core simulation running.
- Do not make extinction prevention, save access or basic species discovery pay-only.
- Purchasable creatures and habitats should be cosmetic/expressive or unlock alternate experiences, not mandatory power.
- Clearly label generated/procedural content and the educational, synthetic nature of the digital genome model.
- Do not enable real billing until purchases can be verified and restored securely.

## Current implementation boundary

The galaxy engine stores catalog metadata, and the new viewer renders a navigable 3D map plus simplified orbital markers. Discovery and active-world selection persist locally. It now stores a separate autonomous digital biosphere for each selected planet, but does not yet create independent planetary terrain or climate-coupled ecology, simulate civilizations, synchronize cloud saves, or process payments. Those remain explicit later phases.


### Phase 2 integration milestone — per-planet digital biospheres

The selected catalog planet now emits an active-world change event consumed by the existing autonomous digital biosphere UI. Each stable planet ID receives its own saved biosphere, deterministic initialization seed, speed and live-state metadata. Switching worlds saves the current state and restores the destination state; creating/resetting a biosphere affects only the active planet. The previous single biosphere save is migrated to the original home planet only and retained as a backup. The existing Earth renderer and its separate evolutionary timeline are intentionally not silently relabeled as another planet; world-specific terrain, climate coupling and a true per-world rendering scene remain later integration work.


### Phase 3 implementation milestone — environmental selection pressure

The autonomous evolution engine now persists a version-2 environment profile per world while migrating version-1 biosphere saves. It derives the profile from the selected planet catalog and models temperature, water, gravity, atmosphere and surface compatibility in species fitness. Environmental stress influences population change; migration options vary by world class, and gas giants use a clearly labeled hypothetical atmospheric habitat rather than a solid surface. The Android/PWA UI reports the active planet's modeled conditions and baseline suitability. This remains a bounded educational abstraction: no fluid dynamics, geochemistry, measured climate simulation or biological prediction is claimed.
