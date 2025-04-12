'use client';

import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import type { LocalizedText, Locale } from '@/config/site-config';

// Fix for default markers
const customIcon = new L.Icon({
    iconUrl: '/images/marker.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

interface MapClubProps {
    locale: Locale;
    club: {
        name: LocalizedText;
        location: LocalizedText;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    active?: boolean;
    onClick: () => void;
}

const MapClub = ({ club, locale, onClick }: MapClubProps) => (
    <Marker position={[club.coordinates.lat, club.coordinates.lng]} icon={customIcon} eventHandlers={{ click: onClick }}>
        <Popup>
            <div className="text-center">
                <h3 className="font-heading text-lg mb-1">{club.name[locale]}</h3>
                <p className="text-sm text-neutral-600">{club.location[locale]}</p>
            </div>
        </Popup>
    </Marker>
);

interface DynamicMapProps {
    locale: Locale;
    clubs: MapClubProps['club'][];
    activeClub: number | null;
    onClubClick: (index: number) => void;
}

const DynamicMap = ({ locale, clubs, activeClub, onClubClick }: DynamicMapProps) => {
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
            {clubs.map((club, index) => (
                <MapClub key={club.name[locale]} locale={locale} club={club} active={activeClub === index} onClick={() => onClubClick(index)} />
            ))}
        </MapContainer>
    );
};

// Dynamically import this component to prevent SSR issues
export default dynamic(() => Promise.resolve(DynamicMap), { ssr: false });
