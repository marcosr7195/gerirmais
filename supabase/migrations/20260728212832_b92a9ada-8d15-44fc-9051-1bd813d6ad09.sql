
REVOKE EXECUTE ON FUNCTION public.log_client_creation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_deal_stage_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_service_order_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_proposal_creation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
