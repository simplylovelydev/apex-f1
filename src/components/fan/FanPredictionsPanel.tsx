"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import {
  Vote,
  Lock,
  CheckCircle2,
  LogIn,
  ShieldAlert,
  Trophy,
  Gauge,
  Users,
  Clock,
  Check,
  X,
} from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";
import { supabase, signInWithGoogle } from "@/lib/supabase/client";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface FanPredictionsPanelProps {
  user: User | null;
  supportedTeam: ConstructorId;
  sessionKey?: string;
  round?: string;
  raceStartIso?: string;
}

interface FriendPredictionRow {
  user_id: string;
  vote_team: ConstructorId | null;
  pole_driver: number | null;
  p1_driver: number | null;
  p2_driver: number | null;
  p3_driver: number | null;
  fastest_lap_driver: number | null;
  safety_car: boolean | null;
  is_locked?: boolean;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface RealRaceOutcome {
  winningTeam: ConstructorId;
  poleDriver: number;
  p1Driver: number;
  p2Driver: number;
  p3Driver: number;
  fastestLapDriver: number | null;
}

const ALL_DRIVERS = Object.values(F1_TEAMS).flatMap((team) => [
  {
    number: team.driverNumbers[0],
    name: team.drivers[0],
    code: team.drivers[0].split(" ")[1].slice(0, 3).toUpperCase(),
    teamId: team.id,
  },
  {
    number: team.driverNumbers[1],
    name: team.drivers[1],
    code: team.drivers[1].split(" ")[1].slice(0, 3).toUpperCase(),
    teamId: team.id,
  },
]);

function getDriverCode(num?: number | null) {
  if (!num) return "—";
  return ALL_DRIVERS.find((d) => d.number === num)?.code || `#${num}`;
}

export function FanPredictionsPanel({
  user,
  supportedTeam,
  sessionKey = "current_gp",
  round = "last",
  raceStartIso,
}: FanPredictionsPanelProps) {
  const activeTeam = F1_TEAMS[supportedTeam];

  const [votedTeam, setVotedTeam] = useState<ConstructorId>(supportedTeam);
  const [teamVoteCounts, setTeamVoteCounts] = useState<Record<string, number>>({});
  const [friendPicks, setFriendPicks] = useState<FriendPredictionRow[]>([]);

  const [poleDriver, setPoleDriver] = useState<number>(3);
  const [p1Driver, setP1Driver] = useState<number>(3);
  const [p2Driver, setP2Driver] = useState<number>(1);
  const [p3Driver, setP3Driver] = useState<number>(16);
  const [fastestLapDriver, setFastestLapDriver] = useState<number>(3);
  const [safetyCar, setSafetyCar] = useState<boolean>(true);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real Result Comparison & Countdown State
  const [hasRealResult, setHasRealResult] = useState<boolean>(false);
  const [realOutcome, setRealOutcome] = useState<RealRaceOutcome | null>(null);
  const [countdownText, setCountdownText] = useState<string>("");

  // Live Timer when no official race result exists yet
  useEffect(() => {
    if (hasRealResult || !raceStartIso) return;

    const tickTimer = () => {
      const target = new Date(raceStartIso).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdownText("AWAITING FIA CLASSIFICATION");
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdownText(`${d}D ${h}H ${m}M ${s}S`);
    };

    tickTimer();
    const id = setInterval(tickTimer, 1000);
    return () => clearInterval(id);
  }, [hasRealResult, raceStartIso]);

  // Check if Official FIA Result exists for this Grand Prix round
  useEffect(() => {
    async function verifyRealResult() {
      try {
        const res = await fetch(`/api/predictions/verify?round=${round}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.hasResult && data.actual) {
          setHasRealResult(true);
          setRealOutcome(data.actual);
        } else {
          setHasRealResult(false);
          setRealOutcome(null);
        }
      } catch {
        setHasRealResult(false);
      }
    }

    verifyRealResult();
  }, [round]);

  const loadCommunityVotesAndPredictions = useCallback(async () => {
    if (!supabase) return;

    const { data: allRows } = await supabase
      .from("fan_predictions")
      .select(
        "user_id, vote_team, pole_driver, p1_driver, p2_driver, p3_driver, fastest_lap_driver, safety_car, is_locked, profiles(full_name, avatar_url)"
      )
      .eq("session_key", sessionKey);

    if (!allRows) return;

    setFriendPicks(allRows as unknown as FriendPredictionRow[]);

    const counts: Record<string, number> = {};
    let foundUserRow = false;

    for (const row of allRows) {
      if (row.vote_team) {
        counts[row.vote_team] = (counts[row.vote_team] || 0) + 1;
      }
      if (user && row.user_id === user.id) {
        foundUserRow = true;
        setIsLocked(true);
        if (row.vote_team) setVotedTeam(row.vote_team as ConstructorId);
        if (row.pole_driver) setPoleDriver(row.pole_driver);
        if (row.p1_driver) setP1Driver(row.p1_driver);
        if (row.p2_driver) setP2Driver(row.p2_driver);
        if (row.p3_driver) setP3Driver(row.p3_driver);
        if (row.fastest_lap_driver) setFastestLapDriver(row.fastest_lap_driver);
        if (typeof row.safety_car === "boolean") setSafetyCar(row.safety_car);
      }
    }

    if (!foundUserRow) {
      setIsLocked(false);
    }

    setTeamVoteCounts(counts);
  }, [sessionKey, user]);

  useEffect(() => {
    loadCommunityVotesAndPredictions();
  }, [loadCommunityVotesAndPredictions]);

  const handleSelectVoteTeam = (teamId: ConstructorId) => {
    if (isLocked) return;
    setVotedTeam(teamId);
  };

  const handleConfirmAndLock = async () => {
    if (isLocked) return;
    if (!user) {
      signInWithGoogle();
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    if (supabase) {
      const { error } = await supabase.from("fan_predictions").insert({
        user_id: user.id,
        session_key: sessionKey,
        vote_team: votedTeam,
        pole_driver: poleDriver,
        p1_driver: p1Driver,
        p2_driver: p2Driver,
        p3_driver: p3Driver,
        fastest_lap_driver: fastestLapDriver,
        safety_car: safetyCar,
        is_locked: true,
      });

      if (error) {
        if (error.code === "23505") {
          setIsLocked(true);
        } else {
          setErrorMsg(error.message);
        }
        setSaving(false);
        await loadCommunityVotesAndPredictions();
        return;
      }

      setIsLocked(true);
      await loadCommunityVotesAndPredictions();
    }

    setSaving(false);
  };

  const totalVotes = Math.max(
    1,
    Object.values(teamVoteCounts).reduce((acc, n) => acc + n, 0)
  );

  const topVotedTeams = Object.values(F1_TEAMS)
    .map((t) => ({
      team: t,
      count: teamVoteCounts[t.id] || 0,
      pct: Math.round(((teamVoteCounts[t.id] || 0) / totalVotes) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const selectedP1 = ALL_DRIVERS.find((d) => d.number === p1Driver) || ALL_DRIVERS[0];
  const selectedP2 = ALL_DRIVERS.find((d) => d.number === p2Driver) || ALL_DRIVERS[2];
  const selectedP3 = ALL_DRIVERS.find((d) => d.number === p3Driver) || ALL_DRIVERS[4];

  const comparisonRows = realOutcome
    ? [
        {
          label: "POLE",
          pick: getDriverCode(poleDriver),
          actual: getDriverCode(realOutcome.poleDriver),
          hit: poleDriver === realOutcome.poleDriver,
        },
        {
          label: "P1 WIN",
          pick: getDriverCode(p1Driver),
          actual: getDriverCode(realOutcome.p1Driver),
          hit: p1Driver === realOutcome.p1Driver,
        },
        {
          label: "P2",
          pick: getDriverCode(p2Driver),
          actual: getDriverCode(realOutcome.p2Driver),
          hit: p2Driver === realOutcome.p2Driver,
        },
        {
          label: "P3",
          pick: getDriverCode(p3Driver),
          actual: getDriverCode(realOutcome.p3Driver),
          hit: p3Driver === realOutcome.p3Driver,
        },
        {
          label: "FAST LAP",
          pick: getDriverCode(fastestLapDriver),
          actual: getDriverCode(realOutcome.fastestLapDriver),
          hit: fastestLapDriver === realOutcome.fastestLapDriver,
        },
      ]
    : [];

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_1.35fr_1fr]">
      {/* Column 1: Live Constructor Fan Pulse Poll */}
      <section className="f1-hud-panel flex min-h-0 flex-col justify-between rounded-md p-4">
        <div>
          <div className="mb-3 flex items-center justify-between border-b border-[#262B38] pb-2">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
              <Vote className="h-4 w-4" style={{ color: activeTeam.primaryColor }} />
              FAN PULSE // GP WINNER
            </span>
            <span className="font-mono-telemetry text-[11px] text-gray-400">
              {Object.values(teamVoteCounts).reduce((a, b) => a + b, 0)} VOTES
            </span>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.values(F1_TEAMS).map((team) => {
              const isVoted = votedTeam === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelectVoteTeam(team.id)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider transition ${
                    isVoted
                      ? "bg-white/15 text-white"
                      : "border-[#262B38] bg-[#151923] text-gray-400 hover:text-white"
                  } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                  style={{ borderColor: isVoted ? team.primaryColor : undefined }}
                >
                  <TeamLogo teamId={team.id} size="sm" />
                  {team.shortName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          {topVotedTeams.map(({ team, pct }) => (
            <div key={team.id}>
              <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <TeamLogo teamId={team.id} size="sm" />
                  <span className="uppercase text-gray-200">{team.shortName}</span>
                </div>
                <span className="font-mono-telemetry text-white">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[#1A202E]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  className="h-full"
                  style={{ backgroundColor: team.primaryColor }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Column 2: Weekend Prediction Slip + Real Result Comparison / Timer */}
      <section className="f1-hud-panel flex min-h-0 flex-col justify-between rounded-md p-4">
        <div>
          <div className="mb-2.5 flex items-center justify-between border-b border-[#262B38] pb-2">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
              <Trophy className="h-4 w-4 text-[#FFD100]" />
              WEEKEND PREDICTION SLIP
            </span>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded border border-[#00D26A]/50 bg-[#00D26A]/15 px-2 py-0.5 font-mono-telemetry text-[10px] font-black uppercase text-[#00D26A]">
                <Lock className="h-3 w-3" />
                CONFIRMED &amp; LOCKED
              </span>
            ) : user ? (
              <span className="inline-flex items-center gap-1 font-mono-telemetry text-[10px] font-bold text-amber-400">
                <CheckCircle2 className="h-3 w-3" />
                {user.user_metadata?.full_name || "READY TO LOCK"}
              </span>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black"
              >
                <LogIn className="h-3 w-3" />
                Google Login
              </button>
            )}
          </div>

          {/* Podium Visual Strip */}
          <div className="mb-2.5 grid grid-cols-3 gap-2 rounded border border-[#262B38] bg-[#151923] p-2">
            {[
              { label: "P1 WINNER", driver: selectedP1, accent: "#FFD100" },
              { label: "P2", driver: selectedP2, accent: "#C0C0C0" },
              { label: "P3", driver: selectedP3, accent: "#CD7F32" },
            ].map((slot) => (
              <div
                key={slot.label}
                className="flex items-center gap-2 rounded bg-black/30 p-1.5"
              >
                <DriverAvatar
                  driverNumber={slot.driver.number}
                  code={slot.driver.code}
                  teamId={slot.driver.teamId}
                  size="sm"
                />
                <div className="min-w-0">
                  <span
                    className="block text-[9px] font-black uppercase"
                    style={{ color: slot.accent }}
                  >
                    {slot.label}
                  </span>
                  <span className="block truncate text-xs font-black text-white">
                    {slot.driver.code}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                POLE POSITION
              </label>
              <select
                disabled={isLocked}
                value={poleDriver}
                onChange={(e) => setPoleDriver(Number(e.target.value))}
                className="w-full rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {ALL_DRIVERS.map((d) => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                FASTEST LAP
              </label>
              <select
                disabled={isLocked}
                value={fastestLapDriver}
                onChange={(e) => setFastestLapDriver(Number(e.target.value))}
                className="w-full rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {ALL_DRIVERS.map((d) => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                P1 WINNER
              </label>
              <select
                disabled={isLocked}
                value={p1Driver}
                onChange={(e) => setP1Driver(Number(e.target.value))}
                className="w-full rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {ALL_DRIVERS.map((d) => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                P2 RUNNER-UP
              </label>
              <select
                disabled={isLocked}
                value={p2Driver}
                onChange={(e) => setP2Driver(Number(e.target.value))}
                className="w-full rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {ALL_DRIVERS.map((d) => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                P3 PODIUM
              </label>
              <select
                disabled={isLocked}
                value={p3Driver}
                onChange={(e) => setP3Driver(Number(e.target.value))}
                className="w-full rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {ALL_DRIVERS.map((d) => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-gray-400">
                SAFETY CAR?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSafetyCar(true)}
                  className={`flex items-center justify-center gap-1 rounded border py-1 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-65 ${
                    safetyCar
                      ? "border-[#FFD100] bg-[#FFD100]/20 text-[#FFD100]"
                      : "border-[#262B38] bg-[#161B26] text-gray-400"
                  }`}
                >
                  <ShieldAlert className="h-3 w-3" />
                  YES
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSafetyCar(false)}
                  className={`flex items-center justify-center gap-1 rounded border py-1 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-65 ${
                    !safetyCar
                      ? "border-[#00D26A] bg-[#00D26A]/20 text-[#00D26A]"
                      : "border-[#262B38] bg-[#161B26] text-gray-400"
                  }`}
                >
                  <Gauge className="h-3 w-3" />
                  NO
                </button>
              </div>
            </div>
          </div>

          {/* COMPARE WITH REAL RESULT BOX (Or Live Timer + Wait Message) */}
          <div className="mt-2.5 rounded border border-[#262B38] bg-[#10131B] p-2.5">
            {hasRealResult && realOutcome ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span className="text-[#00D26A]">
                    COMPARE WITH REAL FIA RESULT
                  </span>
                  <span className="font-mono-telemetry text-[#FFD100]">
                    {comparisonRows.filter((r) => r.hit).length}/5 EXACT HITS
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono-telemetry text-[10px]">
                  {comparisonRows.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded border p-1 ${
                        item.hit
                          ? "border-[#00D26A]/50 bg-[#00D26A]/15"
                          : "border-[#262B38] bg-[#151923]"
                      }`}
                    >
                      <span className="block text-[8px] font-bold text-gray-400">
                        {item.label}
                      </span>
                      <span className="block font-black text-white">
                        YOU: {item.pick}
                      </span>
                      <span
                        className={`mt-0.5 inline-flex items-center gap-0.5 font-black ${
                          item.hit ? "text-[#00D26A]" : "text-red-400"
                        }`}
                      >
                        {item.hit ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <X className="h-2.5 w-2.5" />
                        )}
                        {item.actual}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-pulse text-amber-400" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      NO OFFICIAL RESULT YET // WAIT FOR THE RESULTS
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Comparison unlocks automatically after FIA race classification.
                    </div>
                  </div>
                </div>
                <div className="shrink-0 rounded border border-[#262B38] bg-[#161B26] px-2.5 py-1 font-mono-telemetry text-xs font-black text-white">
                  {countdownText || "PENDING"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Confirm / Locked Bar */}
        <div className="mt-2.5 flex items-center justify-between border-t border-[#262B38] pt-2">
          {errorMsg ? (
            <span className="text-xs font-bold text-red-400">{errorMsg}</span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00D26A]">
              <Lock className="h-3.5 w-3.5" />
              Picks are final for this Grand Prix.
            </span>
          ) : (
            <span className="text-[11px] text-amber-400">
              Predictions cannot be changed once confirmed.
            </span>
          )}

          {isLocked ? (
            <div className="inline-flex items-center gap-1.5 rounded-sm border border-[#00D26A]/40 bg-[#00D26A]/15 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#00D26A]">
              <Lock className="h-3.5 w-3.5" />
              LOCKED IN
            </div>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirmAndLock}
              className="rounded-sm px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: activeTeam.primaryColor }}
            >
              {saving
                ? "Locking..."
                : user
                ? "Confirm & Lock Picks"
                : "Sign In & Lock"}
            </button>
          )}
        </div>
      </section>

      {/* Column 3: Friends Prediction Wall */}
      <section className="f1-hud-panel flex min-h-0 flex-col overflow-hidden rounded-md p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[#262B38] pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FFD100]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              FRIENDS PREDICTION WALL
            </h3>
          </div>
          <span className="font-mono-telemetry text-[10px] text-gray-400">
            {friendPicks.length} LOCKED
          </span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {friendPicks.length === 0 ? (
            <div className="rounded border border-[#262B38] bg-[#11151E] p-4 text-center text-xs text-gray-400">
              Confirm your weekend slip to lock your picks onto the Friends Prediction Wall.
            </div>
          ) : (
            friendPicks.map((fp) => {
              const hits =
                hasRealResult && realOutcome
                  ? [
                      fp.pole_driver === realOutcome.poleDriver,
                      fp.p1_driver === realOutcome.p1Driver,
                      fp.p2_driver === realOutcome.p2Driver,
                      fp.p3_driver === realOutcome.p3Driver,
                      fp.fastest_lap_driver === realOutcome.fastestLapDriver,
                    ].filter(Boolean).length
                  : null;

              return (
                <div
                  key={fp.user_id}
                  className="rounded border border-[#262B38] bg-[#11151E] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {fp.profiles?.avatar_url ? (
                        <img
                          src={fp.profiles.avatar_url}
                          alt="Friend"
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">
                          {(fp.profiles?.full_name?.[0] || "F").toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-black text-white">
                        {fp.profiles?.full_name || "Friend"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hits !== null && (
                        <span className="rounded bg-[#00D26A]/20 px-1.5 py-0.5 font-mono-telemetry text-[9px] font-black text-[#00D26A]">
                          {hits}/5 HIT
                        </span>
                      )}
                      {fp.vote_team && F1_TEAMS[fp.vote_team] && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white"
                          style={{
                            backgroundColor: F1_TEAMS[fp.vote_team].primaryColor,
                          }}
                        >
                          {F1_TEAMS[fp.vote_team].shortName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1 border-t border-[#262B38]/70 pt-1.5 font-mono-telemetry text-[10px]">
                    <div>
                      <span className="block text-[8px] text-gray-500">POLE</span>
                      <span className="font-bold text-white">
                        {getDriverCode(fp.pole_driver)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-gray-500">PODIUM</span>
                      <span className="font-bold text-[#FFD100]">
                        {getDriverCode(fp.p1_driver)}/{getDriverCode(fp.p2_driver)}/
                        {getDriverCode(fp.p3_driver)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-gray-500">FL</span>
                      <span className="font-bold text-[#B13BFF]">
                        {getDriverCode(fp.fastest_lap_driver)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-gray-500">SC</span>
                      <span className="font-bold text-gray-300">
                        {fp.safety_car ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}