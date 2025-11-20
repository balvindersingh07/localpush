import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Shield,
  Calendar,
  MapPin,
  IndianRupee,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { toast } from "sonner";

interface BookingFlowProps {
  eventId: string | null;
  onSuccess: () => void;
  onBack: () => void;
}

type Draft = {
  eventId: string;
  stallId: string;
  tier: string; // Basic / Premium / VIP
  price: number;
};

type EventMeta = {
  id: string;
  title: string;
  cityId?: string;
  startAt?: string;
  endAt?: string;
};

type Stall = {
  id: string;
  name?: string;
  tier: string;
  price: number;
  qtyLeft: number;
  qtyTotal: number;
};

const API = import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

/* ----------------------- HELPERS ----------------------- */
function getToken(): string | null {
  try {
    return localStorage.getItem("jwt") || localStorage.getItem("sharthi_token");
  } catch {
    return null;
  }
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

/* ----------------------- MAIN COMPONENT ----------------------- */
export function BookingFlow({ onSuccess, onBack }: BookingFlowProps) {
  const [step, setStep] = useState<"review" | "payment" | "success">("review");
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "netbanking"
  >("upi");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [event, setEvent] = useState<EventMeta | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);

  /* ----------------------- LOAD DRAFT + DETAILS ----------------------- */
  useEffect(() => {
    const raw = localStorage.getItem("sharthi_booking_draft");
    if (!raw) {
      toast.error("No stall selected.");
      onBack();
      return;
    }

    const d: Draft = JSON.parse(raw);
    setDraft(d);

    let cancelled = false;

    (async () => {
      try {
        // Get events
        const eventsResp = await fetch(`${API}/events`)
          .then((r) => r.json())
          .catch(() => null);

        const eventsList: EventMeta[] = Array.isArray(eventsResp)
          ? eventsResp
          : eventsResp?.items ?? [];

        const em = eventsList.find((e) => e.id === d.eventId) || null;
        if (!cancelled) setEvent(em);

        // Get stalls for selected event
        const stallsRes = await fetch(`${API}/events/${d.eventId}/stalls`)
          .then((r) => r.json())
          .catch(() => []);

        const stalls: Stall[] = Array.isArray(stallsRes)
          ? stallsRes
          : stallsRes.stalls ?? [];

        const st =
          stalls.find((s) => String(s.id) === String(d.stallId)) || null;

        if (!cancelled) setStall(st);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onBack]);

  /* ----------------------- AMOUNTS ----------------------- */
  const totals = useMemo(() => {
    const base = draft?.price ?? 0;
    const platform = 0;
    const gst = 0;
    const total = base + platform + gst;
    return { base, platform, gst, total };
  }, [draft]);

  /* ----------------------- PAYMENT ACTION ----------------------- */
  const handlePayment = async () => {
    if (!draft) return;

    const token = getToken();
    if (!token) {
      toast.error("Please sign in to complete your booking.");
      return;
    }

    toast.loading("Processing payment…", { id: "pay" });

    try {
      const { paymentRef } = await api("/payments/mock", {
        method: "POST",
        body: JSON.stringify({}),
      });

      await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          eventId: draft.eventId,
          stallId: draft.stallId,
          amount: totals.total,
          paymentRef,
        }),
      });

      toast.dismiss("pay");
      toast.success("Payment successful! Your stall is confirmed.");
      setStep("success");

      localStorage.removeItem("sharthi_booking_draft");
    } catch (e: any) {
      toast.dismiss("pay");
      toast.error(e?.message || "Payment failed. Please try again.");
    }
  };

  /* ----------------------- SUCCESS SCREEN ----------------------- */
  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-secondary rounded-full flex items-center justify-center mx-auto">
            <Check className="text-white" size={40} />
          </div>

          <div>
            <h2 className="text-neutral-900 mb-2">Booking Confirmed! 🎉</h2>
            <p className="text-neutral-600">
              Your stall has been successfully booked.
            </p>
          </div>

          <Card className="p-6 text-left space-y-4">
            <div className="flex justify-between">
              <span className="text-neutral-600">Event</span>
              <span className="text-neutral-900">
                {event?.title || "Event"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-600">Stall Tier</span>
              <span className="text-neutral-900">{draft?.tier}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-600">Total Paid</span>
              <span className="text-primary">
                ₹{totals.total.toLocaleString()}
              </span>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={onSuccess}>
              View My Bookings
            </Button>

            <Button variant="outline" className="flex-1" onClick={onBack}>
              Browse More Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------- PAYMENT STEP ----------------------- */
  if (step === "payment") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-neutral-900">Payment</h2>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <Shield size={20} className="text-primary shrink-0" />
            <p className="text-neutral-700 text-sm">
              Your payment is secure and protected by LocalPush
            </p>
          </div>

          {/* Payment Options */}
          <div>
            <Label className="mb-3">Select Payment Method</Label>

            <RadioGroup
              value={paymentMethod}
              onValueChange={(v: string) =>
                setPaymentMethod(v as "upi" | "card" | "netbanking")
              }
            >
              <div className="space-y-3">
                {/* UPI */}
                <Card
                  className={`p-4 cursor-pointer ${
                    paymentMethod === "upi"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex-1 cursor-pointer">
                      UPI
                    </Label>
                    <span className="text-accent text-sm">Recommended</span>
                  </div>
                </Card>

                {/* CARD */}
                <Card
                  className={`p-4 cursor-pointer ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      Credit/Debit Card
                    </Label>
                  </div>
                </Card>

                {/* NETBANKING */}
                <Card
                  className={`p-4 cursor-pointer ${
                    paymentMethod === "netbanking"
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="netbanking" id="netbanking" />
                    <Label htmlFor="netbanking" className="flex-1 cursor-pointer">
                      Net Banking
                    </Label>
                  </div>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {/* Dynamic fields */}
          {paymentMethod === "upi" && (
            <div className="space-y-3">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input id="upi-id" placeholder="yourname@upi" />
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="1234 5678 9012 3456" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>

                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" type="password" />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex justify-between">
            <span className="text-neutral-600">Total Amount</span>
            <span className="text-primary">
              ₹{totals.total.toLocaleString()}
            </span>
          </div>

          <Button className="w-full" size="lg" onClick={handlePayment}>
            <CreditCard size={18} className="mr-2" />
            Pay ₹{totals.total.toLocaleString()}
          </Button>
        </Card>
      </div>
    );
  }

  /* ----------------------- REVIEW STEP ----------------------- */
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-neutral-900">Review Booking</h2>
      </div>

      {/* EVENT DETAILS */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-neutral-900 mb-3">Event Details</h3>

          <div className="space-y-2">
            <p className="text-neutral-900">{event?.title || "Event"}</p>

            <div className="flex items-center gap-2 text-neutral-600 text-sm">
              <Calendar size={16} />
              <span>
                {event?.startAt
                  ? new Date(event.startAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-neutral-600 text-sm">
              <MapPin size={16} />
              <span>{event?.cityId || "—"}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* STALL DETAILS */}
        <div>
          <h3 className="text-neutral-900 mb-3">Stall Details</h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-600">Tier</span>
              <span className="text-neutral-900">{draft?.tier}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-600">Stall</span>
              <span className="text-neutral-900">{stall?.name || "—"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-600">Price</span>
              <span className="text-neutral-900">
                ₹{(draft?.price || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* BILLING SUMMARY */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-neutral-600">Stall price</span>
            <span className="text-neutral-900">₹{totals.base}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-600">Platform fee</span>
            <span className="text-neutral-900">₹{totals.platform}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-600">GST (18%)</span>
            <span className="text-neutral-900">₹{totals.gst}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-neutral-900">Total</span>
            <span className="text-primary">
              ₹{totals.total.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* CONTACT DETAILS */}
      <Card className="p-6 space-y-4">
        <h3 className="text-neutral-900">Contact Details</h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" defaultValue="Priya Sharma" />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" defaultValue="+91 98765 43210" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="priya@example.com" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-neutral-50">
        <p className="text-neutral-700 text-sm">
          By proceeding, you agree to the event's cancellation policy and
          LocalPush's terms of service.
        </p>
      </Card>

      {/* BUTTON */}
      <Button
        className="w-full"
        size="lg"
        disabled={loading || !draft}
        onClick={() => setStep("payment")}
      >
        <IndianRupee size={18} className="mr-2" /> Proceed to Payment
      </Button>
    </div>
  );
}
