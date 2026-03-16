import React, { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix standard Leaflet icons in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for User Location
const pickupIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Dynamic SVG Markers for Truck Locations
const createColoredMarker = (color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.007 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white" stroke="none"/></svg>`;
  const iconUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

  return new L.Icon({
    iconUrl,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    shadowSize: [30, 30],
    shadowAnchor: [10, 30],
  });
};

const createColoredFlag = (color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
  const iconUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

  return new L.Icon({
    iconUrl,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 25],
    iconAnchor: [5, 25],
    popupAnchor: [0, -25],
    shadowSize: [30, 30],
    shadowAnchor: [10, 30],
  });
};

// Map controls to bind click events and bounds
const MapControls = ({
  onLocationSelect,
  selectionMode,
  pickupLocation,
  deliveryLocation,
  truckRoutesMap,
}) => {
  const map = useMap();
  const userInteracted = useRef(false);
  const prevLocations = useRef({ pickup: null, delivery: null });

  useMapEvents({
    click(e) {
      if (selectionMode && onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
    dragstart() {
      userInteracted.current = true;
    },
    zoomstart() {
      userInteracted.current = true;
    },
  });

  useEffect(() => {
    // Reset user interaction flag if the pickup or delivery locations materially changed
    const pickupChanged =
      JSON.stringify(pickupLocation) !==
      JSON.stringify(prevLocations.current.pickup);
    const deliveryChanged =
      JSON.stringify(deliveryLocation) !==
      JSON.stringify(prevLocations.current.delivery);

    if (pickupChanged || deliveryChanged) {
      userInteracted.current = false;
      prevLocations.current = {
        pickup: pickupLocation,
        delivery: deliveryLocation,
      };
    }

    if (userInteracted.current) {
      return; // Skip auto-zooming if they manually moved the map
    }

    const bounds = L.latLngBounds();
    let hasPoints = false;

    if (pickupLocation) {
      bounds.extend([pickupLocation.lat, pickupLocation.lng]);
      hasPoints = true;
    }
    if (deliveryLocation) {
      bounds.extend([deliveryLocation.lat, deliveryLocation.lng]);
      hasPoints = true;
    }

    if (truckRoutesMap) {
      Object.keys(truckRoutesMap).forEach((tripId) => {
        const routeData = truckRoutesMap[tripId];

        if (routeData.routeWaypoints && routeData.routeWaypoints.length > 0) {
          routeData.routeWaypoints.forEach((point) => bounds.extend(point));
          hasPoints = true;
        }

        if (routeData.startLocation) {
          bounds.extend([
            routeData.startLocation.lat,
            routeData.startLocation.lng,
          ]);
          hasPoints = true;
        }

        if (routeData.endLocation) {
          bounds.extend([routeData.endLocation.lat, routeData.endLocation.lng]);
          hasPoints = true;
        }
      });
    }

    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [map, pickupLocation, deliveryLocation, truckRoutesMap]);

  return null;
};

const MapComponent = ({
  pickupLocation,
  deliveryLocation,
  onLocationSelect,
  selectionMode,
  truckRoutesMap, // Object mapping: { tripId: { routeWaypoints, startLocation, endLocation, color } }
  distanceThreshold, // Search radius in km
}) => {
  const defaultCenter = [43.5, 21.0];
  const zoom = 6;

  // Memoize icons to avoid recreating them constantly
  const iconCache = useMemo(() => {
    const cache = {};
    if (truckRoutesMap) {
      Object.values(truckRoutesMap).forEach((val) => {
        if (!cache[val.color]) {
          cache[val.color] = {
            start: createColoredMarker(val.color),
            end: createColoredFlag(val.color),
          };
        }
      });
    }
    return cache;
  }, [truckRoutesMap]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      {selectionMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-slate-200 text-sm font-bold animate-pulse text-indigo-700 pointer-events-none">
          Click on the map to select {selectionMode} location
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapControls
          onLocationSelect={onLocationSelect}
          selectionMode={selectionMode}
          pickupLocation={pickupLocation}
          deliveryLocation={deliveryLocation}
          truckRoutesMap={truckRoutesMap}
        />

        {/* User's Input locations */}
        {pickupLocation && (
          <>
            <Marker
              position={[pickupLocation.lat, pickupLocation.lng]}
              icon={pickupIcon}
            >
              <Popup className="font-semibold text-emerald-700">
                Your Requested Pickup
              </Popup>
            </Marker>
            {distanceThreshold && (
              <Circle
                center={[pickupLocation.lat, pickupLocation.lng]}
                radius={distanceThreshold * 1000}
                pathOptions={{
                  color: "#10b981",
                  fillColor: "#10b981",
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: "4, 4",
                }}
              />
            )}
          </>
        )}

        {deliveryLocation && (
          <>
            <Marker
              position={[deliveryLocation.lat, deliveryLocation.lng]}
              icon={deliveryIcon}
            >
              <Popup className="font-semibold text-red-700">
                Your Requested Delivery
              </Popup>
            </Marker>
            {distanceThreshold && (
              <Circle
                center={[deliveryLocation.lat, deliveryLocation.lng]}
                radius={distanceThreshold * 1000}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: "4, 4",
                }}
              />
            )}
          </>
        )}

        {/* Truck actual routes and locations */}
        {truckRoutesMap &&
          Object.entries(truckRoutesMap).map(
            ([
              tripId,
              { routeWaypoints, startLocation, endLocation, stops, color },
            ]) => (
              <React.Fragment key={tripId}>
                {/* Truck original starting point */}
                {startLocation && (
                  <Marker
                    position={[startLocation.lat, startLocation.lng]}
                    icon={iconCache[color]?.start}
                  >
                    <Popup className="font-bold">Truck Start Location</Popup>
                  </Marker>
                )}

                {/* Truck destination / ending point */}
                {endLocation && (
                  <Marker
                    position={[endLocation.lat, endLocation.lng]}
                    icon={iconCache[color]?.end}
                  >
                    <Popup className="font-bold">Truck Final Destination</Popup>
                  </Marker>
                )}

                {/* Truck Route Polyline */}
                {routeWaypoints && routeWaypoints.length > 0 && (
                  <Polyline
                    positions={routeWaypoints}
                    color={color}
                    weight={4}
                    opacity={0.8}
                    dashArray="1, 8"
                    lineCap="round"
                  >
                    <Popup className="font-bold">Truck Route</Popup>
                  </Polyline>
                )}

                {/* Stop markers along the route */}
                {stops &&
                  stops.map((stop, i) => (
                    <Marker
                      key={`stop-${tripId}-${i}`}
                      position={[stop.lat, stop.lng]}
                      icon={L.divIcon({
                        className: "",
                        html: `<div style="
                        width:22px;height:22px;border-radius:50%;
                        background:${color};border:2px solid white;
                        color:white;font-size:10px;font-weight:900;
                        display:flex;align-items:center;justify-content:center;
                        box-shadow:0 2px 6px rgba(0,0,0,0.3);
                      ">${i + 1}</div>`,
                        iconSize: [22, 22],
                        iconAnchor: [11, 11],
                      })}
                    >
                      <Popup>
                        <strong style={{ color }}>Stop {i + 1}</strong>
                        <br />
                        {stop.name}
                      </Popup>
                    </Marker>
                  ))}
              </React.Fragment>
            ),
          )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
