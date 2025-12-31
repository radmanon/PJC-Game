import { GameState, PlayerState, DiceOutcome, CardType } from "../../shared/types";
import ACTIVITIES from "../../shared/activities";
import CardsModule from "../../shared/cards";

const { CARDS, CARD_BY_ID } = CardsModule;


function activitiesArray(state: GameState) {
    const a: any = state.activities as any;
    if (Array.isArray(a)) return a;
    if (a && typeof a === "object") return Object.values(a);
    return [];
}



function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makeRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 5; i++) s += chars[randInt(0, chars.length - 1)];
    return s;
}

export function rollDice(): DiceOutcome {
    const roll = randInt(1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    if (roll === 1) return { roll, cardType: "PROD" };
    if (roll === 2) return { roll, cardType: "UPG" };
    if (roll === 3) return { roll, cardType: "FIN" };
    if (roll === 4) return { roll, cardType: "SITE" };
    if (roll === 5) return { roll, cardType: "CHOICE" };
    return { roll, cardType: "NONE" };
}

export function newGameState(roomCode: string, hostPlayerId: string, hostNick: string): GameState {
    const decks = {
        FIN: { draw: shuffle(CARDS.filter(c => c.type === "FIN").map(c => c.id)), discard: [] },
        SITE: { draw: shuffle(CARDS.filter(c => c.type === "SITE").map(c => c.id)), discard: [] },
        UPG: { draw: shuffle(CARDS.filter(c => c.type === "UPG").map(c => c.id)), discard: [] },
        PROD: { draw: shuffle(CARDS.filter(c => c.type === "PROD").map(c => c.id)), discard: [] }
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
        buffs: []
    };

    return {
        roomCode,
        status: "LOBBY",
        hostPlayerId,
        round: 1,
        turnIndex: 0,
        players: [host],
        activities: ACTIVITIES,
        decks,
        log: [`Room ${roomCode} created.`],
        currentTurn: { activePlayerId: hostPlayerId }
    };
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
        // reshuffle discard into draw
        state.decks[deck].draw = shuffle([...draw, ...state.decks[deck].discard]);
        state.decks[deck].discard = [];
        draw = state.decks[deck].draw;
    }
    return draw.slice(0, n);
}

function popCard(state: GameState, deck: "FIN" | "SITE" | "UPG" | "PROD") {
    const id = topCards(state, deck, 1)[0];
    state.decks[deck].draw = state.decks[deck].draw.filter(x => x !== id);
    state.decks[deck].discard.push(id);
    return id;
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
        .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
        .filter(b => b.remainingTurns > 0);
}

function prereqViolationPenalty() {
    return { timeDelta: +1, costDelta: +1 }; // simple MVP penalty
}

