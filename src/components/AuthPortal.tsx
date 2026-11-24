import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Eye, EyeOff, Globe, KeyRound, Lock, Moon, Phone, QrCode, Send, ShieldAlert, ShieldCheck, Sun, User, Volume2, VolumeX } from 'lucide-react';
import { api, setAuthToken } from '../lib/api.ts';
import { getTranslator, LANGUAGE_LABELS } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { AuthStatus, AuthUser, Language } from '../types/pharmacy.ts';
import { GuideView } from './GuideView.tsx';
import { YoyaPharmacyEmblem, YoyaWordmark } from './MedicineIcon.tsx';
import { AmbientBackdrop, MagneticButton, StickerImage, UiSticker } from './MotionPrimitives.tsx';

interface AuthPortalProps {
  authStatus: AuthStatus;
  language: Language;
  darkMode: boolean;
  muted: boolean;
  pendingQrPunch: { type: 'clock_in' | 'clock_out'; qrToken: string } | null;
  onChangeLanguage: (lang: Language) => void;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onAuthenticated: (user: AuthUser) => Promise<void>;
  onRefreshStatus: () => void;
}

export function AuthPortal({
  authStatus,
  language,
  darkMode,
  muted,
  pendingQrPunch,
  onChangeLanguage,
  onToggleTheme,
  onToggleMute,
  onAuthenticated,
  onRefreshStatus,
}: AuthPortalProps) {
  const t = getTranslator(language);
  const [forceStaffSignIn, setForceStaffSignIn] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [username, setUsername] = useState(
    !authStatus.ownerClaimed && !authStatus.envPasscodeActive ? 'owner' : ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterPasscode, setMasterPasscode] = useState('');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const isFirstRunOwnerSetup =
    !authStatus.ownerClaimed && !authStatus.envPasscodeActive && !forceStaffSignIn && !recoveryMode;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (recoveryMode) {
        if (password.length < 6) {
          throw new Error('New password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const res = await api.recoverOwnerPassword({
          masterPasscode: masterPasscode.trim(),
          newPassword: password,
          newUsername: recoveryUsername.trim() || undefined,
        });
        setAuthToken(res.token);
        soundEngine.playSaleComplete();
        onRefreshStatus();
        await onAuthenticated(res.user);
      } else if (isFirstRunOwnerSetup) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const res = await api.claimOwner({
          username: username.trim() || 'owner',
          password,
        });
        setAuthToken(res.token);
        soundEngine.playSaleComplete();
        onRefreshStatus();
        await onAuthenticated(res.user);
      } else {
        const res = await api.login(username.trim(), password);
        setAuthToken(res.token);
        soundEngine.playAddToCart();
        await onAuthenticated(res.user);
      }
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen relative flex flex-col overflow-hidden yoya-theme-transition ${
        darkMode
          ? 'bg-gradient-to-br from-[#040816] via-[#091636] to-[#050C22] text-[#F0F6FF]'
          : 'bg-gradient-to-br from-[#E7F0FF] via-[#F5F9FF] to-[#DFECFF] text-[#0F172A]'
      }`}
    >
      <AmbientBackdrop darkMode={darkMode} />

      <header className="relative z-10 flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-4">
        <button
          type="button"
          onClick={() => {
            soundEngine.playTap();
            setGuideOpen(true);
          }}
          className="apple-glass inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-500/15 dark:border-cyan-400/20 text-xs font-semibold shadow-sm transition-transform active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE]" />
          {t('userGuide')}
        </button>

        <div className="apple-glass inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-500/15 dark:border-cyan-400/20 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE]" />
          <select
            value={language}
            onChange={(e) => {
              soundEngine.playTap();
              onChangeLanguage(e.target.value as Language);
            }}
            aria-label="Language"
            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((langKey) => (
              <option
                key={langKey}
                value={langKey}
                className="bg-white dark:bg-[#0B142A] text-[#0F172A] dark:text-[#F0F6FF]"
              >
                {LANGUAGE_LABELS[langKey]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playTap();
            onToggleMute();
          }}
          className="apple-glass p-2 rounded-full border border-blue-500/15 dark:border-cyan-400/20 shadow-sm transition-transform active:scale-95"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE]" />}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playTap();
            onToggleTheme();
          }}
          className="apple-glass inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-500/15 dark:border-cyan-400/20 text-xs font-semibold shadow-sm transition-transform active:scale-95"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={darkMode ? 'sun' : 'moon'}
              initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
              className="inline-flex"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#1464F6]" />
              )}
            </motion.span>
          </AnimatePresence>
          {darkMode ? t('dayMode') : t('nightMode')}
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[430px] apple-surface rounded-[34px] p-6 sm:p-8 overflow-hidden"
        >
          {/* Soft sapphire & cyan glass corner wave accents */}
          <svg
            aria-hidden="true"
            viewBox="0 0 200 180"
            className="pointer-events-none absolute -top-4 -left-4 w-44 h-40 opacity-20 dark:opacity-20"
          >
            <path d="M0 0H180C125 32 72 88 28 165L0 180V0Z" fill="#2589FF" />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 200 140"
            className="pointer-events-none absolute -bottom-2 -right-2 w-48 h-32 opacity-18 dark:opacity-20"
          >
            <path d="M200 140H20C78 96 142 54 200 10V140Z" fill="#06B6D4" />
          </svg>

          <div className="relative z-10 flex flex-col items-center text-center mb-5">
            <div className="flex items-center justify-center gap-3 mb-2">
              <YoyaPharmacyEmblem className="w-16 h-16 drop-shadow-sm" variant={darkMode ? 'white' : 'emerald'} />
              <StickerImage
                asset="capsuleHero"
                alt="3D pharmacy capsule emblem"
                floating
                className="w-16 h-16 rounded-2xl"
              />
            </div>

            <YoyaWordmark
              size="md"
              showTagline
              tone={darkMode ? 'light' : 'dark'}
              customName={authStatus.clinicName}
            />

            <p className="text-base font-bold tracking-tight mt-4 text-[#0F172A] dark:text-[#F0F6FF]">
              {recoveryMode
                ? t('recoverOwnerTitle')
                : isFirstRunOwnerSetup
                  ? t('claimOwnerTitle')
                  : t('welcomeBack')}
            </p>
            <p className="text-xs text-[#526077] dark:text-[#93A8C8] mt-1 max-w-[300px] leading-relaxed">
              {recoveryMode
                ? t('recoverOwnerSub')
                : isFirstRunOwnerSetup
                  ? t('claimOwnerSub')
                  : t('loginSub')}
            </p>
          </div>

          {authStatus.licenseStatus === 'banned' || authStatus.licenseStatus === 'revoked' ? (
            <div className="relative z-10 space-y-4">
              <div className="p-4 rounded-2xl border border-red-300/70 dark:border-red-800/70 bg-red-50/90 dark:bg-red-950/50 text-center space-y-2">
                <ShieldAlert className="w-9 h-9 mx-auto text-red-600 dark:text-red-400" />
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {authStatus.licenseStatus === 'banned' ? t('accountBanned') : t('accountSuspended')}
                </p>
                {authStatus.licenseReason && (
                  <p className="text-xs text-red-700 dark:text-red-300 break-words">
                    {authStatus.licenseReason}
                  </p>
                )}
              </div>
              <div className="px-3 py-3 rounded-2xl apple-inset flex items-center justify-center gap-2 text-xs text-[#0F172A] dark:text-[#F0F6FF] font-semibold">
                <Phone className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
                <span>{t('supportHelp')}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onRefreshStatus();
                }}
                className="w-full py-3 rounded-2xl apple-inset text-xs font-semibold hover:opacity-80"
              >
                Check License Status
              </button>
            </div>
          ) : (
          <>
          {pendingQrPunch && !recoveryMode && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="relative z-10 mb-5 p-3.5 rounded-2xl border border-[#1464F6]/30 dark:border-cyan-400/30 bg-[#1464F6]/10 dark:bg-cyan-500/10 text-xs flex items-center gap-2.5 text-[#1464F6] dark:text-[#22D3EE] font-semibold"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>
                {pendingQrPunch.type === 'clock_in' ? t('clockIn') : t('clockOut')} · {t('signIn')}
              </span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10 space-y-3.5">
            {recoveryMode ? (
              <>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type="password"
                    required
                    value={masterPasscode}
                    onChange={(e) => setMasterPasscode(e.target.value)}
                    autoComplete="off"
                    placeholder={t('masterPasscode')}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-inset text-sm font-mono"
                  />
                </div>

                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type="text"
                    value={recoveryUsername}
                    onChange={(e) => setRecoveryUsername(e.target.value)}
                    autoComplete="username"
                    placeholder={`${t('ownerUsernameLabel')} (optional)`}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-inset text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t('newPassword')}
                    className="w-full pl-11 pr-11 py-3.5 rounded-2xl apple-inset text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526077] dark:text-[#93A8C8] p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t('confirmPassword')}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-inset text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder={isFirstRunOwnerSetup ? t('ownerUsernameLabel') : t('username')}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-inset text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isFirstRunOwnerSetup ? 'new-password' : 'current-password'}
                    placeholder={t('password')}
                    className="w-full pl-11 pr-11 py-3.5 rounded-2xl apple-inset text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526077] dark:text-[#93A8C8] p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isFirstRunOwnerSetup && (
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#1464F6] dark:text-[#22D3EE]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder={t('confirmPassword')}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl apple-inset text-sm"
                    />
                  </div>
                )}
              </>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  className="p-3 rounded-2xl border border-red-300/60 dark:border-red-900/60 bg-red-50/85 dark:bg-red-950/45 text-xs text-red-700 dark:text-red-300 text-center font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <MagneticButton
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 min-h-[48px] rounded-full text-sm font-semibold disabled:opacity-50"
            >
              <span>
                {loading
                  ? '...'
                  : recoveryMode
                    ? t('recoverOwnerBtn')
                    : isFirstRunOwnerSetup
                      ? t('createAccountBtn')
                      : t('signIn')}
              </span>
              {!loading && <Send className="w-3.5 h-3.5" />}
            </MagneticButton>
          </form>

          {/* First-Run Staff Toggle & Owner Forgot Password Recovery */}
          <div className="relative z-10 mt-4 space-y-2">
            {!authStatus.ownerClaimed && !authStatus.envPasscodeActive && !recoveryMode && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setError(null);
                  const next = !forceStaffSignIn;
                  setForceStaffSignIn(next);
                  setUsername(next ? '' : 'owner');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="w-full text-center text-xs font-semibold text-[#1464F6] dark:text-[#22D3EE] hover:underline py-1"
              >
                {forceStaffSignIn
                  ? 'Back to Initial Owner Setup'
                  : 'Already have a Staff or Worker account? Sign In'}
              </button>
            )}

            {authStatus.ownerClaimed && !authStatus.envPasscodeActive && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setError(null);
                  setPassword('');
                  setConfirmPassword('');
                  setMasterPasscode('');
                  setRecoveryUsername('');
                  setRecoveryMode(!recoveryMode);
                }}
                className="w-full text-center text-xs font-semibold text-[#1464F6] dark:text-[#22D3EE] hover:underline py-1"
              >
                {recoveryMode ? t('backToSignIn') : t('forgotPassword')}
              </button>
            )}
          </div>
          </>
          )}

          {/* Secure & Reliable + Support Contact Footer */}
          <div className="relative z-10 mt-5 pt-4 border-t border-blue-500/10 dark:border-cyan-400/12 space-y-3">
            <div className="flex items-center gap-3">
              <UiSticker kind="shield" className="w-9 h-9 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold flex items-center gap-1 text-[#0F172A] dark:text-[#F0F6FF]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  Secure & Reliable
                </p>
                <p className="text-[11px] text-[#526077] dark:text-[#93A8C8] truncate">
                  Your pharmacy sales & stock records are protected
                </p>
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-2xl apple-inset flex items-center justify-center gap-2 text-xs text-[#526077] dark:text-[#93A8C8]">
              <Phone className="w-3.5 h-3.5 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
              <span className="font-medium text-center">{t('supportHelp')}</span>
            </div>
          </div>
        </motion.div>
      </main>

      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 yoya-scroll-contain"
          onClick={() => setGuideOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[90vh] overflow-y-auto yoya-scroll-contain yoya-modal-panel rounded-[28px] p-3 sm:p-5 yoya-canvas border border-blue-500/15 dark:border-cyan-400/20 shadow-2xl"
          >
            <GuideView
              language={language}
              onChangeLanguage={onChangeLanguage}
              clinicName={authStatus.clinicName}
              currencySymbol={authStatus.currencySymbol}
              onClose={() => setGuideOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
