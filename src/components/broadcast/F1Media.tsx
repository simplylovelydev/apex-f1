"use client";

import React, { useState } from "react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";

interface DriverAvatarProps {
  driverNumber: number;
  code: string;
  teamId: ConstructorId;
  size?: "sm" | "md" | "lg";
}

export function DriverAvatar({
  driverNumber,
  code,
  teamId,
  size = "md",
}: DriverAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const team = F1_TEAMS[teamId];

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-11 w-11 text-xs",
    lg: "h-16 w-16 text-sm",
  }[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-sm border bg-[#131720] ${sizeClasses}`}
      style={{ borderColor: team.primaryColor }}
    >
      {!imgError ? (
        <img
          src={`/drivers/${driverNumber}.avif`}
          alt={code}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-mono-telemetry font-black text-white"
          style={{ backgroundColor: `${team.primaryColor}33` }}
        >
          {code}
        </div>
      )}
    </div>
  );
}

interface TeamLogoProps {
  teamId: ConstructorId;
  size?: "sm" | "md" | "lg";
}

export function TeamLogo({ teamId, size = "md" }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  const team = F1_TEAMS[teamId];

  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-11 w-11",
  }[size];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/5 p-1 ${sizeClasses}`}
    >
      {!imgError ? (
        <img
          src={`/teams/${teamId}.avif`}
          alt={team.shortName}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: team.primaryColor }}
        />
      )}
    </div>
  );
}