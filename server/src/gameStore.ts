import { supabase } from "./supabase";
import { GameState } from "../../shared/types";

// In-memory fallback so the game still works if Supabase is down/misconfigured
const mem = new Map<string, GameState>();

export async function saveGame(state: GameState) {
    // Always write to memory first
    mem.set(state.roomCode, state);

    // Then try Supabase (optional)
    try {
        const { error } = await supabase.from("games").upsert({
            room_code: state.roomCode,
            state,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.warn("[saveGame] Supabase error:", error.message);
        }
    } catch (e: any) {
        console.warn("[saveGame] Supabase exception:", e?.message ?? e);
    }
}

export async function loadGame(roomCode: string): Promise<GameState | null> {
    // Prefer memory if available
    const inMem = mem.get(roomCode);
    if (inMem) return inMem;

    // Try Supabase
    try {
        const { data, error } = await supabase
            .from("games")
            .select("state")
            .eq("room_code", roomCode)
            .maybeSingle();

        if (error) {
            console.warn("[loadGame] Supabase error:", error.message);
            return null;
        }

        const state = (data?.state as GameState) ?? null;
        if (state) mem.set(roomCode, state);
        return state;
    } catch (e: any) {
        console.warn("[loadGame] Supabase exception:", e?.message ?? e);
        return null;
    }
}
