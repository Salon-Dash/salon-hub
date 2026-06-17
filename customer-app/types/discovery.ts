export type SalonCardItem = {
  id: string;
  name: string;
  rating: string;
  reviews: number;
  location: string;
  category: string;
  image: string;
};

export type SearchVenue = {
  id: string;
  name: string;
  rating: string;
  reviews: number;
  serviceLabel: string;
  priceFrom: string;
  image: string;
  latitude: number;
  longitude: number;
  minPriceCzk: number | null;
  hasTeam: boolean;
  hasReviews: boolean;
};

export type CategoryTile = {
  id: string;
  label: string;
  image: string;
  color?: string;
};
