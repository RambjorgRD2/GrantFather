
-- Cache table to store normalized scraper results
create table if not exists public.scrape_cache (
  cache_key text primary key,
  source_url text not null,
  items jsonb not null,
  dataset_id text,
  actor_run_id text,
  refreshed_at timestamptz not null default now()
);

-- Enable RLS (deny all by default). Edge function uses service role and bypasses RLS.
alter table public.scrape_cache enable row level security;

-- Helpful index for admin queries/maintenance
create index if not exists scrape_cache_refreshed_at_idx on public.scrape_cache (refreshed_at desc);
