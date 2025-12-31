// server/src/gameLogic.ts
import type { GameState, PlayerState, DiceOutcome } from "../../shared/types";
import ACTIVITIES from "../../shared/activities";
import CardsModule from "../../shared/cards";
const { CARDS, CARD_BY_ID } = CardsModule;



// ---------------------------
// Helpers
// ---------------------------
function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makeRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 5; i++) s += chars[randInt(0, chars.length - 1)];
    return s;
}

// normalize activities from state (never trust persisted shape)
function activitiesArray(state: GameState) {
    const a: any = (state as any).activities;
    const raw = Array.isArray(a) ? a : a && typeof a === "object" ? Object.values(a) : [];

    return raw.map((x: any) => ({
        id: x.id ?? x.code ?? x.activityId ?? "",
        name: x.name ?? x.title ?? x.activityName ?? "",
        baseTime: x.baseTime ?? x.duration ?? x.time ?? x.weeks ?? 0,
        baseCost: x.baseCost ?? x.cost ?? x.bpCost ?? 0,
        reqWorkers: x.reqWorkers ?? x.workers ?? x.workerReq ?? 0,
        reqMachines: x.reqMachines ?? x.machines ?? x.machineReq ?? 0,
        dep: x.dep ?? x.dependency ?? x.dependencies ?? { type: "NONE" },
    }));
}

