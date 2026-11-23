"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Award,
  Check,
  Cpu,
  Crown,
  Flame,
  Info,
  Lock,
  RefreshCw,
  Shield,
  Sliders,
  Trophy,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";
import { signInWithGoogle, supabase } from "@/lib/supabase/client";
import { DriverAvatar, TeamLogo } from "@/components/broadcast/F1Media";

interface RosterBuilderProps {
  user: User | null;
  onPointsUpdated?: (points: number) => void;
}

type PowerUnitId =
  | "red_bull_ford"
  | "mercedes_hpp"
  | "ferrari_pu"
  | "honda_rbpt"
  | "audi_pu";

interface FantasyDriverOption {
  driverNumber: number;
  code: string;
  fullName: string;
  teamId: ConstructorId;
  powerUnitId: PowerUnitId;
  price: number;
}

interface FantasyConstructorOption {
  teamId: ConstructorId;
  name: string;
  shortName: string;
  powerUnitId: PowerUnitId;
  price: number;
}

interface FantasyPowerUnitOption {
  id: PowerUnitId;
  name: string;
  shortName: string;
  suppliedTeams: ConstructorId[];
  accentColor: string;
  price: number;
}

interface FantasyProfile {
  userId: string;
  displayName: string;
  teamName: string;
  logoUrl: string;
  totalPoints: number;
  scoredRounds: string[];
}

interface LockedRoster {
  driverNumbers: number[];
  constructorIds: ConstructorId[];
  powerUnitId: PowerUnitId;
  turboDriver: number;
  isLocked: boolean;
}

const BUDGET_CAP = 100.0;

const FANTASY_POWER_UNITS: FantasyPowerUnitOption[] = [
  {
    id: "mercedes_hpp",
    name: "Mercedes-AMG High Performance Powertrains",
    shortName: "MERCEDES HPP",
    suppliedTeams: ["mercedes", "mclaren", "williams", "alpine"],
    accentColor: "#00D2BE",
    price: 22.0,
  },
  {
    id: "ferrari_pu",
    name: "Scuderia Ferrari Power Unit",
    shortName: "FERRARI 067",
    suppliedTeams: ["ferrari", "haas", "cadillac"],
    accentColor: "#E10600",
    price: 20.5,
  },
  {
    id: "red_bull_ford",
    name: "Red Bull Ford Powertrains",
    shortName: "RED BULL FORD",
    suppliedTeams: ["red_bull", "rb"],
    accentColor: "#3671C6",
    price: 19.5,
  },
  {
    id: "honda_rbpt",
    name: "Honda HRC F1 Power Unit",
    shortName: "HONDA HRC",
    suppliedTeams: ["aston_martin"],
    accentColor: "#006F62",
    price: 16.0,
  },
  {
    id: "audi_pu",
    name: "Audi Formula Racing Powertrain",
    shortName: "AUDI HYBRID",
    suppliedTeams: ["audi"],
    accentColor: "#F50537",
    price: 13.5,
  },
];

const FANTASY_DRIVERS: FantasyDriverOption[] = [
  { driverNumber: 3, code: "VER", fullName: "Max Verstappen", teamId: "red_bull", powerUnitId: "red_bull_ford", price: 28.0 },
  { driverNumber: 1, code: "NOR", fullName: "Lando Norris", teamId: "mclaren", powerUnitId: "mercedes_hpp", price: 27.0 },
  { driverNumber: 16, code: "LEC", fullName: "Charles Leclerc", teamId: "ferrari", powerUnitId: "ferrari_pu", price: 25.5 },
  { driverNumber: 44, code: "HAM", fullName: "Lewis Hamilton", teamId: "ferrari", powerUnitId: "ferrari_pu", price: 24.5 },
  { driverNumber: 81, code: "PIA", fullName: "Oscar Piastri", teamId: "mclaren", powerUnitId: "mercedes_hpp", price: 23.5 },
  { driverNumber: 63, code: "RUS", fullName: "George Russell", teamId: "mercedes", powerUnitId: "mercedes_hpp", price: 22.0 },
  { driverNumber: 12, code: "ANT", fullName: "Kimi Antonelli", teamId: "mercedes", powerUnitId: "mercedes_hpp", price: 18.5 },
  { driverNumber: 14, code: "ALO", fullName: "Fernando Alonso", teamId: "aston_martin", powerUnitId: "honda_rbpt", price: 17.0 },
  { driverNumber: 55, code: "SAI", fullName: "Carlos Sainz", teamId: "williams", powerUnitId: "mercedes_hpp", price: 16.5 },
  { driverNumber: 6, code: "HAD", fullName: "Isack Hadjar", teamId: "red_bull", powerUnitId: "red_bull_ford", price: 15.5 },
  { driverNumber: 10, code: "GAS", fullName: "Pierre Gasly", teamId: "alpine", powerUnitId: "mercedes_hpp", price: 14.0 },
  { driverNumber: 23, code: "ALB", fullName: "Alexander Albon", teamId: "williams", powerUnitId: "mercedes_hpp", price: 13.5 },
  { driverNumber: 18, code: "STR", fullName: "Lance Stroll", teamId: "aston_martin", powerUnitId: "honda_rbpt", price: 12.0 },
  { driverNumber: 27, code: "HUL", fullName: "Nico Hulkenberg", teamId: "audi", powerUnitId: "audi_pu", price: 11.5 },
  { driverNumber: 87, code: "BEA", fullName: "Oliver Bearman", teamId: "haas", powerUnitId: "ferrari_pu", price: 11.0 },
  { driverNumber: 31, code: "OCO", fullName: "Esteban Ocon", teamId: "haas", powerUnitId: "ferrari_pu", price: 10.5 },
  { driverNumber: 30, code: "LAW", fullName: "Liam Lawson", teamId: "rb", powerUnitId: "red_bull_ford", price: 10.0 },
  { driverNumber: 5, code: "BOR", fullName: "Gabriel Bortoleto", teamId: "audi", powerUnitId: "audi_pu", price: 9.5 },
  { driverNumber: 43, code: "COL", fullName: "Franco Colapinto", teamId: "alpine", powerUnitId: "mercedes_hpp", price: 9.0 },
  { driverNumber: 41, code: "LIN", fullName: "Arvid Lindblad", teamId: "rb", powerUnitId: "red_bull_ford", price: 8.5 },
  { driverNumber: 77, code: "BOT", fullName: "Valtteri Bottas", teamId: "cadillac", powerUnitId: "ferrari_pu", price: 8.0 },
  { driverNumber: 11, code: "PER", fullName: "Sergio Perez", teamId: "cadillac", powerUnitId: "ferrari_pu", price: 8.5 },
];

