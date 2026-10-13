'use client';

import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix for default markers
const customIcon = new L.Icon({
    iconUrl: '/images/marker.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

interface MapClubData {
    name: string;
    location: string | null;
    coordinates: { lat: number; lng: number } | null;
}

interface MapClubProps {
    club: MapClubData & { coordinates: { lat: number; lng: number } };
    active?: boolean;
    onClick: () => void;
}

const MapClub = ({ club, onClick }: MapClubProps) => (
    <Marker position={[club.coordinates.lat, club.coordinates.lng]} icon={customIcon} eventHandlers={{ click: onClick }}>
        <Popup>
            <div className="text-center">
                <h3 className="font-heading text-lg mb-1">{club.name}</h3>
                {club.location && <p className="text-sm text-neutral-600">{club.location}</p>}
            </div>
        </Popup>
    </Marker>
);

interface DynamicMapProps {
    clubs: MapClubData[];
    activeClub: number | null;
    onClubClick: (index: number) => void;
}

const DynamicMap = ({ clubs, activeClub, onClubClick }: DynamicMapProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-gray-200 rounded-2xl" />;

    return (
        <MapContainer center={[48.8566, 2.3522]} zoom={10} className="w-full h-full" zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clubs.map((club, index) =>
                club.coordinates ? (
                    <MapClub key={`${club.name}-${index}`} club={{ ...club, coordinates: club.coordinates }} active={activeClub === index} onClick={() => onClubClick(index)} />
                ) : null
            )}
        </MapContainer>
    );
};

// Dynamically import this component to prevent SSR issues
export default dynamic(() => Promise.resolve(DynamicMap), { ssr: false });
