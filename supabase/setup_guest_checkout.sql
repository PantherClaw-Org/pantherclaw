-- Run this in your Supabase SQL Editor

-- 1. Make user_id optional in addresses table to support guest checkouts
ALTER TABLE addresses ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ensure orders table allows null user_id (it should already be nullable)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
