-- Add dish_type to dishes table
ALTER TABLE public.dishes 
ADD COLUMN IF NOT EXISTS dish_type TEXT DEFAULT 'veg' CHECK (dish_type IN ('veg', 'non-veg'));

-- Update existing tasks to have a default value if needed
UPDATE public.dishes SET dish_type = 'veg' WHERE dish_type IS NULL;
