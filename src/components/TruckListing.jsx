// components/TruckListing.jsx
// Display ranked list of matching trucks

import React from "react";
import {
  CheckCircle2,
  Truck,
  Star,
  Weight,
  Box,
  Clock,
  Navigation,
  Euro,
  BarChart3,
  ChevronDown,
  AlertCircle,
  Loader2,
} from "lucide-react";

const TruckListing = ({ trucks, isLoading, error, truckRoutesMap }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-semibold animate-pulse text-lg">
          Searching for best matches...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 text-red-700">
        <AlertCircle className="shrink-0" size={24} />
        <div>
          <h3 className="font-bold">Search Failed</h3>
          <p className="text-sm opacity-90">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!trucks || trucks.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <Truck size={40} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          No matching trucks found
        </h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          Try expanding your distance threshold or adjusting pickup/delivery
          locations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
            <CheckCircle2 size={16} />
            Search Completed
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Found {trucks.length} matching trucks
          </h2>
          <p className="text-slate-500 font-medium">
            Ranked by match score efficiency
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
            Proximity
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Rating
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span> Pricing
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trucks.map((truck, index) => (
          <TruckCard
            key={truck.trip_id}
            truck={truck}
            rank={index + 1}
            routeColor={truckRoutesMap?.[truck.trip_id]?.color}
          />
        ))}
      </div>
    </div>
  );
};

const TruckCard = ({ truck, rank, routeColor }) => {
  const getScoreVariant = (score) => {
    if (score >= 80)
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-100",
        accent: "bg-emerald-500",
        label: "Excellent Match",
      };
    if (score >= 60)
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-100",
        accent: "bg-amber-500",
        label: "Great Match",
      };
    return {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-100",
      accent: "bg-slate-500",
      label: "Fair Match",
    };
  };

  const variant = getScoreVariant(truck.match_score);

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative">
      {/* Route Color Top Indicator */}
      {routeColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 z-20"
          style={{ backgroundColor: routeColor }}
        />
      )}

      {/* Rank Badge */}
      <div
        className="absolute top-0 left-0 w-12 h-12 text-white flex items-center justify-center font-black text-lg skew-x-[-15deg] -translate-x-2 -translate-y-1 shadow-lg z-10 transition-colors"
        style={{ backgroundColor: routeColor || "#0f172a" }}
      >
        <span className="skew-x-[15deg] ml-1">#{rank}</span>
      </div>

      {/* Header with match score */}
      <div
        className={`p-6 pb-4 flex justify-between items-start pt-8 border-b border-dashed border-slate-100 ${variant.bg}/30`}
      >
        <div className="pl-6">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {truck.driver_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
              <Star size={14} fill="currentColor" /> {truck.driver_rating}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
              {truck.truck_type}
            </span>
          </div>
        </div>
        <div className={`flex flex-col items-end ${variant.text}`}>
          <div className="text-3xl font-black tabular-nums">
            {truck.match_score}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest">
            {variant.label}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Capacity bars */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Weight size={12} /> Weight
              </span>
              <span className="text-slate-700">
                {Math.round(
                  (truck.remaining_weight_tons /
                    (truck.remaining_weight_tons + 2)) *
                    100,
                )}
                %
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                style={{
                  width: `${(truck.remaining_weight_tons / (truck.remaining_weight_tons + 2)) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 font-bold">
              {truck.remaining_weight_tons}t available
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Box size={12} /> Volume
              </span>
              <span className="text-slate-700">
                {Math.round(
                  (truck.remaining_volume_m3 /
                    (truck.remaining_volume_m3 + 11)) *
                    100,
                )}
                %
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                style={{
                  width: `${(truck.remaining_volume_m3 / (truck.remaining_volume_m3 + 11)) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 font-bold">
              {truck.remaining_volume_m3}m³ available
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50 bg-slate-50/50 -mx-6 px-6">
          <div className="text-center">
            <div className="text-slate-400 mb-1 flex justify-center">
              <Navigation size={14} />
            </div>
            <div className="text-sm font-black text-slate-700">
              {truck.distance_to_pickup_km}km
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">
              To Pickup
            </div>
          </div>
          <div className="text-center border-x border-slate-100">
            <div className="text-slate-400 mb-1 flex justify-center">
              <Clock size={14} />
            </div>
            <div className="text-sm font-black text-slate-700">
              {truck.eta_at_pickup_minutes}m
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">
              ETA
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 mb-1 flex justify-center">
              <Truck size={14} />
            </div>
            <div className="text-sm font-black text-slate-700">
              {truck.estimated_delivery_hours}h
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">
              Delivery
            </div>
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Estimated Rate
            </div>
            <div className="text-2xl font-black text-slate-900 flex items-center">
              <Euro size={20} className="text-indigo-600 mr-1" />
              {truck.estimated_price_eur}
            </div>
          </div>
          <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95">
            Book
          </button>
        </div>
        {/* Match Breakdown */}

        <details className="group/breakdown">
          <summary className="flex items-center gap-2 text-xs font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors list-none">
            <BarChart3 size={14} />
            View Efficiency Breakdown
            <ChevronDown
              size={14}
              className="group-open/breakdown:rotate-180 transition-transform"
            />
          </summary>
          <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl space-y-3 border border-indigo-100/50">
            {[
              { label: "Distance", val: "85%" },
              { label: "Carrier Rating", val: "92%" },
              { label: "Cost Efficiency", val: "78%" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center text-xs"
              >
                <span className="font-bold text-indigo-900/60">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1 bg-indigo-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: item.val }}
                    ></div>
                  </div>
                  <span className="font-black text-indigo-700 w-8">
                    {item.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default TruckListing;
