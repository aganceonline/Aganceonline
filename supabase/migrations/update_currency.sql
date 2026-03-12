-- 1. Add new column price_egp
ALTER TABLE products ADD COLUMN price_egp NUMERIC;

-- 2. Migrate existing data (assuming a default rate of 50 EGP per 1 USD)
UPDATE products SET price_egp = price_usd * 50 WHERE price_usd IS NOT NULL;

-- 3. Drop old column price_usd
ALTER TABLE products DROP COLUMN price_usd;

-- 4. Update the settings key
UPDATE app_settings SET key = 'EGP_TO_USD', value = '0.02' WHERE key = 'USD_TO_EGP';
-- If the setting didn't exist, insert it
INSERT INTO app_settings (key, value)
SELECT 'EGP_TO_USD', '0.02'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'EGP_TO_USD');
