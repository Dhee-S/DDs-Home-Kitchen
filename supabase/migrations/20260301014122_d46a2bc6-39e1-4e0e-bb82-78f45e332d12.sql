
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'manager');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  dietary_preference TEXT DEFAULT '',
  preferred_pickup_time TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE(user_id, role)
);

-- Dishes table
CREATE TABLE public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  margin_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily menu
CREATE TABLE public.daily_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  available_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dish_id, available_date)
);

-- Scheduled menu
CREATE TABLE public.scheduled_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  preorder_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dish_id, schedule_date)
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, dish_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_customer BOOLEAN NOT NULL DEFAULT true,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications for manager
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'order',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile and assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON public.dishes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update dish availability when stock changes
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

CREATE TRIGGER check_dish_availability
  BEFORE UPDATE ON public.dishes
  FOR EACH ROW EXECUTE FUNCTION public.update_dish_availability();

-- Generate order code function
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'HK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN code;
END;
$$;

-- RLS POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "System can insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- Dishes
CREATE POLICY "Anyone authenticated can view available dishes" ON public.dishes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert dishes" ON public.dishes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update dishes" ON public.dishes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete dishes" ON public.dishes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Daily menu
CREATE POLICY "Anyone can view daily menu" ON public.daily_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage daily menu" ON public.daily_menu FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update daily menu" ON public.daily_menu FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete daily menu" ON public.daily_menu FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Scheduled menu
CREATE POLICY "Anyone can view scheduled menu" ON public.scheduled_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage scheduled menu" ON public.scheduled_menu FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update scheduled menu" ON public.scheduled_menu FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete scheduled menu" ON public.scheduled_menu FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Orders
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Managers can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Order items
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'manager')))
);
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

-- Chat messages
CREATE POLICY "Users can view own chats" ON public.chat_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Managers can update chat read status" ON public.chat_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Notifications
CREATE POLICY "Managers can view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Managers can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'));

-- Enable realtime for orders and chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for dish images
INSERT INTO storage.buckets (id, name, public) VALUES ('dish-images', 'dish-images', true);

CREATE POLICY "Anyone can view dish images" ON storage.objects FOR SELECT USING (bucket_id = 'dish-images');
CREATE POLICY "Managers can upload dish images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dish-images' AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update dish images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dish-images' AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete dish images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dish-images' AND public.has_role(auth.uid(), 'manager'));
