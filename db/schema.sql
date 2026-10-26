create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null
);
create table if not exists students (
  id serial primary key,
  nim varchar(20) unique not null,
  name text not null
);
create table if not exists incomes (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  week int not null check (week between 1 and 4),
  amount int not null check (amount > 0),
  paid_date date not null default current_date,
  unique (student_id, period_year, period_month, week)
);
create table if not exists outcomes (
  id serial primary key,
  description text not null,
  amount int not null check (amount > 0),
  spent_date date not null default current_date
);
-- Aman: blokir akses lewat Supabase REST API (app memakai koneksi Postgres langsung)
alter table users enable row level security;
alter table students enable row level security;
alter table incomes enable row level security;
alter table outcomes enable row level security;
