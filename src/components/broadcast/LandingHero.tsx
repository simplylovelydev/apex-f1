"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { ArrowRight, Check, Lock, Shield, Sparkles } from "lucide-react";
import { AppMode, ConstructorId, F1_TEAMS } from "@/types/f1";
import { signInWithGoogle } from "@/lib/supabase/client";
import { TeamLogo } from "@/components/broadcast/F1Media";

interface LandingHeroProps {
  user: User | null;
  authReady: boolean;
  supportedTeam: ConstructorId;
  onSelectTeam: (teamId: ConstructorId) => Promise<void> | void;
  onLaunchDashboard: (initialMode: AppMode) => void;
  sessionTitle: string;
}

type OnboardingStep = "hero" | "auth" | "team";

export function LandingHero({
  user,
  authReady,
  supportedTeam,
  onSelectTeam,
  onLaunchDashboard,
  sessionTitle,
}: LandingHeroProps) {
  const [step, setStep] = useState<OnboardingStep>("hero");
  const [logoFailed, setLogoFailed] = useState(false);
  const [apexLogoFailed, setApexLogoFailed] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  // Detect return from Google OAuth redirect & advance directly to Team Selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isOAuthCallback =
      window.location.search.includes("code=") ||
      window.location.hash.includes("access_token=") ||
      sessionStorage.getItem("apex_onboarding_step") === "team";

    if (user && isOAuthCallback) {
      sessionStorage.removeItem("apex_onboarding_step");
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setStep("team");
    } else if (user && step === "auth") {
      setStep("team");
    }
  }, [user, step]);

  // Reset onboarding back to Hero stage whenever user signs out
  useEffect(() => {
    if (authReady && !user && step === "team") {
      setStep("hero");
    }
  }, [authReady, user, step]);

  const handleEnterClick = () => {
    if (user) {
      setStep("team");
    } else {
      setStep("auth");
    }
  };

  const handleGoogleAuth = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("apex_onboarding_step", "team");
    }
    await signInWithGoogle();
  };

  const handleConfirmGarage = async () => {
    setSavingTeam(true);
    await onSelectTeam(supportedTeam);
    setSavingTeam(false);
    onLaunchDashboard("fan");
  };

  const activeTeam = F1_TEAMS[supportedTeam];
  const allTeams = Object.values(F1_TEAMS);

  return (
    <div className="relative flex h-screen w-screen flex-col justify-between overflow-hidden bg-[#040507] text-white select-none">
      {/* FULL-BLEED NIGHT RACE CINEMA BACKGROUND */}
      <motion.img
        initial={{ scale: 1.05, opacity: 0.8 }}
        animate={{
          scale: step === "hero" ? 1 : 1.06,
          opacity: step === "hero" ? 1 : 0.35,
        }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        src="/hero-car.jpg"
        alt="Night Race Cinema Backdrop"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* CINEMATIC VIGNETTE OVERLAY */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            step === "hero"
              ? "linear-gradient(180deg, rgba(4, 5, 8, 0.72) 0%, rgba(4, 5, 8, 0.14) 40%, rgba(4, 5, 8, 0.25) 68%, rgba(4, 5, 8, 0.92) 100%)"
              : "radial-gradient(circle at 50% 45%, rgba(6, 8, 12, 0.84) 0%, rgba(4, 5, 8, 0.97) 100%)",
        }}
      />

      {/* TOP EDITORIAL HEADER BAR WITH APEX SIGNATURE LOGO */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-6 sm:px-12 sm:pt-8">
        <button
          type="button"
          onClick={() => setStep("hero")}
          className="flex items-center gap-3.5 text-left transition-opacity hover:opacity-85"
        >
          {!apexLogoFailed ? (
            <img
              src="/apex-logo.png"
              alt="Apex"
              onError={() => setApexLogoFailed(true)}
              className="h-10 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:h-12"
            />
          ) : (
            <span className="text-base font-bold tracking-[0.26em] text-white uppercase">
              APEX
            </span>
          )}
          <div className="hidden h-5 w-[1px] bg-white/20 sm:block" />
          <div className="hidden sm:block">
            <div className="text-[11px] font-semibold tracking-[0.24em] text-white/90 uppercase">
              PITWALL • FIA TELEMETRY
            </div>
            <div className="mt-0.5 font-mono-telemetry text-[10px] tracking-[0.16em] text-white/45 uppercase">
              {sessionTitle.replace(/\s*\/\/\s*/g, " • ")}
            </div>
          </div>
        </button>

        {/* Minimal Onboarding Step Indicator */}
        <div className="hidden items-center gap-5 text-[10px] font-semibold tracking-[0.22em] uppercase md:flex">
          <span className={step === "hero" ? "text-white" : "text-white/35"}>
            01 • PREVIEW
          </span>
          <span className="text-white/20">—</span>
          <span className={step === "auth" ? "text-white" : "text-white/35"}>
            02 • PADDOCK PASS
          </span>
          <span className="text-white/20">—</span>
          <span className={step === "team" ? "text-white" : "text-white/35"}>
            03 • GARAGE
          </span>
        </div>

        <div className="text-right text-[11px] font-normal leading-snug tracking-wide text-white/75 sm:text-xs">
          <div>Reimagining Formula One</div>
          <div className="text-white/45">second-screen experience</div>
        </div>
      </header>

      {/* CENTER STAGE */}
      <main className="relative z-20 flex min-h-0 flex-1 items-center justify-center px-4 sm:px-10">
        <AnimatePresence mode="wait">
          {/* STAGE 1: CINEMA HERO */}
          {step === "hero" && (
            <motion.div
              key="stage-hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className="pointer-events-none absolute -inset-x-28 -inset-y-16 rounded-full blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0) 78%)",
                  }}
                />
                {!logoFailed ? (
                  <img
                    src="/logo.png"
                    alt="Formula 1"
                    onError={() => setLogoFailed(true)}
                    className="relative z-10 w-[260px] max-w-[72vw] object-contain sm:w-[400px] md:w-[470px]"
                    style={{
                      filter:
                        "drop-shadow(0 16px 34px rgba(0, 0, 0, 0.98)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.95))",
                    }}
                  />
                ) : (
                  <span className="relative z-10 text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.95)]">
                    F1
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* STAGE 2: PADDOCK PASS LOGIN */}
          {step === "auth" && (
            <motion.div
              key="stage-auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-md border border-white/15 bg-[#080A0F]/95 p-8 shadow-[0_32px_64px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-mono-telemetry text-[10px] font-semibold tracking-[0.25em] text-white/50 uppercase">
                  STEP 01 • CREDENTIAL CHECK
                </span>
                <Lock className="h-3.5 w-3.5 text-[#E10600]" />
              </div>

              <h2 className="mt-6 text-2xl font-light tracking-[0.06em] text-white uppercase sm:text-3xl">
                PADDOCK <span className="font-bold">CLEARANCE</span>
              </h2>
              <p className="mt-2.5 text-xs leading-relaxed text-white/60">
                Authenticate with your Google account to sync your constructor
                garage, lock race weekend predictions, and enter the private
                friends championship.
              </p>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="group flex w-full items-center justify-between border border-white bg-white px-5 py-3.5 text-xs font-bold tracking-[0.2em] text-black uppercase transition hover:bg-white/90"
                >
                  <span className="flex items-center gap-3">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
                      />
                    </svg>
                    CONTINUE WITH GOOGLE
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep("hero")}
                  className="w-full border border-white/10 bg-transparent py-2.5 text-[10px] font-semibold tracking-[0.22em] text-white/45 uppercase transition hover:border-white/25 hover:text-white/80"
                >
                  ← RETURN TO TITLE
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: CONSTRUCTOR GARAGE SELECTION */}
          {step === "team" && (
            <motion.div
              key="stage-team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
              className="flex max-h-[78vh] w-full max-w-5xl flex-col border border-white/15 bg-[#080A0F]/95 p-6 shadow-[0_32px_64px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono-telemetry text-[10px] font-semibold tracking-[0.25em] text-white/50 uppercase">
                    <Shield
                      className="h-3.5 w-3.5"
                      style={{ color: activeTeam.primaryColor }}
                    />
                    STEP 02 • CONSTRUCTOR ALLEGIANCE
                  </div>
                  <h2 className="mt-1.5 text-2xl font-light tracking-[0.06em] text-white uppercase sm:text-3xl">
                    SELECT YOUR <span className="font-bold">GARAGE</span>
                  </h2>
                </div>

                {user && (
                  <div className="flex items-center gap-2.5 border border-white/10 bg-white/[0.03] px-3 py-1.5">
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Driver"
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <div className="text-left">
                      <div className="text-[10px] font-bold tracking-wider text-white uppercase">
                        {user.user_metadata?.full_name || user.email}
                      </div>
                      <div className="font-mono-telemetry text-[9px] tracking-widest text-emerald-400 uppercase">
                        PASS VERIFIED
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="my-5 grid flex-1 grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {allTeams.map((team) => {
                  const isSelected = team.id === supportedTeam;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => onSelectTeam(team.id)}
                      className={`group relative flex items-center justify-between border p-3.5 text-left transition-all ${
                        isSelected
                          ? "bg-white/[0.08]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                      }`}
                      style={{
                        borderColor: isSelected ? team.primaryColor : undefined,
                      }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-1 transition-all"
                        style={{
                          backgroundColor: team.primaryColor,
                          opacity: isSelected ? 1 : 0.45,
                        }}
                      />

                      <div className="flex items-center gap-3 pl-2">
                        <TeamLogo teamId={team.id} size="md" />
                        <div>
                          <div className="text-xs font-bold tracking-[0.12em] text-white uppercase">
                            {team.shortName}
                          </div>
                          <div className="mt-0.5 font-mono-telemetry text-[10px] text-white/50">
                            #{team.driverNumbers[0]} {team.drivers[0].split(" ")[1]} • #
                            {team.driverNumbers[1]} {team.drivers[1].split(" ")[1]}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className="flex h-5 w-5 items-center justify-center text-black"
                          style={{ backgroundColor: team.primaryColor }}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                <div className="flex items-center gap-3">
                  <TeamLogo teamId={supportedTeam} size="md" />
                  <div>
                    <div className="font-mono-telemetry text-[9px] tracking-[0.2em] text-white/45 uppercase">
                      SELECTED TELEMETRY LIVERY
                    </div>
                    <div className="text-sm font-bold tracking-wider text-white uppercase">
                      {activeTeam.name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingTeam}
                  onClick={handleConfirmGarage}
                  className="group flex items-center gap-3 px-7 py-3.5 text-xs font-bold tracking-[0.2em] text-white uppercase transition hover:opacity-90"
                  style={{ backgroundColor: activeTeam.primaryColor }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {savingTeam ? "LOCKING GARAGE..." : "ENTER PITWALL"}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM MINIMAL STUDIO FOOTER */}
      <footer className="relative z-20 flex items-center justify-between px-6 pb-6 sm:px-12 sm:pb-8">
        <div className="font-mono-telemetry text-[10px] tracking-[0.22em] text-white/45 uppercase">
          2026 FIA FORMULA ONE WORLD CHAMPIONSHIP
        </div>

        {step === "hero" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            type="button"
            disabled={!authReady}
            onClick={handleEnterClick}
            className="group flex items-center gap-3 border border-white bg-white px-7 py-3.5 text-xs font-bold tracking-[0.22em] text-black uppercase shadow-[0_0_40px_rgba(255,255,255,0.2)] transition hover:bg-white/90 disabled:opacity-60"
          >
            <span>
              {!authReady
                ? "VERIFYING..."
                : user
                ? "SELECT GARAGE"
                : "ENTER PADDOCK"}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        )}
      </footer>
    </div>
  );
}