-- Enforce the 50-token marketplace floor for existing D1 databases.
-- Older active listings below the new minimum are cancelled and returned to their owners.
UPDATE specimens
SET status='owned'
WHERE id IN (SELECT specimen_id FROM listings WHERE status='active' AND price<50);
UPDATE listings SET status='cancelled' WHERE status='active' AND price<50;
CREATE TRIGGER IF NOT EXISTS listings_minimum_price_insert
BEFORE INSERT ON listings WHEN NEW.price<50
BEGIN SELECT RAISE(ABORT,'LISTING_PRICE_BELOW_MINIMUM'); END;
CREATE TRIGGER IF NOT EXISTS listings_minimum_price_update
BEFORE UPDATE OF price ON listings WHEN NEW.price<50
BEGIN SELECT RAISE(ABORT,'LISTING_PRICE_BELOW_MINIMUM'); END;
