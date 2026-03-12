-- Migration to add colors column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.colors IS 'Stores an array of color objects: {name, name_ar, hex, gallery, is_default}';
