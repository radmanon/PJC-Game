// shared/rules.ts

import { Activity, PlayerState } from "./types";

/* ======================================================
   DICE RULES
====================================================== */

export const DICE_TO_CARD = {
    1: "PROD",
    2: "UPG",
    3: "FIN",
    4: "SITE",
    5: "CHOICE",
    6: "NONE"
} as const;

export type DiceCardResult = typeof DICE_TO_CARD[keyof typeof DICE_TO_CARD];

/* ======================================================
   INITIAL PLAYER VALUES
====================================================== */

export const INITIAL_PLAYER_STATE = {
    bp: 30,
    coins: 6,
    workers: 3,
    machines: 1,
    productivity: 0,
    time: 0
};

/* ======================================================
   RESOURCE RULES (Workers & Machines)
====================================================== */

/**
 * If player has insufficient workers or machines:
 *  → +1 week delay
 */
export function resourcePenalty(
    player: PlayerState,
    activity: Activity
) {
    const insufficientWorkers = player.workers < activity.reqWorkers;
    const insufficientMachines = player.machines < activity.reqMachines;

    if (insufficientWorkers || insufficientMachines) {
        return { timeDelta: +1, costDelta: 0 };
    }

    return { timeDelta: 0, costDelta: 0 };
}

/* ======================================================
   DEPENDENCY RULES
====================================================== */

/**
 * Finish-to-Start (FS):
 * If prerequisite activities are not completed → penalty
 */
export function checkFSDependency(
    completedActivityIds: Set<string>,
    activity: Activity
) {
    if (activity.dep.type !== "FS") {
        return { timeDelta: 0, costDelta: 0 };
    }

    const satisfied = activity.dep.on.every(id =>
        completedActivityIds.has(id)
    );

    if (!satisfied) {
        return { timeDelta: +1, costDelta: +1 }; // rework + delay
    }

    return { timeDelta: 0, costDelta: 0 };
}

/**
 * Start-to-Start (SS):
 * Bonus if player is productive enough
 * (MVP rule — can be improved later)
 */
export function checkSSBonus(
    player: PlayerState,
    activity: Activity
) {
    if (activity.dep.type !== "SS") return 0;

    // Simple MVP rule:
    if (player.productivity >= 1) {
        return -1; // -1 week bonus
    }

    return 0;
}

/* ======================================================
   BUFF RULES
====================================================== */

export function applyBuffs(
    player: PlayerState,
    baseTime: number,
    baseCost: number
) {
    let time = baseTime;
    let cost = baseCost;

    for (const buff of player.buffs) {
        if (buff.effect === "TIME_MINUS_1") time -= 1;
        if (buff.effect === "COST_MINUS_1") cost -= 1;
    }

    return {
        time: Math.max(0, time),
        cost: Math.max(0, cost)
    };
}

export function tickBuffs(player: PlayerState) {
    player.buffs = player.buffs
        .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
        .filter(b => b.remainingTurns > 0);
}

/* ======================================================
   ACTIVITY EXECUTION FORMULA
====================================================== */

export function calculateActualExecution({
    activity,
    player,
    completedIds,
    cardTimeDelta = 0,
    cardCostDelta = 0
}: {
    activity: Activity;
    player: PlayerState;
    completedIds: Set<string>;
    cardTimeDelta?: number;
    cardCostDelta?: number;
}) {
    const fsPenalty = checkFSDependency(completedIds, activity);
    const resPenalty = resourcePenalty(player, activity);
    const ssBonus = checkSSBonus(player, activity);
    const buffs = applyBuffs(player, activity.baseTime, activity.baseCost);

    const actualTime =
        buffs.time +
        fsPenalty.timeDelta +
        resPenalty.timeDelta +
        cardTimeDelta +
        ssBonus;

    const actualCost =
        buffs.cost +
        fsPenalty.costDelta +
        resPenalty.costDelta +
        cardCostDelta;

    return {
        time: Math.max(0, actualTime),
        cost: Math.max(0, actualCost)
    };
}

/* ======================================================
   PERFORMANCE REWARD RULES
====================================================== */

export function performanceReward(
    activity: Activity,
    actualTime: number
) {
    // If finished without delay → reward a coin
    if (actualTime <= activity.baseTime) {
        return { coins: +1 };
    }
    return { coins: 0 };
}

/* ======================================================
   WINNER SCORING
====================================================== */

export const SCORE_WEIGHTS = {
    time: 0.4,
    cost: 0.4,
    productivity: 0.2
};

export function calculateFinalScore(
    player: PlayerState,
    minTime: number,
    minCost: number
) {
    return (
        SCORE_WEIGHTS.time * (minTime / player.time) +
        SCORE_WEIGHTS.cost * (minCost / Math.max(1, player.bp)) +
        SCORE_WEIGHTS.productivity * player.productivity
    );
}
