"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Flag } from "lucide-react";
import { ConstructorId, F1_TEAMS } from "@/types/f1";
import { TeamLogo } from "@/components/broadcast/F1Media";

interface TeamSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeam: ConstructorId;
  onSelectTeam: (teamId: ConstructorId) => void;
}

export function TeamSelectorModal({
  isOpen,
  onClose,
  selectedTeam,
  onSelectTeam,
}: TeamSelectorModalProps) {
  const teams = Object.values(F1_TEAMS);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="f1-hud-panel f1-cut-corner relative z-10 w-full max-w-3xl overflow-hidden rounded-md p-6"
          >
            <div className="mb-5 flex items-center justify-between border-b border-[#262B38] pb-4">
              <div className="flex items-center gap-2.5">
                <Flag className="h-5 w-5 text-[#E10600]" />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">
                    Select Constructor Allegiance
                  </h2>
                  <p className="text-xs text-gray-400">
                    Your second-screen telemetry HUD, driver focus, and broadcast accents adapt to your team.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[65vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {teams.map((team) => {
                const isSelected = team.id === selectedTeam;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onSelectTeam(team.id);
                      onClose();
                    }}
                    className={`group relative flex items-center justify-between overflow-hidden rounded border p-3.5 text-left transition-all ${
                      isSelected
                        ? "bg-[#1B202C]"
                        : "border-[#262B38] bg-[#12151E] hover:border-gray-600 hover:bg-[#181C27]"
                    }`}
                    style={{
                      borderColor: isSelected ? team.primaryColor : undefined,
                      boxShadow: isSelected
                        ? `0 0 24px ${team.primaryColor}33`
                        : undefined,
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ backgroundColor: team.primaryColor }}
                    />

                    <div className="flex items-center gap-3 pl-2">
                      <TeamLogo teamId={team.id} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-wider text-white">
                            {team.shortName}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">{team.name}</p>
                        <div className="mt-1.5 flex items-center gap-2 font-mono-telemetry text-[11px] text-gray-300">
                          <span className="rounded bg-white/5 px-1.5 py-0.5">
                            #{team.driverNumbers[0]} {team.drivers[0].split(" ")[1]}
                          </span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5">
                            #{team.driverNumbers[1]} {team.drivers[1].split(" ")[1]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black"
                        style={{ backgroundColor: team.primaryColor }}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}