create extension if not exists "pgcrypto";

create table if not exists public.checkins (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    stress smallint not null check (stress between 1 and 5),
    energy smallint not null check (energy between 1 and 5),
    need_pause boolean not null
);

alter table public.checkins enable row level security;

create index if not exists checkins_created_at_idx on public.checkins (created_at desc);