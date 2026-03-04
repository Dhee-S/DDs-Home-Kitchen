-- Add schedule_price column to scheduled_menu if not exists
ALTER TABLE public.scheduled_menu ADD COLUMN IF NOT EXISTS schedule_price NUMERIC(10,2);

-- Also add date column for backward compatibility if needed
ALTER TABLE public.scheduled_menu ADD COLUMN IF NOT EXISTS date DATE;
