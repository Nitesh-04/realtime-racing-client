"use client";

import { useState, useRef, useEffect } from "react";

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
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#323437] font-mono text-[#d1d0c5]">
      <div className="w-full max-w-4xl px-8 pt-12">
        {!finished && (
          <>
            <div className="flex justify-between items-center mb-8">
              <span className="text-[#e2b714] text-lg font-bold">Monkeytype 1v1 Game</span>
              <span className="text-[#e2b714] text-lg font-bold">{timer}s</span>
            </div>
            <div className="mb-12 text-2xl leading-relaxed break-words whitespace-pre-wrap w-full min-h-[120px]">
              {words && (() => {
                const prompt = words.join(" ");
                return prompt.split("").map((char, idx) => {
                  let style = "";
                  if (idx < input.length) {
                    style = input[idx] === char ? "text-[#4ec9b0]" : "text-[#ca4754]";
                  } else if (idx === currentIdx && !finished && timer > 0) {
                    style = "bg-[#e2b714] text-[#171717] animate-pulse";
                  } else {
                    style = "text-[#d1d0c5]";
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
          <div className="flex flex-row w-full justify-start items-start mt-4 mb-8">
            <div className="flex flex-col items-start mr-12" style={{ minWidth: '180px' }}>
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
            <div className="grid grid-cols-3 gap-x-10 gap-y-4 items-start text-center">
              <div>
                <div className="text-[#d1d0c5] text-base mb-1">raw</div>
                <div className="text-[#e2b714] text-2xl font-bold">{wpm}</div>
              </div>
              <div>
                <div className="text-[#d1d0c5] text-base mb-1">consistency</div>
                <div className="text-[#e2b714] text-2xl font-bold">1%</div>
              </div>
              <div>
                <div className="text-[#d1d0c5] text-base mb-1">characters</div>
                <div className="text-[#e2b714] text-2xl font-bold">{correctChars}/0/0/0</div>
              </div>
              <div className="col-span-3">
                <div className="text-[#d1d0c5] text-base mb-1">time</div>
                <div className="text-[#e2b714] text-2xl font-bold">15s</div>
              </div>
            </div>
            <button className="ml-12 mt-2 px-7 py-3 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition text-lg h-fit self-start" onClick={restart}>Restart</button>
          </div>
        )}
      </div>
    </main>
  );
}
