/**
 * Mock Expedia inventory. In a real deployment these would come from
 * Expedia's flight/hotel/activity microservices; here they're static so the
 * demo is self-contained.
 */

export interface Flight {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departDate: string;
  departTime: string;
  arriveTime: string;
  durationMin: number;
  stops: number;
  priceUSD: number;
  cabin: 'economy' | 'premium-economy' | 'business' | 'first';
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  starRating: number;
  guestRating: number;
  nightlyUSD: number;
  amenities: string[];
  imageEmoji: string;
}

export interface Activity {
  id: string;
  name: string;
  city: string;
  category: 'tour' | 'food' | 'museum' | 'outdoor' | 'show';
  durationHours: number;
  priceUSD: number;
  rating: number;
}

export const FLIGHTS: Flight[] = [
  { id: 'fl-001', airline: 'United', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '11:30', arriveTime: '15:20+1', durationMin: 670, stops: 0, priceUSD: 892, cabin: 'economy' },
  { id: 'fl-002', airline: 'ANA', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '13:00', arriveTime: '17:00+1', durationMin: 685, stops: 0, priceUSD: 1024, cabin: 'economy' },
  { id: 'fl-003', airline: 'JAL', origin: 'SFO', destination: 'HND', departDate: '2026-08-15', departTime: '14:25', arriveTime: '18:30+1', durationMin: 695, stops: 0, priceUSD: 978, cabin: 'economy' },
  { id: 'fl-004', airline: 'Delta', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '08:15', arriveTime: '17:05+1', durationMin: 815, stops: 1, priceUSD: 712, cabin: 'economy' },
  { id: 'fl-005', airline: 'United', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '22:45', arriveTime: '04:30+2', durationMin: 705, stops: 0, priceUSD: 2890, cabin: 'business' },
  { id: 'fl-006', airline: 'American', origin: 'JFK', destination: 'LHR', departDate: '2026-08-15', departTime: '19:00', arriveTime: '07:10+1', durationMin: 430, stops: 0, priceUSD: 645, cabin: 'economy' },
];

export const HOTELS: Hotel[] = [
  { id: 'ho-001', name: 'Park Hyatt Tokyo', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 5, guestRating: 4.8, nightlyUSD: 612, amenities: ['pool', 'spa', 'gym', 'wifi', 'breakfast'], imageEmoji: '🏨' },
  { id: 'ho-002', name: 'Aman Tokyo', city: 'Tokyo', neighborhood: 'Otemachi', starRating: 5, guestRating: 4.9, nightlyUSD: 1450, amenities: ['pool', 'spa', 'gym', 'wifi', 'breakfast', 'butler'], imageEmoji: '🏯' },
  { id: 'ho-003', name: 'Hotel Gracery Shinjuku', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 4, guestRating: 4.4, nightlyUSD: 178, amenities: ['wifi', 'breakfast'], imageEmoji: '🦖' },
  { id: 'ho-004', name: 'Citadines Central Shinjuku', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 4, guestRating: 4.3, nightlyUSD: 145, amenities: ['wifi', 'kitchenette'], imageEmoji: '🏙️' },
  { id: 'ho-005', name: 'Andaz Tokyo Toranomon Hills', city: 'Tokyo', neighborhood: 'Toranomon', starRating: 5, guestRating: 4.7, nightlyUSD: 538, amenities: ['pool', 'spa', 'gym', 'wifi'], imageEmoji: '🗼' },
  { id: 'ho-006', name: 'The Standard London', city: 'London', neighborhood: 'Kings Cross', starRating: 4, guestRating: 4.6, nightlyUSD: 412, amenities: ['gym', 'wifi', 'breakfast'], imageEmoji: '🇬🇧' },
];

export const ACTIVITIES: Activity[] = [
  { id: 'ac-001', name: 'TeamLab Planets immersive art', city: 'Tokyo', category: 'museum', durationHours: 2, priceUSD: 38, rating: 4.8 },
  { id: 'ac-002', name: 'Tsukiji outer-market food tour', city: 'Tokyo', category: 'food', durationHours: 3, priceUSD: 95, rating: 4.9 },
  { id: 'ac-003', name: 'Mt. Fuji + Hakone day trip', city: 'Tokyo', category: 'outdoor', durationHours: 11, priceUSD: 145, rating: 4.6 },
  { id: 'ac-004', name: 'Robot Restaurant successor show', city: 'Tokyo', category: 'show', durationHours: 1.5, priceUSD: 88, rating: 4.3 },
  { id: 'ac-005', name: 'Shibuya guided night walk', city: 'Tokyo', category: 'tour', durationHours: 2.5, priceUSD: 52, rating: 4.7 },
];
