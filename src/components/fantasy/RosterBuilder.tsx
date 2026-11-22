"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import {
  Trophy,
  Zap,
  Plus,
  Check,
  RefreshCw,
  LogIn,
  LogOut,
  Users,
  DollarSign,
  Crown,
} from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";
import { supabase, signInWithGoogle, signOutUser } from "@/lib/supabase/client";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface RosterBuilderProps {
  user: User | null;
}

interface DriverMarketItem {
  driverNumber: number;
  code: string;
  name: string;
  teamId: ConstructorId;
  price: number;
}

const DRIVER_MARKET: DriverMarketItem[] = [
  { driverNumber: 3, code: "VER", name: "Max Verstappen", teamId: "red_bull", price: 29.5 },
  { driverNumber: 1, code: "NOR", name: "Lando Norris", teamId: "mclaren", price: 28.5 },
  { driverNumber: 16, code: "LEC", name: "Charles Leclerc", teamId: "ferrari", price: 26.0 },
  { driverNumber: 44, code: "HAM", name: "Lewis Hamilton", teamId: "ferrari", price: 25.0 },
  { driverNumber: 81, code: "PIA", name: "Oscar Piastri", teamId: "mclaren", price: 24.5 },
  { driverNumber: 63, code: "RUS", name: "George Russell", teamId: "mercedes", price: 22.0 },
  { driverNumber: 6, code: "HAD", name: "Isack Hadjar", teamId: "red_bull", price: 18.5 },
  { driverNumber: 12, code: "ANT", name: "Kimi Antonelli", teamId: "mercedes", price: 17.5 },
  { driverNumber: 14, code: "ALO", name: "Fernando Alonso", teamId: "aston_martin", price: 16.0 },
  { driverNumber: 55, code: "SAI", name: "Carlos Sainz", teamId: "williams", price: 15.5 },
  { driverNumber: 23, code: "ALB", name: "Alexander Albon", teamId: "williams", price: 13.0 },
  { driverNumber: 10, code: "GAS", name: "Pierre Gasly", teamId: "alpine", price: 12.0 },
  { driverNumber: 30, code: "LAW", name: "Liam Lawson", teamId: "rb", price: 11.5 },
  { driverNumber: 27, code: "HUL", name: "Nico Hulkenberg", teamId: "audi", price: 10.5 },
  { driverNumber: 87, code: "BEA", name: "Oliver Bearman", teamId: "haas", price: 10.0 },
  { driverNumber: 11, code: "PER", name: "Sergio Perez", teamId: "cadillac", price: 10.0 },
  { driverNumber: 43, code: "COL", name: "Franco Colapinto", teamId: "alpine", price: 9.5 },
  { driverNumber: 41, code: "LIN", name: "Arvid Lindblad", teamId: "rb", price: 9.0 },
  { driverNumber: 31, code: "OCO", name: "Esteban Ocon", teamId: "haas", price: 9.0 },
  { driverNumber: 18, code: "STR", name: "Lance Stroll", teamId: "aston_martin", price: 8.5 },
  { driverNumber: 5, code: "BOR", name: "Gabriel Bortoleto", teamId: "audi", price: 8.0 },
  { driverNumber: 77, code: "BOT", name: "Valtteri Bottas", teamId: "cadillac", price: 8.0 },
];

const CONSTRUCTOR_PRICES: Record<ConstructorId, number> = {
  mclaren: 26.5,
  red_bull: 26.0,
  ferrari: 25.5,
  mercedes: 21.0,
  aston_martin: 14.5,
  williams: 13.5,
  alpine: 11.0,
  rb: 10.5,
  haas: 9.5,
  audi: 9.0,
  cadillac: 8.5,
};

const BUDGET_CAP = 100.0;

