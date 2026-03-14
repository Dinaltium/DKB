import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const BusMap = ({ stops = [] }) => {
  const center = useMemo(() => {
    if (!stops.length) {
      return [13.0, 74.8];
    }
    const lat = stops.reduce((acc, stop) => acc + stop.lat, 0) / stops.length;
    const lng = stops.reduce((acc, stop) => acc + stop.lng, 0) / stops.length;
    return [lat, lng];
  }, [stops]);

  const polyline = stops.map((stop) => [stop.lat, stop.lng]);

  return (
    <div data-testid="bus-route-map-wrapper" className="ticket-stub overflow-hidden rounded-lg">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        className="h-[280px] w-full md:h-[360px]"
        data-testid="bus-route-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Polyline positions={polyline} color="#0E7C86" weight={5} />
        {stops.map((stop) => (
          <Marker
            key={stop.name}
            position={[stop.lat, stop.lng]}
            icon={markerIcon}
            data-testid={`route-stop-marker-${stop.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Popup>{stop.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
