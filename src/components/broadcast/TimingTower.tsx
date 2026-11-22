"use client";

import React from "react";
import { motion } from "framer-motion";
import { DriverTimingRow, ConstructorId } from "@/types/f1";

interface TimingTowerProps {
  rows: DriverTimingRow[];
  selectedDriverNumber: number;
  onSelectDriver: (driverNumber: number) => void;
  supportedTeam: ConstructorId;
  gapMode: "interval" | "leader";
  onToggleGapMode: () => void;
}

const TYRE_BADGE: Record<
  DriverTimingRow["tyre"],
  { letter: string; border: string; text: string }
> = {
  SOFT: { letter: "S", border: "border-[#E10600]", text: "text-[#FF4D4D]" },
  MEDIUM: { letter: "M", border: "border-[#FFD100]", text: "text-[#FFD100]" },
  HARD: { letter: "H", border: "border-white/70", text: "text-white" },
  INTER: { letter: "I", border: "border-[#00D26A]", text: "text-[#00D26A]" },
  WET: { letter: "W", border: "border-[#3671C6]", text: "text-[#64C4FF]" },
};

function sectorColorClass(color: DriverTimingRow["sector1Color"]) {
  if (color === "purple") return "bg-[#B13BFF]";
  if (color === "green") return "bg-[#00D26A]";
  if (color === "yellow") return "bg-[#FFD100]";
  return "bg-white/15";
}

export function TimingTower({
  rows,
  selectedDriverNumber,
  onSelectDriver,
  supportedTeam,
  gapMode,
  onToggleGapMode,
}: TimingTowerProps) {
  return (
    <aside className="f1-hud-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#080A0F] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-[#E10600]" />
          <h2 className="font-mono-telemetry text-[10px] font-bold tracking-[0.22em] text-white uppercase">
            TIMING CLASSIFICATION
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggleGapMode}
          className="border border-white/15 bg-white/[0.03] px-2 py-0.5 font-mono-telemetry text-[9px] font-bold tracking-[0.18em] text-white/70 uppercase transition hover:border-white/40 hover:text-white"
        >
          {gapMode === "interval" ? "INT" : "GAP"}
        </button>
      </div>

      <div className="grid grid-cols-[26px_1fr_68px_42px_40px] items-center border-b border-white/10 bg-[#07090D] px-3 py-1.5 font-mono-telemetry text-[9px] font-semibold tracking-[0.16em] text-white/40 uppercase">
        <span>POS</span>
        <span>DRIVER</span>
        <span className="text-right">{gapMode === "interval" ? "INT" : "GAP"}</span>
        <span className="text-center">SEC</span>
        <span className="text-right">TYRE</span>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {rows.map((row) => {
          const isSelected = row.driverNumber === selectedDriverNumber;
          const isSupported = row.teamId === supportedTeam;
          const tyreStyle = TYRE_BADGE[row.tyre];

          return (
            <motion.button
              key={row.driverNumber}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              type="button"
              onClick={() => onSelectDriver(row.driverNumber)}
              className={`grid w-full grid-cols-[26px_1fr_68px_42px_40px] items-center px-3 py-1.5 text-left transition-colors ${
                isSelected
                  ? "bg-white/[0.11]"
                  : isSupported
                  ? "bg-white/[0.04]"
                  : "hover:bg-white/[0.05]"
              }`}
              style={{
                borderLeft: isSelected
                  ? `2px solid ${row.teamColor}`
                  : isSupported
                  ? `2px solid ${row.teamColor}66`
                  : "2px solid transparent",
              }}
            >
              <span
                className={`font-mono-telemetry text-xs font-bold ${
                  row.position <= 3 ? "text-white" : "text-white/50"
                }`}
              >
                {row.position}
              </span>

              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className="h-3.5 w-[3px] shrink-0"
                  style={{ backgroundColor: row.teamColor }}
                />
                <span className="text-xs font-bold tracking-[0.12em] text-white uppercase">
                  {row.code}
                </span>
                {row.drsActive && (
                  <span className="border border-[#00D26A]/50 bg-[#00D26A]/10 px-1 font-mono-telemetry text-[8px] font-bold text-[#00D26A]">
                    DRS
                  </span>
                )}
              </div>

              <span className="text-right font-mono-telemetry text-[11px] font-medium text-white/80">
                {gapMode === "interval" ? row.interval : row.gapToLeader}
              </span>

              <div className="flex items-center justify-center gap-0.5">
                <span className={`h-1.5 w-2 ${sectorColorClass(row.sector1Color)}`} />
                <span className={`h-1.5 w-2 ${sectorColorClass(row.sector2Color)}`} />
                <span className={`h-1.5 w-2 ${sectorColorClass(row.sector3Color)}`} />
              </div>

              <div className="flex items-center justify-end gap-1">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-black ${tyreStyle.border} ${tyreStyle.text}`}
                >
                  {tyreStyle.letter}
                </span>
                <span className="font-mono-telemetry text-[9px] text-white/45">
                  {row.tyreAge}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}