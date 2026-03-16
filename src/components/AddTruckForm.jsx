import { useState, useCallback } from "react";
import {
  Truck,
  Euro,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Package,
  Box,
  Clock,
  User,
  Hash,
  Weight,
  FileText,
  RotateCcw,
  Navigation,
  Loader2,
  GripVertical,
  X,
  Plus,
  MapPin,
  Route,
  AlertCircle,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import useDrivers from "../hooks/useDrivers";
import { useCreateTruckTrip } from "../hooks/useFleet";
import PlaceSearch from "./PlaceSearch";
import {
  fetchRoutes,
  sampleGeometry,
  toLinestringWKT,
  toWaypointStrings,
} from "../utils/osrm";
import { extractCitiesFromRoute } from "../utils/nominatim";

// Fix Leaflet default icons
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

const TRUCK_TYPES = ["van", "3.5t", "7t", "10t", "24t"];
const STATUS_STEPS = ["Truck Details", "Trip Route", "Pricing & Review"];
const ROUTE_ALT_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b"];

// ─── Step 1: Truck Details ─────────────────────────────────────────────────────
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

// ─── Step 2: Trip Route ─────────────────────────────────────────────────────────
const TripRouteStep = ({ data, onChange }) => {
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [fetchingRoutes, setFetchingRoutes] = useState(false);
  const [extractingCities, setExtractingCities] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [newStopQuery, setNewStopQuery] = useState(false);

  const canFindRoutes = data.startLocation && data.endLocation;

  const handleFindRoutes = async () => {
    if (!canFindRoutes) return;
    setFetchingRoutes(true);
    setRouteError(null);
    setRouteAlternatives([]);
    onChange("selectedRouteIndex", null);
    onChange("stops", []);
    onChange("routeGeometry", null);

    try {
      const routes = await fetchRoutes(
        [data.startLocation, data.endLocation],
        true,
      );
      setRouteAlternatives(routes);
    } catch (err) {
      setRouteError("Could not fetch routes. Check your internet connection.");
    } finally {
      setFetchingRoutes(false);
    }
  };

  const handleSelectRoute = async (index) => {
    onChange("selectedRouteIndex", index);
    const geometry = routeAlternatives[index].geometry;
    onChange("routeGeometry", geometry);

    // Extract city stops in background
    setExtractingCities(true);
    try {
      const cities = await extractCitiesFromRoute(geometry, 10);
      onChange(
        "stops",
        cities.map((c, i) => ({ ...c, order: i })),
      );
    } catch {
      // Use start/end as fallback stops
      onChange("stops", [
        {
          name: data.startLocation.name,
          lat: data.startLocation.lat,
          lng: data.startLocation.lng,
          order: 0,
        },
        {
          name: data.endLocation.name,
          lat: data.endLocation.lat,
          lng: data.endLocation.lng,
          order: 1,
        },
      ]);
    } finally {
      setExtractingCities(false);
    }
  };

  const removeStop = (i) => {
    const updated = data.stops.filter((_, idx) => idx !== i);
    onChange(
      "stops",
      updated.map((s, idx) => ({ ...s, order: idx })),
    );
  };

  const moveStop = (i, dir) => {
    const stops = [...data.stops];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    onChange(
      "stops",
      stops.map((s, idx) => ({ ...s, order: idx })),
    );
  };

  const handleAddStop = (place) => {
    if (!place) return;
    const stops = [
      ...(data.stops || []),
      {
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        order: data.stops.length,
      },
    ];
    onChange("stops", stops);
    setNewStopQuery(false);
  };

  // Build map polylines
  const selectedGeometry = data.routeGeometry;
  const stopPositions = data.stops?.map((s) => [s.lat, s.lng]) || [];

  return (
    <div className="space-y-5">
      {/* Origin & Destination */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600">
            <MapPin size={11} /> Origin / Start
          </label>
          <PlaceSearch
            value={data.startLocation}
            onChange={(p) => {
              onChange("startLocation", p);
              setRouteAlternatives([]);
            }}
            placeholder="Search city, address..."
            accentColor="emerald"
            showCurrentLocation
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-500">
            <MapPin size={11} className="rotate-180" /> Destination / End
          </label>
          <PlaceSearch
            value={data.endLocation}
            onChange={(p) => {
              onChange("endLocation", p);
              setRouteAlternatives([]);
            }}
            placeholder="Search city, address..."
            accentColor="red"
          />
        </div>
      </div>

      {/* Find Routes button */}
      <button
        type="button"
        disabled={!canFindRoutes || fetchingRoutes}
        onClick={handleFindRoutes}
        className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all active:scale-95"
      >
        {fetchingRoutes ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Finding routes...
          </>
        ) : (
          <>
            <Route size={16} /> Find Route Alternatives
          </>
        )}
      </button>

      {routeError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle size={15} /> {routeError}
        </div>
      )}

      {/* Route Alternatives */}
      {routeAlternatives.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">
            {routeAlternatives.length} Route option
            {routeAlternatives.length > 1 ? "s" : ""} found — pick one:
          </div>
          <div className="grid grid-cols-1 gap-2">
            {routeAlternatives.map((route, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectRoute(i)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                  data.selectedRouteIndex === i
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: ROUTE_ALT_COLORS[i] }}
                />
                <span className="flex-1">
                  Route {String.fromCharCode(65 + i)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {route.distanceKm} km
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {route.durationMin} min
                </span>
                {data.selectedRouteIndex === i && (
                  <CheckCircle2 size={15} className="text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {extractingCities && (
        <div className="flex items-center gap-3 text-sm text-indigo-600 bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100">
          <Loader2 size={15} className="animate-spin" />
          Extracting city stops along route... (this may take a few seconds)
        </div>
      )}

      {/* Map */}
      <div className="relative h-60 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md">
        <MapContainer
          center={[43.5, 21.0]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {/* Unselected alternatives (dimmed) */}
          {routeAlternatives.map((route, i) =>
            i !== data.selectedRouteIndex ? (
              <Polyline
                key={i}
                positions={route.geometry}
                color={ROUTE_ALT_COLORS[i]}
                weight={3}
                opacity={0.35}
              />
            ) : null,
          )}
          {/* Selected route (bright) */}
          {selectedGeometry && (
            <Polyline
              positions={selectedGeometry}
              color="#4f46e5"
              weight={5}
              opacity={0.9}
            />
          )}
          {/* Start marker */}
          {data.startLocation && (
            <Marker
              position={[data.startLocation.lat, data.startLocation.lng]}
              icon={startIcon}
            >
              <Popup>{data.startLocation.name}</Popup>
            </Marker>
          )}
          {/* End marker */}
          {data.endLocation && (
            <Marker
              position={[data.endLocation.lat, data.endLocation.lng]}
              icon={endIcon}
            >
              <Popup>{data.endLocation.name}</Popup>
            </Marker>
          )}
          {/* Stop markers */}
          {stopPositions.map(([lat, lng], i) => (
            <Marker
              key={i}
              position={[lat, lng]}
              icon={L.divIcon({
                className: "",
                html: `<div style="
                  width:22px;height:22px;border-radius:50%;
                  background:#4f46e5;border:2px solid white;
                  color:white;font-size:10px;font-weight:900;
                  display:flex;align-items:center;justify-content:center;
                  box-shadow:0 2px 6px rgba(0,0,0,0.3);
                ">${i + 1}</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              })}
            >
              <Popup>
                <strong>Stop {i + 1}</strong>
                <br />
                {data.stops[i]?.name}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Stops editor */}
      {data.stops?.length > 0 && !extractingCities && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Route Stops ({data.stops.length})
            </span>
            <button
              type="button"
              onClick={() => setNewStopQuery(!newStopQuery)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-all"
            >
              <Plus size={11} /> Add Stop
            </button>
          </div>

          {newStopQuery && (
            <PlaceSearch
              value={null}
              onChange={handleAddStop}
              placeholder="Search stop to add..."
              accentColor="indigo"
            />
          )}

          <div className="space-y-1.5">
            {data.stops.map((stop, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 group"
              >
                <GripVertical size={14} className="text-slate-300 shrink-0" />
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                  {stop.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveStop(i, -1)}
                    className="text-slate-400 hover:text-slate-700 p-1 disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === data.stops.length - 1}
                    onClick={() => moveStop(i, 1)}
                    className="text-slate-400 hover:text-slate-700 p-1 disabled:opacity-20"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(i)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing & Capacity */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
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

// ─── Step 3: Pricing & Review ──────────────────────────────────────────────────
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

      {/* Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
        <div className="font-black text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
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
            <span className="text-slate-400 font-semibold">From:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.startLocation?.name || "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">To:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.endLocation?.name || "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Stops:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.stops?.length || 0} cities
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Capacity:</span>{" "}
            <span className="font-bold text-slate-700">
              {routeData.totalWeightTons}t / {routeData.totalVolumeM3}m³
            </span>
          </div>
        </div>

        {routeData.stops?.length > 0 && (
          <div className="pt-2 border-t border-indigo-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Route Stops
            </div>
            <div className="flex flex-wrap gap-1.5">
              {routeData.stops.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-white border border-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 text-[9px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  {s.name.split(",")[0]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const AddTruckForm = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState(null);

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
    routeGeometry: null,
    selectedRouteIndex: null,
    stops: [],
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
  const handleRouteChange = useCallback(
    (key, val) => setRouteData((prev) => ({ ...prev, [key]: val })),
    [],
  );
  const handlePricingChange = (key, val) =>
    setPricingData((prev) => ({ ...prev, [key]: val }));

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const canProceed = () => {
    if (step === 0)
      return (
        truckData.driverId && truckData.truckType && truckData.maxWeightTons > 0
      );
    if (step === 1) {
      return (
        routeData.startLocation &&
        routeData.endLocation &&
        routeData.routeGeometry &&
        routeData.startTime &&
        routeData.estimatedEndTime
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      const geometry = routeData.routeGeometry;
      const sampled = sampleGeometry(geometry, 200);

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
          waypoints: [], // intermediates already in geometry
          totalWeightTons: routeData.totalWeightTons,
          totalVolumeM3: routeData.totalVolumeM3,
          basePriceEur: pricingData.basePriceEur,
          pricePerKg: pricingData.pricePerKg,
          pricePerM3: pricingData.pricePerM3,
          notes: pricingData.notes,
          startTime: new Date(routeData.startTime).toISOString(),
          estimatedEndTime: new Date(routeData.estimatedEndTime).toISOString(),
          routeWaypointStrings: toWaypointStrings(sampled),
          linestringWKT: toLinestringWKT(sampled),
          tripStops: routeData.stops,
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
      routeGeometry: null,
      selectedRouteIndex: null,
      stops: [],
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
            Register a truck and define its road-mapped route
          </p>
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
