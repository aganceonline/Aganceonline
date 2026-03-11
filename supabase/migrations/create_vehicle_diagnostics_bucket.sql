-- Create a new storage bucket for vehicle diagnostics PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-diagnostics', 'vehicle-diagnostics', true, 10485760, ARRAY['application/pdf']);

-- Allow public read access to the vehicle-diagnostics bucket
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'vehicle-diagnostics' );

-- Allow authenticated admins to insert files into the vehicle-diagnostics bucket
create policy "Admin Insert"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'vehicle-diagnostics' );

-- Allow authenticated admins to update files in the vehicle-diagnostics bucket
create policy "Admin Update"
on storage.objects for update
to authenticated
using ( bucket_id = 'vehicle-diagnostics' );

-- Allow authenticated admins to delete files from the vehicle-diagnostics bucket
create policy "Admin Delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'vehicle-diagnostics' );
