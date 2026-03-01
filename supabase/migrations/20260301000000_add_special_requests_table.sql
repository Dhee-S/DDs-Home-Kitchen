-- Add special_requests table
CREATE TABLE IF NOT EXISTS public.special_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  dish_type TEXT DEFAULT 'veg',
  request_date DATE NOT NULL,
  request_time TEXT,
  quantity INTEGER DEFAULT 1,
  occasion TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all requests" ON public.special_requests;
CREATE POLICY "Users can view all requests" ON public.special_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create requests" ON public.special_requests;
CREATE POLICY "Users can create requests" ON public.special_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own requests" ON public.special_requests;
CREATE POLICY "Users can update own requests" ON public.special_requests FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own requests" ON public.special_requests;
CREATE POLICY "Users can delete own requests" ON public.special_requests FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Managers can manage all requests" ON public.special_requests;
CREATE POLICY "Managers can manage all requests" ON public.special_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Clear stuck requests for March 5th and 11th
DELETE FROM public.special_requests WHERE request_date IN ('2025-03-05', '2025-03-11');

-- If dates are different (e.g. 2026), adjust:
-- DELETE FROM public.special_requests WHERE request_date IN ('2026-03-05', '2026-03-11');
