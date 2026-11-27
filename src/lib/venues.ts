/**
 * Directorio oficial de sedes y canchas de básquetbol (Sede propia y clubes rivales de la zona)
 * con integración a Google Maps y navegación GPS ("Cómo llegar").
 */

export interface VenueInfo {
  clubName: string;
  shortName: string;
  courtName: string;
  address: string;
  city: string;
  province: string;
  googleMapsQuery: string;
  isHomeClub?: boolean;
}

export const HOME_VENUE: VenueInfo = {
  clubName: "Club Atlético Estudiantes de Mercedes",
  shortName: "Estudiantes de Mercedes",
  courtName: "Estadio Centenario - Cancha 1",
  address: "Calle 33 N° 334",
  city: "Mercedes",
  province: "Buenos Aires",
  googleMapsQuery: "Club Atletico Estudiantes Mercedes Buenos Aires Calle 33 334",
  isHomeClub: true,
};

export const REGIONAL_VENUES: VenueInfo[] = [
  HOME_VENUE,
  {
    clubName: "Club Quilmes de Mercedes",
    shortName: "Quilmes de Mercedes",
    courtName: "Gimnasio Rolo Cardinal",
    address: "Calle 12 N° 640 (entre 27 y 29)",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Club Quilmes de Mercedes Calle 12 640 Mercedes Buenos Aires",
  },
  {
    clubName: "Club Mercedes",
    shortName: "Club Mercedes",
    courtName: "Microestadio de Básquet",
    address: "Av. 29 N° 720 (entre 30 y 32)",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Club Mercedes Avenida 29 Mercedes Buenos Aires",
  },
  {
    clubName: "Ateneo de la Juventud de Mercedes",
    shortName: "Ateneo de la Juventud",
    courtName: "Estadio Polideportivo",
    address: "Calle 11 N° 750 (entre 32 y 34)",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Ateneo de la Juventud Mercedes Buenos Aires Calle 11",
  },
  {
    clubName: "Deportivo Colón de Chivilcoy",
    shortName: "Colón de Chivilcoy",
    courtName: "Estadio Oscar y Alfredo Barca",
    address: "Av. Soárez N° 350",
    city: "Chivilcoy",
    province: "Buenos Aires",
    googleMapsQuery: "Club Deportivo Colon Chivilcoy Avenida Soarez",
  },
  {
    clubName: "Club San Martín de Junín",
    shortName: "San Martín de Junín",
    courtName: "Estadio Alcides Schiavoni",
    address: "Siria y Quintana",
    city: "Junín",
    province: "Buenos Aires",
    googleMapsQuery: "Club San Martin Junin Buenos Aires Siria y Quintana",
  },
  {
    clubName: "Club Social y Deportivo Los Indios de Moreno",
    shortName: "Los Indios de Moreno",
    courtName: "Estadio Oscar Vicente Pérez",
    address: "Av. Francisco Piovano 2950",
    city: "Moreno",
    province: "Buenos Aires",
    googleMapsQuery: "Club Los Indios Moreno Avenida Francisco Piovano",
  },
  {
    clubName: "Club Social y Deportivo El Fortín",
    shortName: "El Fortín",
    courtName: "Gimnasio Principal",
    address: "Calle 35 N° 820",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Club El Fortin Mercedes Buenos Aires",
  },
];

/**
 * Resuelve la información completa de la sede y enlaces a Google Maps
 * en función de si el club juega de Local o Visitante, y del nombre del rival o lugar indicado.
 */
export function resolveVenueLocation({
  isHome,
  rival,
  location,
}: {
  isHome?: boolean;
  rival?: string | null;
  location?: string | null;
}): {
  venueTitle: string;
  address: string;
  isHomeVenue: boolean;
  mapsSearchUrl: string;
  mapsDirectionsUrl: string;
} {
  // Si somos locales, siempre es nuestra sede de Calle 33 N° 334
  if (isHome) {
    const fullAddress = `${HOME_VENUE.courtName}, ${HOME_VENUE.address}, ${HOME_VENUE.city}, ${HOME_VENUE.province}`;
    return {
      venueTitle: `${HOME_VENUE.shortName} (${HOME_VENUE.courtName})`,
      address: fullAddress,
      isHomeVenue: true,
      mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        HOME_VENUE.googleMapsQuery,
      )}`,
      mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        HOME_VENUE.googleMapsQuery,
      )}`,
    };
  }

  // Si somos visitantes, buscamos en el catálogo de sedes conocidas por coincidencia en rival o location
  const searchText = `${rival ?? ""} ${location ?? ""}`.toLowerCase();
  const matchedVenue = REGIONAL_VENUES.find((v) => {
    if (v.isHomeClub) return false;
    const vName = v.clubName.toLowerCase();
    const vShort = v.shortName.toLowerCase();
    return (
      (rival && (vName.includes(rival.toLowerCase()) || rival.toLowerCase().includes(vShort))) ||
      (location && vName.includes(location.toLowerCase()))
    );
  });

  if (matchedVenue) {
    const fullAddress = `${matchedVenue.courtName}, ${matchedVenue.address}, ${matchedVenue.city}`;
    return {
      venueTitle: `${matchedVenue.shortName} (${matchedVenue.courtName})`,
      address: fullAddress,
      isHomeVenue: false,
      mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        matchedVenue.googleMapsQuery,
      )}`,
      mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        matchedVenue.googleMapsQuery,
      )}`,
    };
  }

  // Fallback: si no está en el catálogo, armamos la búsqueda con la dirección o el rival proporcionado
  const fallbackQuery = location
    ? `${location}, Mercedes, Buenos Aires`
    : rival
      ? `Club ${rival} basquet cancha`
      : "Club de basquet";

  return {
    venueTitle: rival ? `Cancha de ${rival}` : location || "Cancha deportiva",
    address: location || (rival ? `Sede de ${rival}` : "Dirección a confirmar"),
    isHomeVenue: false,
    mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      fallbackQuery,
    )}`,
    mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      fallbackQuery,
    )}`,
  };
}
