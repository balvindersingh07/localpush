import { useEffect, useState } from "react";
import {
  Plus,
  Eye,
  Calendar,
  MapPin,
  MoreVertical,
} from "lucide-react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

/* ---------------------------------------------------------
    API / TOKEN
----------------------------------------------------------*/
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";

function getToken(): string | null {
  return (
    localStorage.getItem("jwt") ||
    localStorage.getItem("sharthi_token") ||
    null
  );
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
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

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

/* ---------------------------------------------------------
    CLOUDINARY UPLOAD
----------------------------------------------------------*/
const CLOUD_NAME = "dqku1n0xm";
const UPLOAD_PRESET = "default";

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload failed");

  return data.secure_url;
}

/* ---------------------------------------------------------
    TYPES
----------------------------------------------------------*/
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

/* ---------------------------------------------------------
    UTILS
----------------------------------------------------------*/
function formatDateRange(start: string, end: string) {
  if (!start || !end) return "—";
  const s = new Date(start).toLocaleDateString();
  const e = new Date(end).toLocaleDateString();
  return s === e ? s : `${s} - ${e}`;
}

function normalizeStatus(s: string): "live" | "upcoming" | "ended" {
  const v = s.toLowerCase();
  if (v.includes("up")) return "upcoming";
  if (v.includes("end")) return "ended";
  return "live";
}

