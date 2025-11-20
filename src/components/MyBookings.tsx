/*  
  LocalPush — MyBookings.tsx  
  Optimized for backend contract:
  GET  /bookings/my
  POST /bookings/:id/review
  GET  /bookings/invoice/:bookingId
*/

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  MapPin,
  Download,
  QrCode,
  Star,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

/* ------------------ TYPES ------------------ */
type BookingItem = {
  id: string;
  event: string;
  dateStart?: string | null;
  dateEnd?: string | null;
  location?: string;
  tier: string;
  stallNumber?: string;
  amount: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  reviewed?: boolean;
  rating?: number;
};

/* ------------------ STATUS COLOR MAP ------------------ */
const statusColors: Record<BookingItem["status"], string> = {
  confirmed: "bg-accent",
  pending: "bg-warning",
  completed: "bg-neutral-400",
  cancelled: "bg-error",
};

const API = import.meta.env.VITE_API_URL;

/* ------------------ AUTH TOKEN ------------------ */
function getToken(): string | null {
  return localStorage.getItem("jwt") || localStorage.getItem("sharthi_token");
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const t = await res.json();
      msg = t?.error || t?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

/* ------------------ MyBookings Component ------------------ */
export function MyBookings() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const data: any[] = await api("/bookings/my");

        const mapped: BookingItem[] = data.map((x) => {
          const rawStatus = String(x.status || "").toUpperCase();

          const statusMap: Record<string, BookingItem["status"]> = {
            PAID: "confirmed",
            PENDING: "pending",
            CANCELLED: "cancelled",
            COMPLETED: "completed",
          };

          // Convert GOLD/SILVER/BRONZE -> UI labels
          const tierMap: Record<string, string> = {
            GOLD: "VIP",
            SILVER: "Premium",
            BRONZE: "Basic",
          };

          return {
            id: x.id,
            event: x.event?.title ?? "Event",
            dateStart: x.event?.startAt ?? null,
            dateEnd: x.event?.endAt ?? null,
            location: x.event?.cityId ?? "",
            tier: tierMap[x.stall?.tier?.toUpperCase()] || x.stall?.tier,
            stallNumber: x.stall?.name ?? "",
            amount: Number(x.amount ?? x.stall?.price ?? 0),
            status: statusMap[rawStatus] || "confirmed",
            reviewed: x.reviewed ?? false,
            rating: x.rating ?? 0,
          };
        });

        setBookings(mapped);
      } catch (err) {
        console.log("Bookings load failed:", err);
      }

      setLoading(false);
    }

    load();
  }, []);

  /* ------------------ Upcoming / Past split ------------------ */
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();

    const upcoming: BookingItem[] = [];
    const past: BookingItem[] = [];

    for (const b of bookings) {
      const end = b.dateEnd
        ? new Date(b.dateEnd).getTime()
        : b.dateStart
        ? new Date(b.dateStart).getTime()
        : now;

      if (
        end >= now &&
        b.status !== "completed" &&
        b.status !== "cancelled"
      ) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    }

    return { upcoming, past };
  }, [bookings]);

  /* ------------------ ACTIONS ------------------ */

  const downloadInvoice = async (b: BookingItem) => {
    try {
      const invoice = await api(`/bookings/invoice/${b.id}`);
      window.open(invoice.invoiceUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Invoice fetch failed");
    }
  };

  const markReviewed = async (id: string, rating: number) => {
    try {
      await api(`/bookings/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });

      setBookings((arr) =>
        arr.map((b) =>
          b.id === id ? { ...b, reviewed: true, rating } : b
        )
      );

      toast.success("Thanks for your review!");
    } catch (e: any) {
      toast.error(e.message || "Review failed");
    }
  };

  /* ------------------ RENDER ------------------ */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-neutral-900 mb-2">My Bookings</h1>
        <p className="text-neutral-600">
          Manage your event bookings and tickets
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        {/* UPCOMING LIST */}
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcoming.map((booking) => (
            <Card key={booking.id} className="p-6">
              <UpcomingCard
                booking={booking}
                onContact={() =>
                  toast.info("Organizer chat coming soon…")
                }
              />
            </Card>
          ))}

          {!loading && upcoming.length === 0 && (
            <EmptyUpcoming />
          )}
        </TabsContent>

        {/* PAST LIST */}
        <TabsContent value="past" className="mt-6 space-y-4">
          {past.map((booking) => (
            <Card key={booking.id} className="p-6">
              <PastCard
                booking={booking}
                onInvoice={() => downloadInvoice(booking)}
                onReview={(rating) => markReviewed(booking.id, rating)}
              />
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------ SUB-COMPONENTS ------------------ */

function UpcomingCard({
  booking,
  onContact,
}: {
  booking: BookingItem;
  onContact: () => void;
}) {
  return (
    <>
      <div className="flex justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3>{booking.event}</h3>
            <Badge className={statusColors[booking.status]}>
              {booking.status}
            </Badge>
          </div>

          <div className="space-y-1 text-neutral-600">
            <p className="flex items-center gap-2">
              <Calendar size={16} />
              {booking.dateStart
                ? new Date(booking.dateStart).toLocaleDateString()
                : "—"}
            </p>
            {booking.location && (
              <p className="flex items-center gap-2">
                <MapPin size={16} />
                {booking.location}
              </p>
            )}
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <QrCode size={18} />
              View Ticket
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Event Ticket</DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-6">
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-neutral-100 rounded-xl flex justify-center items-center">
                  <QrCode size={120} className="text-neutral-400" />
                </div>
              </div>

              <Separator />

              <Button onClick={onContact} className="w-full gap-2">
                <MessageCircle size={18} />
                Contact Organizer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-3 gap-4">
        <InfoBox label="Stall" value={booking.tier} />
        <InfoBox label="Booking ID" value={booking.id} />
        <InfoBox
          label="Amount"
          value={`₹${booking.amount.toLocaleString()}`}
        />
      </div>
    </>
  );
}

function PastCard({
  booking,
  onInvoice,
  onReview,
}: {
  booking: BookingItem;
  onInvoice: () => void;
  onReview: (rating: number) => void;
}) {
  return (
    <>
      <div className="flex justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3>{booking.event}</h3>
            <Badge className={statusColors[booking.status]}>
              {booking.status}
            </Badge>
          </div>
          <p className="flex items-center gap-2 text-neutral-600">
            <Calendar size={16} />
            {booking.dateStart
              ? new Date(booking.dateStart).toLocaleDateString()
              : ""}
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={onInvoice}>
          <Download size={18} />
          Invoice
        </Button>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between items-center">
        <div className="flex gap-6">
          <InfoBox label="Stall" value={booking.tier} />
          <InfoBox
            label="Amount"
            value={`₹${booking.amount.toLocaleString()}`}
          />
        </div>

        {booking.reviewed ? (
          <ReviewedStars value={booking.rating || 0} />
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Star size={16} />
                Write Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate this Event</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-6">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Star
                      key={r}
                      size={32}
                      onClick={() => onReview(r)}
                      className="text-warning hover:fill-warning cursor-pointer"
                    />
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 bg-neutral-50 rounded-xl">
      <p className="text-neutral-600 text-sm">{label}</p>
      <p className="text-neutral-900">{value}</p>
    </div>
  );
}

function ReviewedStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < value ? "fill-warning text-warning" : "text-neutral-300"
            }
          />
        ))}
      </div>
      <span className="text-neutral-600 text-sm">Reviewed</span>
    </div>
  );
}

function EmptyUpcoming() {
  return (
    <Card className="p-12">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-neutral-100 rounded-full mx-auto flex justify-center items-center">
          <Calendar size={32} className="text-neutral-400" />
        </div>
        <h4>No upcoming bookings</h4>
        <p className="text-neutral-600">Book a stall to get started!</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/")}>
          Browse Events
        </Button>
      </div>
    </Card>
  );
}
