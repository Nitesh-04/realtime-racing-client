"use client";

import { useRouter} from "next/navigation";
import { useEffect, useState } from "react";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

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
    
    const { name, username, email, password, confirmPassword } = form;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        username,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/login");
    } else {
      alert(data.error);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#323437] font-mono">
      <form
        className="bg-[#171717] p-8 rounded-lg shadow-lg w-full max-w-md border border-[#323437]"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-[#e2b714] mb-6 text-center">Sign Up</h1>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
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
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
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
          disabled={loading}
          className="w-full py-2 rounded bg-[#e2b714] text-[#171717] font-semibold hover:bg-[#fff176] transition"
        >
          Sign Up
        </button>
      </form>
    </main>
  );
}
