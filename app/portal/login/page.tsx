"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Login failed");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") || "/portal";
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbf9f1] px-6 text-[#1e1e1e]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-[#d9d9d9] bg-white px-6 py-6 shadow-sm"
      >
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Brivia Eats
          </div>
          <h1 className="mt-1 text-xl font-semibold">Portal Login</h1>
        </div>

        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
          Admin token
        </label>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#d98f11] focus:outline-none"
          autoComplete="current-password"
          autoFocus
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="mt-5 w-full rounded-full bg-[#d98f11] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c07e0f] disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
