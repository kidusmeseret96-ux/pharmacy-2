import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.ts';
import type {
  AttendanceQrConfig,
  AttendanceRecord,
  AttendanceSummary,
  AuditLogEntry,
  ClinicSettings,
  Drug,
  DrugKind,
  ExpenseRecord,
  LicenseStatus,
  PayrollPayment,
  PayrollProfile,
  PayrollStatusEntry,
  ShiftCloseReport,
  StaffUser,
  StockAlert,
  Supplier,
  SupplierInvoice,
  Transaction,
  UserRole,
  VendorFeatureLocks,
  VendorInstallationSummary,
} from '../src/types/pharmacy.ts';

export interface StoredStaffUser extends StaffUser {
  passwordHash: string;
}

export interface InstallationTrackingState {
  installationId: string;
  licenseStatus: LicenseStatus;
  licenseReason?: string;
  blockedAccountIds: string[];
  featureLocks: VendorFeatureLocks;
  primaryOrigin?: string;
  seenOrigins: string[];
  seenHosts: string[];
  seenFingerprints: string[];
  ipHashes: string[];
  sharingSuspected: boolean;
  sharingReasons: string[];
  createdAt: string;
  lastSeenAt: string;
}

export interface PharmacyDatabase {
  ownerUsername: string;
  ownerPasswordHash: string | null;
  settings: ClinicSettings;
  drugKinds: DrugKind[];
  drugs: Drug[];
  staff: StoredStaffUser[];
  attendanceQr: AttendanceQrConfig;
  attendance: AttendanceRecord[];
  payrollProfiles: PayrollProfile[];
  payrollPayments: PayrollPayment[];
  transactions: Transaction[];
  alerts: StockAlert[];
  shiftCloses: ShiftCloseReport[];
  expenses: ExpenseRecord[];
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  auditLog: AuditLogEntry[];
  processedSyncIds: string[];
  installation: InstallationTrackingState;
  vendorRegistry: VendorInstallationSummary[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'pharmacy-store.json');

export const DEFAULT_DRUG_KINDS: DrugKind[] = [
  { id: 'tablet', label: 'Tablet', unitLabel: 'Tablets / Strips / Boxes', iconKey: 'tablet' },
  { id: 'capsule', label: 'Capsule', unitLabel: 'Capsules / Strips / Boxes', iconKey: 'capsule' },
  { id: 'injection', label: 'Needle / Injection', unitLabel: 'Vials / Pens', iconKey: 'injection' },
  { id: 'syrup', label: 'Syrup / Liquid', unitLabel: 'Bottles', iconKey: 'syrup' },
  { id: 'inhaler', label: 'Inhaler', unitLabel: 'Canisters', iconKey: 'inhaler' },
  { id: 'cream', label: 'Topical Cream', unitLabel: 'Tubes', iconKey: 'cream' },
  { id: 'drops', label: 'Eye / Ear Drops', unitLabel: 'Dropper Vials', iconKey: 'drops' },
  { id: 'suppository', label: 'Suppository', unitLabel: 'Packs', iconKey: 'suppository' },
];

export function getClinicNow(settings?: Pick<ClinicSettings, 'dateOffsetDays'>): Date {
  const offset = Number(settings?.dateOffsetDays ?? 0) || 0;
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
}

export function computeAuditHash(
  entry: Omit<AuditLogEntry, 'entryHash'>
): string {
  const canonical = JSON.stringify({
    seq: entry.seq,
    timestamp: entry.timestamp,
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetName: entry.targetName,
    beforeSummary: entry.beforeSummary ?? '',
    afterSummary: entry.afterSummary ?? '',
    prevHash: entry.prevHash,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function appendAuditLog(
  db: PharmacyDatabase,
  params: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    targetType: string;
    targetName: string;
    beforeSummary?: string;
    afterSummary?: string;
  }
) {
  const lastEntry = db.auditLog[0];
  const prevHash = lastEntry ? lastEntry.entryHash : 'GENESIS_APOTHECA_RX';
  const seq = lastEntry ? lastEntry.seq + 1 : 1;
  const partial: Omit<AuditLogEntry, 'entryHash'> = {
    id: `aud_${crypto.randomUUID().slice(0, 8)}`,
    seq,
    timestamp: getClinicNow(db.settings).toISOString(),
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetName: params.targetName,
    beforeSummary: params.beforeSummary,
    afterSummary: params.afterSummary,
    prevHash,
  };
  const entryHash = computeAuditHash(partial);
  db.auditLog.unshift({ ...partial, entryHash });
  if (db.auditLog.length > 500) {
    db.auditLog = db.auditLog.slice(0, 500);
  }
}

export function verifyAuditChain(entries: AuditLogEntry[]): boolean {
  if (entries.length === 0) return true;
  // Entries are stored newest-first
  for (let i = 0; i < entries.length; i++) {
    const cur = entries[i];
    const expectedHash = computeAuditHash({
      id: cur.id,
      seq: cur.seq,
      timestamp: cur.timestamp,
      actorId: cur.actorId,
      actorName: cur.actorName,
      actorRole: cur.actorRole,
      action: cur.action,
      targetType: cur.targetType,
      targetName: cur.targetName,
      beforeSummary: cur.beforeSummary,
      afterSummary: cur.afterSummary,
      prevHash: cur.prevHash,
    });
    if (cur.entryHash !== expectedHash) return false;
    if (i < entries.length - 1) {
      const older = entries[i + 1];
      if (cur.prevHash !== older.entryHash || cur.seq !== older.seq + 1) {
        return false;
      }
    }
  }
  return true;
}

export function computeMachineFingerprint(): string {
  const raw = `${os.hostname()}|${os.platform()}|${os.arch()}|${process.cwd()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function createInitialInstallationState(): InstallationTrackingState {
  const nowIso = new Date().toISOString();
  return {
    installationId: `inst_${crypto.randomBytes(6).toString('hex')}`,
    licenseStatus: 'active',
    blockedAccountIds: [],
    featureLocks: {},
    seenOrigins: [],
    seenHosts: [],
    seenFingerprints: [computeMachineFingerprint()],
    ipHashes: [],
    sharingSuspected: false,
    sharingReasons: [],
    createdAt: nowIso,
    lastSeenAt: nowIso,
  };
}

function createInitialDatabase(): PharmacyDatabase {
  const installation = createInitialInstallationState();
  const db: PharmacyDatabase = {
    ownerUsername: 'owner',
    ownerPasswordHash: null,
    settings: {
      clinicName: 'YOYA Pharmacy',
      ownerName: 'Pharmacy Owner',
      licenseNumber: '',
      currencySymbol: 'Br',
      taxRatePercent: 0,
      receiptFooter: 'Keep all prescription medicines out of reach of children. Thank you!',
      alertSoundEnabled: true,
      calendarMode: 'both',
      dateOffsetDays: 0,
    },
    drugKinds: [...DEFAULT_DRUG_KINDS],
    drugs: [],
    staff: [],
    attendanceQr: {
      clockInToken: crypto.randomBytes(12).toString('hex'),
      clockOutToken: crypto.randomBytes(12).toString('hex'),
    },
    attendance: [],
    payrollProfiles: [],
    payrollPayments: [],
    transactions: [],
    alerts: [],
    shiftCloses: [],
    expenses: [],
    suppliers: [],
    supplierInvoices: [],
    auditLog: [],
    processedSyncIds: [],
    installation,
    vendorRegistry: [],
  };

  appendAuditLog(db, {
    actorId: 'system',
    actorName: 'System Bootstrap',
    actorRole: 'owner',
    action: 'SYSTEM_INITIALIZED',
    targetType: 'pharmacy',
    targetName: db.settings.clinicName,
    afterSummary: 'Tamper-proof SHA-256 ledger initialized.',
  });

  return db;
}

let cachedDb: PharmacyDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function migrateDatabaseIfNeeded(raw: Partial<PharmacyDatabase>): PharmacyDatabase {
  const fresh = createInitialDatabase();
  const db: PharmacyDatabase = {
    ownerUsername: raw.ownerUsername || 'owner',
    ownerPasswordHash: raw.ownerPasswordHash ?? null,
    settings: {
      ...fresh.settings,
      ...(raw.settings ?? {}),
      clinicName:
        !raw.settings?.clinicName ||
        raw.settings.clinicName === 'Apotheca Rx Pharmacy' ||
        raw.settings.clinicName === 'Apotheca Rx Clinical Pharmacy'
          ? 'YOYA Pharmacy'
          : raw.settings.clinicName,
      currencySymbol:
        raw.settings?.currencySymbol === '$' ? 'Br' : raw.settings?.currencySymbol || 'Br',
      calendarMode: raw.settings?.calendarMode || 'both',
      dateOffsetDays: Number(raw.settings?.dateOffsetDays ?? 0) || 0,
    },
    drugKinds:
      Array.isArray(raw.drugKinds) && raw.drugKinds.length > 0
        ? raw.drugKinds
        : [...DEFAULT_DRUG_KINDS],
    drugs: Array.isArray(raw.drugs)
      ? raw.drugs.map((d) => ({
          ...d,
          baseUnitName: d.baseUnitName || 'Unit',
          unitsPerPack: Math.max(1, Math.floor(d.unitsPerPack ?? 1)),
          packsPerBox: Math.max(1, Math.floor(d.packsPerBox ?? 1)),
        }))
      : [],
    staff: Array.isArray(raw.staff)
      ? raw.staff.map((s) => ({
          ...s,
          role: (s.role as 'manager' | 'seller') || 'seller',
          phone: s.phone || '',
          jobTitle: s.jobTitle || 'Pharmacy Seller',
          scheduledClockIn: s.scheduledClockIn || '08:30',
          scheduledClockOut: s.scheduledClockOut || '17:30',
          graceMinutes: Number.isFinite(Number(s.graceMinutes)) ? Number(s.graceMinutes) : 5,
        }))
      : [],
    attendanceQr:
      raw.attendanceQr?.clockInToken && raw.attendanceQr?.clockOutToken
        ? raw.attendanceQr
        : fresh.attendanceQr,
    attendance: Array.isArray(raw.attendance) ? raw.attendance : [],
    payrollProfiles: Array.isArray(raw.payrollProfiles) ? raw.payrollProfiles : [],
    payrollPayments: Array.isArray(raw.payrollPayments) ? raw.payrollPayments : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    shiftCloses: Array.isArray(raw.shiftCloses) ? raw.shiftCloses : [],
    expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
    supplierInvoices: Array.isArray(raw.supplierInvoices) ? raw.supplierInvoices : [],
    auditLog:
      Array.isArray(raw.auditLog) && raw.auditLog.length > 0 ? raw.auditLog : fresh.auditLog,
    processedSyncIds: Array.isArray(raw.processedSyncIds) ? raw.processedSyncIds : [],
    installation: raw.installation?.installationId
      ? {
          ...fresh.installation,
          ...raw.installation,
          blockedAccountIds: Array.isArray(raw.installation.blockedAccountIds)
            ? raw.installation.blockedAccountIds.filter((id): id is string => typeof id === 'string')
            : [],
          featureLocks:
            raw.installation.featureLocks && typeof raw.installation.featureLocks === 'object'
              ? {
                  disablePos: Boolean(raw.installation.featureLocks.disablePos),
                  disableInventoryWrite: Boolean(raw.installation.featureLocks.disableInventoryWrite),
                  disableExports: Boolean(raw.installation.featureLocks.disableExports),
                }
              : {},
          seenOrigins: Array.isArray(raw.installation.seenOrigins) ? raw.installation.seenOrigins : [],
          seenHosts: Array.isArray(raw.installation.seenHosts) ? raw.installation.seenHosts : [],
          seenFingerprints: Array.isArray(raw.installation.seenFingerprints)
            ? raw.installation.seenFingerprints
            : [computeMachineFingerprint()],
          ipHashes: Array.isArray(raw.installation.ipHashes) ? raw.installation.ipHashes : [],
          sharingReasons: Array.isArray(raw.installation.sharingReasons) ? raw.installation.sharingReasons : [],
        }
      : fresh.installation,
    vendorRegistry: Array.isArray(raw.vendorRegistry) ? raw.vendorRegistry : [],
  };
  return db;
}

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function hydrateDatabaseFromSupabase(): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/yoya_kv_state?id=eq.primary_pharmacy_state&select=payload`,
      {
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return;
    const rows = (await res.json()) as { payload?: Partial<PharmacyDatabase> }[];
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
      cachedDb = migrateDatabaseIfNeeded(rows[0].payload);
      persistDatabaseSync(cachedDb);
      console.log('Hydrated YOYA Pharmacy state from Supabase PostgreSQL.');
    }
  } catch (err) {
    console.warn('Supabase startup hydration skipped (using local state):', err instanceof Error ? err.message : err);
  }
}

async function syncDatabaseToSupabase(db: PharmacyDatabase): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/yoya_kv_state`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: 'primary_pharmacy_state',
        payload: db,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn('Supabase background sync warning:', err instanceof Error ? err.message : err);
  }
}

export function loadDatabase(): PharmacyDatabase {
  if (cachedDb) return cachedDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<PharmacyDatabase>;
      cachedDb = migrateDatabaseIfNeeded(raw);
      return cachedDb;
    }
  } catch (err) {
    console.error('Failed to read pharmacy store, creating fresh seed:', err);
  }
  cachedDb = createInitialDatabase();
  persistDatabaseSync(cachedDb);
  return cachedDb;
}

function persistDatabaseSync(db: PharmacyDatabase) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function saveDatabase(db: PharmacyDatabase): Promise<void> {
  cachedDb = db;
  writeQueue = writeQueue.then(async () => {
    persistDatabaseSync(db);
    await syncDatabaseToSupabase(db);
  });
  return writeQueue;
}

export function syncAlertForDrug(db: PharmacyDatabase, drug: Drug) {
  db.alerts = db.alerts.filter((a) => a.drugId !== drug.id || a.acknowledged);
  if (drug.stock <= drug.lowStockThreshold) {
    const existingUnacked = db.alerts.find((a) => a.drugId === drug.id && !a.acknowledged);
    if (!existingUnacked) {
      db.alerts.unshift({
        id: `alt_${crypto.randomUUID().slice(0, 8)}`,
        drugId: drug.id,
        drugName: drug.name,
        dosageForm: drug.dosageForm,
        currentStock: drug.stock,
        threshold: drug.lowStockThreshold,
        severity: drug.stock === 0 ? 'critical' : 'warning',
        acknowledged: false,
        triggeredAt: getClinicNow(db.settings).toISOString(),
      });
    }
  } else {
    db.alerts = db.alerts.filter((a) => a.drugId !== drug.id);
  }
}

export function buildPayrollStatuses(db: PharmacyDatabase): PayrollStatusEntry[] {
  const now = getClinicNow(db.settings);
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const todayMidnight = new Date(year, monthIdx, now.getDate()).getTime();

  return db.payrollProfiles.map((profile) => {
    const clampedDay = Math.min(Math.max(1, profile.paydayDay), daysInMonth);
    const dueDateObj = new Date(year, monthIdx, clampedDay);
    const dueDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(clampedDay).padStart(
      2,
      '0'
    )}`;
    const daysUntilDue = Math.round(
      (dueDateObj.getTime() - todayMidnight) / (1000 * 60 * 60 * 24)
    );

    const paymentForMonth = db.payrollPayments.find(
      (p) => p.payrollProfileId === profile.id && p.monthKey === monthKey
    );

    let status: PayrollStatusEntry['status'] = 'upcoming';
    if (paymentForMonth) {
      status = 'paid';
    } else if (daysUntilDue < 0) {
      status = 'overdue';
    } else if (daysUntilDue <= 3) {
      status = 'due_soon';
    }

    return {
      profile,
      monthKey,
      dueDate,
      daysUntilDue,
      status,
      paymentForMonth,
    };
  });
}

export function computeAttendanceSummary(
  records: AttendanceRecord[],
  workerId: string
): AttendanceSummary {
  const clockIns = records.filter((r) => r.workerId === workerId && r.type === 'clock_in');
  const lateRecords = clockIns.filter((r) => r.attendanceStatus === 'late');
  const totalLateMinutes = lateRecords.reduce((acc, r) => acc + (r.lateMinutes ?? 0), 0);
  const uniqueDays = new Set(clockIns.map((r) => r.timestamp.slice(0, 10)));
  return {
    totalDaysWorked: uniqueDays.size,
    lateDaysCount: lateRecords.length,
    onTimeDaysCount: Math.max(0, clockIns.length - lateRecords.length),
    totalLateMinutes,
  };
}
