-- Aditiva: alertas antigos continuam válidos; novos registros exigem e-mail na função.
ALTER TABLE public.bike_price_alerts ADD COLUMN IF NOT EXISTS email text;
