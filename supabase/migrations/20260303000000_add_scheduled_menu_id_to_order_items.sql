-- Add scheduled_menu_id column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS scheduled_menu_id UUID REFERENCES public.scheduled_menu(id) ON DELETE SET NULL;
