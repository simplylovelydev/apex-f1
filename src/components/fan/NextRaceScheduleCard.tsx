"use client";

import React, { useState, useEffect } from "react";
import { Flag, Radio } from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";

export interface NextRaceData {
  round: string;
  raceName: string;
  circuitName: string;
  locality: string;
  country: string;
  raceStartIso: string;
  sessions: Array<{ name: string; isoTime: string }>;
}

interface NextRaceScheduleCardProps {
  isRaceLive: boolean;
  nextRace: NextRaceData | null;
  supportedTeam: ConstructorId;
}

const SHORT_SESSION_NAMES: Record<string, string> = {
  "PRACTICE 1": "FP1",
  "PRACTICE 2": "FP2",
  "PRACTICE 3": "FP3",
  "SPRINT QUALIFYING": "SQ",
  "SPRINT RACE": "SPRINT",
  QUALIFYING: "QUALI",
  "GRAND PRIX RACE": "RACE",
};

export function NextRaceScheduleCard({
  isRaceLive,
  nextRace,
  supportedTeam,
}: NextRaceScheduleCardProps) {
  const team = F1_TEAMS[supportedTeam];
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!nextRace?.raceStartIso) return;

    const updateTimer = () => {
      const target = new Date(nextRace.raceStartIso).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown("LIGHTS OUT");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setCountdown(`${days}D ${hours}H ${mins}M ${secs}S`);
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [nextRace]);

  if (!nextRace) return null;

  return (
    <section className="f1-hud-panel grid grid-cols-1 items-center gap-3 px-4 py-2.5 xl:grid-cols-[auto_1fr_auto]">
      {/* Left: Round Badge + Grand Prix Title */}
      <div className="flex items-center gap-2.5">
        {isRaceLive ? (
          <span className="inline-flex items-center gap-1 bg-[#E10600] px-2 py-0.5 font-mono-telemetry text-[9px] font-bold tracking-[0.18em] text-white uppercase">
            <Radio className="h-2.5 w-2.5 animate-ping" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono-telemetry text-[9px] font-bold tracking-[0.16em] text-amber-300 uppercase">
            <Flag className="h-2.5 w-2.5" />
            R{nextRace.round}
          </span>
        )}

        <div>
          <h3 className="text-xs font-bold tracking-[0.12em] text-white uppercase">
            {nextRace.raceName}
          </h3>
          <p className="font-mono-telemetry text-[9px] text-white/45 uppercase">
            {nextRace.locality}, {nextRace.country}
          </p>
        </div>
      </div>

      {/* Center: Equal-Width 5-Session IST Grid (Never Wraps) */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {nextRace.sessions.map((session) => {
          const dt = new Date(session.isoTime);
          const isRace = session.name === "GRAND PRIX RACE";
          const shortCode = SHORT_SESSION_NAMES[session.name] || session.name;
          const dayStr = dt.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
          });
          const timeStr = dt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          return (
            <div
              key={session.name}
              className={`border px-2 py-1 font-mono-telemetry text-[9px] ${
                isRace ? "bg-white/[0.07]" : "border-white/10 bg-white/[0.02]"
              }`}
              style={{
                borderColor: isRace ? team.primaryColor : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{shortCode}</span>
                <span className="text-white/45">{dayStr}</span>
              </div>
              <div className="mt-0.5 font-semibold text-amber-300">
                {timeStr}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Lights Out Countdown */}
      <div
        className="border bg-white/[0.03] px-3 py-1 text-right"
        style={{ borderColor: team.primaryColor }}
      >
        <span className="block font-mono-telemetry text-[8px] tracking-[0.18em] text-white/45 uppercase">
          LIGHTS OUT
        </span>
        <span className="font-mono-telemetry text-xs font-bold text-white">
          {countdown || "SYNCING"}
        </span>
      </div>
    </section>
  );
}