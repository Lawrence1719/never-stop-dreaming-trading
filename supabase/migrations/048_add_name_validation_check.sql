-- Add name validation check constraint to profiles table
-- This regex allows letters (including accented/unicode), spaces, hyphens, and apostrophes
-- Double single quotes ('') are used to escape the apostrophe in the SQL string
ALTER TABLE profiles 
ADD CONSTRAINT name_validation_check 
CHECK (name ~ '^[a-zA-ZÀ-ÖØ-öø-ÿ\s''\-]+$') NOT VALID;

-- Update the handle_new_user function to ensure it doesn't fail if name is missing from metadata 
-- but also ensure the name passed to INSERT will satisfy the check constraint if it's there.
-- (The COALESCE already handles the 'User' fallback which satisfies the regex)
