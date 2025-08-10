"use client";

const dummyStats = {
  username: "blazexnick",
  joined: "12 Jun 2024",
  level: 14,
  levelProgress: 78,
  levelMax: 737,
  testsStarted: 75,
  testsCompleted: 75,
  timeTyping: "00:19:39",
  wpm15: 83,
  acc15: 100,
};

export default function HomeStats() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#23242a] font-mono text-[#d1d0c5] px-4">
      <div className="w-full max-w-6xl mt-12">
        <h1 className="text-4xl font-bold text-[#e2b714] mb-8 text-left tracking-wide">Realtime Racing</h1>
        <div className="bg-[#171717] rounded-xl p-8 shadow-lg flex flex-col md:flex-row gap-8 items-center mb-10">
          <div className="flex flex-row items-center gap-6 w-full md:w-2/3">
            <div className="w-20 h-20 rounded-full bg-[#23242a] flex items-center justify-center text-4xl text-[#d1d0c5]">
              <span>👤</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold tracking-wide">{dummyStats.username}</span>
              <span className="text-sm text-[#888]">Joined {dummyStats.joined}</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[#e2b714] font-bold">{dummyStats.level}</span>
                <div className="w-32 h-2 bg-[#23242a] rounded-full overflow-hidden">
                  <div className="h-2 bg-[#e2b714] rounded-full" style={{ width: `${(dummyStats.levelProgress / dummyStats.levelMax) * 100}%` }}></div>
                </div>
                <span className="text-xs text-[#888]">{dummyStats.levelProgress}/{dummyStats.levelMax}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-12 w-full md:w-1/3 justify-between">
            <div className="flex flex-col items-center">
              <span className="text-sm text-[#888]">tests started</span>
              <span className="text-3xl font-bold">{dummyStats.testsStarted}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm text-[#888]">tests completed</span>
              <span className="text-3xl font-bold">{dummyStats.testsCompleted}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm text-[#888]">time typing</span>
              <span className="text-3xl font-bold">{dummyStats.timeTyping}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[#171717] rounded-xl p-8 shadow-lg flex flex-col items-center">
            <div className="flex flex-row gap-12 w-full justify-center">
              <div className="flex flex-col items-center">
                <span className="text-lg text-[#888]">15 seconds</span>
                <span className="text-4xl font-bold text-[#e2b714]">{dummyStats.wpm15}</span>
                <span className="text-lg text-[#e2b714]">{dummyStats.acc15}%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 items-center justify-center w-full">
            <button className="w-full py-3 rounded bg-[#e2b714] text-[#171717] font-semibold text-xl hover:bg-[#fff176] transition shadow-lg">Create Room</button>
            <button className="w-full py-3 rounded bg-[#23242a] text-[#e2b714] border border-[#e2b714] font-semibold text-xl hover:bg-[#e2b714] hover:text-[#171717] transition shadow-lg">Join Room</button>
          </div>
        </div>
      </div>
    </main>
  );
}
