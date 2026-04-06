interface PropertyMapProps {
  placeName?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
  className?: string;
}

export function PropertyMap({
  placeName,
  latitude,
  longitude,
  title,
  className,
}: PropertyMapProps) {
  // If we have a place name, use Nominatim search-based embed
  if (placeName) {
    const query = encodeURIComponent(placeName);
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&query=${query}`;
    // Use a more reliable approach: Google Maps embed with place search (free, no API key needed for embed)
    const gmapsSrc = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
      <iframe
        title={title || "Property location"}
        src={gmapsSrc}
        className={className || "h-[300px] w-full rounded-xl"}
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
      />
    );
  }

  // Fallback to lat/lng if available
  if (latitude && longitude) {
    const query = encodeURIComponent(`${latitude},${longitude}`);
    const gmapsSrc = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
      <iframe
        title={title || "Property location"}
        src={gmapsSrc}
        className={className || "h-[300px] w-full rounded-xl"}
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
      />
    );
  }

  return null;
}
