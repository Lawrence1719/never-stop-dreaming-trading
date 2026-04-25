INSERT INTO public.settings (key, value)
VALUES ('free_shipping_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
