import { useEffect, useMemo, useState } from 'react';
import { MapPin, Calendar, IndianRupee, Users, TrendingUp, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

interface HomeProps {
  onNavigateToEvent: (eventId: string) => void;
}

type EventApi = {
  id: string;
  title: string;
  cityId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  tags?: string[];
};

type StallApi = {
  id: string;
  name?: string | null;
  tier: string;
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

const API = import.meta.env.VITE_API_URL || 'https://sharthi-api.onrender.com';

const categories = ['All', 'Crafts', 'Beauty', 'Art', 'Home Decor', 'Food', 'Fashion'];

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (!e) return s.toLocaleDateString();
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString();
  return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
}

function guessCategory(tags?: string[] | null): string {
  if (!tags || !tags.length) return 'General';
  const tag = tags[0].toLowerCase();

  if (tag.includes('craft')) return 'Crafts';
  if (tag.includes('beauty') || tag.includes('makeup')) return 'Beauty';
  if (tag.includes('art')) return 'Art';
  if (tag.includes('decor') || tag.includes('candle')) return 'Home Decor';
  if (tag.includes('food')) return 'Food';
  if (tag.includes('fashion')) return 'Fashion';
  return 'General';
}

function placeholderImage(title: string) {
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop`;
}

export function Home({ onNavigateToEvent }: HomeProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<CardEvent[]>([]);

  useEffect(() => {
    let cancel = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCity) params.set('city', selectedCity);
        if (selectedCategory !== 'All') params.set('tags', selectedCategory);

        const events: EventApi[] = await fetch(`${API}/events?${params.toString()}`)
          .then(r => r.json());

        const withStalls = await Promise.all(
          events.map(async (ev) => {
            try {
              const stallRes = await fetch(`${API}/events/${ev.id}/stalls`).then(r => r.json());

              // 🔥 BACKEND RETURNS: { stalls: [...] }
              const stalls: StallApi[] = stallRes.stalls || [];

              const priceFrom = stalls.length
                ? Math.min(...stalls.map(s => Number(s.price || 0)))
                : 0;

              const stallsAvailable = stalls.reduce(
                (sum, s) => sum + (Number(s.qtyLeft || 0)),
                0
              );

              return { ev, priceFrom, stallsAvailable };
            } catch {
              return { ev, priceFrom: 0, stallsAvailable: 0 };
            }
          })
        );

        const mapped: CardEvent[] = withStalls.map(({ ev, priceFrom, stallsAvailable }) => ({
          id: ev.id,
          title: ev.title,
          image: placeholderImage(ev.title),
          date: fmtDateRange(ev.startAt, ev.endAt),
          location: ev.cityId || selectedCity || '—',
          category: guessCategory(ev.tags),
          stallsAvailable,
          priceFrom,
          attendees: 0,
        }));

        if (!cancel) setCards(mapped);
      } catch {
        toast.error('Failed to load events.');
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => { cancel = true };
  }, [selectedCity, selectedCategory]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'All') return cards;
    return cards.filter(e => e.category === selectedCategory);
  }, [cards, selectedCategory]);

  const displayedEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary p-8 text-white">
        <h2 className="mb-2">Discover Local Events</h2>
        <p className="mb-6">Find exhibitions and book your stall today</p>
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3>Events Near You</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAllEvents(!showAllEvents)}>
            {showAllEvents ? 'Show Less' : 'See All'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((event) => (
            <Card key={event.id} onClick={() => onNavigateToEvent(event.id)}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative h-48">
                <ImageWithFallback src={event.image} alt={event.title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 right-3 bg-white text-neutral-900">
                  {event.category}
                </Badge>

                {event.stallsAvailable === 0 ? (
                  <Badge className="absolute top-3 left-3 bg-red-500">
                    Sold Out
                  </Badge>
                ) : (
                  <Badge className="absolute top-3 left-3 bg-accent">
                    {event.stallsAvailable} left
                  </Badge>
                )}
              </div>

              <div className="p-4 space-y-3">
                <h4>{event.title}</h4>

                <div className="space-y-2 text-neutral-600 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <IndianRupee size={16} className="text-primary" />
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
      </div>

      <Card className="p-6 bg-gradient-to-r from-accent/10 to-secondary/10">
        <h4 className="text-neutral-900 mb-2">🔥 Trending This Week</h4>
        <p className="text-neutral-600 mb-4">Beauty & Makeup events are booming!</p>
        <Button variant="outline" size="sm" onClick={() => setSelectedCategory('Beauty')}>
          Explore Beauty Events
        </Button>
      </Card>
    </div>
  );
}
