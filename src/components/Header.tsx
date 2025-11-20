import { useEffect, useRef, useState } from "react";
import {
  Home,
  Search,
  Plus,
  User,
  LayoutDashboard,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";

type Page =
  | "home"
  | "event-detail"
  | "booking"
  | "organizer"
  | "admin"
  | "chatbot"
  | "profile"
  | "search"
  | "my-bookings";
type UserRole = "creator" | "organizer" | "admin";

interface HeaderProps {
  currentPage: Page;
  userRole: UserRole;
  isAuthenticated: boolean;
  userEmail: string;
  onNavigate: (page: Page) => void;
  onRoleChange: (role: UserRole) => void;
  onShowAuth: () => void;
  onLogout: () => void;
}

export function Header({
  currentPage,
  userRole,
  isAuthenticated,
  userEmail,
  onNavigate,
  onRoleChange,
  onShowAuth,
  onLogout,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const firstLetter = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const username = userEmail.includes("@")
    ? userEmail.split("@")[0]
    : userEmail || "User";

  return (
    <>
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white">LP</span>
            </div>
            <h1 className="text-primary">LocalPush</h1>
          </div>

          {/* Auth / Profile */}
          <div className="flex items-center gap-3" ref={menuRef}>
            {isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs">
                    {firstLetter}
                  </div>
                  <span className="hidden md:inline">{username}</span>
                </Button>

                {menuOpen && (
                  <div className="absolute right-0 top-14 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg py-1 text-sm">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-neutral-900 truncate">{userEmail}</p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {userRole}
                      </p>
                    </div>

                    {/* PROFILE BUTTON — HIDE FOR ADMIN */}
                    {userRole !== "admin" && (
                      <button
                        className="w-full flex items-center px-3 py-2 hover:bg-neutral-50 text-left"
                        onClick={() => {
                          onNavigate("profile");
                          setMenuOpen(false);
                        }}
                      >
                        <User size={16} className="mr-2" />
                        Profile
                      </button>
                    )}

                    {/* CREATOR MENU */}
                    {userRole === "creator" && (
                      <button
                        className="w-full flex items-center px-3 py-2 hover:bg-neutral-50 text-left"
                        onClick={() => {
                          onNavigate("my-bookings");
                          setMenuOpen(false);
                        }}
                      >
                        <Plus size={16} className="mr-2" />
                        My Bookings
                      </button>
                    )}

                    {/* ORGANIZER MENU */}
                    {userRole === "organizer" && (
                      <button
                        className="w-full flex items-center px-3 py-2 hover:bg-neutral-50 text-left"
                        onClick={() => {
                          onNavigate("organizer");
                          setMenuOpen(false);
                        }}
                      >
                        <LayoutDashboard size={16} className="mr-2" />
                        Dashboard
                      </button>
                    )}

                    {/* ADMIN MENU */}
                    {userRole === "admin" && (
                      <button
                        className="w-full flex items-center px-3 py-2 hover:bg-neutral-50 text-left"
                        onClick={() => {
                          onNavigate("admin");
                          setMenuOpen(false);
                        }}
                      >
                        <BarChart3 size={16} className="mr-2" />
                        Admin Panel
                      </button>
                    )}

                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button
                        className="w-full flex items-center px-3 py-2 hover:bg-neutral-50 text-left text-red-600"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onShowAuth}>
                  Sign In
                </Button>
                <Button size="sm" onClick={onShowAuth}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-bottom">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-around">

            {/* ADMIN → ONLY ANALYTICS BUTTON */}
            {userRole === "admin" ? (
              <button
                onClick={() => onNavigate("admin")}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "admin" ? "text-primary" : "text-neutral-500"
                }`}
              >
                <BarChart3 size={24} />
                <span className="text-xs">Analytics</span>
              </button>
            ) : (
              <>
                {/* Home */}
                <button
                  onClick={() => onNavigate("home")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "home" ? "text-primary" : "text-neutral-500"
                  }`}
                >
                  <Home size={24} />
                  <span className="text-xs">Home</span>
                </button>

                {/* Search */}
                <button
                  onClick={() => onNavigate("search")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "search" ? "text-primary" : "text-neutral-500"
                  }`}
                >
                  <Search size={24} />
                  <span className="text-xs">Search</span>
                </button>

                {/* Organizer Dashboard / Creator Bookings */}
                {userRole === "organizer" ? (
                  <button
                    onClick={() => onNavigate("organizer")}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "organizer"
                        ? "text-primary"
                        : "text-neutral-500"
                    }`}
                  >
                    <LayoutDashboard size={24} />
                    <span className="text-xs">Dashboard</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate("my-bookings")}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "my-bookings"
                        ? "text-primary"
                        : "text-neutral-500"
                    }`}
                  >
                    <Plus size={24} />
                    <span className="text-xs">Bookings</span>
                  </button>
                )}

                {/* Profile */}
                <button
                  onClick={() => onNavigate("profile")}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "profile" ? "text-primary" : "text-neutral-500"
                  }`}
                >
                  <User size={24} />
                  <span className="text-xs">Profile</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
