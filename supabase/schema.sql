create table if not exists public.flowboost_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  instagram_user varchar(30),
  profile_url text,
  quantity integer not null,
  total_cents integer not null,
  status text not null default 'AGUARDANDO',
  email_status text not null default 'PENDENTE',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowboost_code_format check (code ~ '^FB-[A-F0-9]{12}$'),
  constraint flowboost_profile_required check (
    coalesce(length(btrim(instagram_user)), 0) > 0
    or coalesce(length(btrim(profile_url)), 0) > 0
  ),
  constraint flowboost_profile_url_length check (profile_url is null or length(profile_url) <= 500),
  constraint flowboost_status_valid check (status in ('AGUARDANDO','PROCESSANDO','CONCLUIDO','CANCELADO')),
  constraint flowboost_email_status_valid check (email_status in ('PENDENTE','ENVIADO','FALHOU')),
  constraint flowboost_package_price_match check (
    (quantity = 100 and total_cents = 400)
    or (quantity = 250 and total_cents = 700)
    or (quantity = 500 and total_cents = 1200)
    or (quantity = 1000 and total_cents = 1990)
    or (quantity = 2500 and total_cents = 4490)
    or (quantity = 5000 and total_cents = 7490)
    or (quantity = 10000 and total_cents = 12990)
  )
);

create index if not exists flowboost_orders_created_at_idx on public.flowboost_orders (created_at desc);
create index if not exists flowboost_orders_status_idx on public.flowboost_orders (status);

alter table public.flowboost_orders enable row level security;
revoke all on table public.flowboost_orders from anon, authenticated;
grant select, insert, update on table public.flowboost_orders to service_role;
