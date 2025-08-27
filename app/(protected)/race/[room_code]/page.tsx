"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Line } from "react-chartjs-2";
import { useWebSocketConnect, useWebSocketMessage } from "@/app/utils/websocket";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PlayerStats {
  wpm: number;
  accuracy: number;
  error: number;
}

interface GameOverData {
  winner: string;
  stats: Record<string, PlayerStats>;
  reason?: string;
}

export default function Game() {
  const router = useRouter();
  const { room_code } = useParams<{ room_code: string }>();
  const { connect, connected, error: connectionError } = useWebSocketConnect();

  // Game state
  const [stage, setStage] = useState("lobby"); // "lobby", "race", "results"
  const [words, setWords] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timer, setTimer] = useState(15);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [wpm, setWpm] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [error, setError] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);

  // Multiplayer state
  const [players, setPlayers] = useState<string[]>([]);
  const [opponentStats, setOpponentStats] = useState<Record<string, PlayerStats>>({});
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [username, setUsername] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const calculateWPM = useCallback(() => {
    if (!gameStartTime || !words) return 0;
    const prompt = words.join(' ');
    const elapsedMinutes = (Date.now() - gameStartTime.getTime()) / 60000;
    if (elapsedMinutes <= 0) return 0;
    const correctCharsTyped = input.split('').filter((char, index) => 
      char === prompt[index] && char !== ' '
    ).length;
    return Math.round(correctCharsTyped / 5 / elapsedMinutes);
  }, [gameStartTime, words, input]);

  const calculateAccuracy = useCallback(() => {
    if (totalChars === 0) return 100;
    return Math.round((correctChars / totalChars) * 100);
  }, [totalChars, correctChars]);

  const finishGame = useCallback(() => {
    setFinished(true);
    const finalWpm = calculateWPM();
    const finalAccuracy = calculateAccuracy();
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setStage("results");
  }, [calculateWPM, calculateAccuracy]);

  useEffect(() => {
    if (!room_code) return;
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      console.error("Username not found in localStorage.");
      return;
    }
    setUsername(storedUsername);
    connect(room_code, storedUsername);
  }, [room_code, connect]);

  useWebSocketMessage("player_list", (payload: string[]) => {
    setPlayers(payload);
  });

  useWebSocketMessage("countdown", (payload: { seconds: number }) => {
    setCountdown(payload.seconds);
  });

  useWebSocketMessage("start", () => {
    setStage("race");
    setGameStartTime(new Date());
  });

  useWebSocketMessage("stats_update", (payload: Record<string, PlayerStats>) => {
    setOpponentStats(prev => ({ ...prev, ...payload }));
  });

  useWebSocketMessage("game_over", (payload: GameOverData) => {
    console.log("Game over payload received:", payload);
    setGameOver(payload);
    if (payload.stats && payload.stats[username]) {
      setWpm(payload.stats[username].wpm);
      setAccuracy(payload.stats[username].accuracy);
      setError(payload.stats[username].error);
    }
    setFinished(true);
    setStage("results");
  });

  useEffect(() => {
    if (stage !== "race") return;
    if (!room_code) return;
    const token = localStorage.getItem("token");
    const fetchPrompt = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/race/${room_code}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.room && data.room.prompt) {
            setPrompt(data.room.prompt);
            setWords(data.room.prompt.split(" "));
          }
        }
      } catch (e) {
        console.error("Error fetching prompt:", e);
      }
    };
    fetchPrompt();
  }, [room_code, stage]);

  useEffect(() => {
    if (stage !== "race" || !gameStartTime || finished) return;
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
      const remainingTime = Math.max(0, 15 - elapsedSeconds);
      setTimer(remainingTime);
      if (remainingTime === 0 && !finished) {
        finishGame();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameStartTime, finished, stage, finishGame]);

  const calculateWPMRef = useRef(calculateWPM);
  calculateWPMRef.current = calculateWPM;
  const calculateAccuracyRef = useRef(calculateAccuracy);
  calculateAccuracyRef.current = calculateAccuracy;
  const errorRef = useRef(error);
  errorRef.current = error;

  useEffect(() => {
    if (stage !== "race" || !gameStartTime || finished || !connected) return;

    const localUpdateInterval = setInterval(() => {
      setLiveWpm(calculateWPMRef.current());
    }, 500);

    const broadcastStats = () => {
      const stats: PlayerStats = {
        wpm: calculateWPMRef.current(),
        accuracy: calculateAccuracyRef.current(),
        error: errorRef.current,
      };
      console.log("Broadcasting stats:", stats);
      if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
        window.wsConnection.send(JSON.stringify({ type: "stats_update", payload: stats }));
      }
    };

    const broadcastInterval = setInterval(broadcastStats, 5000);

    return () => {
      clearInterval(localUpdateInterval);
      clearInterval(broadcastInterval);
    };
  }, [gameStartTime, finished, connected, stage]);

  useEffect(() => {
    if (stage !== "race" || !words || finished) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (finished || timer === 0) return;
      if (!started) setStarted(true);
      const prompt = words.join(" ");
      if (e.key === "Backspace") {
        if (currentIdx > 0) {
          setInput((prev) => prev.slice(0, -1));
          setCurrentIdx((prev) => prev - 1);
          setTotalChars((prev) => prev - 1);
          const newIdx = currentIdx - 1;
          if (input[newIdx] === prompt[newIdx]) {
            setCorrectChars((prev) => prev - 1);
          } else {
            setError((prev) => prev - 1);
          }
        }
        return;
      }
      const allowed = /^[a-z ]$/;
      if (!allowed.test(e.key) || currentIdx >= prompt.length) return;
      setInput((prev) => prev + e.key);
      setTotalChars((prev) => prev + 1);
      if (e.key === prompt[currentIdx]) {
        setCorrectChars((prev) => prev + 1);
      } else {
        setError((prev) => prev + 1);
      }
      setCurrentIdx((prev) => prev + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [words, currentIdx, finished, timer, started, input, stage]);

  const sortedPlayers = useMemo(() => [...players].sort(), [players]);
  const leftPlayerName = sortedPlayers[0] || null;
  const rightPlayerName = sortedPlayers[1] || null;

  const isCurrentUserLeft = username === leftPlayerName;

  const leftPlayerStats = isCurrentUserLeft
    ? { wpm: liveWpm, accuracy: calculateAccuracy(), error: error }
    : opponentStats[leftPlayerName || ''] || { wpm: 0, accuracy: 0, error: 0 };

  const rightPlayerStats = !isCurrentUserLeft
    ? { wpm: liveWpm, accuracy: calculateAccuracy(), error: error }
    : opponentStats[rightPlayerName || ''] || { wpm: 0, accuracy: 0, error: 0 };

  const finalLeftPlayerStats = (gameOver?.stats || {})[leftPlayerName || ''] || { wpm: 0, accuracy: 0, error: 0 };
  const finalRightPlayerStats = (gameOver?.stats || {})[rightPlayerName || ''] || { wpm: 0, accuracy: 0, error: 0 };

  function backToLobby() { router.push(`/home`); }
  function newGame() { router.push('/'); }

  if (stage === "lobby") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#323437] font-mono text-[#d1d0c5] px-4">
        <div className="w-full max-w-xl rounded-xl bg-[#171717] p-8 shadow-xl">
          <h1 className="text-center text-3xl font-extrabold text-[#e2b714]">Race Lobby</h1>
          <p className="mt-2 text-center text-lg font-semibold text-[#e2b714]">Room: {room_code}</p>
          {!connected && !connectionError && (
            <div className="mt-2 text-center text-yellow-600">
              <p>Connecting...</p>
              <div className="mt-1 text-xs text-gray-500">Room: {room_code} | User: {username}</div>
            </div>
          )}
          {connectionError && <p className="mt-2 text-center text-red-600">{connectionError}</p>}
          {countdown !== null && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Race starts in...</p>
              <p className="text-2xl font-bold text-[#e2b714]">{countdown}</p>
            </div>
          )}
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold text-[#e2b714]">Players ({players.length}/2)</h2>
            {players.length === 0 ? (
              <div className="text-center py-8"><p className="text-[#888888]">{connected ? "Waiting for players to join..." : "Connecting..."}</p></div>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={`${player}-${index}`} className="flex items-center space-x-4 rounded-md bg-[#23242a] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e2b714] font-bold text-[#171717]">{player[0].toUpperCase()}</div>
                    <div className="flex-grow">
                      <p className="font-medium text-[#d1d0c5]">{player}</p>
                      {player === username && <p className="text-xs text-[#e2b714]">You</p>}
                    </div>
                  </div>
                ))}
                {Array.from({ length: 2 - players.length }).map((_, index) => (
                  <div key={`placeholder-${index}`} className="flex items-center space-x-4 rounded-md bg-[#23242a] p-3 border-2 border-dashed border-[#888888]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#888888] font-bold text-[#23242a]">?</div>
                    <div className="flex-grow"><p className="font-medium text-[#888888]">Waiting for player...</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (stage === "race" && !words) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#323437] font-mono text-[#d1d0c5]">
        <div className="text-center">
          <div className="text-4xl font-bold text-[#e2b714] mb-4">Loading Game...</div>
          <div className="text-xl mb-8">Preparing the race...</div>
        </div>
      </main>
    );
  }
  
  if (stage === "race" && words) {
    return (
      <main className="min-h-screen flex flex-col items-center pt-20 bg-[#323437] font-mono text-[#d1d0c5]">
        <div className="w-full max-w-6xl px-8 pt-12">
          <div className="flex justify-between items-center mb-8">
            <span className="text-[#e2b714] text-lg font-bold">Multiplayer Race - Room: {room_code}</span>
            <div className="flex items-center gap-6">
              <span className="text-[#e2b714] text-lg font-bold">{timer}s</span>
            </div>
          </div>

          <div className="mb-6 flex justify-between bg-[#23242a] rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="text-[#e2b714] font-bold">{leftPlayerName}</div>
              <div className="text-[#d1d0c5]">WPM: {leftPlayerStats.wpm}</div>
              <div className="text-[#d1d0c5]">Acc: {leftPlayerStats.accuracy}%</div>
              <div className="text-[#ca4754]">Errors: {leftPlayerStats.error}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[#ca4754] font-bold">{rightPlayerName}</div>
              <div className="text-[#d1d0c5]">WPM: {rightPlayerStats.wpm}</div>
              <div className="text-[#d1d0c5]">Acc: {rightPlayerStats.accuracy}%</div>
              <div className="text-[#ca4754]">Errors: {rightPlayerStats.error}</div>
            </div>
          </div>

          <div className="mb-12 text-3xl leading-relaxed break-words whitespace-pre-wrap w-full min-h-[120px]">
            {prompt && prompt.split("").map((char, idx) => {
              let style = "";
              if (idx < input.length) {
                style = input[idx] === char ? "text-white" : "text-[#ff6f6f]";
              } else if (idx === currentIdx && !finished && timer > 0) {
                style = "bg-[#e2b714] text-[#171717] animate-pulse";
              } else {
                style = "text-[#888888]";
              }
              return <span key={idx} className={style}>{char}</span>;
            })}
          </div>
        </div>
      </main>
    );
  }

  if (stage === "results") {
    return (
      <main className="min-h-screen flex flex-col items-center pt-20 bg-[#323437] font-mono text-[#d1d0c5]">
        <div className="w-full max-w-6xl px-8 pt-12">
          {gameOver && (
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-[#e2b714] mb-4">
                {gameOver.winner === username ? "You Won!" : `${gameOver.winner} Won!`}
              </div>
              {gameOver.reason && <div className="text-xl text-[#888888] mb-4">{gameOver.reason}</div>}
            </div>
          )}

          <div className="flex flex-row w-full max-w-6xl mx-auto items-stretch mt-4 mb-8 gap-8">
            <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
              <div className="text-lg font-bold text-[#e2b714] mb-2">{leftPlayerName}</div>
              <div className="text-3xl font-bold text-[#d1d0c5] mb-1">wpm</div>
              <div className="text-5xl font-bold text-[#e2b714] leading-none mb-4">{finalLeftPlayerStats.wpm}</div>
              <div className="text-3xl font-bold text-[#d1d0c5] mb-1">acc</div>
              <div className="text-5xl font-bold text-[#e2b714] leading-none mb-6">{finalLeftPlayerStats.accuracy}%</div>
              <div className="text-[#d1d0c5] text-base mb-1">error</div>
              <div className="text-[#ca4754] text-2xl font-bold">{finalLeftPlayerStats.error}</div>
            </div>

            <div className="flex flex-col justify-center items-center w-full max-w-2xl mx-auto bg-[#171717] rounded-xl p-6">
              <div className="w-full">
                <Line
                  data={{
                    labels: Array.from({ length: 15 }, (_, i) => (i + 1).toString()),
                    datasets: [
                      {
                        label: `${leftPlayerName} WPM`,
                        data: [], // This needs to be implemented
                        borderColor: '#e2b714',
                        backgroundColor: 'rgba(226,183,20,0.2)',
                        tension: 0.3,
                        pointRadius: 2,
                      },
                      {
                        label: `${rightPlayerName} WPM`,
                        data: [], // This needs to be implemented
                        borderColor: '#ca4754',
                        backgroundColor: 'rgba(202,71,84,0.2)',
                        tension: 0.3,
                        pointRadius: 2,
                      }
                    ],
                  }}
                  options={{ responsive: true, plugins: { legend: { display: true, position: 'top', labels: { color: '#e2b714' } }, title: { display: true, text: 'WPM Comparison', color: '#e2b714', font: { size: 20 } } }, scales: { x: { grid: { color: '#23242a' }, ticks: { color: '#d1d0c5' }, title: { display: true, text: 'Seconds', color: '#e2b714', font: { size: 16 } } }, y: { grid: { color: '#23242a' }, ticks: { color: '#d1d0c5' }, title: { display: true, text: 'WPM', color: '#e2b714', font: { size: 16 } }, min: 0 } } }}
                  height={180}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
              <div className="text-lg font-bold text-[#ca4754] mb-2">{rightPlayerName}</div>
              <div className="text-3xl font-bold text-[#d1d0c5] mb-1">wpm</div>
              <div className="text-5xl font-bold text-[#ca4754] leading-none mb-4">{finalRightPlayerStats.wpm}</div>
              <div className="text-3xl font-bold text-[#d1d0c5] mb-1">acc</div>
              <div className="text-5xl font-bold text-[#ca4754] leading-none mb-6">{finalRightPlayerStats.accuracy}%</div>
              <div className="text-[#d1d0c5] text-base mb-1">error</div>
              <div className="text-[#ca4754] text-2xl font-bold">{finalRightPlayerStats.error}</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button className="px-7 py-3 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition text-lg" onClick={backToLobby}>Back to Lobby</button>
            <button className="px-7 py-3 rounded bg-[#ca4754] text-white font-semibold hover:bg-[#ff6b6b] transition text-lg" onClick={newGame}>New Game</button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
