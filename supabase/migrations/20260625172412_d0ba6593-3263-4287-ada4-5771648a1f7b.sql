
-- Revoke EXECUTE on internal SECURITY DEFINER trigger functions (only triggers invoke them)
REVOKE EXECUTE ON FUNCTION public.log_client_creation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_deal_stage_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_service_order_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_proposal_creation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Drop broad SELECT policies that allow listing public buckets.
-- Public file URLs (/storage/v1/object/public/...) bypass RLS, so files remain accessible.
DROP POLICY IF EXISTS "Business logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Vitrine images are publicly accessible" ON storage.objects;
