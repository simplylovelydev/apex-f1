"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Tv,
  AlertTriangle,
  ShieldAlert,
  Flag,
  Zap,
  Layers,
} from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface StandingsAndGuidePageProps {
  supportedTeam: ConstructorId;
}

interface DriverStandingRow {
  position: string;
  points: string;
  wins: string;
  driverNumber: number;
  code: string;
  name: string;
  teamId: ConstructorId;
}

interface ConstructorStandingRow {
  position: string;
  points: string;
  wins: string;
  teamId: ConstructorId;
  name: string;
}

const FLAG_GLOSSARY = [
  {
    code: "SC",
    title: "Safety Car (SC)",
    badgeColor: "bg-[#FFD100] text-black",
    desc: "Deployed for major crashes or heavy rain. Physical Bernd Mayländer AMG car leads the pack; overtaking is banned and cars bunch up.",
  },
  {
    code: "VSC",
    title: "Virtual Safety Car (VSC)",
    badgeColor: "bg-amber-500 text-black",
    desc: "Neutralizes the race without a physical car. Drivers must slow by ~35% and stay above a minimum delta time on their steering wheel.",
  },
  {
    code: "YELLOW",
    title: "Yellow / Double Yellow Flag",
    badgeColor: "bg-yellow-400 text-black",
    desc: "Single Yellow: Hazard off-track, slow down, no overtaking. Double Yellow: Hazard blocking track, be prepared to stop immediately.",
  },
  {
    code: "RED",
    title: "Red Flag",
    badgeColor: "bg-[#E10600] text-white",
    desc: "Session suspended due to barrier damage or extreme weather. All cars return to the pit lane; teams can change tyres and repair cars.",
  },
  {
    code: "BLUE",
    title: "Blue Flag",
    badgeColor: "bg-[#3671C6] text-white",
    desc: "Shown to slower backmarkers about to be lapped. Must let the faster lapping car pass within 3 blue flags or receive a 5s penalty.",
  },
  {
    code: "DRS / AERO",
    title: "Active Aero & Overtake Override",
    badgeColor: "bg-[#00D26A] text-black",
    desc: "Within 1.0s at detection, chasing cars open movable wing flaps on straights plus electrical override boost for high-speed passes.",
  },
  {
    code: "TYRES",
    title: "S / M / H Compounds",
    badgeColor: "bg-white text-black",
    desc: "Soft (Red): Fastest grip, wears quick. Medium (Yellow): Balanced race tyre. Hard (White): Durable for long stints. Dry races require 2 compounds.",
  },
  {
    code: "UNDERCUT",
    title: "Undercut vs Overcut",
    badgeColor: "bg-[#B13BFF] text-white",
    desc: "Undercut: Pit earlier for fresh tyres to set rapid out-laps and jump rivals. Overcut: Stay out in clean air while rivals hit traffic.",
  },
];

function mapTeamName(raw: string): ConstructorId {
  const s = raw.toLowerCase();
  if (s.includes("red bull")) return "red_bull";
  if (s.includes("mclaren")) return "mclaren";
  if (s.includes("ferrari")) return "ferrari";
  if (s.includes("mercedes")) return "mercedes";
  if (s.includes("aston")) return "aston_martin";
  if (s.includes("williams")) return "williams";
  if (s.includes("alpine")) return "alpine";
  if (s.includes("haas")) return "haas";
  if (s.includes("rb") || s.includes("racing bulls")) return "rb";
  if (s.includes("audi") || s.includes("sauber")) return "audi";
  return "cadillac";
}

