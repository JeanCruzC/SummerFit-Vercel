"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UserProfile } from "@/types";
import { Button } from ".";

// Fix Leaflet icon issue
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface CommunityMapProps {
    users: UserProfile[];
    currentLocation?: { lat: number; lng: number };
}

export default function CommunityMap({ users, currentLocation }: CommunityMapProps) {
    // Default center (CDMX) or user location
    const center: [number, number] = currentLocation
        ? [currentLocation.lat, currentLocation.lng]
        : [19.4326, -99.1332];

    return (
        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0 relative">
            <MapContainer
                center={center}
                zoom={currentLocation ? 12 : 5}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Current User Marker (if available) */}
                {currentLocation && (
                    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={icon}>
                        <Popup>
                            <div className="text-center font-bold">¡Tú estás aquí!</div>
                        </Popup>
                    </Marker>
                )}

                {/* Other Users */}
                {users.map(user => {
                    if (!user.latitude || !user.longitude) return null;
                    return (
                        <Marker key={user.user_id} position={[user.latitude, user.longitude]} icon={icon}>
                            <Popup>
                                <div className="text-center p-2">
                                    <div className="font-bold text-lg">{user.phone ? user.phone : "Usuario"}</div>
                                    <div className="text-xs text-gray-500">{user.location_name}</div>
                                    <div className="mt-2 text-sm text-purple-600 font-medium">{user.goal}</div>
                                    {/* Note: In real app, name should be in profile, currently using phone or placeholder */}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