const FANTASY_CONSTRUCTORS: FantasyConstructorOption[] = [
  { teamId: "mclaren", name: "McLaren Formula 1 Team", shortName: "MCLAREN", powerUnitId: "mercedes_hpp", price: 28.0 },
  { teamId: "ferrari", name: "Scuderia Ferrari HP", shortName: "FERRARI", powerUnitId: "ferrari_pu", price: 26.5 },
  { teamId: "red_bull", name: "Oracle Red Bull Racing", shortName: "RED BULL", powerUnitId: "red_bull_ford", price: 26.0 },
  { teamId: "mercedes", name: "Mercedes-AMG PETRONAS", shortName: "MERCEDES", powerUnitId: "mercedes_hpp", price: 24.0 },
  { teamId: "aston_martin", name: "Aston Martin Aramco", shortName: "ASTON MARTIN", powerUnitId: "honda_rbpt", price: 17.5 },
  { teamId: "williams", name: "Atlassian Williams Racing", shortName: "WILLIAMS", powerUnitId: "mercedes_hpp", price: 15.0 },
  { teamId: "alpine", name: "BWT Alpine F1 Team", shortName: "ALPINE", powerUnitId: "mercedes_hpp", price: 13.0 },
  { teamId: "haas", name: "MoneyGram Haas F1 Team", shortName: "HAAS", powerUnitId: "ferrari_pu", price: 12.0 },
  { teamId: "rb", name: "Visa Cash App Racing Bulls", shortName: "RACING BULLS", powerUnitId: "red_bull_ford", price: 11.5 },
  { teamId: "audi", name: "Audi F1 Team", shortName: "AUDI", powerUnitId: "audi_pu", price: 10.5 },
  { teamId: "cadillac", name: "Cadillac Formula 1 Team", shortName: "CADILLAC", powerUnitId: "ferrari_pu", price: 9.5 },
];

const PREMADE_LOGOS = [
  { id: "apex_crimson", label: "APEX CRIMSON", bg: "#E10600", fg: "#FFFFFF", mark: "APX" },
  { id: "obsidian_gold", label: "CHAMPION GOLD", bg: "#FFD100", fg: "#050608", mark: "01" },
  { id: "titanium_blue", label: "NIGHT CIRCUIT", bg: "#1E41FF", fg: "#FFFFFF", mark: "GP" },
  { id: "emerald_drs", label: "DRS VELOCITY", bg: "#00D26A", fg: "#050608", mark: "DRS" },
  { id: "papaya_aero", label: "AERO WING", bg: "#FF8000", fg: "#050608", mark: "V10" },
  { id: "petronas_teal", label: "SILVER ARROW", bg: "#00D2BE", fg: "#050608", mark: "F1" },
  { id: "royal_purple", label: "PURPLE SECTOR", bg: "#9B26B6", fg: "#FFFFFF", mark: "S3" },
  { id: "stealth_carbon", label: "STEALTH CARBON", bg: "#FFFFFF", fg: "#050608", mark: "MAX" },
];

