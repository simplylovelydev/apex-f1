export type AppMode = "fan" | "fantasy" | "predictions" | "standings";

export type ConstructorId =
  | "red_bull"
  | "mclaren"
  | "ferrari"
  | "mercedes"
  | "aston_martin"
  | "williams"
  | "alpine"
  | "haas"
  | "rb"
  | "audi"
  | "cadillac";

export interface TeamTheme {
  id: ConstructorId;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  drivers: [string, string];
  driverNumbers: [number, number];
}

export const F1_TEAMS: Record<ConstructorId, TeamTheme> = {
  red_bull: {
    id: "red_bull",
    name: "Oracle Red Bull Racing",
    shortName: "RED BULL",
    primaryColor: "#3671C6",
    secondaryColor: "#FF1E00",
    drivers: ["Max Verstappen", "Isack Hadjar"],
    driverNumbers: [3, 6],
  },
  mclaren: {
    id: "mclaren",
    name: "McLaren Formula 1 Team",
    shortName: "MCLAREN",
    primaryColor: "#FF8000",
    secondaryColor: "#47C7FC",
    drivers: ["Lando Norris", "Oscar Piastri"],
    driverNumbers: [1, 81],
  },
  ferrari: {
    id: "ferrari",
    name: "Scuderia Ferrari HP",
    shortName: "FERRARI",
    primaryColor: "#E80020",
    secondaryColor: "#FFF200",
    drivers: ["Charles Leclerc", "Lewis Hamilton"],
    driverNumbers: [16, 44],
  },
  mercedes: {
    id: "mercedes",
    name: "Mercedes-AMG PETRONAS",
    shortName: "MERCEDES",
    primaryColor: "#27F4D2",
    secondaryColor: "#00A19C",
    drivers: ["George Russell", "Kimi Antonelli"],
    driverNumbers: [63, 12],
  },
  aston_martin: {
    id: "aston_martin",
    name: "Aston Martin Aramco",
    shortName: "ASTON MARTIN",
    primaryColor: "#229971",
    secondaryColor: "#CEDC00",
    drivers: ["Fernando Alonso", "Lance Stroll"],
    driverNumbers: [14, 18],
  },
  williams: {
    id: "williams",
    name: "Atlassian Williams Racing",
    shortName: "WILLIAMS",
    primaryColor: "#64C4FF",
    secondaryColor: "#005AFF",
    drivers: ["Carlos Sainz", "Alexander Albon"],
    driverNumbers: [55, 23],
  },
  alpine: {
    id: "alpine",
    name: "BWT Alpine F1 Team",
    shortName: "ALPINE",
    primaryColor: "#FF87BC",
    secondaryColor: "#0093CC",
    drivers: ["Pierre Gasly", "Franco Colapinto"],
    driverNumbers: [10, 43],
  },
  haas: {
    id: "haas",
    name: "MoneyGram Haas F1 Team",
    shortName: "HAAS",
    primaryColor: "#B6BABD",
    secondaryColor: "#E6002B",
    drivers: ["Esteban Ocon", "Oliver Bearman"],
    driverNumbers: [31, 87],
  },
  rb: {
    id: "rb",
    name: "Visa Cash App Racing Bulls",
    shortName: "RACING BULLS",
    primaryColor: "#6692FF",
    secondaryColor: "#FFFFFF",
    drivers: ["Liam Lawson", "Arvid Lindblad"],
    driverNumbers: [30, 41],
  },
  audi: {
    id: "audi",
    name: "Audi F1 Team",
    shortName: "AUDI",
    primaryColor: "#F50537",
    secondaryColor: "#8A8D8F",
    drivers: ["Nico Hulkenberg", "Gabriel Bortoleto"],
    driverNumbers: [27, 5],
  },
  cadillac: {
    id: "cadillac",
    name: "Cadillac Formula 1 Team",
    shortName: "CADILLAC",
    primaryColor: "#D4AF37",
    secondaryColor: "#1D2951",
    drivers: ["Valtteri Bottas", "Sergio Perez"],
    driverNumbers: [77, 11],
  },
};

export interface DriverTimingRow {
  position: number;
  driverNumber: number;
  code: string;
  fullName: string;
  teamId: ConstructorId;
  teamColor: string;
  gapToLeader: string;
  interval: string;
  lastLap: string;
  sector1Color: "purple" | "green" | "yellow" | "none";
  sector2Color: "purple" | "green" | "yellow" | "none";
  sector3Color: "purple" | "green" | "yellow" | "none";
  tyre: "SOFT" | "MEDIUM" | "HARD" | "INTER" | "WET";
  tyreAge: number;
  inPit: boolean;
  drsActive: boolean;
}

export interface CarTelemetrySnapshot {
  driverNumber: number;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
  timestamp: string;
}

export interface FantasyDriverAsset {
  driverNumber: number;
  code: string;
  name: string;
  teamId: ConstructorId;
  price: number;
  seasonPoints: number;
  avgPointsPerRace: number;
}

export interface FantasyRoster {
  id?: string;
  userName: string;
  teamName: string;
  drivers: number[];
  constructors: [ConstructorId, ConstructorId];
  drsBoostDriver: number;
  remainingBudget: number;
  totalPoints: number;
}