/* ---------------------------------------------------------
    COMPONENT START
----------------------------------------------------------*/
export function OrganizerDashboard() {
  /* CREATE EVENT FORM */
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [evName, setEvName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cityId, setCityId] = useState("");
  const [venueName, setVenueName] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");

  /* IMAGES */
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  /* EVENTS LIST */
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState<EventCard[]>([]);
  /* ---------------------------------------------------------
      LOAD EVENTS ON PAGE LOAD
  ----------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      try {
        const resp = await jsonFetch<any>(`${API}/organizer/me/events`);
        const list = resp.items || [];

        const mapped = list.map((e: any) => ({
          id: e.id || e._id,
          name: e.title,
          date: formatDateRange(e.startAt, e.endAt),
          location: e.cityId || "—",
          status: normalizeStatus(e.status),
          stallsSold: e.stallsSold ?? 0,
          stallsTotal: e.stallsTotal ?? 0,
          revenue: e.revenue ?? 0,
          views: e.views ?? 0,
        }));

        setMyEvents(mapped);
      } catch (e: any) {
        toast.error(e.message || "Failed loading events");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------------------------------------------------
      CREATE EVENT + IMAGE UPLOAD HANDLER
  ----------------------------------------------------------*/
  async function handleCreateEvent() {
    if (!evName || !startDate || !endDate || !cityId) {
      toast.error("Required fields missing");
      return;
    }

    setCreating(true);

    try {
      let banner = "";
      let cover = "";

      if (bannerFile) banner = await uploadToCloudinary(bannerFile);
      if (coverFile) cover = await uploadToCloudinary(coverFile);

      const body = {
        title: evName,
        cityId,
        location,
        venueName,
        description: desc,
        startAt: startDate,
        endAt: endDate,
        tags: tagsCsv.split(",").map((x) => x.trim()),
        bannerImage: banner,
        coverImage: cover,
      };

      const resp = await jsonFetch<any>(`${API}/events`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success("Event created");

      const e = resp.event;

      setMyEvents((prev) => [
        {
          id: e.id,
          name: e.title,
          date: formatDateRange(e.startAt, e.endAt),
          location: e.cityId,
          status: normalizeStatus(e.status),
          stallsSold: 0,
          stallsTotal: 0,
          revenue: 0,
          views: 0,
        },
        ...prev,
      ]);

      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  /* ---------------------------------------------------------
      UI START — HEADER + CREATE EVENT MODAL
  ----------------------------------------------------------*/
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ---------- HEADER ---------- */}
      <div className="flex justify-between items-center">
        <h1 className="text-neutral-900">Organizer Dashboard</h1>

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

            <div className="space-y-4 pt-3 max-h-[60vh] overflow-y-auto">
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
                <Label>Banner Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && setBannerFile(e.target.files[0])
                  }
                />
              </div>

              <div>
                <Label>Cover Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && setCoverFile(e.target.files[0])
                  }
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
                  placeholder="art, craft, food"
                  value={tagsCsv}
                  onChange={(e) => setTagsCsv(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={creating}
                onClick={handleCreateEvent}
              >
                {creating ? "Creating…" : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* PART-3 continues from here (KPI Cards + Charts + Events List) */}
      {/* ---------------------------------------------------------
          KPI CARDS
      ----------------------------------------------------------*/}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Total Revenue</p>
          <h2 className="text-neutral-900">{stats.revenue}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Stalls Sold</p>
          <h2 className="text-neutral-900">{stats.sold}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Active Events</p>
          <h2 className="text-neutral-900">{stats.active}</h2>
        </Card>

        <Card className="p-6">
          <p className="text-neutral-600 text-sm">Total Views</p>
          <h2 className="text-neutral-900">{stats.views}</h2>
        </Card>
      </div>

      {/* ---------------------------------------------------------
          CHARTS SECTION
      ----------------------------------------------------------*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* Revenue Chart */}
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
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Bookings Chart */}
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
                radius={[8, 8, 0, 0]}
                fill="#2EC4B6"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ---------------------------------------------------------
          EVENTS + BOOKINGS TABS
      ----------------------------------------------------------*/}
      <Tabs defaultValue="events" className="mt-8">
        <TabsList>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
        </TabsList>

        {/* =============== EVENTS TAB =============== */}
        <TabsContent value="events" className="mt-6 space-y-4">
          {loading ? (
            <Card className="p-6">Loading events…</Card>
          ) : myEvents.length === 0 ? (
            <Card className="p-6 text-neutral-600">No events created yet.</Card>
          ) : (
            myEvents.map((event) => (
              <Card key={event.id} className="p-6 space-y-4">
                {/* Event Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-neutral-900">{event.name}</h3>
                      <Badge className="bg-accent text-white capitalize">
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

                  {/* Event Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          openStallsManager(event.id, event.name)
                        }
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

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Stalls Sold</p>
                    <p className="text-neutral-900">
                      {event.stallsSold}/{event.stallsTotal}
                    </p>
                  </Card>

                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Revenue</p>
                    <p className="text-primary font-semibold">
                      ₹{event.revenue}
                    </p>
                  </Card>

                  <Card className="p-4 bg-neutral-50 rounded-xl">
                    <p className="text-neutral-600 text-sm">Fill Rate</p>
                    <p className="text-neutral-900">
                      {Math.round(
                        (event.stallsSold /
                          Math.max(1, event.stallsTotal)) *
                          100
                      )}
                      %
                    </p>
                  </Card>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      {/* =====================================================
            BROADCAST MESSAGE DIALOG
      ===================================================== */}
      <Dialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Broadcast Message</DialogTitle>
            <DialogDescription>
              Send updates to all creators who booked stalls for{" "}
              <span className="font-semibold text-neutral-800">
                {broadcastEventName}
              </span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* SUBJECT */}
            <div>
              <Label>Subject (optional)</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
              />
            </div>

            {/* MESSAGE */}
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
              Configure stalls for{" "}
              <span className="font-semibold text-neutral-900">
                "{selectedEventName}"
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto py-2">

            {/* ---------- EXISTING STALLS ---------- */}
            <div>
              <h3 className="font-medium mb-3">Existing Stalls</h3>

              {stallsLoading ? (
                <Card className="p-4">Loading stalls…</Card>
              ) : stalls.length === 0 ? (
                <Card className="p-4 text-neutral-600">No stalls yet.</Card>
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
                            <TableCell>{s.tier || "—"}</TableCell>
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

            {/* ---------- ADD / EDIT STALL FORM ---------- */}
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
                    placeholder="Ex: Booth A1"
                  />
                </div>

                <div>
                  <Label>Tier</Label>
                  <Input
                    value={stallTier}
                    onChange={(e) => setStallTier(e.target.value)}
                    placeholder="Silver / Gold / Premium"
                  />
                </div>

                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={stallPrice}
                    onChange={(e) => setStallPrice(e.target.value)}
                    placeholder="3000"
                  />
                </div>

                <div>
                  <Label>Total Qty</Label>
                  <Input
                    type="number"
                    value={stallQtyTotal}
                    onChange={(e) => setStallQtyTotal(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <Label>Specs</Label>
                <Textarea
                  rows={3}
                  value={stallSpecs}
                  onChange={(e) => setStallSpecs(e.target.value)}
                  placeholder="6x6 ft, table included, electricity…"
                />
              </div>

              {/* Save Buttons */}
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
