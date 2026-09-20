-- ==============================================================================
-- G.V. MILK AGENCY & POS — COMPLETE SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this complete script in your Supabase Project's SQL Editor (Dashboard -> SQL Editor -> New Query)
-- It will automatically create all tables, indexes, and Row Level Security policies.

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Business Settings Table (Stores business profile, GST rate, printer paper size, etc.)
create table if not exists public.settings (
    id text primary key default 'business_profile',
    business_name text not null default 'G. V. MILK AGENCY',
    address text default 'SOLAN NAGAR',
    area text default 'SOLAN NAGAR',
    city text default 'CHENNAI - 600109',
    phone text default '9840865510',
    email text default '',
    owner_name text default 'Venkatesh',
    gstin text default '',
    gst_rate numeric default 5,
    currency text not null default '₹',
    paper_size text not null default '58mm',
    logo text default '',
    user_photo text default '',
    next_bill_number integer default 1,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default business profile if not exists
insert into public.settings (id, business_name, address, area, city, phone, gstin, gst_rate, currency, paper_size, next_bill_number)
values ('business_profile', 'G. V. MILK AGENCY', 'SOLAN NAGAR', 'SOLAN NAGAR', 'CHENNAI - 600109', '9840865510', '', 5, '₹', '58mm', 1)
on conflict (id) do nothing;

-- 3. Brands / Companies Table (Aavin, Hatsun, Heritage, Milky Mist, etc.)
create table if not exists public.companies (
    id text primary key,
    name text not null,
    description text default '',
    color text default '#4F46E5',
    image text default '',
    logo text default '',
    status text not null default 'ACTIVE',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Products Table (Aavin Blue, Green, Orange, Curd, etc.)
create table if not exists public.products (
    id text primary key,
    name text not null,
    company_id text references public.companies(id) on delete set null,
    unit text not null default 'Packet',
    rate numeric not null default 0,
    gst_rate numeric default 0,
    status text not null default 'ACTIVE',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Retail Shops / Outlets Table (Store delivery locations)
create table if not exists public.shops (
    id text primary key,
    name text not null,
    owner text default '',
    phone text default '',
    area text default '',
    status text not null default 'ACTIVE',
    balance numeric default 0,
    outstanding_balance numeric default 0,
    address text default '',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Bills Table (Daily deliveries & walk-in POS receipts)
create table if not exists public.bills (
    id text primary key,
    bill_number text not null,
    shop_id text references public.shops(id) on delete set null,
    shop_name text not null default 'Walk-in Retail Customer',
    shop_phone text default '',
    customer_name text default '',
    customer_phone text default '',
    date text not null,
    date_raw text default '',
    time text default '',
    type text default 'delivery',
    total_items integer default 0,
    total_qty numeric default 0,
    current_amount numeric default 0,
    total_amount numeric not null default 0,
    sub_total numeric default 0,
    taxable_amount numeric default 0,
    gst_rate numeric default 5,
    gst_amount numeric default 0,
    cgst_amount numeric default 0,
    sgst_amount numeric default 0,
    previous_due numeric default 0,
    round_off numeric default 0,
    final_amount numeric not null default 0,
    paid_amount numeric not null default 0,
    unpaid_amount numeric not null default 0,
    payment_status text not null default 'PAID',
    payment_method text not null default 'CASH',
    items jsonb not null default '[]'::jsonb,
    is_print boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Operator Accounts & Authentication Table (Users & Avatars - No Roles)
create table if not exists public.users (
    id text primary key,
    name text not null,
    phone text unique not null,
    pin text default '',
    photo text default '',
    avatar_url text default '',
    status text not null default 'ACTIVE',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default admin account if not exists
insert into public.users (id, name, phone, pin)
values ('user_admin', 'Venkatesh', '9840865510', '')
on conflict (id) do nothing;

-- Optional Upgrade Migration (safely adds any new columns to existing Supabase installations)
alter table if exists public.companies add column if not exists color text default '#4F46E5';
alter table if exists public.products add column if not exists gst_rate numeric default 0;
alter table if exists public.shops add column if not exists balance numeric default 0;
alter table if exists public.shops add column if not exists outstanding_balance numeric default 0;
alter table if exists public.bills add column if not exists customer_name text default '';
alter table if exists public.bills add column if not exists customer_phone text default '';
alter table if exists public.bills add column if not exists date_raw text default '';
alter table if exists public.bills add column if not exists time text default '';
alter table if exists public.bills add column if not exists type text default 'delivery';
alter table if exists public.bills add column if not exists total_items integer default 0;
alter table if exists public.bills add column if not exists total_qty numeric default 0;
alter table if exists public.bills add column if not exists current_amount numeric default 0;
alter table if exists public.bills add column if not exists sub_total numeric default 0;
alter table if exists public.bills add column if not exists taxable_amount numeric default 0;
alter table if exists public.bills add column if not exists gst_rate numeric default 0;
alter table if exists public.bills add column if not exists gst_amount numeric default 0;
alter table if exists public.bills add column if not exists cgst_amount numeric default 0;
alter table if exists public.bills add column if not exists sgst_amount numeric default 0;
alter table if exists public.bills add column if not exists is_print boolean default false;
alter table if exists public.users add column if not exists photo text default '';
alter table if exists public.users add column if not exists avatar_url text default '';
alter table if exists public.users drop column if exists role;

-- 8. High-Performance Indexes for Instant Queries
create index if not exists idx_bills_date on public.bills(date);
create index if not exists idx_bills_created_at on public.bills(created_at desc);
create index if not exists idx_bills_shop_id on public.bills(shop_id);
create index if not exists idx_products_company_id on public.products(company_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_users_phone on public.users(phone);

-- 9. Enable Row Level Security (RLS) on all tables
alter table public.settings enable row level security;
alter table public.companies enable row level security;
alter table public.products enable row level security;
alter table public.shops enable row level security;
alter table public.bills enable row level security;
alter table public.users enable row level security;

-- 10. Public Anon Policies for Direct Frontend Operations
drop policy if exists "Allow all operations for anon" on public.settings;
create policy "Allow all operations for anon" on public.settings for all using (true) with check (true);

drop policy if exists "Allow all operations for anon" on public.companies;
create policy "Allow all operations for anon" on public.companies for all using (true) with check (true);

drop policy if exists "Allow all operations for anon" on public.products;
create policy "Allow all operations for anon" on public.products for all using (true) with check (true);

drop policy if exists "Allow all operations for anon" on public.shops;
create policy "Allow all operations for anon" on public.shops for all using (true) with check (true);

drop policy if exists "Allow all operations for anon" on public.bills;
create policy "Allow all operations for anon" on public.bills for all using (true) with check (true);

drop policy if exists "Allow all operations for anon" on public.users;
create policy "Allow all operations for anon" on public.users for all using (true) with check (true);

-- 11. Enable Realtime Replication for Live Sync (Idempotent check)
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings') then
        alter publication supabase_realtime add table public.settings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'companies') then
        alter publication supabase_realtime add table public.companies;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products') then
        alter publication supabase_realtime add table public.products;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shops') then
        alter publication supabase_realtime add table public.shops;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bills') then
        alter publication supabase_realtime add table public.bills;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users') then
        alter publication supabase_realtime add table public.users;
    end if;
end $$;

-- 12. Supabase S3-Compatible Storage Bucket for Static Assets (Logos, Photos, Avatars)
-- Creates 'pos-assets' public storage bucket for store logos, company branding & user photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'pos-assets',
    'pos-assets',
    true,
    5242880, -- 5MB limit
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

-- Storage Access Policies for 'pos-assets' Bucket
drop policy if exists "Public read on pos-assets" on storage.objects;
create policy "Public read on pos-assets"
on storage.objects for select
using (bucket_id = 'pos-assets');

drop policy if exists "Public insert to pos-assets" on storage.objects;
create policy "Public insert to pos-assets"
on storage.objects for insert
with check (bucket_id = 'pos-assets');

drop policy if exists "Public update on pos-assets" on storage.objects;
create policy "Public update on pos-assets"
on storage.objects for update
using (bucket_id = 'pos-assets');

drop policy if exists "Public delete on pos-assets" on storage.objects;
create policy "Public delete on pos-assets"
on storage.objects for delete
using (bucket_id = 'pos-assets');

