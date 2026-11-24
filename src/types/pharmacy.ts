export type Language = 'en' | 'am' | 'om';

export type CalendarMode = 'ethiopian' | 'gregorian' | 'both';

export type DosageForm = string;

export type DrugKindIconKey =
  | 'tablet'
  | 'capsule'
  | 'injection'
  | 'syrup'
  | 'inhaler'
  | 'cream'
  | 'drops'
  | 'suppository'
  | 'box';

export interface DrugKind {
  id: string;
  label: string;
  unitLabel: string;
  iconKey: DrugKindIconKey;
}

export type StorageRequirement = 'room_temp' | 'refrigerated' | 'controlled';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'split';

export type SaleUnitTier = 'base' | 'pack' | 'box';

export type PayrollMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'check';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'maintenance'
  | 'license'
  | 'other';

export type UserRole = 'owner' | 'manager' | 'seller';

export interface AuthUser {
  role: UserRole;
  id: string;
  name: string;
  username: string;
  shift?: string;
  jobTitle?: string;
  photoImage?: string;
  scheduledClockIn?: string;
  scheduledClockOut?: string;
}

export type LicenseStatus = 'active' | 'revoked' | 'banned';

export interface VendorFeatureLocks {
  disablePos?: boolean;
  disableInventoryWrite?: boolean;
  disableExports?: boolean;
}

export interface VendorTrackedAccount {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  vendorBlocked: boolean;
  lastLoginAt?: string;
}

export interface AuthStatus {
  ownerClaimed: boolean;
  envPasscodeActive: boolean;
  clinicName: string;
  currencySymbol: string;
  taxRatePercent: number;
  licenseStatus?: LicenseStatus;
  licenseReason?: string;
  featureLocks?: VendorFeatureLocks;
}

export interface VendorInstallationSummary {
  installationId: string;
  clinicName: string;
  ownerName: string;
  ownerUsername: string;
  ownerClaimed: boolean;
  totalAccountsCount: number;
  workersCount: number;
  managersCount: number;
  sellersCount: number;
  activeWorkersCount: number;
  drugsCount: number;
  transactionsCount: number;
  status: LicenseStatus;
  reason?: string;
  primaryOrigin?: string;
  seenOrigins: string[];
  seenHosts: string[];
  seenFingerprints: string[];
  ipHashes: string[];
  sharingSuspected: boolean;
  sharingReasons: string[];
  accounts?: VendorTrackedAccount[];
  blockedAccountIds?: string[];
  featureLocks?: VendorFeatureLocks;
  createdAt: string;
  lastSeenAt: string;
}

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  category: string;
  dosageForm: DosageForm;
  buyingPrice?: number;
  sellingPrice: number; // Price per base unit (e.g. 1 tablet, 1 vial, 1 bottle)
  // Unit hierarchy for Box -> Strip/Pack -> Tablet/Base conversion
  baseUnitName?: string; // e.g. "Tablet"
  packUnitName?: string; // e.g. "Strip"
  boxUnitName?: string;  // e.g. "Box"
  unitsPerPack?: number; // e.g. 10 tablets per strip
  packsPerBox?: number;  // e.g. 10 strips per box (100 tablets/box)
  packSellingPrice?: number; // optional custom price per strip
  boxSellingPrice?: number;  // optional custom price per box
  stock: number; // Always stored in base units!
  lowStockThreshold: number;
  requiresPrescription: boolean;
  batchNumber: string;
  expiryDate: string;
  manufacturer: string;
  barcode: string;
  shelfLocation?: string;
  storageRequirement: StorageRequirement;
  imageUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  role: 'manager' | 'seller';
  name: string;
  phone: string;
  username: string;
  jobTitle: string;
  shift: string;
  scheduledClockIn: string; // "HH:MM" e.g. "08:30"
  scheduledClockOut: string; // "HH:MM" e.g. "17:30"
  graceMinutes: number; // default 5
  active: boolean;
  photoImage?: string;
  faydaFrontImage?: string;
  faydaBackImage?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: UserRole;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  source: 'qr_scan' | 'portal';
  scheduledTime?: string;
  attendanceStatus?: 'on_time' | 'late' | 'early_leave' | 'completed';
  lateMinutes?: number;
  clientSyncId?: string;
}

export interface AttendanceSummary {
  totalDaysWorked: number;
  lateDaysCount: number;
  onTimeDaysCount: number;
  totalLateMinutes: number;
}

export interface AttendanceQrConfig {
  clockInToken: string;
  clockOutToken: string;
}

