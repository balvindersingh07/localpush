import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, Info, Shield, Clock, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface EventDetailProps {
  eventId: string | null;
  onBookStall: () => void;
  onBack: () => void;
}

type Stall = {
  id: string;
  name?: string;
  tier: string;
  price: number;
  qtyTotal: number;
  qtyLeft: number;
  specs?: string | null;
};

type EventMeta = {
  id: string;
  title: string;
  cityId: string;
  startAt: string;
  endAt: string;
  categoryTagsCsv?: string;
  status?: string;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
};

const API = import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

// helper: pick “looks like prisma cuid” (24+ chars alnum) else null
const isRealId = (id?: string | null) => !!id && id.length >= 24 && /^[a-z0-9]+$/i.test(id || "");

export function EventDetail({ eventId, onBookStall, onBack }: EventDetailProps) {
  const [eid, setEid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null);

  // Always fetch /events first and resolve a valid id
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const list: EventMeta[] = await fetch(`${API}/events`, { signal: ac.signal })
          .then(r => r.json())
          .catch(() => []);
        // if parent gave a valid id AND it exists in list -> use that
        let resolved: string | null = null;
        if (isRealId(eventId) && list.some(e => e.id === eventId)) {
          resolved = eventId!;
        } else if (list.length) {
          // otherwise fall back to first event from API
          resolved = list[0].id;
        } else {
          toast.error("No events found. Please seed the database.");
          onBack();
          return;
        }
        setEid(resolved);
        const meta = list.find(e => e.id === resolved) || null;
        setEventMeta(meta);
      } catch {
        toast.error("Failed to load event.");
        onBack();
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Fetch full event detail (incl. rating) once we know eid
  useEffect(() => {
    if (!eid) return;
    const ac = new AbortController();
    (async () => {
      try {
        const detail: EventMeta = await fetch(`${API}/events/${eid}`, { signal: ac.signal }).then(r => r.json());
        if (detail && detail.id === eid) {
          setEventMeta(detail);
        }
      } catch {
        // keep previous meta if detail fails
      }
    })();
    return () => ac.abort();
  }, [eid]);

  // Fetch stalls for resolved event id
  useEffect(() => {
    if (!eid) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const stallsRes = await fetch(`${API}/events/${eid}/stalls`, { signal: ac.signal })
          .then(r => r.json())
          .catch(() => []);
        // Normalize (array or {stalls:[...]})
        const raw = Array.isArray(stallsRes) ? stallsRes : Array.isArray(stallsRes?.stalls) ? stallsRes.stalls : [];
        const normalized: Stall[] = raw.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          tier: String(s.tier ?? s.Tier ?? s.tierName ?? "SILVER").toUpperCase(),
          price: Number(s.price ?? s.amount ?? 0) || 0,
          qtyTotal: Number(s.qtyTotal ?? s.qty_total ?? s.total ?? 0) || 0,
          qtyLeft: Number(s.qtyLeft ?? s.qtyleft ?? s.qty_remaining ?? 0) || 0,
          specs: s.specs ?? null,
        }));
        setStalls(normalized);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [eid]);

  // Build tier cards
  const tierCards = useMemo(() => {
    const byTier = new Map<string, Stall[]>();
    for (const s of stalls) {
      const key = (s.tier || "SILVER").toUpperCase();
      const arr = byTier.get(key) || [];
      arr.push(s);
      byTier.set(key, arr);
    }
    const mkCard = (key: string, label: string, features: string[], popular?: boolean) => {
      const arr = byTier.get(key) || [];
      const total = arr.reduce((t, s) => t + (s.qtyTotal || 0), 0);
      const left = arr.reduce((t, s) => t + (s.qtyLeft || 0), 0);
      const price = arr.length
        ? Math.round(arr.reduce((t, s) => t + (s.price || 0), 0) / arr.length)
        : key === "GOLD"
          ? 12000
          : key === "SILVER"
            ? 8000
            : 5000;
      return {
        id: key.toLowerCase(),
        name: label,
        price,
        size: key === "GOLD" ? "15x15 ft" : key === "SILVER" ? "12x12 ft" : "10x10 ft",
        features,
        available: left,
        total,
        popular: !!popular,
        sampleStallId: arr[0]?.id || null,
      };
    };
    return [
      mkCard("BRONZE", "Basic", ["Basic Setup", "Electricity", "Table & Chairs"]),
      mkCard("SILVER", "Premium", ["Premium Setup", "Electricity", "Furniture", "Branding Space"], true),
      mkCard("GOLD", "VIP", ["VIP Setup", "Premium Electricity", "Full Furniture", "Prime Location", "Dedicated Support"]),
    ];
  }, [stalls]);

  const onSelectTier = (tierCard: any) => {
    if (!eid) return;
    if (!tierCard.sampleStallId || (tierCard.total > 0 && tierCard.available <= 0)) {
      toast.info("No stalls left in this tier.");
      return;
    }
    localStorage.setItem("sharthi_booking_draft", JSON.stringify({
      eventId: eid,
      stallId: tierCard.sampleStallId,
      tier: tierCard.name, // BRONZE→Basic / SILVER→Premium / GOLD→VIP already mapped via label
      price: tierCard.price,
    }));
    onBookStall();
  };

  const firstTag = (eventMeta?.categoryTagsCsv || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)[0];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative h-64 md:h-96">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1761124739063-8a1464438cdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
          alt="Event"
          className="w-full h-full object-cover"
        />
        <Button variant="secondary" size="sm" className="absolute top-4 left-4" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <Badge className="absolute top-4 right-4 bg-accent">
          {firstTag || "Crafts"}
        </Badge>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-neutral-900 mb-2">{eventMeta?.title || "Event"}</h1>
          <div className="flex flex-wrap gap-4 text-neutral-600">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{eventMeta?.startAt ? new Date(eventMeta.startAt).toLocaleDateString() : "Coming dates"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>{eventMeta?.cityId || "City"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={18} />
              <span>Expected attendees</span>
            </div>
            {typeof eventMeta?.ratingAvg === "number" && (eventMeta.ratingCount || 0) > 0 && (
              <div className="flex items-center gap-1">
                <Star size={18} className="text-warning fill-warning" />
                <span className="text-neutral-800 text-sm">
                  {eventMeta.ratingAvg}{" "}
                  <span className="text-neutral-500">
                    ({eventMeta.ratingCount} review{eventMeta.ratingCount === 1 ? "" : "s"})
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Organizer */}
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white">EV</div>
          <div className="flex-1">
            <p className="text-neutral-900">Organized by</p>
            <p className="text-neutral-600 text-sm">Organizer</p>
          </div>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm">Contact</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contact Organizer</DialogTitle>
                <DialogDescription>Send a message to the organizer</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea placeholder="Type your message here..." rows={6} />
                <Button className="w-full" onClick={() => toast.success("Message sent to organizer!")}>Send Message</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="stalls" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="stalls">Stalls</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>

          <TabsContent value="stalls" className="space-y-4 mt-6">
            <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-xl border border-accent/20">
              <Info size={18} className="text-accent shrink-0" />
              <p className="text-neutral-700 text-sm">Select your stall tier and book your spot. Limited availability!</p>
            </div>

            {loading ? (
              <Card className="p-6">Loading stalls…</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tierCards.map((tier) => (
                  <Card key={tier.id} className={`p-6 relative ${tier.popular ? "border-2 border-primary" : ""}`}>
                    {tier.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>
                    )}
                    <h4 className="text-neutral-900 mb-2">{tier.name}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                      <IndianRupee size={20} className="text-primary" />
                      <span className="text-primary">{tier.price.toLocaleString()}</span>
                    </div>
                    <p className="text-neutral-600 text-sm mb-4">{tier.size}</p>
                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature: string) => (
                        <li key={feature} className="flex items-center gap-2 text-neutral-700 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">Available</span>
                        <span className="text-neutral-900">
                          {typeof tier.total === "number" && tier.total > 0 ? `${tier.available}/${tier.total}` : `${tier.available}`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: typeof tier.total === "number" && tier.total > 0 ? `${Math.max(2, (tier.available / tier.total) * 100)}%` : "100%" }}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => onSelectTier(tier)}
                      disabled={tier.total > 0 && tier.available <= 0}
                    >
                      {tier.total > 0 && tier.available <= 0 ? "Sold Out" : "Select Tier"}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div>
              <h4 className="text-neutral-900 mb-3">About the Event</h4>
              <p className="text-neutral-700">
                {eventMeta?.description && eventMeta.description.trim().length > 0
                  ? eventMeta.description
                  : "Join local creators and showcase your products. Book a stall that suits your needs and budget."}
              </p>
            </div>

            <div>
              <h4 className="text-neutral-900 mb-3">Event Schedule</h4>
              <div className="space-y-3">
                {[
                  { day: "Day 1", time: "10:00 AM - 8:00 PM", activity: "Setup & Opening" },
                  { day: "Day 2", time: "10:00 AM - 9:00 PM", activity: "Full Day Event" },
                  { day: "Day 3", time: "10:00 AM - 6:00 PM", activity: "Final Day & Closing" },
                ].map((s) => (
                  <Card key={s.day} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-neutral-900"><Clock size={18} /><span>{s.day}</span></div>
                      <div className="flex-1 text-neutral-600 text-sm">{s.time}</div>
                      <span className="text-neutral-700 text-sm">{s.activity}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faqs" className="mt-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                <AccordionContent>We accept UPI, cards and net banking. Payments are processed via LocalPush.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What is the cancellation policy?</AccordionTrigger>
                <AccordionContent>Full refund if cancelled 14+ days before the event. 50% refund for 7-14 days. No refund within 7 days of the event.</AccordionContent>
              </AccordionItem>
            </Accordion>

            <Card className="mt-6 p-4 bg-primary/5 border-primary/20">
              <div className="flex gap-3">
                <Shield size={20} className="text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-neutral-900 mb-1">Safe Payment Guarantee</p>
                  <p className="text-neutral-600 text-sm">Pay only within LocalPush. Off-platform payments are risky and not covered by our protection.</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
