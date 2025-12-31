import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";

export default function Lobby({
    onJoin
}: {
    onJoin: (roomId: string, nickname: string, playerId: string, state: any) => void;
}) {
    const [nickname, setNickname] = useState("");
    const [roomCode, setRoomCode] = useState("");

    const joinedRoomRef = useRef<string>("");

    useEffect(() => {
        const onJoined = (data: any) => {
            const code = data.roomCode ?? data.roomId ?? data.code;
            const pid = data.playerId ?? data.pid ?? "";
            joinedRoomRef.current = code;

            onJoin(code, nickname, pid, data.state ?? null);
        };

        const onError = (e: any) => alert(e?.message ?? String(e));

        socket.on("room:joined", onJoined);
        socket.on("error:msg", onError);

        return () => {
            socket.off("room:joined", onJoined);
            socket.off("error:msg", onError);
        };
    }, [nickname, onJoin]);

    function createRoom() {
        socket.connect();
        socket.emit("room:create", { nickname });
    }

    function joinRoom() {
        socket.connect();
        socket.emit("room:join", { roomCode, nickname });
    }

    return (
        <div style={{ padding: 30 }}>
            <h2>PJC Construction Game</h2>

            <input
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
            />

            <hr />

            <button onClick={createRoom} disabled={!nickname}>
                Create Room
            </button>

            <hr />

            <input
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button onClick={joinRoom} disabled={!nickname || !roomCode}>
                Join Room
            </button>
        </div>
    );
}
