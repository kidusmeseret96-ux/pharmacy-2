import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  IdCard,
  KeyRound,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { compressImageFile, downloadDataUrlOrAsset } from '../lib/api.ts';
import { getTranslator } from '../lib/i18n.ts';
import {
  ELECTRON_MAIN_CJS,
  RENDER_BLUEPRINT_YAML,
  SUPABASE_SQL_SCHEMA,
} from '../lib/deploymentTemplates.ts';
import {
  ETHIOPIAN_MONTHS,
  ethiopianToGregorianIso,
  formatClinicDate,
  getEffectiveNow,
  toEthiopianDate,
} from '../lib/ethiopianCalendar.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { CalendarMode, ClinicSettings, Language, StaffUser } from '../types/pharmacy.ts';
import { CameraCaptureModal } from './CameraCaptureModal.tsx';

interface OwnerStaffViewProps {
  staff: StaffUser[];
  onCreateStaff: (payload: {
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
  }) => Promise<void>;
  onUpdateStaff: (
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
  ) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
}

export function OwnerStaffView({
  staff,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
}: OwnerStaffViewProps) {
  const [editingMember, setEditingMember] = useState<StaffUser | null>(null);
  const [inspectMember, setInspectMember] = useState<StaffUser | null>(null);
  const [role, setRole] = useState<'seller' | 'manager'>('seller');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState('Morning Shift');
  const [scheduledClockIn, setScheduledClockIn] = useState('08:30');
  const [scheduledClockOut, setScheduledClockOut] = useState('17:30');
  const [graceMinutes, setGraceMinutes] = useState('5');
  const [photoImage, setPhotoImage] = useState('');
  const [faydaFrontImage, setFaydaFrontImage] = useState('');
  const [faydaBackImage, setFaydaBackImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPosLink, setCopiedPosLink] = useState(false);

  const [cameraField, setCameraField] = useState<'photo' | 'fayda_front' | 'fayda_back' | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const faydaFrontRef = useRef<HTMLInputElement | null>(null);
  const faydaBackRef = useRef<HTMLInputElement | null>(null);

  const posUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

  function resetForm() {
    setEditingMember(null);
    setRole('seller');
    setName('');
    setPhone('');
    setJobTitle('');
    setUsername('');
    setPassword('');
    setShift('Morning Shift');
    setScheduledClockIn('08:30');
    setScheduledClockOut('17:30');
    setGraceMinutes('5');
    setPhotoImage('');
    setFaydaFrontImage('');
    setFaydaBackImage('');
    setError(null);
  }

  function startEdit(member: StaffUser) {
    soundEngine.playTap();
    setEditingMember(member);
    setRole(member.role);
    setName(member.name);
    setPhone(member.phone || '');
    setJobTitle(member.jobTitle || '');
    setUsername(member.username);
    setPassword('');
    setShift(member.shift || 'Full-Time');
    setScheduledClockIn(member.scheduledClockIn || '08:30');
    setScheduledClockOut(member.scheduledClockOut || '17:30');
    setGraceMinutes(String(member.graceMinutes ?? 5));
    setPhotoImage(member.photoImage || '');
    setFaydaFrontImage(member.faydaFrontImage || '');
    setFaydaBackImage(member.faydaBackImage || '');
    setError(null);
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'photo' | 'fayda_front' | 'fayda_back'
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 900, 0.8);
      soundEngine.playShutter();
      if (target === 'photo') setPhotoImage(compressed);
      if (target === 'fayda_front') setFaydaFrontImage(compressed);
      if (target === 'fayda_back') setFaydaBackImage(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingMember) {
        await onUpdateStaff(editingMember.id, {
          role,
          name,
          phone,
          jobTitle: jobTitle || (role === 'manager' ? 'Pharmacy Manager' : 'Counter Seller'),
          username,
          password: password.trim() ? password : undefined,
          shift,
          scheduledClockIn,
          scheduledClockOut,
          graceMinutes: Number(graceMinutes) || 5,
          photoImage,
          faydaFrontImage,
          faydaBackImage,
        });
        soundEngine.playAddToCart();
        resetForm();
      } else {
        await onCreateStaff({
          role,
          name,
          phone,
          jobTitle: jobTitle || (role === 'manager' ? 'Pharmacy Manager' : 'Counter Seller'),
          username,
          password,
          shift,
          scheduledClockIn,
          scheduledClockOut,
          graceMinutes: Number(graceMinutes) || 5,
          photoImage: photoImage || undefined,
          faydaFrontImage: faydaFrontImage || undefined,
          faydaBackImage: faydaBackImage || undefined,
        });
        soundEngine.playSaleComplete();
        resetForm();
      }
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  }

  function copyLoginUrl() {
    void navigator.clipboard.writeText(posUrl);
    soundEngine.playTap();
    setCopiedPosLink(true);
    setTimeout(() => setCopiedPosLink(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Users, Shift Schedules & Fayda IDs</h2>
          <p className="text-sm text-[#5B6470] dark:text-[#98A2AE]">
            Assign Seller or Manager roles, set individual clock-in/clock-out times for lateness tracking, and store Fayda IDs.
          </p>
        </div>

        <button
          type="button"
          onClick={copyLoginUrl}
          className="apple-surface inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold"
        >
          {copiedPosLink ? <Check className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" /> : <Copy className="w-4 h-4" />}
          {copiedPosLink ? 'Copied Login URL' : 'Copy Staff Portal Link'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 apple-surface rounded-[26px] p-6 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">
              {editingMember ? `Edit User: ${editingMember.name}` : 'Add New Pharmacy User'}
            </h3>
            {editingMember && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              Access Role *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setRole('seller');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === 'seller'
                    ? 'border-[#0D6E52] dark:border-[#22C58B] bg-[#0D6E52]/10 dark:bg-[#22C58B]/15'
                    : 'border-black/[0.06] dark:border-white/[0.08] apple-inset'
                }`}
              >
                <p className="text-xs font-bold">Seller (Counter POS)</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] mt-0.5">
                  Can only sell, view stock, and see own stats/attendance.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setRole('manager');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === 'manager'
                    ? 'border-[#0D6E52] dark:border-[#22C58B] bg-[#0D6E52]/10 dark:bg-[#22C58B]/15'
                    : 'border-black/[0.06] dark:border-white/[0.08] apple-inset'
                }`}
              >
                <p className="text-xs font-bold">Manager</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] mt-0.5">
                  Manages catalog, stock, drug kinds, POS & attendance.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abebe Kebede"
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 9..."
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. abebe.rx"
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                {editingMember ? 'New Password (optional)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!editingMember}
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingMember ? 'Leave blank to keep old' : 'Min 4 chars'}
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={role === 'manager' ? 'Pharmacy Manager' : 'Counter Seller'}
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Assigned Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 rounded-xl apple-inset text-sm"
              >
                <option>Morning Shift</option>
                <option>Afternoon Shift</option>
                <option>Night Shift</option>
                <option>Full-Time</option>
              </select>
            </div>
          </div>

          {/* Individual Clock-In & Clock-Out Schedule */}
          <div className="p-3.5 rounded-2xl apple-inset space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#0D6E52] dark:text-[#22C58B]" />
              Expected Clock-In & Clock-Out Times
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Clock In
                </label>
                <input
                  type="time"
                  value={scheduledClockIn}
                  onChange={(e) => setScheduledClockIn(e.target.value)}
                  className="w-full px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Clock Out
                </label>
                <input
                  type="time"
                  value={scheduledClockOut}
                  onChange={(e) => setScheduledClockOut(e.target.value)}
                  className="w-full px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Grace (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(e.target.value)}
                  className="w-full px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <input ref={photoInputRef} type="file" accept="image/*" onChange={(e) => void handleFileUpload(e, 'photo')} className="hidden" />
          <input ref={faydaFrontRef} type="file" accept="image/*" onChange={(e) => void handleFileUpload(e, 'fayda_front')} className="hidden" />
          <input ref={faydaBackRef} type="file" accept="image/*" onChange={(e) => void handleFileUpload(e, 'fayda_back')} className="hidden" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {(
              [
                ['photo', 'Worker Photo', photoImage, photoInputRef, () => setPhotoImage(''), 'worker-photo.jpg'],
                ['fayda_front', 'Fayda ID Front', faydaFrontImage, faydaFrontRef, () => setFaydaFrontImage(''), 'fayda-front.jpg'],
                ['fayda_back', 'Fayda ID Back', faydaBackImage, faydaBackRef, () => setFaydaBackImage(''), 'fayda-back.jpg'],
              ] as const
            ).map(([key, label, val, refObj, clearFn, downloadName]) => (
              <div
                key={key}
                className="p-3 rounded-2xl apple-inset flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold truncate">{label}</span>
                  {val && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTap();
                          void downloadDataUrlOrAsset(val, `${username || 'staff'}-${downloadName}`);
                        }}
                        className="p-1 rounded-lg bg-white/80 dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]"
                        title="Download image"
                      >
                        <Download className="w-3 h-3 text-[#0D6E52] dark:text-[#22C58B]" />
                      </button>
                      <button
                        type="button"
                        onClick={clearFn}
                        className="p-1 rounded-lg bg-white/80 dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-red-600 dark:text-red-400"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {val ? (
                  <img
                    src={val}
                    alt={label}
                    className="w-full h-20 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-16 rounded-xl border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center text-[10px] text-[#5B6470] dark:text-[#98A2AE]">
                    No image
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => refObj.current?.click()}
                    className="flex-1 py-2 min-h-[38px] flex items-center justify-center rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]"
                    title="Upload file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraField(key)}
                    className="flex-1 py-2 min-h-[38px] flex items-center justify-center rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08]"
                    title="Take photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] text-white dark:text-[#081310] text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : editingMember ? 'Update User & Schedule' : 'Create Pharmacy User'}
          </button>
        </form>

        {/* Registered Users List */}
        <div className="xl:col-span-7 apple-surface rounded-[26px] p-6">
          <h3 className="font-display text-base font-bold mb-4">Registered Users ({staff.length})</h3>
          {staff.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <IdCard className="w-8 h-8 mx-auto text-[#5B6470] dark:text-[#98A2AE]" />
              <p className="text-sm font-medium">No Seller or Manager accounts created yet.</p>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Create user logins with phone numbers, shift hours, and Fayda ID photos on the left.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {member.photoImage ? (
                      <img
                        src={member.photoImage}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl apple-inset flex items-center justify-center font-display font-bold text-sm shrink-0">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {member.name}
                        <span className="ml-2 text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B] capitalize">
                          · {member.role}
                        </span>
                      </p>
                      <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] font-mono truncate">
                        @{member.username} · {member.phone || 'No phone'}
                      </p>
                      <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE] font-mono">
                        {member.scheduledClockIn || '08:30'}–{member.scheduledClockOut || '17:30'} ·{' '}
                        {member.active ? 'Active' : 'Suspended'}
                        {member.faydaFrontImage && ' · Fayda Verified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        setInspectMember(member);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl apple-inset text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Fayda ID
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(member)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl apple-inset text-xs font-medium"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        void onUpdateStaff(member.id, { active: !member.active });
                      }}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl apple-inset"
                      title={member.active ? 'Suspend' : 'Activate'}
                    >
                      {member.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteStaff(member.id)}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      aria-label="Remove user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inspect Fayda ID Modal */}
      {inspectMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto yoya-scroll-contain"
          onClick={() => setInspectMember(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            className="w-full max-w-2xl my-8 apple-surface yoya-modal-panel outline-none rounded-[26px] shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto yoya-scroll-contain"
          >
            <div className="apple-glass flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h3 className="font-display text-lg font-bold">{inspectMember.name} · Identity File</h3>
                <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] inline-flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {inspectMember.phone || 'N/A'} · @{inspectMember.username} ·{' '}
                  <span className="capitalize">{inspectMember.role}</span>
                </p>
              </div>
              <button type="button" onClick={() => setInspectMember(null)} className="p-2 rounded-full apple-inset">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-2xl apple-inset flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Worker Photo</p>
                  {inspectMember.photoImage && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        void downloadDataUrlOrAsset(inspectMember.photoImage!, `${inspectMember.username}-photo.jpg`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  )}
                </div>
                {inspectMember.photoImage ? (
                  <img src={inspectMember.photoImage} alt="Worker" className="w-full h-44 object-contain rounded-xl" />
                ) : (
                  <p className="py-12 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">Not uploaded</p>
                )}
              </div>
              <div className="p-3 rounded-2xl apple-inset flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Fayda National ID (Front)</p>
                  {inspectMember.faydaFrontImage && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        void downloadDataUrlOrAsset(inspectMember.faydaFrontImage!, `${inspectMember.username}-fayda-front.jpg`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  )}
                </div>
                {inspectMember.faydaFrontImage ? (
                  <img src={inspectMember.faydaFrontImage} alt="Fayda Front" className="w-full h-44 object-contain rounded-xl" />
                ) : (
                  <p className="py-12 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">Not uploaded</p>
                )}
              </div>
              <div className="p-3 rounded-2xl apple-inset flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">Fayda National ID (Back)</p>
                  {inspectMember.faydaBackImage && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        void downloadDataUrlOrAsset(inspectMember.faydaBackImage!, `${inspectMember.username}-fayda-back.jpg`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  )}
                </div>
                {inspectMember.faydaBackImage ? (
                  <img src={inspectMember.faydaBackImage} alt="Fayda Back" className="w-full h-44 object-contain rounded-xl" />
                ) : (
                  <p className="py-12 text-center text-xs text-[#5B6470] dark:text-[#98A2AE]">Not uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CameraCaptureModal
        open={cameraField !== null}
        title={
          cameraField === 'photo'
            ? 'Capture Worker Photo'
            : cameraField === 'fayda_front'
              ? 'Capture Fayda National ID (Front)'
              : 'Capture Fayda National ID (Back)'
        }
        subtitle="Hold clearly in frame or upload an image file."
        onClose={() => setCameraField(null)}
        onCapture={(dataUrl) => {
          if (cameraField === 'photo') setPhotoImage(dataUrl);
          if (cameraField === 'fayda_front') setFaydaFrontImage(dataUrl);
          if (cameraField === 'fayda_back') setFaydaBackImage(dataUrl);
        }}
      />
    </div>
  );
}

interface OwnerSettingsKitProps {
  settings: ClinicSettings;
  language: Language;
  currentUsername?: string;
  envPasscodeActive?: boolean;
  onSaveSettings: (payload: Partial<ClinicSettings>) => Promise<void>;
  onUpdateOwnerCredentials?: (payload: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  }) => Promise<void>;
}

export function OwnerSettingsKit({
  settings,
  language,
  currentUsername = 'owner',
  envPasscodeActive = false,
  onSaveSettings,
  onUpdateOwnerCredentials,
}: OwnerSettingsKitProps) {
  const t = getTranslator(language);
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [licenseNumber, setLicenseNumber] = useState(settings.licenseNumber);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [taxRatePercent, setTaxRatePercent] = useState(String(settings.taxRatePercent));
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState<boolean>(settings.alertSoundEnabled ?? true);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(settings.calendarMode || 'both');
  const [dateOffsetDays, setDateOffsetDays] = useState<number>(settings.dateOffsetDays || 0);
  const [savedBanner, setSavedBanner] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newOwnerUsername, setNewOwnerUsername] = useState(currentUsername);
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [confirmOwnerPassword, setConfirmOwnerPassword] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState(false);

  useEffect(() => {
    setClinicName(settings.clinicName);
    setOwnerName(settings.ownerName);
    setLicenseNumber(settings.licenseNumber);
    setCurrencySymbol(settings.currencySymbol);
    setTaxRatePercent(String(settings.taxRatePercent));
    setReceiptFooter(settings.receiptFooter);
    setAlertSoundEnabled(settings.alertSoundEnabled ?? true);
    setCalendarMode(settings.calendarMode || 'both');
    setDateOffsetDays(settings.dateOffsetDays || 0);
  }, [settings]);

  useEffect(() => {
    setNewOwnerUsername(currentUsername);
  }, [currentUsername]);

  const effectiveDate = getEffectiveNow(dateOffsetDays);
  const effectiveGcIso = effectiveDate.toISOString().slice(0, 10);
  const effectiveEc = toEthiopianDate(effectiveDate);

  const [ecYear, setEcYear] = useState(String(effectiveEc.year));
  const [ecMonth, setEcMonth] = useState(String(effectiveEc.month));
  const [ecDay, setEcDay] = useState(String(effectiveEc.day));

  function applyGregorianTargetDate(isoDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
    const realToday = new Date();
    const realMidnight = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate()).getTime();
    const [y, m, d] = isoDate.split('-').map(Number);
    const targetMidnight = new Date(y, m - 1, d).getTime();
    const diffDays = Math.round((targetMidnight - realMidnight) / 86400000);
    setDateOffsetDays(diffDays);
    const ec = toEthiopianDate(isoDate);
    setEcYear(String(ec.year));
    setEcMonth(String(ec.month));
    setEcDay(String(ec.day));
  }

  function applyEthiopianTargetDate(y: number, m: number, d: number) {
    const gcIso = ethiopianToGregorianIso(y, m, d);
    applyGregorianTargetDate(gcIso);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await onSaveSettings({
      clinicName,
      ownerName,
      licenseNumber,
      currencySymbol,
      taxRatePercent: Number(taxRatePercent),
      receiptFooter,
      alertSoundEnabled,
      calendarMode,
      dateOffsetDays,
    });
    soundEngine.playSaleComplete();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  }

  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onUpdateOwnerCredentials) return;
    setCredError(null);
    setCredSuccess(false);

    if (newOwnerPassword && newOwnerPassword.length < 6) {
      setCredError('New password must be at least 6 characters.');
      return;
    }
    if (newOwnerPassword !== confirmOwnerPassword) {
      setCredError('New passwords do not match.');
      return;
    }

    setCredSaving(true);
    try {
      await onUpdateOwnerCredentials({
        currentPassword,
        newUsername: newOwnerUsername.trim() || undefined,
        newPassword: newOwnerPassword || undefined,
      });
      soundEngine.playSaleComplete();
      setCurrentPassword('');
      setNewOwnerPassword('');
      setConfirmOwnerPassword('');
      setCredSuccess(true);
      setTimeout(() => setCredSuccess(false), 3000);
    } catch (err) {
      soundEngine.playWarning();
      setCredError(err instanceof Error ? err.message : 'Failed to update owner credentials.');
    } finally {
      setCredSaving(false);
    }
  }

  function downloadFile(filename: string, content: string) {
    soundEngine.playTap();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Pharmacy Settings, Ethiopian Calendar & Packaging Kit
        </h2>
        <p className="text-sm text-[#5B6470] dark:text-[#98A2AE]">
          Configure Ethiopian Calendar mode, clinic system date, Birr branding, and exportable deployment blueprints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSave}
          className="lg:col-span-6 apple-surface rounded-[26px] p-6 space-y-5"
        >
          <h3 className="font-display text-base font-bold">White-Label Pharmacy Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Pharmacy Name
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                EFDA License #
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Currency (Birr)
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Ethiopian Calendar & Clinic Date Controls */}
          <div className="p-4 rounded-2xl apple-inset space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Calendar className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" />
                Ethiopian Calendar & Active System Date
              </div>
              <button
                type="button"
                onClick={() => applyGregorianTargetDate(new Date().toISOString().slice(0, 10))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D6E52] dark:text-[#22C58B] hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Today
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                Calendar Display Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-black/30">
                {(
                  [
                    ['both', 'Both (E.C. + G.C.)'],
                    ['ethiopian', 'Ethiopian (E.C.)'],
                    ['gregorian', 'Gregorian (G.C.)'],
                  ] as const
                ).map(([modeId, modeLabel]) => (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => setCalendarMode(modeId)}
                    className={`py-2 px-2.5 min-h-[38px] rounded-lg text-[11px] font-semibold transition-all ${
                      calendarMode === modeId
                        ? 'bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310]'
                        : 'text-[#5B6470] dark:text-[#98A2AE]'
                    }`}
                  >
                    {modeLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Change Date (Ethiopian Calendar)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <select
                    value={ecMonth}
                    onChange={(e) => {
                      setEcMonth(e.target.value);
                      applyEthiopianTargetDate(Number(ecYear), Number(e.target.value), Number(ecDay));
                    }}
                    className="px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                  >
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <option key={m.month} value={m.month}>
                        {language === 'am' ? m.am : language === 'om' ? m.om : m.en}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={ecDay}
                    onChange={(e) => {
                      setEcDay(e.target.value);
                      applyEthiopianTargetDate(Number(ecYear), Number(ecMonth), Number(e.target.value));
                    }}
                    className="px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono"
                  />
                  <input
                    type="number"
                    min="2000"
                    max="2050"
                    value={ecYear}
                    onChange={(e) => {
                      setEcYear(e.target.value);
                      applyEthiopianTargetDate(Number(e.target.value), Number(ecMonth), Number(ecDay));
                    }}
                    className="px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#5B6470] dark:text-[#98A2AE] mb-1">
                  Or Change Date (Gregorian)
                </label>
                <input
                  type="date"
                  value={effectiveGcIso}
                  onChange={(e) => applyGregorianTargetDate(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] font-mono text-[#0D6E52] dark:text-[#22C58B] break-words">
              Active Clinic Date: {formatClinicDate(effectiveDate, calendarMode, language)}
              {dateOffsetDays !== 0 ? ` (${dateOffsetDays > 0 ? '+' : ''}${dateOffsetDays}d offset)` : ' (Live)'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1.5">
              Printed Receipt Footer Message
            </label>
            <textarea
              rows={2}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
            />
          </div>

          <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl apple-inset cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Bell className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" />
              Play Low-Stock & Payday Alert Sounds
            </span>
            <input
              type="checkbox"
              checked={alertSoundEnabled}
              onChange={(e) => setAlertSoundEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#0D6E52]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {savedBanner ? (
              <span className="text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                Settings saved and applied across POS, calendars, and receipts.
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-2xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] text-white dark:text-[#081310] text-sm font-semibold"
            >
              Save Settings
            </button>
          </div>
        </form>

        <div className="lg:col-span-6 space-y-6">
          {onUpdateOwnerCredentials && !envPasscodeActive && (
            <form
              onSubmit={handleCredentialSubmit}
              className="apple-surface rounded-[26px] p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B]" />
                <h3 className="font-display text-base font-bold">Owner Account Security (Username & Password)</h3>
              </div>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Update the main Owner sign-in username or password. You can also edit any staff member’s password in Staff & Users.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Current Owner Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    Owner Username
                  </label>
                  <input
                    type="text"
                    required
                    value={newOwnerUsername}
                    onChange={(e) => setNewOwnerUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    {t('newPassword')} (optional)
                  </label>
                  <input
                    type="password"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    placeholder="Min 6 chars to change"
                    className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5B6470] dark:text-[#98A2AE] mb-1">
                    {t('confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmOwnerPassword}
                    onChange={(e) => setConfirmOwnerPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 rounded-xl apple-inset text-sm"
                  />
                </div>
              </div>

              {credError && (
                <div className="p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                  {credError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {credSuccess ? (
                  <span className="text-xs font-semibold text-[#0D6E52] dark:text-[#22C58B]">
                    Owner credentials updated.
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={credSaving}
                  className="px-4 py-2.5 min-h-[42px] rounded-2xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] text-white dark:text-[#081310] text-xs font-semibold disabled:opacity-50"
                >
                  {credSaving ? '...' : 'Update Owner Login'}
                </button>
              </div>
            </form>
          )}

          <div className="apple-surface rounded-[26px] p-4 sm:p-6 space-y-4">
            <h3 className="font-display text-base font-bold">Commercial Packaging Kit (.exe + Supabase + Render)</h3>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] leading-relaxed">
              Download these production blueprints to ship a standalone Windows desktop installer (.exe) for the pharmacy owner while hosting the staff portal on Render connected to Supabase.
            </p>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl apple-inset">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">1. Supabase PostgreSQL Schema</p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                    Tables for drugs, staff, transactions, items & automatic low-stock SQL trigger.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile('supabase_schema.sql', SUPABASE_SQL_SCHEMA)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#0D6E52] dark:bg-[#22C58B] text-white dark:text-[#081310] text-xs font-semibold shrink-0 w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  .sql
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl apple-inset">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">2. Windows .exe Desktop Wrapper (Electron)</p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                    Package with electron-builder --win nsis to hand the owner a native desktop app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile('electron-main.cjs', ELECTRON_MAIN_CJS)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold shrink-0 w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  .cjs
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl apple-inset">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">3. Render Staff Portal Hosting Blueprint</p>
                  <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                    Deploy the web portal so pharmacy staff sign in from any counter browser or scan QR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile('render.yaml', RENDER_BLUEPRINT_YAML)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-white dark:bg-[#13161B] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold shrink-0 w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  .yaml
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl apple-inset flex items-center gap-2.5 text-xs text-[#5B6470] dark:text-[#98A2AE]">
              <Phone className="w-4 h-4 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
              <span className="font-medium">{t('supportHelp')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
