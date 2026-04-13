
ALTER TABLE public.clients
ADD COLUMN person_type text DEFAULT 'pf',
ADD COLUMN document text,
ADD COLUMN trade_name text,
ADD COLUMN instagram text,
ADD COLUMN website text,
ADD COLUMN zip_code text,
ADD COLUMN street text,
ADD COLUMN number text,
ADD COLUMN complement text,
ADD COLUMN neighborhood text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN first_contact_date date DEFAULT CURRENT_DATE;