function resourceMismatchPenalty(player: PlayerState, actReqW: number, actReqM: number) {
    // MVP: if insufficient workers or machines => +1 week
    const insufficient = player.workers < actReqW || player.machines < actReqM;
    return insufficient ? { timeDelta: +1, costDelta: 0 } : { timeDelta: 0, costDelta: 0 };
}

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
    
    if(!state.currentTurn) beginTurn(state);

    const outcome = rollDice();
    state.currentTurn!.roll = outcome.roll;

    if (outcome.cardType === "NONE") {
        state.currentTurn!.cardType = "NONE";
        state.currentTurn!.offeredCardIds = [];
        return;
    }

    let deck: "FIN" | "SITE" | "UPG" | "PROD";
    if (outcome.cardType === "CHOICE") {
        if (!chosenDeckIfFive) chosenDeckIfFive = "FIN";
        deck = chosenDeckIfFive;
        state.currentTurn!.cardType = "CHOICE";
    } else {
        deck = outcome.cardType;
        state.currentTurn!.cardType = outcome.cardType;
    }

    state.currentTurn!.offeredCardIds = topCards(state, deck, 2);
}

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

    // Determine deck
    const roll = state.currentTurn.roll!;
    let deck: "FIN" | "SITE" | "UPG" | "PROD" | null = null;

    if (roll === 1) deck = "PROD";
    if (roll === 2) deck = "UPG";
    if (roll === 3) deck = "FIN";
    if (roll === 4) deck = "SITE";
    if (roll === 5) deck = chosenDeckIfFive ?? "FIN";
    if (roll === 6) deck = null;

    // Choose card based on coinsSpent:
    // 0 => take top automatically
    // 1 => can see top (still takes top in MVP unless you extend)
    // 2 => can pick between 2 offered
    let usedCardId: string | null = null;
    if (deck) {
        const offered = topCards(state, deck, 2);
        if (coinsSpent === 2) {
            if (!chosenCardId || !offered.includes(chosenCardId)) throw new Error("Invalid chosen card.");
            // remove chosen card from draw and discard it
            state.decks[deck].draw = state.decks[deck].draw.filter(x => x !== chosenCardId);
            state.decks[deck].discard.push(chosenCardId);
            usedCardId = chosenCardId;
        } else {
            usedCardId = popCard(state, deck);
        }
    }

    // Normalize activities (important when loaded from DB)
    const acts = activitiesArray(state);

    const activity = acts[active.activityIndex];
    if (!activity) throw new Error("No activity found (activities not loaded).");

    const completedIds = new Set(
        acts.slice(0, active.activityIndex).map((a: any) => a.id)
    );


    // Dependency checks
    let depPenalty = { timeDelta: 0, costDelta: 0 };
    if (activity.dep.type === "FS") {
        const ok = activity.dep.on.every(x => completedIds.has(x));
        if (!ok) depPenalty = prereqViolationPenalty();
    }

    // SS bonus (MVP): if activity is SS and player productivity >=1 -> -1 time
    let ssBonus = 0;
    if (activity.dep.type === "SS" && active.productivity >= 1) ssBonus = -1;

    // Base time/cost with buffs
    const withBuffs = applyBuffs(active, activity.baseTime, activity.baseCost);

    // Resource mismatch penalty
    const resPenalty = resourceMismatchPenalty(active, activity.reqWorkers, activity.reqMachines);

    // Card effect
    let cardTime = 0, cardCost = 0, cardProd = 0, cardCoin = 0;
    if (usedCardId) {
        const card = CARD_BY_ID.get(usedCardId)!;
        cardTime = card.effect.timeDelta ?? 0;
        cardCost = card.effect.costDelta ?? 0;
        cardProd = card.effect.prodDelta ?? 0;
        cardCoin = card.effect.coinDelta ?? 0;
        if (card.effect.buff) {
            active.buffs.push({ id: usedCardId, remainingTurns: card.effect.buff.turns, effect: card.effect.buff.effect });
        }
    }

    // FIN “Progress Payment” implemented as negative cost delta (reduces cost)
    // Cost = spending BP, so:
    const actualTime =
        Math.max(
            0,
            withBuffs.t + depPenalty.timeDelta + resPenalty.timeDelta + cardTime + ssBonus
        );

    const actualCost =
        Math.max(
            0,
            withBuffs.c + depPenalty.costDelta + resPenalty.costDelta + cardCost
        );

    active.time += actualTime;
    active.bp -= actualCost;

    active.productivity += cardProd;
    active.coins += cardCoin;

    // Performance rewards (simple, expandable)
    // If no delay added by penalties -> +1 coin
    if (depPenalty.timeDelta === 0 && resPenalty.timeDelta === 0 && actualTime <= activity.baseTime) {
        active.coins += 1;
    }

    // Advance activity
    active.activityIndex += 1;

    tickBuffs(active);

    state.log.push(`${active.nickname} executed ${activity.id} (${activity.name}) | +${actualTime}w, -${actualCost}BP, card=${usedCardId ?? "NONE"}`);

    // End condition
    if (state.players.every(p => p.activityIndex >= acts.length)) {
        state.status = "FINISHED";
        state.log.push("Game finished.");
        return;
    }

    // Move to next player/round
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    if (state.turnIndex === 0) state.round += 1;

    state.currentTurn = undefined;

    beginTurn(state);
}
