/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  CloudOff,
  Globe,
  LogOut,
  Menu,
  Moon,
  Package,
  PackagePlus,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { AddStockModal } from './components/AddStockModal.tsx';
import { AttendanceQrView, WorkerSalaryAndAttendanceView } from './components/AttendanceQrView.tsx';
import { AuthPortal } from './components/AuthPortal.tsx';
import { CashierPos } from './components/CashierPos.tsx';
import { DrugFormModal } from './components/DrugFormModal.tsx';
import { GuideView } from './components/GuideView.tsx';
import { YoyaPharmacyEmblem, YoyaWordmark } from './components/MedicineIcon.tsx';
import {
  AmbientBackdrop,
  MagneticButton,
  PremiumSkeleton,
  UiSticker,
  type UiStickerKind,
} from './components/MotionPrimitives.tsx';
import { OwnerInventory } from './components/OwnerInventory.tsx';
import { OwnerOperationsView } from './components/OwnerOperationsView.tsx';
import { OwnerOverview } from './components/OwnerOverview.tsx';
import { OwnerSettingsKit, OwnerStaffView } from './components/OwnerStaffAndKit.tsx';
import { OwnerTransactions } from './components/OwnerTransactions.tsx';
import { PayrollView } from './components/PayrollView.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { RestockOrderModal } from './components/RestockOrderModal.tsx';
import { VendorPortal } from './components/VendorPortal.tsx';
import { api, setAuthToken } from './lib/api.ts';
import { formatClinicDate, getEffectiveNow } from './lib/ethiopianCalendar.ts';
import { getTranslator, LANGUAGE_LABELS } from './lib/i18n.ts';
import { offlineStore } from './lib/offlineStore.ts';
import { soundEngine } from './lib/soundEngine.ts';
import { getUnitMultiplier } from './lib/unitConversion.ts';
import { useModalScrollLock } from './lib/useModalScrollLock.ts';
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
  Language,
  OfflineQueuedPunch,
  OfflineQueuedSale,
  OverviewAnalytics,
  PayrollMethod,
  PayrollPayment,
  PayrollStatusEntry,
  SaleUnitTier,
  ShiftCloseReport,
  StaffUser,
  StockAlert,
  Supplier,
  SupplierInvoice,
  Transaction,
} from './types/pharmacy.ts';

type WorkspaceTab =
  | 'overview'
  | 'inventory'
  | 'pos'
  | 'transactions'
  | 'operations'
  | 'attendance'
  | 'staff'
  | 'payroll'
  | 'settings'
  | 'my_portal'
  | 'guide';

const TAB_STICKER_KIND: Record<WorkspaceTab, UiStickerKind> = {
  overview: 'sales',
  inventory: 'inventory',
  pos: 'bag',
  transactions: 'profit',
  operations: 'operations',
  attendance: 'attendance',
  staff: 'shield',
  payroll: 'payroll',
  settings: 'rx',
  my_portal: 'payroll',
  guide: 'shield',
};

function parsePendingQrFromUrl(): { type: 'clock_in' | 'clock_out'; qrToken: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const att = params.get('attendance');
  const qr = params.get('qr');
  if ((att === 'clock_in' || att === 'clock_out') && qr && qr.trim().length > 0) {
    return { type: att, qrToken: qr.trim() };
  }
  return null;
}

export default function App() {
  useModalScrollLock();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isVendorRoute] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.pathname === '/vendor-portal'
  );

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  if (isVendorRoute) {
    return <VendorPortal darkMode={darkMode} onToggleTheme={() => setDarkMode((d) => !d)} />;
  }

  return <PharmacyApp darkMode={darkMode} setDarkMode={setDarkMode} />;
}

