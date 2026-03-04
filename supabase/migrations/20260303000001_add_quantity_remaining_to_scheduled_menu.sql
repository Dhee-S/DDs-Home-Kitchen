-- Add quantity_remaining column to scheduled_menu if not exists
ALTER TABLE public.scheduled_menu ADD COLUMN IF NOT EXISTS quantity_remaining INTEGER DEFAULT quantity_available;
