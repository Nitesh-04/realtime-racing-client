"use client";

import { useState, useRef, useEffect } from "react";
import { Line } from "react-chartjs-2";
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

export default function Game() {
  const [words, setWords] = useState<string[] | null>(null);
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

  useEffect(() => {
    // Only run on client
    if (words === null && typeof window !== 'undefined') {
      setWords(getWords(30));
    }
  }, [words]);

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

  // Live WPM calculation
  useEffect(() => {
    if (!started || finished) return;
    const prompt = words ? words.join(' ') : '';
    const correctChars = input.split('').filter((c, i) => c === prompt[i] && c !== ' ').length;
    const elapsed = 15 - timer;
    const wpmNow = elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60)) : 0;
    setLiveWpm(wpmNow);
  }, [input, timer, started, finished, words]);

  useEffect(() => {
    if (!words) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (finished || timer === 0) return;
      if (!started) setStarted(true);
      const prompt = words.join(" ");
      if (e.key === "Backspace") {
        if (currentIdx > 0) {
          setInput((prev) => prev.slice(0, -1));
          setCurrentIdx((prev) => prev - 1);
          setTotalChars((prev) => prev - 1);
          // Recalculate correctChars and errors
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
  }, [words, currentIdx, finished, timer, started]);

  function finishGame() {
    setFinished(true);
    // Calculate WPM: (correct non-space chars / 5) / (time in minutes)
    let nonSpaceCorrect = 0;
    if (words) {
      const prompt = words.join(' ');
      nonSpaceCorrect = input.split('').filter((c, i) => c === prompt[i] && c !== ' ').length;
    }
    const wpmCalc = Math.round((nonSpaceCorrect / 5) / (15 / 60));
    setWpm(wpmCalc);
    // Calculate accuracy
    const acc = totalChars === 0 ? 0 : Math.round((correctChars / totalChars) * 100);
    setAccuracy(acc);
  }

  function restart() {
    setWords(getWords(30));
    setInput("");
    setStarted(false);
    setFinished(false);
    setTimer(15);
    setWpm(0);
    setAccuracy(0);
    setErrors(0);
    setCorrectChars(0);
    setTotalChars(0);
    setCurrentIdx(0);
  }

  if (!words) return null;

  return (
    <main className="min-h-screen flex flex-col items-center pt-20 bg-[#323437] font-mono text-[#d1d0c5]">
      <div className="w-full max-w-6xl px-8 pt-12">
        {!finished && (
          <>
            <div className="flex justify-between items-center mb-8">
              <span className="text-[#e2b714] text-lg font-bold">Monkeytype 1v1 Game</span>
              <div className="flex items-center gap-6">
                <span className="text-[#e2b714] text-lg font-bold">{timer}s</span>
                <span className="text-[#d1d0c5] text-lg font-bold">Live WPM: <span className="text-[#e2b714]">{liveWpm}</span></span>
              </div>
            </div>
            <div className="mb-12 text-3xl leading-relaxed break-words whitespace-pre-wrap w-full min-h-[120px]">
              {words && (() => {
                const prompt = words.join(" ");
                return prompt.split("").map((char, idx) => {
                  let style = "";
                  if (idx < input.length) {
                    style = input[idx] === char
                      ? "text-white" // correct: white
                      : "text-[#ff6f6f]"; // wrong: faded red
                  } else if (idx === currentIdx && !finished && timer > 0) {
                    style = "bg-[#e2b714] text-[#171717] animate-pulse";
                  } else {
                    style = "text-[#888888]"; // more faded gray for untyped
                  }
                  return (
                    <span key={idx} className={style}>{char}</span>
                  );
                });
              })()}
            </div>
          </>
        )}
        {finished && (
          <div className="w-full">
            <div className="flex flex-row w-full max-w-6xl mx-auto items-stretch mt-4 mb-8 gap-8">
              {/* Left Info */}
              <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">wpm</div>
                <div className="text-5xl font-bold text-[#e2b714] leading-none mb-4">{wpm}</div>
                <div className="text-3xl font-bold text-[#d1d0c5] mb-1">acc</div>
                <div className="text-5xl font-bold text-[#e2b714] leading-none mb-6">{accuracy}%</div>
                <div className="text-[#d1d0c5] text-base mb-1">test type</div>
                <div className="text-[#e2b714] text-base mb-1">time 15</div>
                <div className="text-[#e2b714] text-base mb-4">english</div>
                <div className="text-[#d1d0c5] text-base mb-1">other</div>
                <div className="text-[#e2b714] text-base">afk detected</div>
              </div>
              {/* Center Graph */}
              <div className="flex flex-col justify-center items-center w-full max-w-2xl mx-auto bg-[#171717] rounded-xl p-6">
                <div className="w-full">
                  <Line
                    data={{
                      labels: Array.from({ length: 15 }, (_, i) => (i + 1).toString()),
                      datasets: [
                        {
                          label: "WPM",
                          data: (() => {
                            // Generate WPM for each second
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
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: true, position: 'top', labels: { color: '#e2b714' } },
                        title: { display: true, text: 'WPM Over Time', color: '#e2b714', font: { size: 20 } },
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
                          max: Math.max(40, wpm + 10),
                        },
                      },
                    }}
                    height={180}
                  />
                </div>
              </div>
              {/* Right Info */}
              <div className="flex flex-col justify-center bg-[#23242a] rounded-xl p-6 min-w-[180px] max-w-[220px] h-full">
                <div className="text-[#d1d0c5] text-base mb-1">raw</div>
                <div className="text-[#e2b714] text-2xl font-bold mb-4">{wpm}</div>
                <div className="text-[#d1d0c5] text-base mb-1">consistency</div>
                <div className="text-[#e2b714] text-2xl font-bold mb-4">1%</div>
                <div className="text-[#d1d0c5] text-base mb-1">characters</div>
                <div className="text-[#e2b714] text-2xl font-bold mb-4">{correctChars}/0/0/0</div>
                <div className="text-[#d1d0c5] text-base mb-1">errors</div>
                <div className="text-[#ca4754] text-2xl font-bold mb-4">{errors}</div>
                <div className="text-[#d1d0c5] text-base mb-1">time</div>
                <div className="text-[#e2b714] text-2xl font-bold">15s</div>
              </div>
            </div>
            <button className="mt-2 px-7 py-3 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition text-lg h-fit self-center" onClick={restart}>Restart</button>
          </div>
        )}
      </div>
    </main>
  );
}
