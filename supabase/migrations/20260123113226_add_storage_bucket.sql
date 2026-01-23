-- Create a new storage bucket for form uploads
insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', true)
on conflict (id) do nothing;

-- Set up access policies for the storage bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'form-uploads' );

create policy "Public Upload"
  on storage.objects for insert
  with check ( bucket_id = 'form-uploads' );
