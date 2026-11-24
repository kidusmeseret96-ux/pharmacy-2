export const SUPABASE_SQL_SCHEMA = `-- YOYA Pharmacy Commercial Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor to provision production tables & stock trigger alerts

create extension if not exists "pgcrypto";

-- Primary JSONB Persistence State used automatically by server.ts when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
create table if not exists public.yoya_kv_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null default 'YOYA Pharmacy',
  owner_name text not null default 'Pharmacy Owner',
  license_number text default '',
  currency_symbol text not null default 'Br',
  tax_rate_percent numeric(5,2) not null default 0.00,
  receipt_footer text,
  calendar_mode text not null default 'both' check (calendar_mode in ('ethiopian','gregorian','both')),
  date_offset_days integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.drug_kinds (
  id text primary key,
  label text not null,
  unit_label text not null default 'Units',
  icon_key text not null default 'box',
  is_default boolean not null default false
);

create table if not exists public.drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  strength text,
  category text not null default 'General',
  dosage_form text not null default 'tablet',
  buying_price numeric(12,2) not null check (buying_price >= 0),
  selling_price numeric(12,2) not null check (selling_price > 0),
  base_unit_name text not null default 'Unit',
  pack_unit_name text not null default 'Strip',
  box_unit_name text not null default 'Box',
  units_per_pack integer not null default 1 check (units_per_pack >= 1),
  packs_per_box integer not null default 1 check (packs_per_box >= 1),
  pack_selling_price numeric(12,2),
  box_selling_price numeric(12,2),
  shelf_location text,
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  requires_prescription boolean not null default false,
  batch_number text,
  expiry_date date,
  manufacturer text,
  barcode text unique,
  storage_requirement text not null default 'room_temp',
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'seller' check (role in ('manager','seller')),
  full_name text not null,
  phone text,
  username text not null unique,
  password_hash text not null,
  job_title text,
  shift text not null default 'Full-Time',
  scheduled_clock_in text not null default '08:30',
  scheduled_clock_out text not null default '17:30',
  grace_minutes integer not null default 5,
  photo_image text,
  fayda_front_image text,
  fayda_back_image text,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  cashier_id uuid references public.staff_users(id),
  cashier_name text not null,
  subtotal numeric(12,2) not null,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  total_cost numeric(12,2) not null,
  total_profit numeric(12,2) not null,
  payment_method text not null check (payment_method in ('cash','transfer','card','split')),
  split_cash_amount numeric(12,2),
  split_non_cash_amount numeric(12,2),
  split_second_method text,
  payment_proof_url text,
  prescription_url text,
  patient_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  drug_id uuid not null references public.drugs(id),
  drug_name text not null,
  quantity integer not null check (quantity > 0),
  unit_tier text default 'base',
  unit_label text,
  base_units_deducted integer,
  unit_selling_price numeric(12,2) not null,
  unit_buying_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  drug_id uuid not null references public.drugs(id) on delete cascade,
  current_stock integer not null,
  threshold integer not null,
  severity text not null check (severity in ('warning','critical')),
  acknowledged boolean not null default false,
  triggered_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.staff_users(id) on delete cascade,
  worker_name text not null,
  worker_role text not null,
  type text not null check (type in ('clock_in','clock_out')),
  source text not null default 'qr_scan',
  attendance_status text,
  late_minutes integer default 0,
  recorded_at timestamptz not null default now()
);

create table if not exists public.payroll_profiles (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null unique references public.staff_users(id) on delete cascade,
  work_description text not null,
  monthly_salary numeric(12,2) not null check (monthly_salary > 0),
  payday_day integer not null check (payday_day between 1 and 31),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.payroll_profiles(id) on delete cascade,
  worker_id uuid not null references public.staff_users(id),
  month_key text not null,
  amount numeric(12,2) not null,
  payment_method text not null,
  reference text,
  paid_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  tin_number text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  invoice_number text not null,
  items_summary text,
  total_amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  status text not null check (status in ('unpaid','partial','paid')),
  created_at timestamptz not null default now()
);

create table if not exists public.shift_closes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid,
  worker_name text not null,
  counted_cash numeric(12,2) not null,
  expected_cash numeric(12,2) not null,
  variance numeric(12,2) not null,
  status text not null check (status in ('exact','over','short')),
  transaction_count integer not null default 0,
  notes text,
  closed_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  seq integer not null,
  actor_id text not null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  target_name text not null,
  before_summary text,
  after_summary text,
  prev_hash text not null,
  entry_hash text not null,
  created_at timestamptz not null default now()
);

-- Automatic Low-Stock Alert Trigger
create or replace function public.check_drug_low_stock()
returns trigger as $$
begin
  if new.stock <= new.low_stock_threshold then
    insert into public.stock_alerts (drug_id, current_stock, threshold, severity)
    values (
      new.id,
      new.stock,
      new.low_stock_threshold,
      case when new.stock = 0 then 'critical' else 'warning' end
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_drug_low_stock on public.drugs;
create trigger trg_drug_low_stock
after insert or update of stock on public.drugs
for each row execute function public.check_drug_low_stock();
`;

export const ELECTRON_MAIN_CJS = `// electron/main.cjs — Package YOYA Pharmacy Owner Console as a standalone Windows .exe
const { app, BrowserWindow } = require('electron');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function waitForServer(url, retries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (left <= 0) {
          reject(new Error('Local pharmacy server did not start in time.'));
          return;
        }
        setTimeout(() => attempt(left - 1), 250);
      });
    };
    attempt(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'YOYA Pharmacy — Owner Console',
    backgroundColor: '#0A1114',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  waitForServer('http://127.0.0.1:3000/api/auth/status')
    .then(() => {
      if (mainWindow) mainWindow.loadURL('http://127.0.0.1:3000');
    })
    .catch(() => {
      if (mainWindow) mainWindow.loadURL('http://127.0.0.1:3000');
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const tsxCli = require.resolve('tsx/cli');
  const serverEntry = path.join(__dirname, '../server.ts');
  serverProcess = spawn(process.execPath, [tsxCli, serverEntry], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: '3000',
    },
    stdio: 'ignore',
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
`;

export const RENDER_BLUEPRINT_YAML = `# render.yaml — One-click Render deployment for Staff POS & Pharmacy API
services:
  - type: web
    name: yoya-pharmacy-pos
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: NODE_ENV=production npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: VENDOR_CLOUDFLARE_URL
        sync: false
      - key: VENDOR_SYNC_SECRET
        sync: false
`;

