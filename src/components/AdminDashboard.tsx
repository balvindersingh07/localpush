import { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'https://sharthi-api.onrender.com';

async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new Error(data?.error || data?.message || res.statusText);
  }
  return data as T;
}

function getToken() {
  try {
    return localStorage.getItem('jwt') || localStorage.getItem('sharthi_token');
  } catch {
    return null;
  }
}

/** ===== demo charts data (unchanged fallback) ===== */
// Creator Growth Data
const creatorGrowthData = [
  { month: 'Jun', dac: 520, new: 85 },
  { month: 'Jul', dac: 680, new: 120 },
  { month: 'Aug', dac: 850, new: 145 },
  { month: 'Sep', dac: 1020, new: 178 },
  { month: 'Oct', dac: 1250, new: 205 },
  { month: 'Nov', dac: 1480, new: 240 },
];

// Marketplace Health Data
const bookingsTrendData = [
  { week: 'W1', bookings: 145, refunds: 12 },
  { week: 'W2', bookings: 178, refunds: 8 },
  { week: 'W3', bookings: 195, refunds: 15 },
  { week: 'W4', bookings: 220, refunds: 10 },
];

// Fallback Category Mix Data (if API fails)
const fallbackCategoryMixData = [
  { name: 'Crafts', value: 35, color: '#F05A28' },
  { name: 'Beauty', value: 25, color: '#6C63FF' },
  { name: 'Art', value: 20, color: '#2EC4B6' },
  { name: 'Food', value: 12, color: '#F59E0B' },
  { name: 'Other', value: 8, color: '#6B7280' },
];

const CATEGORY_COLORS = ['#F05A28', '#6C63FF', '#2EC4B6', '#F59E0B', '#6B7280'];

// Funnel Data (still static for now)
const funnelData = [
  { stage: 'Visits', value: 100, count: 12500 },
  { stage: 'Searches', value: 68, count: 8500 },
  { stage: 'Views', value: 45, count: 5625 },
  { stage: 'Clicks', value: 28, count: 3500 },
  { stage: 'Bookings', value: 15, count: 1875 },
];

const statusColors: Record<string, string> = {
  pending: 'bg-warning',
  review: 'bg-secondary',
  approved: 'bg-accent',
  rejected: 'bg-error',
  open: 'bg-error',
  investigating: 'bg-warning',
  resolved: 'bg-accent',
  high: 'bg-error',
  medium: 'bg-warning',
  low: 'bg-neutral-400',
  paid: 'bg-accent',
  cancelled: 'bg-error',
};

/** ===== Types ===== */

type AdminStats = {
  totalUsers: number;
  totalCreators: number;
  totalOrganizers: number;
  activeEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  gmv30d: number;
  bookings30d: number;
  pendingEvents: number;
  pendingKyc: number;
  pendingDisputes: number;
};

type AdminEvent = {
  id: string;
  title: string;
  cityId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: string | null;
  organizer?: {
    user?: { name?: string | null; email?: string | null } | null;
  } | null;
};

type AdminBookingRow = {
  id: string;
  rawStatus: string;
  status: string; // lowercase
  amount: number;
  paymentRef?: string | null;
  createdAt: string;
  creatorName: string;
  creatorEmail: string;
  eventTitle: string;
  eventCity?: string | null;
  stallName: string;
  stallTier: string;
};

type AdminKycRow = {
  id: string;
  statusRaw: string;
  status: string; // lowercase
  type: string;
  submittedAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
};

type AdminDisputeRow = {
  id: string;
  bookingId: string;
  issue: string;
  statusRaw: string;
  status: string; // lowercase
  priorityRaw: string;
  priority: string; // lowercase
};

/** Insights types */

type CreatorInsight = {
  creatorId: string;
  name: string | null;
  email: string | null;
  totalGmv: number;
  bookings: number;
  sampleCity: string | null;
};

type CreatorMetrics = {
  avgGmvPerCreator: number;
  creatorsWithBooking90d: number;
  creatorsWithBooking90dPercent: number;
};

type OrganizerInsight = {
  organizerId: string;
  name: string | null;
  email: string | null;
  totalGmv: number;
  bookings: number;
  eventsCount: number;
  avgRating: number | null;
};

type OrganizerFunnel = {
  totalOrganizers: number;
  organizersWithEvent: number;
  organizersWithPaidBooking: number;
};

type CityInsight = {
  cityId: string | null;
  activeEvents: number;
  activeCreators: number;
  gmv30d: number;
  bookings30d: number;
  fillRate: number | null;
};

type CategoryInsight = {
  key: string;
  label: string;
  gmv: number;
  bookings: number;
  avgTicketSize: number;
  cancellationRate: number;
  disputeRate: number;
};

type RiskUser = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  cancellationRate: number;
  disputeRate: number;
  riskFlag: 'LOW' | 'MEDIUM' | 'HIGH';
};

type KycMetrics = {
  pendingCount: number;
  oldestPendingAgeHours: number | null;
  avgTimeToApproveHours: number | null;
  backlogByRole: Record<string, number>;
};

type DisputeOpsMetrics = {
  avgResolutionTimeHours: number | null;
  percentResolvedWithin72h: number | null;
};

type RevenueSummary = {
  gmv30: number;
  gmv90: number;
  platformFee30: number;
  platformFee90: number;
  netPayoutToCreators30: number;
  netPayoutToCreators90: number;
  takeRatePercent: number;
};

