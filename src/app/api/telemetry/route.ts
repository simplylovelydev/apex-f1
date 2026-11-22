import { NextRequest, NextResponse } from "next/server";
import { ConstructorId, DriverTimingRow, F1_TEAMS } from "@/types/f1";

const OPENF1_BASE = "https://api.openf1.org/v1";
const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const MULTIVIEWER_BASE = "https://api.multiviewer.app/api/v1";

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };
  date: string;
  time?: string;
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  SprintQualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
}

interface CachedSessionPayload {
  expiresAt: number;
  standings: DriverTimingRow[];
  realCarLocations: Array<{ driverNumber: number; x: number; y: number }>;
  rcSamples: Array<{
    category?: string;
    flag?: string;
    message?: string;
    lap_number?: number;
    date?: string;
  }>;
  radioSamples: Array<{
    driver_number: number;
    recording_url: string;
    date: string;
  }>;
}

const SESSION_CACHE = new Map<number, CachedSessionPayload>();
const CAR_DATA_CACHE = new Map<
  string,
  {
    expiresAt: number;
    telemetry: {
      driverNumber: number;
      speed: number;
      rpm: number;
      gear: number;
      throttle: number;
      brake: number;
      drs: number;
      timestamp: string;
    };
  }
>();

let CALENDAR_CACHE: {
  expiresAt: number;
  isRaceLive: boolean;
  nextRace: {
    round: string;
    raceName: string;
    circuitName: string;
    locality: string;
    country: string;
    raceStartIso: string;
    sessions: Array<{ name: string; isoTime: string }>;
  } | null;
} | null = null;

let TRACKS_CACHE: {
  expiresAt: number;
  availableTracks: Array<{
    circuitKey: number;
    name: string;
    country: string;
    year: number;
    sessionKey: number;
  }>;
  activeSession: {
    session_key: number;
    session_name: string;
    country_name: string;
    circuit_key: number;
    circuit_short_name: string;
    year: number;
  } | null;
} | null = null;

function resolveTeamId(rawTeam?: string): ConstructorId {
  if (!rawTeam) return "red_bull";
  const t = rawTeam.toLowerCase();
  if (t.includes("red bull")) return "red_bull";
  if (t.includes("mclaren")) return "mclaren";
  if (t.includes("ferrari")) return "ferrari";
  if (t.includes("mercedes")) return "mercedes";
  if (t.includes("aston")) return "aston_martin";
  if (t.includes("williams")) return "williams";
  if (t.includes("alpine")) return "alpine";
  if (t.includes("haas")) return "haas";
  if (t.includes("racing bulls") || t === "rb") return "rb";
  if (t.includes("audi") || t.includes("sauber")) return "audi";
  if (t.includes("cadillac")) return "cadillac";
  return "red_bull";
}

