import type {
  AttendanceQrConfig,
  AttendanceRecord,
  AttendanceSummary,
  AuditLogEntry,
  AuthStatus,
  AuthUser,
  ClinicSettings,
  Drug,
  DrugKind,
  DrugKindIconKey,
  ExpenseCategory,
  ExpenseRecord,
  LicenseStatus,
  OverviewAnalytics,
  PaymentMethod,
  PayrollMethod,
  PayrollPayment,
  PayrollProfile,
  PayrollStatusEntry,
  SaleUnitTier,
  ShiftCloseReport,
  StaffUser,
  StockAlert,
  Supplier,
  SupplierInvoice,
  Transaction,
  VendorFeatureLocks,
  VendorInstallationSummary,
} from '../types/pharmacy.ts';

let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getAuthStatus: () => request<AuthStatus>('/api/auth/status'),
  claimOwner: (payload: { username: string; password: string; ownerName?: string; clinicName?: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/owner/claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  recoverOwnerPassword: (payload: {
    masterPasscode: string;
    newPassword: string;
    newUsername?: string;
  }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/owner/recover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOwnerCredentials: (payload: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/owner/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request<{ user: AuthUser }>('/api/auth/me'),

  getSettings: () => request<ClinicSettings>('/api/settings'),
  updateSettings: (payload: Partial<ClinicSettings>) =>
    request<ClinicSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getDrugKinds: () => request<DrugKind[]>('/api/drug-kinds'),
  createDrugKind: (payload: { label: string; unitLabel?: string; iconKey?: DrugKindIconKey }) =>
    request<DrugKind>('/api/drug-kinds', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDrugKind: (
    id: string,
    payload: { label?: string; unitLabel?: string; iconKey?: DrugKindIconKey }
  ) =>
    request<DrugKind>(`/api/drug-kinds/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteDrugKind: (id: string) =>
    request<{ deleted: boolean }>(`/api/drug-kinds/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getDrugs: () => request<Drug[]>('/api/drugs'),
  createDrug: (payload: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Drug>('/api/drugs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDrug: (id: string, payload: Partial<Drug>) =>
    request<Drug>(`/api/drugs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  restockDrug: (
    id: string,
    payload: {
      quantity: number;
      unitTier?: SaleUnitTier;
      batchNumber?: string;
      expiryDate?: string;
      buyingPrice?: number;
      sellingPrice?: number;
    }
  ) =>
    request<{ drug: Drug; alerts: StockAlert[] }>(`/api/drugs/${encodeURIComponent(id)}/restock`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDrug: (id: string) =>
    request<{ deleted: boolean }>(`/api/drugs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getAlerts: () => request<StockAlert[]>('/api/alerts'),
  acknowledgeAlert: (id: string) =>
    request<StockAlert>(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
    }),

  getStaff: () => request<StaffUser[]>('/api/staff'),
  createStaff: (payload: {
    role: 'manager' | 'seller';
    name: string;
    phone: string;
    username: string;
    password: string;
    jobTitle: string;
    shift: string;
    scheduledClockIn?: string;
    scheduledClockOut?: string;
    graceMinutes?: number;
    photoImage?: string;
    faydaFrontImage?: string;
    faydaBackImage?: string;
  }) =>
    request<StaffUser>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStaff: (
    id: string,
    payload: {
      active?: boolean;
      role?: 'manager' | 'seller';
      name?: string;
      phone?: string;
      username?: string;
      password?: string;
      jobTitle?: string;
      shift?: string;
      scheduledClockIn?: string;
      scheduledClockOut?: string;
      graceMinutes?: number;
      photoImage?: string;
      faydaFrontImage?: string;
      faydaBackImage?: string;
    }
  ) =>
    request<StaffUser>(`/api/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteStaff: (id: string) =>
    request<{ deleted: boolean }>(`/api/staff/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getAttendanceQr: () => request<AttendanceQrConfig>('/api/attendance/qr'),
  getAttendance: () => request<AttendanceRecord[]>('/api/attendance'),
  getMyAttendanceSummary: () =>
    request<{
      summary: AttendanceSummary;
      scheduledClockIn: string;
      scheduledClockOut: string;
      graceMinutes: number;
    }>('/api/attendance/my-summary'),
  punchAttendance: (payload: {
    type: 'clock_in' | 'clock_out';
    qrToken?: string;
    source?: 'qr_scan' | 'portal';
    clientSyncId?: string;
    offlineCreatedAt?: string;
  }) =>
    request<AttendanceRecord>('/api/attendance/punch', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPayroll: () =>
    request<{ entries: PayrollStatusEntry[]; payments: PayrollPayment[] }>('/api/payroll'),
  getMyPayroll: () =>
    request<{ entries: PayrollStatusEntry[]; payments: PayrollPayment[] }>('/api/payroll/my'),
  upsertPayrollProfile: (payload: {
    workerId: string;
    workDescription: string;
    monthlySalary: number;
    paydayDay: number;
  }) =>
    request<PayrollProfile>('/api/payroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePayrollProfile: (id: string) =>
    request<{ deleted: boolean }>(`/api/payroll/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  confirmPayrollPayment: (
    profileId: string,
    payload: {
      paymentMethod: PayrollMethod;
      monthKey?: string;
      amount?: number;
      reference?: string;
    }
  ) =>
    request<PayrollPayment>(`/api/payroll/${encodeURIComponent(profileId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePayrollPayment: (
    paymentId: string,
    payload: { paymentMethod?: PayrollMethod; amount?: number; reference?: string }
  ) =>
    request<PayrollPayment>(`/api/payroll/payments/${encodeURIComponent(paymentId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deletePayrollPayment: (paymentId: string) =>
    request<{ deleted: boolean }>(`/api/payroll/payments/${encodeURIComponent(paymentId)}`, {
      method: 'DELETE',
    }),

  getShiftCloses: () => request<ShiftCloseReport[]>('/api/shifts'),
  submitBlindShiftClose: (payload: { countedCash: number; notes?: string }) =>
    request<ShiftCloseReport>('/api/shifts/close', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getExpenses: () => request<ExpenseRecord[]>('/api/expenses'),
  createExpense: (payload: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PayrollMethod;
    date?: string;
    notes?: string;
  }) =>
    request<ExpenseRecord>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateExpense: (
    id: string,
    payload: {
      title?: string;
      category?: ExpenseCategory;
      amount?: number;
      paymentMethod?: PayrollMethod;
      date?: string;
      notes?: string;
    }
  ) =>
    request<ExpenseRecord>(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteExpense: (id: string) =>
    request<{ deleted: boolean }>(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getSuppliers: () => request<{ suppliers: Supplier[]; invoices: SupplierInvoice[] }>('/api/suppliers'),
  createSupplier: (payload: {
    name: string;
    phone: string;
    tinNumber?: string;
    address?: string;
    notes?: string;
  }) =>
    request<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSupplier: (
    id: string,
    payload: {
      name?: string;
      phone?: string;
      tinNumber?: string;
      address?: string;
      notes?: string;
    }
  ) =>
    request<Supplier>(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteSupplier: (id: string) =>
    request<{ deleted: boolean }>(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  createSupplierInvoice: (payload: {
    supplierId: string;
    invoiceNumber?: string;
    itemsSummary?: string;
    totalAmount: number;
    paidAmount?: number;
    dueDate?: string;
  }) =>
    request<SupplierInvoice>('/api/suppliers/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSupplierInvoice: (
    id: string,
    payload: {
      supplierId?: string;
      invoiceNumber?: string;
      itemsSummary?: string;
      totalAmount?: number;
      dueDate?: string;
    }
  ) =>
    request<SupplierInvoice>(`/api/suppliers/invoices/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  paySupplierInvoice: (
    invoiceId: string,
    payload: { amount: number; method: PayrollMethod; reference?: string }
  ) =>
    request<SupplierInvoice>(`/api/suppliers/invoices/${encodeURIComponent(invoiceId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteSupplierInvoice: (invoiceId: string) =>
    request<{ deleted: boolean }>(`/api/suppliers/invoices/${encodeURIComponent(invoiceId)}`, {
      method: 'DELETE',
    }),

  getAuditLog: () => request<{ chainValid: boolean; entries: AuditLogEntry[] }>('/api/audit-log'),

  getTransactions: () => request<Transaction[]>('/api/transactions'),
  createTransaction: (payload: {
    items: { drugId: string; quantity: number; unitTier?: SaleUnitTier }[];
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    splitCashAmount?: number;
    splitSecondMethod?: 'transfer' | 'card';
    paymentProofImage?: string;
    prescriptionImage?: string;
    patientReference?: string;
    notes?: string;
    clientSyncId?: string;
    offlineCreatedAt?: string;
  }) =>
    request<{ transaction: Transaction; triggeredLowStock: string[] }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOverview: (period: 'today' | '7d' | '30d' | 'all') =>
    request<OverviewAnalytics>(`/api/overview?period=${encodeURIComponent(period)}`),
};

let vendorMemoryToken: string | null = null;

export function setVendorToken(token: string | null) {
  vendorMemoryToken = token;
}

async function vendorRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (vendorMemoryToken) {
    headers.set('Authorization', `Bearer ${vendorMemoryToken}`);
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

export const vendorApi = {
  login: async (passcode: string) => {
    const res = await vendorRequest<{ token: string }>('/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
    vendorMemoryToken = res.token;
    return res;
  },
  getInstallations: () =>
    vendorRequest<{ installations: VendorInstallationSummary[] }>('/api/vendor/installations'),
  setInstallationStatus: (installationId: string, status: LicenseStatus, reason?: string) =>
    vendorRequest<{ installation: VendorInstallationSummary }>(
      `/api/vendor/installations/${encodeURIComponent(installationId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      }
    ),
  updateInstallationControls: (
    installationId: string,
    payload: {
      blockedAccountIds?: string[];
      toggleAccountId?: string;
      accountBlocked?: boolean;
      featureLocks?: VendorFeatureLocks;
    }
  ) =>
    vendorRequest<{ installation: VendorInstallationSummary }>(
      `/api/vendor/installations/${encodeURIComponent(installationId)}/controls`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getCloudflareBundle: () =>
    vendorRequest<{ workerTs: string; schemaSql: string; wranglerToml: string }>('/api/vendor/bundle'),
};

export async function compressImageFile(file: File, maxDimension = 960, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, or WebP).');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

export async function downloadDataUrlOrAsset(src: string, filename: string): Promise<void> {
  if (!src) return;
  const res = await fetch(src);
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  if (typeof canvas.toBlob === 'function') {
    canvas.toBlob((blob) => {
      if (blob) {
        triggerBlobDownload(blob, filename);
      } else {
        void downloadDataUrlOrAsset(canvas.toDataURL('image/png'), filename);
      }
    }, 'image/png');
    return;
  }
  void downloadDataUrlOrAsset(canvas.toDataURL('image/png'), filename);
}

