"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await login(secret);
      if (result.ok) {
        setSecret("");
        router.replace("/");
        router.refresh();
      } else {
        setError(result.error ?? "Incorrect password.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xs space-y-3">
      <input
        type="password"
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        placeholder="Password"
        autoFocus
        autoComplete="current-password"
        aria-label="Admin password"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40"
      />
      {error && (
        <p role="alert" className="type-caption text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || secret.length === 0}
        className="h-10 w-full rounded-lg bg-green-700 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-green-600 dark:hover:bg-green-700"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
