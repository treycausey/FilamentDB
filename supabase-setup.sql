-- FilamentDB Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  manufacturer TEXT,
  material TEXT,
  color TEXT,
  hex_color TEXT,
  temp1 INTEGER,
  temp2 INTEGER,
  spool_count INTEGER DEFAULT 1,
  remaining_percentage INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for now - you can add auth later)
CREATE POLICY "Allow anonymous access" ON inventory
  FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_manufacturer ON inventory(manufacturer);
CREATE INDEX IF NOT EXISTS idx_inventory_material ON inventory(material);
CREATE INDEX IF NOT EXISTS idx_inventory_color ON inventory(color);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at);