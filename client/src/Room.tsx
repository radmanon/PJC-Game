// client/src/Room.tsx
import { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";
import { CARDS } from "../../shared/cards";

type Deck = "FIN" | "SITE" | "UPG" | "PROD";

export default function Room({
    roomId,
    nickname,
    playerId,
    initialState,
}: {
    roomId: string;
    nickname: string;
    playerId: string;
    initialState: any;
}) {
    const [state, setState] = useState<any>(initialState);

    // UI selections
    const [chosenActivityId, setChosenActivityId] = useState<string>("");
    const [chosenDeckIfFive, setChosenDeckIfFive] = useState<Deck>("FIN");
    const [chosenCardId, setChosenCardId] = useState<string>(""); // pick 1 of 2 offered

    useEffect(() => {
        const onUpdate = (s: any) => setState(s);
        const onError = (e: any) => alert(e?.message ?? String(e));

        socket.on("state:update", onUpdate);
        socket.on("game:state", onUpdate);
        socket.on("error:msg", onError);

        return () => {
            socket.off("state:update", onUpdate);
            socket.off("game:state", onUpdate);
            socket.off("error:msg", onError);
        };
    }, []);

    const cardById = useMemo(() => {
        const m = new Map<string, any>();
        for (const c of CARDS) m.set(c.id, c);
        return m;
    }, []);

    const activitiesArr = useMemo(() => {
        const a = state?.activities;
        if (Array.isArray(a)) return a;
        if (a && typeof a === "object") return Object.values(a);
        return [];
    }, [state]);

    const me = useMemo(() => {
        return (
            state?.players?.find((p: any) => p.id === playerId) ??
            state?.players?.find((p: any) => p.nickname === nickname) ??
            null
        );
    }, [state, playerId, nickname]);

    const activeId = useMemo(() => {
        return state?.currentTurn?.activePlayerId ?? state?.players?.[state?.turnIndex]?.id ?? null;
    }, [state]);

    const activeName = useMemo(() => {
        return state?.players?.find((p: any) => p.id === activeId)?.nickname ?? "?";
    }, [state, activeId]);

    const isHost = state?.hostPlayerId === me?.id;
    const isMyTurn = !!me?.id && activeId === me.id;

    const gameIsLobby = state?.status === "LOBBY";
    const gameIsActive = state?.status === "ACTIVE";

    const canStart = gameIsLobby && isHost && (state?.players?.length ?? 0) >= 2;
    const canRoll = isMyTurn && gameIsActive;
    const canApply = isMyTurn && gameIsActive && !!state?.currentTurn?.roll;

    // completed activities set
    const completedSet = useMemo(() => {
        const done = new Set<string>();
        const idx = me?.activityIndex ?? 0;
        activitiesArr.slice(0, idx).forEach((a: any) => done.add(a.id));
        return done;
    }, [me, activitiesArr]);

    // available activities
    const availableActivities = useMemo(() => {
        return activitiesArr.filter((a: any) => {
            if (!a?.id) return false;
            if (completedSet.has(a.id)) return false;

            const dep = a.dep ?? { type: "NONE" };

            if (dep.type === "FS") {
                const onList = dep.on ?? [];
                return onList.every((x: string) => completedSet.has(x));
            }

            // SS or NONE: allow (we show warning)
            return true;
        });
    }, [activitiesArr, completedSet]);

    // default chosen activity = next available
    useEffect(() => {
        if (!chosenActivityId) {
            const next = availableActivities[0]?.id;
            if (next) setChosenActivityId(next);
        } else {
            if (completedSet.has(chosenActivityId)) {
                const next = availableActivities[0]?.id;
                setChosenActivityId(next ?? "");
            }
        }
    }, [availableActivities, completedSet, chosenActivityId]);

    function activityLabel(activityIndex: number) {
        const act = activitiesArr?.[activityIndex];
        if (!act) return "DONE";
        const id = act.id ?? "";
        const name = act.name ?? "";
        return `${id} ${name}`.trim();
    }

    // dependency warning for selected activity
    const dependencyWarning = useMemo(() => {
        const a = activitiesArr.find((x: any) => x?.id === chosenActivityId);
        if (!a) return "";

        const dep = a.dep ?? { type: "NONE" };

        if (dep.type === "FS") {
            const unmet = (dep.on ?? []).filter((x: string) => !completedSet.has(x));
            if (unmet.length) return `FS prereqs not done: ${unmet.join(", ")} (penalty may apply)`;
            return "";
        }

        if (dep.type === "SS") {
            const withList = dep.with ?? [];
            const started = withList.some((x: string) => completedSet.has(x));
            if (!started && withList.length)
                return `SS overlap: usually starts with ${withList.join(", ")} (you may get slower progress)`;
            return "";
        }

        return "";
    }, [activitiesArr, chosenActivityId, completedSet]);

    // offered cards (2)
    const offeredCardIds: string[] = state?.currentTurn?.offeredCardIds ?? [];

    const offeredCards = useMemo(() => {
        return offeredCardIds.map((id) => {
            const c = cardById.get(id);
            return {
                id,
                title: c?.title ?? "Unknown",
                rulesText: c?.rulesText ?? "",
                type: c?.type ?? state?.currentTurn?.cardType ?? "",
            };
        });
    }, [offeredCardIds, cardById, state]);

    // default chosen offered card = first (when new offer arrives)
    useEffect(() => {
        if (offeredCardIds.length) {
            if (!chosenCardId || !offeredCardIds.includes(chosenCardId)) {
                setChosenCardId(offeredCardIds[0]);
            }
        } else {
            setChosenCardId("");
        }
    }, [offeredCardIds, chosenCardId]);

    const serverWarnings: string[] = useMemo(() => {
        const w = state?.currentTurn?.warnings;
        return Array.isArray(w) ? w : [];
    }, [state]);

    if (!state) return <div style={{ padding: 20 }}>Waiting for game state...</div>;

    return (
        <div style={{ padding: 20 }}>
            <h3>Room: {roomId}</h3>

            <p>
                You: <b>{nickname}</b> ({playerId.slice(0, 6)}...) | Status: <b>{state.status}</b> | Round:{" "}
                <b>{state.round ?? 1}</b>
            </p>

            <hr />

            <h4>Performance Table</h4>
            <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>BP</th>
                        <th>Coins</th>
                        <th>Time</th>
                        <th>Prod</th>
                        <th>Activity</th>
                    </tr>
                </thead>
                <tbody>
                    {state.players.map((p: any) => (
                        <tr key={p.id} style={p.id === activeId ? { fontWeight: "bold" } : undefined}>
                            <td>{p.nickname}</td>
                            <td>{p.bp}</td>
                            <td>{p.coins}</td>
                            <td>{p.time}</td>
                            <td>{p.productivity}</td>
                            <td>{activityLabel(p.activityIndex)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <hr />

            <h4>Turn</h4>
            <p>
                Active: <b>{activeName}</b>
            </p>

            <div style={{ marginTop: 8, padding: 8, border: "1px dashed #bbb" }}>
                <div>
                    Roll: <b>{state.currentTurn?.roll ?? "-"}</b>
                </div>
                <div>
                    CardType: <b>{state.currentTurn?.cardType ?? "-"}</b>
                </div>
                <div>
                    Offered:{" "}
                    <b>
                        {offeredCardIds.length ? offeredCardIds.join(", ") : "-"}
                    </b>
                </div>
            </div>

            {/* LOBBY: Start Game */}
            {gameIsLobby ? (
                <div style={{ marginTop: 12 }}>
                    <p>Waiting for host to start the game...</p>

                    {canStart ? (
                        <button onClick={() => socket.emit("game:start")}>Start Game</button>
                    ) : (
                        <p style={{ color: "#666" }}>
                            {isHost
                                ? "Need at least 2 players to start."
                                : "Only host can start."}
                        </p>
                    )}
                </div>
            ) : null}

            {/* ACTIVE: actions */}
            {gameIsActive ? (
                isMyTurn ? (
                    <div style={{ marginTop: 12 }}>
                        {/* Activity Choice */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ marginBottom: 6 }}>
                                <b>Choose Activity:</b>
                            </div>

                            <select
                                value={chosenActivityId}
                                onChange={(e) => setChosenActivityId(e.target.value)}
                                style={{ padding: 6, minWidth: 340 }}
                            >
                                {availableActivities.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                        {a.id} — {a.name} (t:{a.baseTime}, BP:{a.baseCost})
                                    </option>
                                ))}
                            </select>

                            {dependencyWarning ? (
                                <div style={{ marginTop: 8, color: "crimson" }}>⚠ {dependencyWarning}</div>
                            ) : null}

                            {serverWarnings.length ? (
                                <div style={{ marginTop: 8, color: "crimson" }}>
                                    {serverWarnings.map((w, i) => (
                                        <div key={i}>⚠ {w}</div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {/* CHOICE deck picker appears when roll = 5 produced CHOICE */}
                        {state.currentTurn?.cardType === "CHOICE" ? (
                            <div style={{ marginBottom: 10 }}>
                                <b>CHOICE deck:</b>{" "}
                                <select
                                    value={chosenDeckIfFive}
                                    onChange={(e) => setChosenDeckIfFive(e.target.value as Deck)}
                                >
                                    <option value="FIN">FIN</option>
                                    <option value="SITE">SITE</option>
                                    <option value="UPG">UPG</option>
                                    <option value="PROD">PROD</option>
                                </select>
                            </div>
                        ) : null}

                        {/* Offered cards with description */}
                        {offeredCards.length ? (
                            <div style={{ marginBottom: 10, padding: 8, border: "1px solid #eee" }}>
                                <b>Offered Cards:</b>
                                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {offeredCards.map((c) => (
                                        <label key={c.id} style={{ cursor: "pointer" }}>
                                            <input
                                                type="radio"
                                                name="chosenCard"
                                                value={c.id}
                                                checked={chosenCardId === c.id}
                                                onChange={() => setChosenCardId(c.id)}
                                                style={{ marginRight: 8 }}
                                            />
                                            <b>{c.id}</b> — {c.title} <span style={{ color: "#666" }}>({c.rulesText})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button disabled={!canRoll} onClick={() => socket.emit("turn:roll", { chosenDeckIfFive })}>
                                Roll Dice
                            </button>

                            {/* 0 coins: take top card */}
                            <button
                                disabled={!canApply}
                                onClick={() =>
                                    socket.emit("turn:apply", {
                                        coinsSpent: 0,
                                        chosenDeckIfFive,
                                        chosenActivityId,
                                    })
                                }
                            >
                                Take Top Card (0 coins)
                            </button>

                            {/* 2 coins: choose between offered cards */}
                            <button
                                disabled={!canApply || !chosenCardId}
                                onClick={() =>
                                    socket.emit("turn:apply", {
                                        coinsSpent: 2,
                                        chosenCardId,
                                        chosenDeckIfFive,
                                        chosenActivityId,
                                    })
                                }
                            >
                                Choose Offered Card (2 coins)
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={{ marginTop: 10 }}>Waiting...</p>
                )
            ) : null}

            <hr />

            <h4>Log</h4>
            <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #ddd", padding: 8 }}>
                {(state.log || []).slice(-30).map((x: string, i: number) => (
                    <div key={i}>{x}</div>
                ))}
            </div>
        </div>
    );
}
