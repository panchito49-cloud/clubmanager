/**
 * Directorio oficial de sedes y clubes de la Liga de Básquetbol.
 * Validados exactamente 10 clubes oficiales con sus escudos e integración
 * a Google Maps y navegación GPS ("Cómo llegar").
 */

export interface LeagueClub {
  id: string;
  name: string;
  clubName?: string;
  shortName: string;
  badgeUrl: string;
  courtName: string;
  address: string;
  city: string;
  province: string;
  googleMapsQuery: string;
  isHomeClub?: boolean;
}

export interface VenueInfo extends LeagueClub {}

/**
 * 1. Club Atlético Estudiantes de Mercedes (Sede anfitriona y dueña del SaaS)
 */
export const HOME_VENUE: VenueInfo = {
  id: "estudiantes",
  name: "Club Atlético Estudiantes",
  clubName: "Club Atlético Estudiantes de Mercedes",
  shortName: "Estudiantes",
  badgeUrl: "/escudos/estudiantes.png",
  courtName: "Estadio Centenario - Cancha 1",
  address: "Calle 33 N° 334",
  city: "Mercedes",
  province: "Buenos Aires",
  googleMapsQuery: "Club Atletico Estudiantes Mercedes Buenos Aires Calle 33 334",
  isHomeClub: true,
};

/**
 * Los 10 clubes oficiales de la Liga de Básquetbol:
 * 1. Ateneo de la Juventud
 * 2. Club Atlético Estudiantes
 * 3. Club Mercedes
 * 4. Club San Carlos
 * 5. Club Tempestad
 * 6. Club Unión Carmeña
 * 7. Costa Brava
 * 8. Dorrego
 * 9. Sarmiento
 * 10. Timón
 */
export const LEAGUE_CLUBS: VenueInfo[] = [
  {
    id: "ateneo",
    name: "Ateneo de la Juventud",
    shortName: "Ateneo",
    badgeUrl: "/escudos/ateneo.png",
    courtName: "Estadio Polideportivo Ateneo",
    address: "Calle 11 N° 750 (entre 32 y 34)",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Ateneo de la Juventud Mercedes Buenos Aires Calle 11",
  },
  HOME_VENUE,
  {
    id: "club-mercedes",
    name: "Club Mercedes",
    shortName: "Club Mercedes",
    badgeUrl: "/escudos/club-mercedes.png",
    courtName: "Microestadio de Básquet Club Mercedes",
    address: "Av. 29 N° 720 (entre 30 y 32)",
    city: "Mercedes",
    province: "Buenos Aires",
    googleMapsQuery: "Club Mercedes Avenida 29 Mercedes Buenos Aires",
  },
  {
    id: "san-carlos",
    name: "Club San Carlos",
    shortName: "San Carlos",
    badgeUrl: "/escudos/san-carlos.png",
    courtName: "Gimnasio Social y Deportivo San Carlos",
    address: "Ruta 8 y Belgrano",
    city: "Capitán Sarmiento",
    province: "Buenos Aires",
    googleMapsQuery: "Club San Carlos Capitan Sarmiento Buenos Aires",
  },
  {
    id: "tempestad",
    name: "Club Tempestad",
    shortName: "Club Tempestad",
    badgeUrl: "/escudos/tempestad.png",
    courtName: "Estadio Principal Tempestad",
    address: "Lavalle 450",
    city: "San Antonio de Areco",
    province: "Buenos Aires",
    googleMapsQuery: "Club Tempestad San Antonio de Areco",
  },
  {
    id: "union-carmena",
    name: "Club Unión Carmeña",
    shortName: "Unión Carmeña",
    badgeUrl: "/escudos/union-carmena.png",
    courtName: "Gimnasio Unión Carmeña",
    address: "Sarmiento y Rivadavia",
    city: "Carmen de Areco",
    province: "Buenos Aires",
    googleMapsQuery: "Club Union Carmena Carmen de Areco Buenos Aires",
  },
  {
    id: "costa-brava",
    name: "Club Social y Deportivo Costa Brava",
    shortName: "Costa Brava",
    badgeUrl: "/escudos/costa-brava.png",
    courtName: "Gimnasio Costa Brava",
    address: "Av. 25 de Mayo 650",
    city: "Suipacha",
    province: "Buenos Aires",
    googleMapsQuery: "Club Costa Brava Suipacha Buenos Aires",
  },
  {
    id: "dorrego",
    name: "Club Social y Deportivo Coronel Dorrego",
    shortName: "Dorrego",
    badgeUrl: "/escudos/dorrego.png",
    courtName: "Microestadio Dorrego",
    address: "Calle 22 N° 550",
    city: "Navarro",
    province: "Buenos Aires",
    googleMapsQuery: "Club Coronel Dorrego Navarro Buenos Aires",
  },
  {
    id: "sarmiento",
    name: "Club Sarmiento",
    shortName: "Sarmiento",
    badgeUrl: "/escudos/sarmiento.png",
    courtName: "Estadio Club Sarmiento",
    address: "Mitre y Alem",
    city: "Rawson / Chacabuco",
    province: "Buenos Aires",
    googleMapsQuery: "Club Sarmiento Rawson Chacabuco Buenos Aires",
  },
  {
    id: "timon",
    name: "Club Náutico El Timón",
    shortName: "El Timón",
    badgeUrl: "/escudos/timon.png",
    courtName: "Gimnasio de la Ribera",
    address: "Av. Flandes y Río Luján",
    city: "Jáuregui, Luján",
    province: "Buenos Aires",
    googleMapsQuery: "Club Nautico El Timon Jauregui Lujan Buenos Aires",
  },
];

