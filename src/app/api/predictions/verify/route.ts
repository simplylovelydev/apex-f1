import { NextRequest, NextResponse } from "next/server";
import { ConstructorId } from "@/types/f1";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

function mapConstructor(raw?: string): ConstructorId {
  const s = (raw || "").toLowerCase();
  if (s.includes("red_bull") || s.includes("red bull")) return "red_bull";
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

function normalize2026Number(code?: string, rawNumber?: string): number {
  const c = (code || "").toUpperCase();
  if (c === "NOR") return 1;
  if (c === "VER") return 3;
  return Number(rawNumber || 0);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const round = searchParams.get("round") || "last";

  try {
    const [raceRes, qualRes] = await Promise.all([
      fetch(`${JOLPICA_BASE}/current/${round}/results.json`, {
        next: { revalidate: 120 },
      }),
      fetch(`${JOLPICA_BASE}/current/${round}/qualifying.json`, {
        next: { revalidate: 120 },
      }),
    ]);

    const raceJson = raceRes.ok ? await raceRes.json() : null;
    const qualJson = qualRes.ok ? await qualRes.json() : null;

    const race = raceJson?.MRData?.RaceTable?.Races?.[0];
    const results = race?.Results || [];
    const qualResults =
      qualJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];

    if (!results || results.length < 3) {
      return NextResponse.json({
        hasResult: false,
        message: "WAIT FOR THE RESULTS",
      });
    }

    const p1 = results[0];
    const p2 = results[1];
    const p3 = results[2];

    const poleEntry = qualResults[0];
    const poleDriverNumber = poleEntry
      ? normalize2026Number(poleEntry.Driver?.code, poleEntry.number)
      : normalize2026Number(p1.Driver?.code, p1.number);

    const fastestLapEntry = results.find(
      (r: { FastestLap?: { rank?: string } }) => r.FastestLap?.rank === "1"
    );
    const fastestLapDriverNumber = fastestLapEntry
      ? normalize2026Number(
          fastestLapEntry.Driver?.code,
          fastestLapEntry.number
        )
      : null;

    return NextResponse.json({
      hasResult: true,
      raceName: race.raceName,
      round: race.round,
      actual: {
        winningTeam: mapConstructor(p1.Constructor?.constructorId),
        poleDriver: poleDriverNumber,
        p1Driver: normalize2026Number(p1.Driver?.code, p1.number),
        p2Driver: normalize2026Number(p2.Driver?.code, p2.number),
        p3Driver: normalize2026Number(p3.Driver?.code, p3.number),
        fastestLapDriver: fastestLapDriverNumber,
      },
    });
  } catch {
    return NextResponse.json({
      hasResult: false,
      message: "WAIT FOR THE RESULTS",
    });
  }
}