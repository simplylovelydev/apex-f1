"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";
import { ConstructorId, DriverTimingRow, F1_TEAMS } from "@/types/f1";

export interface AvailableTrack {
  circuitKey: number;
  name: string;
  country: string;
  year: number;
  sessionKey: number;
}

export interface RealTrackGeometry {
  circuitName: string;
  x: number[];
  y: number[];
  rotation: number;
}

interface CircuitTrackMapProps {
  availableTracks: AvailableTrack[];
  selectedCircuitKey: number;
  onSelectCircuitKey: (circuitKey: number) => void;
  trackGeometry: RealTrackGeometry | null;
  realCarLocations: Array<{ driverNumber: number; x: number; y: number }>;
  standings: DriverTimingRow[];
  selectedDriverNumber: number;
  onSelectDriver: (driverNumber: number) => void;
  supportedTeam: ConstructorId;
}

// Module-level cache persists across Fast Refresh and gives <5ms track switching
const CIRCUIT_GEOMETRY_CACHE = new Map<number, RealTrackGeometry>();

export function CircuitTrackMap({
  availableTracks,
  selectedCircuitKey,
  onSelectCircuitKey,
  trackGeometry,
  realCarLocations,
  standings,
  selectedDriverNumber,
  onSelectDriver,
  supportedTeam,
}: CircuitTrackMapProps) {
  const activeTeam = F1_TEAMS[supportedTeam];
  const [activeGeometry, setActiveGeometry] =
    useState<RealTrackGeometry | null>(trackGeometry);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);

  // Seed cache with initial API trackGeometry
  useEffect(() => {
    if (trackGeometry && selectedCircuitKey > 0) {
      if (!CIRCUIT_GEOMETRY_CACHE.has(selectedCircuitKey)) {
        CIRCUIT_GEOMETRY_CACHE.set(selectedCircuitKey, trackGeometry);
      }
      if (!activeGeometry) {
        setActiveGeometry(trackGeometry);
      }
    }
  }, [trackGeometry, selectedCircuitKey, activeGeometry]);

  // Fetch circuit geometry directly from MultiViewer on selection change
  useEffect(() => {
    if (!selectedCircuitKey || availableTracks.length === 0) return;

    const cached = CIRCUIT_GEOMETRY_CACHE.get(selectedCircuitKey);
    if (cached) {
      setActiveGeometry(cached);
      setIsLoadingTrack(false);
      return;
    }

    const trackMeta = availableTracks.find(
      (t) => t.circuitKey === selectedCircuitKey
    );
    if (!trackMeta) return;

    const controller = new AbortController();
    setIsLoadingTrack(true);

    fetch(
      `https://api.multiviewer.app/api/v1/circuits/${trackMeta.circuitKey}/${trackMeta.year}`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((geo) => {
        if (!geo) return;
        const parsed: RealTrackGeometry = {
          circuitName: geo.circuitName || trackMeta.name,
          x: geo.x || [],
          y: geo.y || [],
          rotation: geo.rotation || 0,
        };
        CIRCUIT_GEOMETRY_CACHE.set(selectedCircuitKey, parsed);
        setActiveGeometry(parsed);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setIsLoadingTrack(false);
        }
      })
      .finally(() => {
        setIsLoadingTrack(false);
      });

    return () => controller.abort();
  }, [selectedCircuitKey, availableTracks]);

  const { svgPath, projectPoint } = useMemo(() => {
    if (
      !activeGeometry ||
      activeGeometry.x.length === 0 ||
      activeGeometry.y.length === 0
    ) {
      return {
        svgPath: "",
        projectPoint: () => ({ x: 0, y: 0 }),
      };
    }

    const xs = activeGeometry.x;
    const ys = activeGeometry.y;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    const pad = 24;
    const targetW = 520 - pad * 2;
    const targetH = 230 - pad * 2;
    const scale = Math.min(targetW / width, targetH / height);

    const offsetX = pad + (targetW - width * scale) / 2;
    const offsetY = pad + (targetH - height * scale) / 2;

    const project = (rawX: number, rawY: number) => ({
      x: offsetX + (rawX - minX) * scale,
      y: 230 - (offsetY + (rawY - minY) * scale),
    });

    const d = xs
      .map((rawX, idx) => {
        const pt = project(rawX, ys[idx] ?? 0);
        return `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(" ");

    return {
      svgPath: `${d} Z`,
      projectPoint: project,
    };
  }, [activeGeometry]);

  const selectedTrackMeta = availableTracks.find(
    (t) => t.circuitKey === selectedCircuitKey
  );

  return (
    <section className="f1-hud-panel flex min-h-0 flex-col justify-between p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Navigation
            className="h-3.5 w-3.5"
            style={{ color: activeTeam.primaryColor }}
          />
          <div>
            <span className="block font-mono-telemetry text-[8px] tracking-[0.2em] text-white/45 uppercase">
              FIA CIRCUIT TELEMETRY
            </span>
            <h3 className="text-xs font-bold tracking-[0.12em] text-white uppercase">
              {selectedTrackMeta?.name ||
                activeGeometry?.circuitName ||
                "LOADING CIRCUIT"}
            </h3>
          </div>
        </div>

        <select
          value={selectedCircuitKey}
          onChange={(e) => onSelectCircuitKey(Number(e.target.value))}
          aria-label="Select F1 Circuit"
          className="border border-white/15 bg-[#0A0C10] px-2 py-1 font-mono-telemetry text-[10px] font-semibold tracking-wider text-white uppercase outline-none focus:border-white/50"
        >
          {availableTracks.map((t) => (
            <option key={t.circuitKey} value={t.circuitKey}>
              {t.country} • {t.name} ({t.year})
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-between border border-white/10 bg-[#07090D] p-2.5">
        <div className="flex items-center justify-between font-mono-telemetry text-[8px] tracking-[0.16em] text-white/40 uppercase">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 text-[#E10600]" />
            OFFICIAL GPS TRACK GEOMETRY
          </span>
          <span>
            {isLoadingTrack
              ? "SYNCING VECTOR"
              : realCarLocations.length > 0
              ? `${realCarLocations.length} CARS LOCKED`
              : "TRACK LAYOUT"}
          </span>
        </div>

        {svgPath ? (
          <svg
            viewBox="0 0 520 230"
            className={`my-auto h-[155px] w-full select-none transition-opacity duration-150 xl:h-[175px] ${
              isLoadingTrack ? "opacity-35" : "opacity-100"
            }`}
            aria-label="Official F1 Circuit Layout"
          >
            <path
              d={svgPath}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={svgPath}
              fill="none"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {realCarLocations.map((loc) => {
              const driver = standings.find(
                (s) => s.driverNumber === loc.driverNumber
              );
              if (!driver) return null;

              const { x, y } = projectPoint(loc.x, loc.y);
              const isSelected = driver.driverNumber === selectedDriverNumber;
              const isSupported = driver.teamId === supportedTeam;

              return (
                <g
                  key={driver.driverNumber}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => onSelectDriver(driver.driverNumber)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle
                      r="11"
                      fill="none"
                      stroke={driver.teamColor}
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    r={isSelected ? 5.5 : isSupported ? 4.5 : 3.5}
                    fill={driver.teamColor}
                    stroke="#050608"
                    strokeWidth="1.5"
                  />
                  {(isSelected || isSupported || driver.position <= 3) && (
                    <g transform="translate(7, -7)">
                      <rect
                        x="0"
                        y="-9"
                        width="32"
                        height="13"
                        fill={isSelected ? driver.teamColor : "#080A0F"}
                        stroke={driver.teamColor}
                        strokeWidth="1"
                      />
                      <text
                        x="16"
                        y="0.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {driver.code}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="flex h-[155px] items-center justify-center font-mono-telemetry text-[10px] tracking-[0.2em] text-white/40 uppercase">
            LOADING CIRCUIT COORDINATES
          </div>
        )}
      </div>
    </section>
  );
}