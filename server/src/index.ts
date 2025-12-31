// server/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "node:crypto";

import { loadGame, saveGame } from "./gameStore";
import { makeRoomCode, newGameState, startGame, rollAndOffer, applyTurn } from "./gameLogic";
import type { GameState } from "../../shared/types";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.get("/health", (_, res) => res.json({ ok: true }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
});

type ClientCtx = { roomCode?: string; playerId?: string };
const ctxBySocket = new Map<string, ClientCtx>();

async function broadcastState(roomCode: string, state: GameState) {
    // save async (don’t block broadcast)
    saveGame(state).catch((e) => console.warn("[broadcastState] saveGame failed:", e?.message ?? e));
    io.to(roomCode).emit("state:update", state);
}

io.on("connection", (socket) => {
    ctxBySocket.set(socket.id, {});
    socket.emit("connected", { socketId: socket.id });

    socket.on("room:create", async ({ nickname }: { nickname: string }) => {
        const roomCode = makeRoomCode();
        const playerId = crypto.randomUUID();

        const state = newGameState(roomCode, playerId, nickname);
        await saveGame(state);

        ctxBySocket.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        socket.emit("room:joined", { roomCode, playerId, state });
    });

    socket.on("room:join", async ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
        const state = await loadGame(roomCode);
        if (!state) return socket.emit("error:msg", { message: "Room not found." });
        if (state.status !== "LOBBY") return socket.emit("error:msg", { message: "Game already started." });

        const playerId = crypto.randomUUID();
        state.players.push({
            id: playerId,
            nickname,
            bp: 30,
            coins: 6,
            workers: 3,
            machines: 1,
            productivity: 0,
            time: 0,
            activityIndex: 0,
            completedActivityIds: [], // ✅ important for activity choice
            buffs: [],
        });

        state.log.push(`${nickname} joined.`);

        ctxBySocket.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        await broadcastState(roomCode, state);
        socket.emit("room:joined", { roomCode, playerId, state });
    });

    socket.on("game:start", async () => {
        const ctx = ctxBySocket.get(socket.id);
        if (!ctx?.roomCode || !ctx?.playerId) return;

        const state = await loadGame(ctx.roomCode);
        if (!state) return;

        if (state.hostPlayerId !== ctx.playerId) {
            return socket.emit("error:msg", { message: "Only host can start." });
        }

        try {
            startGame(state);
            await broadcastState(ctx.roomCode, state);
        } catch (e: any) {
            socket.emit("error:msg", { message: e?.message ?? "Start failed" });
        }
    });

    socket.on(
        "turn:roll",
        async ({ chosenDeckIfFive }: { chosenDeckIfFive?: "FIN" | "SITE" | "UPG" | "PROD" }) => {
            const ctx = ctxBySocket.get(socket.id);
            if (!ctx?.roomCode || !ctx?.playerId) return;

            const state = await loadGame(ctx.roomCode);
            if (!state) return;

            if (state.status !== "ACTIVE") {
                return socket.emit("error:msg", { message: "Game not active." });
            }
            if (state.currentTurn?.activePlayerId !== ctx.playerId) {
                return socket.emit("error:msg", { message: "Not your turn." });
            }

            try {
                rollAndOffer(state, chosenDeckIfFive);
                await broadcastState(ctx.roomCode, state);
            } catch (e: any) {
                socket.emit("error:msg", { message: e?.message ?? "Roll failed" });
            }
        }
    );

    socket.on("turn:apply", async (payload: any) => {
        const ctx = ctxBySocket.get(socket.id);
        if (!ctx?.roomCode || !ctx?.playerId) return;

        try {
            const state = await loadGame(ctx.roomCode);
            if (!state) throw new Error("Room not found.");

            applyTurn(
                state,
                ctx.playerId, // ✅ use ctx, not socket.data
                payload.coinsSpent ?? 0,
                payload.chosenCardId,
                payload.chosenDeckIfFive,
                payload.chosenActivityId // ✅ activity choice
            );

            await broadcastState(ctx.roomCode, state);
        } catch (e: any) {
            socket.emit("error:msg", { message: e?.message ?? String(e) });
        }
    });

    socket.on("disconnect", () => {
        ctxBySocket.delete(socket.id);
    });
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => console.log(`Server listening on ${port}`));
