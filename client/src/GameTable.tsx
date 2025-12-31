import React from "react";
import { GameState } from "../../shared/types";

export default function GameTable({ state }: { state: GameState }) {
    const activitiesArr = Array.isArray(state.activities)
        ? state.activities
        : Object.values((state.activities as any) ?? {});

    return (
        <div style={{ marginTop: 16 }}>
            <h3>Performance Table</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        {["Player", "Time (weeks)", "Cost (BP left)", "Coins", "Productivity", "Activity"].map(
                            (h) => (
                                <th
                                    key={h}
                                    style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}
                                >
                                    {h}
                                </th>
                            )
                        )}
                    </tr>
                </thead>
                <tbody>
                    {state.players.map((p) => {
                        const act = activitiesArr[p.activityIndex] as any;
                        return (
                            <tr key={p.id}>
                                <td style={{ padding: 6 }}>{p.nickname}</td>
                                <td style={{ padding: 6 }}>{p.time}</td>
                                <td style={{ padding: 6 }}>{p.bp}</td>
                                <td style={{ padding: 6 }}>{p.coins}</td>
                                <td style={{ padding: 6 }}>{p.productivity}</td>
                                <td style={{ padding: 6 }}>
                                    {act ? `${act.id ?? ""} ${act.name ?? ""}`.trim() : "DONE"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
