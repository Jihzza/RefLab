-- Versioned, append-only Terms/Privacy acceptance evidence.
--
-- These identifiers describe the document content shipped with this release;
-- they do not imply that the content has received legal approval. Any
-- substantive document change must use a new version and trigger re-consent.

create schema reflab_private;

revoke all privileges
  on schema reflab_private
  from public, anon, authenticated, service_role;

create table reflab_private.legal_document_versions (
  document_type text primary key,
  version text not null,
  configured_at timestamptz not null default statement_timestamp(),
  constraint legal_document_versions_type_check
    check (document_type in ('terms', 'privacy')),
  constraint legal_document_versions_version_check
    check (version ~ '^[a-z0-9][a-z0-9._-]{0,63}$')
);

comment on table reflab_private.legal_document_versions is
  'Current configured legal-document identifiers. A substantive content change requires a new version and re-consent.';

insert into reflab_private.legal_document_versions (document_type, version)
values
  ('terms', 'terms-2026-07-18-v1'),
  ('privacy', 'privacy-2026-07-18-v1');

create table reflab_private.user_legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default statement_timestamp(),
  acceptance_method text not null,
  auth_provider text,
  primary key (user_id, terms_version, privacy_version),
  constraint user_legal_acceptances_terms_version_check
    check (terms_version ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  constraint user_legal_acceptances_privacy_version_check
    check (privacy_version ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  constraint user_legal_acceptances_method_check
    check (acceptance_method = 'authenticated_gate'),
  constraint user_legal_acceptances_auth_provider_check
    check (auth_provider is null or length(auth_provider) between 1 and 64)
);

comment on table reflab_private.user_legal_acceptances is
  'Append-only first-acceptance evidence keyed by auth user and exact Terms/Privacy versions. Provider context is derived from the signed JWT app_metadata claim.';

alter table reflab_private.legal_document_versions enable row level security;
alter table reflab_private.user_legal_acceptances enable row level security;

revoke all privileges
  on table
    reflab_private.legal_document_versions,
    reflab_private.user_legal_acceptances
  from public, anon, authenticated, service_role;

create or replace function public.get_current_legal_acceptance()
returns table (
  is_accepted boolean,
  terms_version text,
  privacy_version text,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  current_terms_version text;
  current_privacy_version text;
begin
  if caller_uid is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  select v.version
    into current_terms_version
    from reflab_private.legal_document_versions as v
   where v.document_type = 'terms';

  select v.version
    into current_privacy_version
    from reflab_private.legal_document_versions as v
   where v.document_type = 'privacy';

  if current_terms_version is null or current_privacy_version is null then
    raise exception 'Legal document versions are not configured'
      using errcode = '55000';
  end if;

  return query
  select
    a.accepted_at is not null,
    current_terms_version,
    current_privacy_version,
    a.accepted_at
  from (values (true)) as singleton(present)
  left join reflab_private.user_legal_acceptances as a
    on a.user_id = caller_uid
   and a.terms_version = current_terms_version
   and a.privacy_version = current_privacy_version;
end;
$function$;

comment on function public.get_current_legal_acceptance() is
  'Returns whether auth.uid() accepted the exact currently configured Terms and Privacy versions.';

create or replace function public.accept_current_legal_documents(
  p_expected_user_id uuid,
  p_terms_version text,
  p_privacy_version text
)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  current_terms_version text;
  current_privacy_version text;
  first_accepted_at timestamptz;
  signed_auth_provider text := nullif(
    left(coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', ''), 64),
    ''
  );
begin
  if caller_uid is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  if p_expected_user_id is distinct from caller_uid then
    raise exception 'Legal acceptance user mismatch'
      using errcode = '42501';
  end if;

  select v.version
    into current_terms_version
    from reflab_private.legal_document_versions as v
   where v.document_type = 'terms';

  select v.version
    into current_privacy_version
    from reflab_private.legal_document_versions as v
   where v.document_type = 'privacy';

  if current_terms_version is null or current_privacy_version is null then
    raise exception 'Legal document versions are not configured'
      using errcode = '55000';
  end if;

  if p_terms_version is distinct from current_terms_version
     or p_privacy_version is distinct from current_privacy_version then
    raise exception 'Legal document version mismatch'
      using errcode = '22023';
  end if;

  insert into reflab_private.user_legal_acceptances (
    user_id,
    terms_version,
    privacy_version,
    acceptance_method,
    auth_provider
  )
  values (
    caller_uid,
    current_terms_version,
    current_privacy_version,
    'authenticated_gate',
    signed_auth_provider
  )
  on conflict (user_id, terms_version, privacy_version) do nothing;

  select a.accepted_at
    into first_accepted_at
    from reflab_private.user_legal_acceptances as a
   where a.user_id = caller_uid
     and a.terms_version = current_terms_version
     and a.privacy_version = current_privacy_version;

  return first_accepted_at;
end;
$function$;

comment on function public.accept_current_legal_documents(uuid, text, text) is
  'Idempotently records auth.uid() first acceptance using the server clock; submitted versions must match the configured versions.';

revoke all privileges
  on function public.get_current_legal_acceptance()
  from public, anon, authenticated, service_role;

revoke all privileges
  on function public.accept_current_legal_documents(uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute
  on function public.get_current_legal_acceptance()
  to authenticated;

grant execute
  on function public.accept_current_legal_documents(uuid, text, text)
  to authenticated;
