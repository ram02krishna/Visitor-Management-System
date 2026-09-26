import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  PackageSearch,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  User,
  ShieldCheck,
  X,
  HandMetal,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { formatIST } from "../lib/dateIST";
import { PageHeader } from "./PageHeader";
import { CustomSelect } from "./ui/CustomSelect";
import { useAuthStore } from "../store/auth";
import { useDebounce } from "../hooks/useDebounce";
import { useDataSync } from "../lib/dataSync";
import { CardSkeleton, MetricSkeleton } from "./ui/LoadingSkeleton";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "electronics", label: "💻 Electronics & Chargers" },
  { value: "documents", label: "🪪 ID Cards & Documents" },
  { value: "keys", label: "🔑 Keys & Keychains" },
  { value: "wallet", label: "👛 Wallets & Purses" },
  { value: "clothing", label: "🎒 Bags & Clothing" },
  { value: "other", label: "📦 Miscellaneous" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "in_custody", label: "🟢 In Custody (Unclaimed)" },
  { value: "claimed", label: "✅ Claimed & Handed Over" },
];

export function LostAndFound() {
  const { user } = useAuthStore();
  const cached = api.uiCache.get("vms_lost_found") as { items: any[]; stats: any } | undefined;
  const [items, setItems] = useState<any[]>(() => cached?.items || []);
  const [stats, setStats] = useState(() => cached?.stats || { total: 0, inCustody: 0, claimed: 0 });
  const [loading, setLoading] = useState(!cached);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [claimingItem, setClaimingItem] = useState<any | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("electronics");
  const [newDesc, setNewDesc] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newFinderName, setNewFinderName] = useState(user?.name || "");
  const [newFinderContact, setNewFinderContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [claimantName, setClaimantName] = useState("");
  const [claimantId, setClaimantId] = useState("");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [handoverOfficer, setHandoverOfficer] = useState(user?.name || "Duty Guard");
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchItems = useCallback(async (isBackground = false) => {
    if (!isBackground && items.length === 0) setLoading(true);
    try {
      const res = await api.lostAndFound.list({
        search: debouncedSearch.trim() || undefined,
        category: category !== "all" ? category : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setItems(res.items);
      setStats(res.stats);
      if (!debouncedSearch && category === "all" && statusFilter === "all") {
        api.uiCache.set("vms_lost_found", res);
      }
    } catch (err: any) {
      if (!isBackground) {
        toast.error(err.message || "Failed to load lost & found items.");
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, statusFilter, items.length]);

  useDataSync(["lostAndFound", "all"], () => {
    fetchItems(true);
  });

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim() || !newFinderName.trim()) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.lostAndFound.create({
        title: newTitle.trim(),
        category: newCategory,
        description: newDesc.trim() || undefined,
        location_found: newLocation.trim(),
        found_by_name: newFinderName.trim(),
        found_by_contact: newFinderContact.trim() || undefined,
      });

      toast.success("Found item logged in campus registry!");
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewLocation("");
      fetchItems(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to log item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem || !claimantName.trim() || !claimantId.trim()) {
      toast.error("Claimant name and Roll No / ID are required.");
      return;
    }

    setIsClaiming(true);
    try {
      await api.lostAndFound.claim(claimingItem.id, {
        claimed_by_name: claimantName.trim(),
        claimed_by_id: claimantId.trim().toUpperCase(),
        claimed_by_phone: claimantPhone.trim() || undefined,
        handover_officer: handoverOfficer.trim(),
      });

      toast.success("Item claim verified and handed over!");
      setClaimingItem(null);
      setClaimantName("");
      setClaimantId("");
      setClaimantPhone("");
      fetchItems(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to process handover.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item from registry?")) return;
    try {
      await api.lostAndFound.delete(id);
      toast.success("Item removed.");
      fetchItems(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove item.");
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <PageHeader
        backTo="/app/dashboard"
        icon={PackageSearch}
        gradient="from-amber-500 to-orange-600"
        title="Lost & Found"
        description="Report, browse, claim, and recover misplaced property across campus."
        right={
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs sm:text-sm font-bold flex items-center gap-2 py-2.5 px-4 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Recovered Item</span>
          </button>
        }
      />

      {loading && items.length === 0 ? (
        <MetricSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Total Logged Items
              </span>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <PackageSearch className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                In Security Custody
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.inCustody}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Claimed & Handed Over
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.claimed}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, locations, claimants..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-white"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <div className="w-full sm:w-48">
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={CATEGORIES}
              className="!py-2 !px-3 text-xs font-bold"
            />
          </div>
          <div className="w-full sm:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTERS}
              className="!py-2 !px-3 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <CardSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
          <PackageSearch className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No items found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No lost or found items matched your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between gap-4 shadow-xs hover:shadow-md ${
                item.status === "claimed"
                  ? "border-emerald-500/30 bg-emerald-50/10"
                  : "border-gray-200 dark:border-slate-800 hover:border-amber-500/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      item.status === "claimed"
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {item.status === "claimed" ? "✅ Handed Over" : "🟢 In Custody"}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    {formatIST(item.created_at)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                {item.description && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold truncate">{item.location_found}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="truncate">
                      Found by: <strong className="text-gray-900 dark:text-white">{item.found_by_name}</strong>
                    </span>
                  </div>
                </div>

                {item.status === "claimed" && (
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Handed Over To Claimant
                    </p>
                    <p className="text-gray-700 dark:text-slate-300">
                      <strong>Name:</strong> {item.claimed_by_name} ({item.claimed_by_id})
                    </p>
                    {item.claimed_by_phone && (
                      <p className="text-gray-500 dark:text-slate-400">
                        <strong>Phone:</strong> {item.claimed_by_phone}
                      </p>
                    )}
                    <p className="text-gray-400 text-[11px]">
                      Officer: {item.handover_officer || "Duty Security"} &middot; {formatIST(item.claimed_at)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                {item.status === "in_custody" && (
                  <button
                    onClick={() => {
                      setClaimingItem(item);
                      setClaimantName("");
                      setClaimantId("");
                      setClaimantPhone("");
                    }}
                    className="flex-1 btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                  >
                    <HandMetal className="w-3.5 h-3.5" />
                    <span>Verify & Handover</span>
                  </button>
                )}

                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700/60 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer ml-auto"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col animate-scaleIn my-auto max-h-[90vh]">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 dark:bg-amber-500/15 dark:border-amber-500/30 dark:shadow-[0_0_16px_-2px_rgba(245,158,11,0.35)] text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <PackageSearch className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                    Log Recovered Campus Item
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Register found property for student & visitor custody verification
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4 text-xs overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Item Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell 65W Laptop Charger, Black Wallet, Casio Watch"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <CustomSelect
                      value={newCategory}
                      onChange={setNewCategory}
                      options={CATEGORIES.filter((c) => c.value !== "all")}
                      className="!py-2 !px-3 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Location Found *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Room 204, Library 1st Fl"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Description & Unique Identifiers
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brand, color, stickers, distinctive scratches, contents..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Found By (Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFinderName}
                      onChange={(e) => setNewFinderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Finder Contact Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={newFinderContact}
                      onChange={(e) => setNewFinderContact(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Logging Item..." : "Register Found Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {claimingItem &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col animate-scaleIn my-auto">
              <button
                onClick={() => setClaimingItem(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:shadow-[0_0_16px_-2px_rgba(16,185,129,0.35)] text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                    Handover Verification
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Verify claimant credentials before custody release
                  </p>
                </div>
              </div>

              <form onSubmit={handleClaimHandover} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item to Claim:</span>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                    {claimingItem.title}
                  </p>
                  <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Recovered from {claimingItem.location_found}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Claimant Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of student or visitor"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Roll Number or Official ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BT23CSE026 / Staff ID / Govt ID"
                    value={claimantId}
                    onChange={(e) => setClaimantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={claimantPhone}
                    onChange={(e) => setClaimantPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Handover Duty Officer
                  </label>
                  <input
                    type="text"
                    value={handoverOfficer}
                    onChange={(e) => setHandoverOfficer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClaimingItem(null)}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isClaiming ? "Recording Handover..." : "Confirm & Handover"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
