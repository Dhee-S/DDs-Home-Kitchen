
-- Fix function search path
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'HK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dish_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity <= 0 THEN
    NEW.is_available = false;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix overly permissive INSERT policies
-- profiles: only the trigger inserts, but let's restrict to own id
DROP POLICY "System can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- user_roles: only trigger inserts
DROP POLICY "System can insert roles" ON public.user_roles;
CREATE POLICY "Trigger inserts roles" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

-- notifications: restrict insert to authenticated users
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
