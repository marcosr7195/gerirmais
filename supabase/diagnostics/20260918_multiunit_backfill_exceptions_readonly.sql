-- Gerir+ — exceções agregadas para prontidão do backfill multiunidade
-- Data: 2026-09-18
-- Segurança: somente leitura; retorna contagens agregadas, nunca valores pessoais.

begin transaction read only;
set local statement_timeout = '60s';

with
profile_metrics as (
  select
    count(*)::bigint as total_profiles,
    count(*) filter (
      where nullif(regexp_replace(coalesce(fiscal_document, ''), '[^0-9]', '', 'g'), '') is not null
        and nullif(regexp_replace(coalesce(document, ''), '[^0-9]', '', 'g'), '') is not null
        and regexp_replace(fiscal_document, '[^0-9]', '', 'g')
            is distinct from regexp_replace(document, '[^0-9]', '', 'g')
    )::bigint as document_conflict_count,
    count(*) filter (
      where nullif(btrim(business_name), '') is null
    )::bigint as missing_primary_business_name_count,
    count(*) filter (
      where nullif(btrim(business_name), '') is null
        and nullif(btrim(company_name), '') is null
        and nullif(btrim(owner_name), '') is null
    )::bigint as no_usable_name_candidate_count,
    count(*) filter (
      where nullif(btrim(slug), '') is null
    )::bigint as missing_slug_count,
    count(*) filter (
      where coalesce(nullif(btrim(bank_name), ''),
                     nullif(btrim(account_type), ''),
                     nullif(btrim(agency), ''),
                     nullif(btrim(account_number), ''),
                     nullif(btrim(pix_key), ''),
                     nullif(btrim(account_holder), '')) is not null
    )::bigint as profiles_with_any_bank_data,
    count(*) filter (
      where coalesce(nullif(btrim(account_number), ''), nullif(btrim(pix_key), '')) is not null
    )::bigint as profiles_with_bank_identifier,
    count(*) filter (
      where coalesce(nullif(btrim(bank_name), ''),
                     nullif(btrim(account_type), ''),
                     nullif(btrim(agency), ''),
                     nullif(btrim(account_number), ''),
                     nullif(btrim(pix_key), ''),
                     nullif(btrim(account_holder), '')) is not null
        and coalesce(nullif(btrim(account_number), ''), nullif(btrim(pix_key), '')) is null
    )::bigint as bank_data_without_identifier_count,
    count(*) filter (
      where coalesce(nullif(btrim(account_number), ''), nullif(btrim(pix_key), '')) is not null
        and coalesce(
          nullif(regexp_replace(coalesce(fiscal_document, ''), '[^0-9]', '', 'g'), ''),
          nullif(regexp_replace(coalesce(document, ''), '[^0-9]', '', 'g'), '')
        ) is null
    )::bigint as bank_identifier_without_fiscal_document_count
  from public.profiles
),
normalized_slugs as (
  select
    lower(regexp_replace(btrim(slug), '[[:space:]]+', '-', 'g')) as normalized_slug,
    count(*)::bigint as profile_count
  from public.profiles
  where nullif(btrim(slug), '') is not null
  group by lower(regexp_replace(btrim(slug), '[[:space:]]+', '-', 'g'))
),
slug_metrics as (
  select
    count(*) filter (where profile_count > 1)::bigint as collision_group_count,
    coalesce(sum(profile_count) filter (where profile_count > 1), 0)::bigint as profiles_in_collision_count
  from normalized_slugs
),
proposal_duplicates as (
  select user_id, lower(btrim(proposal_number)) as normalized_number, count(*)::bigint as duplicate_count
  from public.proposals
  where user_id is not null and nullif(btrim(proposal_number), '') is not null
  group by user_id, lower(btrim(proposal_number))
  having count(*) > 1
),
proposal_numbers as (
  select
    user_id,
    nullif(regexp_replace(coalesce(proposal_number, ''), '[^0-9]', '', 'g'), '')::numeric as numeric_number
  from public.proposals
),
proposal_owner_max as (
  select user_id, max(numeric_number) as max_numeric_number
  from proposal_numbers
  where user_id is not null and numeric_number is not null
  group by user_id
),
proposal_metrics as (
  select
    (select count(*)::bigint from public.proposals) as total_proposals,
    (select count(*) filter (where nullif(btrim(proposal_number), '') is null)::bigint from public.proposals) as missing_proposal_number_count,
    (select count(*) filter (
       where nullif(btrim(proposal_number), '') is not null
         and nullif(regexp_replace(proposal_number, '[^0-9]', '', 'g'), '') is null
     )::bigint from public.proposals) as non_numeric_proposal_number_count,
    (select count(*)::bigint from proposal_duplicates) as duplicate_number_group_count,
    (select coalesce(sum(duplicate_count), 0)::bigint from proposal_duplicates) as proposals_in_duplicate_groups,
    (select count(*)::bigint from proposal_owner_max) as owners_with_numeric_sequence,
    (select min(max_numeric_number) from proposal_owner_max) as min_owner_max_number,
    (select max(max_numeric_number) from proposal_owner_max) as max_owner_max_number,
    (select round(avg(max_numeric_number), 2) from proposal_owner_max) as avg_owner_max_number
),
category_name_groups as (
  select
    user_id,
    lower(btrim(name)) as normalized_name,
    count(*)::bigint as category_count
  from public.categories
  where user_id is not null and nullif(btrim(name), '') is not null
  group by user_id, lower(btrim(name))
),
transaction_category_matches as (
  select
    t.id,
    case
      when nullif(btrim(t.category), '') is null then 0
      else (
        select count(*)
        from public.categories c
        where c.user_id = t.user_id
          and lower(btrim(c.name)) = lower(btrim(t.category))
      )
    end::bigint as match_count,
    nullif(btrim(t.category), '') is null as category_missing
  from public.transactions t
),
category_metrics as (
  select
    (select count(*)::bigint from public.transactions) as total_transactions,
    count(*) filter (where category_missing)::bigint as missing_category_count,
    count(*) filter (where not category_missing and match_count = 0)::bigint as unmapped_category_count,
    count(*) filter (where match_count = 1)::bigint as uniquely_mapped_category_count,
    count(*) filter (where match_count > 1)::bigint as ambiguously_mapped_category_count,
    (select count(*) filter (where category_count > 1)::bigint from category_name_groups) as duplicate_category_group_count
  from transaction_category_matches
),
personal_user_integrity as (
  select 'financas_pessoais'::text as table_name,
         count(*)::bigint as row_count,
         count(*) filter (where user_id is null)::bigint as null_user_id,
         count(*) filter (where user_id is not null and not exists (
           select 1 from auth.users u where u.id = financas_pessoais.user_id
         ))::bigint as orphan_user_id
  from public.financas_pessoais
  union all
  select 'financas_pessoais_categorias', count(*)::bigint,
         count(*) filter (where user_id is null)::bigint,
         count(*) filter (where user_id is not null and not exists (
           select 1 from auth.users u where u.id = financas_pessoais_categorias.user_id
         ))::bigint
  from public.financas_pessoais_categorias
  union all
  select 'credit_cards', count(*)::bigint,
         count(*) filter (where user_id is null)::bigint,
         count(*) filter (where user_id is not null and not exists (
           select 1 from auth.users u where u.id = credit_cards.user_id
         ))::bigint
  from public.credit_cards
  union all
  select 'credit_card_purchases', count(*)::bigint,
         count(*) filter (where user_id is null)::bigint,
         count(*) filter (where user_id is not null and not exists (
           select 1 from auth.users u where u.id = credit_card_purchases.user_id
         ))::bigint
  from public.credit_card_purchases
  union all
  select 'credit_card_installments', count(*)::bigint,
         count(*) filter (where user_id is null)::bigint,
         count(*) filter (where user_id is not null and not exists (
           select 1 from auth.users u where u.id = credit_card_installments.user_id
         ))::bigint
  from public.credit_card_installments
),
report as (
  select
    '01_document_conflicts'::text as section,
    'profiles'::text as item_key,
    jsonb_build_object(
      'total_profiles', total_profiles,
      'document_conflict_count', document_conflict_count
    ) as details
  from profile_metrics

  union all
  select
    '02_unit_name_readiness',
    'profiles',
    jsonb_build_object(
      'total_profiles', total_profiles,
      'missing_primary_business_name_count', missing_primary_business_name_count,
      'no_usable_name_candidate_count', no_usable_name_candidate_count
    )
  from profile_metrics

  union all
  select
    '03_slug_readiness',
    'profiles',
    jsonb_build_object(
      'missing_slug_count', p.missing_slug_count,
      'collision_group_count', s.collision_group_count,
      'profiles_in_collision_count', s.profiles_in_collision_count
    )
  from profile_metrics p cross join slug_metrics s

  union all
  select
    '04_banking_readiness',
    'profiles',
    jsonb_build_object(
      'profiles_with_any_bank_data', profiles_with_any_bank_data,
      'profiles_with_bank_identifier', profiles_with_bank_identifier,
      'bank_data_without_identifier_count', bank_data_without_identifier_count,
      'bank_identifier_without_fiscal_document_count', bank_identifier_without_fiscal_document_count
    )
  from profile_metrics

  union all
  select
    '05_proposal_sequence_readiness',
    'proposals',
    to_jsonb(proposal_metrics)
  from proposal_metrics

  union all
  select
    '06_category_mapping_readiness',
    'transactions_to_categories',
    to_jsonb(category_metrics)
  from category_metrics

  union all
  select
    '07_personal_user_integrity',
    table_name,
    jsonb_build_object(
      'table_name', table_name,
      'row_count', row_count,
      'null_user_id', null_user_id,
      'orphan_user_id', orphan_user_id
    )
  from personal_user_integrity
)
select section, item_key, details::text as details
from report
order by section, item_key;

commit;
