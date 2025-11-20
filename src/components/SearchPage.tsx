import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./ui/sheet";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";

interface SearchPageProps {
  onNavigateToEvent: (eventId: string) => void;
}

type EventApi = {
  id: string;
  title: string;
  cityId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  categoryTagsCsv?: string | null;
};

type StallApi = {
  id: string;
  name?: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD";
  price: number;
  qtyLeft: number;
  qtyTotal: number;
};

type CardEvent = {
  id: string;
  title: string;
  image: string;
  date: string;
  location: string;
  category: string;
  stallsAvailable: number;
  priceFrom: number;
  attendees: number;
};

type CreatorApi = {
  id: string;
  name?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  cityId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  tags?: string[] | null;
};

type UICreator = {
  id: string;
  name: string;
  image: string;
  skill: string;
  location: string;
  priceRange: string;
  rating: number;
  bookings: number;
  verified: boolean;
};

const API =
  import.meta.env.VITE_API_URL || "https://sharthi-api.onrender.com";

const cityLabelMap: Record<string, string> = {
  all: "All Cities",
  delhi: "Delhi",
  mumbai: "Mumbai",
  bangalore: "Bangalore",
  ludhiana: "Ludhiana",
};

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (!e) return s.toLocaleDateString();
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString();
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth
    ? `${s.toLocaleString(undefined, {
        month: "short",
      })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
    : `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

function guessCategory(csv?: string | null): string {
  const tag =
    (csv || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)[0] || "";
  if (/craft/i.test(tag)) return "Crafts";
  if (/beauty/i.test(tag) || /makeup/i.test(tag)) return "Beauty";
  if (/art/i.test(tag) || /paint/i.test(tag)) return "Art";
  if (/decor/i.test(tag) || /candle/i.test(tag)) return "Home Decor";
  if (/food/i.test(tag)) return "Food";
  if (/fashion/i.test(tag)) return "Fashion";
  return tag || "General";
}

