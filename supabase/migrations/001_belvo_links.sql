CREATE TABLE public.belvo_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  link_id text not null,
  institution_name text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.belvo_links enable row level security;

create policy "Users can manage own belvo links" on public.belvo_links
  for all using (auth.uid() = user_id);