interface LeaderboardEntry {
  user_id: string;
  squad_name: string;
  driver_numbers: number[];
  constructor_ids: ConstructorId[];
  captain_driver: number;
  total_points: number;
  last_race_points: number;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function RosterBuilder({ user }: RosterBuilderProps) {
  const [squadName, setSquadName] = useState("Apex Scuderia");
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([3, 81, 30, 41, 43]);
  const [selectedConstructors, setSelectedConstructors] = useState<ConstructorId[]>([
    "red_bull",
    "rb",
  ]);
  const [captainDriver, setCaptainDriver] = useState<number>(3);

  // Real-Life FIA Points State from /api/fantasy/sync
  const [realDriverScores, setRealDriverScores] = useState<
    Record<number, { totalWeekendPoints: number; racePoints: number }>
  >({});
  const [realConstructorScores, setRealConstructorScores] = useState<
    Record<string, number>
  >({});
  const [raceLabel, setRaceLabel] = useState("Syncing Real FIA Results...");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Calculate Spend & Remaining Budget
  const driversCost = selectedDrivers.reduce((sum, num) => {
    const item = DRIVER_MARKET.find((d) => d.driverNumber === num);
    return sum + (item?.price || 0);
  }, 0);

  const constructorsCost = selectedConstructors.reduce(
    (sum, id) => sum + (CONSTRUCTOR_PRICES[id] || 0),
    0
  );

  const totalCost = Number((driversCost + constructorsCost).toFixed(1));
  const remainingBudget = Number((BUDGET_CAP - totalCost).toFixed(1));

  // Calculate Real-Life Squad Points
  const liveSquadPoints = (() => {
    let pts = 0;
    for (const num of selectedDrivers) {
      const base = realDriverScores[num]?.totalWeekendPoints ?? 0;
      pts += num === captainDriver ? base * 2 : base;
    }
    for (const cId of selectedConstructors) {
      pts += realConstructorScores[cId] ?? 0;
    }
    return pts;
  })();

  const fetchRealWorldPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/fantasy/sync");
      if (!res.ok) return;
      const data = await res.json();
      if (data.driverScores) setRealDriverScores(data.driverScores);
      if (data.constructorTotals) setRealConstructorScores(data.constructorTotals);
      if (data.raceName) setRaceLabel(`${data.raceName} (${data.source})`);
    } catch {
      // Keep cached points
    }
  }, []);

  const loadLeaderboardAndUserRoster = useCallback(async () => {
    if (!supabase) return;

    const { data: rows } = await supabase
      .from("fantasy_rosters")
      .select(
        "user_id, squad_name, driver_numbers, constructor_ids, captain_driver, total_points, last_race_points, profiles(full_name, avatar_url)"
      )
      .order("total_points", { ascending: false });

    if (rows) {
      setLeaderboard(rows as unknown as LeaderboardEntry[]);
      if (user) {
        const mine = rows.find((r) => r.user_id === user.id);
        if (mine) {
          setSquadName(mine.squad_name);
          setSelectedDrivers(mine.driver_numbers);
          setSelectedConstructors(mine.constructor_ids as ConstructorId[]);
          setCaptainDriver(mine.captain_driver);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    fetchRealWorldPoints();
    loadLeaderboardAndUserRoster();
  }, [fetchRealWorldPoints, loadLeaderboardAndUserRoster]);

  const toggleDriver = (num: number) => {
    if (selectedDrivers.includes(num)) {
      const next = selectedDrivers.filter((d) => d !== num);
      setSelectedDrivers(next);
      if (captainDriver === num && next.length > 0) {
        setCaptainDriver(next[0]);
      }
      return;
    }
    if (selectedDrivers.length >= 5) return;
    const next = [...selectedDrivers, num];
    setSelectedDrivers(next);
    if (next.length === 1) setCaptainDriver(num);
  };

  const toggleConstructor = (id: ConstructorId) => {
    if (selectedConstructors.includes(id)) {
      setSelectedConstructors(selectedConstructors.filter((c) => c !== id));
      return;
    }
    if (selectedConstructors.length >= 2) return;
    setSelectedConstructors([...selectedConstructors, id]);
  };

  const handleSaveSquad = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (
      selectedDrivers.length !== 5 ||
      selectedConstructors.length !== 2 ||
      remainingBudget < 0
    ) {
      setStatusMsg("Select 5 Drivers, 2 Constructors, and stay under $100.0M.");
      return;
    }

    setSaving(true);
    if (supabase) {
      await supabase.from("fantasy_rosters").upsert({
        user_id: user.id,
        squad_name: squadName.trim() || "Apex Racing",
        driver_numbers: selectedDrivers,
        constructor_ids: selectedConstructors,
        captain_driver: captainDriver,
        budget_remaining: remainingBudget,
        total_points: liveSquadPoints,
        last_race_points: liveSquadPoints,
        updated_at: new Date().toISOString(),
      });
      await loadLeaderboardAndUserRoster();
    }
    setSaving(false);
    setStatusMsg("Squad & Real-Life FIA Points synced to Friends Leaderboard!");
    setTimeout(() => setStatusMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Auth & Real-Life Points Banner */}
      <div className="f1-hud-panel f1-cut-corner flex flex-wrap items-center justify-between gap-4 rounded-md p-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#FF4D4D]">
            <Trophy className="h-3.5 w-3.5" />
            REAL-LIFE FIA CHAMPIONSHIP SCORING // {raceLabel}
          </div>
          <h2 className="mt-1 text-xl font-black uppercase tracking-wider text-white">
            PRIVATE FRIENDS FANTASY LEAGUE
          </h2>
          <p className="text-xs text-gray-400">
            Zero arcade simulation—your drivers earn their exact real-world Grand Prix points, overtakes gained, and fastest lap bonuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchRealWorldPoints}
            className="inline-flex items-center gap-1.5 rounded border border-[#262B38] bg-[#141822] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync FIA Points
          </button>

          {!user ? (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 rounded-sm bg-[#E10600] px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(225,6,0,0.45)] transition hover:bg-[#ff1912]"
            >
              <LogIn className="h-4 w-4" />
              Sign In With Google
            </button>
          ) : (
            <div className="flex items-center gap-2.5 rounded border border-[#262B38] bg-[#141822] px-3 py-1.5">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="h-7 w-7 rounded-full border border-white/20"
                />
              )}
              <div className="text-left">
                <div className="text-xs font-black text-white">
                  {user.user_metadata?.full_name || "Friend"}
                </div>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 hover:text-red-400"
                >
                  <LogOut className="h-2.5 w-2.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Split: Squad Garage & Market (Left) + Friends Leaderboard (Right) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        {/* Left: Squad Builder */}
        <div className="space-y-6">
          {/* Active Squad Garage Summary */}
          <div className="f1-hud-panel rounded-md p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#262B38] pb-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  placeholder="Enter Squad Name..."
                  className="rounded border border-[#262B38] bg-[#121620] px-3 py-1.5 text-sm font-black uppercase tracking-wider text-white outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="flex items-center gap-4 font-mono-telemetry">
                <div className="text-right">
                  <span className="block text-[9px] font-bold uppercase text-gray-500">
                    REMAINING CAP
                  </span>
                  <span
                    className={`inline-flex items-center text-sm font-black ${
                      remainingBudget < 0 ? "text-red-500" : "text-[#00D26A]"
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {remainingBudget.toFixed(1)}M
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[9px] font-bold uppercase text-gray-500">
                    REAL FIA PTS
                  </span>
                  <span className="text-lg font-black text-[#FFD100]">
                    {liveSquadPoints} PTS
                  </span>
                </div>
              </div>
            </div>

            {/* 5 Selected Driver Slots */}
            <div className="mb-3 text-[11px] font-black uppercase tracking-wider text-gray-400">
              ACTIVE DRIVERS ({selectedDrivers.length}/5) — CLICK CROWN FOR 2X DRS BOOST
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, idx) => {
                const num = selectedDrivers[idx];
                const d = DRIVER_MARKET.find((item) => item.driverNumber === num);
                if (!d) {
                  return (
                    <div
                      key={idx}
                      className="flex h-32 flex-col items-center justify-center rounded border border-dashed border-[#262B38] bg-[#10131B] text-xs font-bold text-gray-600"
                    >
                      <Plus className="mb-1 h-4 w-4" />
                      DRIVER {idx + 1}
                    </div>
                  );
                }

                const isCaptain = d.driverNumber === captainDriver;
                const realPts = realDriverScores[d.driverNumber]?.totalWeekendPoints ?? 0;

                return (
                  <div
                    key={d.driverNumber}
                    className={`relative flex flex-col justify-between rounded border p-2.5 ${
                      isCaptain
                        ? "border-[#FFD100] bg-[#1E1C14]"
                        : "border-[#262B38] bg-[#141822]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <DriverAvatar
                        driverNumber={d.driverNumber}
                        code={d.code}
                        teamId={d.teamId}
                        size="md"
                      />
                      <button
                        type="button"
                        onClick={() => setCaptainDriver(d.driverNumber)}
                        title="Set 2x DRS Boost Captain"
                        className={`rounded p-1 transition ${
                          isCaptain
                            ? "bg-[#FFD100] text-black"
                            : "bg-white/5 text-gray-400 hover:text-white"
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{d.code}</span>
                        <span className="font-mono-telemetry text-[10px] font-bold text-[#00D26A]">
                          +{isCaptain ? realPts * 2 : realPts}p
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono-telemetry text-[10px] text-gray-400">
                        <span>${d.price}M</span>
                        {isCaptain && (
                          <span className="font-black text-[#FFD100]">2X DRS</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2 Selected Constructor Slots */}
            <div className="mt-4 mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
              CONSTRUCTORS ({selectedConstructors.length}/2)
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, idx) => {
                const cId = selectedConstructors[idx];
                if (!cId) {
                  return (
                    <div
                      key={idx}
                      className="flex h-14 items-center justify-center rounded border border-dashed border-[#262B38] bg-[#10131B] text-xs font-bold text-gray-600"
                    >
                      + SELECT CONSTRUCTOR {idx + 1}
                    </div>
                  );
                }
                const team = F1_TEAMS[cId];
                const cPts = realConstructorScores[cId] ?? 0;
                return (
                  <div
                    key={cId}
                    className="flex items-center justify-between rounded border bg-[#141822] px-3.5 py-2.5"
                    style={{ borderColor: team.primaryColor }}
                  >
                    <div className="flex items-center gap-2.5">
                      <TeamLogo teamId={cId} size="md" />
                      <div>
                        <div className="text-xs font-black uppercase text-white">
                          {team.shortName}
                        </div>
                        <div className="font-mono-telemetry text-[10px] text-gray-400">
                          ${CONSTRUCTOR_PRICES[cId]}M
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-telemetry text-xs font-black text-[#00D26A]">
                      +{cPts} REAL PTS
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#262B38] pt-3.5">
              <span className="text-xs font-bold text-amber-400">
                {statusMsg || "Select 5 Drivers + 2 Constructors within $100.0M"}
              </span>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSquad}
                className="rounded-sm bg-[#E10600] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-[#ff1912] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : user
                  ? "Save Squad & Update Points"
                  : "Sign In With Google To Save"}
              </button>
            </div>
          </div>

          {/* Driver & Constructor Transfer Market */}
          <div className="f1-hud-panel rounded-md p-5">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-white">
              2026 DRIVER MARKET (CLICK TO ADD / REMOVE)
            </h3>
            <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
              {DRIVER_MARKET.map((driver) => {
                const picked = selectedDrivers.includes(driver.driverNumber);
                const team = F1_TEAMS[driver.teamId];
                const realPts =
                  realDriverScores[driver.driverNumber]?.totalWeekendPoints ?? 0;

                return (
                  <button
                    key={driver.driverNumber}
                    type="button"
                    onClick={() => toggleDriver(driver.driverNumber)}
                    className={`flex items-center justify-between rounded border p-2.5 text-left transition ${
                      picked
                        ? "bg-white/10"
                        : "border-[#262B38] bg-[#11151E] hover:border-gray-600"
                    }`}
                    style={{
                      borderColor: picked ? team.primaryColor : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <DriverAvatar
                        driverNumber={driver.driverNumber}
                        code={driver.code}
                        teamId={driver.teamId}
                        size="sm"
                      />
                      <div>
                        <div className="text-xs font-black text-white">
                          #{driver.driverNumber} {driver.code}
                        </div>
                        <div className="font-mono-telemetry text-[10px] text-gray-400">
                          ${driver.price}M • {realPts}p
                        </div>
                      </div>
                    </div>
                    {picked ? (
                      <Check className="h-4 w-4 text-[#00D26A]" />
                    ) : (
                      <Plus className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <h3 className="mt-5 mb-3 text-xs font-black uppercase tracking-widest text-white">
              CONSTRUCTOR MARKET
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(F1_TEAMS).map((team) => {
                const picked = selectedConstructors.includes(team.id);
                const pts = realConstructorScores[team.id] ?? 0;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleConstructor(team.id)}
                    className={`flex items-center justify-between rounded border p-2.5 text-left transition ${
                      picked
                        ? "bg-white/10"
                        : "border-[#262B38] bg-[#11151E] hover:border-gray-600"
                    }`}
                    style={{
                      borderColor: picked ? team.primaryColor : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <TeamLogo teamId={team.id} size="sm" />
                      <div>
                        <div className="text-[11px] font-black text-white">
                          {team.shortName}
                        </div>
                        <div className="font-mono-telemetry text-[10px] text-gray-400">
                          ${CONSTRUCTOR_PRICES[team.id]}M • {pts}p
                        </div>
                      </div>
                    </div>
                    {picked && <Check className="h-3.5 w-3.5 text-[#00D26A]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Friends League Championship Standings */}
        <aside className="f1-hud-panel h-fit rounded-md p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#262B38] pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#FFD100]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                FRIENDS CHAMPIONSHIP STANDINGS
              </h3>
            </div>
            <span className="font-mono-telemetry text-[11px] text-gray-400">
              REAL-WORLD PTS
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="rounded border border-[#262B38] bg-[#11151E] p-5 text-center">
              <Crown className="mx-auto mb-2 h-6 w-6 text-[#FFD100]" />
              <p className="text-xs font-bold text-gray-300">
                No squads saved yet!
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Sign in with Google and save your 5-driver + 2-constructor roster to claim P1 on your friends&apos; leaderboard.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((entry, idx) => {
                const isMe = user && entry.user_id === user.id;
                return (
                  <motion.div
                    key={entry.user_id}
                    layout
                    className={`flex items-center justify-between rounded border p-3 ${
                      isMe
                        ? "border-[#FFD100] bg-[#1E1C14]"
                        : "border-[#262B38] bg-[#11151E]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono-telemetry text-sm font-black ${
                          idx === 0
                            ? "text-[#FFD100]"
                            : idx === 1
                            ? "text-gray-300"
                            : idx === 2
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        P{idx + 1}
                      </span>

                      {entry.profiles?.avatar_url ? (
                        <img
                          src={entry.profiles.avatar_url}
                          alt={entry.squad_name}
                          className="h-8 w-8 rounded-full border border-white/15"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                          {entry.squad_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white">
                          {entry.squad_name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {entry.profiles?.full_name || "Friend"} • 2X:{" "}
                          <span className="font-mono-telemetry text-amber-400">
                            #{entry.captain_driver}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono-telemetry">
                      <div className="text-sm font-black text-white">
                        {entry.total_points} PTS
                      </div>
                      <div className="text-[10px] font-bold text-[#00D26A]">
                        +{entry.last_race_points} GP
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}