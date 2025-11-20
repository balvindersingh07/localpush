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
  categoryTagsCsv?: string | null;
};

type StallApi = {
  id: string;
  name?: string | null;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
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
  stallsAvailable: number;   // sum of qtyLeft across stalls
  priceFrom: number;         // min stall price
  attendees: number;         // placeholder (backend doesn’t provide yet)
};

const API = import.meta.env.VITE_API_URL || 'https://sharthi-api.onrender.com';

const categories = ['All', 'Crafts', 'Beauty', 'Art', 'Home Decor', 'Food', 'Fashion'];

const indianCities = [
  'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
  'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
  'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore',
  'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai',
  'Raipur', 'Kota', 'Chandigarh', 'Guwahati', 'Solapur'
];

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (!e) return s.toLocaleDateString();
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString();
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth
    ? `${s.toLocaleString(undefined, { month: 'short' })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
    : `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

function guessCategory(csv?: string | null): string {
  const tag = (csv || '').split(',').map(t => t.trim()).filter(Boolean)[0] || '';
  if (/craft/i.test(tag)) return 'Crafts';
  if (/beauty/i.test(tag) || /makeup/i.test(tag)) return 'Beauty';
  if (/art/i.test(tag) || /paint/i.test(tag)) return 'Art';
  if (/decor/i.test(tag) || /candle/i.test(tag)) return 'Home Decor';
  if (/food/i.test(tag)) return 'Food';
  if (/fashion/i.test(tag)) return 'Fashion';
  return tag || 'General';
}

function placeholderImage(title: string) {
  const q = encodeURIComponent(title || 'event');
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&query=${q}`;
}

export function Home({ onNavigateToEvent }: HomeProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showCityDialog, setShowCityDialog] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<CardEvent[]>([]);

  // fetch events whenever city/category changes
  useEffect(() => {
    let cancel = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCity) params.set('city', selectedCity);
        if (selectedCategory !== 'All') params.set('tags', selectedCategory);
        const events: EventApi[] = await fetch(`${API}/events?${params.toString()}`).then(r => r.json());

        // hydrate stalls info (priceFrom + stallsAvailable)
        const withStalls = await Promise.all(events.map(async (ev) => {
          try {
            const stalls: StallApi[] = await fetch(`${API}/events/${ev.id}/stalls`).then(r => r.json());
            const priceFrom = stalls.length ? Math.min(...stalls.map(s => Number(s.price || 0))) : 0;
            const stallsAvailable = stalls.reduce((sum, s) => sum + (Number(s.qtyLeft || 0)), 0);
            return { ev, priceFrom, stallsAvailable };
          } catch {
            return { ev, priceFrom: 0, stallsAvailable: 0 };
          }
        }));

        const mapped: CardEvent[] = withStalls.map(({ ev, priceFrom, stallsAvailable }) => ({
          id: ev.id,
          title: ev.title,
          image: placeholderImage(ev.title),
          date: fmtDateRange(ev.startAt || undefined, ev.endAt || undefined),
          location: ev.cityId || selectedCity || '—',
          category: guessCategory(ev.categoryTagsCsv),
          stallsAvailable,
          priceFrom,
          attendees: 0, // not provided by API (UI expects a number)
        }));

        if (!cancel) setCards(mapped);
      } catch {
        if (!cancel) {
          setCards([]); // keep UI consistent
          toast.error('Failed to load events.');
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => { cancel = true; };
  }, [selectedCity, selectedCategory]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'All') return cards;
    return cards.filter(e => e.category === selectedCategory);
  }, [cards, selectedCategory]);

  const displayedEvents = useMemo(
    () => (showAllEvents ? filteredEvents : filteredEvents.slice(0, 4)),
    [filteredEvents, showAllEvents]
  );

  const filteredCities = indianCities.filter(city =>
    city.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setShowCityDialog(false);
    setCitySearchQuery('');
    toast.success(`Location changed to ${city}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Section */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-secondary p-8 text-white">
        <h2 className="text-white mb-2">Discover Local Events</h2>
        <p className="text-white/90 mb-6">Find exhibitions and book your stall today</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <MapPin size={18} />
            <span>{selectedCity}</span>
          </div>
          <Dialog open={showCityDialog} onOpenChange={setShowCityDialog}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="bg-secondary hover:bg-secondary/90">
                Change City
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Your City</DialogTitle>
                <DialogDescription>
                  Search and choose your city to find events near you
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <Input
                    placeholder="Search city name..."
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>

                {/* City List */}
                <ScrollArea className="h-[300px] rounded-lg border border-neutral-200 p-2">
                  <div className="space-y-1">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-primary/10 flex items-center justify-between ${
                            selectedCity === city ? 'bg-primary text-white hover:bg-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin size={18} />
                            <span>{city}</span>
                          </div>
                          {selectedCity === city && (
                            <Badge variant="secondary" className="bg:white/20">Current</Badge>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-neutral-500">
                        <p>No cities found</p>
                        <p className="text-sm mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {citySearchQuery && (
                  <p className="text-sm text-neutral-500">
                    Showing {filteredCities.length} of {indianCities.length} cities
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-primary mb-1">120+</div>
          <p className="text-neutral-600 text-sm">Active Events</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-secondary mb-1">850+</div>
          <p className="text-neutral-600 text-sm">Creators</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-accent mb-1">2.5K+</div>
          <p className="text-neutral-600 text-sm">Bookings</p>
        </Card>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={cat === selectedCategory ? 'default' : 'outline'}
            size="sm"
            className="rounded-full whitespace-nowrap"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Events Near You */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neutral-900">Events Near You</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllEvents(!showAllEvents)}
            disabled={loading}
          >
            {showAllEvents ? 'Show Less' : 'See All'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((event) => (
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
                    <span>{event.attendees.toLocaleString()} expected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-1">
                    <IndianRupee size={16} className="text-primary" />
                    <span className="text-primary">From ₹{event.priceFrom.toLocaleString()}</span>
                  </div>
                  <Button size="sm">View Details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!loading && displayedEvents.length === 0 && (
          <Card className="p-12 mt-4">
            <div className="text-center text-neutral-600">
              No events found for <span className="text-neutral-900">{selectedCity}</span>
              {selectedCategory !== 'All' && <> in <span className="text-neutral-900">{selectedCategory}</span></>}
            </div>
          </Card>
        )}
      </div>

      {/* Trending Section */}
      <Card className="p-6 bg-gradient-to-r from-accent/10 to-secondary/10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent rounded-xl">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-neutral-900 mb-2">🔥 Trending This Week</h4>
            <p className="text-neutral-600 mb-4">Beauty & Makeup events are seeing 3x more bookings in your area!</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory('Beauty')}
            >
              Explore Beauty Events
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
