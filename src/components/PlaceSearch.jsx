import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, LocateFixed, X } from "lucide-react";
import { searchPlace } from "../utils/nominatim";

/**
 * Reusable place search input with Nominatim autocomplete.
 * Props:
 *   value: { name, lat, lng } | null
 *   onChange: (place) => void
 *   placeholder: string
 *   accentColor: 'emerald' | 'red' | 'indigo' (default indigo)
 *   showCurrentLocation: boolean
 */
const PlaceSearch = ({
  value,
  onChange,
  placeholder = "Search location...",
  accentColor = "indigo",
  showCurrentLocation = false,
}) => {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const colors =
    {
      emerald: {
        ring: "focus:ring-emerald-400",
        highlight: "text-emerald-700",
        dot: "bg-emerald-500",
        hover: "hover:bg-emerald-50",
      },
      red: {
        ring: "focus:ring-red-400",
        highlight: "text-red-600",
        dot: "bg-red-500",
        hover: "hover:bg-red-50",
      },
      indigo: {
        ring: "focus:ring-indigo-400",
        highlight: "text-indigo-700",
        dot: "bg-indigo-500",
        hover: "hover:bg-indigo-50",
      },
    }[accentColor] || colors?.indigo;

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query === value?.name) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlace(query);
        setResults(res);
        setOpen(res.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (place) => {
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    onChange(place);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { reverseGeocode } = await import("../utils/nominatim");
        const name = await reverseGeocode(coords.latitude, coords.longitude);
        const place = {
          name:
            name ||
            `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          lat: coords.latitude,
          lng: coords.longitude,
        };
        setQuery(place.name);
        onChange(place);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <MapPin
          size={15}
          className={`absolute left-3 ${colors.highlight} pointer-events-none`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full h-11 pl-9 pr-${value || query ? "16" : "4"} bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${colors.ring} outline-none font-medium text-slate-700 text-sm transition-all`}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {loading && (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          )}
          {(query || value) && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-300 hover:text-slate-500 p-1"
            >
              <X size={13} />
            </button>
          )}
          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={locating}
              title="Use current location"
              className={`p-1 ${colors.highlight} hover:opacity-70 transition-opacity`}
            >
              {locating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LocateFixed size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-[2000] w-full top-12 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {results.map((place, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(place)}
              className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 border-b border-slate-50 last:border-0 ${colors.hover} transition-colors`}
            >
              <span
                className={`mt-0.5 w-2 h-2 rounded-full ${colors.dot} shrink-0`}
              />
              <span>
                <div className="font-semibold text-slate-800">{place.name}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {place.displayName}
                </div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;