export interface PayrollProfile {
  id: string;
  workerId: string;
  workerName: string;
  workDescription: string;
  monthlySalary: number;
  paydayDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPayment {
  id: string;
  payrollProfileId: string;
  workerId: string;
  workerName: string;
  monthKey: string;
  amount: number;
  paymentMethod: PayrollMethod;
  reference?: string;
  paidAt: string;
  confirmedBy: string;
}

export interface PayrollStatusEntry {
  profile: PayrollProfile;
  monthKey: string;
  dueDate: string;
  daysUntilDue: number;
  status: 'paid' | 'due_soon' | 'overdue' | 'upcoming';
  paymentForMonth?: PayrollPayment;
}

export interface TransactionItem {
  drugId: string;
  drugName: string;
  dosageForm: DosageForm;
  strength: string;
  quantity: number; // Entered quantity in chosen unit tier
  unitTier?: SaleUnitTier;
  unitLabel?: string;
  baseUnitsDeducted?: number; // quantity * unitMultiplier
  unitSellingPrice: number; // Price per chosen unit tier
  unitBuyingPrice?: number; // Cost per base unit
  lineTotal: number;
  requiresPrescription: boolean;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  cashierId: string;
  cashierName: string;
  items: TransactionItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  totalCost?: number;
  totalProfit?: number;
  paymentMethod: PaymentMethod;
  cashTendered?: number;
  changeDue?: number;
  splitCashAmount?: number;
  splitNonCashAmount?: number;
  splitSecondMethod?: 'transfer' | 'card';
  paymentProofImage?: string;
  prescriptionImage?: string;
  patientReference?: string;
  notes?: string;
  clientSyncId?: string;
  syncedFromOffline?: boolean;
  createdAt: string;
}

export interface ShiftCloseReport {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: UserRole;
  countedCash: number;
  expectedCash?: number; // Hidden from seller! Shown only to Owner & Manager
  variance?: number;   // countedCash - expectedCash
  status?: 'exact' | 'over' | 'short';
  transactionCount: number;
  periodStart: string;
  closedAt: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PayrollMethod;
  date: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  tinNumber?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  itemsSummary: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  payments: {
    id: string;
    amount: number;
    method: PayrollMethod;
    reference?: string;
    paidAt: string;
    recordedBy: string;
  }[];
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  seq: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetName: string;
  beforeSummary?: string;
  afterSummary?: string;
  prevHash: string;
  entryHash: string;
}

export interface ParkedCart {
  id: string;
  label: string;
  createdAt: string;
  items: {
    drugId: string;
    quantity: number;
    unitTier: SaleUnitTier;
  }[];
  paymentMethod: PaymentMethod;
  patientReference: string;
  notes: string;
}

export interface OfflineQueuedSale {
  clientSyncId: string;
  offlineReceiptNumber: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  payload: {
    items: { drugId: string; quantity: number; unitTier: SaleUnitTier }[];
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    splitCashAmount?: number;
    splitSecondMethod?: 'transfer' | 'card';
    paymentProofImage?: string;
    prescriptionImage?: string;
    patientReference?: string;
    notes?: string;
    clientSyncId: string;
    offlineCreatedAt: string;
  };
  estimatedTotal: number;
}

export interface OfflineQueuedPunch {
  clientSyncId: string;
  type: 'clock_in' | 'clock_out';
  qrToken?: string;
  source: 'qr_scan' | 'portal';
  offlineCreatedAt: string;
}

export interface StockAlert {
  id: string;
  drugId: string;
  drugName: string;
  dosageForm: DosageForm;
  currentStock: number;
  threshold: number;
  severity: 'critical' | 'warning';
  acknowledged: boolean;
  triggeredAt: string;
}

export interface ClinicSettings {
  clinicName: string;
  ownerName: string;
  licenseNumber: string;
  currencySymbol: string;
  taxRatePercent: number;
  receiptFooter: string;
  alertSoundEnabled: boolean;
  calendarMode: CalendarMode;
  dateOffsetDays: number;
}

export interface OverviewAnalytics {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  totalExpenses: number;
  totalPayrollPaid: number;
  trueNetProfit: number;
  unpaidSupplierBalance: number;
  profitMarginPercent: number;
  transactionCount: number;
  unitsSold: number;
  averageBasket: number;
  activeLowStockCount: number;
  expiringSoonCount: number;
  paymentBreakdown: {
    method: 'cash' | 'transfer' | 'card';
    count: number;
    amount: number;
  }[];
  dailySeries: {
    date: string;
    label: string;
    revenue: number;
    profit: number;
    transactions: number;
  }[];
  topDrugs: {
    drugId: string;
    drugName: string;
    dosageForm: DosageForm;
    unitsSold: number;
    revenue: number;
    profit: number;
  }[];
  cashierPerformance: {
    cashierId: string;
    cashierName: string;
    transactions: number;
    revenue: number;
    cashTotal: number;
    nonCashTotal: number;
  }[];
}
