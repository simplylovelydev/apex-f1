"use client";

import React from "react";
import { motion } from "framer-motion";
import { CarTelemetrySnapshot, DriverTimingRow, F1_TEAMS } from "@/types/f1";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface HaloHudProps {
  driver: DriverTimingRow;
  telemetry: CarTelemetrySnapshot;
}

export function HaloHud({ driver, telemetry }: HaloHudProps) {
  const team = F1_TEAMS[driver.teamId];
  const isDrsOpen = telemetry.drs >= 10;

  const radius = 110;
  const semiCircumference = Math.PI * radius;
  const safeThrottle = Math.min(100, Math.max(0, telemetry.throttle));
  const safeBrake = Math.min(100, Math.max(0, telemetry.brake));
  const throttleOffset =
    semiCircumference - (safeThrottle / 100) * semiCircumference;
  const rpmPct = Math.min(100, Math.round((telemetry.rpm / 12500) * 100));

  return (
    <section className="f1-hud-panel f1-cut-corner relative overflow-hidden p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3.5">
          <DriverAvatar
            driverNumber={driver.driverNumber}
            code={driver.code}
            teamId={driver.teamId}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-1.5 py-0.5 font-mono-telemetry text-[11px] font-bold text-white"
                style={{ backgroundColor: team.primaryColor }}
              >
                #{driver.driverNumber}
              </span>
              <span className="text-lg font-light tracking-[0.08em] text-white uppercase">
                {driver.fullName.split(" ")[0]}{" "}
                <strong className="font-bold">
                  {driver.fullName.split(" ").slice(1).join(" ")}
                </strong>
              </span>
              <span className="border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono-telemetry text-[11px] font-semibold text-white/80">
                P{driver.position}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono-telemetry text-[10px] tracking-[0.16em] text-white/50 uppercase">
              <TeamLogo teamId={driver.teamId} size="sm" />
              <span>
                {team.name} // {driver.lastLap}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`border px-3 py-1 font-mono-telemetry text-[10px] font-bold tracking-[0.22em] uppercase ${
            isDrsOpen
              ? "border-[#00D26A] bg-[#00D26A]/15 text-[#00D26A]"
              : "border-white/15 bg-white/[0.02] text-white/40"
          }`}
        >
          {isDrsOpen ? "DRS ACTIVE" : "DRS STANDBY"}
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative mx-auto flex w-full max-w-[300px] flex-col items-center justify-center pt-2">
          <svg
            viewBox="0 0 260 155"
            className="w-full overflow-visible"
            aria-label="F1 Halo Telemetry Gauge"
          >
            <path
              d="M 20 135 A 110 110 0 0 1 240 135"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            <motion.path
              d="M 20 135 A 110 110 0 0 1 240 135"
              fill="none"
              stroke="#00D26A"
              strokeWidth="12"
              strokeDasharray={semiCircumference}
              animate={{ strokeDashoffset: throttleOffset }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />

            <path
              d="M 42 135 A 88 88 0 0 1 218 135"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <motion.path
              d="M 42 135 A 88 88 0 0 1 218 135"
              fill="none"
              stroke="#E10600"
              strokeWidth="8"
              strokeDasharray={Math.PI * 88}
              animate={{
                strokeDashoffset:
                  Math.PI * 88 - (safeBrake / 100) * (Math.PI * 88),
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />

            <line
              x1="130"
              y1="25"
              x2="130"
              y2="52"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
          </svg>

          <div className="-mt-20 flex flex-col items-center text-center">
            <span className="font-mono-telemetry text-5xl font-light tracking-tight text-white">
              {telemetry.speed}
            </span>
            <span className="font-mono-telemetry text-[10px] font-semibold tracking-[0.28em] text-white/45 uppercase">
              KM/H
            </span>

            <div className="mt-3 flex items-center gap-2">
              <div className="border border-white/10 bg-white/[0.03] px-3 py-1">
                <span className="block font-mono-telemetry text-[8px] tracking-[0.2em] text-white/40 uppercase">
                  GEAR
                </span>
                <span className="font-mono-telemetry text-base font-bold text-white">
                  {telemetry.gear === 0 ? "N" : telemetry.gear}
                </span>
              </div>
              <div className="border border-white/10 bg-white/[0.03] px-3 py-1">
                <span className="block font-mono-telemetry text-[8px] tracking-[0.2em] text-white/40 uppercase">
                  RPM
                </span>
                <span className="font-mono-telemetry text-base font-bold text-white">
                  {telemetry.rpm.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between font-mono-telemetry text-[10px] font-semibold tracking-[0.2em] uppercase">
              <span className="text-white/50">THROTTLE</span>
              <span className="text-[#00D26A]">{safeThrottle}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10">
              <motion.div
                className="h-full bg-[#00D26A]"
                animate={{ width: `${safeThrottle}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between font-mono-telemetry text-[10px] font-semibold tracking-[0.2em] uppercase">
              <span className="text-white/50">BRAKE</span>
              <span className="text-[#E10600]">{safeBrake}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10">
              <motion.div
                className="h-full bg-[#E10600]"
                animate={{ width: `${safeBrake}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between font-mono-telemetry text-[9px] font-semibold tracking-[0.2em] text-white/45 uppercase">
              <span>REV LIMITER</span>
              <span>{rpmPct}%</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, idx) => {
                const threshold = ((idx + 1) / 12) * 100;
                const lit = rpmPct >= threshold;
                const ledColor =
                  idx < 4
                    ? "bg-[#00D26A]"
                    : idx < 8
                    ? "bg-[#E10600]"
                    : "bg-[#B13BFF]";
                return (
                  <div
                    key={idx}
                    className={`h-2 transition-opacity ${
                      lit ? `${ledColor} opacity-100` : "bg-white/10 opacity-40"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}