const RACE_POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const QUALI_POINTS_TABLE = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export function FantasyLogoBadge({
  logoUrl,
  size = "md",
}: {
  logoUrl: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm"
      ? "h-7 w-7 text-[9px]"
      : size === "lg"
      ? "h-12 w-12 text-xs"
      : "h-9 w-9 text-[10px]";

  if (logoUrl.startsWith("preset:")) {
    const presetId = logoUrl.replace("preset:", "");
    const preset =
      PREMADE_LOGOS.find((p) => p.id === presetId) || PREMADE_LOGOS[0];
    return (
      <div
        className={`flex shrink-0 items-center justify-center border border-white/25 font-mono-telemetry font-black tracking-tighter ${dim}`}
        style={{ backgroundColor: preset.bg, color: preset.fg }}
      >
        {preset.mark}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Team Logo"
      className={`shrink-0 border border-white/20 bg-black object-cover ${dim}`}
    />
  );
}

export function RosterBuilder({ user, onPointsUpdated }: RosterBuilderProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "lineup" | "leaderboard" | "profile"
  >("lineup");

  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [profile, setProfile] = useState<FantasyProfile | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [leaderboard, setLeaderboard] = useState<FantasyProfile[]>([]);

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [selectedLogo, setSelectedLogo] = useState("preset:apex_crimson");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [selectedConstructor, setSelectedConstructor] =
    useState<ConstructorId | null>(null);
  const [selectedPowerUnit, setSelectedPowerUnit] =
    useState<PowerUnitId | null>(null);
  const [turboDriver, setTurboDriver] = useState<number | null>(null);

  const [lockedRoster, setLockedRoster] = useState<LockedRoster | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lockingRoster, setLockingRoster] = useState(false);
  const [syncingPoints, setSyncingPoints] = useState(false);
  const [pointsNotice, setPointsNotice] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [simScenario, setSimScenario] = useState<
    "p1_p5_win" | "podium_sweep" | "points_finish"
  >("p1_p5_win");

  const isLocked = Boolean(lockedRoster?.isLocked);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("apex_fantasy_rules_seen");
    if (!seen) {
      setShowRulesModal(true);
      localStorage.setItem("apex_fantasy_rules_seen", "true");
    }
  }, []);

  const applyLockedState = (locked: LockedRoster) => {
    setLockedRoster(locked);
    setSelectedDrivers(locked.driverNumbers);
    setSelectedConstructor(locked.constructorIds[0] ?? null);
    setSelectedPowerUnit(locked.powerUnitId);
    setTurboDriver(locked.turboDriver);
  };

  // Supabase is the single source of truth across localhost & Vercel
  const loadFantasyData = async () => {
    setLoadingData(true);
    if (!supabase) {
      setLoadingData(false);
      return;
    }

    try {
      const { data: allProfiles } = await supabase
        .from("fantasy_profiles")
        .select("*")
        .order("total_points", { ascending: false });

      if (Array.isArray(allProfiles)) {
        setLeaderboard(
          allProfiles.map((p) => ({
            userId: p.user_id,
            displayName: p.display_name,
            teamName: p.team_name,
            logoUrl: p.logo_url,
            totalPoints: p.total_points ?? 0,
            scoredRounds: p.scored_rounds ?? [],
          }))
        );
      }

      if (user) {
        const { data: myProf } = await supabase
          .from("fantasy_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (myProf) {
          const loadedProf: FantasyProfile = {
            userId: myProf.user_id,
            displayName: myProf.display_name,
            teamName: myProf.team_name,
            logoUrl: myProf.logo_url,
            totalPoints: myProf.total_points ?? 0,
            scoredRounds: myProf.scored_rounds ?? [],
          };
          setProfile(loadedProf);
          setDisplayNameInput(loadedProf.displayName);
          setTeamNameInput(loadedProf.teamName);
          setSelectedLogo(loadedProf.logoUrl);
          onPointsUpdated?.(loadedProf.totalPoints);
        } else {
          setProfile(null);
          onPointsUpdated?.(0);
        }

        // Fetch locked roster exclusively from Supabase DB
        const { data: myRoster, error: rosterReadErr } = await supabase
          .from("fantasy_rosters")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (rosterReadErr) {
          setRosterError(
            `DB READ ERROR: ${rosterReadErr.message.toUpperCase()}`
          );
        }

        if (
          myRoster &&
          Array.isArray(myRoster.driver_numbers) &&
          myRoster.driver_numbers.length === 3
        ) {
          const ctorList = (myRoster.constructor_ids || []) as ConstructorId[];
          const puId = (myRoster.power_unit_id || "mercedes_hpp") as PowerUnitId;
          const locked: LockedRoster = {
            driverNumbers: myRoster.driver_numbers,
            constructorIds: ctorList,
            powerUnitId: puId,
            turboDriver: myRoster.turbo_driver ?? myRoster.driver_numbers[0],
            isLocked: true,
          };
          applyLockedState(locked);
        } else {
          // Clear any stale localStorage so localhost and Vercel stay 100% synced with DB
          if (typeof window !== "undefined") {
            localStorage.removeItem(`apex_locked_roster_${user.id}`);
          }
          setLockedRoster(null);
          setSelectedDrivers([]);
          setSelectedConstructor(null);
          setSelectedPowerUnit(null);
          setTurboDriver(null);
        }
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadFantasyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 160);
          setSelectedLogo(canvas.toDataURL("image/png", 0.9));
        }
      };
      if (typeof reader.result === "string") {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const cleanDisplay = displayNameInput.trim();
    const cleanTeam = teamNameInput.trim();

    if (cleanDisplay.length < 3) {
      setProfileError("DISPLAY NAME MUST BE AT LEAST 3 CHARACTERS.");
      return;
    }
    if (cleanTeam.length < 3) {
      setProfileError("FANTASY TEAM NAME MUST BE AT LEAST 3 CHARACTERS.");
      return;
    }
    if (!user || !supabase) {
      setProfileError("SIGN IN WITH GOOGLE TO REGISTER YOUR FANTASY TEAM.");
      return;
    }

    setSavingProfile(true);
    try {
      const lower = cleanDisplay.toLowerCase();
      const { data: existing } = await supabase
        .from("fantasy_profiles")
        .select("user_id")
        .eq("display_name_lower", lower)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        setProfileError(
          `DISPLAY NAME "${cleanDisplay.toUpperCase()}" IS ALREADY TAKEN. CHOOSE ANOTHER.`
        );
        setSavingProfile(false);
        return;
      }

      const { error } = await supabase.from("fantasy_profiles").upsert(
        {
          user_id: user.id,
          display_name: cleanDisplay,
          display_name_lower: lower,
          team_name: cleanTeam,
          logo_url: selectedLogo,
          total_points: profile?.totalPoints ?? 0,
          scored_rounds: profile?.scoredRounds ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        setProfileError(
          error.code === "23505"
            ? "THIS DISPLAY NAME IS ALREADY TAKEN."
            : error.message.toUpperCase()
        );
        setSavingProfile(false);
        return;
      }

      await loadFantasyData();
      setProfileSuccess("FANTASY IDENTITY SAVED TO DATABASE.");
    } finally {
      setSavingProfile(false);
    }
  };

  const totalSpent = useMemo(() => {
    const driverCost = selectedDrivers.reduce((sum, num) => {
      const d = FANTASY_DRIVERS.find((item) => item.driverNumber === num);
      return sum + (d?.price || 0);
    }, 0);
    const ctorCost = selectedConstructor
      ? FANTASY_CONSTRUCTORS.find((c) => c.teamId === selectedConstructor)
          ?.price || 0
      : 0;
    const puCost = selectedPowerUnit
      ? FANTASY_POWER_UNITS.find((p) => p.id === selectedPowerUnit)?.price || 0
      : 0;
    return Number((driverCost + ctorCost + puCost).toFixed(1));
  }, [selectedDrivers, selectedConstructor, selectedPowerUnit]);

  const remainingBudget = Number((BUDGET_CAP - totalSpent).toFixed(1));
  const isRosterComplete =
    selectedDrivers.length === 3 &&
    selectedConstructor !== null &&
    selectedPowerUnit !== null &&
    turboDriver !== null &&
    selectedDrivers.includes(turboDriver) &&
    remainingBudget >= 0;

  const missingPrompt = useMemo(() => {
    if (selectedDrivers.length < 3) {
      return `PICK ${3 - selectedDrivers.length} MORE DRIVER${3 - selectedDrivers.length > 1 ? "S" : ""}`;
    }
    if (!selectedConstructor) return "PICK 1 CONSTRUCTOR";
    if (!selectedPowerUnit) return "PICK 1 POWER UNIT";
    if (remainingBudget < 0) return "OVER $100.0M CAP";
    return "LOCK IN FANTASY TEAM";
  }, [selectedDrivers.length, selectedConstructor, selectedPowerUnit, remainingBudget]);

  const toggleDriver = (driver: FantasyDriverOption) => {
    if (isLocked) return;
    setRosterError(null);
    if (selectedDrivers.includes(driver.driverNumber)) {
      const next = selectedDrivers.filter((n) => n !== driver.driverNumber);
      setSelectedDrivers(next);
      if (turboDriver === driver.driverNumber) {
        setTurboDriver(next[0] ?? null);
      }
      return;
    }
    if (selectedDrivers.length >= 3) return;
    if (remainingBudget < driver.price) return;
    const next = [...selectedDrivers, driver.driverNumber];
    setSelectedDrivers(next);
    if (!turboDriver) setTurboDriver(driver.driverNumber);
  };

  const toggleConstructor = (ctor: FantasyConstructorOption) => {
    if (isLocked) return;
    setRosterError(null);
    if (selectedConstructor === ctor.teamId) {
      setSelectedConstructor(null);
      return;
    }
    const currentCtorPrice = selectedConstructor
      ? FANTASY_CONSTRUCTORS.find((c) => c.teamId === selectedConstructor)
          ?.price || 0
      : 0;
    if (remainingBudget + currentCtorPrice < ctor.price) return;
    setSelectedConstructor(ctor.teamId);
  };

  const togglePowerUnit = (pu: FantasyPowerUnitOption) => {
    if (isLocked) return;
    setRosterError(null);
    if (selectedPowerUnit === pu.id) {
      setSelectedPowerUnit(null);
      return;
    }
    const currentPuPrice = selectedPowerUnit
      ? FANTASY_POWER_UNITS.find((p) => p.id === selectedPowerUnit)?.price || 0
      : 0;
    if (remainingBudget + currentPuPrice < pu.price) return;
    setSelectedPowerUnit(pu.id);
  };

  const whatIfBreakdown = useMemo(() => {
    const activeDriversList =
      selectedDrivers.length > 0
        ? selectedDrivers.map(
            (num) =>
              FANTASY_DRIVERS.find((d) => d.driverNumber === num) ||
              FANTASY_DRIVERS[0]
          )
        : [FANTASY_DRIVERS[0], FANTASY_DRIVERS[6], FANTASY_DRIVERS[3]];

    const activeCtor =
      FANTASY_CONSTRUCTORS.find((c) => c.teamId === selectedConstructor) ||
      FANTASY_CONSTRUCTORS[2];

    const activePu =
      FANTASY_POWER_UNITS.find((p) => p.id === selectedPowerUnit) ||
      FANTASY_POWER_UNITS[0];

    const scenarioScores =
      simScenario === "p1_p5_win"
        ? [25, 10, 6]
        : simScenario === "podium_sweep"
        ? [25, 18, 15]
        : [12, 8, 4];

    const driverRows = activeDriversList.map((drv, i) => {
      const basePts = scenarioScores[i] ?? 4;
      const isTurbo = turboDriver === drv.driverNumber;
      const finalPts = isTurbo ? basePts * 2 : basePts;
      return {
        code: drv.code,
        name: drv.fullName,
        basePts,
        isTurbo,
        finalPts,
      };
    });

    const driverTotal = driverRows.reduce((s, r) => s + r.finalPts, 0);
    const constructorPts =
      simScenario === "p1_p5_win"
        ? 35
        : simScenario === "podium_sweep"
        ? 43
        : 20;
    const powerUnitPts =
      simScenario === "p1_p5_win"
        ? 18
        : simScenario === "podium_sweep"
        ? 24
        : 12;

    return {
      driverRows,
      driverTotal,
      constructorName: activeCtor.shortName,
      constructorPts,
      powerUnitName: activePu.shortName,
      powerUnitPts,
      grandTotal: driverTotal + constructorPts + powerUnitPts,
      isExamplePreview: selectedDrivers.length === 0,
    };
  }, [
    selectedDrivers,
    selectedConstructor,
    selectedPowerUnit,
    turboDriver,
    simScenario,
  ]);

  // Save Locked Lineup directly into Supabase DB (so localhost & deployed site match)
  const handleLockRoster = async () => {
    setRosterError(null);
    if (!user || !supabase) {
      setRosterError("PLEASE SIGN IN WITH GOOGLE FIRST.");
      return;
    }
    if (
      selectedDrivers.length !== 3 ||
      !selectedConstructor ||
      !selectedPowerUnit ||
      turboDriver === null ||
      remainingBudget < 0
    ) {
      setRosterError(
        "SELECT 3 DRIVERS, 1 CONSTRUCTOR, AND 1 POWER UNIT WITHIN $100.0M BEFORE LOCKING."
      );
      return;
    }

    setLockingRoster(true);
    try {
      const { error } = await supabase.from("fantasy_rosters").upsert(
        {
          user_id: user.id,
          driver_numbers: selectedDrivers,
          constructor_ids: [selectedConstructor],
          power_unit_id: selectedPowerUnit,
          turbo_driver: turboDriver,
          is_locked: true,
          locked_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        setRosterError(
          `SUPABASE DB SAVE ERROR: ${error.message.toUpperCase()} — RUN THE CLEAN FANTASY_ROSTERS SQL IN SUPABASE.`
        );
        setLockingRoster(false);
        return;
      }

      await loadFantasyData();
      setPointsNotice(
        "FANTASY TEAM SAVED & LOCKED IN DATABASE! SYNCED ACROSS ALL DEVICES."
      );
    } finally {
      setLockingRoster(false);
    }
  };

  // Full Fantasy Reset in Supabase DB (Erases all points + unlocks clean new team)
  const handleFullFantasyReset = async () => {
    if (!user || !supabase) return;
    setLockingRoster(true);
    setRosterError(null);
    try {
      const { error: delErr } = await supabase
        .from("fantasy_rosters")
        .delete()
        .eq("user_id", user.id);

      if (delErr) {
        setRosterError(`SUPABASE RESET ERROR: ${delErr.message.toUpperCase()}`);
        setLockingRoster(false);
        return;
      }

      const { error: profErr } = await supabase
        .from("fantasy_profiles")
        .update({
          total_points: 0,
          scored_rounds: [],
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (profErr) {
        setRosterError(`POINTS RESET ERROR: ${profErr.message.toUpperCase()}`);
        setLockingRoster(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(`apex_locked_roster_${user.id}`);
      }

      setShowResetConfirm(false);
      onPointsUpdated?.(0);
      setPointsNotice(
        "TEAM RESET COMPLETE IN DATABASE. ALL POINTS ERASED (0 PTS) — DRAFT YOUR NEW LINEUP."
      );
      await loadFantasyData();
    } finally {
      setLockingRoster(false);
    }
  };

  const handleSyncOfficialPoints = async () => {
    if (!user || !supabase || !profile || !lockedRoster) return;
    setSyncingPoints(true);
    setPointsNotice(null);

    try {
      const res = await fetch("/api/predictions/verify?round=last");
      const data = await res.json();

      if (!data.hasResult || !data.round) {
        setPointsNotice("OFFICIAL FIA RESULTS NOT PUBLISHED YET.");
        setSyncingPoints(false);
        return;
      }

      const roundKey = `round_${data.round}`;
      if (profile.scoredRounds.includes(roundKey)) {
        setPointsNotice(
          `ROUND ${data.round} (${data.raceName.toUpperCase()}) POINTS ALREADY AWARDED.`
        );
        setSyncingPoints(false);
        return;
      }

      const podiumOrder = [
        data.actual.p1Driver,
        data.actual.p2Driver,
        data.actual.p3Driver,
      ];

      let earnedDrivers = 0;
      for (const drvNum of lockedRoster.driverNumbers) {
        let drvPts = 5;
        const podiumIdx = podiumOrder.indexOf(drvNum);
        if (podiumIdx !== -1) drvPts += RACE_POINTS_TABLE[podiumIdx];
        if (data.actual.poleDriver === drvNum) drvPts += QUALI_POINTS_TABLE[0];
        if (data.actual.fastestLapDriver === drvNum) drvPts += 10;

        if (drvNum === lockedRoster.turboDriver) {
          drvPts *= 2;
        }
        earnedDrivers += drvPts;
      }

      let earnedConstructor = 0;
      const ctorId = lockedRoster.constructorIds[0];
      if (ctorId) {
        const ctorMeta = F1_TEAMS[ctorId];
        for (const realCarNum of ctorMeta.driverNumbers) {
          const idx = podiumOrder.indexOf(realCarNum);
          if (idx !== -1) earnedConstructor += RACE_POINTS_TABLE[idx];
          else earnedConstructor += 4;
        }
      }

      let earnedPowerUnit = 6;
      const puMeta = FANTASY_POWER_UNITS.find(
        (p) => p.id === lockedRoster.powerUnitId
      );
      if (puMeta) {
        podiumOrder.forEach((podiumCarNum, idx) => {
          const drvMeta = FANTASY_DRIVERS.find(
            (d) => d.driverNumber === podiumCarNum
          );
          if (drvMeta && puMeta.suppliedTeams.includes(drvMeta.teamId)) {
            earnedPowerUnit += idx === 0 ? 12 : idx === 1 ? 8 : 5;
          }
        });
      }

      const totalEarned = earnedDrivers + earnedConstructor + earnedPowerUnit;
      const updatedTotal = profile.totalPoints + totalEarned;
      const updatedRounds = [...profile.scoredRounds, roundKey];

      const { error } = await supabase
        .from("fantasy_profiles")
        .update({
          total_points: updatedTotal,
          scored_rounds: updatedRounds,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        setRosterError(`POINTS SAVE ERROR: ${error.message.toUpperCase()}`);
        setSyncingPoints(false);
        return;
      }

      onPointsUpdated?.(updatedTotal);
      setPointsNotice(
        `+${totalEarned} PTS AWARDED FOR ${data.raceName.toUpperCase()} (DRIVERS +${earnedDrivers} • CONSTRUCTOR +${earnedConstructor} • POWER UNIT +${earnedPowerUnit})!`
      );
      await loadFantasyData();
    } catch {
      setPointsNotice("FAILED TO SYNC FIA RESULTS.");
    } finally {
      setSyncingPoints(false);
    }
  };

  if (loadingData) {
    return (
      <div className="f1-hud-panel flex h-64 items-center justify-center font-mono-telemetry text-xs tracking-[0.22em] text-white/50 uppercase">
        LOADING APEX FANTASY PADDOCK
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="f1-hud-panel max-h-[88vh] w-full max-w-2xl overflow-y-auto border border-white/20 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-mono-telemetry text-[10px] font-bold tracking-[0.22em] text-[#E10600] uppercase">
                  OFFICIAL REGULATIONS
                </span>
                <h2 className="mt-1 text-xl font-light tracking-[0.08em] text-white uppercase sm:text-2xl">
                  APEX <strong className="font-bold">FANTASY RULES</strong>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="border border-white/15 p-2 text-white/60 hover:border-white hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3.5 text-xs leading-relaxed text-white/75">
              <div className="border border-white/10 bg-white/[0.02] p-3.5">
                <div className="font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                  01 • 3 DRIVERS + 1 CONSTRUCTOR + 1 POWER UNIT ($100.0M CAP)
                </div>
                <p className="mt-1 text-white/60">
                  Draft <strong className="text-white">3 Drivers</strong>,{" "}
                  <strong className="text-white">1 Constructor</strong>, and{" "}
                  <strong className="text-white">1 Power Unit</strong> within{" "}
                  <strong className="text-white">$100.0M</strong>. Assign{" "}
                  <strong className="text-[#FFD100]">2× TURBO</strong> to one
                  driver for double points.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-3.5">
                <div className="font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                  02 • HOW POINTS STACK (DRIVERS + CONSTRUCTOR + POWER UNIT)
                </div>
                <p className="mt-1 text-white/60">
                  If Max scores <strong className="text-white">25 pts</strong>{" "}
                  and Kimi scores <strong className="text-white">10 pts</strong>
                  , you get <strong className="text-white">35 pts</strong> from
                  those drivers, plus your Constructor earns{" "}
                  <strong className="text-white">+35 pts</strong> from its two
                  cars, plus your Power Unit adds engine points on top.
                </p>
              </div>

              <div className="border border-[#E10600]/40 bg-[#E10600]/10 p-3.5">
                <div className="font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-[#FF4D4D] uppercase">
                  03 • PERMANENT LINEUP LOCK &amp; FULL RESET RULE
                </div>
                <p className="mt-1 text-white/75">
                  Once locked in, your Fantasy Team cannot be edited. Clicking{" "}
                  <strong className="text-white">RESET &amp; NEW TEAM</strong>{" "}
                  erases all accumulated points back to{" "}
                  <strong className="text-white">0 PTS</strong> so you can
                  draft a fresh roster.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="mt-6 w-full bg-white py-3 text-xs font-bold tracking-[0.22em] text-black uppercase transition hover:bg-white/90"
            >
              ACKNOWLEDGE &amp; CONTINUE
            </button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="f1-hud-panel w-full max-w-md border border-[#E10600] p-6">
            <div className="flex items-center gap-2 font-mono-telemetry text-xs font-bold tracking-[0.2em] text-[#E10600] uppercase">
              <AlertTriangle className="h-4 w-4" />
              RESET TEAM &amp; ERASE ALL POINTS
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/75">
              Starting a clean new team will{" "}
              <strong className="text-white">
                permanently erase your {profile?.totalPoints ?? 0} Fantasy
                Points
              </strong>{" "}
              and reset your championship score to{" "}
              <strong className="text-white">0 PTS</strong>. Are you sure?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 border border-white/20 py-2.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase hover:bg-white/10"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={lockingRoster}
                onClick={handleFullFantasyReset}
                className="flex-1 bg-[#E10600] py-2.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase hover:bg-[#E10600]/90"
              >
                {lockingRoster ? "RESETTING..." : "ERASE POINTS & RESET"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="f1-hud-panel flex flex-col items-center justify-center p-10 text-center">
          <Lock className="h-8 w-8 text-[#E10600]" />
          <h2 className="mt-3 text-lg font-bold tracking-[0.16em] text-white uppercase">
            PADDOCK PASS REQUIRED
          </h2>
          <p className="mt-1.5 max-w-md text-xs text-white/60">
            Sign in with Google to register a unique Display Name, build your
            $100.0M F1 Fantasy lineup, and compete on the Championship
            Leaderboard.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-5 bg-white px-6 py-3 text-xs font-bold tracking-[0.2em] text-black uppercase hover:bg-white/90"
          >
            SIGN IN WITH GOOGLE
          </button>
        </div>
      )}

      {user && !profile && (
        <div className="f1-hud-panel mx-auto max-w-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="font-mono-telemetry text-[10px] font-bold tracking-[0.22em] text-[#E10600] uppercase">
                FANTASY ENTRY REGISTRATION
              </span>
              <h2 className="mt-1 text-xl font-light tracking-[0.08em] text-white uppercase sm:text-2xl">
                CREATE YOUR <strong className="font-bold">TEAM IDENTITY</strong>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] text-white/80 uppercase hover:border-white"
            >
              <Info className="h-3.5 w-3.5" />
              RULES
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  UNIQUE DISPLAY NAME
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="e.g. VerstappenFan01"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="mt-1.5 w-full border border-white/20 bg-[#07090D] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-white"
                />
                <span className="mt-1 block font-mono-telemetry text-[9px] text-white/40 uppercase">
                  NO DUPLICATE DISPLAY NAMES ALLOWED
                </span>
              </div>

              <div>
                <label className="block font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  FANTASY TEAM NAME
                </label>
                <input
                  type="text"
                  required
                  maxLength={28}
                  placeholder="e.g. Apex Racing GP"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  className="mt-1.5 w-full border border-white/20 bg-[#07090D] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  TEAM CREST • CHOOSE PREMADE OR UPLOAD LOGO
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 border border-white/25 bg-white/10 px-3 py-1 font-mono-telemetry text-[10px] font-bold tracking-[0.15em] text-white uppercase hover:bg-white hover:text-black">
                  <Upload className="h-3 w-3" />
                  UPLOAD IMAGE
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                {PREMADE_LOGOS.map((preset) => {
                  const token = `preset:${preset.id}`;
                  const active = selectedLogo === token;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedLogo(token)}
                      className={`flex flex-col items-center gap-1.5 border p-2 transition ${
                        active
                          ? "border-white bg-white/15"
                          : "border-white/10 bg-white/[0.02] hover:border-white/35"
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center font-mono-telemetry text-[10px] font-black"
                        style={{ backgroundColor: preset.bg, color: preset.fg }}
                      >
                        {preset.mark}
                      </div>
                      <span className="truncate font-mono-telemetry text-[8px] text-white/60">
                        {preset.mark}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-3 border border-white/10 bg-white/[0.02] p-2.5">
                <FantasyLogoBadge logoUrl={selectedLogo} size="md" />
                <div className="font-mono-telemetry text-[10px] text-white/65 uppercase">
                  ACTIVE TEAM CREST PREVIEW
                </div>
              </div>
            </div>

            {profileError && (
              <div className="border border-[#E10600] bg-[#E10600]/15 px-3.5 py-2 font-mono-telemetry text-[10px] font-bold text-[#FF4D4D] uppercase">
                {profileError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-white py-3.5 text-xs font-bold tracking-[0.22em] text-black uppercase transition hover:bg-white/90"
            >
              {savingProfile
                ? "REGISTERING TEAM..."
                : "REGISTER & ENTER FANTASY GARAGE"}
            </button>
          </form>
        </div>
      )}

      {user && profile && (
        <>
          <div className="f1-hud-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <FantasyLogoBadge logoUrl={profile.logoUrl} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-[0.12em] text-white uppercase">
                    {profile.teamName}
                  </h2>
                  <span className="border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono-telemetry text-[9px] text-white/70 uppercase">
                    @{profile.displayName}
                  </span>
                </div>
                <div className="mt-0.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] text-[#FFD100] uppercase">
                  CHAMPIONSHIP SCORE: {profile.totalPoints} PTS
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("lineup")}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] uppercase transition ${
                  activeSubTab === "lineup"
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <Users className="h-3 w-3" />
                MY LINEUP
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("leaderboard")}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] uppercase transition ${
                  activeSubTab === "leaderboard"
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <Trophy className="h-3 w-3" />
                LEADERBOARD ({leaderboard.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("profile")}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] uppercase transition ${
                  activeSubTab === "profile"
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <UserCog className="h-3 w-3" />
                PROFILE
              </button>

              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="inline-flex items-center gap-1 border border-white/15 bg-white/[0.03] px-2.5 py-1.5 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] text-white/60 uppercase hover:border-white hover:text-white"
              >
                <Info className="h-3 w-3" />
                RULES
              </button>
            </div>
          </div>

          {rosterError && (
            <div className="flex items-center justify-between border border-[#E10600] bg-[#E10600]/20 px-4 py-2.5 font-mono-telemetry text-[10px] font-bold tracking-[0.14em] text-[#FF6B6B] uppercase">
              <span>{rosterError}</span>
              <button
                type="button"
                onClick={() => setRosterError(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {pointsNotice && (
            <div className="flex items-center justify-between border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 font-mono-telemetry text-[10px] font-bold tracking-[0.16em] text-emerald-300 uppercase">
              <span>{pointsNotice}</span>
              <button
                type="button"
                onClick={() => setPointsNotice(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {activeSubTab === "lineup" && (
            <div className="space-y-4">
              <div className="f1-hud-panel flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="block font-mono-telemetry text-[9px] tracking-[0.2em] text-white/45 uppercase">
                      {isLocked ? "LOCKED TEAM BUDGET" : "REMAINING BUDGET"}
                    </span>
                    <span
                      className={`font-mono-telemetry text-xl font-bold ${
                        remainingBudget < 0 ? "text-[#E10600]" : "text-[#00D26A]"
                      }`}
                    >
                      ${remainingBudget.toFixed(1)}M
                    </span>
                    <span className="ml-1 font-mono-telemetry text-[10px] text-white/40">
                      / $100.0M
                    </span>
                  </div>

                  <div>
                    <span className="block font-mono-telemetry text-[9px] tracking-[0.2em] text-white/45 uppercase">
                      ROSTER STATUS
                    </span>
                    <span className="font-mono-telemetry text-sm font-bold text-white">
                      {isLocked
                        ? "LOCKED • SYNCED IN DATABASE"
                        : `${selectedDrivers.length}/3 DRIVERS • ${
                            selectedConstructor ? 1 : 0
                          }/1 CONSTRUCTOR • ${
                            selectedPowerUnit ? 1 : 0
                          }/1 POWER UNIT`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {isLocked ? (
                    <>
                      <button
                        type="button"
                        disabled={syncingPoints}
                        onClick={handleSyncOfficialPoints}
                        className="inline-flex items-center gap-1.5 border border-[#00D26A] bg-[#00D26A]/15 px-4 py-2.5 font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-[#00D26A] uppercase transition hover:bg-[#00D26A] hover:text-black"
                      >
                        <Award className="h-3.5 w-3.5" />
                        {syncingPoints
                          ? "SCORING FIA RESULTS..."
                          : "CLAIM RACE POINTS"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(true)}
                        className="inline-flex items-center gap-1.5 border border-[#E10600] bg-[#E10600]/20 px-4 py-2.5 font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white uppercase transition hover:bg-[#E10600]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        RESET &amp; NEW TEAM (ERASES ALL POINTS)
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!isRosterComplete || lockingRoster}
                      onClick={handleLockRoster}
                      className="inline-flex items-center gap-2 bg-white px-6 py-2.5 text-xs font-bold tracking-[0.2em] text-black uppercase transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {lockingRoster ? "LOCKING LINEUP..." : missingPrompt}
                    </button>
                  )}
                </div>
              </div>

              <div className="f1-hud-panel p-4">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-mono-telemetry text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                    {isLocked
                      ? "LOCKED ACTIVE LINEUP • 3 DRIVERS + 1 CONSTRUCTOR + 1 POWER UNIT"
                      : "ACTIVE DRAFT LINEUP • SELECT 3 DRIVERS, 1 CONSTRUCTOR & 1 POWER UNIT"}
                  </span>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 border border-[#00D26A]/40 bg-[#00D26A]/10 px-2 py-0.5 font-mono-telemetry text-[9px] font-bold text-[#00D26A] uppercase">
                      <Lock className="h-3 w-3" />
                      PERMANENTLY LOCKED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
                  {Array.from({ length: 3 }).map((_, idx) => {
                    const drvNum = selectedDrivers[idx];
                    const drv = FANTASY_DRIVERS.find(
                      (d) => d.driverNumber === drvNum
                    );
                    const isTurbo = drv && turboDriver === drv.driverNumber;

                    return (
                      <div
                        key={`slot-d-${idx}`}
                        className={`flex flex-col justify-between border p-3 ${
                          drv
                            ? isTurbo
                              ? "border-[#FFD100] bg-[#FFD100]/10"
                              : "border-white/20 bg-white/[0.04]"
                            : "border-dashed border-white/15 bg-white/[0.01]"
                        }`}
                      >
                        {drv ? (
                          <>
                            <div className="flex items-center justify-between">
                              <DriverAvatar
                                driverNumber={drv.driverNumber}
                                code={drv.code}
                                teamId={drv.teamId}
                                size="sm"
                              />
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() => toggleDriver(drv)}
                                  className="text-white/40 hover:text-[#E10600]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="text-xs font-bold text-white uppercase">
                                {drv.fullName}
                              </div>
                              <div className="font-mono-telemetry text-[9px] text-white/50">
                                ${drv.price.toFixed(1)}M
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => {
                                if (!isLocked) setTurboDriver(drv.driverNumber);
                              }}
                              className={`mt-2.5 flex w-full items-center justify-center gap-1 py-1 font-mono-telemetry text-[9px] font-bold tracking-wider uppercase ${
                                isTurbo
                                  ? "bg-[#FFD100] text-black"
                                  : isLocked
                                  ? "border border-white/10 text-white/25 cursor-not-allowed"
                                  : "border border-white/15 text-white/50 hover:text-white"
                              }`}
                            >
                              <Flame className="h-3 w-3" />
                              {isTurbo
                                ? "2× TURBO CAPTAIN"
                                : isLocked
                                ? "STANDARD DRIVER"
                                : "SET 2× TURBO"}
                            </button>
                          </>
                        ) : (
                          <div className="flex h-24 items-center justify-center font-mono-telemetry text-[10px] text-white/30 uppercase">
                            DRIVER {idx + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(() => {
                    const ctor = FANTASY_CONSTRUCTORS.find(
                      (c) => c.teamId === selectedConstructor
                    );
                    return (
                      <div
                        className={`flex flex-col justify-between border p-3 ${
                          ctor
                            ? "border-white/30 bg-white/[0.06]"
                            : "border-dashed border-white/15 bg-white/[0.01]"
                        }`}
                      >
                        {ctor ? (
                          <>
                            <div className="flex items-center justify-between">
                              <TeamLogo teamId={ctor.teamId} size="sm" />
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() => toggleConstructor(ctor)}
                                  className="text-white/40 hover:text-[#E10600]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="truncate text-xs font-bold text-white uppercase">
                                {ctor.shortName}
                              </div>
                              <div className="font-mono-telemetry text-[9px] text-white/50">
                                ${ctor.price.toFixed(1)}M
                              </div>
                            </div>
                            <div className="mt-2.5 border border-white/15 py-1 text-center font-mono-telemetry text-[8px] font-bold text-white/70 uppercase">
                              CONSTRUCTOR
                            </div>
                          </>
                        ) : (
                          <div className="flex h-24 items-center justify-center font-mono-telemetry text-[10px] text-white/30 uppercase">
                            CONSTRUCTOR
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(() => {
                    const pu = FANTASY_POWER_UNITS.find(
                      (p) => p.id === selectedPowerUnit
                    );
                    return (
                      <div
                        className={`flex flex-col justify-between border p-3 ${
                          pu
                            ? "border-white/30 bg-white/[0.06]"
                            : "border-dashed border-white/15 bg-white/[0.01]"
                        }`}
                      >
                        {pu ? (
                          <>
                            <div className="flex items-center justify-between">
                              <Cpu
                                className="h-5 w-5"
                                style={{ color: pu.accentColor }}
                              />
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() => togglePowerUnit(pu)}
                                  className="text-white/40 hover:text-[#E10600]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="truncate text-xs font-bold text-white uppercase">
                                {pu.shortName}
                              </div>
                              <div className="font-mono-telemetry text-[9px] text-white/50">
                                ${pu.price.toFixed(1)}M
                              </div>
                            </div>
                            <div className="mt-2.5 border border-white/15 py-1 text-center font-mono-telemetry text-[8px] font-bold text-white/70 uppercase">
                              POWER UNIT
                            </div>
                          </>
                        ) : (
                          <div className="flex h-24 items-center justify-center font-mono-telemetry text-[10px] text-white/30 uppercase">
                            POWER UNIT
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="f1-hud-panel p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-[#FFD100]" />
                    <span className="font-mono-telemetry text-[10px] font-bold tracking-[0.2em] text-white uppercase">
                      {profile.teamName} • LIVE SCORING BREAKDOWN SIMULATOR
                    </span>
                    {whatIfBreakdown.isExamplePreview && (
                      <span className="border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono-telemetry text-[8px] text-white/55 uppercase">
                        SAMPLE PREVIEW (PICK DRIVERS TO UPDATE LIVE)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSimScenario("p1_p5_win")}
                      className={`border px-2.5 py-1 font-mono-telemetry text-[9px] font-bold uppercase ${
                        simScenario === "p1_p5_win"
                          ? "border-[#FFD100] bg-[#FFD100] text-black"
                          : "border-white/15 text-white/60 hover:text-white"
                      }`}
                    >
                      SCENARIO: P1 WIN (25) + P5 (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimScenario("podium_sweep")}
                      className={`border px-2.5 py-1 font-mono-telemetry text-[9px] font-bold uppercase ${
                        simScenario === "podium_sweep"
                          ? "border-[#FFD100] bg-[#FFD100] text-black"
                          : "border-white/15 text-white/60 hover:text-white"
                      }`}
                    >
                      SCENARIO: 1-2-3 PODIUM SWEEP
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimScenario("points_finish")}
                      className={`border px-2.5 py-1 font-mono-telemetry text-[9px] font-bold uppercase ${
                        simScenario === "points_finish"
                          ? "border-[#FFD100] bg-[#FFD100] text-black"
                          : "border-white/15 text-white/60 hover:text-white"
                      }`}
                    >
                      SCENARIO: TOP-8 FINISH
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {whatIfBreakdown.driverRows.map((row, idx) => (
                      <div
                        key={`${row.code}-${idx}`}
                        className="border border-white/10 bg-white/[0.02] p-2.5"
                      >
                        <div className="flex items-center justify-between font-mono-telemetry text-[9px] text-white/45 uppercase">
                          <span>DRIVER {idx + 1}</span>
                          {row.isTurbo && (
                            <span className="text-[#FFD100]">2× TURBO</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-bold text-white uppercase">
                          {row.name}
                        </div>
                        <div className="mt-1.5 font-mono-telemetry text-xs font-bold text-[#00D26A]">
                          +{row.finalPts} PTS{" "}
                          {row.isTurbo && (
                            <span className="text-[9px] text-white/45">
                              ({row.basePts} × 2)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col justify-between border border-white/15 bg-[#07090D] p-3">
                    <div className="space-y-1 font-mono-telemetry text-[10px]">
                      <div className="flex justify-between text-white/70">
                        <span>3 DRIVERS COMBINED:</span>
                        <span className="font-bold text-white">
                          +{whatIfBreakdown.driverTotal} PTS
                        </span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>
                          CONSTRUCTOR ({whatIfBreakdown.constructorName}):
                        </span>
                        <span className="font-bold text-white">
                          +{whatIfBreakdown.constructorPts} PTS
                        </span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>
                          POWER UNIT ({whatIfBreakdown.powerUnitName}):
                        </span>
                        <span className="font-bold text-white">
                          +{whatIfBreakdown.powerUnitPts} PTS
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="font-mono-telemetry text-[10px] font-bold tracking-wider text-white/60 uppercase">
                        {profile.teamName} RACE HAUL
                      </span>
                      <span className="font-mono-telemetry text-base font-black text-[#FFD100]">
                        +{whatIfBreakdown.grandTotal} PTS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!isLocked && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <div className="f1-hud-panel p-4">
                    <h3 className="mb-3 border-b border-white/10 pb-2 font-mono-telemetry text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                      2026 DRIVER MARKET (SELECT 3)
                    </h3>
                    <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {FANTASY_DRIVERS.map((drv) => {
                        const isPicked = selectedDrivers.includes(
                          drv.driverNumber
                        );
                        const unaffordable =
                          !isPicked && remainingBudget < drv.price;
                        const team = F1_TEAMS[drv.teamId];

                        return (
                          <button
                            key={drv.driverNumber}
                            type="button"
                            disabled={
                              unaffordable ||
                              (!isPicked && selectedDrivers.length >= 3)
                            }
                            onClick={() => toggleDriver(drv)}
                            className={`flex items-center justify-between border p-2.5 text-left transition ${
                              isPicked
                                ? "border-white bg-white/15"
                                : "border-white/10 bg-white/[0.02] hover:border-white/35 disabled:opacity-35"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <DriverAvatar
                                driverNumber={drv.driverNumber}
                                code={drv.code}
                                teamId={drv.teamId}
                                size="sm"
                              />
                              <div>
                                <div className="text-xs font-bold text-white uppercase">
                                  {drv.fullName}
                                </div>
                                <div
                                  className="font-mono-telemetry text-[9px] font-semibold uppercase"
                                  style={{ color: team.primaryColor }}
                                >
                                  {team.shortName}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono-telemetry text-xs font-bold text-white">
                              ${drv.price.toFixed(1)}M
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="f1-hud-panel p-4">
                      <h3 className="mb-2.5 border-b border-white/10 pb-2 font-mono-telemetry text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                        2026 CONSTRUCTORS (SELECT 1)
                      </h3>
                      <div className="grid max-h-[175px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                        {FANTASY_CONSTRUCTORS.map((ctor) => {
                          const isPicked = selectedConstructor === ctor.teamId;
                          return (
                            <button
                              key={ctor.teamId}
                              type="button"
                              onClick={() => toggleConstructor(ctor)}
                              className={`flex items-center justify-between border px-2.5 py-2 text-left transition ${
                                isPicked
                                  ? "border-white bg-white/15"
                                  : "border-white/10 bg-white/[0.02] hover:border-white/35"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <TeamLogo teamId={ctor.teamId} size="sm" />
                                <span className="truncate text-[11px] font-bold text-white uppercase">
                                  {ctor.shortName}
                                </span>
                              </div>
                              <span className="font-mono-telemetry text-[10px] font-bold text-white">
                                ${ctor.price.toFixed(1)}M
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="f1-hud-panel p-4">
                      <h3 className="mb-2.5 border-b border-white/10 pb-2 font-mono-telemetry text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
                        2026 POWER UNITS (SELECT 1)
                      </h3>
                      <div className="space-y-1.5">
                        {FANTASY_POWER_UNITS.map((pu) => {
                          const isPicked = selectedPowerUnit === pu.id;
                          return (
                            <button
                              key={pu.id}
                              type="button"
                              onClick={() => togglePowerUnit(pu)}
                              className={`flex w-full items-center justify-between border px-3 py-2 text-left transition ${
                                isPicked
                                  ? "border-white bg-white/15"
                                  : "border-white/10 bg-white/[0.02] hover:border-white/35"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Cpu
                                  className="h-4 w-4 shrink-0"
                                  style={{ color: pu.accentColor }}
                                />
                                <div>
                                  <div className="text-[11px] font-bold text-white uppercase">
                                    {pu.shortName}
                                  </div>
                                  <div className="font-mono-telemetry text-[8px] text-white/45 uppercase">
                                    SUPPLIES{" "}
                                    {pu.suppliedTeams
                                      .map((t) => F1_TEAMS[t].shortName)
                                      .join(" • ")}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono-telemetry text-[11px] font-bold text-white">
                                ${pu.price.toFixed(1)}M
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === "leaderboard" && (
            <div className="f1-hud-panel p-5">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-[#FFD100]" />
                  <h3 className="text-sm font-bold tracking-[0.14em] text-white uppercase">
                    GLOBAL FANTASY CONSTRUCTORS LEADERBOARD
                  </h3>
                </div>
                <span className="font-mono-telemetry text-[10px] text-white/45 uppercase">
                  RANKED BY FIA RACE POINTS
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.userId === user.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between px-3 py-3 ${
                        isMe ? "bg-white/[0.08]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-6 font-mono-telemetry text-sm font-bold ${
                            idx === 0
                              ? "text-[#FFD100]"
                              : idx === 1
                              ? "text-white"
                              : idx === 2
                              ? "text-amber-500"
                              : "text-white/45"
                          }`}
                        >
                          P{idx + 1}
                        </span>
                        <FantasyLogoBadge logoUrl={entry.logoUrl} size="sm" />
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                            <span>{entry.teamName}</span>
                            {isMe && (
                              <span className="bg-white px-1.5 py-0.5 font-mono-telemetry text-[8px] font-black text-black">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="font-mono-telemetry text-[10px] text-white/50">
                            @{entry.displayName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono-telemetry text-base font-bold text-white">
                          {entry.totalPoints}
                        </span>
                        <span className="ml-1 font-mono-telemetry text-[10px] text-white/45 uppercase">
                          PTS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSubTab === "profile" && (
            <div className="f1-hud-panel mx-auto max-w-2xl p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <Shield className="h-4 w-4 text-[#E10600]" />
                <h3 className="text-sm font-bold tracking-[0.14em] text-white uppercase">
                  FANTASY PROFILE &amp; TEAM BRANDING
                </h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                      DISPLAY NAME (MUST BE UNIQUE)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={24}
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="mt-1.5 w-full border border-white/20 bg-[#07090D] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                      FANTASY TEAM NAME
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={28}
                      value={teamNameInput}
                      onChange={(e) => setTeamNameInput(e.target.value)}
                      className="mt-1.5 w-full border border-white/20 bg-[#07090D] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-mono-telemetry text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                      UPDATE TEAM CREST
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 border border-white/25 bg-white/10 px-3 py-1 font-mono-telemetry text-[10px] font-bold tracking-[0.15em] text-white uppercase hover:bg-white hover:text-black">
                      <Upload className="h-3 w-3" />
                      UPLOAD NEW LOGO
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {PREMADE_LOGOS.map((preset) => {
                      const token = `preset:${preset.id}`;
                      const active = selectedLogo === token;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedLogo(token)}
                          className={`flex flex-col items-center gap-1 border p-2 transition ${
                            active
                              ? "border-white bg-white/15"
                              : "border-white/10 bg-white/[0.02] hover:border-white/35"
                          }`}
                        >
                          <div
                            className="flex h-7 w-7 items-center justify-center font-mono-telemetry text-[9px] font-black"
                            style={{
                              backgroundColor: preset.bg,
                              color: preset.fg,
                            }}
                          >
                            {preset.mark}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {profileError && (
                  <div className="border border-[#E10600] bg-[#E10600]/15 px-3.5 py-2 font-mono-telemetry text-[10px] font-bold text-[#FF4D4D] uppercase">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="flex items-center gap-2 border border-emerald-400/50 bg-emerald-400/15 px-3.5 py-2 font-mono-telemetry text-[10px] font-bold text-emerald-300 uppercase">
                    <Check className="h-3.5 w-3.5" />
                    {profileSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-white px-6 py-3 text-xs font-bold tracking-[0.2em] text-black uppercase transition hover:bg-white/90"
                >
                  {savingProfile ? "SAVING..." : "SAVE PROFILE CHANGES"}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}