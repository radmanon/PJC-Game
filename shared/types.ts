export type CardType = "PROD" | "UPG" | "FIN" | "SITE";

export type DiceOutcome =
    | { roll: 1; cardType: "PROD" }
    | { roll: 2; cardType: "UPG" }
    | { roll: 3; cardType: "FIN" }
    | { roll: 4; cardType: "SITE" }
    | { roll: 5; cardType: "CHOICE" }
    | { roll: 6; cardType: "NONE" };

export type Dependency =
    | { type: "FS"; on: string[] }
    | { type: "SS"; with: string[] }
    | { type: "NONE" };

export type Activity = {
    id: string;
    name: string;
    baseTime: number;
    baseCost: number;
    reqWorkers: number;
    reqMachines: number;
    dep: Dependency;
};

export type PlayerState = {
    id: string; // server-generated
    nickname: string;
    bp: number;
    coins: number;
    workers: number;
    machines: number;
    productivity: number;
    time: number;
    activityIndex: number;
    buffs: {
        id: string;
        remainingTurns: number;
        effect: "TIME_MINUS_1" | "COST_MINUS_1" | "IGNORE_SITE_ONCE";
    }[];
};

export type DeckState = {
    draw: string[];     // card IDs
    discard: string[];  // card IDs
};

export type GameState = {
    roomCode: string;
    status: "LOBBY" | "ACTIVE" | "FINISHED";
    hostPlayerId: string;
    round: number;
    turnIndex: number;
    players: PlayerState[];
    activities: Activity[];
    decks: Record<"FIN" | "SITE" | "UPG" | "PROD", DeckState>;
    currentTurn?: {
        activePlayerId: string;
        roll?: number;
        cardType?: CardType | "CHOICE" | "NONE";
        offeredCardIds?: string[];
    };
    log: string[];
};
