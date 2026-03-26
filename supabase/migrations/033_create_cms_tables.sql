-- 033_create_cms_tables.sql
-- Create tables for CMS: pages, faqs, testimonials

-- 1. Create cms_pages table
CREATE TABLE IF NOT EXISTS public.cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT DEFAULT '',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create cms_faqs table
CREATE TABLE IF NOT EXISTS public.cms_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create cms_testimonials table
-- NOTE: email field removed to minimize PII exposure (GDPR/CCPA compliant)
CREATE TABLE IF NOT EXISTS public.cms_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'archived')),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cms_pages
CREATE POLICY "Public can read published pages" ON public.cms_pages
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage cms_pages" ON public.cms_pages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for cms_faqs
CREATE POLICY "Public can read published faqs" ON public.cms_faqs
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage cms_faqs" ON public.cms_faqs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for cms_testimonials
CREATE POLICY "Public can read published testimonials" ON public.cms_testimonials
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage cms_testimonials" ON public.cms_testimonials
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at (assuming set_updated_at_column exists)
CREATE TRIGGER trg_set_cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

CREATE TRIGGER trg_set_cms_faqs_updated_at
BEFORE UPDATE ON public.cms_faqs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

CREATE TRIGGER trg_set_cms_testimonials_updated_at
BEFORE UPDATE ON public.cms_testimonials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
