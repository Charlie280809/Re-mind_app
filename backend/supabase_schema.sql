-- create extension if not exists "pgcrypto";

-- create table if not exists public.checkins (
--     id uuid primary key default gen_random_uuid(),
--     created_at timestamptz not null default now(),
--     stress smallint not null check (stress between 1 and 5),
--     energy smallint not null check (energy between 1 and 5),
--     need_pause boolean not null
-- );

-- alter table public.checkins enable row level security;

-- create index if not exists checkins_created_at_idx on public.checkins (created_at desc);

-- -- Table for storing users' favorite pauses
-- create table if not exists public.favorite_pauses (
--     id uuid not null default gen_random_uuid(),
--     user_id uuid not null,
--     pauze_type text not null,
--     created_at timestamp without time zone null default now(),
--     constraint favorite_pauses_pkey primary key (id),
--     constraint favorite_pauses_user_id_pauze_type_key unique (user_id, pauze_type),
--     constraint favorite_pauses_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
-- ) TABLESPACE pg_default;

-- alter table public.favorite_pauses enable row level security;

-- -- Allow authenticated users to select their own favorite_pauses
-- create policy select_own_favorites
--     on public.favorite_pauses
--     for select
--     using (user_id = auth.uid()::uuid);

-- -- Allow authenticated users to insert favorite_pauses where user_id equals their id
-- create policy insert_own_favorites
--     on public.favorite_pauses
--     for insert
--     with check (user_id = auth.uid()::uuid);

-- -- Allow authenticated users to delete their own favorite_pauses
-- create policy delete_own_favorites
--     on public.favorite_pauses
--     for delete
--     using (user_id = auth.uid()::uuid);

-- -- (Optional) allow updates to own rows if needed
-- create policy update_own_favorites
--     on public.favorite_pauses
--     for update
--     using (user_id = auth.uid()::uuid)
--     with check (user_id = auth.uid()::uuid);