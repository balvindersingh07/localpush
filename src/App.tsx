import { useEffect, useMemo, useState } from "react";
import { Home } from "./components/Home";
import { EventDetail } from "./components/EventDetail";
import { BookingFlow } from "./components/BookingFlow";
import { OrganizerDashboard } from "./components/OrganizerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ChatbotInterface } from "./components/ChatbotInterface";
import { CreatorProfile } from "./components/CreatorProfile";
import { OrganizerProfile } from "./components/OrganizerProfile";
import { SearchPage } from "./components/SearchPage";
import { MyBookings } from "./components/MyBookings";
import { Header } from "./components/Header";
import { Auth } from "./components/Auth";
import { ChatbotPopup } from "./components/ChatbotPopup";
import { Toaster } from "./components/ui/sonner";

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

const API_URL =
  import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

async function meFromToken(): Promise<{ role: UserRole; email: string } | null> {
  const jwt =
    localStorage.getItem("jwt") || localStorage.getItem("sharthi_token");
  if (!jwt) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;

    const u = await res.json();
    const rawRole = String(u.role || "CREATOR").toUpperCase();

    let role: UserRole = "creator";
    if (rawRole === "ORGANIZER") role = "organizer";
    if (rawRole === "ADMIN") role = "admin";

    return { role, email: u.email || "" };
  } catch {
    return null;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [userRole, setUserRole] = useState<UserRole>("creator");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    (async () => {
      const me = await meFromToken();
      if (!me) return;

      setIsAuthenticated(true);
      setUserEmail(me.email);
      setUserRole(me.role);

      if (me.role === "admin") setCurrentPage("admin");
      else if (me.role === "organizer") setCurrentPage("organizer");
      else setCurrentPage("profile");
    })();
  }, []);

  const requiresAuth = useMemo(
    () =>
      new Set<Page>([
        "booking",
        "organizer",
        "admin",
        "my-bookings",
        "profile",
      ]),
    []
  );

  const navigate = (page: Page) => {
    if (requiresAuth.has(page) && !isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setCurrentPage(page);
  };

  const navigateToEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentPage("event-detail");
  };

  const navigateToBooking = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setCurrentPage("booking");
  };

  /* ---------- LOGIN COMPLETE ---------- */
  const handleLogin = (email: string, role: UserRole) => {
    setUserEmail(email);
    setUserRole(role);
    setIsAuthenticated(true);

    if (currentPage === "event-detail" && selectedEventId) {
      setCurrentPage("booking");
      return;
    }

    if (role === "admin") {
      setCurrentPage("admin");
      return;
    }

    if (role === "organizer") {
      setCurrentPage("organizer");
      return;
    }

    setCurrentPage("profile");
  };

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserEmail("");
    setUserRole("creator");

    localStorage.removeItem("jwt");
    localStorage.removeItem("sharthi_token");
    localStorage.removeItem("sharthi_user");

    setCurrentPage("home");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Home onNavigateToEvent={navigateToEvent} />;

      case "event-detail":
        return (
          <EventDetail
            eventId={selectedEventId}
            onBookStall={navigateToBooking}
            onBack={() => setCurrentPage("home")}
          />
        );

      case "booking":
        return (
          <BookingFlow
            eventId={selectedEventId}
            onSuccess={() => setCurrentPage("my-bookings")}
            onBack={() => setCurrentPage("event-detail")}
          />
        );

      case "organizer":
        return <OrganizerDashboard />;

      case "admin":
        return <AdminDashboard />;

      case "chatbot":
        return <ChatbotInterface onNavigateToEvent={navigateToEvent} />;

      case "profile":
        return userRole === "organizer" ? (
          <OrganizerProfile />
        ) : (
          <CreatorProfile />
        );

      case "search":
        return <SearchPage onNavigateToEvent={navigateToEvent} />;

      case "my-bookings":
        return <MyBookings />;

      default:
        return <Home onNavigateToEvent={navigateToEvent} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header
        currentPage={currentPage}
        userRole={userRole}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onNavigate={navigate}
        onRoleChange={setUserRole}
        onShowAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
      />

      <main className="pb-20">{renderPage()}</main>

      <Auth open={showAuth} onOpenChange={setShowAuth} onLogin={handleLogin} />

      {userRole !== "admin" && (
        <ChatbotPopup
          userRole={userRole}
          isAuthenticated={isAuthenticated}
          onShowAuth={() => setShowAuth(true)}
        />
      )}

      <Toaster />
    </div>
  );
}
