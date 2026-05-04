import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock } from "lucide-react";

const STORAGE_KEY = "stuntwerk_site_gate_ok";

function siteAccessPassword(): string | undefined {
  const v = import.meta.env.VITE_SITE_ACCESS_PASSWORD;
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

function readUnlockedFromStorage(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function SiteAccessGate({ children }: { children: React.ReactNode }) {
  const expected = siteAccessPassword();
  const [unlocked, setUnlocked] = useState(() => {
    if (!expected) return true;
    return readUnlockedFromStorage();
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!expected || unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password === expected) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // Private mode / disabled storage — gate still lifts this session.
      }
      setUnlocked(true);
      return;
    }
    setError("Falsches Passwort.");
    setPassword("");
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <CardTitle>Zugang</CardTitle>
          <CardDescription>
            Diese Version ist passwortgeschützt. Bitte das Zugangspasswort
            eingeben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-access-password">Passwort</Label>
              <Input
                id="site-access-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error ? "border-destructive" : undefined}
                autoFocus
              />
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full">
              Fortfahren
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
