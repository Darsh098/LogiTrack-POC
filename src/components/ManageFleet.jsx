import { useState } from "react";
import {
  Truck,
  Search,
  Trash2,
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronDown,
  Clock,
  Weight,
  Box,
  Star,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MoreHorizontal,
  ArrowRight,
  Hash,
} from "lucide-react";
import useFleet, {
  useDeleteTrip,
  useUpdateTripStatus,
} from "../hooks/useFleet";

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-sky-100",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-red-100",
    text: "text-red-600",
    dot: "bg-red-400",
  },
};

const ALL_STATUSES = ["ACTIVE", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const TRUCK_TYPES = ["van", "3.5t", "7t", "10t", "24t"];

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseLocation = (loc) => {
  if (!loc || !loc.coordinates) return null;
  return { lat: loc.coordinates[1], lng: loc.coordinates[0] };
};

const CapacityBar = ({ used, total, color }) => {
  const pct = total > 0 ? Math.round(((total - used) / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-500 w-7">{pct}%</span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StatusDropdown = ({ currentStatus, onStatusChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-800 hover:underline transition-colors"
      >
        Change{" "}
        <ChevronDown
          size={12}
          className={`${open ? "rotate-180" : ""} transition-transform`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-6 left-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusChange(s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${s === currentStatus ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s]?.dot}`}
              />
              {STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Stats bar at top
const StatsBar = ({ trips }) => {
  if (!trips) return null;
  const total = trips.length;
  const active = trips.filter((t) => t.trip_status === "ACTIVE").length;
  const inProgress = trips.filter(
    (t) => t.trip_status === "IN_PROGRESS",
  ).length;
  const avgRating =
    trips.reduce((acc, t) => acc + (t.drivers?.rating || 0), 0) / (total || 1);

  const stats = [
    {
      label: "Total Trips",
      value: total,
      icon: <Truck size={18} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Active",
      value: active,
      icon: <CheckCircle2 size={18} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: <Navigation size={18} />,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      label: "Avg. Rating",
      value: avgRating.toFixed(1),
      icon: <Star size={18} />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      suffix: "★",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4"
        >
          <div className={`${s.bg} ${s.color} p-3 rounded-xl`}>{s.icon}</div>
          <div>
            <div className={`text-2xl font-black ${s.color}`}>
              {s.value}
              {s.suffix}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Component
const ManageFleet = ({ onViewOnMap }) => {
  const { data: trips, isLoading, error, refetch } = useFleet();
  const updateStatusMutation = useUpdateTripStatus();
  const deleteTrip = useDeleteTrip();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStatusChange = async (tripId, status) => {
    try {
      await updateStatusMutation.mutateAsync({ tripId, status });
      showToast("Status updated!");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleDelete = async (tripId) => {
    try {
      await deleteTrip.mutateAsync(tripId);
      showToast("Trip deleted.");
      setDeleteConfirmId(null);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const filtered = trips?.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.drivers?.name?.toLowerCase().includes(q) ||
      t.trucks?.license_plate?.toLowerCase().includes(q) ||
      t.trucks?.truck_type?.toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "ALL" || t.trip_status === filterStatus;
    const matchType =
      filterType === "ALL" || t.trucks?.truck_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-slate-500 font-bold">Loading fleet data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <AlertCircle size={36} className="mx-auto mb-3" />
          <div className="font-bold">Error loading fleet data</div>
          <div className="text-sm text-red-400">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <CheckCircle2 size={16} /> {toast.message}
        </div>
      )}

      <StatsBar trips={trips} />

      {/* Filter bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search driver, plate, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium text-slate-700"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {["ALL", ...ALL_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterStatus === s
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-200 text-slate-500 bg-slate-50 hover:border-indigo-300"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none"
        >
          <option value="ALL">All types</option>
          {TRUCK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          className="ml-auto h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {[
                  "Driver",
                  "Truck",
                  "Route",
                  "Capacity",
                  "Dates",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3.5 text-xs font-black text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <MoreHorizontal
                      size={32}
                      className="mx-auto mb-2 opacity-40"
                    />
                    <div className="font-bold">No matching trips found</div>
                  </td>
                </tr>
              )}
              {filtered?.map((trip) => {
                const startLoc = parseLocation(trip.start_location);
                const endLoc = parseLocation(trip.end_location);

                return (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Driver */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">
                        {trip.drivers?.name || "—"}
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold mt-0.5">
                        <Star size={11} fill="currentColor" />
                        {trip.drivers?.rating}
                      </div>
                    </td>

                    {/* Truck */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg">
                          {trip.trucks?.truck_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mt-1">
                        <Hash size={10} />{" "}
                        {trip.trucks?.license_plate || "No plate"}
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-5 py-4">
                      {startLoc && endLoc ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <span className="text-emerald-600">
                            {startLoc.lat.toFixed(2)}, {startLoc.lng.toFixed(2)}
                          </span>
                          <ArrowRight
                            size={12}
                            className="text-slate-300 shrink-0"
                          />
                          <span className="text-red-500">
                            {endLoc.lat.toFixed(2)}, {endLoc.lng.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">No route</span>
                      )}
                      <div className="text-slate-400 text-xs mt-0.5">
                        {trip.route_waypoints?.length || 0} waypoints
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="px-5 py-4 w-36">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                          <Weight size={10} />
                          {trip.remaining_weight_tons}t left
                        </div>
                        <CapacityBar
                          used={
                            trip.total_weight_tons - trip.remaining_weight_tons
                          }
                          total={trip.total_weight_tons}
                          color="bg-indigo-500"
                        />
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                          <Box size={10} />
                          {trip.remaining_volume_m3}m³ left
                        </div>
                        <CapacityBar
                          used={trip.total_volume_m3 - trip.remaining_volume_m3}
                          total={trip.total_volume_m3}
                          color="bg-sky-500"
                        />
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="px-5 py-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(trip.start_time)}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <Clock size={10} />
                        {formatDate(trip.estimated_end_time)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <StatusBadge status={trip.trip_status} />
                        <StatusDropdown
                          currentStatus={trip.trip_status}
                          onStatusChange={(s) => handleStatusChange(trip.id, s)}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {onViewOnMap && (
                          <button
                            onClick={() => onViewOnMap(trip)}
                            title="View on Map"
                            className="h-8 px-3 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-all"
                          >
                            <Navigation size={12} /> Map
                          </button>
                        )}

                        {deleteConfirmId === trip.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(trip.id)}
                              className="h-8 px-2 text-xs font-black bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(trip.id)}
                            title="Delete trip"
                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400">
          Showing {filtered?.length || 0} of {trips?.length || 0} trips
        </div>
      </div>
    </div>
  );
};

export default ManageFleet;
