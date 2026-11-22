"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, Square, ShieldAlert, Radio } from "lucide-react";

export interface RaceControlStatus {
  category: string;
  flag: string;
  message: string;
  lapNumber: number | null;
  date: string;
}

export interface TeamRadioClip {
  driverNumber: number;
  recordingUrl: string;
  date: string;
}

interface RaceControlRadioCardProps {
  raceControl: RaceControlStatus | null;
  teamRadio: TeamRadioClip | null;
}

function resolveTrackFlagBadge(rc?: RaceControlStatus | null) {
  const msg = (rc?.message || "").toUpperCase();
  const flag = (rc?.flag || "").toUpperCase();

  if (msg.includes("VIRTUAL SAFETY CAR") || msg.includes("VSC")) {
    return {
      code: "VSC DEPLOYED",
      border: "border-amber-400",
      bg: "bg-amber-400/15",
      text: "text-amber-300",
      dot: "bg-amber-400",
    };
  }
  if (msg.includes("SAFETY CAR") || flag === "SC") {
    return {
      code: "SAFETY CAR",
      border: "border-[#FFD100]",
      bg: "bg-[#FFD100]/15",
      text: "text-[#FFD100]",
      dot: "bg-[#FFD100]",
    };
  }
  if (flag === "RED" || msg.includes("RED FLAG")) {
    return {
      code: "RED FLAG",
      border: "border-[#E10600]",
      bg: "bg-[#E10600]/20",
      text: "text-[#FF4D4D]",
      dot: "bg-[#E10600]",
    };
  }
  if (flag === "YELLOW" || flag === "DOUBLE YELLOW" || msg.includes("YELLOW")) {
    return {
      code: "YELLOW FLAG",
      border: "border-yellow-400",
      bg: "bg-yellow-400/15",
      text: "text-yellow-300",
      dot: "bg-yellow-400",
    };
  }
  return {
    code: "GREEN FLAG • TRACK CLEAR",
    border: "border-[#00D26A]/50",
    bg: "bg-[#00D26A]/10",
    text: "text-[#00D26A]",
    dot: "bg-[#00D26A]",
  };
}

export function RaceControlRadioCard({
  raceControl,
  teamRadio,
}: RaceControlRadioCardProps) {
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsPlayingRadio(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [teamRadio?.recordingUrl]);

  const toggleRadioPlayback = () => {
    if (!audioRef.current || !teamRadio?.recordingUrl) return;
    if (isPlayingRadio) {
      audioRef.current.pause();
      setIsPlayingRadio(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingRadio(true))
        .catch(() => setIsPlayingRadio(false));
    }
  };

  const trackBadge = resolveTrackFlagBadge(raceControl);

  return (
    <section className="f1-hud-panel p-3.5">
      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-mono-telemetry text-[9px] font-bold tracking-[0.2em] text-white/55 uppercase">
          RACE CONTROL &amp; PITWALL RADIO
        </span>
        <span className="font-mono-telemetry text-[9px] text-white/40 uppercase">
          FIA FEED
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.15fr_1fr]">
        {/* Track Status (VSC / SC / Flags) */}
        <div
          className={`flex items-center justify-between border px-3 py-2 ${trackBadge.border} ${trackBadge.bg}`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 font-mono-telemetry text-[9px] font-bold tracking-[0.16em] uppercase">
              <span className={`h-2 w-2 rounded-full ${trackBadge.dot}`} />
              <span className={trackBadge.text}>{trackBadge.code}</span>
            </div>
            <p className="mt-0.5 truncate font-mono-telemetry text-[10px] text-white/75 uppercase">
              {raceControl?.message || "ALL SECTORS CLEAR"}
            </p>
          </div>
          <ShieldAlert className={`h-4 w-4 shrink-0 ${trackBadge.text}`} />
        </div>

        {/* Real OpenF1 Team Radio Audio Player */}
        <div className="flex items-center justify-between border border-white/15 bg-white/[0.03] px-3 py-2">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 font-mono-telemetry text-[9px] font-bold tracking-[0.16em] text-white/50 uppercase">
              <Radio className="h-3 w-3 text-[#E10600]" />
              <span>TEAM RADIO</span>
            </div>
            <div className="mt-0.5 truncate font-mono-telemetry text-[10px] font-bold text-white uppercase">
              {teamRadio ? `CAR #${teamRadio.driverNumber}` : "NO AUDIO CLIP"}
            </div>
          </div>

          {teamRadio?.recordingUrl ? (
            <>
              <audio
                ref={audioRef}
                src={teamRadio.recordingUrl}
                onEnded={() => setIsPlayingRadio(false)}
              />
              <button
                type="button"
                onClick={toggleRadioPlayback}
                className="inline-flex shrink-0 items-center gap-1.5 border border-white/25 bg-white/10 px-2.5 py-1 font-mono-telemetry text-[9px] font-bold tracking-[0.16em] text-white uppercase transition hover:bg-white hover:text-black"
              >
                {isPlayingRadio ? (
                  <>
                    <Square className="h-2.5 w-2.5 fill-current" />
                    STOP
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3" />
                    PLAY
                  </>
                )}
              </button>
            </>
          ) : (
            <span className="font-mono-telemetry text-[9px] text-white/35 uppercase">
              STANDBY
            </span>
          )}
        </div>
      </div>
    </section>
  );
}