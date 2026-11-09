-- Stable mapping between the 100 online-purchasable worlds and the 3D galaxy.
ALTER TABLE planet_ownership ADD COLUMN galaxy_planet_id TEXT;
UPDATE planet_ownership SET galaxy_planet_id = 'market-world-' || printf('%03d', CAST(substr(planet_id, 8) AS INTEGER)) WHERE planet_id GLOB 'planet-[0-9][0-9][0-9]';
CREATE UNIQUE INDEX IF NOT EXISTS planet_ownership_galaxy_world_unique ON planet_ownership(galaxy_planet_id) WHERE galaxy_planet_id IS NOT NULL;
-- A purchasable planet can have only one owner across all player accounts.
CREATE UNIQUE INDEX IF NOT EXISTS planet_ownership_planet_unique ON planet_ownership(planet_id);