function PharmacyApp({
  darkMode,
  setDarkMode,
}: {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [muted, setMuted] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('en');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');

  const [pendingQrPunch, setPendingQrPunch] = useState<{
    type: 'clock_in' | 'clock_out';
    qrToken: string;
  } | null>(() => parsePendingQrFromUrl());
  const [qrBanner, setQrBanner] = useState<string | null>(null);

  const [settings, setSettings] = useState<ClinicSettings>({
    clinicName: 'YOYA Pharmacy',
    ownerName: 'Pharmacy Owner',
    licenseNumber: '',
    currencySymbol: 'Br',
    taxRatePercent: 0,
    receiptFooter: 'Keep all medicines out of reach of children.',
    alertSoundEnabled: true,
    calendarMode: 'both',
    dateOffsetDays: 0,
  });

  const [drugKinds, setDrugKinds] = useState<DrugKind[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [attendanceQr, setAttendanceQr] = useState<AttendanceQrConfig | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [myAttendanceSummary, setMyAttendanceSummary] = useState<AttendanceSummary>({
    totalDaysWorked: 0,
    lateDaysCount: 0,
    onTimeDaysCount: 0,
    totalLateMinutes: 0,
  });
  const [mySchedule, setMySchedule] = useState<{ clockIn: string; clockOut: string }>({
    clockIn: '08:30',
    clockOut: '17:30',
  });
  const [payrollEntries, setPayrollEntries] = useState<PayrollStatusEntry[]>([]);
  const [payrollPayments, setPayrollPayments] = useState<PayrollPayment[]>([]);
  const [myPayroll, setMyPayroll] = useState<PayrollStatusEntry | null>(null);
  const [myPayments, setMyPayments] = useState<PayrollPayment[]>([]);

  // Operations state
  const [shiftCloses, setShiftCloses] = useState<ShiftCloseReport[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditChainValid, setAuditChainValid] = useState<boolean>(true);

  // Offline Queue state
  const [pendingSales, setPendingSales] = useState<OfflineQueuedSale[]>([]);
  const [pendingPunches, setPendingPunches] = useState<OfflineQueuedPunch[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const [drugModalOpen, setDrugModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [addStockDrugId, setAddStockDrugId] = useState<string | undefined>(undefined);
  const [restockSheetOpen, setRestockSheetOpen] = useState(false);
  const [receiptTxn, setReceiptTxn] = useState<Transaction | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mobileMenuOpen) {
      mobileSheetRef.current?.focus({ preventScroll: true });
    }
  }, [mobileMenuOpen]);

  const t = getTranslator(language);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  // Monitor browser online/offline state
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Load any persisted offline queues from IndexedDB
  useEffect(() => {
    void Promise.all([
      offlineStore.getQueuedSales(),
      offlineStore.getQueuedPunches(),
    ]).then(([sales, punches]) => {
      setPendingSales(sales);
      setPendingPunches(punches);
    });
  }, []);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);
    } catch {
      const snap = await offlineStore.loadCatalogSnapshot();
      if (snap) {
        setAuthStatus({
          ownerClaimed: true,
          envPasscodeActive: false,
          clinicName: snap.settings.clinicName,
          currencySymbol: snap.settings.currencySymbol,
          taxRatePercent: snap.settings.taxRatePercent,
        });
      }
    }
  }, []);

  useEffect(() => {
    void refreshAuthStatus();
  }, [refreshAuthStatus]);

  const loadWorkspaceData = useCallback(
    async (activeUser: AuthUser, activePeriod: 'today' | '7d' | '30d' | 'all') => {
      setLoadingData(true);
      try {
        const [fetchedSettings, fetchedKinds, fetchedDrugs, fetchedTxns, fetchedAttendance] =
          await Promise.all([
            api.getSettings(),
            api.getDrugKinds(),
            api.getDrugs(),
            api.getTransactions(),
            api.getAttendance(),
          ]);

        setSettings(fetchedSettings);
        setDrugKinds(fetchedKinds);
        setDrugs(fetchedDrugs);
        setTransactions(fetchedTxns);
        setAttendance(fetchedAttendance);

        await offlineStore.saveCatalogSnapshot({
          drugs: fetchedDrugs,
          drugKinds: fetchedKinds,
          settings: fetchedSettings,
        });

        if (activeUser.role === 'owner') {
          const [
            fetchedAlerts,
            fetchedStaff,
            fetchedOverview,
            fetchedQr,
            fetchedPayroll,
            fetchedShifts,
            fetchedExpenses,
            fetchedSuppliers,
            fetchedAudit,
          ] = await Promise.all([
            api.getAlerts(),
            api.getStaff(),
            api.getOverview(activePeriod),
            api.getAttendanceQr(),
            api.getPayroll(),
            api.getShiftCloses(),
            api.getExpenses(),
            api.getSuppliers(),
            api.getAuditLog(),
          ]);
          setAlerts(fetchedAlerts);
          setStaff(fetchedStaff);
          setOverview(fetchedOverview);
          setAttendanceQr(fetchedQr);
          setPayrollEntries(fetchedPayroll.entries);
          setPayrollPayments(fetchedPayroll.payments);
          setShiftCloses(fetchedShifts);
          setExpenses(fetchedExpenses);
          setSuppliers(fetchedSuppliers.suppliers);
          setSupplierInvoices(fetchedSuppliers.invoices);
          setAuditLog(fetchedAudit.entries);
          setAuditChainValid(fetchedAudit.chainValid);
        } else if (activeUser.role === 'manager') {
          const [fetchedAlerts, fetchedQr, fetchedMyPayroll, fetchedMyAtt, fetchedShifts] =
            await Promise.all([
              api.getAlerts(),
              api.getAttendanceQr(),
              api.getMyPayroll(),
              api.getMyAttendanceSummary(),
              api.getShiftCloses(),
            ]);
          setAlerts(fetchedAlerts);
          setAttendanceQr(fetchedQr);
          setMyPayroll(fetchedMyPayroll.entries[0] ?? null);
          setMyPayments(fetchedMyPayroll.payments);
          setMyAttendanceSummary(fetchedMyAtt.summary);
          setMySchedule({
            clockIn: fetchedMyAtt.scheduledClockIn,
            clockOut: fetchedMyAtt.scheduledClockOut,
          });
          setShiftCloses(fetchedShifts);
        } else {
          const [fetchedMyPayroll, fetchedMyAtt] = await Promise.all([
            api.getMyPayroll(),
            api.getMyAttendanceSummary(),
          ]);
          setMyPayroll(fetchedMyPayroll.entries[0] ?? null);
          setMyPayments(fetchedMyPayroll.payments);
          setMyAttendanceSummary(fetchedMyAtt.summary);
          setMySchedule({
            clockIn: fetchedMyAtt.scheduledClockIn,
            clockOut: fetchedMyAtt.scheduledClockOut,
          });
        }
      } catch (err) {
        console.warn('Workspace fetch failed, checking license or offline snapshot:', err);
        try {
          const latestStatus = await api.getAuthStatus();
          setAuthStatus(latestStatus);
          if (latestStatus.licenseStatus === 'banned' || latestStatus.licenseStatus === 'revoked') {
            setAuthToken(null);
            setUser(null);
            return;
          }
          try {
            await api.getMe();
          } catch (meErr) {
            if (meErr instanceof Error && /(suspend|revok|ban|vendor|session)/i.test(meErr.message)) {
              setAuthToken(null);
              setUser(null);
              return;
            }
          }
        } catch {
          // Offline — fall through to IndexedDB snapshot
        }
        const snap = await offlineStore.loadCatalogSnapshot();
        if (snap) {
          setSettings(snap.settings);
          setDrugKinds(snap.drugKinds);
          setDrugs(snap.drugs);
        }
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      void loadWorkspaceData(user, period);
    }
  }, [user, period, loadWorkspaceData]);

  // Sync queued offline sales and punches to the server idempotently
  const syncOfflineQueue = useCallback(async () => {
    if (!user || syncingOffline || !navigator.onLine) return;
    const queuedSales = await offlineStore.getQueuedSales();
    const queuedPunches = await offlineStore.getQueuedPunches();
    if (queuedSales.length === 0 && queuedPunches.length === 0) {
      setPendingSales([]);
      setPendingPunches([]);
      return;
    }

    setSyncingOffline(true);
    let syncedCount = 0;
    try {
      for (const punch of queuedPunches) {
        try {
          await api.punchAttendance({
            type: punch.type,
            qrToken: punch.qrToken,
            source: punch.source,
            clientSyncId: punch.clientSyncId,
            offlineCreatedAt: punch.offlineCreatedAt,
          });
          await offlineStore.removeQueuedPunch(punch.clientSyncId);
          syncedCount++;
        } catch (err) {
          console.warn('Failed syncing offline punch:', err);
        }
      }

      for (const sale of queuedSales) {
        try {
          await api.createTransaction(sale.payload);
          await offlineStore.removeQueuedSale(sale.clientSyncId);
          syncedCount++;
        } catch (err) {
          console.warn('Failed syncing offline sale:', err);
        }
      }

      const [remSales, remPunches] = await Promise.all([
        offlineStore.getQueuedSales(),
        offlineStore.getQueuedPunches(),
      ]);
      setPendingSales(remSales);
      setPendingPunches(remPunches);

      if (syncedCount > 0) {
        soundEngine.playSaleComplete();
        setQrBanner(`Synced ${syncedCount} offline record(s) to pharmacy server.`);
        await loadWorkspaceData(user, period);
      }
    } finally {
      setSyncingOffline(false);
    }
  }, [user, syncingOffline, loadWorkspaceData, period]);

  useEffect(() => {
    if (isOnline && user && (pendingSales.length > 0 || pendingPunches.length > 0)) {
      void syncOfflineQueue();
    }
  }, [isOnline, user, pendingSales.length, pendingPunches.length, syncOfflineQueue]);

  // Subtract queued offline sales optimistically from displayed shelf stock so sellers don't oversell offline
  const effectiveDrugs = useMemo(() => {
    if (pendingSales.length === 0) return drugs;
    const deductedByDrug = new Map<string, number>();
    for (const sale of pendingSales) {
      for (const item of sale.payload.items) {
        const drug = drugs.find((d) => d.id === item.drugId);
        const mult = drug ? getUnitMultiplier(drug, item.unitTier) : 1;
        deductedByDrug.set(item.drugId, (deductedByDrug.get(item.drugId) ?? 0) + item.quantity * mult);
      }
    }
    return drugs.map((d) => {
      const ded = deductedByDrug.get(d.id) ?? 0;
      if (ded === 0) return d;
      return { ...d, stock: Math.max(0, d.stock - ded) };
    });
  }, [drugs, pendingSales]);

  async function handleAuthenticated(authedUser: AuthUser) {
    if (authedUser.role === 'owner') {
      setActiveTab('overview');
    } else if (authedUser.role === 'manager') {
      setActiveTab('inventory');
    } else {
      setActiveTab('pos');
    }

    if (pendingQrPunch) {
      try {
        const record = await api.punchAttendance({
          type: pendingQrPunch.type,
          qrToken: pendingQrPunch.qrToken,
          source: 'qr_scan',
        });
        soundEngine.playSaleComplete();
        const label = record.type === 'clock_in' ? t('clockIn') : t('clockOut');
        const statusText =
          record.attendanceStatus === 'late'
            ? ` · ${t('late')} (+${record.lateMinutes ?? 0}m)`
            : record.attendanceStatus === 'on_time'
              ? ` · ${t('onTime')}`
              : '';
        setQrBanner(
          `${label} recorded for ${record.workerName}${statusText}`
        );
      } catch (err) {
        if (!navigator.onLine) {
          const offlinePunch: OfflineQueuedPunch = {
            clientSyncId: `punch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: pendingQrPunch.type,
            qrToken: pendingQrPunch.qrToken,
            source: 'qr_scan',
            offlineCreatedAt: new Date().toISOString(),
          };
          await offlineStore.enqueuePunch(offlinePunch);
          setPendingPunches((prev) => [...prev, offlinePunch]);
          setQrBanner('Offline mode: QR punch saved on device and will sync automatically.');
        } else {
          setQrBanner(err instanceof Error ? err.message : 'QR punch could not be recorded.');
        }
      } finally {
        setPendingQrPunch(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/');
        }
      }
    }

    setUser(authedUser);
  }

  function handleLogout() {
    soundEngine.playTap();
    setAuthToken(null);
    setUser(null);
    setDrugs([]);
    setTransactions([]);
    setAlerts([]);
    setStaff([]);
    setOverview(null);
    setAttendance([]);
    setAttendanceQr(null);
    setPayrollEntries([]);
    setPayrollPayments([]);
    setMyPayroll(null);
    setMyPayments([]);
    setShiftCloses([]);
    setExpenses([]);
    setSuppliers([]);
    setSupplierInvoices([]);
    setAuditLog([]);
    setQrBanner(null);
    setRestockSheetOpen(false);
  }

  async function handleCreateDrugKind(payload: {
    label: string;
    unitLabel?: string;
    iconKey?: DrugKindIconKey;
  }): Promise<DrugKind> {
    const created = await api.createDrugKind(payload);
    setDrugKinds((prev) => [...prev, created]);
    return created;
  }

  async function handleUpdateDrugKind(
    id: string,
    payload: { label?: string; unitLabel?: string; iconKey?: DrugKindIconKey }
  ): Promise<DrugKind> {
    const updated = await api.updateDrugKind(id, payload);
    setDrugKinds((prev) => prev.map((k) => (k.id === id ? updated : k)));
    return updated;
  }

  async function handleDeleteDrugKind(id: string) {
    await api.deleteDrugKind(id);
    setDrugKinds((prev) => prev.filter((k) => k.id !== id));
  }

  async function handleSaveDrug(
    payload: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>,
    editingId?: string
  ) {
    if (editingId) {
      await api.updateDrug(editingId, payload);
    } else {
      await api.createDrug(payload);
    }
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleDeleteDrug(drug: Drug) {
    soundEngine.playTap();
    await api.deleteDrug(drug.id);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleRestockDrug(
    drugId: string,
    payload: {
      quantity: number;
      unitTier?: SaleUnitTier;
      batchNumber?: string;
      expiryDate?: string;
      buyingPrice?: number;
      sellingPrice?: number;
    }
  ) {
    await api.restockDrug(drugId, payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleAcknowledgeAlert(id: string) {
    soundEngine.playTap();
    await api.acknowledgeAlert(id);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleCreateStaff(payload: {
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
  }) {
    await api.createStaff(payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleUpdateStaff(
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
  ) {
    await api.updateStaff(id, payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleDeleteStaff(id: string) {
    soundEngine.playTap();
    await api.deleteStaff(id);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handlePunchAttendance(
    type: 'clock_in' | 'clock_out',
    qrToken?: string
  ) {
    if (!navigator.onLine) {
      const offlinePunch: OfflineQueuedPunch = {
        clientSyncId: `punch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        qrToken,
        source: qrToken ? 'qr_scan' : 'portal',
        offlineCreatedAt: new Date().toISOString(),
      };
      await offlineStore.enqueuePunch(offlinePunch);
      setPendingPunches((prev) => [...prev, offlinePunch]);
      soundEngine.playAddToCart();
      setQrBanner('Offline: Attendance punch saved locally and queued to sync.');
      return;
    }

    const rec = await api.punchAttendance({
      type,
      qrToken,
      source: qrToken ? 'qr_scan' : 'portal',
    });
    soundEngine.playAddToCart();
    const statusLabel =
      rec.attendanceStatus === 'late'
        ? ` (${t('late')} +${rec.lateMinutes ?? 0}m)`
        : rec.attendanceStatus === 'on_time'
          ? ` (${t('onTime')})`
          : '';
    setQrBanner(
      `${rec.type === 'clock_in' ? t('clockIn') : t('clockOut')}: ${rec.workerName}${statusLabel} · ${formatClinicDate(
        rec.timestamp,
        settings.calendarMode,
        language,
        true
      )}`
    );
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleSavePayrollProfile(payload: {
    workerId: string;
    workDescription: string;
    monthlySalary: number;
    paydayDay: number;
  }) {
    await api.upsertPayrollProfile(payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleDeletePayrollProfile(id: string) {
    await api.deletePayrollProfile(id);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleConfirmPayrollPayment(
    profileId: string,
    payload: { paymentMethod: PayrollMethod; amount?: number; reference?: string }
  ) {
    await api.confirmPayrollPayment(profileId, payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleUpdatePayrollPayment(
    paymentId: string,
    payload: { paymentMethod?: PayrollMethod; amount?: number; reference?: string }
  ) {
    await api.updatePayrollPayment(paymentId, payload);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleDeletePayrollPayment(paymentId: string) {
    await api.deletePayrollPayment(paymentId);
    if (user) {
      await loadWorkspaceData(user, period);
    }
  }

  async function handleSaveSettings(payload: Partial<ClinicSettings>) {
    const updated = await api.updateSettings(payload);
    setSettings(updated);
    if (user?.role === 'owner' && updated.ownerName) {
      setUser((prev) => (prev ? { ...prev, name: updated.ownerName } : prev));
    }
    void refreshAuthStatus();
  }

  async function handleUpdateOwnerCredentials(payload: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  }) {
    const res = await api.updateOwnerCredentials(payload);
    setAuthToken(res.token);
    setUser(res.user);
    void refreshAuthStatus();
  }

  async function handleCreateExpense(payload: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PayrollMethod;
    date?: string;
    notes?: string;
  }) {
    await api.createExpense(payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleUpdateExpense(
    id: string,
    payload: {
      title?: string;
      category?: ExpenseCategory;
      amount?: number;
      paymentMethod?: PayrollMethod;
      date?: string;
      notes?: string;
    }
  ) {
    await api.updateExpense(id, payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleDeleteExpense(id: string) {
    await api.deleteExpense(id);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleCreateSupplier(payload: {
    name: string;
    phone: string;
    tinNumber?: string;
    address?: string;
    notes?: string;
  }) {
    await api.createSupplier(payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleUpdateSupplier(
    id: string,
    payload: {
      name?: string;
      phone?: string;
      tinNumber?: string;
      address?: string;
      notes?: string;
    }
  ) {
    await api.updateSupplier(id, payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleDeleteSupplier(id: string) {
    await api.deleteSupplier(id);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleCreateSupplierInvoice(payload: {
    supplierId: string;
    invoiceNumber?: string;
    itemsSummary?: string;
    totalAmount: number;
    paidAmount?: number;
    dueDate?: string;
  }) {
    await api.createSupplierInvoice(payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleUpdateSupplierInvoice(
    id: string,
    payload: {
      supplierId?: string;
      invoiceNumber?: string;
      itemsSummary?: string;
      totalAmount?: number;
      dueDate?: string;
    }
  ) {
    await api.updateSupplierInvoice(id, payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handlePaySupplierInvoice(
    invoiceId: string,
    payload: { amount: number; method: PayrollMethod; reference?: string }
  ) {
    await api.paySupplierInvoice(invoiceId, payload);
    if (user) await loadWorkspaceData(user, period);
  }

  async function handleDeleteSupplierInvoice(invoiceId: string) {
    await api.deleteSupplierInvoice(invoiceId);
    if (user) await loadWorkspaceData(user, period);
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center yoya-canvas text-[#5B6470] dark:text-[#98A2AE] text-sm">
        Initializing YOYA Pharmacy workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPortal
        authStatus={authStatus}
        language={language}
        darkMode={darkMode}
        muted={muted}
        pendingQrPunch={pendingQrPunch}
        onChangeLanguage={setLanguage}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onToggleMute={() => setMuted(!muted)}
        onAuthenticated={handleAuthenticated}
        onRefreshStatus={() => void refreshAuthStatus()}
      />
    );
  }

  const unackedAlertCount = alerts.filter((a) => !a.acknowledged).length;
  const payrollAlertEntries = payrollEntries.filter(
    (p) => p.status === 'overdue' || p.status === 'due_soon'
  );
  const shortShiftsCount = shiftCloses.filter((s) => s.status === 'short').length;
  const totalOwnerBadge = unackedAlertCount + payrollAlertEntries.length;

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] =
    user.role === 'owner'
      ? [
          {
            id: 'overview',
            label: t('overview'),
            icon: BarChart3,
            badge: totalOwnerBadge || undefined,
          },
          { id: 'inventory', label: t('catalog'), icon: Package },
          { id: 'pos', label: t('posCounter'), icon: ShoppingBag },
          { id: 'transactions', label: t('transactions'), icon: ClipboardList },
          {
            id: 'operations',
            label: t('operations'),
            icon: ShieldCheck,
            badge: shortShiftsCount || undefined,
          },
          { id: 'attendance', label: t('attendanceQr'), icon: QrCode },
          { id: 'staff', label: t('staffUsers'), icon: Users },
          {
            id: 'payroll',
            label: t('payroll'),
            icon: Banknote,
            badge: payrollAlertEntries.length || undefined,
          },
          { id: 'settings', label: t('settingsKit'), icon: Settings },
          { id: 'guide', label: t('userGuide'), icon: BookOpen },
        ]
      : user.role === 'manager'
        ? [
            { id: 'inventory', label: t('catalog'), icon: Package },
            { id: 'pos', label: t('posCounter'), icon: ShoppingBag },
            { id: 'transactions', label: t('transactions'), icon: ClipboardList },
            { id: 'attendance', label: t('attendanceQr'), icon: QrCode },
            { id: 'my_portal', label: t('mySalary'), icon: Banknote },
            { id: 'guide', label: t('userGuide'), icon: BookOpen },
          ]
        : [
            { id: 'pos', label: t('posCounter'), icon: ShoppingBag },
            { id: 'my_portal', label: t('mySalary'), icon: Banknote },
            { id: 'guide', label: t('userGuide'), icon: BookOpen },
          ];

  const canManageInventory = user.role === 'owner' || user.role === 'manager';
  const featureLocks = authStatus?.featureLocks ?? {};
  const inventoryWriteLocked = Boolean(featureLocks.disableInventoryWrite);
  const posLocked = Boolean(featureLocks.disablePos);
  const exportsLocked = Boolean(featureLocks.disableExports);
  const effectiveNow = getEffectiveNow(settings.dateOffsetDays);
  const clinicTodayLabel = formatClinicDate(effectiveNow, settings.calendarMode, language);

  const roleBadgeLabel =
    user.role === 'owner'
      ? t('roleOwner')
      : user.role === 'manager'
        ? t('roleManager')
        : t('roleSeller');

  const totalPendingSync = pendingSales.length + pendingPunches.length;

  const mobilePrimaryTabs =
    user.role === 'owner'
      ? navItems.slice(0, 4)
      : user.role === 'manager'
        ? navItems.slice(0, 3)
        : navItems;
  const mobileOverflowTabs =
    user.role === 'owner'
      ? navItems.slice(4)
      : user.role === 'manager'
        ? navItems.slice(3)
        : [];
  const isOverflowTabActive = mobileOverflowTabs.some((item) => item.id === activeTab);
  const overflowBadgeCount = mobileOverflowTabs.reduce((acc, item) => acc + (item.badge ?? 0), 0);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden flex yoya-canvas yoya-theme-transition text-[#0F172A] dark:text-[#F0F6FF]">
      <AmbientBackdrop darkMode={darkMode} />

      {/* Apple Frosted Glass Sidebar with Animated Active Indicator */}
      <aside className="no-print relative z-20 hidden lg:flex w-64 shrink-0 flex-col justify-between apple-glass border-r border-blue-500/10 dark:border-cyan-400/15 p-5 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <YoyaPharmacyEmblem className="w-10 h-10 shrink-0" />
            <YoyaWordmark size="sm" customName={settings.clinicName} />
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setActiveTab(item.id);
                  }}
                  className={`relative w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors whitespace-nowrap group ${
                    active
                      ? 'yoya-btn-primary text-white'
                      : 'text-[#526077] dark:text-[#93A8C8] hover:bg-blue-500/[0.06] dark:hover:bg-cyan-400/[0.08] hover:text-[#0F172A] dark:hover:text-[#F0F6FF]'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2.5 truncate">
                    <span className={`inline-flex shrink-0 transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`relative z-10 font-mono text-xs font-bold px-1.5 py-0.5 rounded-lg ${
                        active
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-500/15 text-[#D97706] dark:text-[#F59E0B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {user.role === 'owner' && (unackedAlertCount > 0 || payrollAlertEntries.length > 0) && (
            <div className="p-3.5 rounded-2xl border border-amber-300/70 dark:border-amber-600/35 bg-amber-50/75 dark:bg-amber-950/25 flex items-start gap-2.5">
              <UiSticker kind="alert" className="w-8 h-8 rounded-xl" />
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
                  {unackedAlertCount > 0 && `${unackedAlertCount} Stock`}
                  {unackedAlertCount > 0 && payrollAlertEntries.length > 0 && ' · '}
                  {payrollAlertEntries.length > 0 && `${payrollAlertEntries.length} Payday`}
                </p>
                <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">
                  Review alerts on Overview.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-blue-500/10 dark:border-cyan-400/12">
          <div className="px-2 flex items-center gap-2.5">
            <UiSticker kind={TAB_STICKER_KIND[activeTab]} className="w-8 h-8 rounded-xl" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                {t('welcomePrefix')}, {user.role === 'owner' ? settings.ownerName : user.name}
              </p>
              <p className="text-[11px] text-[#526077] dark:text-[#93A8C8] truncate">
                {settings.clinicName} · {roleBadgeLabel}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-2 rounded-2xl apple-inset flex items-start gap-2 text-[11px] text-[#526077] dark:text-[#93A8C8]">
            <Phone className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE] shrink-0 mt-0.5" />
            <span className="leading-snug">{t('supportHelp')}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl apple-inset">
            <Globe className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
            <select
              value={language}
              onChange={(e) => {
                soundEngine.playTap();
                setLanguage(e.target.value as Language);
              }}
              aria-label="Language"
              className="w-full bg-transparent text-xs font-medium outline-none"
            >
              {(['en', 'am', 'om'] as Language[]).map((lang) => (
                <option key={lang} value={lang} className="bg-white dark:bg-[#0B142A]">
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setDarkMode(!darkMode);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-2xl apple-inset text-xs font-medium hover:opacity-80"
            >
              <span className="inline-flex">
                {darkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#1464F6]" />
                )}
              </span>
              {darkMode ? t('dayMode') : t('nightMode')}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMuted(!muted);
              }}
              className="p-2 rounded-2xl apple-inset hover:opacity-80"
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE]" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-2xl apple-inset text-xs font-semibold hover:opacity-80"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 max-w-full">
        {/* Top Bar Contract: 3 zones */}
        <header className="no-print apple-glass sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 border-b border-blue-500/10 dark:border-cyan-400/12">
          <span className="inline-flex items-center gap-2 min-w-0">
            <YoyaPharmacyEmblem className="w-7 h-7 shrink-0 lg:hidden" />
            <div className="min-w-0 truncate">
              <YoyaWordmark size="xs" customName={settings.clinicName} />
            </div>
          </span>

          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] whitespace-nowrap shrink-0">
            <span className="font-semibold text-[#0F172A] dark:text-[#F0F6FF]">
              {t('welcomePrefix')}, {user.role === 'owner' ? settings.ownerName : user.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{clinicTodayLabel}</span>
            <span aria-hidden="true">·</span>
            <span className={`inline-flex items-center gap-1 ${isOnline ? 'text-[#0D6E52] dark:text-[#22C58B]' : 'text-amber-600 dark:text-amber-400'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {totalPendingSync > 0 && isOnline && (
              <button
                type="button"
                onClick={() => void syncOfflineQueue()}
                disabled={syncingOffline}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('syncNow')}</span>
                <span>({totalPendingSync})</span>
              </button>
            )}

            {canManageInventory ? (
              <>
                <button
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    setAddStockDrugId(undefined);
                    setAddStockOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl apple-inset text-xs font-semibold hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  {t('addStock')}
                </button>
                <MagneticButton
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    setEditingDrug(null);
                    setDrugModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] rounded-2xl text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('newMedicine')}</span>
                  <span className="sm:hidden">Drug</span>
                </MagneticButton>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl apple-inset text-xs font-semibold hover:opacity-80 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('signOut')}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setMobileMenuOpen(true);
              }}
              aria-label="Open menu and preferences"
              className="lg:hidden inline-flex items-center justify-center min-h-[40px] min-w-[40px] p-2 rounded-2xl apple-inset hover:opacity-80"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Compact Mobile Sub-Status Strip (No horizontal overflow) */}
        <div className="no-print lg:hidden px-3.5 py-1.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.02] flex items-center justify-between gap-2 text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
          <span className="truncate font-medium">
            {t('welcomePrefix')},{' '}
            <strong className="text-[#111827] dark:text-[#F5F7FA]">
              {user.role === 'owner' ? settings.ownerName : user.name}
            </strong>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono tabular-nums truncate max-w-[140px]">{clinicTodayLabel}</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${isOnline ? 'text-[#0D6E52] dark:text-[#22C58B]' : 'text-amber-600 dark:text-amber-400'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
            </span>
          </div>
        </div>

        <main className="no-print flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] w-full min-w-0 mx-auto space-y-5">
          {qrBanner && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl apple-surface border border-[#1464F6]/30 dark:border-cyan-400/30 text-xs font-semibold text-[#0F172A] dark:text-[#F0F6FF]">
              <span className="flex items-center gap-2.5 min-w-0">
                <UiSticker kind="shield" className="w-7 h-7 rounded-xl" />
                <span className="truncate">{qrBanner}</span>
              </span>
              <button
                type="button"
                onClick={() => setQrBanner(null)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loadingData && drugs.length === 0 ? (
            <PremiumSkeleton />
          ) : (
            <div key={activeTab}>
              {activeTab === 'overview' && user.role === 'owner' && (
                <OwnerOverview
                  overview={overview}
                  ownerName={settings.ownerName}
                  period={period}
                  onChangePeriod={setPeriod}
                  alerts={alerts}
                  payrollAlerts={payrollAlertEntries}
                  drugs={effectiveDrugs}
                  drugKinds={drugKinds}
                  currencySymbol={settings.currencySymbol}
                  calendarMode={settings.calendarMode}
                  dateOffsetDays={settings.dateOffsetDays}
                  language={language}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onOpenAddStock={(id) => {
                    setAddStockDrugId(id);
                    setAddStockOpen(true);
                  }}
                  onOpenRestockSheet={() => setRestockSheetOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'inventory' && canManageInventory && (
                <OwnerInventory
                  drugs={effectiveDrugs}
                  drugKinds={drugKinds}
                  currencySymbol={settings.currencySymbol}
                  calendarMode={settings.calendarMode}
                  language={language}
                  canDelete={user.role === 'owner'}
                  inventoryWriteLocked={inventoryWriteLocked}
                  onAddDrug={() => {
                    setEditingDrug(null);
                    setDrugModalOpen(true);
                  }}
                  onOpenAddStock={(id) => {
                    setAddStockDrugId(id);
                    setAddStockOpen(true);
                  }}
                  onOpenRestockSheet={() => setRestockSheetOpen(true)}
                  onCreateDrugKind={handleCreateDrugKind}
                  onUpdateDrugKind={handleUpdateDrugKind}
                  onDeleteDrugKind={handleDeleteDrugKind}
                  onEditDrug={(drug) => {
                    setEditingDrug(drug);
                    setDrugModalOpen(true);
                  }}
                  onDeleteDrug={handleDeleteDrug}
                />
              )}

              {activeTab === 'pos' && (
                <CashierPos
                  user={user}
                  drugs={effectiveDrugs}
                  drugKinds={drugKinds}
                  transactions={transactions}
                  settings={settings}
                  language={language}
                  isOnline={isOnline}
                  posLocked={posLocked}
                  pendingSales={pendingSales}
                  syncingOffline={syncingOffline}
                  onSyncOffline={syncOfflineQueue}
                  onOfflineSaleQueued={(sale) => setPendingSales((prev) => [...prev, sale])}
                  onSaleCompleted={async () => {
                    await loadWorkspaceData(user, period);
                  }}
                  onOpenReceipt={(txn) => setReceiptTxn(txn)}
                />
              )}

              {activeTab === 'transactions' && canManageInventory && (
                <OwnerTransactions
                  transactions={transactions}
                  currencySymbol={settings.currencySymbol}
                  calendarMode={settings.calendarMode}
                  language={language}
                  exportsLocked={exportsLocked}
                  onOpenReceipt={(txn) => setReceiptTxn(txn)}
                />
              )}

              {activeTab === 'operations' && user.role === 'owner' && (
                <OwnerOperationsView
                  shiftCloses={shiftCloses}
                  expenses={expenses}
                  suppliers={suppliers}
                  supplierInvoices={supplierInvoices}
                  auditLog={auditLog}
                  auditChainValid={auditChainValid}
                  currencySymbol={settings.currencySymbol}
                  calendarMode={settings.calendarMode}
                  language={language}
                  onCreateExpense={handleCreateExpense}
                  onUpdateExpense={handleUpdateExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onCreateSupplier={handleCreateSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onCreateSupplierInvoice={handleCreateSupplierInvoice}
                  onUpdateSupplierInvoice={handleUpdateSupplierInvoice}
                  onPaySupplierInvoice={handlePaySupplierInvoice}
                  onDeleteSupplierInvoice={handleDeleteSupplierInvoice}
                />
              )}

              {activeTab === 'attendance' && canManageInventory && (
                <AttendanceQrView
                  qrConfig={attendanceQr}
                  attendance={attendance}
                  settings={settings}
                  language={language}
                  exportsLocked={exportsLocked}
                  onSimulatePunch={async (type, token) => {
                    await handlePunchAttendance(type, token);
                  }}
                />
              )}

              {activeTab === 'staff' && user.role === 'owner' && (
                <OwnerStaffView
                  staff={staff}
                  onCreateStaff={handleCreateStaff}
                  onUpdateStaff={handleUpdateStaff}
                  onDeleteStaff={handleDeleteStaff}
                />
              )}

              {activeTab === 'payroll' && user.role === 'owner' && (
                <PayrollView
                  staff={staff}
                  entries={payrollEntries}
                  payments={payrollPayments}
                  currencySymbol={settings.currencySymbol}
                  calendarMode={settings.calendarMode}
                  language={language}
                  onSaveProfile={handleSavePayrollProfile}
                  onDeleteProfile={handleDeletePayrollProfile}
                  onConfirmPayment={handleConfirmPayrollPayment}
                  onUpdatePayment={handleUpdatePayrollPayment}
                  onDeletePayment={handleDeletePayrollPayment}
                />
              )}

              {activeTab === 'settings' && user.role === 'owner' && (
                <OwnerSettingsKit
                  settings={settings}
                  language={language}
                  currentUsername={user.username}
                  envPasscodeActive={authStatus.envPasscodeActive}
                  onSaveSettings={handleSaveSettings}
                  onUpdateOwnerCredentials={handleUpdateOwnerCredentials}
                />
              )}

              {activeTab === 'my_portal' && user.role !== 'owner' && (
                <WorkerSalaryAndAttendanceView
                  user={user}
                  transactions={transactions}
                  attendance={attendance}
                  attendanceSummary={myAttendanceSummary}
                  scheduledClockIn={mySchedule.clockIn}
                  scheduledClockOut={mySchedule.clockOut}
                  myPayroll={myPayroll}
                  myPayments={myPayments}
                  settings={settings}
                  language={language}
                  onPunch={async (type) => {
                    await handlePunchAttendance(type);
                  }}
                  onPunchQr={async (type, qrToken) => {
                    await handlePunchAttendance(type, qrToken);
                  }}
                />
              )}

              {activeTab === 'guide' && (
                <GuideView
                  language={language}
                  onChangeLanguage={setLanguage}
                  userRole={user.role}
                  clinicName={settings.clinicName}
                  currencySymbol={settings.currencySymbol}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {canManageInventory && (
        <>
          <DrugFormModal
            open={drugModalOpen}
            editingDrug={editingDrug}
            drugKinds={drugKinds}
            currencySymbol={settings.currencySymbol}
            onClose={() => {
              setDrugModalOpen(false);
              setEditingDrug(null);
            }}
            onCreateDrugKind={handleCreateDrugKind}
            onSave={handleSaveDrug}
          />

          <AddStockModal
            open={addStockOpen}
            drugs={drugs}
            initialDrugId={addStockDrugId}
            currencySymbol={settings.currencySymbol}
            onClose={() => {
              setAddStockOpen(false);
              setAddStockDrugId(undefined);
            }}
            onRestock={handleRestockDrug}
          />

          <RestockOrderModal
            open={restockSheetOpen}
            drugs={effectiveDrugs}
            drugKinds={drugKinds}
            suppliers={suppliers}
            clinicName={settings.clinicName}
            currencySymbol={settings.currencySymbol}
            calendarMode={settings.calendarMode}
            dateOffsetDays={settings.dateOffsetDays}
            language={language}
            exportsLocked={exportsLocked}
            onClose={() => setRestockSheetOpen(false)}
          />
        </>
      )}

      <ReceiptModal
        transaction={receiptTxn}
        settings={settings}
        language={language}
        exportsLocked={exportsLocked}
        onClose={() => setReceiptTxn(null)}
      />

      {/* iOS-Style Fixed Mobile Bottom Navigation Bar with Animated Active Pill */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 apple-glass border-t border-blue-500/12 dark:border-cyan-400/15 px-2 pt-1.5 pb-safe"
      >
        <div
          className={`grid gap-1 max-w-lg mx-auto ${
            mobilePrimaryTabs.length + 1 === 5
              ? 'grid-cols-5'
              : mobilePrimaryTabs.length + 1 === 4
                ? 'grid-cols-4'
                : 'grid-cols-3'
          }`}
        >
          {mobilePrimaryTabs.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[50px] rounded-2xl transition-colors ${
                  active
                    ? 'text-[#1464F6] dark:text-[#22D3EE] bg-[#1464F6]/12 dark:bg-cyan-400/15 border border-[#1464F6]/20 dark:border-cyan-400/25'
                    : 'text-[#526077] dark:text-[#93A8C8]'
                }`}
              >
                <div className="relative z-10">
                  <Icon className="w-4.5 h-4.5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D97706] dark:bg-[#F59E0B] text-white dark:text-[#0F172A] text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="relative z-10 text-[10px] font-semibold truncate max-w-full leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setMobileMenuOpen(true);
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 min-h-[50px] rounded-2xl transition-colors ${
              mobileMenuOpen || isOverflowTabActive
                ? 'text-[#1464F6] dark:text-[#22D3EE] bg-[#1464F6]/12 dark:bg-cyan-400/15'
                : 'text-[#526077] dark:text-[#93A8C8]'
            }`}
          >
            <div className="relative">
              <Menu className="w-4.5 h-4.5" />
              {overflowBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D97706] dark:bg-[#F59E0B] text-white dark:text-[#0F172A] text-[9px] font-bold flex items-center justify-center">
                  {overflowBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold leading-tight">
              {mobileOverflowTabs.length > 0 ? 'More' : 'Menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile More & Preferences Bottom Sheet */}
      {mobileMenuOpen && (
        <div
          className="no-print lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 yoya-scroll-contain"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={mobileSheetRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg apple-surface yoya-modal-panel yoya-scroll-contain outline-none rounded-t-[28px] p-5 pb-safe space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <YoyaPharmacyEmblem className="w-8 h-8 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold truncate">{settings.clinicName}</p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] truncate">
                    {roleBadgeLabel}: {user.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full apple-inset"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mobileOverflowTabs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6470] dark:text-[#98A2AE] px-1">
                  Workspace Sections
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {mobileOverflowTabs.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center justify-between gap-2 px-3.5 py-3 min-h-[46px] rounded-2xl text-xs font-semibold transition-all ${
                          active
                            ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                            : 'apple-inset text-[#111827] dark:text-[#F5F7FA]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/20 text-[#B97716] dark:text-[#E5A93C] text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {canManageInventory && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    setMobileMenuOpen(false);
                    setAddStockDrugId(undefined);
                    setAddStockOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-3 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <PackagePlus className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" />
                  {t('addStock')}
                </button>
                <button
                  type="button"
                  disabled={inventoryWriteLocked}
                  onClick={() => {
                    soundEngine.playTap();
                    setMobileMenuOpen(false);
                    setEditingDrug(null);
                    setDrugModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-3 min-h-[44px] rounded-2xl yoya-btn-primary text-white dark:text-[#081310] text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {t('newMedicine')}
                </button>
              </div>
            )}

            <div className="space-y-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-2xl apple-inset">
                <Globe className="w-4 h-4 text-[#5B6470] dark:text-[#98A2AE] shrink-0" />
                <select
                  value={language}
                  onChange={(e) => {
                    soundEngine.playTap();
                    setLanguage(e.target.value as Language);
                  }}
                  aria-label="Language"
                  className="w-full bg-transparent text-xs font-semibold outline-none"
                >
                  {(['en', 'am', 'om'] as Language[]).map((lang) => (
                    <option key={lang} value={lang} className="bg-white dark:bg-[#14191F]">
                      {LANGUAGE_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setDarkMode(!darkMode);
                  }}
                  className="inline-flex items-center justify-center gap-2 py-3 px-3 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-emerald-700" />
                  )}
                  {darkMode ? t('dayMode') : t('nightMode')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setMuted(!muted);
                  }}
                  className="inline-flex items-center justify-center gap-2 py-3 px-3 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {muted ? 'Muted' : 'Sound On'}
                </button>
              </div>

              <div className="px-3 py-2.5 rounded-2xl apple-inset flex items-center gap-2 text-xs text-[#526077] dark:text-[#93A8C8]">
                <Phone className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
                <span>{t('supportHelp')}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] rounded-2xl border border-red-300/60 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
