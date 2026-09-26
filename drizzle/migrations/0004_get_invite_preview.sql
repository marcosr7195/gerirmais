CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object('valid', true, 'email', m.email, 'unit_name', u.name)
    FROM public.unit_members m JOIN public.business_units u ON u.id = m.unit_id
    WHERE m.invite_token = p_token AND m.accepted_at IS NULL
      AND (m.expires_at IS NULL OR m.expires_at > now())
    LIMIT 1), jsonb_build_object('valid', false));
$$;
REVOKE ALL ON FUNCTION public.get_invite_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(uuid) TO anon, authenticated;