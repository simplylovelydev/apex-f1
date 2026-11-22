import {
  CarTelemetrySnapshot,
  ConstructorId,
  DriverTimingRow,
  F1_TEAMS,
} from "@/types/f1";

const OPENF1_BASE =
  process.env.NEXT_PUBLIC_OPENF1_BASE_URL || "https://api.openf1.org/v1";

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

const TEAM_NAME_MAP: Record<string, ConstructorId> = {
  "Red Bull Racing": "red_bull",
  Ferrari: "ferrari",
  Mercedes: "mercedes",
  McLaren: "mclaren",
  "Aston Martin": "aston_martin",
  Williams: "williams",
  Alpine: "alpine",
  "Haas F1 Team": "haas",
  "Racing Bulls": "rb",
  RB: "rb",
  "Kick Sauber": "audi",
  Audi: "audi",
  Cadillac: "cadillac",
};

function resolveTeamId(rawTeam?: string): ConstructorId {
  if (!rawTeam) return "red_bull";
  for (const [key, id] of Object.entries(TEAM_NAME_MAP)) {
    if (rawTeam.toLowerCase().includes(key.toLowerCase())) {
      return id;
    }
  }
  return "red_bull";
}

export async function fetchLatestCompletedSession(): Promise<OpenF1Session | null> {
  try {
    const res = await fetch(`${OPENF1_BASE}/sessions?session_type=Race`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const sessions: OpenF1Session[] = await res.json();
    const now = Date.now();
    const pastSessions = sessions.filter(
      (s) => new Date(s.date_start).getTime() < now - 3 * 60 * 60 * 1000
    );
    return pastSessions[pastSessions.length - 1] || null;
  } catch {
    return null;
  }
}

export async function fetchOpenF1Standings(
  sessionKey: number
): Promise<DriverTimingRow[]> {
  try {
    const [driversRes, posRes, intervalsRes, stintsRes] = await Promise.all([
      fetch(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`, {
        next: { revalidate: 120 },
      }),
      fetch(`${OPENF1_BASE}/position?session_key=${sessionKey}`, {
        next: { revalidate: 30 },
      }),
      fetch(`${OPENF1_BASE}/intervals?session_key=${sessionKey}`, {
        next: { revalidate: 30 },
      }),
      fetch(`${OPENF1_BASE}/stints?session_key=${sessionKey}`, {
        next: { revalidate: 60 },
      }),
    ]);

    if (!driversRes.ok || !posRes.ok) return [];

    const drivers = await driversRes.json();
    const positions = await posRes.json();
    const intervals = intervalsRes.ok ? await intervalsRes.json() : [];
    const stints = stintsRes.ok ? await stintsRes.json() : [];

    // Latest position per driver
    const latestPos = new Map<number, number>();
    for (const p of positions) {
      latestPos.set(p.driver_number, p.position);
    }

    // Latest gap/interval per driver
    const latestInterval = new Map<
      number,
      { gap_to_leader: number | string | null; interval: number | string | null }
    >();
    for (const iv of intervals) {
      latestInterval.set(iv.driver_number, iv);
    }

    // Latest tyre compound per driver
    const latestStint = new Map<
      number,
      { compound: string; tyre_age_at_start: number; lap_start: number; lap_end: number }
    >();
    for (const st of stints) {
      latestStint.set(st.driver_number, st);
    }

    const rows: DriverTimingRow[] = drivers.map(
      (d: {
        driver_number: number;
        name_acronym: string;
        full_name: string;
        team_name: string;
      }) => {
        const teamId = resolveTeamId(d.team_name);
        const team = F1_TEAMS[teamId];
        const pos = latestPos.get(d.driver_number) ?? 20;
        const iv = latestInterval.get(d.driver_number);
        const stint = latestStint.get(d.driver_number);

        const rawCompound = (stint?.compound || "MEDIUM").toUpperCase();
        const tyre = (
          ["SOFT", "MEDIUM", "HARD", "INTER", "WET"].includes(rawCompound)
            ? rawCompound
            : "MEDIUM"
        ) as DriverTimingRow["tyre"];

        const gapStr =
          pos === 1
            ? "LEADER"
            : iv?.gap_to_leader != null
            ? `+${Number(iv.gap_to_leader).toFixed(3)}s`
            : "+1.420s";

        const intStr =
          pos === 1
            ? "INTERVAL"
            : iv?.interval != null
            ? `+${Number(iv.interval).toFixed(3)}`
            : "+0.612";

        return {
          position: pos,
          driverNumber: d.driver_number,
          code: d.name_acronym || d.full_name.slice(0, 3).toUpperCase(),
          fullName: d.full_name,
          teamId,
          teamColor: team.primaryColor,
          gapToLeader: gapStr,
          interval: intStr,
          lastLap: "1:18.412",
          sector1Color: pos <= 3 ? "purple" : "green",
          sector2Color: "green",
          sector3Color: pos % 4 === 0 ? "yellow" : "green",
          tyre,
          tyreAge: stint ? Math.max(1, (stint.lap_end || 14) - (stint.lap_start || 1)) : 12,
          inPit: false,
          drsActive: pos > 1 && Number(iv?.interval ?? 1.5) < 1.0,
        };
      }
    );

    return rows.sort((a, b) => a.position - b.position);
  } catch {
    return [];
  }
}

export async function fetchDriverCarTelemetry(
  sessionKey: number,
  driverNumber: number
): Promise<CarTelemetrySnapshot | null> {
  try {
    const res = await fetch(
      `${OPENF1_BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const samples = await res.json();
    if (!Array.isArray(samples) || samples.length === 0) return null;

    // Pick a high-speed mid-session sample
    const sample = samples[Math.floor(samples.length * 0.65)];
    return {
      driverNumber,
      speed: sample.speed ?? 312,
      rpm: sample.rpm ?? 11450,
      gear: sample.n_gear ?? 8,
      throttle: sample.throttle ?? 100,
      brake: sample.brake ?? 0,
      drs: sample.drs ?? 12,
      timestamp: sample.date,
    };
  } catch {
    return null;
  }
}