-- ============================================
-- ADD CATEGORY TO SPECIAL REQUESTS
-- Run in Supabase SQL Editor
-- ============================================

-- Add category column
ALTER TABLE public.special_requests 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'special' 
CHECK (category IN ('snacks', 'breakfast', 'lunch', 'dinner', 'special'));

-- Update existing records
UPDATE public.special_requests SET category = 'special' WHERE category IS NULL;
