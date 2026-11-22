"use client";

import React from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { AppMode, ConstructorId, F1_TEAMS } from "@/types/f1";
import { TeamLogo } from "@/components/broadcast/F1Media";
import { signInWithGoogle, signOutUser } from "@/lib/supabase/client";

interface ModeSwitcherProps {
  user: User | null;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onReturnToHero: () => void;
  supportedTeam: ConstructorId;
  onOpenTeamPicker: () => void;
  sessionTitle: string;
  feedSource: string;
}

const NAV_TABS: Array<{ id: AppMode; label: string }> = [
  { id: "fan", label: "PITWALL" },
  { id: "fantasy", label: "FANTASY" },
  { id: "predictions", label: "PREDICTIONS" },
  { id: "standings", label: "STANDINGS & GUIDE" },
];

export function ModeSwitcher({
  user,
  mode,
  onModeChange,
  onReturnToHero,
  supportedTeam,
  onOpenTeamPicker,
  sessionTitle,
}: ModeSwitcherProps) {
  const team = F1_TEAMS[supportedTeam];

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-[#050608]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Clickable Apex Signature Logo -> Redirects to Hero Page */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReturnToHero}
            title="Return to Hero Page"
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-80"
          >
            <img
              src="/apex-logo.png"
              alt="Apex"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </button>

          <div className="hidden h-4 w-[1px] bg-white/15 sm:block" />

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">
                PITWALL
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono-telemetry text-[9px] font-semibold tracking-[0.18em] text-[#E10600] uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E10600]" />
                LIVE FEED
              </span>
            </div>
            <p className="max-w-[240px] truncate font-mono-telemetry text-[9px] tracking-[0.14em] text-white/45 uppercase">
              {sessionTitle.replace(/\s*\/\/\s*/g, " • ")}
            </p>
          </div>
        </div>

        {/* Center: Clean Editorial Navigation */}
        <nav
          aria-label="Broadcast Pages"
          className="flex h-full items-center gap-2 sm:gap-5"
        >
          {NAV_TABS.map((tab) => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onModeChange(tab.id)}
                className={`relative flex h-full items-center px-2 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors sm:px-3 ${
                  isActive ? "text-white" : "text-white/45 hover:text-white/85"
                }`}
              >
                <span>{tab.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="activeCinemaTabUnderline"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    className="absolute inset-x-0 bottom-0 h-[2px]"
                    style={{
                      backgroundColor:
                        tab.id === "fantasy" ? "#E10600" : team.primaryColor,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Garage & Google Profile */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenTeamPicker}
            className="flex items-center gap-2 border border-white/15 bg-white/[0.03] px-3 py-1.5 text-left transition hover:border-white/40"
          >
            <TeamLogo teamId={supportedTeam} size="sm" />
            <div className="hidden lg:block">
              <div className="flex items-center gap-1 font-mono-telemetry text-[8px] tracking-[0.2em] text-white/45 uppercase">
                <ShieldCheck
                  className="h-2.5 w-2.5"
                  style={{ color: team.primaryColor }}
                />
                GARAGE
              </div>
              <div className="text-[10px] font-bold tracking-[0.14em] text-white uppercase">
                {team.shortName}
              </div>
            </div>
          </button>

          {!user ? (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 border border-white bg-white px-3.5 py-1.5 text-[10px] font-bold tracking-[0.18em] text-black uppercase transition hover:bg-white/90"
            >
              <LogIn className="h-3 w-3" />
              <span>SIGN IN</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 border border-white/15 bg-white/[0.03] px-2.5 py-1">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full border border-white/20"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center bg-white text-[10px] font-black text-black">
                  {(user.email?.[0] || "F").toUpperCase()}
                </div>
              )}
              <div className="hidden xl:block">
                <div className="max-w-[100px] truncate text-[10px] font-bold tracking-wider text-white uppercase">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </div>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="flex items-center gap-0.5 font-mono-telemetry text-[8px] tracking-[0.18em] text-white/45 uppercase hover:text-[#E10600]"
                >
                  <LogOut className="h-2.5 w-2.5" />
                  SIGN OUT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}