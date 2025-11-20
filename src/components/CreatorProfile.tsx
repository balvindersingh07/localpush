/** 
 * CREATOR PROFILE PAGE – FINAL, BACKEND COMPATIBLE
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Upload,
  Plus,
  X,
  Trash,
  CheckCircle,
  AlertCircle,
  Clock4,
} from "lucide-react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* GET TOKEN */
function getToken() {
  return (
    localStorage.getItem("jwt") ||
    localStorage.getItem("sharthi_token")
  );
}

/* API WRAPPER */
async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = "Error";
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

/* =======================================================
   COMPONENT
======================================================= */
export function CreatorProfile() {
  const [loading, setLoading] = useState(true);
  const [authMissing, setAuthMissing] = useState(false);

  const [profile, setProfile] = useState<any | null>(null);

  // fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [minPrice, setMinPrice] = useState<string | number>("");
  const [maxPrice, setMaxPrice] = useState<string | number>("");

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [kyc, setKyc] = useState<any | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  /* =======================================================
      LOAD PROFILE DATA
  ======================================================= */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthMissing(true);
      return;
    }

    (async () => {
      try {
        setLoading(true);

        const me = await api("/creator/me");

        setProfile(me);

        setName(me.fullName || "");
        setBio(me.bio || "");
        setPhone(me.phone || "");
        setCity(me.cityId || "");
        setSkills(me.tags || []);
        setMinPrice(me.minPrice ?? "");
        setMaxPrice(me.maxPrice ?? "");

        if (me.avatar) {
          setAvatarUrl(`${API}/uploads/${me.avatar}`);
        }

        const pf = await api("/creator/portfolio");
        setPortfolio(pf);

        const bk = await api("/bookings/my");
        setBookings(bk);

        const k = await api("/creator/kyc");
        setKyc(k);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* =======================================================
      SAVE PROFILE 
  ======================================================= */
  const saveProfile = async () => {
    try {
      await api("/creator/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: name,
          phone,
          bio,
          cityId: city,
          minPrice: Number(minPrice || 0),
          maxPrice: Number(maxPrice || 0),
          tags: skills,
        }),
      });

      toast.success("Profile updated!");

      // optional refresh
      const me = await api("/creator/me");
      setProfile(me);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* =======================================================
      AVATAR UPLOAD
  ======================================================= */
  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api("/creator/avatar", {
        method: "POST",
        body: form,
      });

      setAvatarUrl(`${API}/uploads/${res.url}`);
      toast.success("Avatar updated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* =======================================================
      PORTFOLIO UPLOAD
  ======================================================= */
  const onPortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("files", file);

    try {
      const res = await api("/creator/portfolio", {
        method: "POST",
        body: form,
      });

      // backend returns { images: [url], ids: [id] }
      setPortfolio((p) => [
        ...p,
        { id: res.ids[0], url: res.images[0], title: file.name },
      ]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deletePortfolioItem = async (id: string) => {
    try {
      await api(`/creator/portfolio/${id}`, { method: "DELETE" });
      setPortfolio((p) => p.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* =======================================================
      SUBMIT KYC (JSON)
  ======================================================= */
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const submitKyc = async () => {
    try {
      await api("/creator/kyc/submit", {
        method: "POST",
        body: JSON.stringify({
          aadhaar,
          pan,
          bankName,
          accountNumber,
          ifsc,
        }),
      });

      toast.success("KYC submitted!");
      setKycModalOpen(false);

      const refreshed = await api("/creator/kyc");
      setKyc(refreshed);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* =======================================================
      PROFILE COMPLETION
  ======================================================= */
  const profileComplete = useMemo(() => {
    let done = 0;
    if (name) done++;
    if (phone) done++;
    if (bio) done++;
    if (city) done++;
    if (minPrice) done++;
    if (maxPrice) done++;
    if (skills.length) done++;
    return Math.round((done / 7) * 100);
  }, [name, phone, bio, city, minPrice, maxPrice, skills]);

  /* =======================================================
      RENDER
  ======================================================= */
  if (authMissing)
    return <div className="p-6 text-center">Login required</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* TOP CARD */}
      <Card className="p-6">
        <div className="flex gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden">
              <ImageWithFallback
                src={
                  avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
                }
                className="object-cover w-full h-full"
              />
            </div>

            <Button
              size="sm"
              className="absolute bottom-0 right-0 rounded-full"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera size={16} />
            </Button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold">{name}</h2>
            {bio && (
              <p className="text-sm text-neutral-500 mt-1 max-w-md line-clamp-2">
                {bio}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              {kyc?.status === "approved" && (
                <Badge className="bg-green-500 text-white">Verified</Badge>
              )}
              {kyc?.status === "pending" && (
                <Badge className="bg-yellow-500 text-white">Pending</Badge>
              )}
              {kyc?.status === "rejected" && (
                <Badge className="bg-red-500 text-white">Rejected</Badge>
              )}
            </div>

            <p className="mt-2 text-sm text-neutral-600">{city}</p>
          </div>
        </div>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-lg font-semibold">{bookings.length}</div>
          <p>Events Booked</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-lg font-semibold">4.8</div>
          <p>Avg Rating</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-lg font-semibold">{profileComplete}%</div>
          <p>Profile Complete</p>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between">
              <h3 className="font-semibold">Edit Profile</h3>
              <Button onClick={saveProfile}>Save Changes</Button>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            {/* Skills */}
            <div className="mt-4">
              <Label>Skills</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {skills.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="flex gap-1 items-center"
                  >
                    {s}
                    <X
                      size={12}
                      onClick={() =>
                        setSkills(skills.filter((x) => x !== s))
                      }
                      className="cursor-pointer"
                    />
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add skill"
                />
                <Button
                  onClick={() => {
                    if (newSkill.trim()) {
                      setSkills([...skills, newSkill.trim()]);
                      setNewSkill("");
                    }
                  }}
                >
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6">
              <div>
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <Label>Min Price</Label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) =>
                    setMinPrice(e.target.value === "" ? "" : e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Max Price</Label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) =>
                    setMaxPrice(e.target.value === "" ? "" : e.target.value)
                  }
                />
              </div>
            </div>
          </Card>

          {/* KYC */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">KYC Verification</h3>

            {!kyc?.status && (
              <div className="flex justify-between items-center">
                <p>No KYC submitted</p>
                <Button onClick={() => setKycModalOpen(true)}>
                  Submit KYC
                </Button>
              </div>
            )}

            {kyc?.status === "pending" && (
              <div className="p-4 bg-yellow-100 rounded-lg flex items-center gap-3">
                <Clock4 className="text-yellow-600" />
                <div>
                  <h4 className="font-semibold">Pending</h4>
                  <p>Your documents are under review</p>
                </div>
              </div>
            )}

            {kyc?.status === "approved" && (
              <div className="p-4 bg-green-100 rounded-lg flex items-center gap-3">
                <CheckCircle className="text-green-700" />
                <div>
                  <h4 className="font-semibold">Verified</h4>
                  <p>Documents approved</p>
                </div>
              </div>
            )}

            {kyc?.status === "rejected" && (
              <div className="p-4 bg-red-100 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-red-700" />
                <div>
                  <h4 className="font-semibold">Rejected</h4>
                  <p>{kyc?.reason || "Documents not accepted"}</p>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* PORTFOLIO TAB */}
        <TabsContent value="portfolio" className="mt-6">
          <Card className="p-6">
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="font-semibold">My Portfolio</h3>
                <p className="text-sm text-neutral-500">
                  Upload your best work
                </p>
              </div>

              <Button
                onClick={() =>
                  document.getElementById("pfInput")?.click()
                }
              >
                <Upload size={16} /> Upload
              </Button>

              <input
                id="pfInput"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onPortfolioUpload}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolio.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden"
                >
                  <img
                    src={`${API}/uploads/${img.url}`}
                    className="object-cover w-full h-full"
                  />

                  <div
                    className="
                      absolute inset-0 bg-black/40 opacity-0 
                      group-hover:opacity-100 transition flex items-center justify-center
                    "
                  >
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePortfolioItem(img.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Your Events</h3>

            {bookings.map((bk) => (
              <Card key={bk.id} className="p-4 flex justify-between">
                <div>
                  <h4>{bk.event?.title}</h4>
                  <p className="text-sm text-neutral-600">
                    {bk.event?.startAt}
                  </p>
                </div>
                <Badge>{bk.status}</Badge>
              </Card>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      {/* KYC MODAL */}
      <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit KYC</DialogTitle>
            <DialogDescription>Enter your KYC details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Aadhaar</Label>
              <Input
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
              />
            </div>

            <div>
              <Label>PAN</Label>
              <Input
                value={pan}
                onChange={(e) => setPan(e.target.value)}
              />
            </div>

            <div>
              <Label>Bank Name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div>
              <Label>Account Number</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <div>
              <Label>IFSC</Label>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={submitKyc}>
              Submit KYC
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
