-- Clear all special requests to start fresh
-- This will allow the manager to properly approve new requests

DELETE FROM public.special_requests WHERE request_date >= '2026-01-01';

-- Also clear any notifications related to old requests
DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '30 days';
