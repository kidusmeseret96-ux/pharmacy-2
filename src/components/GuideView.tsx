import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Globe,
  Info,
  MousePointerClick,
  Phone,
  Search,
  Shield,
  Store,
  UserCheck,
  X,
} from 'lucide-react';
import {
  GUIDE_CATEGORIES,
  GUIDE_UI,
  type GuideCategory,
  type GuideCategoryId,
} from '../lib/guideContent.ts';
import { LANGUAGE_LABELS } from '../lib/i18n.ts';
import { soundEngine } from '../lib/soundEngine.ts';
import type { Language, UserRole } from '../types/pharmacy.ts';
import { GuideDiagram } from './GuideDiagrams.tsx';
import { STICKER_ASSETS, UiSticker } from './MotionPrimitives.tsx';

interface GuideViewProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  userRole?: UserRole;
  clinicName?: string;
  currencySymbol?: string;
  onClose?: () => void;
}

type RoleFilter = 'all' | UserRole;

export function GuideView({
  language,
  onChangeLanguage,
  userRole,
  clinicName = 'YOYA Pharmacy',
  currencySymbol = 'Br',
  onClose,
}: GuideViewProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(userRole ?? 'all');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<GuideCategoryId>(
    userRole === 'seller' ? 'pos_sales' : 'getting_started'
  );
  const [activeStep, setActiveStep] = useState<number | null>(1);

  const formatRolesLine = (roles: UserRole[]) =>
    roles
      .map((r) =>
        r === 'owner'
          ? GUIDE_UI.roleOwner[language]
          : r === 'manager'
            ? GUIDE_UI.roleManager[language]
            : GUIDE_UI.roleSeller[language]
      )
      .join(' · ');

  const visibleCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GUIDE_CATEGORIES.filter((cat) => {
      if (roleFilter !== 'all' && !cat.roles.includes(roleFilter)) {
        return false;
      }
      if (!q) return true;
      const haystacks = [
        cat.title[language],
        cat.subtitle[language],
        cat.title.en,
        ...cat.steps.flatMap((s) => [
          s.title[language],
          s.description[language],
          s.targetButton[language],
          s.tip?.[language] ?? '',
          s.title.en,
          s.targetButton.en,
        ]),
      ];
      return haystacks.some((text) => text.toLowerCase().includes(q));
    });
  }, [roleFilter, search, language]);

  const activeCategory: GuideCategory | null = useMemo(() => {
    if (visibleCategories.length === 0) return null;
    return (
      visibleCategories.find((c) => c.id === selectedCategoryId) ??
      visibleCategories[0]
    );
  }, [visibleCategories, selectedCategoryId]);

  const filteredSteps = useMemo(() => {
    if (!activeCategory) return [];
    const q = search.trim().toLowerCase();
    return activeCategory.steps.filter((step) => {
      if (roleFilter !== 'all' && !step.roles.includes(roleFilter)) {
        return false;
      }
      if (!q) return true;
      const inCatHeader =
        activeCategory.title[language].toLowerCase().includes(q) ||
        activeCategory.subtitle[language].toLowerCase().includes(q);
      if (inCatHeader) return true;
      return (
        step.title[language].toLowerCase().includes(q) ||
        step.description[language].toLowerCase().includes(q) ||
        step.targetButton[language].toLowerCase().includes(q) ||
        (step.tip?.[language] ?? '').toLowerCase().includes(q) ||
        step.title.en.toLowerCase().includes(q) ||
        step.targetButton.en.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, roleFilter, search, language]);

  function handleSelectCategory(id: GuideCategoryId) {
    soundEngine.playTap();
    setSelectedCategoryId(id);
    setActiveStep(1);
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Controls */}
      <div className="apple-surface rounded-[26px] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl yoya-btn-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-balance">
                {GUIDE_UI.pageTitle[language]}
              </h1>
              <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#98A2AE] max-w-3xl leading-relaxed">
                {GUIDE_UI.pageSubtitle[language]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl apple-inset">
              <Globe className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
              <select
                value={language}
                onChange={(e) => {
                  soundEngine.playTap();
                  onChangeLanguage(e.target.value as Language);
                }}
                aria-label="Guide Language"
                className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
              >
                {(['en', 'am', 'om'] as Language[]).map((langKey) => (
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

            {onClose && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl apple-inset text-xs font-semibold hover:opacity-80"
              >
                <X className="w-4 h-4" />
                {GUIDE_UI.closeGuide[language]}
              </button>
            )}
          </div>
        </div>

        {/* Search + Account Role Segmented Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#5B6470] dark:text-[#98A2AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={GUIDE_UI.searchPlaceholder[language]}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl apple-inset text-xs sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Account role filter"
            className="flex flex-wrap items-center gap-1 p-1 rounded-2xl apple-inset shrink-0"
          >
            {(
              [
                { id: 'all', label: GUIDE_UI.roleFilterAll[language] },
                { id: 'owner', label: GUIDE_UI.roleOwner[language] },
                { id: 'manager', label: GUIDE_UI.roleManager[language] },
                { id: 'seller', label: GUIDE_UI.roleSeller[language] },
              ] as { id: RoleFilter; label: string }[]
            ).map((opt) => {
              const active = roleFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    soundEngine.playTap();
                    setRoleFilter(opt.id);
                  }}
                  className={`px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'yoya-btn-primary text-white'
                      : 'text-[#526077] dark:text-[#93A8C8] hover:text-[#0F172A] dark:hover:text-[#F0F6FF]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Account Permissions Summary Matrix */}
      <div className="apple-surface rounded-[24px] p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-sm font-bold text-[#0F172A] dark:text-[#F0F6FF]">
          {GUIDE_UI.roleMatrixTitle[language]}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1">
            <p className="text-xs font-bold flex items-center gap-1.5 text-[#1464F6] dark:text-[#22D3EE]">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              {GUIDE_UI.roleOwner[language]}
            </p>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] leading-relaxed">
              {GUIDE_UI.roleMatrixOwnerDesc[language]}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold flex items-center gap-1.5 text-[#0D6E52] dark:text-[#22C58B]">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              {GUIDE_UI.roleManager[language]}
            </p>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] leading-relaxed">
              {GUIDE_UI.roleMatrixManagerDesc[language]}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold flex items-center gap-1.5 text-[#D97706] dark:text-[#F59E0B]">
              <Store className="w-3.5 h-3.5 shrink-0" />
              {GUIDE_UI.roleSeller[language]}
            </p>
            <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] leading-relaxed">
              {GUIDE_UI.roleMatrixSellerDesc[language]}
            </p>
          </div>
        </div>
      </div>

      {/* Main Handbook Split: Left Categories List + Right Visual Diagram & Steps */}
      {visibleCategories.length === 0 || !activeCategory ? (
        <div className="apple-surface rounded-[26px] p-10 text-center space-y-3">
          <UiSticker kind="shield" className="w-12 h-12 rounded-2xl mx-auto" />
          <h3 className="font-display text-base font-bold">
            {GUIDE_UI.noResultsTitle[language]}
          </h3>
          <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
            {GUIDE_UI.noResultsSub[language]}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl yoya-btn-primary text-xs font-semibold"
          >
            {GUIDE_UI.resetFilters[language]}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Category Selector */}
          <aside className="xl:col-span-4 apple-surface rounded-[26px] p-4 space-y-2">
            <p className="px-2 pb-1 text-xs font-bold text-[#5B6470] dark:text-[#98A2AE]">
              {GUIDE_UI.categoriesHeading[language]}
            </p>
            <div className="space-y-1.5">
              {visibleCategories.map((cat) => {
                const selected = cat.id === activeCategory.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-colors flex items-start gap-3 ${
                      selected
                        ? 'yoya-btn-primary text-white'
                        : 'hover:bg-blue-500/[0.06] dark:hover:bg-cyan-400/[0.08] text-[#0F172A] dark:text-[#F0F6FF]'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                        selected
                          ? 'bg-white/20 text-white'
                          : 'apple-inset text-[#1464F6] dark:text-[#22D3EE]'
                      }`}
                    >
                      {cat.orderLabel}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold leading-snug">
                        {cat.title[language]}
                      </p>
                      <p
                        className={`text-[11px] truncate ${
                          selected
                            ? 'text-white/85'
                            : 'text-[#5B6470] dark:text-[#98A2AE]'
                        }`}
                      >
                        {formatRolesLine(cat.roles)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Category: Hero + Interactive Annotated Diagram + Step Cards */}
          <section className="xl:col-span-8 space-y-5 min-w-0">
            <div className="apple-surface rounded-[26px] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={STICKER_ASSETS[activeCategory.heroAsset]}
                    alt={activeCategory.title[language]}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover border border-black/[0.08] dark:border-white/[0.1] shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-[#5B6470] dark:text-[#98A2AE]">
                      {activeCategory.orderLabel} · {GUIDE_UI.usedByLabel[language]}:{' '}
                      {formatRolesLine(activeCategory.roles)}
                    </p>
                    <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                      {activeCategory.title[language]}
                    </h2>
                    <p className="text-xs text-[#5B6470] dark:text-[#98A2AE] leading-relaxed">
                      {activeCategory.subtitle[language]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Annotated Visual App Diagram with Numbered Arrows */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold">
                      {activeCategory.diagramTitle[language]}
                    </h3>
                    <p className="text-[11px] text-[#5B6470] dark:text-[#98A2AE]">
                      {activeCategory.diagramCaption[language]}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1464F6] dark:text-[#22D3EE]">
                    <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                    {GUIDE_UI.interactiveDiagramHint[language]}
                  </span>
                </div>

                <GuideDiagram
                  categoryId={activeCategory.id}
                  language={language}
                  clinicName={clinicName}
                  currencySymbol={currencySymbol}
                  activeStep={activeStep}
                  onSelectStep={(n) => {
                    soundEngine.playTap();
                    setActiveStep(n);
                  }}
                />
              </div>

              {/* Numbered Step-by-Step Instructions Synced with Arrows */}
              <div className="space-y-3 pt-2">
                {(filteredSteps.length > 0 ? filteredSteps : activeCategory.steps).map((step) => {
                  const isHighlighted = activeStep === step.number;
                  return (
                    <div
                      key={step.number}
                      onMouseEnter={() => setActiveStep(step.number)}
                      onClick={() => {
                        soundEngine.playTap();
                        setActiveStep(step.number);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isHighlighted
                          ? 'border-[#F59E0B] bg-amber-500/[0.06] dark:bg-amber-500/[0.08]'
                          : 'border-black/[0.07] dark:border-white/[0.09] hover:border-[#1464F6]/35 dark:hover:border-cyan-400/35'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-full font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 ${
                            isHighlighted
                              ? 'bg-[#F59E0B] text-[#0F172A]'
                              : 'bg-[#1464F6] dark:bg-[#22D3EE] text-white dark:text-[#04101F]'
                          }`}
                        >
                          {step.number}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="font-display text-sm sm:text-base font-bold">
                              {step.title[language]}
                            </h4>
                            <span className="text-[11px] font-medium text-[#5B6470] dark:text-[#98A2AE]">
                              {formatRolesLine(step.roles)}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#1464F6] dark:text-[#22D3EE]">
                            {GUIDE_UI.buttonLabelPrefix[language]}: {step.targetButton[language]}
                          </p>

                          <p className="text-xs sm:text-sm text-[#374151] dark:text-[#CBD5E1] leading-relaxed">
                            {step.description[language]}
                          </p>

                          {step.tip && (
                            <div className="p-2.5 rounded-xl apple-inset flex items-start gap-2 text-xs text-[#526077] dark:text-[#CBD5E1]">
                              <Info className="w-4 h-4 text-[#D97706] dark:text-[#F59E0B] shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-[#0F172A] dark:text-[#F0F6FF]">
                                  {GUIDE_UI.tipLabel[language]}:{' '}
                                </span>
                                <span>{step.tip[language]}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Helpline Footer */}
            <div className="apple-surface rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#526077] dark:text-[#93A8C8]">
              <Phone className="w-4 h-4 text-[#1464F6] dark:text-[#22D3EE] shrink-0" />
              <span className="font-medium">{GUIDE_UI.helplineBanner[language]}</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
