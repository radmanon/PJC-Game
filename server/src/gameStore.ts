import fs from "node:fs/promises";
import path from "node:path";
import * as ActivitiesModule from "../../shared/activities";
import type { GameState } from "../../shared/types";

const DATA_DIR = path.join(process.cwd(), "data", "rooms");

const ACTIVITIES =
    (ActivitiesModule as any).default ??
    (ActivitiesModule as any).ACTIVITIES ??
    ActivitiesModule;

async function ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

function roomFile(roomCode: string) {
    return path.join(DATA_DIR, `${roomCode}.json`);
}

export async function saveGame(state: GameState) {
    await ensureDir();
    const file = roomFile(state.roomCode);
    await fs.writeFile(file, JSON.stringify(state, null, 2), "utf-8");
}

export async function loadGame(roomCode: string): Promise<GameState | null> {
    try {
        await ensureDir();
        const file = roomFile(roomCode);
        const raw = await fs.readFile(file, "utf-8");
        const state = JSON.parse(raw) as GameState;

        // ✅ always hydrate activities from code and ensure it's a plain array
        (state as any).activities = Array.isArray(ACTIVITIES)
            ? ACTIVITIES
            : (ACTIVITIES as any).default ?? [];

        return state;
    } catch (err: any) {
        if (err?.code === "ENOENT") return null;
        console.warn("[loadGame] failed:", err?.message ?? err);
        return null;
    }
}

export async function deleteGame(roomCode: string) {
    try {
        await fs.unlink(roomFile(roomCode));
    } catch (err: any) {
        if (err?.code !== "ENOENT") console.warn("[deleteGame] failed:", err?.message ?? err);
    }
}
