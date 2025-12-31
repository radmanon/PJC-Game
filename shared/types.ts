// shared/types.ts

export type CardType = "FIN" | "SITE" | "UPG" | "PROD" | "CHOICE" | "NONE";

export type Dependency =
    | { type: "NONE" }
    | { type: "FS"; on: string[] }
    | { type: "SS"; with: string[] };

export type Activity = {
    id: string;
    name: string;
    baseTime: number;
    baseCost: number;
    reqWorkers: number;
    reqMachines: number;
    dep: Dependency;
};

export type Buff = {
    id: string;
    remainingTurns: number;
    effect: "TIME_MINUS_1" | "COST_MINUS_1" | "IGNORE_SITE_ONCE";
};

export type PlayerState = {
    id: string;
    nickname: string;

    bp: number;
    coins: number;

    workers: number;
    machines: number;

    productivity: number;
    time: number;

    // Old field (kept for compatibility / UI)
    activityIndex: number;

    // ✅ New: allows activity-choice gameplay
    completedActivityIds?: string[];

    buffs: Buff[];
};

export type DiceOutcome = {
    roll: 1 | 2 | 3 | 4 | 5 | 6;
    cardType: CardType;
};

export type DeckState = { draw: string[]; discard: string[] };

export type GameState = {
    roomCode: string;
    status: "LOBBY" | "ACTIVE" | "FINISHED";
    hostPlayerId: string;

    round: number;
    turnIndex: number;

    players: PlayerState[];
    activities: Activity[];

    decks: {
        FIN: DeckState;
        SITE: DeckState;
        UPG: DeckState;
        PROD: DeckState;
    };

    log: string[];

    currentTurn?: {
        activePlayerId: string;

        roll?: number;
        cardType?: CardType;
        offeredCardIds?: string[];

        // ✅ New: chosen activity for this turn (optional)
        selectedActivityId?: string;
    };
};