function shuffle<T>(arr: T[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function topCards(state: GameState, deck: "FIN" | "SITE" | "UPG" | "PROD", n: number) {
    let draw = state.decks[deck].draw;
    if (draw.length < n) {
        state.decks[deck].draw = shuffle([...draw, ...state.decks[deck].discard]);
        state.decks[deck].discard = [];
        draw = state.decks[deck].draw;
    }
    return draw.slice(0, n);
}

function popCard(state: GameState, deck: "FIN" | "SITE" | "UPG" | "PROD") {
    const id = topCards(state, deck, 1)[0];
    state.decks[deck].draw = state.decks[deck].draw.filter((x) => x !== id);
    state.decks[deck].discard.push(id);
    return id;
}

// ---------------------------
// Dice
// ---------------------------
export function rollDice(): DiceOutcome {
    const roll = randInt(1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    if (roll === 1) return { roll, cardType: "PROD" };
    if (roll === 2) return { roll, cardType: "UPG" };
    if (roll === 3) return { roll, cardType: "FIN" };
    if (roll === 4) return { roll, cardType: "SITE" };
    if (roll === 5) return { roll, cardType: "CHOICE" };
    return { roll, cardType: "NONE" };
}

// ---------------------------
// State creation
// ---------------------------
export function newGameState(roomCode: string, hostPlayerId: string, hostNick: string): GameState {
    const decks = {
        FIN: { draw: shuffle(CARDS.filter((c) => c.type === "FIN").map((c) => c.id)), discard: [] as string[] },
        SITE: { draw: shuffle(CARDS.filter((c) => c.type === "SITE").map((c) => c.id)), discard: [] as string[] },
        UPG: { draw: shuffle(CARDS.filter((c) => c.type === "UPG").map((c) => c.id)), discard: [] as string[] },
        PROD: { draw: shuffle(CARDS.filter((c) => c.type === "PROD").map((c) => c.id)), discard: [] as string[] },
    };

    const host: PlayerState = {
        id: hostPlayerId,
        nickname: hostNick,
        bp: 30,
        coins: 6,
        workers: 3,
        machines: 1,
        productivity: 0,
        time: 0,
        activityIndex: 0,
        buffs: [],
    };

    return {
        roomCode,
        status: "LOBBY",
        hostPlayerId,
        round: 1,
        turnIndex: 0,
        players: [host],
        activities: ACTIVITIES, // always store as array
        decks,
        log: [`Room ${roomCode} created.`],
        currentTurn: { activePlayerId: hostPlayerId },
    } as GameState;
}

// ---------------------------
// Turn flow
// ---------------------------
export function startGame(state: GameState) {
    if (state.players.length < 2) throw new Error("Need at least 2 players.");
    state.status = "ACTIVE";
    state.round = 1;
    state.turnIndex = 0;
    state.currentTurn = { activePlayerId: state.players[0].id };
    state.log.push("Game started.");
}

export function beginTurn(state: GameState) {
    const active = state.players[state.turnIndex];
    state.currentTurn = { activePlayerId: active.id };
}

export function rollAndOffer(state: GameState, chosenDeckIfFive?: "FIN" | "SITE" | "UPG" | "PROD") {
    if (!state.currentTurn) beginTurn(state);

    const outcome = rollDice();
    state.currentTurn!.roll = outcome.roll;

    if (outcome.cardType === "NONE") {
        state.currentTurn!.cardType = "NONE";
        state.currentTurn!.offeredCardIds = [];
        state.currentTurn!.cardInfo = undefined;
        return;
    }

    let deck: "FIN" | "SITE" | "UPG" | "PROD";
    if (outcome.cardType === "CHOICE") {
        deck = chosenDeckIfFive ?? "FIN";
        state.currentTurn!.cardType = "CHOICE";
    } else {
        deck = outcome.cardType;
        state.currentTurn!.cardType = outcome.cardType;
    }

    const offered = topCards(state, deck, 2);
    state.currentTurn!.offeredCardIds = offered;

    // ✅ send card descriptions too (so UI can show them)
    state.currentTurn!.cardInfo = offered.map((id) => {
        const c = CARD_BY_ID.get(id);
        return {
            id,
            title: c?.title ?? "Unknown",
            rulesText: c?.rulesText ?? "",
            type: c?.type ?? deck,
        };
    });
}

// ---------------------------
// Dependency checks
// ---------------------------
function prereqWarningText(activity: any, completed: Set<string>) {
    const depRaw: any = activity.dep ?? { type: "NONE" };
    const dep = typeof depRaw === "string" ? { type: "FS" as const, on: [depRaw] } : depRaw;

    if (dep.type === "FS") {
        const onList: string[] = dep.on ?? [];
        const missing = onList.filter((x) => !completed.has(x));
        if (missing.length) return `⚠️ Prereq missing: ${missing.join(", ")}`;
    }
    return "";
}

function prereqViolationPenalty() {
    return { timeDelta: +1, costDelta: +1 };
}

function resourceMismatchPenalty(player: PlayerState, reqW: number, reqM: number) {
    const insufficient = player.workers < reqW || player.machines < reqM;
    return insufficient ? { timeDelta: +1, costDelta: 0 } : { timeDelta: 0, costDelta: 0 };
}

function applyBuffs(player: PlayerState, baseTime: number, baseCost: number) {
    let t = baseTime;
    let c = baseCost;

    for (const b of player.buffs) {
        if (b.effect === "TIME_MINUS_1") t -= 1;
        if (b.effect === "COST_MINUS_1") c -= 1;
    }
    if (t < 0) t = 0;
    if (c < 0) c = 0;
    return { t, c };
}

function tickBuffs(player: PlayerState) {
    player.buffs = player.buffs
        .map((b) => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
        .filter((b) => b.remainingTurns > 0);
}

// ---------------------------
// Apply Turn
// ---------------------------
export function applyTurn(
    state: GameState,
    playerId: string,
    coinsSpent: 0 | 1 | 2,
    chosenCardId?: string,
    chosenDeckIfFive?: "FIN" | "SITE" | "UPG" | "PROD"
) {
    const active = state.players[state.turnIndex];
    if (active.id !== playerId) throw new Error("Not your turn.");
    if (state.status !== "ACTIVE") throw new Error("Game not active.");
    if (!state.currentTurn?.roll) throw new Error("Roll first.");

    if (coinsSpent > active.coins) throw new Error("Not enough coins.");
    active.coins -= coinsSpent;

    // Determine deck from roll
    const roll = state.currentTurn.roll!;
    let deck: "FIN" | "SITE" | "UPG" | "PROD" | null = null;
    if (roll === 1) deck = "PROD";
    if (roll === 2) deck = "UPG";
    if (roll === 3) deck = "FIN";
    if (roll === 4) deck = "SITE";
    if (roll === 5) deck = chosenDeckIfFive ?? "FIN";
    if (roll === 6) deck = null;

    // take card
    let usedCardId: string | null = null;
    if (deck) {
        const offered = topCards(state, deck, 2);
        if (coinsSpent === 2) {
            if (!chosenCardId || !offered.includes(chosenCardId)) throw new Error("Invalid chosen card.");
            state.decks[deck].draw = state.decks[deck].draw.filter((x) => x !== chosenCardId);
            state.decks[deck].discard.push(chosenCardId);
            usedCardId = chosenCardId;
        } else {
            usedCardId = popCard(state, deck);
        }
    }

    // activities
    const acts = activitiesArray(state);
    const activity = acts[active.activityIndex];

    if (!activity || !activity.id || activity.baseTime == null || activity.baseCost == null) {
        throw new Error("Activities not loaded correctly (invalid activity data).");
    }

    const completedIds = new Set(acts.slice(0, active.activityIndex).map((a: any) => a.id));

    // dependency warning + penalties
    const warnText = prereqWarningText(activity, completedIds);
    let depPenalty = { timeDelta: 0, costDelta: 0 };
    if (warnText) depPenalty = prereqViolationPenalty();

    // SS bonus (simple MVP)
    let ssBonus = 0;
    const dep = typeof activity.dep === "string" ? { type: "FS", on: [activity.dep] } : activity.dep;
    if (dep?.type === "SS" && active.productivity >= 1) ssBonus = -1;

    // buffs + resource penalty
    const withBuffs = applyBuffs(active, activity.baseTime, activity.baseCost);
    const resPenalty = resourceMismatchPenalty(active, activity.reqWorkers, activity.reqMachines);

    // card effect
    let cardTime = 0,
        cardCost = 0,
        cardProd = 0,
        cardCoin = 0;

    if (usedCardId) {
        const card = CARD_BY_ID.get(usedCardId);
        if (card) {
            cardTime = card.effect.timeDelta ?? 0;
            cardCost = card.effect.costDelta ?? 0;
            cardProd = card.effect.prodDelta ?? 0;
            cardCoin = card.effect.coinDelta ?? 0;

            if (card.effect.buff) {
                active.buffs.push({
                    id: usedCardId,
                    remainingTurns: card.effect.buff.turns,
                    effect: card.effect.buff.effect,
                });
            }
        } else {
            state.log.push(`⚠️ Card not found: ${usedCardId}`);
        }
    }

    const actualTime = Math.max(0, withBuffs.t + depPenalty.timeDelta + resPenalty.timeDelta + cardTime + ssBonus);
    const actualCost = Math.max(0, withBuffs.c + depPenalty.costDelta + resPenalty.costDelta + cardCost);

    active.time += actualTime;
    active.bp -= actualCost;
    active.productivity += cardProd;
    active.coins += cardCoin;

    // small reward if executed clean
    if (depPenalty.timeDelta === 0 && resPenalty.timeDelta === 0 && actualTime <= activity.baseTime) {
        active.coins += 1;
    }

    // advance
    active.activityIndex += 1;
    tickBuffs(active);

    // store warnings so UI can display them
    (state.currentTurn as any).warnings = [];
    if (warnText) (state.currentTurn as any).warnings.push(warnText);
    if (active.workers < activity.reqWorkers || active.machines < activity.reqMachines) {
        (state.currentTurn as any).warnings.push(
            `⚠️ Resource short: need W${activity.reqWorkers}/M${activity.reqMachines}, you have W${active.workers}/M${active.machines}`
        );
    }

    state.log.push(
        `${active.nickname} executed ${activity.id} (${activity.name}) | +${actualTime}w, -${actualCost}BP, card=${usedCardId ?? "NONE"
        }${warnText ? " | " + warnText : ""}`
    );

    // end condition
    const total = ACTIVITIES.length;
    if (state.players.every((p) => p.activityIndex >= total)) {
        state.status = "FINISHED";
        state.log.push("Game finished.");
        return;
    }

    // next player / round
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    if (state.turnIndex === 0) state.round += 1;

    state.currentTurn = undefined;
    beginTurn(state);
}