export function StandingsAndGuidePage({
  supportedTeam,
}: StandingsAndGuidePageProps) {
  const activeTeam = F1_TEAMS[supportedTeam];
  const [driverStandings, setDriverStandings] = useState<DriverStandingRow[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<
    ConstructorStandingRow[]
  >([]);
  const [selectedGlossaryIdx, setSelectedGlossaryIdx] = useState<number>(0);

  useEffect(() => {
    async function loadOfficialStandings() {
      try {
        const [dRes, cRes] = await Promise.all([
          fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json"),
          fetch(
            "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json"
          ),
        ]);

        if (dRes.ok) {
          const dJson = await dRes.json();
          const list =
            dJson?.MRData?.StandingsTable?.StandingsLists?.[0]
              ?.DriverStandings || [];
          setDriverStandings(
            list.map(
              (item: {
                position: string;
                points: string;
                wins: string;
                Driver: {
                  permanentNumber?: string;
                  code?: string;
                  givenName: string;
                  familyName: string;
                };
                Constructors: Array<{ name: string }>;
              }) => {
                const rawNum = Number(item.Driver.permanentNumber || 0);
                // Map 2026 champion/number overrides
                const code =
                  item.Driver.code ||
                  item.Driver.familyName.slice(0, 3).toUpperCase();
                const driverNumber =
                  code === "NOR" ? 1 : code === "VER" ? 3 : rawNum;

                return {
                  position: item.position,
                  points: item.points,
                  wins: item.wins,
                  driverNumber,
                  code,
                  name: `${item.Driver.givenName} ${item.Driver.familyName}`,
                  teamId: mapTeamName(item.Constructors?.[0]?.name || ""),
                };
              }
            )
          );
        }

        if (cRes.ok) {
          const cJson = await cRes.json();
          const list =
            cJson?.MRData?.StandingsTable?.StandingsLists?.[0]
              ?.ConstructorStandings || [];
          setConstructorStandings(
            list.map(
              (item: {
                position: string;
                points: string;
                wins: string;
                Constructor: { name: string };
              }) => {
                const teamId = mapTeamName(item.Constructor.name);
                return {
                  position: item.position,
                  points: item.points,
                  wins: item.wins,
                  teamId,
                  name: F1_TEAMS[teamId].shortName,
                };
              }
            )
          );
        }
      } catch {
        // Keep empty state if offline
      }
    }

    loadOfficialStandings();
  }, []);

  const activeRule = FLAG_GLOSSARY[selectedGlossaryIdx];

  return (
    <div className="grid h-full grid-rows-[1fr_auto] gap-3 overflow-hidden">
      {/* TOP HALF: Real Drivers Championship (Left) + Real Constructors Championship (Right) */}
      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Drivers Championship Table */}
        <section className="f1-hud-panel flex min-h-0 flex-col overflow-hidden rounded-md p-4">
          <div className="mb-2.5 flex items-center justify-between border-b border-[#262B38] pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#FFD100]" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                2026 FIA DRIVERS&apos; CHAMPIONSHIP STANDINGS
              </h2>
            </div>
            <span className="font-mono-telemetry text-[10px] font-bold text-emerald-400">
              OFFICIAL JOLPICA-F1 FEED
            </span>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {driverStandings.map((d) => {
              const team = F1_TEAMS[d.teamId];
              return (
                <div
                  key={`${d.position}-${d.code}`}
                  className="flex items-center justify-between rounded border border-[#262B38]/70 bg-[#11151E] px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-mono-telemetry text-xs font-black text-gray-400">
                      {d.position}
                    </span>
                    <span
                      className="h-4 w-1 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <DriverAvatar
                      driverNumber={d.driverNumber}
                      code={d.code}
                      teamId={d.teamId}
                      size="sm"
                    />
                    <div>
                      <div className="text-xs font-black text-white">
                        {d.name}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-gray-400">
                        {team.shortName} • {d.wins}W
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-telemetry text-xs font-black text-[#FFD100]">
                    {d.points} PTS
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Constructors Championship Table */}
        <section className="f1-hud-panel flex min-h-0 flex-col overflow-hidden rounded-md p-4">
          <div className="mb-2.5 flex items-center justify-between border-b border-[#262B38] pb-2">
            <div className="flex items-center gap-2">
              <Layers
                className="h-4 w-4"
                style={{ color: activeTeam.primaryColor }}
              />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                2026 CONSTRUCTORS&apos; CHAMPIONSHIP
              </h2>
            </div>
            <span className="font-mono-telemetry text-[10px] text-gray-400">
              11 TEAMS
            </span>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {constructorStandings.map((c) => {
              const team = F1_TEAMS[c.teamId];
              return (
                <div
                  key={c.teamId}
                  className="flex items-center justify-between rounded border border-[#262B38]/80 bg-[#11151E] px-3 py-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-mono-telemetry text-xs font-black text-gray-400">
                      P{c.position}
                    </span>
                    <span
                      className="h-5 w-1 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <TeamLogo teamId={c.teamId} size="sm" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      {team.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono-telemetry">
                    <span className="text-[10px] text-gray-400">
                      {c.wins} WINS
                    </span>
                    <span className="text-xs font-black text-white">
                      {c.points} PTS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* BOTTOM HALF: How To Watch F1 (India) + Interactive F1 Flags & Race Control Glossary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.45fr]">
        {/* Where to Watch F1 in India */}
        <section className="f1-hud-panel rounded-md p-4">
          <div className="mb-2 flex items-center gap-2 border-b border-[#262B38] pb-2">
            <Tv className="h-4 w-4 text-[#E10600]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              HOW TO WATCH F1 LIVE (INDIA)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded border border-[#262B38] bg-[#11151E] p-2.5">
              <div className="font-black uppercase text-[#FF8000]">
                1. FANCODE APP / WEB
              </div>
              <p className="mt-1 text-[11px] leading-snug text-gray-300">
                Official Indian digital broadcaster. Offers affordable Race Weekend Passes &amp; Season Passes in 1080p 50fps.
              </p>
            </div>
            <div className="rounded border border-[#262B38] bg-[#11151E] p-2.5">
              <div className="font-black uppercase text-[#E10600]">
                2. F1 TV PRO
              </div>
              <p className="mt-1 text-[11px] leading-snug text-gray-300">
                Official F1 platform with all 22 driver onboard cameras, uncensored team radio, and Pit Lane Channel.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Race Control & Flags Decoder */}
        <section className="f1-hud-panel rounded-md p-4">
          <div className="mb-2 flex items-center justify-between border-b border-[#262B38] pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#FFD100]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                F1 RACE CONTROL DECODER // CLICK ANY RULE
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
              <Flag className="h-3 w-3 text-[#00D26A]" />
              SC • VSC • FLAGS • STRATEGY
            </span>
          </div>

          {/* Clickable Rule Pills */}
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {FLAG_GLOSSARY.map((item, idx) => {
              const active = idx === selectedGlossaryIdx;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSelectedGlossaryIdx(idx)}
                  className={`rounded-sm px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                    active
                      ? `${item.badgeColor} scale-105 shadow-md`
                      : "border border-[#262B38] bg-[#131720] text-gray-300 hover:border-gray-500"
                  }`}
                >
                  {item.code}
                </button>
              );
            })}
          </div>

          {/* Active Rule Explanation Box */}
          <div className="flex items-center gap-3 rounded border border-[#262B38] bg-[#10131B] px-3.5 py-2.5">
            <span
              className={`shrink-0 rounded-sm px-2.5 py-1 font-mono-telemetry text-xs font-black uppercase ${activeRule.badgeColor}`}
            >
              {activeRule.code}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-white">
                {activeRule.code === "SC" || activeRule.code === "YELLOW" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#FFD100]" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-[#00D26A]" />
                )}
                {activeRule.title}
              </div>
              <p className="mt-0.5 text-xs text-gray-300">{activeRule.desc}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}