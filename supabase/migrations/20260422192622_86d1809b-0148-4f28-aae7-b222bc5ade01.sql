ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.sync_deal_lifecycle_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'fechado' AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSIF NEW.stage IS DISTINCT FROM 'fechado' THEN
    NEW.closed_at := NULL;
  END IF;

  IF NEW.archived_at IS NOT NULL AND NEW.closed_at IS NULL THEN
    NEW.closed_at := COALESCE(NEW.updated_at, now());
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    NEW.archived_at := COALESCE(NEW.archived_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_deal_lifecycle_dates_on_deals ON public.deals;

CREATE TRIGGER sync_deal_lifecycle_dates_on_deals
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_lifecycle_dates();

UPDATE public.deals
SET closed_at = COALESCE(updated_at, created_at, now())
WHERE stage = 'fechado' AND closed_at IS NULL;