import {
  useEffect,
  useRef,
  useState,
  ChangeEvent,
} from "react";
import {
  MapPin,
  CalendarDays,
  IndianRupee,
  CheckCircle,
  Upload,
  Plus,
  X,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";

/* ---------- helpers ---------- */
function getToken(): string | null {
  try {
    return (
      localStorage.getItem("jwt") || localStorage.getItem("sharthi_token")
    );
  } catch {
    return null;
  }
}

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();

  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(data?.error || data?.message || res.statusText);
  }

  return data as T;
}

/* ---------- types ---------- */
type OrganizerProfileData = {
  id: string;
  brandName: string;
  gst: string;
  contactPerson: string;
  phone: string;
  about: string;
  policies: string;
  gstDoc?: string;
  idDoc?: string;
  stats: {
    eventsHosted: number;
    stallsManaged: number;
    rating: number;
    profileComplete: number;
  };
};

type Venue = {
  id: string;
  name: string;
  city: string;
  description: string;
  tier: string;
};

export function OrganizerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // header fields
  const [brandName, setBrandName] = useState("");
  const [gst, setGst] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");

  const [about, setAbout] = useState("");
  const [policies, setPolicies] = useState("");

  // stats
  const [stats, setStats] = useState({
    eventsHosted: 0,
    totalStalls: "0",
    avgRating: 0,
    profileComplete: 0,
  });

  // avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // venues
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueTier, setVenueTier] = useState("Other");

  // docs
  const [gstDocName, setGstDocName] = useState("Not uploaded");
  const [idDocName, setIdDocName] = useState("Not uploaded");

  const gstInputRef = useRef<HTMLInputElement | null>(null);
  const idInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- LOAD INITIAL DATA ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // GET organizer profile
        const data = await api<OrganizerProfileData>("/organizer/me");

        setBrandName(data.brandName);
        setGst(data.gst);
        setContactPerson(data.contactPerson);
        setPhone(data.phone);
        setAbout(data.about);
        setPolicies(data.policies);

        if (data.gstDoc) setGstDocName(data.gstDoc.split("/").pop() || "GST Doc");
        if (data.idDoc) setIdDocName(data.idDoc.split("/").pop() || "ID Doc");

        setStats({
          eventsHosted: data.stats.eventsHosted,
          totalStalls: `${data.stats.stallsManaged}`,
          avgRating: data.stats.rating,
          profileComplete: data.stats.profileComplete,
        });

        // Load venues
        const venueList = await api<Venue[]>("/organizer/venues");
        setVenues(venueList);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  /* ---------- SAVE PROFILE ---------- */
  const onSaveProfile = async () => {
    try {
      setSaving(true);

      const payload = {
        brandName,
        gst,
        contactPerson,
        phone,
        about,
        policies,
      };

      await api("/organizer/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- avatar upload (local only UI) ---------- */
  const onAvatarClick = () => avatarInputRef.current?.click();
  const onAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAvatarUrl(url);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        localStorage.setItem("organizer_avatar_url", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ---------- VENUES (FULLY BACKEND CONNECTED) ---------- */
  const onAddVenue = async () => {
    if (!venueName.trim() || !venueCity.trim()) {
      toast.error("Venue name & city required");
      return;
    }

    try {
      const newVenue = {
        name: venueName,
        city: venueCity,
        description: venueDesc || "",
        tier: venueTier,
      };

      await api("/organizer/venues", {
        method: "POST",
        body: JSON.stringify(newVenue),
      });

      toast.success("Venue added");

      // reload venues
      const list = await api<Venue[]>("/organizer/venues");
      setVenues(list);

      // reset form
      setVenueName("");
      setVenueCity("");
      setVenueDesc("");
      setVenueTier("Other");
      setShowVenueForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add venue");
    }
  };

  const onRemoveVenue = async (id: string) => {
    try {
      await api(`/organizer/venues/${id}`, { method: "DELETE" });
      toast.success("Venue deleted");

      // reload venues
      const list = await api<Venue[]>("/organizer/venues");
      setVenues(list);
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  /* ---------- KYC DOCUMENT UPLOAD (FULLY BACKEND CONNECTED) ---------- */
  const uploadDoc = async (file: File, kind: "gst" | "id") => {
    try {
      const form = new FormData();
      if (kind === "gst") form.append("gstDoc", file);
      if (kind === "id") form.append("idDoc", file);

      const token = getToken();
      const res = await fetch(`${API}/organizer/kyc/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Upload failed");

      toast.success("Document uploaded");

      if (data.files?.gstDoc) setGstDocName(data.files.gstDoc.split("/").pop());
      if (data.files?.idDoc) setIdDocName(data.files.idDoc.split("/").pop());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const onDocPick =
    (kind: "gst" | "id") => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (kind === "gst") setGstDocName(file.name);
      else setIdDocName(file.name);

      await uploadDoc(file, kind);
    };
  /* ---------- RENDER ---------- */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
              <ImageWithFallback
                src={
                  avatarUrl ||
                  "https://api.dicebear.com/7.x/identicon/svg?seed=Organizer"
                }
                alt="Organizer Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              size="sm"
              className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0"
              onClick={onAvatarClick}
            >
              <Upload size={16} />
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>

          {/* Basic Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-neutral-900">
                    {brandName || "Your Brand"}
                  </h2>
                  <Badge className="bg-accent">
                    <CheckCircle size={12} className="mr-1" />
                    Verified Organizer
                  </Badge>
                </div>
                <p className="text-neutral-600">
                  Specialised in flea markets, handmade & lifestyle events.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-neutral-600 mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Based in India</span>
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                <span>Next event soon</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-primary mb-1">{stats.eventsHosted}</div>
          <p className="text-neutral-600 text-sm">Events Hosted</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-secondary mb-1">{stats.totalStalls}</div>
          <p className="text-neutral-600 text-sm">Stalls Managed</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-secondary mb-1">{stats.avgRating}</div>
          <p className="text-neutral-600 text-sm">Organizer Rating</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-accent mb-1">{stats.profileComplete}%</div>
          <p className="text-neutral-600 text-sm">Profile Complete</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="about">Organizer Profile</TabsTrigger>
          <TabsTrigger value="venues">Preferred Venues</TabsTrigger>
          <TabsTrigger value="docs">KYC & Documents</TabsTrigger>
        </TabsList>

        {/* ABOUT TAB */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-neutral-900 mb-4">Basic Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="org-name">Brand / Company Name</Label>
                <Input
                  id="org-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="gst">GSTIN (optional)</Label>
                <Input
                  id="gst"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                />
              </div>

              <div>
                <Label>Contact Person</Label>
                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>About your events</Label>
                <Textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                />
              </div>

              <div>
                <Label>Stall Policies</Label>
                <Textarea
                  rows={4}
                  value={policies}
                  onChange={(e) => setPolicies(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="gap-2" onClick={onSaveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* VENUES TAB */}
        <TabsContent value="venues" className="mt-6">
          <Card className="p-6 space-y-4">

            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-neutral-900 mb-1">Preferred Venues</h3>
                <p className="text-neutral-600 text-sm">
                  Save your frequently used venues.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowVenueForm(!showVenueForm)}
              >
                <Plus size={16} />
                {showVenueForm ? "Cancel" : "Add Venue"}
              </Button>
            </div>

            {/* ADD VENUE FORM */}
            {showVenueForm && (
              <Card className="p-4 border-dashed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>City</Label>
                    <Input
                      value={venueCity}
                      onChange={(e) => setVenueCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Description (optional)</Label>
                    <Input
                      value={venueDesc}
                      onChange={(e) => setVenueDesc(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Tier</Label>
                    <select
                      className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                      value={venueTier}
                      onChange={(e) => setVenueTier(e.target.value)}
                    >
                      <option>Tier A</option>
                      <option>Tier B</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowVenueForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={onAddVenue}>Save Venue</Button>
                </div>
              </Card>
            )}

            {/* VENUE LIST */}
            <div className="space-y-3">
              {venues.map((v) => (
                <Card
                  key={v.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{v.name}</p>
                    <p className="text-sm text-neutral-600">
                      {v.city} • {v.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {v.tier}
                    </Badge>

                    <button
                      className="text-xs text-neutral-400 hover:text-red-500 flex items-center gap-1"
                      onClick={() => onRemoveVenue(v.id)}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </Card>
              ))}
            </div>

          </Card>
        </TabsContent>

        {/* DOCS TAB */}
        <TabsContent value="docs" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-neutral-900 mb-4">KYC & Documents</h3>

            {/* GST DOC */}
            <div>
              <Label className="mb-1">GST Certificate</Label>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50">
                <span className="text-sm text-neutral-700">{gstDocName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gstInputRef.current?.click()}
                >
                  <Upload size={14} /> Replace
                </Button>
                <input
                  ref={gstInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={onDocPick("gst")}
                />
              </div>
            </div>

            {/* ID DOC */}
            <div>
              <Label className="mb-1">Government ID</Label>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-neutral-50">
                <span className="text-sm text-neutral-700">{idDocName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => idInputRef.current?.click()}
                >
                  <Upload size={14} /> Replace
                </Button>
                <input
                  ref={idInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={onDocPick("id")}
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
