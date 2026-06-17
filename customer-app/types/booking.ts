/** Snapshot passed to Activity after a booking is confirmed (mock). */
export type ConfirmedBookingSnapshot = {
  refId: string;
  businessId: string;
  businessName: string;
  heroImage: string;
  timeHeadline: string;
  startIso: string;
  durationLine: string;
  /** e.g. "1 hr • 600 CZK • Pánský střih" */
  activitySubtitle: string;
  totalCzk: number;
  serviceName: string;
  priceLabel: string;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  addressFull: string;
};
