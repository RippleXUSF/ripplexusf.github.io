create table readings (
  id uuid default gen_random_uuid() primary key,
  city text not null,
  lat float,
  lng float,
  pm25 float,
  pm10 float,
  aqi integer not null,
  submitter_note text,
  xrpl_txid text,
  data_hash text,
  created_at timestamptz default now()
);

alter table readings enable row level security;

create policy "anyone can read"
  on readings for select using (true);

create policy "anyone can insert"
  on readings for insert with check (true);
