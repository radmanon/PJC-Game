import { useState } from "react";
import Lobby from "./Lobby";
import Room from "./Room";

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [initialState, setInitialState] = useState<any>(null);

  if (!roomId) {
    return (
      <Lobby
        onJoin={(r, n, pid, s) => {
          setRoomId(r);
          setNickname(n);
          setPlayerId(pid);
          setInitialState(s);
        }}
      />
    );
  }

  return (
    <Room
      roomId={roomId}
      nickname={nickname}
      playerId={playerId}
      initialState={initialState}
    />
  );
}
