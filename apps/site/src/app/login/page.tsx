import type { Metadata } from "next";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";
import { LogoutButton } from "./LogoutButton";

/** The single admin door: unlinked, noindex, rate-limited. */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const isAdmin = isAdminAuthenticated();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
        <h1 className="type-heading text-foreground">
          {isAdmin ? "Signed in" : "Sign in"}
        </h1>
        {isAdmin ? (
          <>
            <p className="type-body text-muted-foreground">
              This browser has an active admin session.
            </p>
            <LogoutButton />
          </>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
