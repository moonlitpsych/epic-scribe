-- Clean Slate Migration
-- Drops all existing tables to start fresh
-- Run this FIRST if you need to reset the database

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS generated_notes CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Drop any leftover functions/triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Note: This will delete ALL data in these tables
-- Make sure you have backups if needed
