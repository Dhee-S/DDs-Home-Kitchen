-- Create special_requests table for user dish requests
CREATE TABLE IF NOT EXISTS public.special_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  dish_type TEXT DEFAULT 'veg',
  request_date DATE NOT NULL,
  request_time TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  occasion TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view special requests" ON public.special_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create special requests" ON public.special_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own requests" ON public.special_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can manage all requests" ON public.special_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Trigger for updated_at
CREATE TRIGGER update_special_requests_updated_at 
  BEFORE UPDATE ON public.special_requests 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_requests;
