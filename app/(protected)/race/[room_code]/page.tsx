"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebSocketConnect, useWebSocketMessage } from "@/app/utils/websocket";

interface Player  {
  username: string;
}

export default function RaceLobby() {
  const router = useRouter();
  const { room_code } = useParams<{ room_code: string }>();
  const { connect, disconnect, connected, error } = useWebSocketConnect();
  const connectionInitialized = useRef(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [uname, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!room_code || connectionInitialized.current) return;
    
    const username = localStorage.getItem("username") || "guest";
    setUsername(username);
    console.log("Component mounting - connecting with username:", username, "room_code:", room_code);
    
    connectionInitialized.current = true;
    connect(room_code, username);

    // return () => {
    //   console.log("Component unmounting");
    //   disconnect();
    //   connectionInitialized.current = false;
    // };
  }, [room_code, connect, disconnect]);

  useWebSocketMessage("player_list", (payload: string[]) => {
    console.log("Received player_list:", payload);
    console.log("Current players before update:", players.map(p => p.username));
    
    const playerObjects = payload.map(username => ({ username }));
    setPlayers(playerObjects);
    console.log("Updated players:", playerObjects.map(p => p.username));
  });

  useWebSocketMessage("countdown", (payload: { seconds: number }) => {
    console.log("Countdown:", payload.seconds);
    setCountdown(payload.seconds);
  });

  useWebSocketMessage("start", () => {
    console.log("Game starting!");
    router.push(`/game/${room_code}`);
  });


  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#323437] font-mono text-[#d1d0c5] px-4">
      <div className="w-full max-w-xl rounded-xl bg-[#171717] p-8 shadow-xl">
        <h1 className="text-center text-3xl font-extrabold text-[#e2b714]">Race Lobby</h1>
        <p className="mt-2 text-center text-lg font-semibold text-[#e2b714]">
          Room: {room_code}
        </p>
        
        {!connected && !error && (
          <div className="mt-2 text-center text-yellow-600">
            <p>Connecting...</p>
            <div className="mt-1 text-xs text-gray-500">
              Room: {room_code} | User: {uname}
            </div>
          </div>
        )}
        
        {error && (
          <p className="mt-2 text-center text-red-600">{error}</p>
        )}

        {countdown !== null && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">Race starts in...</p>
            <p className="text-2xl font-bold text-[#e2b714]">
              {countdown}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {isCreator && (
            <button
              disabled={players.length < 2 || loadingStart || !connected}
              onClick={() => {
                setLoadingStart(true);
                router.push(`/game/${room_code}`);
              }}
              className={`w-full rounded-md px-4 py-3 font-semibold text-[#171717] transition-colors ${
                players.length < 2 || loadingStart || !connected
                  ? "bg-[#888888] cursor-not-allowed" 
                  : "bg-[#e2b714] hover:bg-[#fff176]"
              }`}
            >
              {!connected
                ? "Connecting..."
                : players.length < 2
                ? `Waiting for players (${players.length}/2)`
                : loadingStart
                ? "Starting..."
                : "Start Race"}
            </button>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-[#e2b714]">
            Players ({players.length}/2)
          </h2>
          {players.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#888888]">
                {connected ? "Waiting for players to join..." : "Connecting..."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={`${player.username}-${index}`} className="flex items-center space-x-4 rounded-md bg-[#23242a] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e2b714] font-bold text-[#171717]">
                    {player.username[0].toUpperCase()}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-[#d1d0c5]">{player.username}</p>
                    {player.username === localStorage.getItem("username") && (
                      <p className="text-xs text-[#e2b714]">You</p>
                    )}
                  </div>
                </div>
              ))}
              {Array.from({ length: 2 - players.length }).map((_, index) => (
                <div key={`placeholder-${index}`} className="flex items-center space-x-4 rounded-md bg-[#23242a] p-3 border-2 border-dashed border-[#888888]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#888888] font-bold text-[#23242a]">
                    ?
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-[#888888]">Waiting for player...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}