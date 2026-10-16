import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = [28.6139, 77.2090];

function PickerEvents({ onChange }) {
    useMapEvents({
        click(event) {
            onChange({
                lat: Number(event.latlng.lat.toFixed(6)),
                lng: Number(event.latlng.lng.toFixed(6)),
            });
        },
    });

    return null;
}

function RecenterMap({ value }) {
    const map = useMap();

    useEffect(() => {
        if (value?.lat && value?.lng) {
            map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14), { animate: true });
        }
    }, [map, value]);

    return null;
}

export default function LocationPicker({ value, onChange }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const center = value?.lat && value?.lng ? [value.lat, value.lng] : defaultCenter;

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (trimmedQuery.length < 3) {
            setResults([]);
            setError('');
            return undefined;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setLoading(true);
            setError('');

            try {
                const params = new URLSearchParams({
                    q: trimmedQuery,
                    format: 'jsonv2',
                    addressdetails: '1',
                    limit: '5',
                });

                const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                    },
                });

                if (!res.ok) {
                    throw new Error('Location search failed');
                }

                const data = await res.json();
                setResults(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Could not load location suggestions.');
                }
            } finally {
                setLoading(false);
            }
        }, 800);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [query]);

    const selectResult = (result) => {
        const coords = {
            lat: Number(Number(result.lat).toFixed(6)),
            lng: Number(Number(result.lon).toFixed(6)),
        };

        onChange(coords, result.display_name);
        setQuery(result.display_name);
        setResults([]);
    };

    return (
        <div>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search place or address, e.g. Andheri Railway Station"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    style={{ width: '100%' }}
                />
                {(results.length > 0 || loading || error) && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        zIndex: 500,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.22)'
                    }}>
                        {loading && <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>Searching locations...</div>}
                        {error && <div style={{ padding: '10px 12px', color: 'var(--color-danger)', fontSize: '13px' }}>{error}</div>}
                        {!loading && !error && results.map((result) => (
                            <button
                                key={result.place_id}
                                type="button"
                                onClick={() => selectResult(result)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)',
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    lineHeight: 1.4,
                                    cursor: 'pointer'
                                }}
                            >
                                {result.display_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ height: '240px', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <RecenterMap value={value} />
                    <PickerEvents onChange={onChange} />
                    {value?.lat && value?.lng && (
                        <CircleMarker
                            center={[value.lat, value.lng]}
                            radius={8}
                            pathOptions={{
                                color: '#00cfff',
                                fillColor: '#00cfff',
                                fillOpacity: 0.9,
                                weight: 2,
                            }}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
