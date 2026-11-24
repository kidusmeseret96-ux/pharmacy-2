import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Cloud,
  Download,
  KeyRound,
  Lock,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { setVendorToken, vendorApi } from '../lib/api.ts';
import type {
  LicenseStatus,
  VendorFeatureLocks,
  VendorInstallationSummary,
} from '../types/pharmacy.ts';

interface VendorPortalProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function VendorPortal({ darkMode, onToggleTheme }: VendorPortalProps) {
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installations, setInstallations] = useState<VendorInstallationSummary[]>([]);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);

  const loadInstallations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorApi.getInstallations();
      setInstallations(res.installations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load installation telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      void loadInstallations();
    }
  }, [authenticated, loadInstallations]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await vendorApi.login(passcode.trim());
      setPasscode('');
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid developer passcode.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(installationId: string, status: LicenseStatus) {
    setUpdatingId(installationId);
    setError(null);
    try {
      const customReason = reasonById[installationId]?.trim();
      await vendorApi.setInstallationStatus(
        installationId,
        status,
        status === 'active' ? undefined : customReason || undefined
      );
      await loadInstallations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update license status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleUserBlock(
    installationId: string,
    accountId: string,
    nextBlocked: boolean
  ) {
    setUpdatingId(`${installationId}:${accountId}`);
    setError(null);
    try {
      const res = await vendorApi.updateInstallationControls(installationId, {
        toggleAccountId: accountId,
        accountBlocked: nextBlocked,
      });
      setInstallations((prev) =>
        prev.map((item) => (item.installationId === installationId ? res.installation : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user access.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleFeatureLock(
    installationId: string,
    lockKey: keyof VendorFeatureLocks,
    nextVal: boolean
  ) {
    setUpdatingId(`${installationId}:${lockKey}`);
    setError(null);
    try {
      const res = await vendorApi.updateInstallationControls(installationId, {
        featureLocks: { [lockKey]: nextVal },
      });
      setInstallations((prev) =>
        prev.map((item) => (item.installationId === installationId ? res.installation : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature restriction.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDownloadCloudflareFile(
    fileKey: 'workerTs' | 'schemaSql' | 'wranglerToml',
    filename: string
  ) {
    setBundleLoading(true);
    setError(null);
    try {
      const bundle = await vendorApi.getCloudflareBundle();
      const content = bundle[fileKey];
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Cloudflare deployment file.');
    } finally {
      setBundleLoading(false);
    }
  }

  const totalAccounts = installations.reduce((acc, i) => acc + i.totalAccountsCount, 0);
  const totalWorkers = installations.reduce((acc, i) => acc + i.workersCount, 0);
  const sharingAlerts = installations.filter((i) => i.sharingSuspected).length;
  const blockedCount = installations.filter((i) => i.status !== 'active').length;

  return (
    <div
      className={`min-h-screen yoya-theme-transition ${
        darkMode
          ? 'bg-gradient-to-br from-[#040816] via-[#091636] to-[#050C22] text-[#F0F6FF]'
          : 'bg-gradient-to-br from-[#EEF4FF] via-[#F7FAFF] to-[#E2EEFF] text-[#0F172A]'
      }`}
    >
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1464F6] text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight">Developer License & Anti-Sharing Console</h1>
            <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
              Monitor accounts, individual users, feature locks, multi-host sharing flags & license access control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-[#1464F6]" />}
            {darkMode ? 'Day' : 'Night'}
          </button>
          {authenticated && (
            <>
              <button
                type="button"
                onClick={() => void loadInstallations()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setVendorToken(null);
                  setAuthenticated(false);
                  setInstallations([]);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        {!authenticated ? (
          <div className="max-w-md mx-auto mt-12 apple-surface rounded-[28px] p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="text-center space-y-1.5">
              <KeyRound className="w-9 h-9 mx-auto text-[#1464F6] dark:text-[#22D3EE]" />
              <h2 className="font-display text-xl font-bold">Vendor Sign In</h2>
              <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                Enter your developer passcode to inspect client installations, individual user accounts, sharing signals, and feature controls.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="off"
                placeholder="Developer Passcode"
                className="w-full px-4 py-3.5 rounded-2xl apple-inset text-sm font-mono"
              />
              {error && (
                <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-2xl yoya-btn-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Open Developer Portal'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {error && (
              <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="apple-surface rounded-[22px] p-4 space-y-1">
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Installations</p>
                <p className="font-display text-2xl font-bold font-mono tabular-nums">{installations.length}</p>
              </div>
              <div className="apple-surface rounded-[22px] p-4 space-y-1">
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Accounts Created</p>
                <p className="font-display text-2xl font-bold font-mono tabular-nums text-[#1464F6] dark:text-[#22D3EE]">
                  {totalAccounts}
                </p>
              </div>
              <div className="apple-surface rounded-[22px] p-4 space-y-1">
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Total Workers</p>
                <p className="font-display text-2xl font-bold font-mono tabular-nums text-[#0D6E52] dark:text-[#22C58B]">
                  {totalWorkers}
                </p>
              </div>
              <div className="apple-surface rounded-[22px] p-4 space-y-1">
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Sharing Alerts</p>
                <p
                  className={`font-display text-2xl font-bold font-mono tabular-nums ${
                    sharingAlerts > 0 ? 'text-red-600 dark:text-red-400' : ''
                  }`}
                >
                  {sharingAlerts}
                </p>
              </div>
              <div className="apple-surface rounded-[22px] p-4 space-y-1 col-span-2 sm:col-span-1">
                <p className="text-xs text-[#526077] dark:text-[#93A8C8]">Revoked / Banned</p>
                <p className="font-display text-2xl font-bold font-mono tabular-nums text-[#B97716] dark:text-[#E5A93C]">
                  {blockedCount}
                </p>
              </div>
            </div>

            {/* Standalone Cloudflare Deployment Kit */}
            <div className="apple-surface rounded-[24px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Cloud className="w-6 h-6 text-[#1464F6] dark:text-[#22D3EE] shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display text-base font-bold">Standalone Cloudflare Worker + D1 Bundle</h2>
                  <p className="text-xs text-[#526077] dark:text-[#93A8C8]">
                    Host your central license, individual user control & anti-sharing dashboard separately on Cloudflare Workers + D1 SQLite via VENDOR_CLOUDFLARE_URL.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={bundleLoading}
                  onClick={() => void handleDownloadCloudflareFile('workerTs', 'worker.ts')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  worker.ts
                </button>
                <button
                  type="button"
                  disabled={bundleLoading}
                  onClick={() => void handleDownloadCloudflareFile('schemaSql', 'schema.sql')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  schema.sql
                </button>
                <button
                  type="button"
                  disabled={bundleLoading}
                  onClick={() => void handleDownloadCloudflareFile('wranglerToml', 'wrangler.toml')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl apple-inset text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  wrangler.toml
                </button>
              </div>
            </div>

            {/* Registered Installations */}
            <div className="space-y-4">
              {installations.map((inst) => {
                const locks = inst.featureLocks ?? {};
                const accounts = inst.accounts ?? [];
                const suspendedCount = accounts.filter((a) => a.vendorBlocked).length;

                return (
                  <div key={inst.installationId} className="apple-surface rounded-[26px] p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-display text-lg font-bold truncate">{inst.clinicName}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              inst.status === 'active'
                                ? 'bg-[#0D6E52]/15 text-[#0D6E52] dark:bg-[#22C58B]/15 dark:text-[#22C58B]'
                                : inst.status === 'revoked'
                                  ? 'bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C]'
                                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {inst.status}
                          </span>
                          {suspendedCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
                              {suspendedCount} User Suspended
                            </span>
                          )}
                          <span className="text-xs font-mono text-[#526077] dark:text-[#93A8C8]">
                            ID: {inst.installationId}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                          <div className="p-2.5 rounded-xl apple-inset">
                            <p className="text-[#526077] dark:text-[#93A8C8]">Owner</p>
                            <p className="font-semibold truncate">{inst.ownerName}</p>
                            <p className="font-mono text-[11px] text-[#526077] dark:text-[#93A8C8]">
                              @{inst.ownerUsername} · {inst.ownerClaimed ? 'Claimed' : 'Unclaimed'}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl apple-inset">
                            <p className="text-[#526077] dark:text-[#93A8C8]">Accounts Created</p>
                            <p className="font-mono font-bold text-base">{inst.totalAccountsCount}</p>
                            <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">Owner + Staff</p>
                          </div>
                          <div className="p-2.5 rounded-xl apple-inset">
                            <p className="text-[#526077] dark:text-[#93A8C8] inline-flex items-center gap-1">
                              <Users className="w-3 h-3" /> Workers
                            </p>
                            <p className="font-mono font-bold text-base">
                              {inst.workersCount} <span className="text-xs font-normal">({inst.activeWorkersCount} active)</span>
                            </p>
                            <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">
                              {inst.managersCount} Mgr · {inst.sellersCount} Seller
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl apple-inset">
                            <p className="text-[#526077] dark:text-[#93A8C8]">Catalog & Sales</p>
                            <p className="font-mono font-bold text-base">
                              {inst.drugsCount} / {inst.transactionsCount}
                            </p>
                            <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">Drugs / Receipts</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl apple-inset text-xs font-mono space-y-1 text-[#526077] dark:text-[#93A8C8] break-all">
                          <p>
                            <strong>Hosts:</strong> {inst.seenHosts.join(', ') || 'None yet'}
                          </p>
                          <p>
                            <strong>Origins:</strong> {inst.seenOrigins.join(', ') || 'None yet'}
                          </p>
                          <p>
                            <strong>Machines:</strong> {inst.seenFingerprints.length} ({inst.seenFingerprints.join(', ')}) ·{' '}
                            <strong>Distinct IPs:</strong> {inst.ipHashes.length}
                          </p>
                          <p>
                            <strong>Last Seen:</strong> {new Date(inst.lastSeenAt).toLocaleString()}
                          </p>
                        </div>

                        {inst.sharingSuspected && inst.sharingReasons.length > 0 && (
                          <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Possible Unauthorized App Sharing Detected</p>
                              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                {inst.sharingReasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {inst.status !== 'active' && inst.reason && (
                          <div className="p-3 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200">
                            Active block reason: {inst.reason}
                          </div>
                        )}
                      </div>

                      <div className="lg:w-72 shrink-0 space-y-2.5">
                        <input
                          type="text"
                          value={reasonById[inst.installationId] ?? ''}
                          onChange={(e) =>
                            setReasonById((prev) => ({ ...prev, [inst.installationId]: e.target.value }))
                          }
                          placeholder="Optional revoke/ban note for client..."
                          className="w-full px-3.5 py-2.5 rounded-xl apple-inset text-xs"
                        />
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            disabled={updatingId === inst.installationId || inst.status === 'revoked'}
                            onClick={() => void handleStatusChange(inst.installationId, 'revoked')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Revoke Whole Pharmacy
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === inst.installationId || inst.status === 'banned'}
                            onClick={() => void handleStatusChange(inst.installationId, 'banned')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-semibold"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Ban Whole Pharmacy
                          </button>
                          {inst.status !== 'active' && (
                            <button
                              type="button"
                              disabled={updatingId === inst.installationId}
                              onClick={() => void handleStatusChange(inst.installationId, 'active')}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:text-[#081310] text-white text-xs font-semibold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Restore Access
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feature Restrictions & Individual Accounts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                      {/* Feature Locks */}
                      <div className="lg:col-span-5 p-4 rounded-2xl apple-inset space-y-3">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE]" />
                          <div>
                            <h4 className="text-xs font-bold">Remote Feature Locks</h4>
                            <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">
                              Disable specific pharmacy modules without banning login.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(
                            [
                              {
                                key: 'disablePos',
                                title: 'Lock POS Checkout',
                                desc: 'Blocks creating new sales/receipts while keeping reports viewable.',
                              },
                              {
                                key: 'disableInventoryWrite',
                                title: 'Lock Inventory Edits',
                                desc: 'Prevents adding, editing, deleting, or restocking medicines.',
                              },
                              {
                                key: 'disableExports',
                                title: 'Lock Downloads & Prints',
                                desc: 'Disables receipt PNGs, restock sheets, QR posters & proof downloads.',
                              },
                            ] as const
                          ).map((item) => {
                            const locked = Boolean(locks[item.key]);
                            const busy = updatingId === `${inst.installationId}:${item.key}`;
                            return (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-[#0B142A]/70 border border-black/[0.05] dark:border-white/[0.06]"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold">{item.title}</p>
                                  <p className="text-[11px] text-[#526077] dark:text-[#93A8C8] leading-snug">
                                    {item.desc}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleToggleFeatureLock(inst.installationId, item.key, !locked)}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
                                    locked
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'apple-surface hover:opacity-80'
                                  }`}
                                >
                                  {locked ? 'Locked' : 'Unlocked'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Individual User Suspension Control */}
                      <div className="lg:col-span-7 p-4 rounded-2xl apple-inset space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" />
                            <div>
                              <h4 className="text-xs font-bold">
                                Individual User Control ({accounts.length})
                              </h4>
                              <p className="text-[11px] text-[#526077] dark:text-[#93A8C8]">
                                Suspend or restore an individual owner or staff login immediately.
                              </p>
                            </div>
                          </div>
                        </div>

                        {accounts.length === 0 ? (
                          <p className="text-xs text-[#526077] dark:text-[#93A8C8] py-4 text-center">
                            No accounts reported for this installation yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {accounts.map((acct) => {
                              const busy = updatingId === `${inst.installationId}:${acct.id}`;
                              return (
                                <div
                                  key={acct.id}
                                  className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-[#0B142A]/70 border border-black/[0.05] dark:border-white/[0.06]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-bold truncate">{acct.name}</span>
                                      <span className="font-mono text-[11px] text-[#526077] dark:text-[#93A8C8]">
                                        @{acct.username}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-[#1464F6]/12 text-[#1464F6] dark:bg-cyan-400/15 dark:text-[#22D3EE]">
                                        {acct.role}
                                      </span>
                                      {!acct.active && (
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/15 text-[#B97716] dark:text-[#E5A93C]">
                                          {acct.role === 'owner' ? 'Unclaimed' : 'Owner Disabled'}
                                        </span>
                                      )}
                                      {acct.vendorBlocked && (
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
                                          Vendor Suspended
                                        </span>
                                      )}
                                    </div>
                                    {acct.lastLoginAt && (
                                      <p className="text-[10px] font-mono text-[#526077] dark:text-[#93A8C8] mt-0.5">
                                        Last login: {new Date(acct.lastLoginAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void handleToggleUserBlock(
                                        inst.installationId,
                                        acct.id,
                                        !acct.vendorBlocked
                                      )
                                    }
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
                                      acct.vendorBlocked
                                        ? 'bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:text-[#081310] text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                                  >
                                    {acct.vendorBlocked ? (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Restore User
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3.5 h-3.5" />
                                        Suspend User
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {installations.length === 0 && !loading && (
                <div className="apple-surface rounded-[24px] p-10 text-center text-sm text-[#526077] dark:text-[#93A8C8]">
                  No pharmacy installations recorded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
