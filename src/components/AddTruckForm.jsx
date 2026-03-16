import { useState, useCallback } from "react";
import {
  MapPin,
  Truck,
  Euro,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Package,
  Box,
  Clock,
  User,
  Map as MapIcon,
  Hash,
  Weight,
  FileText,
  RotateCcw,
  Plus,
  X,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import useDrivers from "../hooks/useDrivers";
import { useCreateTruckTrip } from "../hooks/useFleet";

// Fix leaflet default icons
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const TRUCK_TYPES = ["van", "3.5t", "7t", "10t", "24t"];

const PRESET_LOCATIONS = {
  "Pristina, Kosovo": { lat: 42.6526, lng: 21.1789 },
  "Belgrade, Serbia": { lat: 44.8176, lng: 20.4581 },
  "Niš, Serbia": { lat: 44.015, lng: 21.0059 },
  "Skopje, North Macedonia": { lat: 41.9973, lng: 21.428 },
  "Tetovë, North Macedonia": { lat: 41.9987, lng: 21.1525 },
  "Tirana, Albania": { lat: 41.3275, lng: 19.8187 },
  "Durrës, Albania": { lat: 41.315, lng: 19.4542 },
  "Podgorica, Montenegro": { lat: 42.4304, lng: 19.2644 },
  "Sofia, Bulgaria": { lat: 42.6977, lng: 23.3219 },
  "Zagreb, Croatia": { lat: 45.815, lng: 16.0122 },
  "Sarajevo, Bosnia": { lat: 43.9159, lng: 18.4131 },
  "Prizren, Kosovo": { lat: 42.2116, lng: 20.7639 },
};

const STATUS_STEPS = ["Truck Details", "Trip Route", "Pricing & Review"];

// Green marker for start
const startIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Red marker for end
const endIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Small blue marker for waypoints
const waypointIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  popupAnchor: [1, -25],
  shadowSize: [30, 30],
});

// Inner map click handler
const RouteMapClickHandler = ({
  mode,
  onStartClick,
  onEndClick,
  onWaypointClick,
}) => {
  useMapEvents({
    click(e) {
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (mode === "start") onStartClick(coords);
      else if (mode === "end") onEndClick(coords);
      else if (mode === "waypoint") onWaypointClick(coords);
    },
  });
  return null;
};

