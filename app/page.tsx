
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center font-mono bg-[#323437] text-[#d1d0c5]">
      <div className="w-full max-w-xl p-8 rounded-lg shadow-lg border bg-[#171717] border-[#323437]">
        <h1 className="text-4xl font-bold mb-4 text-center tracking-wide text-[#e2b714]">Realtime Racing</h1>
        <h2 className="text-lg mb-8 text-center text-[#d1d0c5]">1v1 Typing Race - Inspired by Monkeytype</h2>
        <div className="flex flex-col gap-4 items-center">
          <button className="px-6 py-2 rounded font-semibold transition bg-[#e2b714] text-[#171717] hover:bg-[#fff176]">
            <Link href={"/login"}>Start Racing</Link>
          </button>
        </div>
        <div className="mt-8 text-center text-sm opacity-70 text-[#d1d0c5]">
          <p>Challenge a friend to a real-time typing race. See who finishes first!</p>
        </div>
      </div>
      <footer className="mt-12 text-xs opacity-50 text-[#d1d0c5]">Inspired by Monkeytype • Made for fun</footer>
    </main>
  );
}
