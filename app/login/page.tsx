"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Login() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/home");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`${process.env.API_URL || "http://localhost:8080/api"}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    localStorage.setItem("token", data.token);

    if (res.ok) {
      router.push("/home");
    } else {
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#323437] font-mono">
      <form
        className="bg-[#171717] p-8 rounded-lg shadow-lg w-full max-w-md border border-[#323437]"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-[#e2b714] mb-6 text-center">Login</h1>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className="w-full mb-4 px-4 py-2 rounded bg-[#323437] text-[#d1d0c5] border border-[#e2b714] focus:outline-none"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full mb-6 px-4 py-2 rounded bg-[#323437] text-[#d1d0c5] border border-[#e2b714] focus:outline-none"
          required
        />
        <p className="mt-4 mb-4 text-sm text-center text-[#d1d0c5]">
          Don't have an account? <Link href="/signup" className="text-[#e2b714] hover:underline">Sign up</Link>
        </p>
        <button
          type="submit"
          className="w-full py-2 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition"
        >
          Login
        </button>
      </form>
    </main>
  );
}
