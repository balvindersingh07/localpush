import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { toast } from "sonner";

interface AuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (email: string, role: "creator" | "organizer" | "admin") => void;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) throw new Error(data?.detail || data?.message || res.statusText);
  return data as T;
}

function saveAuth(token: string, user: any) {
  localStorage.setItem("jwt", token);
  localStorage.setItem("sharthi_token", token);
  localStorage.setItem("sharthi_user", JSON.stringify(user));
}

function toUiRole(raw: any): "creator" | "organizer" | "admin" {
  const r = String(raw || "CREATOR").toUpperCase();
  if (r === "ORGANIZER") return "organizer";
  if (r === "ADMIN") return "admin";
  return "creator";
}

export function Auth({ open, onOpenChange, onLogin }: AuthProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [role, setRole] = useState<"creator" | "organizer">("creator");

  const [loading, setLoading] = useState(false);

  function reset() {
    setSigninEmail("");
    setSigninPassword("");
    setName("");
    setSignupEmail("");
    setSignupPassword("");
    setRole("creator");
    setTab("signin");
  }

  /* ---------- LOGIN ---------- */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!signinEmail || !signinPassword) {
      toast.error("Email and password required");
      return;
    }

    setLoading(true);
    try {
      const data = await jsonFetch<{ access_token: string }>(`${API}/auth/login`, {
        method: "POST",
        body: JSON.stringify({
          email: signinEmail,
          password: signinPassword,
        }),
      });

      const me = await jsonFetch<any>(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      saveAuth(data.access_token, me);

      const uiRole = toUiRole(me.role);
      onLogin(me.email, uiRole);

      toast.success("Logged in");
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- SIGNUP ---------- */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !signupEmail || !signupPassword) {
      toast.error("All fields required");
      return;
    }

    setLoading(true);

    try {
      const apiRole = role === "organizer" ? "ORGANIZER" : "CREATOR";

      await jsonFetch(`${API}/auth/signup`, {
        method: "POST",
        body: JSON.stringify({
          name,
          email: signupEmail,
          password: signupPassword,
          role: apiRole,
        }),
      });

      toast.success("Account created. Please sign in.");
      setTab("signin");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to LocalPush</DialogTitle>
          <DialogDescription>Sign in or create a new account</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* SIGN IN */}
          <TabsContent value="signin" className="mt-4 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                />
              </div>

              <Button disabled={loading} className="w-full" type="submit">
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          {/* SIGN UP */}
          <TabsContent value="signup" className="mt-4 space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
              </div>

              <div>
                <Label>I am a</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="creator" id="creator" />
                    <Label htmlFor="creator">Creator</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="organizer" id="organizer" />
                    <Label htmlFor="organizer">Organizer</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button disabled={loading} className="w-full" type="submit">
                {loading ? "Creating…" : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
