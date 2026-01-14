"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";
import { Button } from ".";

// Fix Leaflet icon issue
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface LocationPickerProps {
    latitude?: number;
    longitude?: number;
    onLocationSelect: (lat: number, lng: number, address?: string) => void;
}

// Helper for reverse geocoding
const fetchAddress = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.address) {
            // Priority: road + suburb/city
            const addr = data.address;
            const street = addr.road || addr.pedestrian || "";
            const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.hamlet || "";
            const city = addr.city || addr.town || addr.village || addr.county || "";

            // Construct meaningful address: "Street, Area, City"
            let constructed = [];
            if (street) constructed.push(street);
            if (area && area !== city) constructed.push(area);
            if (city) constructed.push(city);

            return constructed.join(", ") || "Ubicación seleccionada";
        }
    } catch (error) {
        console.error("Error reverse geocoding:", error);
    }
    return undefined;
};

function LocationMarker({ onSelect, position }: { onSelect: (lat: number, lng: number) => void; position: [number, number] | null }) {
    const map = useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? <Marker position={position} icon={icon} /> : null;
}

export default function LocationPicker({ latitude, longitude, onLocationSelect }: LocationPickerProps) {
    const [position, setPosition] = useState<[number, number] | null>(
        latitude && longitude ? [latitude, longitude] : null
    );
    const [loadingLoc, setLoadingLoc] = useState(false);

    // Default to Mexico City center if no pos
    const defaultCenter: [number, number] = [19.4326, -99.1332];

    const handleSelect = async (lat: number, lng: number) => {
        setPosition([lat, lng]);
        const address = await fetchAddress(lat, lng);
        onLocationSelect(lat, lng, address);
    }

    const handleGetCurrentLocation = () => {
        setLoadingLoc(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    await handleSelect(latitude, longitude);
                    setLoadingLoc(false);
                },
                (err) => {
                    console.error("Error fetching location", err);
                    setLoadingLoc(false);
                    alert("No se pudo obtener tu ubicación actual.");
                }
            );
        } else {
            setLoadingLoc(false);
            alert("Geolocalización no soportada en este navegador.");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ubicación</label>
                <Button
                    variant="outline"
                    size="sm" // Corrected size
                    onClick={handleGetCurrentLocation}
                    disabled={loadingLoc}
                    className="text-xs flex gap-1"
                    type="button"
                >
                    <Navigation className="h-3 w-3" />
                    {loadingLoc ? "Buscando..." : "Usar mi ubicación actual"}
                </Button>
            </div>

            <div className="h-[300px] w-full rounded-xl overflow-hidden border border-gray-200 z-0 relative">
                <MapContainer
                    center={position || defaultCenter}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        position={position}
                        onSelect={handleSelect}
                    />
                </MapContainer>
            </div>
            <p className="text-xs text-gray-500">Toca en el mapa para ajustar tu ubicación exacta.</p>
        </div>
    );
}
