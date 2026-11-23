"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import {
  AppMode,
  CarTelemetrySnapshot,
  ConstructorId,
  DriverTimingRow,
  F1_TEAMS,
} from "@/types/f1";
import {
  supabase,
  syncUserProfile,
  updateSupportedTeamInDb,
} from "@/lib/supabase/client";
import { LandingHero } from "@/components/broadcast/LandingHero";
import { ModeSwitcher } from "@/components/broadcast/ModeSwitcher";
import { TimingTower } from "@/components/broadcast/TimingTower";
import { HaloHud } from "@/components/broadcast/HaloHud";
import {
  CircuitTrackMap,
  AvailableTrack,
  RealTrackGeometry,
} from "@/components/fan/CircuitTrackMap";
import {
  NextRaceScheduleCard,
  NextRaceData,
} from "@/components/fan/NextRaceScheduleCard";
import { ConstructorGarageCard } from "@/components/fan/ConstructorGarageCard";
import {
  RaceControlRadioCard,
  RaceControlStatus,
  TeamRadioClip,
} from "@/components/fan/RaceControlRadioCard";
import { FanPredictionsPanel } from "@/components/fan/FanPredictionsPanel";
import { TeamSelectorModal } from "@/components/fan/TeamSelectorModal";
import { RosterBuilder } from "@/components/fantasy/RosterBuilder";
import { StandingsAndGuidePage } from "@/components/standings/StandingsAndGuidePage";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasEnteredPitwall, setHasEnteredPitwall] = useState(false);
  const [mode, setMode] = useState<AppMode>("fan");
  const [supportedTeam, setSupportedTeam] = useState<ConstructorId>("red_bull");
  const [isTeamPickerOpen, setIsTeamPickerOpen] = useState(false);

  // Real OpenF1 & Jolpica State
  const [isRaceLive, setIsRaceLive] = useState(false);
  const [nextRace, setNextRace] = useState<NextRaceData | null>(null);
  const [standings, setStandings] = useState<DriverTimingRow[]>([]);
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number>(3);
  const [telemetry, setTelemetry] = useState<CarTelemetrySnapshot>({
    driverNumber: 3,
    speed: 0,
    rpm: 0,
    gear: 0,
    throttle: 0,
    brake: 0,
    drs: 0,
    timestamp: "",
  });
  const [raceControl, setRaceControl] = useState<RaceControlStatus | null>(
    null
  );
  const [teamRadio, setTeamRadio] = useState<TeamRadioClip | null>(null);

  // Every Real Circuit State
  const [availableTracks, setAvailableTracks] = useState<AvailableTrack[]>([]);
  const [selectedCircuitKey, setSelectedCircuitKey] = useState<number>(0);
  const [trackGeometry, setTrackGeometry] = useState<RealTrackGeometry | null>(
    null
  );
  const [realCarLocations, setRealCarLocations] = useState<
    Array<{ driverNumber: number; x: number; y: number }>
  >([]);

  const [sessionTitle, setSessionTitle] = useState("LOADING OFFICIAL FIA FEED");
  const [feedStatus, setFeedStatus] = useState("SYNCING");
  const [gapMode, setGapMode] = useState<"interval" | "leader">("interval");

  // Listen to Supabase Google Auth session, restore constructor allegiance & return to Hero on logout
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        const savedTeam = await syncUserProfile(currentUser);
        if (savedTeam && F1_TEAMS[savedTeam]) {
          setSupportedTeam(savedTeam);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      setAuthReady(true);

      if (event === "SIGNED_OUT" || !activeUser) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("apex_onboarding_step");
        }
        setHasEnteredPitwall(false);
        return;
      }

      const savedTeam = await syncUserProfile(activeUser);
      if (savedTeam && F1_TEAMS[savedTeam]) {
        setSupportedTeam(savedTeam);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync CSS team variables whenever supportedTeam changes
  useEffect(() => {
    const team = F1_TEAMS[supportedTeam];
    document.documentElement.style.setProperty("--team-primary", team.primaryColor);
    document.documentElement.style.setProperty("--team-secondary", team.secondaryColor);
    setSelectedDriverNumber(team.driverNumbers[0]);
  }, [supportedTeam]);

  const handleSelectTeam = async (teamId: ConstructorId) => {
    setSupportedTeam(teamId);
    if (user) {
      await updateSupportedTeamInDb(user.id, teamId);
    }
  };

  const fetchRealF1Data = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        driver: String(selectedDriverNumber),
      });

      const res = await fetch(`/api/telemetry?${query.toString()}`);
      if (!res.ok) return;
      const data = await res.json();

      setIsRaceLive(Boolean(data.isRaceLive));
      if (data.nextRace) setNextRace(data.nextRace);

      // Guard: Never wipe out existing standings or tracks if upstream API throttles
      if (Array.isArray(data.standings) && data.standings.length > 0) {
        setStandings(data.standings);
      }

      if (data.telemetry) {
        setTelemetry({
          ...data.telemetry,
          throttle: data.telemetry.throttle > 100 ? 0 : data.telemetry.throttle,
          brake: data.telemetry.brake > 100 ? 0 : data.telemetry.brake,
        });
      }
      if (data.raceControl) setRaceControl(data.raceControl);
      if (data.teamRadio) setTeamRadio(data.teamRadio);

      if (
        Array.isArray(data.availableTracks) &&
        data.availableTracks.length > 0
      ) {
        setAvailableTracks(data.availableTracks);
        setSelectedCircuitKey((prev) =>
          prev === 0 && data.availableTracks[0]
            ? data.availableTracks[0].circuitKey
            : prev
        );
      }

      if (data.trackGeometry) setTrackGeometry(data.trackGeometry);
      if (
        Array.isArray(data.realCarLocations) &&
        data.realCarLocations.length > 0
      ) {
        setRealCarLocations(data.realCarLocations);
      }

      if (data.isRaceLive && data.activeSession?.name) {
        setSessionTitle(data.activeSession.name);
        setFeedStatus("LIVE OPENF1");
      } else if (data.nextRace) {
        setSessionTitle(`NEXT: ${data.nextRace.raceName}`);
        setFeedStatus("NEXT GP SCHEDULE");
      } else if (data.activeSession?.name) {
        setSessionTitle(data.activeSession.name);
        setFeedStatus("OFFICIAL CLASSIFICATION");
      }
    } catch {
      setFeedStatus("RECONNECTING");
    }
  }, [selectedDriverNumber]);

  useEffect(() => {
    fetchRealF1Data();
  }, [fetchRealF1Data]);

  useEffect(() => {
    if (!isRaceLive) return;
    const interval = setInterval(fetchRealF1Data, 10000);
    return () => clearInterval(interval);
  }, [isRaceLive, fetchRealF1Data]);

  const handleLaunchDashboard = (initialMode: AppMode) => {
    setMode(initialMode);
    setHasEnteredPitwall(true);
  };

  const activeDriverRow =
    standings.find((d) => d.driverNumber === selectedDriverNumber) ||
    standings[0] || {
      position: 1,
      driverNumber: selectedDriverNumber,
      code: "VER",
      fullName: "Max Verstappen",
      teamId: supportedTeam,
      teamColor: F1_TEAMS[supportedTeam].primaryColor,
      gapToLeader: "LEADER",
      interval: "INTERVAL",
      lastLap: "OFFICIAL",
      sector1Color: "purple" as const,
      sector2Color: "green" as const,
      sector3Color: "green" as const,
      tyre: "MEDIUM" as const,
      tyreAge: 0,
      inPit: false,
      drsActive: false,
    };

  if (!hasEnteredPitwall) {
    return (
      <LandingHero
        user={user}
        authReady={authReady}
        supportedTeam={supportedTeam}
        onSelectTeam={handleSelectTeam}
        onLaunchDashboard={handleLaunchDashboard}
        sessionTitle={sessionTitle}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050608] lg:h-screen lg:overflow-hidden">
      <ModeSwitcher
        user={user}
        mode={mode}
        onModeChange={setMode}
        onReturnToHero={() => setHasEnteredPitwall(false)}
        supportedTeam={supportedTeam}
        onOpenTeamPicker={() => setIsTeamPickerOpen(true)}
        sessionTitle={sessionTitle}
        feedSource={feedStatus}
      />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 py-3 pb-10 sm:px-6 lg:min-h-0 lg:overflow-hidden lg:pb-3">
        {mode === "fan" && (
          <div className="grid flex-1 grid-cols-1 gap-3 lg:min-h-0 xl:grid-cols-[340px_1fr]">
            {/* Left Column: Timing Tower */}
            <div className="max-h-[380px] overflow-y-auto pr-1 xl:max-h-none xl:min-h-0">
              <TimingTower
                rows={standings}
                selectedDriverNumber={selectedDriverNumber}
                onSelectDriver={setSelectedDriverNumber}
                supportedTeam={supportedTeam}
                gapMode={gapMode}
                onToggleGapMode={() =>
                  setGapMode((prev) => (prev === "interval" ? "leader" : "interval"))
                }
              />
            </div>

            {/* Right Area: Single-Row Schedule + Balanced 2-Column Layout */}
            <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:grid-rows-[auto_1fr] lg:overflow-hidden">
              <NextRaceScheduleCard
                isRaceLive={isRaceLive}
                nextRace={nextRace}
                supportedTeam={supportedTeam}
              />

              <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:grid-cols-[1.15fr_1fr]">
                {/* Left Sub-Column: Halo Telemetry + Constructor Garage */}
                <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:grid-rows-[1fr_auto]">
                  <HaloHud driver={activeDriverRow} telemetry={telemetry} />
                  <ConstructorGarageCard
                    supportedTeam={supportedTeam}
                    standings={standings}
                    selectedDriverNumber={selectedDriverNumber}
                    onSelectDriver={setSelectedDriverNumber}
                    onOpenTeamPicker={() => setIsTeamPickerOpen(true)}
                  />
                </div>

                {/* Right Sub-Column: FIA Circuit Map + Race Control & Radio Card */}
                <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:grid-rows-[1fr_auto]">
                  <CircuitTrackMap
                    availableTracks={availableTracks}
                    selectedCircuitKey={selectedCircuitKey}
                    onSelectCircuitKey={setSelectedCircuitKey}
                    trackGeometry={trackGeometry}
                    realCarLocations={realCarLocations}
                    standings={standings}
                    selectedDriverNumber={selectedDriverNumber}
                    onSelectDriver={setSelectedDriverNumber}
                    supportedTeam={supportedTeam}
                  />
                  <RaceControlRadioCard
                    raceControl={raceControl}
                    teamRadio={teamRadio}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "fantasy" && (
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <RosterBuilder user={user} />
          </div>
        )}

        {mode === "predictions" && (
          <div className="flex-1 lg:min-h-0 lg:overflow-hidden">
            <FanPredictionsPanel
              user={user}
              supportedTeam={supportedTeam}
              sessionKey={
                nextRace?.round ? `round_${nextRace.round}` : "current_gp"
              }
              round={nextRace?.round || "last"}
              raceStartIso={nextRace?.raceStartIso}
            />
          </div>
        )}

        {mode === "standings" && (
          <div className="flex-1 lg:min-h-0 lg:overflow-hidden">
            <StandingsAndGuidePage supportedTeam={supportedTeam} />
          </div>
        )}
      </main>

      <TeamSelectorModal
        isOpen={isTeamPickerOpen}
        onClose={() => setIsTeamPickerOpen(false)}
        selectedTeam={supportedTeam}
        onSelectTeam={handleSelectTeam}
      />
    </div>
  );
}