import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Shield,
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
  tier: string;
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

const API =
  import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

function getToken(): string | null {
  return (
    localStorage.getItem("jwt") ||
    localStorage.getItem("sharthi_token") ||
    null
  );
}

async function safeFetch(url: string) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return null;
  }
}

export function BookingFlow({ onSuccess, onBack }: BookingFlowProps) {
  const [step, setStep] = useState<"review" | "payment" | "success">("review");
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "netbanking"
  >("upi");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [event, setEvent] = useState<EventMeta | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // LOAD BOOKING DRAFT + EVENT + STALL
  // --------------------------------------------------
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
        // Load event
        const ev = await safeFetch(`${API}/events/${d.eventId}`);
        if (!cancelled) setEvent(ev || null);

        // Load stalls (public)
        const stallsRes = await safeFetch(
          `${API}/events/${d.eventId}/stalls`
        );

        const stallList = Array.isArray(stallsRes)
          ? stallsRes
          : stallsRes?.stalls || [];

        const found = stallList.find(
          (s: any) => String(s.id) === String(d.stallId)
        );

        if (!cancelled) setStall(found || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onBack]);

  // --------------------------------------------------
  // TOTALS
  // --------------------------------------------------
  const totals = useMemo(() => {
    const base = draft?.price ?? 0;
    const platform = 0;
    const gst = 0;
    const total = base + platform + gst;
    return { base, platform, gst, total };
  }, [draft]);

  // --------------------------------------------------
  // HANDLE PAYMENT
  // --------------------------------------------------
  async function handlePayment() {
    if (!draft) return;

    const token = getToken();
    if (!token) {
      toast.error("Please sign in to complete booking.");
      return;
    }

    if (!stall || stall.qtyLeft <= 0) {
      toast.error("Stall is sold out.");
      return;
    }

    toast.loading("Processing payment…", { id: "pay" });

    try {
      // DIRECT BOOKING API (your backend handles it)
      const r = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: draft.eventId,
          stallId: draft.stallId,
          amount: totals.total,
          paymentRef: "LOCALPAY-" + Date.now(),
        }),
      });

      const res = await r.json();
      if (!r.ok) throw new Error(res?.message || "Booking failed");

      toast.dismiss("pay");
      toast.success("Payment successful!");

      localStorage.removeItem("sharthi_booking_draft");

      setStep("success");
    } catch (err: any) {
      toast.dismiss("pay");
      toast.error(err?.message || "Payment failed");
    }
  }

  // --------------------------------------------------
  // SUCCESS SCREEN
  // --------------------------------------------------
  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-accent to-secondary rounded-full flex items-center justify-center mx-auto">
          <Check className="text-white" size={40} />
        </div>

        <h2 className="text-neutral-900">Booking Confirmed 🎉</h2>
        <p className="text-neutral-600">
          Your stall has been successfully booked.
        </p>

        <Card className="p-6 space-y-4">
          <Row label="Event" value={event?.title} />
          <Row label="Tier" value={draft?.tier} />
          <Row
            label="Total Paid"
            value={`₹${totals.total.toLocaleString()}`}
          />
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
    );
  }

  // --------------------------------------------------
  // PAYMENT SCREEN
  // --------------------------------------------------
  if (step === "payment") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
            <ArrowLeft size={18} />
          </Button>
          <h2 className="text-neutral-900">Payment</h2>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <Shield size={20} className="text-primary" />
            <p className="text-neutral-700 text-sm">
              Your payment is protected by LocalPush
            </p>
          </div>

          <Label>Select Payment Method</Label>

          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) =>
              setPaymentMethod(v as "upi" | "card" | "netbanking")
            }
          >
            <PayOption value="upi" label="UPI" recommended />
            <PayOption value="card" label="Credit/Debit Card" />
            <PayOption value="netbanking" label="Net Banking" />
          </RadioGroup>

          <Separator />

          <Row
            label="Total Amount"
            value={`₹${totals.total.toLocaleString()}`}
          />

          <Button className="w-full" size="lg" onClick={handlePayment}>
            <CreditCard size={18} className="mr-2" />
            Pay ₹{totals.total.toLocaleString()}
          </Button>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------
  // REVIEW SCREEN
  // --------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-neutral-900">Review Booking</h2>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="text-neutral-900">Event Details</h3>

        <Row label="Event" value={event?.title} />
        <Row
          label="Date"
          value={
            event?.startAt
              ? new Date(event.startAt).toLocaleDateString()
              : "—"
          }
        />
        <Row label="City" value={event?.cityId} />

        <Separator />

        <h3 className="text-neutral-900">Stall Details</h3>

        <Row label="Tier" value={draft?.tier} />
        <Row label="Stall" value={stall?.name} />
        <Row label="Price" value={`₹${totals.base.toLocaleString()}`} />

        <Separator />

        <Row
          label="Total"
          value={`₹${totals.total.toLocaleString()}`}
          bold
        />
      </Card>

      <Button
        className="w-full"
        size="lg"
        disabled={loading || !draft}
        onClick={() => setStep("payment")}
      >
        <IndianRupee size={16} className="mr-2" />
        Proceed to Payment
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value?: any;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">{label}</span>
      <span className={bold ? "text-neutral-900 font-semibold" : "text-neutral-900"}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function PayOption({
  value,
  label,
  recommended,
}: {
  value: string;
  label: string;
  recommended?: boolean;
}) {
  return (
    <Card
      className="p-4 cursor-pointer mt-2 flex items-center gap-3"
    >
      <RadioGroupItem value={value} id={value} />
      <Label htmlFor={value} className="flex-1 cursor-pointer">
        {label}
      </Label>
      {recommended && (
        <span className="text-accent text-xs">Recommended</span>
      )}
    </Card>
  );
}
