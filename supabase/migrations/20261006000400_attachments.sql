-- Attachments: files the client adds to a request (brief, floor plans, moodboards) and files an agency
-- adds to its proposal (quotes, renders). Each file has a metadata row; storage access follows the row,
-- so whoever can read the row can download the file and nobody can upload without a row of their own.

alter table public.request_attachments
  add column proposal_id uuid references public.proposals (id) on delete cascade,
  add constraint request_attachments_name_check check (file_name <> '' and length(file_name) <= 200),
  add constraint request_attachments_size_check check (size_bytes between 1 and 26214400),
  -- The path starts with the row's own ids, so a row can never point at another request's files.
  -- The last segment is a storage-safe version of file_name, which keeps the original name for display.
  add constraint request_attachments_path_check check (
    storage_path ~ ('^' || request_id::text || '/' || id::text || '/[A-Za-z0-9._-]{1,120}$')),
  add constraint request_attachments_path_key unique (storage_path);
create index request_attachments_request_idx on public.request_attachments (request_id, proposal_id);

-- Who may add or remove files: the client team while the request is a draft or open; the agency
-- managers on their own proposal while they can still change it.
create function public.can_write_attachment(p_request uuid, p_proposal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_proposal is null then exists (
      select 1 from requests r
      where r.id = p_request and r.status in ('draft', 'sent')
        and is_member(r.client_org_id, array['owner', 'admin', 'manager', 'member']::member_role[]))
    else exists (
      select 1 from proposals p join requests r on r.id = p.request_id
      where p.id = p_proposal and p.request_id = p_request and r.status = 'sent'
        and p.status in ('invited', 'reviewing', 'clarification', 'revision_requested', 'withdrawn')
        and is_member(p.agency_org_id, array['owner', 'admin', 'manager']::member_role[]))
  end;
$$;

-- Request files: everyone who can read the request. Proposal files: the agency, and the client once
-- the proposal has been sent.
create function public.can_read_attachment(p_request uuid, p_proposal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_proposal is null then can_read_request(p_request)
    else exists (
      select 1 from proposals p join requests r on r.id = p.request_id
      where p.id = p_proposal
        and (is_member(p.agency_org_id)
          or (is_member(r.client_org_id) and p.status in ('submitted', 'revision_requested', 'accepted', 'rejected'))))
  end;
$$;

drop policy attachments_select on public.request_attachments;
drop policy attachments_write on public.request_attachments;
create policy attachments_select on public.request_attachments for select to authenticated
  using (public.can_read_attachment(request_id, proposal_id));
create policy attachments_insert on public.request_attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_write_attachment(request_id, proposal_id));
create policy attachments_delete on public.request_attachments for delete to authenticated
  using (public.can_write_attachment(request_id, proposal_id));

revoke all on public.request_attachments from anon, authenticated;
grant select, delete on public.request_attachments to authenticated;
grant insert (id, request_id, proposal_id, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  on public.request_attachments to authenticated;

-- Private bucket; size and types are also enforced by Storage itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 26214400, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'text/plain', 'text/csv', 'application/zip'
])
on conflict (id) do nothing;

create policy attachments_objects_select on storage.objects for select to authenticated using (
  bucket_id = 'attachments'
  and exists (select 1 from public.request_attachments a where a.storage_path = objects.name)
);
create policy attachments_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments'
  and exists (select 1 from public.request_attachments a where a.storage_path = objects.name and a.uploaded_by = auth.uid())
);
create policy attachments_objects_delete on storage.objects for delete to authenticated using (
  bucket_id = 'attachments'
  and exists (
    select 1 from public.request_attachments a
    where a.storage_path = objects.name and public.can_write_attachment(a.request_id, a.proposal_id)
  )
);

revoke execute on function public.can_write_attachment, public.can_read_attachment from public, anon;
grant execute on function public.can_write_attachment, public.can_read_attachment to authenticated;
