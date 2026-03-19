-- 025_add_address_details.sql
-- Add missing columns for full address details and PSGC codes

DO $$ 
BEGIN
    -- Add barangay column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'barangay') THEN
        ALTER TABLE public.addresses ADD COLUMN barangay TEXT;
    END IF;

    -- Add province_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'province_code') THEN
        ALTER TABLE public.addresses ADD COLUMN province_code TEXT;
    END IF;

    -- Add city_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'city_code') THEN
        ALTER TABLE public.addresses ADD COLUMN city_code TEXT;
    END IF;

    -- Add barangay_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'addresses' AND COLUMN_NAME = 'barangay_code') THEN
        ALTER TABLE public.addresses ADD COLUMN barangay_code TEXT;
    END IF;
END $$;
