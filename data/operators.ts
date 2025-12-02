import { TransportOperator } from '../types/transport';

// Baza głównych operatorów transportu w Polsce
export const POLISH_TRANSPORT_OPERATORS: TransportOperator[] = [
    // === TRANSPORT KOLEJOWY ===
    {
        id: 'pkp-intercity',
        name: 'PKP Intercity',
        type: 'railway',
        apiEndpoint: 'https://portal.intercity.pl/api',
        ticketingUrl: 'https://bilet.intercity.pl',
        regions: ['all'],
    },
    {
        id: 'polregio',
        name: 'Polregio',
        type: 'regional',
        ticketingUrl: 'https://www.polregio.pl/bilety',
        regions: ['all'],
    },
    {
        id: 'koleje-mazowieckie',
        name: 'Koleje Mazowieckie',
        type: 'regional',
        ticketingUrl: 'https://www.mazowieckie.com.pl/bilety',
        regions: ['mazowieckie'],
    },
    {
        id: 'skm-warszawa',
        name: 'SKM Warszawa',
        type: 'urban',
        ticketingUrl: 'https://www.ztm.waw.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'wkd',
        name: 'WKD (Warszawska Kolej Dojazdowa)',
        type: 'urban',
        ticketingUrl: 'https://www.wkd.com.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'skm-trojmiasto',
        name: 'SKM Trójmiasto',
        type: 'urban',
        ticketingUrl: 'https://www.skm.pkp.pl',
        regions: ['pomorskie'],
    },
    {
        id: 'koleje-slaskie',
        name: 'Koleje Śląskie',
        type: 'regional',
        ticketingUrl: 'https://www.kolejeslaskie.com/bilety',
        regions: ['slaskie'],
    },
    {
        id: 'koleje-wielkopolskie',
        name: 'Koleje Wielkopolskie',
        type: 'regional',
        ticketingUrl: 'https://www.koleje-wielkopolskie.com.pl',
        regions: ['wielkopolskie'],
    },
    {
        id: 'koleje-dolnoslaskie',
        name: 'Koleje Dolnośląskie',
        type: 'regional',
        ticketingUrl: 'https://www.kolejedolnoslaskie.eu',
        regions: ['dolnoslaskie'],
    },
    {
        id: 'koleje-malopolskie',
        name: 'Koleje Małopolskie',
        type: 'regional',
        ticketingUrl: 'https://www.malopolskiekoleje.pl',
        regions: ['malopolskie'],
    },
    
    // === TRANSPORT MIEJSKI - WARSZAWA ===
    {
        id: 'ztm-warszawa',
        name: 'ZTM Warszawa',
        type: 'urban',
        ticketingUrl: 'https://www.ztm.waw.pl/bilety',
        regions: ['mazowieckie'],
    },
    {
        id: 'metro-warszawa',
        name: 'Metro Warszawskie',
        type: 'urban',
        ticketingUrl: 'https://www.metro.waw.pl',
        regions: ['mazowieckie'],
    },
    
    // === TRANSPORT MIEJSKI - KRAKÓW ===
    {
        id: 'mpk-krakow',
        name: 'MPK Kraków',
        type: 'urban',
        ticketingUrl: 'https://www.mpk.krakow.pl/pl/bilety',
        regions: ['malopolskie'],
    },
    
    // === TRANSPORT MIEJSKI - WROCŁAW ===
    {
        id: 'mpk-wroclaw',
        name: 'MPK Wrocław',
        type: 'urban',
        ticketingUrl: 'https://www.mpk.wroc.pl/bilety',
        regions: ['dolnoslaskie'],
    },
    
    // === TRANSPORT MIEJSKI - POZNAŃ ===
    {
        id: 'ztm-poznan',
        name: 'ZTM Poznań',
        type: 'urban',
        ticketingUrl: 'https://www.ztm.poznan.pl/bilety',
        regions: ['wielkopolskie'],
    },
    
    // === TRANSPORT MIEJSKI - TRÓJMIASTO ===
    {
        id: 'ztm-gdansk',
        name: 'ZTM w Gdańsku',
        type: 'urban',
        ticketingUrl: 'https://www.ztm.gda.pl/bilety',
        regions: ['pomorskie'],
    },
    
    // === TRANSPORT MIEJSKI - ŁÓDŹ ===
    {
        id: 'mpk-lodz',
        name: 'MPK Łódź',
        type: 'urban',
        ticketingUrl: 'https://www.mpk.lodz.pl/bilety',
        regions: ['lodzkie'],
    },
    
    // === TRANSPORT MIEJSKI - KATOWICE/ŚLĄSK ===
    {
        id: 'kzk-gop',
        name: 'KZK GOP',
        type: 'urban',
        ticketingUrl: 'https://www.kzkgop.pl/bilety',
        regions: ['slaskie'],
    },
    {
        id: 'tramwaje-slaskie',
        name: 'Tramwaje Śląskie',
        type: 'urban',
        ticketingUrl: 'https://www.tramwaje-slaskie.pl',
        regions: ['slaskie'],
    },
    
    // === TRANSPORT MIEJSKI - SZCZECIN ===
    {
        id: 'zditm-szczecin',
        name: 'ZDiTM Szczecin',
        type: 'urban',
        ticketingUrl: 'https://www.zditm.szczecin.pl/bilety',
        regions: ['zachodniopomorskie'],
    },
    
    // === TRANSPORT MIEJSKI - BYDGOSZCZ ===
    {
        id: 'zdmikp-bydgoszcz',
        name: 'ZDMiKP Bydgoszcz',
        type: 'urban',
        ticketingUrl: 'https://www.zdmikp.bydgoszcz.pl',
        regions: ['kujawsko-pomorskie'],
    },
    
    // === TRANSPORT MIEJSKI - LUBLIN ===
    {
        id: 'ztm-lublin',
        name: 'ZTM Lublin',
        type: 'urban',
        ticketingUrl: 'https://www.ztm.lublin.pl',
        regions: ['lubelskie'],
    },
    
    // === AUTOBUSY MIĘDZYMIASTOWE ===
    {
        id: 'flixbus',
        name: 'FlixBus',
        type: 'intercity',
        apiEndpoint: 'https://global.api.flixbus.com',
        ticketingUrl: 'https://www.flixbus.pl',
        regions: ['all'],
    },
    {
        id: 'polskibus',
        name: 'PolskiBus',
        type: 'intercity',
        ticketingUrl: 'https://www.polskibus.com',
        regions: ['all'],
    },
    {
        id: 'neobus',
        name: 'NeoBus',
        type: 'intercity',
        ticketingUrl: 'https://www.neobus.pl',
        regions: ['all'],
    },
    {
        id: 'sindbad',
        name: 'Sindbad',
        type: 'intercity',
        ticketingUrl: 'https://sindbad.pl',
        regions: ['all'],
    },
    
    // === LINIE LOTNICZE ===
    {
        id: 'lot',
        name: 'LOT Polish Airlines',
        type: 'airline',
        ticketingUrl: 'https://www.lot.com',
        regions: ['all'],
    },
    {
        id: 'ryanair',
        name: 'Ryanair',
        type: 'airline',
        ticketingUrl: 'https://www.ryanair.com',
        regions: ['all'],
    },
    {
        id: 'wizzair',
        name: 'Wizz Air',
        type: 'airline',
        ticketingUrl: 'https://wizzair.com',
        regions: ['all'],
    },
    
    // === TAXI I RIDESHARING ===
    {
        id: 'uber',
        name: 'Uber',
        type: 'urban',
        ticketingUrl: 'https://www.uber.com/pl/pl/',
        regions: ['all'],
    },
    {
        id: 'bolt',
        name: 'Bolt',
        type: 'urban',
        ticketingUrl: 'https://bolt.eu/pl/',
        regions: ['all'],
    },
    {
        id: 'freenow',
        name: 'FREE NOW (mytaxi)',
        type: 'urban',
        ticketingUrl: 'https://www.free-now.com/pl/',
        regions: ['all'],
    },
    {
        id: 'itaxi',
        name: 'iTaxi',
        type: 'urban',
        ticketingUrl: 'https://www.itaxi.pl',
        regions: ['all'],
    },
    
    // === HULAJNOGI I ROWERY ELEKTRYCZNE ===
    {
        id: 'bolt-scooters',
        name: 'Bolt Scooters',
        type: 'urban',
        ticketingUrl: 'https://bolt.eu/pl/scooters/',
        regions: ['warszawa', 'krakow', 'wroclaw', 'poznan', 'trojmiasto'],
    },
    {
        id: 'lime',
        name: 'Lime',
        type: 'urban',
        ticketingUrl: 'https://www.li.me',
        regions: ['warszawa', 'krakow'],
    },
    {
        id: 'tier',
        name: 'TIER Mobility',
        type: 'urban',
        ticketingUrl: 'https://www.tier.app',
        regions: ['warszawa', 'krakow', 'wroclaw'],
    },
    {
        id: 'bird',
        name: 'Bird',
        type: 'urban',
        ticketingUrl: 'https://www.bird.co',
        regions: ['warszawa'],
    },
    {
        id: 'dott',
        name: 'Dott',
        type: 'urban',
        ticketingUrl: 'https://ridedott.com',
        regions: ['warszawa', 'poznan'],
    },
    {
        id: 'blinkee',
        name: 'Blinkee.city',
        type: 'urban',
        ticketingUrl: 'https://blinkee.city',
        regions: ['warszawa', 'lodz'],
    },
    {
        id: 'hive',
        name: 'HIVE',
        type: 'urban',
        ticketingUrl: 'https://www.hivescooters.com',
        regions: ['warszawa'],
    },
    
    // === BIKE SHARING ===
    {
        id: 'veturilo',
        name: 'Veturilo (Warszawa)',
        type: 'urban',
        ticketingUrl: 'https://veturilo.waw.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'wavelo',
        name: 'Wavelo (Kraków)',
        type: 'urban',
        ticketingUrl: 'https://wavelo.pl',
        regions: ['malopolskie'],
    },
    {
        id: 'nextbike',
        name: 'Nextbike (różne miasta)',
        type: 'urban',
        ticketingUrl: 'https://nextbike.pl',
        regions: ['all'],
    },
    {
        id: 'romet',
        name: 'Romet Rental',
        type: 'urban',
        ticketingUrl: 'https://rometrental.pl',
        regions: ['all'],
    },
    
    // === CAR SHARING ===
    {
        id: 'panek',
        name: 'Panek CarSharing',
        type: 'urban',
        ticketingUrl: 'https://panekcs.pl',
        regions: ['warszawa', 'krakow', 'wroclaw', 'trojmiasto', 'poznan', 'katowice'],
    },
    {
        id: 'traficar',
        name: 'Traficar',
        type: 'urban',
        ticketingUrl: 'https://www.traficar.pl',
        regions: ['warszawa', 'krakow', 'wroclaw', 'trojmiasto', 'poznan'],
    },
    {
        id: 'cityzen',
        name: 'CityZen',
        type: 'urban',
        ticketingUrl: 'https://cityzen.pl',
        regions: ['warszawa'],
    },
    {
        id: 'spark',
        name: 'Spark',
        type: 'urban',
        ticketingUrl: 'https://spark.pl',
        regions: ['warszawa', 'krakow'],
    },
    {
        id: '4mobility',
        name: '4Mobility',
        type: 'urban',
        ticketingUrl: 'https://4mobility.com',
        regions: ['warszawa'],
    },
    
    // === PKS I BUSY REGIONALNE ===
    {
        id: 'pks-warszawa',
        name: 'PKS Warszawa',
        type: 'regional',
        ticketingUrl: 'https://pkswarszawa.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'pks-grodzisk',
        name: 'PKS Grodzisk Mazowiecki',
        type: 'regional',
        ticketingUrl: 'https://pks-grodzisk.com.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'pks-radom',
        name: 'PKS Radom',
        type: 'regional',
        ticketingUrl: 'https://pksradom.pl',
        regions: ['mazowieckie'],
    },
    {
        id: 'pks-krakow',
        name: 'PKS Kraków',
        type: 'regional',
        ticketingUrl: 'https://pks.krakow.pl',
        regions: ['malopolskie'],
    },
    {
        id: 'pks-gdansk',
        name: 'PKS Gdańsk',
        type: 'regional',
        ticketingUrl: 'https://pksgdansk.pl',
        regions: ['pomorskie'],
    },
    {
        id: 'pks-poznan',
        name: 'PKS Poznań',
        type: 'regional',
        ticketingUrl: 'https://pkspoznan.pl',
        regions: ['wielkopolskie'],
    },
    {
        id: 'pks-wroclaw',
        name: 'PKS Wrocław',
        type: 'regional',
        ticketingUrl: 'https://pkswroclaw.pl',
        regions: ['dolnoslaskie'],
    },
    {
        id: 'pks-katowice',
        name: 'PKS Katowice',
        type: 'regional',
        ticketingUrl: 'https://pks.katowice.pl',
        regions: ['slaskie'],
    },
];

// Funkcja do znalezienia operatora po ID
export const getOperatorById = (id: string): TransportOperator | undefined => {
    return POLISH_TRANSPORT_OPERATORS.find(op => op.id === id);
};

// Funkcja do znalezienia operatorów w danym regionie
export const getOperatorsByRegion = (region: string): TransportOperator[] => {
    return POLISH_TRANSPORT_OPERATORS.filter(
        op => op.regions.includes('all') || op.regions.includes(region.toLowerCase())
    );
};

// Funkcja do znalezienia operatorów danego typu
export const getOperatorsByType = (type: string): TransportOperator[] => {
    return POLISH_TRANSPORT_OPERATORS.filter(op => op.type === type);
};
