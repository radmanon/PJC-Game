import { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";

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

    if (!state) return <div style={{ padding: 20 }}>Waiting for game state...</div>;

    const isActive = state.status === "ACTIVE";

    // Normalize activities to an array
    const activitiesArr = useMemo(() => {
        const a = state?.activities;
        if (Array.isArray(a)) return a;
        if (a && typeof a === "object") return Object.values(a);
        return [];
    }, [state]);

    // Identify me by playerId (reliable)
    const me = useMemo(() => {
        return (
            state?.players?.find((p: any) => p.id === playerId) ??
            state?.players?.find((p: any) => p.nickname === nickname) ??
            null
        );
    }, [state, playerId, nickname]);

    const activeId = useMemo(() => {
        return state.currentTurn?.activePlayerId ?? state.players?.[state.turnIndex]?.id ?? null;
    }, [state]);

    const hostId = useMemo(() => {
        return state.hostPlayerId ?? state.hostId ?? null;
    }, [state]);

    const isMyTurn = !!me?.id && activeId === me.id;
    const isHost = !!me?.id && hostId === me.id;

    const activeName =
        state.players.find((p: any) => p.id === activeId)?.nickname ?? "?";

    function activityLabel(activityIndex: number) {
        const act = activitiesArr?.[activityIndex];
        if (!act) return "DONE";
        const id = act.id ?? "";
        const name = act.name ?? "";
        return `${id} ${name}`.trim();
    }

    const hasRolled = !!state.currentTurn?.roll;

    const canRoll = isActive && isMyTurn;
    const canApply = isActive && isMyTurn && hasRolled;

    return (
        <div style={{ padding: 20 }}>
            <h3>Room: {roomId}</h3>

            <p>
                You: <b>{nickname}</b> ({playerId.slice(0, 6)}...) | Status:{" "}
                <b>{state.status}</b> | Round: <b>{state.round ?? 1}</b>
            </p>

            {state.status === "LOBBY" && (
                <button disabled={!isHost} onClick={() => socket.emit("game:start")}>
                    Start Game (Host)
                </button>
            )}

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
                    <b>{(state.currentTurn?.offeredCardIds ?? []).join(", ") || "-"}</b>
                </div>
            </div>

            {isMyTurn ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button disabled={!canRoll} onClick={() => socket.emit("turn:roll", {})}>
                        Roll Dice
                    </button>

                    <button
                        disabled={!canApply}
                        onClick={() => socket.emit("turn:apply", { coinsSpent: 0 })}
                    >
                        Take Top Card (0 coins)
                    </button>
                </div>
            ) : (
                <p>Waiting...</p>
            )}

            <hr/>

            <h4>Log</h4>
            <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #ddd", padding: 8 }}>
                {(state.log || []).slice(-30).map((x: string, i: number) => (
                    <div key={i}>{x}</div>
                ))}
            </div>
        </div>
    );
}
