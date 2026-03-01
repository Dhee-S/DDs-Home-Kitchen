-- migrations/20260301014148_add_atomic_order.sql

-- Define the atomic place order function
CREATE OR REPLACE FUNCTION public.place_order(
  _user_id UUID,
  _total_amount NUMERIC,
  _notes TEXT,
  _items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _order_code TEXT;
  _order_id UUID;
  _item JSONB;
  _dish_id UUID;
  _quantity INTEGER;
  _unit_price NUMERIC;
  _stock INTEGER;
BEGIN
  -- Generate unique order code
  _order_code := public.generate_order_code();

  -- Insert the order
  INSERT INTO public.orders (user_id, order_code, total_amount, notes, status)
  VALUES (_user_id, _order_code, _total_amount, _notes, 'pending')
  RETURNING id INTO _order_id;

  -- Process each item
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _dish_id := (_item->>'dishId')::UUID;
    _quantity := (_item->>'quantity')::INTEGER;
    _unit_price := (_item->>'price')::NUMERIC;

    -- Verify and reduce stock
    SELECT stock_quantity INTO _stock FROM public.dishes WHERE id = _dish_id FOR UPDATE;
    
    IF _stock < _quantity THEN
      RAISE EXCEPTION 'Insufficient stock for dish %', _dish_id;
    END IF;

    UPDATE public.dishes SET stock_quantity = stock_quantity - _quantity WHERE id = _dish_id;

    -- Insert order item
    INSERT INTO public.order_items (order_id, dish_id, quantity, unit_price)
    VALUES (_order_id, _dish_id, _quantity, _unit_price);
  END LOOP;

  -- Create a notification for the manager
  INSERT INTO public.notifications (title, message, type, reference_id)
  VALUES (
    'New Order!',
    'Order ' || _order_code || ' placed. Total: ₹' || _total_amount,
    'order',
    _order_id
  );

  RETURN jsonb_build_object('order_id', _order_id, 'order_code', _order_code);
END;
$$;