// Step 1: Truck Details
const TruckDetailsStep = ({ data, onChange, drivers, driversLoading }) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        <User size={12} /> Driver
      </label>
      <select
        value={data.driverId}
        onChange={(e) => onChange("driverId", e.target.value)}
        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
      >
        <option value="">Select Driver...</option>
        {!driversLoading &&
          drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — ★ {d.rating} ({d.phone})
            </option>
          ))}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <Truck size={12} /> Truck Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TRUCK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange("truckType", t)}
              className={`h-10 rounded-xl font-bold text-sm border-2 transition-all ${
                data.truckType === t
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <Hash size={12} /> License Plate
        </label>
        <input
          type="text"
          value={data.licensePlate}
          onChange={(e) =>
            onChange("licensePlate", e.target.value.toUpperCase())
          }
          placeholder="e.g. KS-123-AB"
          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 uppercase"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <Weight size={12} /> Max Weight (tons)
        </label>
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={data.maxWeightTons}
          onChange={(e) =>
            onChange("maxWeightTons", parseFloat(e.target.value))
          }
          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <Box size={12} /> Max Volume (m³)
        </label>
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={data.maxVolumeM3}
          onChange={(e) => onChange("maxVolumeM3", parseFloat(e.target.value))}
          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
        />
      </div>
    </div>
  </div>
);

// Step 2: Trip Route
const TripRouteStep = ({ data, onChange }) => {
  const [mapMode, setMapMode] = useState(null); // 'start', 'end', 'waypoint', null

  const handleStartClick = useCallback(
    (coords) => {
      onChange("startLocation", coords);
      setMapMode(null);
    },
    [onChange],
  );

  const handleEndClick = useCallback(
    (coords) => {
      onChange("endLocation", coords);
      setMapMode(null);
    },
    [onChange],
  );

  const handleWaypointClick = useCallback(
    (coords) => {
      onChange("waypoints", [
        ...(data.waypoints || []),
        [coords.lat, coords.lng],
      ]);
    },
    [onChange, data.waypoints],
  );

  const removeWaypoint = (index) => {
    const updated = [...data.waypoints];
    updated.splice(index, 1);
    onChange("waypoints", updated);
  };

  // Build polyline: start → waypoints → end
  const polylinePoints = [];
  if (data.startLocation)
    polylinePoints.push([data.startLocation.lat, data.startLocation.lng]);
  if (data.waypoints) polylinePoints.push(...data.waypoints);
  if (data.endLocation)
    polylinePoints.push([data.endLocation.lat, data.endLocation.lng]);

  const mapModeLabel = {
    start: "Click to set start location",
    end: "Click to set end location",
    waypoint: "Click to add waypoint",
    null: null,
  }[mapMode];

  return (
    <div className="space-y-5">
      {/* Location Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600">
            <MapPin size={12} /> Start (Pickup)
          </label>
          <select
            onChange={(e) => {
              if (e.target.value)
                onChange("startLocation", PRESET_LOCATIONS[e.target.value]);
            }}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-700"
          >
            <option value="">Select preset...</option>
            {Object.keys(PRESET_LOCATIONS).map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMapMode(mapMode === "start" ? null : "start")}
            className={`w-full h-9 text-sm font-bold rounded-xl border-2 flex items-center justify-center gap-1 transition-all ${
              mapMode === "start"
                ? "bg-emerald-600 border-emerald-600 text-white animate-pulse"
                : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <MapIcon size={13} />
            {mapMode === "start" ? "Selecting..." : "Pick on Map"}
          </button>
          {data.startLocation && (
            <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-medium">
              ✓ {data.startLocation.lat.toFixed(4)},{" "}
              {data.startLocation.lng.toFixed(4)}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-500">
            <MapPin size={12} className="rotate-180" /> End (Delivery)
          </label>
          <select
            onChange={(e) => {
              if (e.target.value)
                onChange("endLocation", PRESET_LOCATIONS[e.target.value]);
            }}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm font-medium text-slate-700"
          >
            <option value="">Select preset...</option>
            {Object.keys(PRESET_LOCATIONS).map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMapMode(mapMode === "end" ? null : "end")}
            className={`w-full h-9 text-sm font-bold rounded-xl border-2 flex items-center justify-center gap-1 transition-all ${
              mapMode === "end"
                ? "bg-red-500 border-red-500 text-white animate-pulse"
                : "border-red-200 text-red-500 bg-red-50 hover:bg-red-100"
            }`}
          >
            <MapIcon size={13} />
            {mapMode === "end" ? "Selecting..." : "Pick on Map"}
          </button>
          {data.endLocation && (
            <div className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-medium">
              ✓ {data.endLocation.lat.toFixed(4)},{" "}
              {data.endLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative h-56 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md">
        {mapModeLabel && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-indigo-700 shadow-md animate-pulse pointer-events-none">
            {mapModeLabel}
          </div>
        )}
        <MapContainer
          center={[43.5, 21.0]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <RouteMapClickHandler
            mode={mapMode}
            onStartClick={handleStartClick}
            onEndClick={handleEndClick}
            onWaypointClick={handleWaypointClick}
          />
          {data.startLocation && (
            <Marker
              position={[data.startLocation.lat, data.startLocation.lng]}
              icon={startIcon}
            />
          )}
          {data.endLocation && (
            <Marker
              position={[data.endLocation.lat, data.endLocation.lng]}
              icon={endIcon}
            />
          )}
          {data.waypoints?.map(([lat, lng], i) => (
            <Marker key={i} position={[lat, lng]} icon={waypointIcon} />
          ))}
          {polylinePoints.length >= 2 && (
            <Polyline
              positions={polylinePoints}
              color="#4f46e5"
              weight={3}
              dashArray="6, 6"
            />
          )}
        </MapContainer>
      </div>

      {/* Waypoints & timing */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Intermediate Waypoints ({data.waypoints?.length || 0})
        </span>
        <button
          type="button"
          onClick={() => setMapMode(mapMode === "waypoint" ? null : "waypoint")}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
            mapMode === "waypoint"
              ? "bg-indigo-600 border-indigo-600 text-white animate-pulse"
              : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          <Plus size={12} />
          {mapMode === "waypoint" ? "Click map to add..." : "Add Waypoint"}
        </button>
      </div>
      {data.waypoints?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.waypoints.map(([lat, lng], i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-lg"
            >
              {lat.toFixed(3)}, {lng.toFixed(3)}
              <button
                onClick={() => removeWaypoint(i)}
                className="text-indigo-400 hover:text-red-500 ml-1"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Clock size={12} /> Start Time
          </label>
          <input
            type="datetime-local"
            value={data.startTime}
            onChange={(e) => onChange("startTime", e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Clock size={12} /> Est. End Time
          </label>
          <input
            type="datetime-local"
            value={data.estimatedEndTime}
            onChange={(e) => onChange("estimatedEndTime", e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Weight size={12} /> Available Weight (tons)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={data.totalWeightTons}
            onChange={(e) =>
              onChange("totalWeightTons", parseFloat(e.target.value))
            }
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Box size={12} /> Available Volume (m³)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={data.totalVolumeM3}
            onChange={(e) =>
              onChange("totalVolumeM3", parseFloat(e.target.value))
            }
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
      </div>
    </div>
  );
};

// Step 3: Pricing & Review
const PricingReviewStep = ({ data, truckData, routeData, drivers }) => {
  const driver = drivers?.find((d) => d.id === truckData.driverId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Euro size={12} /> Base Price (€)
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={data.basePriceEur}
            onChange={(e) =>
              data.onChange("basePriceEur", parseFloat(e.target.value))
            }
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Package size={12} /> Per kg (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={data.pricePerKg}
            onChange={(e) =>
              data.onChange("pricePerKg", parseFloat(e.target.value))
            }
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Box size={12} /> Per m³ (€)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={data.pricePerM3}
            onChange={(e) =>
              data.onChange("pricePerM3", parseFloat(e.target.value))
            }
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <FileText size={12} /> Notes
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => data.onChange("notes", e.target.value)}
          placeholder="Optional trip notes..."
          rows={2}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 resize-none"
        />
      </div>

      {/* Review Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
        <div className="font-black text-slate-700 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-indigo-500" /> Trip Summary
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-400 font-semibold">Driver:</span>{" "}
            <span className="font-bold text-slate-700">
              {driver?.name || "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Truck:</span>{" "}
            <span className="font-bold text-slate-700">
              {truckData.truckType} · {truckData.licensePlate || "?"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Capacity:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.totalWeightTons}t / {routeData.totalVolumeM3}m³
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Waypoints:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.waypoints?.length || 0} intermediate
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Start:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.startLocation
                ? `${routeData.startLocation.lat.toFixed(3)}, ${routeData.startLocation.lng.toFixed(3)}`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">End:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.endLocation
                ? `${routeData.endLocation.lat.toFixed(3)}, ${routeData.endLocation.lng.toFixed(3)}`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Base Price:</span>{" "}
            <span className="font-bold text-emerald-700">
              €{data.basePriceEur}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Rate:</span>{" "}
            <span className="font-bold text-slate-700">
              €{data.pricePerKg}/kg · €{data.pricePerM3}/m³
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────── Main Component ─────────────
const AddTruckForm = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState(null);

  // Step data
  const [truckData, setTruckData] = useState({
    driverId: "",
    truckType: "7t",
    licensePlate: "",
    maxWeightTons: 7,
    maxVolumeM3: 20,
  });

  const [routeData, setRouteData] = useState({
    startLocation: null,
    endLocation: null,
    waypoints: [],
    startTime: "",
    estimatedEndTime: "",
    totalWeightTons: 7,
    totalVolumeM3: 20,
  });

  const [pricingData, setPricingData] = useState({
    basePriceEur: 50,
    pricePerKg: 0.05,
    pricePerM3: 5,
    notes: "",
  });

  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const createMutation = useCreateTruckTrip();

  const handleTruckChange = (key, val) =>
    setTruckData((prev) => ({ ...prev, [key]: val }));
  const handleRouteChange = (key, val) =>
    setRouteData((prev) => ({ ...prev, [key]: val }));
  const handlePricingChange = (key, val) =>
    setPricingData((prev) => ({ ...prev, [key]: val }));

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const canProceed = () => {
    if (step === 0)
      return (
        truckData.driverId &&
        truckData.truckType &&
        truckData.maxWeightTons > 0 &&
        truckData.maxVolumeM3 > 0
      );
    if (step === 1)
      return (
        routeData.startLocation &&
        routeData.endLocation &&
        routeData.startTime &&
        routeData.estimatedEndTime
      );
    return true;
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        truckData: {
          driver_id: truckData.driverId,
          truck_type: truckData.truckType,
          license_plate: truckData.licensePlate || null,
          max_weight_tons: truckData.maxWeightTons,
          max_volume_m3: truckData.maxVolumeM3,
          status: "ACTIVE",
        },
        tripData: {
          startLat: routeData.startLocation.lat,
          startLng: routeData.startLocation.lng,
          endLat: routeData.endLocation.lat,
          endLng: routeData.endLocation.lng,
          waypoints: routeData.waypoints,
          totalWeightTons: routeData.totalWeightTons,
          totalVolumeM3: routeData.totalVolumeM3,
          basePriceEur: pricingData.basePriceEur,
          pricePerKg: pricingData.pricePerKg,
          pricePerM3: pricingData.pricePerM3,
          notes: pricingData.notes,
          startTime: new Date(routeData.startTime).toISOString(),
          estimatedEndTime: new Date(routeData.estimatedEndTime).toISOString(),
        },
      });
      showToast("Truck & trip added successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

  const handleReset = () => {
    setStep(0);
    setTruckData({
      driverId: "",
      truckType: "7t",
      licensePlate: "",
      maxWeightTons: 7,
      maxVolumeM3: 20,
    });
    setRouteData({
      startLocation: null,
      endLocation: null,
      waypoints: [],
      startTime: "",
      estimatedEndTime: "",
      totalWeightTons: 7,
      totalVolumeM3: 20,
    });
    setPricingData({
      basePriceEur: 50,
      pricePerKg: 0.05,
      pricePerM3: 5,
      notes: "",
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <CheckCircle2 size={16} />
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 bg-white/20 rounded-xl">
              <Truck size={22} />
            </span>
            Add New Truck & Trip
          </h2>
          <p className="text-indigo-200 mt-1 font-medium">
            Register a new truck and define its route
          </p>

          {/* Step indicators */}
          <div className="flex items-center gap-3 mt-6">
            {STATUS_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                    i < step
                      ? "bg-white text-indigo-600 border-white"
                      : i === step
                        ? "bg-white/20 text-white border-white"
                        : "bg-transparent text-indigo-300 border-indigo-400"
                  }`}
                >
                  {i < step ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span
                  className={`text-sm font-bold ${i === step ? "text-white" : "text-indigo-300"}`}
                >
                  {label}
                </span>
                {i < STATUS_STEPS.length - 1 && (
                  <ChevronRight size={16} className="text-indigo-400 ml-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8">
          {step === 0 && (
            <TruckDetailsStep
              data={truckData}
              onChange={handleTruckChange}
              drivers={drivers}
              driversLoading={driversLoading}
            />
          )}
          {step === 1 && (
            <TripRouteStep data={routeData} onChange={handleRouteChange} />
          )}
          {step === 2 && (
            <PricingReviewStep
              data={{ ...pricingData, onChange: handlePricingChange }}
              truckData={truckData}
              routeData={routeData}
              drivers={drivers}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={step === 0 ? handleReset : () => setStep(step - 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              {step === 0 ? (
                <>
                  <RotateCcw size={16} /> Reset
                </>
              ) : (
                <>
                  <ChevronLeft size={16} /> Back
                </>
              )}
            </button>

            {step < 2 ? (
              <button
                type="button"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                {createMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Save Truck & Trip
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTruckForm;