function placeholderImage(title: string) {
  const q = encodeURIComponent(title || "event");
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&query=${q}`;
}

export function SearchPage({ onNavigateToEvent }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
  const [selectedCity, setSelectedCity] = useState<
    "all" | "delhi" | "mumbai" | "bangalore" | "ludhiana"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "crafts" | "beauty" | "art" | "food"
  >("all");

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [creators, setCreators] = useState<UICreator[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Load events + creators when filters change
  useEffect(() => {
    let cancel = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function load() {
      setLoading(true);
      try {
        // --- Events ---
        const evParams = new URLSearchParams();
        const cityHuman =
          selectedCity === "all" ? "" : cityLabelMap[selectedCity];
        if (cityHuman) evParams.set("city", cityHuman);
        if (selectedCategory !== "all") evParams.set("tags", selectedCategory);

        const evRes = await fetch(
          `${API}/events?${evParams.toString()}`,
          { signal: controller.signal }
        );
        const evList: EventApi[] = evRes.ok ? await evRes.json() : [];

        // hydrate stalls info (priceFrom + stallsAvailable)
        const withStalls = await Promise.all(
          evList.map(async (ev) => {
            try {
              const sr = await fetch(`${API}/events/${ev.id}/stalls`, {
                signal: controller.signal,
              });
              const stalls: StallApi[] = sr.ok ? await sr.json() : [];
              const priceFrom = stalls.length
                ? Math.min(...stalls.map((s) => Number(s.price || 0)))
                : 0;
              const stallsAvailable = stalls.reduce(
                (sum, s) => sum + Number(s.qtyLeft || 0),
                0
              );
              return { ev, priceFrom, stallsAvailable };
            } catch {
              return { ev, priceFrom: 0, stallsAvailable: 0 };
            }
          })
        );

        const evCards: CardEvent[] = withStalls.map(
          ({ ev, priceFrom, stallsAvailable }) => ({
            id: ev.id,
            title: ev.title,
            image: placeholderImage(ev.title),
            date: fmtDateRange(ev.startAt || undefined, ev.endAt || undefined),
            location:
              ev.cityId || (selectedCity === "all" ? "—" : cityHuman) || "—",
            category: guessCategory(ev.categoryTagsCsv),
            stallsAvailable,
            priceFrom,
            attendees: 0,
          })
        );

        // --- Creators ---
        let crRaw: CreatorApi[] = [];
        try {
          // Prefer search endpoint (supports min/max)
          const sp = new URLSearchParams();
          if (cityHuman) sp.set("city", cityHuman);
          if (selectedCategory !== "all") sp.set("tags", selectedCategory);
          // Push price range to backend too
          if (priceRange[0] > 0) sp.set("min", String(priceRange[0]));
          if (priceRange[1] < 15000) sp.set("max", String(priceRange[1]));

          let res = await fetch(
            `${API}/creators/search?${sp.toString()}`,
            { signal: controller.signal }
          );
          if (!res.ok) {
            // fallback plain list
            res = await fetch(`${API}/creators`, {
              signal: controller.signal,
            });
          }
          crRaw = res.ok ? await res.json() : [];
        } catch {
          crRaw = [];
        }

        const crCards: UICreator[] = (Array.isArray(crRaw) ? crRaw : []).map(
          (c): UICreator => {
            const name = c.user?.name || c.name || "Creator";
            const loc =
              c.cityId || (selectedCity === "all" ? "—" : cityHuman) || "—";
            const min = Number(c.minPrice ?? 0);
            const max = Number(c.maxPrice ?? 0) || Math.max(min, 0);
            const tags = (c.tags || []).join(", ");
            return {
              id: String((c as any).id || Math.random().toString(36).slice(2)),
              name,
              image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                name
              )}`,
              skill: tags || "Creator",
              location: loc,
              priceRange:
                min || max
                  ? `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`
                  : "₹—",
              rating: 4.8, // placeholder
              bookings: 12, // placeholder
              verified: true, // placeholder
            };
          }
        );

        if (!cancel) {
          setEvents(evCards);
          setCreators(crCards);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError" && !cancel)
          toast.error("Failed to load search results.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => {
      cancel = true;
      controller.abort();
    };
  }, [selectedCity, selectedCategory, priceRange]);

  // Derived filters (client-side search)
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      const matchesQ =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q);
      const matchesPrice =
        e.priceFrom >= priceRange[0] && e.priceFrom <= priceRange[1];
      return matchesQ && matchesPrice;
    });
  }, [events, searchQuery, priceRange]);

  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return creators.filter((c) => {
      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.skill.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [creators, searchQuery]);

  const eventsCount = filteredEvents.length;
  const creatorsCount = filteredCreators.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Search Header */}
      <Card className="p-6">
        <h2 className="text-neutral-900 mb-4">Search</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={20}
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events or creators..."
              className="pl-10"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={loading}>
                <SlidersHorizontal size={18} />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <Label className="mb-3">City</Label>
                  <Select
                    value={selectedCity}
                    onValueChange={(v: string) =>
                      setSelectedCity(v as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      <SelectItem value="delhi">Delhi</SelectItem>
                      <SelectItem value="mumbai">Mumbai</SelectItem>
                      <SelectItem value="bangalore">Bangalore</SelectItem>
                      <SelectItem value="ludhiana">Ludhiana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-3">Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v: string) =>
                      setSelectedCategory(v as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="crafts">Crafts</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Price Range</Label>
                    <span className="text-sm text-neutral-600">
                      ₹{priceRange[0].toLocaleString()} - ₹
                      {priceRange[1].toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={(v: number[]) =>
                      setPriceRange(v as [number, number])
                    }
                    max={15000}
                    step={500}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <SheetClose asChild>
                    <Button className="flex-1">Apply Filters</Button>
                  </SheetClose>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPriceRange([0, 15000]);
                      setSelectedCity("all");
                      setSelectedCategory("all");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filters */}
        {(selectedCity !== "all" || selectedCategory !== "all") && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-neutral-600">Active filters:</span>
            {selectedCity !== "all" && (
              <Badge variant="outline" className="gap-1">
                {cityLabelMap[selectedCity]}
                <button
                  onClick={() => setSelectedCity("all")}
                  aria-label="clear city"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="outline" className="gap-1">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  aria-label="clear category"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Results Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Events ({eventsCount})</TabsTrigger>
          <TabsTrigger value="creators">
            Creators ({creatorsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onNavigateToEvent(event.id)}
              >
                <div className="relative h-48">
                  <ImageWithFallback
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-white text-neutral-900">
                    {event.category}
                  </Badge>
                  {event.stallsAvailable < 10 && (
                    <Badge className="absolute top-3 left-3 bg-accent">
                      {event.stallsAvailable} left
                    </Badge>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <h4 className="text-neutral-900">{event.title}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-neutral-600 text-sm">
                      <Calendar size={16} />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 text-sm">
                      <MapPin size={16} />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 text-sm">
                      <Users size={16} />
                      <span>
                        {event.attendees.toLocaleString()} expected
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <div className="flex items-center gap-1">
                      <IndianRupee
                        size={16}
                        className="text-primary"
                      />
                      <span className="text-primary">
                        From ₹{event.priceFrom.toLocaleString()}
                      </span>
                    </div>
                    <Button size="sm">View Details</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!loading && filteredEvents.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-neutral-600">
                No events found with current filters.
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="creators" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCreators.map((creator) => (
              <Card key={creator.id} className="p-6">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden shrink-0">
                    <ImageWithFallback
                      src={creator.image}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-neutral-900 mb-1">
                          {creator.name}
                        </h4>
                        <p className="text-neutral-600 text-sm">
                          {creator.skill}
                        </p>
                      </div>
                      {creator.verified && (
                        <Badge className="bg-accent">Verified</Badge>
                      )}
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-neutral-600 text-sm">
                        <MapPin size={14} />
                        <span>{creator.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600 text-sm">
                        <IndianRupee size={14} />
                        <span>{creator.priceRange}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                      <div className="text-sm">
                        <span className="text-neutral-900">
                          ⭐ {creator.rating}
                        </span>
                        <span className="text-neutral-600">
                          {" "}
                          • {creator.bookings} bookings
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toast.info("Opening creator profile...")
                        }
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!loading && filteredCreators.length === 0 && (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
                  <Search className="text-neutral-400" size={32} />
                </div>
                <h4 className="text-neutral-900">No creators found</h4>
                <p className="text-neutral-600">
                  Try adjusting your filters or search query
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