type CohortRow = {
  month: string;
  newCreators: number;
  newOrganizers: number;
  activeCreators: number;
  activeOrganizers: number;
  creatorRetentionPercent: number | null;
  organizerRetentionPercent: number | null;
};

type DataQualityIssues = {
  eventsWithIssues: any[];
  stallsWithoutBooking: any[];
};

export function AdminDashboard() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');

  // admin auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [pendingEvents, setPendingEvents] = useState<AdminEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // bookings tab state
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<
    'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'
  >('ALL');
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  // KYC tab state
  const [kycItems, setKycItems] = useState<AdminKycRow[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [kycActionId, setKycActionId] = useState<string | null>(null);

  // Disputes tab state
  const [disputes, setDisputes] = useState<AdminDisputeRow[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [disputeActionId, setDisputeActionId] = useState<string | null>(null);

  /** ====== Insights / Analytics state (Admin-only) ====== */
  const [loadingInsights, setLoadingInsights] = useState(true);

  const [creatorTop, setCreatorTop] = useState<CreatorInsight[]>([]);
  const [creatorMetrics, setCreatorMetrics] = useState<CreatorMetrics | null>(null);

  const [organizerTop, setOrganizerTop] = useState<OrganizerInsight[]>([]);
  const [organizerFunnel, setOrganizerFunnel] = useState<OrganizerFunnel | null>(
    null,
  );

  const [cityInsights, setCityInsights] = useState<CityInsight[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);

  const [riskWatchlist, setRiskWatchlist] = useState<RiskUser[]>([]);
  const [kycMetrics, setKycMetrics] = useState<KycMetrics | null>(null);
  const [disputeOpsMetrics, setDisputeOpsMetrics] = useState<DisputeOpsMetrics | null>(
    null,
  );

  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [cohortRows, setCohortRows] = useState<CohortRow[]>([]);

  const [dataQuality, setDataQuality] = useState<DataQualityIssues | null>(null);

  /** ========= ADMIN ROLE CHECK ========= */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error('Admin login required');
          return;
        }
        const res: any = await jsonFetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rawRole = String(res.role || '').toUpperCase();
        if (rawRole !== 'ADMIN') {
          toast.error('Admin access only');
          return;
        }
        if (!cancel) {
          setIsAdmin(true);
        }
      } catch (e: any) {
        if (!cancel) {
          toast.error(e?.message || 'Failed to verify admin');
        }
      } finally {
        if (!cancel) setAuthChecked(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  /** ========= DATA LOADS (only when admin) ========= */

  // load stats
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res: any = await jsonFetch(`${API}/admin/stats`, { headers });

        setStats({
          totalUsers: res.totalUsers ?? 0,
          totalCreators: res.totalCreators ?? 0,
          totalOrganizers: res.totalOrganizers ?? 0,
          activeEvents: res.activeEvents ?? res.liveEvents ?? 0,
          liveEvents: res.liveEvents ?? 0,
          upcomingEvents: res.upcomingEvents ?? 0,
          gmv30d: res.gmv30d ?? 0,
          bookings30d: res.bookings30d ?? 0,
          pendingEvents: res.pendingEvents ?? 0,
          pendingKyc: res.pendingKyc ?? 0,
          pendingDisputes: res.pendingDisputes ?? 0,
        });
      } catch {
        // keep demo defaults if API not ready
      } finally {
        setLoadingStats(false);
      }
    })();
  }, [isAdmin]);

  // load pending events
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res: any = await jsonFetch(
          `${API}/admin/events?status=PENDING_REVIEW&page=1&limit=50`,
          { headers },
        );

        const list: AdminEvent[] = Array.isArray(res) ? res : res?.items ?? [];
        setPendingEvents(list);
      } catch {
        // silent fail
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, [isAdmin]);

  // load bookings
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingBookings(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const qs =
          bookingFilter === 'ALL'
            ? '?page=1&limit=50'
            : `?status=${bookingFilter}&page=1&limit=50`;

        const res: any = await jsonFetch(`${API}/admin/bookings${qs}`, {
          headers,
        });

        const items: any[] = Array.isArray(res) ? res : res?.items ?? [];

        const mapped: AdminBookingRow[] = items.map((b) => {
          const rawStatus = String(b.status || '');
          return {
            id: b.id,
            rawStatus,
            status: rawStatus.toLowerCase(),
            amount: b.amount ?? 0,
            paymentRef: b.paymentRef ?? '',
            createdAt: b.createdAt
              ? new Date(b.createdAt).toLocaleString()
              : '—',
            creatorName: b.creator?.name || b.creator?.email || '—',
            creatorEmail: b.creator?.email || '',
            eventTitle: b.event?.title || '—',
            eventCity: b.event?.cityId || '',
            stallName: b.stall?.name || '—',
            stallTier: b.stall?.tier || '',
          };
        });

        setBookings(mapped);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load bookings');
      } finally {
        setLoadingBookings(false);
      }
    })();
  }, [bookingFilter, isAdmin]);

  // load KYC list
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingKyc(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res: any = await jsonFetch(
          `${API}/admin/kyc?status=PENDING&page=1&limit=50`,
          { headers },
        );

        const items: any[] = Array.isArray(res) ? res : res?.items ?? [];

        const mapped: AdminKycRow[] = items.map((k) => {
          const rawStatus = String(k.status || '');
          return {
            id: k.id,
            statusRaw: rawStatus,
            status: rawStatus.toLowerCase(),
            type: k.type || (k.user?.role ?? 'UNKNOWN'),
            submittedAt: k.createdAt
              ? new Date(k.createdAt).toLocaleString()
              : '—',
            userName: k.user?.name || k.user?.email || '—',
            userEmail: k.user?.email || '',
            userRole: k.user?.role || '',
          };
        });

        setKycItems(mapped);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load KYC queue');
      } finally {
        setLoadingKyc(false);
      }
    })();
  }, [isAdmin]);

  // load disputes
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingDisputes(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res: any = await jsonFetch(
          `${API}/admin/disputes?status=OPEN&page=1&limit=50`,
          { headers },
        );

        const items: any[] = Array.isArray(res) ? res : res?.items ?? [];

        const mapped: AdminDisputeRow[] = items.map((d) => {
          const rawStatus = String(d.status || '');
          const rawPriority = String(d.priority || '');
          return {
            id: d.id,
            bookingId: d.booking?.id || '—',
            issue: d.issue || '',
            statusRaw: rawStatus,
            status: rawStatus.toLowerCase(),
            priorityRaw: rawPriority,
            priority: rawPriority.toLowerCase(),
          };
        });

        setDisputes(mapped);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load disputes');
      } finally {
        setLoadingDisputes(false);
      }
    })();
  }, [isAdmin]);

  /** ========= INSIGHTS LOAD (Admin-only analytics) ========= */
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingInsights(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const results = await Promise.allSettled([
          jsonFetch(`${API}/admin/insights/creators/top`, { headers }),
          jsonFetch(`${API}/admin/insights/organizers/top`, { headers }),
          jsonFetch(`${API}/admin/insights/cities`, { headers }),
          jsonFetch(`${API}/admin/insights/categories`, { headers }),
          jsonFetch(`${API}/admin/risk/watchlist`, { headers }),
          jsonFetch(`${API}/admin/risk/kyc-metrics`, { headers }),
          jsonFetch(`${API}/admin/ops/disputes-metrics`, { headers }),
          jsonFetch(`${API}/admin/revenue/summary`, { headers }),
          jsonFetch(`${API}/admin/revenue/cohorts`, { headers }),
          jsonFetch(`${API}/admin/data-quality/issues`, { headers }),
        ]);

        const [
          creatorsRes,
          organizersRes,
          citiesRes,
          categoriesRes,
          riskRes,
          kycRes,
          opsRes,
          revenueRes,
          cohortsRes,
          dqRes,
        ] = results;

        if (creatorsRes.status === 'fulfilled') {
          const data: any = creatorsRes.value;
          setCreatorTop(data.topCreators || []);
          setCreatorMetrics(data.metrics || null);
        }

        if (organizersRes.status === 'fulfilled') {
          const data: any = organizersRes.value;
          setOrganizerTop(data.topOrganizers || []);
          setOrganizerFunnel(data.funnel || null);
        }

        if (citiesRes.status === 'fulfilled') {
          const data: any = citiesRes.value;
          setCityInsights(data.cities || []);
        }

        if (categoriesRes.status === 'fulfilled') {
          const data: any = categoriesRes.value;
          setCategoryInsights(data.categories || []);
        }

        if (riskRes.status === 'fulfilled') {
          const data: any = riskRes.value;
          setRiskWatchlist(data.items || []);
        }

        if (kycRes.status === 'fulfilled') {
          const data: any = kycRes.value;
          if (data.metrics) {
            setKycMetrics({
              pendingCount: data.metrics.pendingCount ?? 0,
              oldestPendingAgeHours: data.metrics.oldestPendingAgeHours ?? null,
              avgTimeToApproveHours: data.metrics.avgTimeToApproveHours ?? null,
              backlogByRole: data.metrics.backlogByRole ?? {},
            });
          }
        }

        if (opsRes.status === 'fulfilled') {
          const data: any = opsRes.value;
          if (data.metrics) {
            setDisputeOpsMetrics({
              avgResolutionTimeHours: data.metrics.avgResolutionTimeHours ?? null,
              percentResolvedWithin72h:
                data.metrics.percentResolvedWithin72h ?? null,
            });
          }
        }

        if (revenueRes.status === 'fulfilled') {
          const data: any = revenueRes.value;
          if (data.summary) {
            setRevenueSummary({
              gmv30: data.summary.gmv30 ?? 0,
              gmv90: data.summary.gmv90 ?? 0,
              platformFee30: data.summary.platformFee30 ?? 0,
              platformFee90: data.summary.platformFee90 ?? 0,
              netPayoutToCreators30: data.summary.netPayoutToCreators30 ?? 0,
              netPayoutToCreators90: data.summary.netPayoutToCreators90 ?? 0,
              takeRatePercent: data.summary.takeRatePercent ?? 0,
            });
          }
        }

        if (cohortsRes.status === 'fulfilled') {
          const data: any = cohortsRes.value;
          setCohortRows(data.cohorts || []);
        }

        if (dqRes.status === 'fulfilled') {
          const data: any = dqRes.value;
          setDataQuality({
            eventsWithIssues: data.eventsWithIssues || [],
            stallsWithoutBooking: data.stallsWithoutBooking || [],
          });
        }
      } catch (e: any) {
        console.error('Failed to load admin insights', e);
        toast.error('Some analytics failed to load');
      } finally {
        setLoadingInsights(false);
      }
    })();
  }, [isAdmin]);

  async function handleReviewEvent(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      const token = getToken();
      if (!token) {
        toast.error('Admin login required');
        return;
      }

      await jsonFetch(`${API}/admin/events/${id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });

      setPendingEvents((prev) => prev.filter((ev) => ev.id !== id));
      toast.success(action === 'APPROVE' ? 'Event approved' : 'Event rejected');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update event');
    }
  }

  async function updateBookingStatus(
    id: string,
    newStatus: 'PENDING' | 'PAID' | 'CANCELLED',
  ) {
    try {
      const token = getToken();
      if (!token) {
        toast.error('Admin login required');
        return;
      }
      setUpdatingBookingId(id);

      await jsonFetch(`${API}/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });

      setBookings((rows) =>
        rows.map((b) =>
          b.id === id
            ? {
                ...b,
                rawStatus: newStatus,
                status: newStatus.toLowerCase(),
              }
            : b,
        ),
      );

      toast.success(`Booking marked as ${newStatus.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update booking status');
    } finally {
      setUpdatingBookingId(null);
    }
  }

  async function handleKycAction(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      const token = getToken();
      if (!token) {
        toast.error('Admin login required');
        return;
      }
      setKycActionId(id);

      await jsonFetch(`${API}/admin/kyc/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          action === 'APPROVE'
            ? { action: 'APPROVE', note: 'Approved via admin dashboard' }
            : {
                action: 'REJECT',
                rejectionReason: 'Rejected via admin dashboard',
              },
        ),
      });

      setKycItems((rows) => rows.filter((k) => k.id !== id));
      toast.success(`KYC ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update KYC');
    } finally {
      setKycActionId(null);
    }
  }

  async function handleDisputeAction(id: string, action: 'RESOLVE' | 'ESCALATE') {
    try {
      const token = getToken();
      if (!token) {
        toast.error('Admin login required');
        return;
      }
      setDisputeActionId(id);

      const payload =
        action === 'RESOLVE'
          ? {
              status: 'RESOLVED',
              resolutionNote: 'Resolved via admin dashboard',
            }
          : {
              status: 'INVESTIGATING',
              resolutionNote: 'Escalated via admin dashboard',
            };

      await jsonFetch(`${API}/admin/disputes/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      setDisputes((rows) => rows.filter((d) => d.id !== id));

      if (action === 'RESOLVE') {
        toast.success('Dispute resolved successfully!');
      } else {
        toast.info('Dispute escalated for further investigation');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update dispute');
    } finally {
      setDisputeActionId(null);
    }
  }

  const totalUsers = stats?.totalUsers ?? 2345;
  const totalCreators = stats?.totalCreators ?? 1480;
  const totalOrganizers = stats?.totalOrganizers ?? 865;
  const activeEvents = stats?.activeEvents ?? 87;
  const liveEvents = stats?.liveEvents ?? 45;
  const upcomingEvents = stats?.upcomingEvents ?? 42;
  const gmv = stats?.gmv30d ?? 2450000; // ₹24.5L default
  const bookings30d = stats?.bookings30d ?? 1875;

  const pendingEventsCount = stats?.pendingEvents ?? pendingEvents.length;
  const pendingKycCount = stats?.pendingKyc ?? 3;
  const pendingDisputesCount = stats?.pendingDisputes ?? 4;
  const pendingTotal = pendingEventsCount + pendingKycCount + pendingDisputesCount;

  // ---- derived bookings analytics for current filter ----
  const totalBookings = bookings.length;
  let paidCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let paidAmount = 0;

  for (const b of bookings) {
    if (b.status === 'paid') {
      paidCount += 1;
      paidAmount += b.amount || 0;
    } else if (b.status === 'pending') {
      pendingCount += 1;
    } else if (b.status === 'cancelled') {
      cancelledCount += 1;
    }
  }

  const successRate =
    totalBookings > 0 ? Math.round((paidCount / totalBookings) * 100) : 0;

  // ----- derived charts from insights -----
  const categoryChartData =
    categoryInsights.length > 0
      ? categoryInsights.map((c, index) => ({
          name: c.label,
          value: c.gmv,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
      : fallbackCategoryMixData;

  const topCitiesByGmv = [...cityInsights].sort(
    (a, b) => (b.gmv30d || 0) - (a.gmv30d || 0),
  );

  /** ====== AUTH GUARD UI ====== */

  if (!authChecked) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <h3 className="text-neutral-900 mb-2">Loading admin console…</h3>
          <p className="text-neutral-600 text-sm">
            Please wait while we verify your admin access.
          </p>
        </Card>
      </div>
    );
  }

  if (authChecked && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center space-y-3">
          <h3 className="text-neutral-900">Admin access only</h3>
          <p className="text-neutral-600 text-sm">
            You&apos;re signed in as a creator / organizer. Please log in with an admin
            account to view this dashboard.
          </p>
        </Card>
      </div>
    );
  }

  /** ====== MAIN ADMIN UI ====== */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-900 mb-2">Admin Dashboard</h1>
          <p className="text-neutral-600">
            Monitor platform health and manage operations
          </p>
        </div>
        <div className="flex gap-2">
          {/* Currently range is visual only; backend endpoints are 30/90d fixed */}
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-accent/10 rounded-xl">
              <Users className="text-accent" size={24} />
            </div>
            <Badge className="bg-accent/10 text-accent">+12%</Badge>
          </div>
          <p className="text-neutral-600 mb-1">Total Users</p>
          <div className="text-neutral-900">
            {loadingStats ? '—' : totalUsers.toLocaleString()}
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            {loadingStats
              ? 'Loading…'
              : `${totalCreators.toLocaleString()} Creators • ${totalOrganizers.toLocaleString()} Organizers`}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calendar className="text-primary" size={24} />
            </div>
            <Badge className="bg-primary/10 text-primary">+8%</Badge>
          </div>
          <p className="text-neutral-600 mb-1">Active Events</p>
          <div className="text-neutral-900">
            {loadingStats ? '—' : activeEvents}
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            {loadingStats ? '' : `${liveEvents} Live • ${upcomingEvents} Upcoming`}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <DollarSign className="text-secondary" size={24} />
            </div>
            <Badge className="bg-secondary/10 text-secondary">+15%</Badge>
          </div>
          <p className="text-neutral-600 mb-1">GMV (30d)</p>
          <div className="text-neutral-900">
            {loadingStats ? '—' : `₹${(gmv / 100000).toFixed(1)}L`}
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            {loadingStats ? '' : `${bookings30d.toLocaleString()} bookings`}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-warning/10 rounded-xl">
              <AlertTriangle className="text-warning" size={24} />
            </div>
            <Badge className="bg-warning/10 text-warning">Needs Attention</Badge>
          </div>
          <p className="text-neutral-600 mb-1">Pending Reviews</p>
          <div className="text-neutral-900">
            {loadingStats ? '—' : pendingTotal}
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            {loadingStats
              ? ''
              : `${pendingKycCount} KYC • ${pendingEventsCount} Events • ${pendingDisputesCount} Disputes`}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Creator Growth (still demo – can later wire to real DAC) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-neutral-900 mb-1">Creator Growth</h3>
                <p className="text-neutral-600 text-sm">
                  Daily Active Creators (DAC) and new signups
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={creatorGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="dac"
                  stroke="#F05A28"
                  strokeWidth={2}
                  name="DAC"
                />
                <Line
                  type="monotone"
                  dataKey="new"
                  stroke="#2EC4B6"
                  strokeWidth={2}
                  name="New Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Creator & Organizer Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creator Insights */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-neutral-900 mb-1">Creator Insights</h3>
                  <p className="text-neutral-600 text-sm">
                    Top creators by GMV / bookings (last 30d)
                  </p>
                </div>
                {creatorMetrics && !loadingInsights && (
                  <Badge className="bg-accent/10 text-accent">
                    Avg GMV / active creator: ₹
                    {creatorMetrics.avgGmvPerCreator.toLocaleString()}
                  </Badge>
                )}
              </div>
              {loadingInsights ? (
                <p className="text-neutral-500 text-sm">Loading creator insights…</p>
              ) : !creatorTop.length ? (
                <p className="text-neutral-500 text-sm">
                  No creator bookings in the last 30 days.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>GMV (30d)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorTop.slice(0, 5).map((c) => (
                      <TableRow key={c.creatorId}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{c.name || c.email || '—'}</span>
                            {c.email && (
                              <span className="text-xs text-neutral-500">
                                {c.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{c.sampleCity || '—'}</TableCell>
                        <TableCell>{c.bookings}</TableCell>
                        <TableCell>₹{c.totalGmv.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {creatorMetrics && (
                <p className="text-xs text-neutral-500 mt-3">
                  {creatorMetrics.creatorsWithBooking90dPercent}% creators had at
                  least 1 booking in the last 90 days (
                  {creatorMetrics.creatorsWithBooking90d.toLocaleString()} creators).
                </p>
              )}
            </Card>

            {/* Organizer Insights */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-neutral-900 mb-1">Organizer Insights</h3>
                  <p className="text-neutral-600 text-sm">
                    Top organizers by GMV (last 30d)
                  </p>
                </div>
                {organizerFunnel && !loadingInsights && (
                  <Badge className="bg-primary/10 text-primary text-xs">
                    {organizerFunnel.organizersWithPaidBooking}/
                    {organizerFunnel.totalOrganizers} organizers with paid bookings
                  </Badge>
                )}
              </div>
              {loadingInsights ? (
                <p className="text-neutral-500 text-sm">Loading organizer insights…</p>
              ) : !organizerTop.length ? (
                <p className="text-neutral-500 text-sm">
                  No organizer GMV in the last 30 days.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>GMV (30d)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizerTop.slice(0, 5).map((o) => (
                      <TableRow key={o.organizerId}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{o.name || o.email || '—'}</span>
                            {o.email && (
                              <span className="text-xs text-neutral-500">
                                {o.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{o.eventsCount}</TableCell>
                        <TableCell>{o.bookings}</TableCell>
                        <TableCell>₹{o.totalGmv.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {organizerFunnel && (
                <p className="text-xs text-neutral-500 mt-3">
                  Funnel: {organizerFunnel.totalOrganizers} organizers →{' '}
                  {organizerFunnel.organizersWithEvent} created an event →{' '}
                  {organizerFunnel.organizersWithPaidBooking} generated paid bookings.
                </p>
              )}
            </Card>
          </div>

          {/* Risk Watchlist */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-neutral-900 mb-1">Risk Watchlist</h3>
                <p className="text-neutral-600 text-sm">
                  Creators / organizers with high cancellations or disputes (last 90d)
                </p>
              </div>
            </div>
            {loadingInsights ? (
              <p className="text-neutral-500 text-sm">Loading risk data…</p>
            ) : !riskWatchlist.length ? (
              <p className="text-neutral-500 text-sm">
                No medium / high-risk users detected in the last 90 days.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Cancellation %</TableHead>
                    <TableHead>Dispute %</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskWatchlist.slice(0, 10).map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{u.name || u.email || '—'}</span>
                          {u.email && (
                            <span className="text-xs text-neutral-500">
                              {u.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="uppercase text-xs">
                        {u.role || '—'}
                      </TableCell>
                      <TableCell>{u.cancellationRate.toFixed(1)}%</TableCell>
                      <TableCell>{u.disputeRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[u.riskFlag.toLowerCase()] ||
                            'bg-neutral-300'
                          }
                        >
                          {u.riskFlag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* City Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-neutral-900 mb-1">City Performance (last 30d)</h3>
                <p className="text-neutral-600 text-sm">
                  Active events, GMV and fill rates by city
                </p>
              </div>
            </div>
            {loadingInsights ? (
              <p className="text-neutral-500 text-sm">Loading city performance…</p>
            ) : !topCitiesByGmv.length ? (
              <p className="text-neutral-500 text-sm">
                No city level data available yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Active Events</TableHead>
                    <TableHead>Active Creators</TableHead>
                    <TableHead>GMV (30d)</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Fill Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCitiesByGmv.slice(0, 6).map((c) => (
                    <TableRow key={c.cityId ?? 'UNKNOWN'}>
                      <TableCell>{c.cityId || '—'}</TableCell>
                      <TableCell>{c.activeEvents}</TableCell>
                      <TableCell>{c.activeCreators}</TableCell>
                      <TableCell>₹{c.gmv30d.toLocaleString()}</TableCell>
                      <TableCell>{c.bookings30d}</TableCell>
                      <TableCell>
                        {c.fillRate != null ? `${c.fillRate}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bookings Trend */}
            <Card className="p-6">
              <h3 className="text-neutral-900 mb-4">Bookings vs Refunds</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bookingsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="bookings"
                    fill="#2EC4B6"
                    radius={[8, 8, 0, 0]}
                    name="Bookings"
                  />
                  <Bar
                    dataKey="refunds"
                    fill="#EF4444"
                    radius={[8, 8, 0, 0]}
                    name="Refunds"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Category Performance */}
            <Card className="p-6 space-y-4">
              <h3 className="text-neutral-900">Category Performance (last 30d)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {categoryInsights.length > 0 && (
                <div className="max-h-40 overflow-auto border-t border-neutral-100 pt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>GMV</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Cancel %</TableHead>
                        <TableHead>Dispute %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryInsights.map((c) => (
                        <TableRow key={c.key}>
                          <TableCell>{c.label}</TableCell>
                          <TableCell>₹{c.gmv.toLocaleString()}</TableCell>
                          <TableCell>{c.bookings}</TableCell>
                          <TableCell>{c.cancellationRate.toFixed(1)}%</TableCell>
                          <TableCell>{c.disputeRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card className="p-6">
            <h3 className="text-neutral-900 mb-4">Acquisition Funnel (30d)</h3>
            <div className="space-y-3">
              {funnelData.map((stage, index) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-700">{stage.stage}</span>
                    <span className="text-neutral-900">
                      {stage.count.toLocaleString()} ({stage.value}%)
                    </span>
                  </div>
                  <div className="w-full h-10 bg-neutral-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white transition-all"
                      style={{ width: `${stage.value}%` }}
                    >
                      {stage.value > 20 && (
                        <span className="text-sm">{stage.value}%</span>
                      )}
                    </div>
                  </div>
                  {index < funnelData.length - 1 && (
                    <p className="text-neutral-500 text-xs mt-1">
                      Drop: {funnelData[index].value -
                        funnelData[index + 1].value}
                      %
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Cohort Table */}
          {cohortRows.length > 0 && (
            <Card className="p-6">
              <h3 className="text-neutral-900 mb-3">
                Growth Cohorts (last 6 months)
              </h3>
              <p className="text-neutral-600 text-sm mb-3">
                Month wise new creators / organizers and retention (active in last
                60d)
              </p>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>New Creators</TableHead>
                      <TableHead>New Organizers</TableHead>
                      <TableHead>Creator Retention</TableHead>
                      <TableHead>Organizer Retention</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortRows.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>{row.newCreators}</TableCell>
                        <TableCell>{row.newOrganizers}</TableCell>
                        <TableCell>
                          {row.creatorRetentionPercent != null
                            ? `${row.creatorRetentionPercent}%`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {row.organizerRetentionPercent != null
                            ? `${row.organizerRetentionPercent}%`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* KYC / Dispute Ops / Revenue / Data Quality */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KYC SLA & Backlog */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <CheckCircle className="text-accent" size={24} />
                </div>
                <div>
                  <p className="text-neutral-600 text-sm">KYC SLA & Backlog</p>
                  <div className="text-neutral-900">
                    {kycMetrics ? kycMetrics.pendingCount : '—'} pending
                  </div>
                </div>
              </div>
              {kycMetrics ? (
                <div className="space-y-1 text-xs text-neutral-600">
                  <p>
                    Avg approval time:{' '}
                    {kycMetrics.avgTimeToApproveHours != null
                      ? `~${kycMetrics.avgTimeToApproveHours} hrs`
                      : '—'}
                  </p>
                  <p>
                    Oldest pending:{' '}
                    {kycMetrics.oldestPendingAgeHours != null
                      ? `~${(kycMetrics.oldestPendingAgeHours / 24).toFixed(1)} days`
                      : '—'}
                  </p>
                  <p className="mt-1">Backlog by role:</p>
                  <ul className="list-disc list-inside">
                    {Object.entries(kycMetrics.backlogByRole).map(
                      ([role, count]) => (
                        <li key={role}>
                          {role}: {count}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  KYC metrics will appear once requests start flowing.
                </p>
              )}
            </Card>

            {/* Dispute Ops */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-warning/10 rounded-xl">
                  <AlertTriangle className="text-warning" size={24} />
                </div>
                <div>
                  <p className="text-neutral-600 text-sm">Dispute Ops Metrics</p>
                  <div className="text-neutral-900">
                    {disputeOpsMetrics?.avgResolutionTimeHours != null
                      ? `~${disputeOpsMetrics.avgResolutionTimeHours} hrs`
                      : '—'}{' '}
                    avg resolution
                  </div>
                </div>
              </div>
              {disputeOpsMetrics ? (
                <p className="text-xs text-neutral-600">
                  {disputeOpsMetrics.percentResolvedWithin72h != null
                    ? `${disputeOpsMetrics.percentResolvedWithin72h}% disputes closed within 72h SLA.`
                    : 'SLA metrics not available yet.'}
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  Dispute metrics will show once you have enough volume.
                </p>
              )}
            </Card>

            {/* Revenue Summary */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-secondary/10 rounded-xl">
                  <TrendingUp className="text-secondary" size={24} />
                </div>
                <div>
                  <p className="text-neutral-600 text-sm">Revenue Summary</p>
                  <div className="text-neutral-900">
                    {revenueSummary
                      ? `₹${(revenueSummary.platformFee30 / 100000).toFixed(1)}L`
                      : '—'}{' '}
                    platform fee (30d)
                  </div>
                </div>
              </div>
              {revenueSummary ? (
                <div className="text-xs text-neutral-600 space-y-1">
                  <p>
                    GMV 30d: ₹{revenueSummary.gmv30.toLocaleString()} (take-rate{' '}
                    {revenueSummary.takeRatePercent}%)
                  </p>
                  <p>
                    Net payout 30d: ₹
                    {revenueSummary.netPayoutToCreators30.toLocaleString()}
                  </p>
                  <p>
                    GMV 90d: ₹{revenueSummary.gmv90.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Revenue will show once you configure commission / fees.
                </p>
              )}
            </Card>

            {/* Data Quality */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-neutral-100 rounded-xl">
                  <CheckCircle className="text-neutral-600" size={24} />
                </div>
                <div>
                  <p className="text-neutral-600 text-sm">Data Quality</p>
                  <div className="text-neutral-900">
                    {dataQuality
                      ? dataQuality.eventsWithIssues.length +
                        dataQuality.stallsWithoutBooking.length
                      : '—'}{' '}
                    open issues
                  </div>
                </div>
              </div>
              {dataQuality ? (
                <div className="text-xs text-neutral-600 space-y-1">
                  <p>
                    Events with invalid data:{' '}
                    {dataQuality.eventsWithIssues.length}
                  </p>
                  <p>
                    Stalls without booking after event start:{' '}
                    {dataQuality.stallsWithoutBooking.length}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Use this list to clean cities, dates, prices & stall mappings.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Data quality checks will run once events & stalls are live.
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-neutral-900">All Bookings</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Filter:</span>
              <Select
                value={bookingFilter}
                onValueChange={(v: any) =>
                  setBookingFilter(v as 'ALL' | 'PENDING' | 'PAID' | 'CANCELLED')
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* small analytics section based on loaded bookings */}
          {!loadingBookings && totalBookings > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-neutral-500 mb-1">
                  Total bookings (current view)
                </p>
                <div className="text-neutral-900">
                  {totalBookings.toLocaleString()}
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500 mb-1">Paid</p>
                <div className="text-neutral-900">
                  {paidCount.toLocaleString()}
                </div>
                <p className="text-[11px] text-neutral-500">
                  ₹{paidAmount.toLocaleString()} collected
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500 mb-1">
                  Pending / Cancelled
                </p>
                <div className="text-neutral-900">
                  {pendingCount} pending • {cancelledCount} cancelled
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500 mb-1">
                  Payment success rate
                </p>
                <div className="text-neutral-900">{successRate}%</div>
              </Card>
            </div>
          )}

          {loadingBookings ? (
            <Card className="p-12">
              <div className="text-center text-neutral-600">
                Loading bookings…
              </div>
            </Card>
          ) : bookings.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-neutral-600">
                No bookings found for this filter.
              </div>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Stall</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{b.creatorName}</span>
                          {b.creatorEmail && (
                            <span className="text-xs text-neutral-500">
                              {b.creatorEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{b.eventTitle}</span>
                          {b.eventCity && (
                            <span className="text-xs text-neutral-500">
                              {b.eventCity}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{b.stallName}</span>
                          {b.stallTier && (
                            <span className="text-xs text-neutral-500">
                              {b.stallTier}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-primary">
                        ₹{(b.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[b.status] || 'bg-neutral-300'}
                        >
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-neutral-600">
                        {b.paymentRef || '—'}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {b.createdAt}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingBookingId === b.id}
                            onClick={() => updateBookingStatus(b.id, 'PAID')}
                          >
                            {updatingBookingId === b.id && b.rawStatus !== 'PAID'
                              ? 'Updating…'
                              : 'Mark Paid'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingBookingId === b.id}
                            onClick={() =>
                              updateBookingStatus(b.id, 'PENDING')
                            }
                          >
                            Mark Pending
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updatingBookingId === b.id}
                            onClick={() =>
                              updateBookingStatus(b.id, 'CANCELLED')
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* REVIEW QUEUE TAB */}
        <TabsContent value="queue" className="space-y-6 mt-6">
          {/* KYC Queue */}
          <Card>
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-neutral-900">KYC Verification Queue</h3>
              <span className="text-sm text-neutral-500">
                Showing pending requests
              </span>
            </div>
            {loadingKyc ? (
              <div className="p-12 text-center text-neutral-600">
                Loading KYC requests…
              </div>
            ) : kycItems.length === 0 ? (
              <div className="p-12 text-center text-neutral-600">
                No KYC requests pending review.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{item.userName}</span>
                          {item.userEmail && (
                            <span className="text-xs text-neutral-500">
                              {item.userEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell className="text-neutral-600">
                        {item.submittedAt}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[item.status] || 'bg-neutral-300'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                KYC Review - {item.userName}
                              </DialogTitle>
                              <DialogDescription>
                                Review and verify the submitted documents
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-4 bg-neutral-50 rounded-lg space-y-1">
                                <p className="text-sm text-neutral-600 mb-1">
                                  Submission ID
                                </p>
                                <p className="text-neutral-900">{item.id}</p>
                                <p className="text-xs text-neutral-500">
                                  {item.userEmail}
                                </p>
                              </div>
                              <div className="p-4 bg-neutral-50 rounded-lg">
                                <p className="text-sm text-neutral-600 mb-1">
                                  User Type
                                </p>
                                <p className="text-neutral-900">{item.type}</p>
                              </div>
                              <div className="p-4 bg-neutral-50 rounded-lg">
                                <p className="text-sm text-neutral-600 mb-1">
                                  Submitted
                                </p>
                                <p className="text-neutral-900">
                                  {item.submittedAt}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1 bg-accent"
                                  disabled={kycActionId === item.id}
                                  onClick={() =>
                                    handleKycAction(item.id, 'APPROVE')
                                  }
                                >
                                  {kycActionId === item.id
                                    ? 'Approving…'
                                    : 'Approve'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  disabled={kycActionId === item.id}
                                  onClick={() =>
                                    handleKycAction(item.id, 'REJECT')
                                  }
                                >
                                  {kycActionId === item.id
                                    ? 'Rejecting…'
                                    : 'Reject'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Events Review Queue */}
          {loadingEvents ? (
            <Card className="p-12">
              <div className="text-center text-neutral-600">
                Loading events pending review…
              </div>
            </Card>
          ) : pendingEvents.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="text-accent" size={32} />
                </div>
                <h4 className="text-neutral-900">All caught up!</h4>
                <p className="text-neutral-600">
                  No events pending review at the moment.
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="p-6 border-b border-neutral-200">
                <h3 className="text-neutral-900">Event Review Queue</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEvents.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell>{ev.title}</TableCell>
                      <TableCell>{ev.cityId || '—'}</TableCell>
                      <TableCell>
                        {ev.startAt
                          ? new Date(ev.startAt).toLocaleDateString()
                          : '—'}
                        {ev.endAt && (
                          <> – {new Date(ev.endAt).toLocaleDateString()}</>
                        )}
                      </TableCell>
                      <TableCell>
                        {ev.organizer?.user?.name ||
                          ev.organizer?.user?.email ||
                          '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-accent"
                            onClick={() =>
                              handleReviewEvent(ev.id, 'APPROVE')
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleReviewEvent(ev.id, 'REJECT')
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* DISPUTES TAB */}
        <TabsContent value="disputes" className="mt-6">
          <Card>
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-neutral-900">Active Disputes</h3>
              <span className="text-sm text-neutral-500">
                Showing OPEN disputes
              </span>
            </div>
            {loadingDisputes ? (
              <div className="p-12 text-center text-neutral-600">
                Loading disputes…
              </div>
            ) : disputes.length === 0 ? (
              <div className="p-12 text-center text-neutral-600">
                No active disputes right now.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>{dispute.id}</TableCell>
                      <TableCell>{dispute.bookingId}</TableCell>
                      <TableCell>{dispute.issue}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[dispute.priority] || 'bg-neutral-300'
                          }
                        >
                          {dispute.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[dispute.status] || 'bg-neutral-300'
                          }
                        >
                          {dispute.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Resolve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Dispute Details - {dispute.id}
                              </DialogTitle>
                              <DialogDescription>
                                Review and resolve the dispute
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-4 bg-neutral-50 rounded-lg space-y-2">
                                <div>
                                  <p className="text-sm text-neutral-600">
                                    Booking ID
                                  </p>
                                  <p className="text-neutral-900">
                                    {dispute.bookingId}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-neutral-600">
                                    Issue
                                  </p>
                                  <p className="text-neutral-900">
                                    {dispute.issue}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-neutral-600">
                                    Priority
                                  </p>
                                  <Badge
                                    className={
                                      statusColors[dispute.priority] ||
                                      'bg-neutral-300'
                                    }
                                  >
                                    {dispute.priority}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={disputeActionId === dispute.id}
                                  onClick={() =>
                                    handleDisputeAction(dispute.id, 'RESOLVE')
                                  }
                                >
                                  {disputeActionId === dispute.id
                                    ? 'Saving…'
                                    : 'Mark as Resolved'}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  disabled={disputeActionId === dispute.id}
                                  onClick={() =>
                                    handleDisputeAction(dispute.id, 'ESCALATE')
                                  }
                                >
                                  {disputeActionId === dispute.id
                                    ? 'Saving…'
                                    : 'Escalate'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
