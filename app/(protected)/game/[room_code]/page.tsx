"use client";

import { useState, useRef, useEffect } from "react";
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

const WORDS = [
  "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "monkey", "type", "race", "speed", "accuracy", "keyboard", "challenge", "winner", "loser", "game", "play"
];

function getWords(count: number) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return arr;
}

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
  const { connect, disconnect, connected, error } = useWebSocketConnect();
  const connectionInitialized = useRef(false);

  const [countdown, setCountdown] = useState<number | null>(null);

  // Game state
  const [words, setWords] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timer, setTimer] = useState(15);
  const [wpm, setWpm] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Multiplayer state
  const [players, setPlayers] = useState<string[]>([]);
  const [opponentStats, setOpponentStats] = useState<Record<string, PlayerStats>>({});
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [username, setUsername] = useState<string>("");
  const [waitingForStart, setWaitingForStart] = useState(true);

  useEffect(() => {
    if (!room_code || connectionInitialized.current) return;
    
    const storedUsername = localStorage.getItem("username") || "guest";
    setUsername(storedUsername);
    connectionInitialized.current = true;
    connect(room_code, storedUsername);

    return () => {
      disconnect();
      connectionInitialized.current = false;
    };
  }, [room_code, connect, disconnect]);

  useWebSocketMessage("player_list", (payload: string[]) => {
    setPlayers(payload);
  });

  useWebSocketMessage("countdown", (payload: { seconds: number }) => {
    console.log("Countdown:", payload.seconds);
    setCountdown(payload.seconds);
  });

  useWebSocketMessage("start", () => {
    console.log("Game starting!");
    setWaitingForStart(false);
    if (words === null) {
      setWords(getWords(30));
    }
  });

  useWebSocketMessage("stats_update", (payload: Record<string, PlayerStats>) => {
    setOpponentStats(prev => ({ ...prev, ...payload }));
  });

  useWebSocketMessage("game_over", (payload: GameOverData) => {
    console.log("Game over!", payload);
    setGameOver(payload);
    setFinished(true);
    setWaitingForStart(false);
  });


  useEffect(() => {
    if (!room_code) return;
    const token = localStorage.getItem("token");
    const fetchPrompt = async () => {
      try {
        const res = await fetch(`${process.env.API_URL || "http://localhost:8080/api"}/race/${room_code}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
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
  }, [room_code]);

  // Game timer
  useEffect(() => {
    if (started && !finished && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (timer === 0 && started && !finished) {
      finishGame();
    }
  }, [started, timer, finished]);

  // Live WPM calculation and broadcasting
  useEffect(() => {
    if (!started || finished || !connected) return;
    
    const prompt = words ? words.join(' ') : '';
    const correctCharsCount = input.split('').filter((c, i) => c === prompt[i] && c !== ' ').length;
    const elapsed = 15 - timer;
    const wpmNow = elapsed > 0 ? Math.round((correctCharsCount / 5) / (elapsed / 60)) : 0;
    const currentAccuracy = totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 100);
    
    setLiveWpm(wpmNow);

    // Broadcast stats to other players
    const stats: PlayerStats = {
      wpm: wpmNow,
      accuracy: currentAccuracy,
      error: errors
    };

    if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
      window.wsConnection.send(JSON.stringify({
        type: "stats_update",
        payload: stats
      }));
    }
  }, [input, timer, started, finished, connected, correctChars, totalChars, errors, words]);

  // Game input handling
  useEffect(() => {
    if (!words || waitingForStart) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (finished || timer === 0) return;
      if (!started) setStarted(true);
      
      const prompt = words.join(" ");
      
      if (e.key === "Backspace") {
        if (currentIdx > 0) {
          setInput((prev) => prev.slice(0, -1));
          setCurrentIdx((prev) => prev - 1);
          setTotalChars((prev) => prev - 1);
          setCorrectChars((prev) => {
            const idx = currentIdx - 1;
            if (input[idx] === prompt[idx]) return prev - 1;
            return prev;
          });
          setErrors((prev) => {
            const idx = currentIdx - 1;
            if (input[idx] !== prompt[idx]) return prev - 1;
            return prev;
          });
        }
        return;
      }
      
      const allowed = /^[a-z ]$/;
      if (!allowed.test(e.key)) return;
      if (currentIdx >= prompt.length) return;
      
      setInput((prev) => prev + e.key);
      setTotalChars((prev) => prev + 1);
      
      if (e.key === prompt[currentIdx]) {
        setCorrectChars((prev) => prev + 1);
      } else {
        setErrors((prev) => prev + 1);
      }
      setCurrentIdx((prev) => prev + 1);
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [words, currentIdx, finished, timer, started, input, waitingForStart]);

  function finishGame() {
    setFinished(true);
    let nonSpaceCorrect = 0;
    if (words) {
      const prompt = words.join(' ');
      nonSpaceCorrect = input.split('').filter((c, i) => c === prompt[i] && c !== ' ').length;
    }
    const wpmCalc = Math.round((nonSpaceCorrect / 5) / (15 / 60));
    setWpm(wpmCalc);
    const acc = totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 100);
    setAccuracy(acc);
  }

  function backToLobby() {
    router.push(`/home`);
  }

  function newGame() {
    router.push('/');
  }

  // Get opponent data
  const opponent = players.find(p => p !== username) || "Opponent";
  const opponentData = opponentStats[opponent] || { wpm: 0, accuracy: 0, error: 0 };

  if (waitingForStart) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#323437] font-mono text-[#d1d0c5]">
        <div className="text-center">
          <div className="text-4xl font-bold text-[#e2b714] mb-4">Get Ready!</div>
          <div className="text-xl mb-8">Waiting for race to start...</div>
          <div className="text-lg text-[#888888]">
            Players in room: {players.join(", ")}
          </div>
          {countdown !== null && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">Race starts in...</p>
            <p className="text-2xl font-bold text-[#e2b714]">
              {countdown}
            </p>
          </div>
        )}
          {!connected && (
            <div className="text-yellow-600 mt-4">Connecting to game...</div>
          )}
          {error && (
            <div className="text-red-600 mt-4">{error}</div>
          )}
        </div>
      </main>
    );
  }

  if (!words) return null;

  return (
    <main className="min-h-screen flex flex-col items-center pt-20 bg-[#323437] font-mono text-[#d1d0c5]">
      <div className="w-full max-w-6xl px-8 pt-12">
        {!finished && !gameOver && (
          <>
            <div className="flex justify-between items-center mb-8">
              <span className="text-[#e2b714] text-lg font-bold">Multiplayer Race - Room: {room_code}</span>
              <div className="flex items-center gap-6">
                <span className="text-[#e2b714] text-lg font-bold">{timer}s</span>
                <span className="text-[#d1d0c5] text-lg font-bold">
                  You: <span className="text-[#e2b714]">{liveWpm} WPM</span>
                </span>
                <span className="text-[#d1d0c5] text-lg font-bold">
                  {opponent}: <span className="text-[#ca4754]">{opponentData.wpm} WPM</span>
                </span>
              </div>
            </div>

            <div className="mb-6 flex justify-between bg-[#23242a] rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="text-[#e2b714] font-bold">{username}</div>
                <div className="text-[#d1d0c5]">WPM: {liveWpm}</div>
                <div className="text-[#d1d0c5]">Acc: {totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 100)}%</div>
                <div className="text-[#ca4754]">Errors: {errors}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-[#ca4754] font-bold">{opponent}</div>
                <div className="text-[#d1d0c5]">WPM: {opponentData.wpm}</div>
                <div className="text-[#d1d0c5]">Acc: {opponentData.accuracy}%</div>
                <div className="text-[#ca4754]">Errors: {opponentData.error}</div>
              </div>
            </div>

            <div className="mb-12 text-3xl leading-relaxed break-words whitespace-pre-wrap w-full min-h-[120px]">
              {prompt && (() => {
                return prompt.split("").map((char, idx) => {
                  let style = "";
                  if (idx < input.length) {
                    style = input[idx] === char
                      ? "text-white"
                      : "text-[#ff6f6f]";
                  } else if (idx === currentIdx && !finished && timer > 0) {
                    style = "bg-[#e2b714] text-[#171717] animate-pulse";
                  } else {
                    style = "text-[#888888]";
                  }
                  return (
                    <span key={idx} className={style}>{char}</span>
                  );
                });
              })()}
            </div>
          </>
        )}
        
        {(finished || gameOver) && (
          <div className="w-full">
            {gameOver && (
              <div className="text-center mb-8">
                <div className="text-4xl font-bold text-[#e2b714] mb-4">
                  🏆 {gameOver.winner === username ? "You Won!" : `${gameOver.winner} Won!`}
                </div>
                {gameOver.reason && (
                  <div className="text-xl text-[#888888] mb-4">{gameOver.reason}</div>
                )}
              </div>
            )}

            <div className="flex flex-row w-full max-w-6xl mx-auto items-stretch mt-4 mb-8 gap-8">
              <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
                <div className="text-lg font-bold text-[#e2b714] mb-2">{username}</div>
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">wpm</div>
                <div className="text-5xl font-bold text-[#e2b714] leading-none mb-4">{wpm}</div>
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">acc</div>
                <div className="text-5xl font-bold text-[#e2b714] leading-none mb-6">{accuracy}%</div>
                <div className="text-[#d1d0c5] text-base mb-1">errors</div>
                <div className="text-[#ca4754] text-2xl font-bold">{errors}</div>
              </div>

              <div className="flex flex-col justify-center items-center w-full max-w-2xl mx-auto bg-[#171717] rounded-xl p-6">
                <div className="w-full">
                  <Line
                    data={{
                      labels: Array.from({ length: 15 }, (_, i) => (i + 1).toString()),
                      datasets: [
                        {
                          label: `${username} WPM`,
                          data: (() => {
                            const prompt = words ? words.join(' ') : '';
                            let wpmArr = [];
                            for (let sec = 1; sec <= 15; sec++) {
                              const charsTyped = input.slice(0, Math.round((input.length / 15) * sec));
                              const correctChars = charsTyped.split('').filter((c, i) => c === prompt[i] && c !== ' ').length;
                              const wpmNow = sec > 0 ? Math.round((correctChars / 5) / (sec / 60)) : 0;
                              wpmArr.push(wpmNow);
                            }
                            return wpmArr;
                          })(),
                          borderColor: '#e2b714',
                          backgroundColor: 'rgba(226,183,20,0.2)',
                          tension: 0.3,
                          pointRadius: 2,
                        },
                        {
                          label: `${opponent} WPM`,
                          data: Array.from({ length: 15 }, () => opponentData.wpm),
                          borderColor: '#ca4754',
                          backgroundColor: 'rgba(202,71,84,0.2)',
                          tension: 0.3,
                          pointRadius: 2,
                        }
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true, position: 'top', labels: { color: '#e2b714' } },
                        title: { display: true, text: 'WPM Comparison', color: '#e2b714', font: { size: 20 } },
                      },
                      scales: {
                        x: {
                          grid: { color: '#23242a' },
                          ticks: { color: '#d1d0c5' },
                          title: { display: true, text: 'Seconds', color: '#e2b714', font: { size: 16 } },
                        },
                        y: {
                          grid: { color: '#23242a' },
                          ticks: { color: '#d1d0c5' },
                          title: { display: true, text: 'WPM', color: '#e2b714', font: { size: 16 } },
                          min: 0,
                          max: Math.max(40, Math.max(wpm, opponentData.wpm) + 10),
                        },
                      },
                    }}
                    height={180}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
                <div className="text-lg font-bold text-[#ca4754] mb-2">{opponent}</div>
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">wpm</div>
                <div className="text-5xl font-bold text-[#ca4754] leading-none mb-4">{gameOver ? gameOver.stats[opponent]?.wpm || 0 : opponentData.wpm}</div>
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">acc</div>
                <div className="text-5xl font-bold text-[#ca4754] leading-none mb-6">{gameOver ? gameOver.stats[opponent]?.accuracy || 0 : opponentData.accuracy}%</div>
                <div className="text-[#d1d0c5] text-base mb-1">errors</div>
                <div className="text-[#ca4754] text-2xl font-bold">{gameOver ? gameOver.stats[opponent]?.error || 0 : opponentData.error}</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                className="px-7 py-3 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition text-lg" 
                onClick={backToLobby}
              >
                Back to Lobby
              </button>
              <button 
                className="px-7 py-3 rounded bg-[#ca4754] text-white font-semibold hover:bg-[#ff6b6b] transition text-lg" 
                onClick={newGame}
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}