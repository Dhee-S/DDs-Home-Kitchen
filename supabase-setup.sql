-- ============================================
-- DD's Kitchen - Fix & Update
-- Run in Supabase SQL Editor
-- ============================================

-- Add categories to dishes
ALTER TABLE public.dishes 
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{special}';

ALTER TABLE public.dishes 
ADD COLUMN IF NOT EXISTS dish_type TEXT DEFAULT 'veg';

-- Create special_requests if not exists with new statuses
CREATE TABLE IF NOT EXISTS public.special_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dish_name TEXT NOT NULL,
  dish_type TEXT DEFAULT 'veg',
  category TEXT[] DEFAULT '{special}',
  request_date DATE NOT NULL,
  request_time TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  occasion TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read requests" ON public.special_requests;
CREATE POLICY "Public read requests" ON public.special_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert requests" ON public.special_requests;
CREATE POLICY "Users can insert requests" ON public.special_requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update requests" ON public.special_requests;
CREATE POLICY "Users can update requests" ON public.special_requests FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can delete requests" ON public.special_requests;
CREATE POLICY "Users can delete requests" ON public.special_requests FOR DELETE TO authenticated USING (true);

-- Update existing requests to new status format
UPDATE public.special_requests SET status = 'placed' WHERE status = 'pending';
UPDATE public.special_requests SET status = 'confirmed' WHERE status = 'approved';
UPDATE public.special_requests SET status = 'completed' WHERE status = 'rejected';

-- Add order_code to orders if missing
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_code TEXT;
