import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  DollarSign,
  Eye,
  Calendar,
  MapPin,
  Edit,
  MoreVertical,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ======================================================
    BACKEND URL + TOKEN
====================================================== */
const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";

function getToken(): string | null {
  try {
    return localStorage.getItem("jwt") || localStorage.getItem("sharthi_token");
  } catch {
    return null;
  }
}

async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) throw new Error(data?.error || data?.message || res.statusText);

  return data as T;
}

/* ======================================================
    STATIC CHART DATA
====================================================== */
const revenueData = [
  { month: "Jul", revenue: 45000 },
  { month: "Aug", revenue: 62000 },
  { month: "Sep", revenue: 78000 },
  { month: "Oct", revenue: 95000 },
  { month: "Nov", revenue: 120000 },
];

const bookingsData = [
  { week: "Week 1", bookings: 12 },
  { week: "Week 2", bookings: 18 },
  { week: "Week 3", bookings: 25 },
  { week: "Week 4", bookings: 32 },
];

/* ======================================================
    TYPES
====================================================== */
const statusColors: Record<string, string> = {
  live: "bg-accent",
  upcoming: "bg-secondary",
  ended: "bg-neutral-400",
  confirmed: "bg-accent",
  pending: "bg-warning",
  paid: "bg-accent",
  cancelled: "bg-error",
};

type EventCard = {
  id: string;
  name: string;
  date: string;
  location: string;
  status: "live" | "upcoming" | "ended";
  stallsSold: number;
  stallsTotal: number;
  revenue: number;
  views: number;
};

type OrgBookingRow = {
  id: string;
  creatorName: string;
  eventTitle: string;
  tier: string;
  amount: number;
  status: string;
  rawStatus: string;
  date: string;
};

type StallRow = {
  id: string;
  name: string;
  tier: string;
  price: number;
  qtyTotal: number;
  qtyLeft: number;
  specs?: string | null;
};

/* ======================================================
    HELPERS
====================================================== */
function formatDateRange(startAt: string, endAt: string) {
  try {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const sStr = s.toLocaleDateString();
    const eStr = e.toLocaleDateString();
    return sStr === eStr ? sStr : `${sStr} - ${eStr}`;
  } catch {
    return `${startAt} - ${endAt}`;
  }
}

function normalizeStatus(s?: string): "live" | "upcoming" | "ended" {
  const v = (s || "").toLowerCase();
  if (v.includes("up")) return "upcoming";
  if (v.includes("end")) return "ended";
  return "live";
}

