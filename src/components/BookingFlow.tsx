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

const API = import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

function getToken(): string | null {
  return (
    localStorage.getItem("jwt") ||
    localStorage.getItem("lp_token") ||
    localStorage.getItem("sharthi_token")
  );
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
export function BookingFlow({ onSuccess, onBack }: BookingFlowProps) {
  const [step, setStep] = useState<"review" | "payment" | "success">("review");

  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "netbanking"
  >("upi");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [event, setEvent] = useState<EventMeta | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);

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
        const evList = await fetch(`${API}/events`)
          .then((r) => r.json())
          .catch(() => []);

        const foundEvent =
          evList.find((e: any) => String(e.id) === String(d.eventId)) || null;

        if (!cancelled) setEvent(foundEvent);

        const stallsRes = await fetch(`${API}/events/${d.eventId}/stalls`)
          .then((r) => r.json())
          .catch(() => []);

        const stallList = Array.isArray(stallsRes)
          ? stallsRes
          : stallsRes.stalls || [];

        const foundStall =
          stallList.find((s: any) => String(s.id) === String(d.stallId)) ||
          null;

        if (!cancelled) setStall(foundStall);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onBack]);
  const totals = useMemo(() => {
    const base = draft?.price ?? 0;
    const platform = 0;
    const gst = 0;
    const total = base + platform + gst;
    return { base, platform, gst, total };
  }, [draft]);
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
      toast.success("Payment successful!");
      setStep("success");
      localStorage.removeItem("sharthi_booking_draft");
    } catch (e: any) {
      toast.dismiss("pay");
      toast.error(e?.message || "Payment failed");
    }
  };
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

          {paymentMethod === "upi" && (
            <Input placeholder="yourname@upi" className="mt-3" />
          )}

          {paymentMethod === "card" && (
            <div className="space-y-3 mt-3">
              <Input placeholder="Card Number" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="MM/YY" />
                <Input placeholder="CVV" />
              </div>
            </div>
          )}

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

        <h3 className="text-neutral-900">Billing Summary</h3>
        <Row label="Stall Price" value={`₹${totals.base}`} />
        <Row label="Platform Fee" value={`₹${totals.platform}`} />
        <Row label="GST" value={`₹${totals.gst}`} />

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
      onClick={() => {}}
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
