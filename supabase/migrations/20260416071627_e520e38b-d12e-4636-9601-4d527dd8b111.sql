
-- Add business settings columns to profiles
ALTER TABLE public.profiles
ADD COLUMN slogan text,
ADD COLUMN owner_name text,
ADD COLUMN owner_role text,
ADD COLUMN fiscal_type text DEFAULT 'mei',
ADD COLUMN fiscal_document text,
ADD COLUMN company_name text,
ADD COLUMN whatsapp text,
ADD COLUMN commercial_email text,
ADD COLUMN website text,
ADD COLUMN instagram text,
ADD COLUMN zip_code text,
ADD COLUMN street text,
ADD COLUMN number text,
ADD COLUMN complement text,
ADD COLUMN neighborhood text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN bank_name text,
ADD COLUMN account_type text DEFAULT 'corrente',
ADD COLUMN agency text,
ADD COLUMN account_number text,
ADD COLUMN pix_key text,
ADD COLUMN account_holder text,
ADD COLUMN logo_url text;

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);

-- Public read access
CREATE POLICY "Business logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Users can upload their own logo (folder = user id)
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own logo
CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own logo
CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
