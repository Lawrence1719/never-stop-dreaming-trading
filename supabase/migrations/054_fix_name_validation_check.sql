-- 054_fix_name_validation_check.sql
-- Updates the name validation regex to allow periods (.), which are necessary for middle initials and other common name formats.

ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS name_validation_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT name_validation_check 
  CHECK (name ~ '^[a-zA-ZÀ-ÖØ-öø-ÿ\s''\-\.]+$') NOT VALID;
