-- 049_create_audit_logs_and_anonymization.sql
-- Implements audit logging for critical actions and data anonymization logic for account deletion.

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- 2. Anonymization Function
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update Profile
    UPDATE public.profiles
    SET 
        name = 'Deleted User',
        email = 'deleted-' || target_user_id || '@nsd.trading', -- specific domain
        phone = NULL,
        deleted_at = NOW()
    WHERE id = target_user_id;

    -- Update Addresses
    UPDATE public.addresses
    SET 
        full_name = 'Deleted User',
        phone = '000-000-0000',
        street_address = 'Anonymized',
        city = 'Anonymized',
        province = 'Anonymized',
        barangay = 'Anonymized',
        zip_code = '00000',
        city_code = NULL,
        province_code = NULL,
        barangay_code = NULL,
        email = 'deleted-' || target_user_id || '@nsd.trading'
    WHERE user_id = target_user_id;

    -- Update Orders (Anonymize the JSONB shipping_address if present)
    -- We assume shipping_address JSONB contains name, phone, etc.
    UPDATE public.orders
    SET 
        shipping_address = shipping_address || '{"full_name": "Deleted User", "phone": "000-000-0000", "street": "Anonymized", "city": "Anonymized", "province": "Anonymized", "barangay": "Anonymized", "zip": "00000"}'::jsonb
    WHERE user_id = target_user_id;

    -- Note: Reviews reference profiles(id). Since the profile name is now 'Deleted User', 
    -- any join to profiles will automatically show 'Deleted User'.
    
    -- Record Audit Log
    INSERT INTO public.audit_logs (actor_id, target_id, target_type, action, metadata)
    VALUES (
        auth.uid(), -- Might be null if triggered by system
        target_user_id,
        'profile',
        'anonymize_cleanup',
        jsonb_build_object('reason', '30-day grace period expired')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. utility for manual hard delete audit
CREATE OR REPLACE FUNCTION public.log_hard_delete(actor_id UUID, target_id UUID, target_type TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, target_id, target_type, action)
    VALUES (actor_id, target_id, target_type, 'hard_delete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
