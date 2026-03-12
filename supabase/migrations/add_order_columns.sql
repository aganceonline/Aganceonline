-- Migration to add order columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS order_inventory INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS order_home INTEGER DEFAULT 0;

COMMENT ON COLUMN products.order_inventory IS 'Display order for the inventory page (ascending)';
COMMENT ON COLUMN products.order_home IS 'Display order for the home page (ascending)';

-- Initialize with IDs to preserve existing (most likely chronological) order
UPDATE products SET order_inventory = id, order_home = id;