/**
 * Compatible con exportación previa REGIONAL_VENUES
 */
export const REGIONAL_VENUES: VenueInfo[] = LEAGUE_CLUBS;

/**
 * Obtiene el escudo de un equipo o rival a partir de su nombre
 */
export function getTeamBadge(teamName?: string | null): string {
  if (!teamName) return "/escudos/estudiantes.png";
  const nameLower = teamName.toLowerCase();

  const found = LEAGUE_CLUBS.find((c) => {
    const cName = c.name.toLowerCase();
    const cShort = c.shortName.toLowerCase();
    const cId = c.id.toLowerCase();
    return (
      nameLower.includes(cShort) ||
      cName.includes(nameLower) ||
      nameLower.includes(cId) ||
      cShort.includes(nameLower)
    );
  });

  return found?.badgeUrl ?? "/escudos/estudiantes.png";
}

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
  badgeUrl: string;
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
      badgeUrl: HOME_VENUE.badgeUrl,
      mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        HOME_VENUE.googleMapsQuery,
      )}`,
      mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        HOME_VENUE.googleMapsQuery,
      )}`,
    };
  }

  // Si somos visitantes, buscamos en el catálogo de los 10 clubes de la liga
  const searchText = `${rival ?? ""} ${location ?? ""}`.toLowerCase();
  const matchedVenue = LEAGUE_CLUBS.find((v) => {
    if (v.isHomeClub) return false;
    const vName = v.name.toLowerCase();
    const vShort = v.shortName.toLowerCase();
    return (
      (rival && (vName.includes(rival.toLowerCase()) || rival.toLowerCase().includes(vShort))) ||
      (location && (vName.includes(location.toLowerCase()) || location.toLowerCase().includes(vShort))) ||
      searchText.includes(vShort)
    );
  });

  if (matchedVenue) {
    const fullAddress = `${matchedVenue.courtName}, ${matchedVenue.address}, ${matchedVenue.city}`;
    return {
      venueTitle: `${matchedVenue.shortName} (${matchedVenue.courtName})`,
      address: fullAddress,
      isHomeVenue: false,
      badgeUrl: matchedVenue.badgeUrl,
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
    ? `${location}, Buenos Aires`
    : rival
      ? `Club ${rival} basquet cancha`
      : "Club de basquet";

  return {
    venueTitle: rival ? `Cancha de ${rival}` : location || "Cancha deportiva",
    address: location || (rival ? `Sede de ${rival}` : "Dirección a confirmar"),
    isHomeVenue: false,
    badgeUrl: getTeamBadge(rival),
    mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      fallbackQuery,
    )}`,
    mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      fallbackQuery,
    )}`,
  };
}
