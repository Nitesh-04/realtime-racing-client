"use client";

import { useState } from "react";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add signup logic here
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#323437] font-mono">
      <form
        className="bg-[#171717] p-8 rounded-lg shadow-lg w-full max-w-md border border-[#323437]"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-[#e2b714] mb-6 text-center">Sign Up</h1>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full mb-4 px-4 py-2 rounded bg-[#323437] text-[#d1d0c5] border border-[#e2b714] focus:outline-none"
          required
        />
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
          className="w-full mb-4 px-4 py-2 rounded bg-[#323437] text-[#d1d0c5] border border-[#e2b714] focus:outline-none"
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
          className="w-full mb-6 px-4 py-2 rounded bg-[#323437] text-[#d1d0c5] border border-[#e2b714] focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full py-2 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition"
        >
          Sign Up
        </button>
      </form>
    </main>
  );
}
