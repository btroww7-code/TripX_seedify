import { TransitLeg } from './transitService';

interface TicketLink {
  url: string;
  provider: string;
  displayName: string;
}

const OPERATOR_LINKS: Record<string, TicketLink> = {
  'ZTM Warszawa': {
    url: 'https://www.wtp.waw.pl/en/ticket-offer/',
    provider: 'ZTM Warszawa',
    displayName: 'ZTM Warsaw Ticket',
  },
  'Metro Warszawskie': {
    url: 'https://www.metro.waw.pl/en/passenger-information/tickets/',
    provider: 'Metro Warszawskie',
    displayName: 'Metro Warsaw Ticket',
  },
  'PKP Intercity': {
    url: 'https://www.intercity.pl/en/',
    provider: 'PKP Intercity',
    displayName: 'PKP Intercity Ticket',
  },
  'PKP': {
    url: 'https://www.intercity.pl/en/',
    provider: 'PKP',
    displayName: 'PKP Ticket',
  },
  'Koleje Mazowieckie': {
    url: 'https://www.mazowieckie.com.pl/en',
    provider: 'Koleje Mazowieckie',
    displayName: 'KM Ticket',
  },
  'Koleje Śląskie': {
    url: 'https://www.koleje-slaskie.eu/en/',
    provider: 'Koleje Śląskie',
    displayName: 'KŚ Ticket',
  },
  'MZK': {
    url: 'https://www.google.com/search?q=MZK+ticket',
    provider: 'MZK',
    displayName: 'MZK Ticket',
  },
  'MPK': {
    url: 'https://www.google.com/search?q=MPK+ticket',
    provider: 'MPK',
    displayName: 'MPK Ticket',
  },
};

const VEHICLE_TYPE_FALLBACKS: Record<string, TicketLink> = {
  BUS: {
    url: 'https://jakdojade.pl/',
    provider: 'JakDojade',
    displayName: 'Bus Ticket',
  },
  TRAM: {
    url: 'https://jakdojade.pl/',
    provider: 'JakDojade',
    displayName: 'Tram Ticket',
  },
  SUBWAY: {
    url: 'https://jakdojade.pl/',
    provider: 'JakDojade',
    displayName: 'Metro Ticket',
  },
  METRO: {
    url: 'https://jakdojade.pl/',
    provider: 'JakDojade',
    displayName: 'Metro Ticket',
  },
  RAIL: {
    url: 'https://www.intercity.pl/en/',
    provider: 'PKP Intercity',
    displayName: 'Train Ticket',
  },
  TRAIN: {
    url: 'https://www.intercity.pl/en/',
    provider: 'PKP Intercity',
    displayName: 'Train Ticket',
  },
  HEAVY_RAIL: {
    url: 'https://www.intercity.pl/en/',
    provider: 'PKP Intercity',
    displayName: 'Train Ticket',
  },
  COMMUTER_TRAIN: {
    url: 'https://www.mazowieckie.com.pl/en',
    provider: 'Koleje Mazowieckie',
    displayName: 'Regional Train Ticket',
  },
};

export function getTicketLinkForLeg(leg: TransitLeg): TicketLink | null {
  if (leg.mode === 'WALKING' || leg.mode === 'DRIVING') {
    return null;
  }

  if (!leg.transitDetails) {
    return null;
  }

  const agencies = leg.transitDetails.line.agencies || [];

  for (const agency of agencies) {
    const agencyName = agency.name;

    for (const [operatorKey, link] of Object.entries(OPERATOR_LINKS)) {
      if (agencyName.toLowerCase().includes(operatorKey.toLowerCase())) {
        return link;
      }
    }
  }

  const vehicleType = leg.transitDetails.line.vehicle.type.toUpperCase();

  for (const [typeKey, link] of Object.entries(VEHICLE_TYPE_FALLBACKS)) {
    if (vehicleType.includes(typeKey)) {
      return link;
    }
  }

  return {
    url: 'https://jakdojade.pl/',
    provider: 'JakDojade',
    displayName: 'Buy Ticket',
  };
}

export function getOperatorName(leg: TransitLeg): string {
  if (!leg.transitDetails || !leg.transitDetails.line.agencies.length) {
    return 'Unknown Operator';
  }

  return leg.transitDetails.line.agencies[0].name;
}
