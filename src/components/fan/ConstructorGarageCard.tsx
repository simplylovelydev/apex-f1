"use client";

import React from "react";
import { ArrowRightLeft, Gauge } from "lucide-react";
import { ConstructorId, DriverTimingRow, F1_TEAMS } from "@/types/f1";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface ConstructorGarageCardProps {
  supportedTeam: ConstructorId;
  standings: DriverTimingRow[];
  selectedDriverNumber: number;
  onSelectDriver: (driverNumber: number) => void;
  onOpenTeamPicker: () => void;
}

export function ConstructorGarageCard({
  supportedTeam,
  standings,
  selectedDriverNumber,
  onSelectDriver,
  onOpenTeamPicker,
}: ConstructorGarageCardProps) {
  const team = F1_TEAMS[supportedTeam];
  const teamDrivers = standings.filter((d) => d.teamId === supportedTeam);

  return (
    <section className="f1-hud-panel p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <TeamLogo teamId={supportedTeam} size="sm" />
          <div>
            <span className="block font-mono-telemetry text-[8px] tracking-[0.2em] text-white/45 uppercase">
              CONSTRUCTOR GARAGE
            </span>
            <h3 className="text-xs font-bold tracking-[0.12em] text-white uppercase">
              {team.name}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTeamPicker}
          className="inline-flex items-center gap-1 border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono-telemetry text-[9px] font-semibold tracking-[0.16em] text-white/75 uppercase transition hover:border-white/40 hover:text-white"
        >
          <ArrowRightLeft className="h-2.5 w-2.5" />
          SWITCH
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {teamDrivers.map((driver) => {
          const isFocused = driver.driverNumber === selectedDriverNumber;
          return (
            <button
              key={driver.driverNumber}
              type="button"
              onClick={() => onSelectDriver(driver.driverNumber)}
              className={`border p-2.5 text-left transition-all ${
                isFocused
                  ? "bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/30"
              }`}
              style={{
                borderColor: isFocused ? team.primaryColor : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DriverAvatar
                    driverNumber={driver.driverNumber}
                    code={driver.code}
                    teamId={driver.teamId}
                    size="sm"
                  />
                  <div>
                    <span className="font-mono-telemetry text-[9px] font-bold text-white/60">
                      #{driver.driverNumber}
                    </span>
                    <div className="text-[11px] font-bold tracking-wider text-white uppercase">
                      {driver.fullName}
                    </div>
                  </div>
                </div>

                <span className="font-mono-telemetry text-sm font-light text-white">
                  P{driver.position}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 font-mono-telemetry text-[9px]">
                <span className="text-white/60">
                  {driver.tyre} ({driver.tyreAge}L)
                </span>
                <span
                  className="inline-flex items-center gap-1 font-bold"
                  style={{
                    color: isFocused
                      ? team.primaryColor
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  <Gauge className="h-2.5 w-2.5" />
                  {isFocused ? "LOCKED" : "INSPECT"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}