function buildScheduleSessions(race: JolpicaRace) {
  const sessions: Array<{ name: string; isoTime: string }> = [];
  if (race.FirstPractice) {
    sessions.push({
      name: "PRACTICE 1",
      isoTime: `${race.FirstPractice.date}T${race.FirstPractice.time}`,
    });
  }
  if (race.SecondPractice) {
    sessions.push({
      name: "PRACTICE 2",
      isoTime: `${race.SecondPractice.date}T${race.SecondPractice.time}`,
    });
  }
  if (race.SprintQualifying) {
    sessions.push({
      name: "SPRINT QUALIFYING",
      isoTime: `${race.SprintQualifying.date}T${race.SprintQualifying.time}`,
    });
  }
  if (race.ThirdPractice) {
    sessions.push({
      name: "PRACTICE 3",
      isoTime: `${race.ThirdPractice.date}T${race.ThirdPractice.time}`,
    });
  }
  if (race.Sprint) {
    sessions.push({
      name: "SPRINT RACE",
      isoTime: `${race.Sprint.date}T${race.Sprint.time}`,
    });
  }
  if (race.Qualifying) {
    sessions.push({
      name: "QUALIFYING",
      isoTime: `${race.Qualifying.date}T${race.Qualifying.time}`,
    });
  }
  sessions.push({
    name: "GRAND PRIX RACE",
    isoTime: `${race.date}T${race.time || "14:00:00Z"}`,
  });
  return sessions;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const driverNumber = Number(searchParams.get("driver") || 3);
  const requestedCircuitKey = searchParams.get("circuitKey");
  const now = Date.now();

  // 1. Cached Jolpica Season Calendar (10-minute TTL)
  let isRaceLive = false;
  let nextRacePayload = null;

  if (CALENDAR_CACHE && now < CALENDAR_CACHE.expiresAt) {
    isRaceLive = CALENDAR_CACHE.isRaceLive;
    nextRacePayload = CALENDAR_CACHE.nextRace;
  } else {
    try {
      const calRes = await fetch(`${JOLPICA_BASE}/current.json`, {
        next: { revalidate: 600 },
      });
      if (calRes.ok) {
        const calJson = await calRes.json();
        const calendar: JolpicaRace[] =
          calJson?.MRData?.RaceTable?.Races || [];

        for (const race of calendar) {
          const raceStartMs = new Date(
            `${race.date}T${race.time || "14:00:00Z"}`
          ).getTime();
          const fp1StartMs = race.FirstPractice
            ? new Date(
                `${race.FirstPractice.date}T${race.FirstPractice.time}`
              ).getTime()
            : raceStartMs - 48 * 3600 * 1000;

          if (now >= fp1StartMs && now <= raceStartMs + 3 * 3600 * 1000) {
            isRaceLive = true;
          }

          if (raceStartMs + 2 * 3600 * 1000 > now && !nextRacePayload) {
            nextRacePayload = {
              round: race.round,
              raceName: race.raceName,
              circuitName: race.Circuit.circuitName,
              locality: race.Circuit.Location.locality,
              country: race.Circuit.Location.country,
              raceStartIso: `${race.date}T${race.time || "14:00:00Z"}`,
              sessions: buildScheduleSessions(race),
            };
          }
        }

        CALENDAR_CACHE = {
          expiresAt: now + 10 * 60 * 1000,
          isRaceLive,
          nextRace: nextRacePayload,
        };
      }
    } catch {
      if (CALENDAR_CACHE) {
        isRaceLive = CALENDAR_CACHE.isRaceLive;
        nextRacePayload = CALENDAR_CACHE.nextRace;
      }
    }
  }

  // 2. Cached OpenF1 Sessions List (5-minute TTL)
  let availableTracks: Array<{
    circuitKey: number;
    name: string;
    country: string;
    year: number;
    sessionKey: number;
  }> = [];
  let activeSession: {
    session_key: number;
    session_name: string;
    country_name: string;
    circuit_key: number;
    circuit_short_name: string;
    year: number;
  } | null = null;

  if (TRACKS_CACHE && now < TRACKS_CACHE.expiresAt) {
    availableTracks = TRACKS_CACHE.availableTracks;
    activeSession = TRACKS_CACHE.activeSession;
  } else {
    try {
      const sessRes = await fetch(`${OPENF1_BASE}/sessions?session_type=Race`, {
        next: { revalidate: 300 },
      });
      if (sessRes.ok) {
        const allSessions = await sessRes.json();
        const uniqueTracksMap = new Map<
          number,
          {
            circuitKey: number;
            name: string;
            country: string;
            year: number;
            sessionKey: number;
          }
        >();

        for (const s of allSessions) {
          if (new Date(s.date_start).getTime() <= now) {
            uniqueTracksMap.set(s.circuit_key, {
              circuitKey: s.circuit_key,
              name: s.circuit_short_name,
              country: s.country_name,
              year: s.year,
              sessionKey: s.session_key,
            });
          }
        }

        availableTracks = Array.from(uniqueTracksMap.values()).reverse();
        const pastOrLiveSessions = allSessions.filter(
          (s: { date_start: string }) =>
            new Date(s.date_start).getTime() <= now
        );
        activeSession =
          pastOrLiveSessions[pastOrLiveSessions.length - 1] || null;

        TRACKS_CACHE = {
          expiresAt: now + 5 * 60 * 1000,
          availableTracks,
          activeSession,
        };
      }
    } catch {
      if (TRACKS_CACHE) {
        availableTracks = TRACKS_CACHE.availableTracks;
        activeSession = TRACKS_CACHE.activeSession;
      }
    }
  }

  const targetCircuitKey = requestedCircuitKey
    ? Number(requestedCircuitKey)
    : activeSession?.circuit_key || availableTracks[0]?.circuitKey || 2;
  const targetTrack =
    availableTracks.find((t) => t.circuitKey === targetCircuitKey) ||
    availableTracks[0];

  // 3. Initial MultiViewer Circuit Geometry (for first load)
  let trackGeometry: {
    circuitName: string;
    x: number[];
    y: number[];
    rotation: number;
  } | null = null;

  if (targetTrack) {
    try {
      const geoRes = await fetch(
        `${MULTIVIEWER_BASE}/circuits/${targetTrack.circuitKey}/${targetTrack.year}`,
        { next: { revalidate: 86400 } }
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        trackGeometry = {
          circuitName: geo.circuitName || targetTrack.name,
          x: geo.x || [],
          y: geo.y || [],
          rotation: geo.rotation || 0,
        };
      }
    } catch {
      trackGeometry = null;
    }
  }

  // 4. Session-Wide OpenF1 Data (Cached 30s live / 5m off-week) + Single-Driver Car Telemetry
  let standings: DriverTimingRow[] = [];
  let telemetry = null;
  let realCarLocations: Array<{ driverNumber: number; x: number; y: number }> =
    [];
  let rcSamples: CachedSessionPayload["rcSamples"] = [];
  let radioSamples: CachedSessionPayload["radioSamples"] = [];

  if (activeSession) {
    const sk = activeSession.session_key;
    const sessionTtl = isRaceLive ? 25 * 1000 : 5 * 60 * 1000;
    const cachedSession = SESSION_CACHE.get(sk);

    if (cachedSession && now < cachedSession.expiresAt) {
      standings = cachedSession.standings;
      realCarLocations = cachedSession.realCarLocations;
      rcSamples = cachedSession.rcSamples;
      radioSamples = cachedSession.radioSamples;
    } else {
      try {
        const [
          driversRes,
          posRes,
          intervalsRes,
          stintsRes,
          locRes,
          rcRes,
          radioRes,
        ] = await Promise.all([
          fetch(`${OPENF1_BASE}/drivers?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/position?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/intervals?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/stints?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/location?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/race_control?session_key=${sk}`),
          fetch(`${OPENF1_BASE}/team_radio?session_key=${sk}`),
        ]);

        const drivers = driversRes.ok ? await driversRes.json() : [];
        const positions = posRes.ok ? await posRes.json() : [];
        const intervals = intervalsRes.ok ? await intervalsRes.json() : [];
        const stints = stintsRes.ok ? await stintsRes.json() : [];
        const locSamples = locRes.ok ? await locRes.json() : [];
        const fetchedRc = rcRes.ok ? await rcRes.json() : [];
        const fetchedRadio = radioRes.ok ? await radioRes.json() : [];

        const latestPos = new Map<number, number>();
        if (Array.isArray(positions)) {
          for (const p of positions) latestPos.set(p.driver_number, p.position);
        }

        const latestIv = new Map<
          number,
          {
            gap_to_leader: number | string | null;
            interval: number | string | null;
          }
        >();
        if (Array.isArray(intervals)) {
          for (const iv of intervals) latestIv.set(iv.driver_number, iv);
        }

        const latestStint = new Map<
          number,
          { compound: string; lap_start: number; lap_end: number }
        >();
        if (Array.isArray(stints)) {
          for (const st of stints) latestStint.set(st.driver_number, st);
        }

        if (Array.isArray(drivers) && drivers.length > 0) {
          standings = drivers
            .map(
              (d: {
                driver_number: number;
                name_acronym: string;
                full_name: string;
                team_name: string;
              }) => {
                const teamId = resolveTeamId(d.team_name);
                const pos = latestPos.get(d.driver_number) ?? 99;
                const iv = latestIv.get(d.driver_number);
                const stint = latestStint.get(d.driver_number);
                const compound = (stint?.compound || "MEDIUM").toUpperCase();

                return {
                  position: pos,
                  driverNumber: d.driver_number,
                  code:
                    d.name_acronym || d.full_name?.slice(0, 3).toUpperCase(),
                  fullName: d.full_name,
                  teamId,
                  teamColor: F1_TEAMS[teamId].primaryColor,
                  gapToLeader:
                    pos === 1
                      ? "LEADER"
                      : iv?.gap_to_leader != null
                      ? `+${Number(iv.gap_to_leader).toFixed(3)}s`
                      : "—",
                  interval:
                    pos === 1
                      ? "INTERVAL"
                      : iv?.interval != null
                      ? `+${Number(iv.interval).toFixed(3)}`
                      : "—",
                  lastLap: "OFFICIAL",
                  sector1Color: pos === 1 ? "purple" : "green",
                  sector2Color: "green",
                  sector3Color: "green",
                  tyre: (["SOFT", "MEDIUM", "HARD", "INTER", "WET"].includes(
                    compound
                  )
                    ? compound
                    : "MEDIUM") as DriverTimingRow["tyre"],
                  tyreAge: stint
                    ? Math.max(
                        1,
                        (stint.lap_end || 1) - (stint.lap_start || 1)
                      )
                    : 0,
                  inPit: false,
                  drsActive: pos > 1 && Number(iv?.interval ?? 9) < 1.0,
                };
              }
            )
            .filter((r: DriverTimingRow) => r.position < 99)
            .sort(
              (a: DriverTimingRow, b: DriverTimingRow) =>
                a.position - b.position
            );
        }

        if (Array.isArray(locSamples) && locSamples.length > 0) {
          const latestLocMap = new Map<number, { x: number; y: number }>();
          const tail = locSamples.slice(-400);
          for (const pt of tail) {
            if (typeof pt.x === "number" && typeof pt.y === "number") {
              latestLocMap.set(pt.driver_number, { x: pt.x, y: pt.y });
            }
          }
          realCarLocations = Array.from(latestLocMap.entries()).map(
            ([num, coords]) => ({
              driverNumber: num,
              x: coords.x,
              y: coords.y,
            })
          );
        }

        rcSamples = Array.isArray(fetchedRc) ? fetchedRc : [];
        radioSamples = Array.isArray(fetchedRadio) ? fetchedRadio : [];

        // Only cache if we actually received valid driver rows (prevents caching 429 empty responses)
        if (standings.length > 0) {
          SESSION_CACHE.set(sk, {
            expiresAt: now + sessionTtl,
            standings,
            realCarLocations,
            rcSamples,
            radioSamples,
          });
        } else if (cachedSession) {
          standings = cachedSession.standings;
          realCarLocations = cachedSession.realCarLocations;
          rcSamples = cachedSession.rcSamples;
          radioSamples = cachedSession.radioSamples;
        }
      } catch {
        if (cachedSession) {
          standings = cachedSession.standings;
          realCarLocations = cachedSession.realCarLocations;
          rcSamples = cachedSession.rcSamples;
          radioSamples = cachedSession.radioSamples;
        }
      }
    }

    // Fetch single-driver car telemetry (cached per driver for 15s live / 5m off-week)
    const carKey = `${sk}_${driverNumber}`;
    const cachedCar = CAR_DATA_CACHE.get(carKey);
    if (cachedCar && now < cachedCar.expiresAt) {
      telemetry = cachedCar.telemetry;
    } else {
      try {
        const carRes = await fetch(
          `${OPENF1_BASE}/car_data?session_key=${sk}&driver_number=${driverNumber}`
        );
        const carSamples = carRes.ok ? await carRes.json() : [];
        if (Array.isArray(carSamples) && carSamples.length > 0) {
          const latestCar = carSamples[carSamples.length - 1];
          telemetry = {
            driverNumber,
            speed: latestCar.speed ?? 0,
            rpm: latestCar.rpm ?? 0,
            gear: latestCar.n_gear ?? 0,
            throttle: latestCar.throttle ?? 0,
            brake: latestCar.brake ?? 0,
            drs: latestCar.drs ?? 0,
            timestamp: latestCar.date || "",
          };
          CAR_DATA_CACHE.set(carKey, {
            expiresAt: now + (isRaceLive ? 15 * 1000 : 5 * 60 * 1000),
            telemetry,
          });
        } else if (cachedCar) {
          telemetry = cachedCar.telemetry;
        }
      } catch {
        if (cachedCar) telemetry = cachedCar.telemetry;
      }
    }
  }

  const latestRc =
    rcSamples.length > 0 ? rcSamples[rcSamples.length - 1] : null;
  const driverRadios = radioSamples.filter(
    (r) => r.driver_number === driverNumber
  );
  const latestRadio =
    driverRadios.length > 0
      ? driverRadios[driverRadios.length - 1]
      : radioSamples.length > 0
      ? radioSamples[radioSamples.length - 1]
      : null;

  return NextResponse.json({
    isRaceLive,
    nextRace: nextRacePayload,
    activeSession: activeSession
      ? {
          sessionKey: activeSession.session_key,
          name: `${activeSession.country_name} GP • ${activeSession.session_name}`,
          circuit: activeSession.circuit_short_name,
          year: activeSession.year,
        }
      : null,
    availableTracks,
    trackGeometry,
    realCarLocations,
    standings,
    telemetry,
    raceControl: latestRc
      ? {
          category: latestRc.category || "Flag",
          flag: latestRc.flag || "GREEN",
          message: latestRc.message || "TRACK CLEAR",
          lapNumber: latestRc.lap_number || null,
          date: latestRc.date || "",
        }
      : {
          category: "Flag",
          flag: "GREEN",
          message: "TRACK CLEAR • ALL SECTORS GREEN",
          lapNumber: null,
          date: "",
        },
    teamRadio: latestRadio
      ? {
          driverNumber: latestRadio.driver_number,
          recordingUrl: latestRadio.recording_url,
          date: latestRadio.date,
        }
      : null,
  });
}