/* ======================================================
    MAIN COMPONENT
====================================================== */
export function OrganizerDashboard() {
  /* --------------------------------------------
        CREATE EVENT STATES
  -------------------------------------------- */
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [evName, setEvName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [venueName, setVenueName] = useState("");
  const [desc, setDesc] = useState("");
  const [cityId, setCityId] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");

  /* --------------------------------------------
        EVENTS LOADING
  -------------------------------------------- */
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState<EventCard[]>([]);
  const hasEvents = myEvents.length > 0;

  /* --------------------------------------------
        BOOKINGS
  -------------------------------------------- */
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [orgBookings, setOrgBookings] = useState<OrgBookingRow[]>([]);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
    null
  );

  /* --------------------------------------------
        KPI STATS
  -------------------------------------------- */
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: "₹0",
    sold: "0 / 0",
    active: 0,
    views: "0",
  });

  /* --------------------------------------------
        STALL MANAGER
  -------------------------------------------- */
  const [stallsDialogOpen, setStallsDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventName, setSelectedEventName] = useState("");

  const [stallsLoading, setStallsLoading] = useState(false);
  const [stalls, setStalls] = useState<StallRow[]>([]);

  const [editingStallId, setEditingStallId] = useState<string | null>(null);
  const [stallName, setStallName] = useState("");
  const [stallTier, setStallTier] = useState("");
  const [stallPrice, setStallPrice] = useState("");
  const [stallQtyTotal, setStallQtyTotal] = useState("");
  const [stallSpecs, setStallSpecs] = useState("");
  const [stallSaving, setStallSaving] = useState(false);

  function resetStallForm() {
    setEditingStallId(null);
    setStallName("");
    setStallTier("");
    setStallPrice("");
    setStallQtyTotal("");
    setStallSpecs("");
  }

  /* --------------------------------------------
        BROADCAST
  -------------------------------------------- */
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastEventId, setBroadcastEventId] = useState<string | null>(null);
  const [broadcastEventName, setBroadcastEventName] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  /* --------------------------------------------
        ROSTER EXPORT
  -------------------------------------------- */
  const [rosterExportEventId, setRosterExportEventId] =
    useState<string | null>(null);

  /* ======================================================
        LOAD EVENTS
  ====================================================== */
  useEffect(() => {
    (async () => {
      try {
        const resp = await jsonFetch<any>(
          `${API}/organizer/me/events?page=1&limit=50`
        );

        const list: any[] = resp?.items ?? [];

        const cards: EventCard[] = list.map((e) => ({
          id: e._id || e.id,
          name: e.title,
          date: formatDateRange(e.startAt, e.endAt),
          location: e.city || e.cityId || "—",
          status: normalizeStatus(e.status),
          stallsSold: e.stallsSold ?? 0,
          stallsTotal: e.stallsTotal ?? 0,
          revenue: e.revenue ?? 0,
          views: e.views ?? 0,
        }));

        setMyEvents(cards);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load events");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ======================================================
        LOAD BOOKINGS
  ====================================================== */
  useEffect(() => {
    (async () => {
      try {
        const resp = await jsonFetch<any>(
          `${API}/organizer/me/bookings?page=1&limit=50`
        );

        const rows = resp?.items ?? [];

        const mapped: OrgBookingRow[] = rows.map((r) => ({
          id: r.id,
          creatorName: r.creator?.name || r.creator?.email || "Creator",
          eventTitle: r.event?.title || "—",
          tier: r.stall?.tier || r.stall?.name || "—",
          amount: r.amount ?? r.stall?.price ?? 0,
          status: String(r.status).toLowerCase(),
          rawStatus: r.status,
          date: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString()
            : "—",
        }));

        setOrgBookings(mapped);
      } catch {
        toast.error("Failed to load bookings");
      } finally {
        setBookingsLoading(false);
      }
    })();
  }, []);

  /* ======================================================
        LOAD STATS
  ====================================================== */
  useEffect(() => {
    (async () => {
      try {
        const resp = await jsonFetch<any>(`${API}/organizer/me/stats`);

        setStats({
          revenue: `₹${(resp.totalRevenue || 0).toLocaleString()}`,
          sold: `${resp.stallsSold || 0} / ${resp.stallsTotal || 0}`,
          active: resp.activeEvents || 0,
          views: (resp.views || 0).toLocaleString(),
        });
      } catch {
        //
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const kpis = statsLoading
    ? { revenue: "—", sold: "—", active: "—", views: "—" }
    : stats;

  /* ======================================================
        CREATE EVENT
  ====================================================== */
  async function handleCreate() {
    if (!evName || !startDate || !endDate || !cityId) {
      toast.error("Please fill required fields");
      return;
    }

    setCreating(true);

    try {
      const resp = await jsonFetch<any>(`${API}/events`, {
        method: "POST",
        body: JSON.stringify({
          title: evName,
          description: desc,
          startDate,
          endDate,
          location,
          venueName,
          cityId,
          tags: tagsCsv
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const e = resp.event;

      const newCard: EventCard = {
        id: e._id || e.id,
        name: e.title,
        date: formatDateRange(e.startAt, e.endAt),
        location: e.cityId ?? "",
        status: normalizeStatus(e.status),
        stallsSold: 0,
        stallsTotal: 0,
        revenue: 0,
        views: 0,
      };

      setMyEvents((prev) => [newCard, ...prev]);

      toast.success("Event created successfully!");

      setOpen(false);
      setEvName("");
      setStartDate("");
      setEndDate("");
      setLocation("");
      setVenueName("");
      setDesc("");
      setCityId("");
      setTagsCsv("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  /* ======================================================
        STALL MANAGER — LOAD STALLS
  ====================================================== */
  async function refreshStalls(eventId: string) {
    setStallsLoading(true);

    try {
      const data = await jsonFetch<StallRow[]>(
        `${API}/events/${eventId}/stalls`
      );

      setStalls(data || []);

      // update metrics on event card
      const total = data.reduce((a, s) => a + (s.qtyTotal || 0), 0);
      const sold = data.reduce(
        (a, s) => a + ((s.qtyTotal || 0) - (s.qtyLeft || 0)),
        0
      );
      const revenue = data.reduce(
        (a, s) =>
          a + (s.price || 0) * ((s.qtyTotal || 0) - (s.qtyLeft || 0)),
        0
      );

      setMyEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, stallsTotal: total, stallsSold: sold, revenue }
            : ev
        )
      );
    } catch {
      toast.error("Failed to load stalls");
    } finally {
      setStallsLoading(false);
    }
  }

  function openStallsManager(eventId: string, name: string) {
    setSelectedEventId(eventId);
    setSelectedEventName(name);
    resetStallForm();
    setStallsDialogOpen(true);
    void refreshStalls(eventId);
  }

  /* ======================================================
        STALL MANAGER — EDIT
  ====================================================== */
  function startEditStall(s: StallRow) {
    setEditingStallId(s.id);
    setStallName(s.name);
    setStallTier(s.tier);
    setStallPrice(String(s.price));
    setStallQtyTotal(String(s.qtyTotal));
    setStallSpecs(s.specs || "");
  }

  /* ======================================================
        STALL MANAGER — CREATE/UPDATE
  ====================================================== */
  async function handleSaveStall() {
    if (!selectedEventId) return;

    if (!stallName || !stallPrice || !stallQtyTotal) {
      toast.error("Fill name, price & quantity");
      return;
    }

    const priceNum = Number(stallPrice);
    const qtyNum = Number(stallQtyTotal);

    setStallSaving(true);

    try {
      if (editingStallId) {
        // PATCH
        await jsonFetch(`${API}/stalls/stalls/${editingStallId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: stallName,
            tier: stallTier,
            price: priceNum,
            qtyTotal: qtyNum,
            specs: stallSpecs,
          }),
        });

        toast.success("Stall updated");
      } else {
        // CREATE
        await jsonFetch(`${API}/stalls/events/${selectedEventId}/stalls`, {
          method: "POST",
          body: JSON.stringify({
            name: stallName,
            tier: stallTier,
            price: priceNum,
            qtyTotal: qtyNum,
            specs: stallSpecs,
          }),
        });

        toast.success("Stall added");
      }

      resetStallForm();
      await refreshStalls(selectedEventId);
    } catch {
      toast.error("Failed to save stall");
    } finally {
      setStallSaving(false);
    }
  }

  /* ======================================================
        STALL MANAGER — DELETE
  ====================================================== */
  async function handleDeleteStall(id: string) {
    if (!selectedEventId) return;

    if (!confirm("Delete this stall permanently?")) return;

    try {
      await jsonFetch(`${API}/stalls/stalls/${id}`, { method: "DELETE" });

      toast.success("Stall deleted");
      await refreshStalls(selectedEventId);
    } catch {
      toast.error("Failed to delete stall");
    }
  }

  /* ======================================================
        UPDATE BOOKING STATUS
  ====================================================== */
  async function updateBookingStatus(
    id: string,
    newStatus: "PENDING" | "PAID" | "CANCELLED"
  ) {
    try {
      setUpdatingBookingId(id);

      await jsonFetch(`${API}/organizer/me/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setOrgBookings((rows) =>
        rows.map((b) =>
          b.id === id
            ? { ...b, rawStatus: newStatus, status: newStatus.toLowerCase() }
            : b
        )
      );

      toast.success(`Booking updated: ${newStatus}`);
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setUpdatingBookingId(null);
    }
  }

  /* ======================================================
        EXPORT ROSTER
  ====================================================== */
  async function exportRoster(eventId: string, eventName: string) {
    try {
      setRosterExportEventId(eventId);

      const resp = await jsonFetch<any>(
        `${API}/organizer/me/events/${eventId}/roster`
      );

      const rows = resp.rows || [];
      if (!rows.length) {
        toast.info("No bookings found");
        return;
      }

      const headers = Object.keys(rows[0]);

      const csv =
        headers.join(",") +
        "\n" +
        rows
          .map((row) =>
            headers
              .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
              .join(",")
          )
          .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventName}-roster.csv`;
      a.click();

      URL.revokeObjectURL(url);

      toast.success("Roster exported");
    } catch {
      toast.error("Failed to export roster");
    } finally {
      setRosterExportEventId(null);
    }
  }

  /* ======================================================
        BROADCAST MESSAGE
  ====================================================== */
  function openBroadcastDialog(eventId: string, name: string) {
    setBroadcastEventId(eventId);
    setBroadcastEventName(name);
    setBroadcastSubject("");
    setBroadcastMessage("");
    setBroadcastDialogOpen(true);
  }

  async function handleSendBroadcast() {
    if (!broadcastEventId) return;
    if (!broadcastMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setBroadcastSending(true);

    try {
      const resp = await jsonFetch<any>(
        `${API}/organizer/me/events/${broadcastEventId}/broadcast`,
        {
          method: "POST",
          body: JSON.stringify({
            subject: broadcastSubject,
            message: broadcastMessage.trim(),
          }),
        }
      );

      toast.success(`Broadcast sent to ${resp.recipientCount || 0} creators`);
      setBroadcastDialogOpen(false);
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setBroadcastSending(false);
    }
  }

  /* ======================================================
        UI
  ====================================================== */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-900 mb-2">Organizer Dashboard</h1>
          <p className="text-neutral-600">Manage your events & track performance</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} /> Create Event
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Event Name</Label>
                <Input
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div>
                <Label>Tags</Label>
                <Input
                  value={tagsCsv}
                  onChange={(e) => setTagsCsv(e.target.value)}
                  placeholder="art, craft, food"
                />
              </div>

              <Button className="w-full" disabled={creating} onClick={handleCreate}>
                {creating ? "Creating…" : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ---------------- KPI CARDS ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Total Revenue</p>
          <h2 className="text-neutral-900">{kpis.revenue}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Stalls Sold</p>
          <h2 className="text-neutral-900">{kpis.sold}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Active Events</p>
          <h2 className="text-neutral-900">{kpis.active}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Total Views</p>
          <h2 className="text-neutral-900">{kpis.views}</h2>
        </Card>
      </div>

      {/* ---------------- CHARTS ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-neutral-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F05A28"
                fill="#F05A28"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-neutral-900 mb-4">Bookings This Month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bookingsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="bookings"
                fill="#2EC4B6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ---------------- EVENTS + BOOKINGS TABS ---------------- */}
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
        </TabsList>

        {/* EVENTS */}
        <TabsContent value="events" className="mt-6 space-y-4">
          {loading ? (
            <Card className="p-6">Loading events…</Card>
          ) : !hasEvents ? (
            <Card className="p-6">No events yet.</Card>
          ) : (
            myEvents.map((event) => (
              <Card key={event.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-neutral-900">{event.name}</h3>
                      <Badge className={statusColors[event.status]}>
                        {event.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-neutral-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} /> {event.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} /> {event.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye size={16} /> {event.views} views
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openStallsManager(event.id, event.name)}
                      >
                        Manage Stalls
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          openBroadcastDialog(event.id, event.name)
                        }
                      >
                        Broadcast Message
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => exportRoster(event.id, event.name)}
                      >
                        Export Roster
                      </DropdownMenuItem>

                      <DropdownMenuItem className="text-error">
                        Cancel Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Stalls Sold</p>
                    <p className="text-neutral-900">
                      {event.stallsSold}/{event.stallsTotal}
                    </p>
                  </Card>

                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Revenue</p>
                    <p className="text-primary">₹{event.revenue}</p>
                  </Card>

                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Fill Rate</p>
                    <p className="text-neutral-900">
                      {Math.round(
                        (event.stallsSold / Math.max(1, event.stallsTotal)) * 100
                      )}
                      %
                    </p>
                  </Card>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-6">
          {bookingsLoading ? (
            <Card className="p-6">Loading bookings…</Card>
          ) : !orgBookings.length ? (
            <Card className="p-6">No bookings found.</Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {orgBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.id}</TableCell>
                      <TableCell>{b.creatorName}</TableCell>
                      <TableCell>{b.eventTitle}</TableCell>
                      <TableCell>{b.tier}</TableCell>
                      <TableCell className="text-primary">
                        ₹{b.amount.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={statusColors[b.status] || "bg-neutral-300"}
                        >
                          {b.status}
                        </Badge>
                      </TableCell>

                      <TableCell>{b.date}</TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingBookingId === b.id}
                            >
                              {updatingBookingId === b.id
                                ? "Updating…"
                                : "Update"}
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateBookingStatus(b.id, "PAID")}
                            >
                              Mark as Paid
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                updateBookingStatus(b.id, "PENDING")
                              }
                            >
                              Mark as Pending
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-error"
                              onClick={() =>
                                updateBookingStatus(b.id, "CANCELLED")
                              }
                            >
                              Cancel Booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* =====================================================
              BROADCAST MESSAGE DIALOG
      ===================================================== */}
      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Broadcast Message</DialogTitle>
            <DialogDescription>
              Send message to creators who booked stalls for{" "}
              {broadcastEventName ? `"${broadcastEventName}"` : "this event"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Subject (optional)</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={broadcastSending}
              onClick={handleSendBroadcast}
            >
              {broadcastSending ? "Sending…" : "Send Broadcast"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =====================================================
              STALL MANAGEMENT DIALOG
      ===================================================== */}
      <Dialog open={stallsDialogOpen} onOpenChange={setStallsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Stalls</DialogTitle>
            <DialogDescription>
              Configure stalls for event "{selectedEventName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto py-2">
            {/* Existing Stalls */}
            <div>
              <h3 className="font-medium mb-3">Existing Stalls</h3>

              {stallsLoading ? (
                <Card className="p-4">Loading stalls…</Card>
              ) : stalls.length === 0 ? (
                <Card className="p-4">No stalls yet.</Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Left</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {stalls.map((s) => {
                        const sold = (s.qtyTotal || 0) - (s.qtyLeft || 0);

                        return (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.tier}</TableCell>
                            <TableCell>₹{s.price}</TableCell>
                            <TableCell>{s.qtyTotal}</TableCell>
                            <TableCell>{s.qtyLeft}</TableCell>
                            <TableCell>{sold}</TableCell>

                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditStall(s)}
                              >
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-error"
                                onClick={() => handleDeleteStall(s.id)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>

            {/* Add / Edit Stall */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium">
                {editingStallId ? "Edit Stall" : "Add New Stall"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={stallName}
                    onChange={(e) => setStallName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Tier</Label>
                  <Input
                    value={stallTier}
                    onChange={(e) => setStallTier(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={stallPrice}
                    onChange={(e) => setStallPrice(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Total Qty</Label>
                  <Input
                    type="number"
                    value={stallQtyTotal}
                    onChange={(e) => setStallQtyTotal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Specs</Label>
                <Textarea
                  rows={3}
                  value={stallSpecs}
                  onChange={(e) => setStallSpecs(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                {editingStallId && (
                  <Button variant="ghost" onClick={resetStallForm}>
                    Cancel Edit
                  </Button>
                )}

                <Button disabled={stallSaving} onClick={handleSaveStall}>
                  {stallSaving
                    ? editingStallId
                      ? "Saving…"
                      : "Creating…"
                    : editingStallId
                    ? "Save Changes"
                    : "Add Stall"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
