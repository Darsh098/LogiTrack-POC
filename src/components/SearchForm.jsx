import { useState } from "react";
import {
  MapPin,
  Package,
  Box,
  Search,
  RotateCcw,
  Maximize,
  Info,
  CheckCircle2,
  Map as MapIcon,
} from "lucide-react";
import useTruckSearch from "../hooks/useTruckSearch";
import useTruckRoutes from "../hooks/useTruckRoutes";
import TruckListing from "./TruckListing";
import MapComponent from "./MapComponent";
import PlaceSearch from "./PlaceSearch";

const SearchForm = () => {
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [packageWeight, setPackageWeight] = useState(500);
  const [packageVolume, setPackageVolume] = useState(2.5);
  const [distanceThreshold, setDistanceThreshold] = useState(5);
  const [hasSearched, setHasSearched] = useState(false);

  // Map interaction state
  const [selectionMode, setSelectionMode] = useState(null); // 'pickup', 'delivery', or null

  // Search query
  const {
    data: trucks = [],
    isLoading,
    error,
  } = useTruckSearch(
    pickupLocation,
    deliveryLocation,
    packageWeight,
    packageVolume,
    distanceThreshold,
  );

  // Extract trip IDs from search results
  const tripIds = trucks ? trucks.map((t) => t.trip_id) : [];

  // Fetch routes for all returned trucks
  const { data: truckRoutesMap } = useTruckRoutes(tripIds);

  const handleMapLocationSelect = async (coords) => {
    // Reverse geocode clicked location
    const { reverseGeocode } = await import("../utils/nominatim");
    const name = await reverseGeocode(coords.lat, coords.lng);
    const place = {
      name: name || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      lat: coords.lat,
      lng: coords.lng,
    };

    if (selectionMode === "pickup") {
      setPickupLocation(place);
    } else if (selectionMode === "delivery") {
      setDeliveryLocation(place);
    }
    setSelectionMode(null);
  };

  const handleSearch = () => {
    if (pickupLocation && deliveryLocation && packageWeight && packageVolume) {
      setHasSearched(true);
    } else {
      alert("Please fill in all fields");
    }
  };

  const handleReset = () => {
    setPickupLocation(null);
    setDeliveryLocation(null);
    setPackageWeight(500);
    setPackageVolume(2.5);
    setDistanceThreshold(5);
    setHasSearched(false);
    setSelectionMode(null);
  };

  const handleCalculateVolume = (length, width, height) => {
    if (length && width && height) {
      const volume = (length * width * height) / 1000000; // Convert cm³ to m³
      setPackageVolume(parseFloat(volume.toFixed(4)));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative pb-12">
        {/* Left Column: Form & Results */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
                  <span className="p-2 bg-indigo-600 rounded-lg text-white">
                    <Search size={24} />
                  </span>
                  Logitrack
                </h1>
                <p className="text-slate-500 font-medium">
                  Intelligent route matching for your shipments
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg font-semibold transition-colors border border-slate-200"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
                <button
                  onClick={handleSearch}
                  disabled={!pickupLocation || !deliveryLocation}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-semibold shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                >
                  <Search size={18} />
                  Find Trucks
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pickup Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <MapPin size={14} />
                  Pickup Location
                </div>

                <div className="space-y-3">
                  <PlaceSearch
                    value={pickupLocation}
                    onChange={(p) => setPickupLocation(p)}
                    placeholder="Search pickup city..."
                    accentColor="emerald"
                    showCurrentLocation={true}
                  />

                  <div className="flex items-center gap-4">
                    <button
                      className={`text-sm font-semibold flex items-center gap-1 ${selectionMode === "pickup" ? "text-emerald-600" : "text-indigo-600 hover:underline"}`}
                      onClick={() =>
                        setSelectionMode(
                          selectionMode === "pickup" ? null : "pickup",
                        )
                      }
                    >
                      <MapIcon size={14} />
                      {selectionMode === "pickup"
                        ? "Click on map to pick"
                        : "Select on Map"}
                    </button>
                  </div>

                  {pickupLocation && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium border border-emerald-100">
                      <CheckCircle2 size={16} />
                      <span className="truncate" title={pickupLocation.name}>
                        Selected: {pickupLocation.name.split(",")[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
                  <MapPin size={14} className="rotate-180" />
                  Delivery Location
                </div>

                <div className="space-y-3">
                  <PlaceSearch
                    value={deliveryLocation}
                    onChange={(p) => setDeliveryLocation(p)}
                    placeholder="Search delivery city..."
                    accentColor="red"
                  />

                  <div className="flex items-center gap-4">
                    <button
                      className={`text-sm font-semibold flex items-center gap-1 ${selectionMode === "delivery" ? "text-emerald-600" : "text-indigo-600 hover:underline"}`}
                      onClick={() =>
                        setSelectionMode(
                          selectionMode === "delivery" ? null : "delivery",
                        )
                      }
                    >
                      <MapIcon size={14} />
                      {selectionMode === "delivery"
                        ? "Click on map to pick"
                        : "Select on Map"}
                    </button>
                  </div>

                  {deliveryLocation && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium border border-emerald-100">
                      <CheckCircle2 size={16} />
                      <span className="truncate" title={deliveryLocation.name}>
                        Selected: {deliveryLocation.name.split(",")[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 pt-8 border-t border-slate-100">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-xs">
                  <Package size={14} />
                  Weight
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={packageWeight}
                    onChange={(e) =>
                      setPackageWeight(parseFloat(e.target.value))
                    }
                    min="1"
                    className="w-full h-12 px-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    kg
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-xs">
                  <Box size={14} />
                  Volume
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={packageVolume}
                    onChange={(e) =>
                      setPackageVolume(parseFloat(e.target.value))
                    }
                    min="0.001"
                    step="0.01"
                    className="w-full h-12 px-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    m³
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-xs">
                  <Maximize size={14} />
                  Distance Threshold
                </div>
                <div className="space-y-4 pt-2">
                  <input
                    type="range"
                    value={distanceThreshold}
                    onChange={(e) =>
                      setDistanceThreshold(parseInt(e.target.value))
                    }
                    min="1"
                    max="20"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>1km</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {distanceThreshold} km
                    </span>
                    <span>20km</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-4">
                <Info size={16} className="text-indigo-500" />
                Quick Dimension Calculator
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  placeholder="Length (cm)"
                  id="length"
                  className="flex-1 min-w-[120px] h-10 px-3 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                />
                <span className="text-slate-400 font-bold text-xs">×</span>
                <input
                  type="number"
                  placeholder="Width (cm)"
                  id="width"
                  className="flex-1 min-w-[120px] h-10 px-3 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                />
                <span className="text-slate-400 font-bold text-xs">×</span>
                <input
                  type="number"
                  placeholder="Height (cm)"
                  id="height"
                  className="flex-1 min-w-[120px] h-10 px-3 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                />
                <button
                  className="px-4 h-10 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-lg font-bold text-sm transition-all shadow-sm"
                  onClick={() => {
                    const length = parseFloat(
                      document.getElementById("length").value,
                    );
                    const width = parseFloat(
                      document.getElementById("width").value,
                    );
                    const height = parseFloat(
                      document.getElementById("height").value,
                    );
                    handleCalculateVolume(length, width, height);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Display results */}
          {hasSearched && (
            <TruckListing
              trucks={trucks}
              isLoading={isLoading}
              error={error}
              truckRoutesMap={truckRoutesMap}
            />
          )}
        </div>

        {/* Right Column: Map Component */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8 h-[500px] lg:h-[calc(100vh-4rem)] z-10 w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
          <MapComponent
            pickupLocation={pickupLocation}
            deliveryLocation={deliveryLocation}
            selectionMode={selectionMode}
            onLocationSelect={handleMapLocationSelect}
            truckRoutesMap={truckRoutesMap}
            distanceThreshold={distanceThreshold}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
