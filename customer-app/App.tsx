import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as secureStorage from './utils/secureStorage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api, type CustomerBooking } from './api';
import { BottomTabBar, type TabKey } from './components/BottomTabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { ActivityScreen } from './screens/ActivityScreen';
import { BusinessProfileScreen } from './screens/BusinessProfileScreen';
import { BookingDetailsScreen } from './screens/BookingDetailsScreen';
import { BookingOutcomeScreen } from './screens/BookingOutcomeScreen';
import { CustomerBookingScreen } from './screens/CustomerBookingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PersonalInfoScreen } from './screens/PersonalInfoScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileUnsignedScreen } from './screens/ProfileUnsignedScreen';
import { SearchScreen } from './screens/SearchScreen';
import type { ConfirmedBookingSnapshot } from './types/booking';
import type { FontFamilies } from './types/fonts';

const CUSTOMER_SESSION_KEY = 'customer_app_session_v1';
const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000&q=80';
const DEFAULT_REGION = { latitude: 50.06, longitude: 19.93, latitudeDelta: 0.05, longitudeDelta: 0.05 };

function formatBookingHeadline(date: Date): string {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  const twoDaysStart = new Date(nextDayStart);
  twoDaysStart.setDate(twoDaysStart.getDate() + 1);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (date >= dayStart && date < nextDayStart) return `Today at ${time}`;
  if (date >= nextDayStart && date < twoDaysStart) return `Tomorrow at ${time}`;
  return date.toLocaleString();
}

async function toUpcomingSnapshotFromBooking(booking: CustomerBooking): Promise<ConfirmedBookingSnapshot> {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const safeEnd =
    Number.isNaN(end.getTime()) || end.getTime() <= safeStart.getTime()
      ? new Date(safeStart.getTime() + 60 * 60 * 1000)
      : end;
  const durationMinutes = Math.max(1, Math.round((safeEnd.getTime() - safeStart.getTime()) / 60000));
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)} hr${durationMinutes % 60 ? ` ${durationMinutes % 60} min` : ''} duration`
    : `${durationMinutes} min duration`;
  let businessName = booking.companyName || `Salon #${booking.companyId}`;
  let addressFull = booking.companyName || `Salon #${booking.companyId}`;
  let mapRegion = DEFAULT_REGION;
  let serviceName = booking.serviceName ?? 'Service';
  let staffName = booking.staffName ?? '';
  let servicePrice: number | null = typeof booking.price === 'number' ? booking.price : null;

  try {
    const profile = await api.salonProfile(booking.companyId);
    if (typeof profile.name === 'string' && profile.name.trim()) {
      businessName = profile.name;
    }
    if (typeof profile.businessAddress === 'string' && profile.businessAddress.trim()) {
      addressFull = profile.businessAddress;
    }
    if (typeof profile.latitude === 'number' && typeof profile.longitude === 'number') {
      mapRegion = {
        latitude: profile.latitude,
        longitude: profile.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    const matchedService = profile.services.find((item) => item.id === booking.serviceId);
    if (matchedService) {
      serviceName = matchedService.name;
      servicePrice = typeof matchedService.price === 'number' ? matchedService.price : null;
    }
    const matchedStaff = profile.staff.find((item) => item.id === booking.staffId);
    if (matchedStaff?.fullName) {
      staffName = matchedStaff.fullName;
    }
  } catch {
    // Fall back to booking-level placeholders when profile fetch fails.
  }
  const activityParts = [serviceName];
  if (typeof servicePrice === 'number') activityParts.push(`${servicePrice} zł`);
  if (staffName) activityParts.push(staffName);

  return {
    refId: String(booking.id),
    businessId: String(booking.companyId),
    businessName,
    heroImage: DEFAULT_HERO_IMAGE,
    timeHeadline: formatBookingHeadline(safeStart),
    startIso: safeStart.toISOString(),
    durationLine: durationLabel,
    activitySubtitle: activityParts.join(' • '),
    totalCzk: servicePrice ?? 0,
    serviceName,
    priceLabel: typeof servicePrice === 'number' ? `${servicePrice} zł` : '—',
    mapRegion,
    addressFull,
    serviceId: booking.serviceId ?? undefined,
    staffId: booking.staffId ?? null,
    durationMinutes,
  };
}

function pickUpcomingBooking(bookings: CustomerBooking[]): CustomerBooking | null {
  if (!Array.isArray(bookings) || bookings.length === 0) return null;
  const now = Date.now();
  const active = bookings.filter((item) => item.status !== 'CANCELLED');
  const sorted = [...active].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  const future = sorted.find((item) => new Date(item.startAt).getTime() >= now);
  return future ?? sorted[0] ?? null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
  }

  const fonts: FontFamilies = {
    regular: 'PlusJakartaSans_400Regular',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <MainTabs fonts={fonts} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MainTabs({ fonts }: { fonts: FontFamilies }) {
  const [tab, setTab] = useState<TabKey>('home');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [bookingSalonId, setBookingSalonId] = useState<number | null>(null);
  const [bookingSalonName, setBookingSalonName] = useState('');
  const [bookingInitialServiceId, setBookingInitialServiceId] = useState<number | null>(null);
  const [pendingBookingAfterAuth, setPendingBookingAfterAuth] = useState<{
    salonId: number;
    salonName: string;
    serviceId?: number | null;
  } | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<ConfirmedBookingSnapshot | null>(null);
  const [profileSignedIn, setProfileSignedIn] = useState(false);
  const [customerToken, setCustomerToken] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  const doLogout = () => {
    setProfileSignedIn(false);
    setCustomerToken('');
    setCustomerName('');
    setCustomerEmail('');
    setBookings([]);
    setUpcomingBooking(null);
    setPersonalInfoOpen(false);
    setSettingsOpen(false);
  };
  const [bookingOutcome, setBookingOutcome] = useState<'accepted' | 'cancelled' | null>(null);
  const [bookingDetails, setBookingDetails] = useState<ConfirmedBookingSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    const hydrateSession = async () => {
      try {
        const raw = await secureStorage.getItem(CUSTOMER_SESSION_KEY);
        if (!raw || !isMounted) return;
        const parsed = JSON.parse(raw) as { token?: string; signedIn?: boolean; name?: string };
        if (parsed?.signedIn && typeof parsed?.token === 'string' && parsed.token.length > 0) {
          setCustomerToken(parsed.token);
          setProfileSignedIn(true);
          if (typeof parsed.name === 'string' && parsed.name.trim()) {
            setCustomerName(parsed.name.trim());
          }
        }
      } catch {
        // Ignore broken local cache and continue with logged-out state.
      }
    };
    void hydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const persistSession = async () => {
      if (profileSignedIn && customerToken) {
        await secureStorage.setItem(
          CUSTOMER_SESSION_KEY,
          JSON.stringify({ signedIn: true, token: customerToken, name: customerName })
        );
        return;
      }
      await secureStorage.removeItem(CUSTOMER_SESSION_KEY);
    };
    void persistSession();
  }, [profileSignedIn, customerToken, customerName]);

  useEffect(() => {
    if (tab !== 'profile') {
      setPersonalInfoOpen(false);
      setSettingsOpen(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!profileSignedIn) {
      setPersonalInfoOpen(false);
      setSettingsOpen(false);
    }
  }, [profileSignedIn]);

  useEffect(() => {
    if (!customerToken) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listBookings(customerToken);
        if (!cancelled) {
          setBookings(data);
          const upcoming = pickUpcomingBooking(data);
          if (!upcoming) {
            setUpcomingBooking(null);
            return;
          }
          const snapshot = await toUpcomingSnapshotFromBooking(upcoming);
          if (!cancelled) setUpcomingBooking(snapshot);
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
          setUpcomingBooking(null);
        }
      }
    };
    void load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [customerToken]);

  const stack =
    bookingDetails ? (
      <BookingDetailsScreen
        fonts={fonts}
        booking={bookingDetails}
        token={customerToken}
        onRescheduled={(updated) => {
          // Reflect the new time immediately in the open details + upcoming card,
          // then let the bookings poll reconcile the list.
          setBookingDetails(updated);
          setUpcomingBooking((prev) => (prev && prev.refId === updated.refId ? updated : prev));
          if (customerToken) {
            void api.listBookings(customerToken).then(setBookings).catch(() => {});
          }
        }}
        onBack={() => setBookingDetails(null)}
        onCancel={async () => {
          if (bookingDetails?.refId && customerToken) {
            try {
              await api.cancelBooking(customerToken, Number(bookingDetails.refId));
            } catch {
              // Clear UI regardless of API outcome
            }
          }
          setBookingDetails(null);
          setUpcomingBooking(null);
          setBookingOutcome('cancelled');
        }}
      />
    ) : bookingOutcome ? (
      <BookingOutcomeScreen
        type={bookingOutcome}
        fonts={fonts}
        onDone={() => {
          setBookingOutcome(null);
          setTab('activity');
        }}
      />
    ) : bookingSalonId != null ? (
      <CustomerBookingScreen
        salonId={bookingSalonId}
        salonName={bookingSalonName}
        token={customerToken}
        fonts={fonts}
        initialServiceId={bookingInitialServiceId}
        onBack={() => {
          setBookingSalonId(null);
          setBookingInitialServiceId(null);
        }}
        onBooked={(snapshot) => {
          setUpcomingBooking(snapshot);
          setBookingSalonId(null);
          setBookingInitialServiceId(null);
          setBookingOutcome('accepted');
        }}
      />
    ) : businessId != null ? (
      <BusinessProfileScreen
        businessId={businessId}
        fonts={fonts}
        onBack={() => setBusinessId(null)}
        onBookNow={(serviceId) => {
          const parsed = Number(businessId);
          const sid = serviceId != null ? Number(serviceId) : null;
          const validServiceId = sid != null && Number.isFinite(sid) ? sid : null;
          if (!profileSignedIn || !customerToken) {
            setPendingBookingAfterAuth({
              salonId: parsed,
              salonName: businessName || `Salon #${businessId}`,
              serviceId: validServiceId,
            });
            setBusinessId(null);
            setTab('profile');
            return;
          }
          setBookingSalonId(parsed);
          setBookingSalonName(businessName || `Salon #${businessId}`);
          setBookingInitialServiceId(validServiceId);
          setBusinessId(null);
        }}
      />
    ) : (
      <>
        {tab === 'home' && (
          <HomeScreen
            fonts={fonts}
            onPressSearch={() => setTab('search')}
            onOpenSalon={(id) => {
              setBusinessId(id);
              setBusinessName('');
            }}
          />
        )}
        {tab === 'search' && (
          <SearchScreen
            fonts={fonts}
            onPressVenue={(venue) => {
              setBusinessId(venue.id);
              setBusinessName(venue.name);
            }}
          />
        )}
        {tab === 'activity' && (
          <ActivityScreen
            fonts={fonts}
            upcomingBooking={upcomingBooking}
            bookings={bookings}
            onSearchVenues={() => setTab('search')}
            onLogin={() => setTab('profile')}
            onOpenBookingDetails={(booking) => setBookingDetails(booking)}
            onCancelUpcoming={() => {
              setUpcomingBooking(null);
              setBookingOutcome('cancelled');
            }}
          />
        )}
        {tab === 'profile' && profileSignedIn && personalInfoOpen && (
          <PersonalInfoScreen
            fonts={fonts}
            token={customerToken}
            name={customerName}
            email={customerEmail}
            onBack={() => setPersonalInfoOpen(false)}
            onSaved={(fullName) => {
              if (fullName.trim()) setCustomerName(fullName.trim());
            }}
          />
        )}
        {tab === 'profile' && profileSignedIn && settingsOpen && !personalInfoOpen && (
          <SettingsScreen fonts={fonts} onBack={() => setSettingsOpen(false)} onLogOut={doLogout} />
        )}
        {tab === 'profile' &&
          profileSignedIn &&
          !personalInfoOpen &&
          !settingsOpen && (
            <ProfileScreen
              fonts={fonts}
              userName={customerName}
              onLogOut={doLogout}
              onEditProfile={() => setPersonalInfoOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        {tab === 'profile' && !profileSignedIn && (
          <ProfileUnsignedScreen
            fonts={fonts}
            bookingGate={Boolean(pendingBookingAfterAuth)}
            onClose={() => {
              setPendingBookingAfterAuth(null);
              setTab('home');
            }}
            onSignedIn={async (payload) => {
              const auth =
                payload.mode === 'register'
                    ? await api.registerCustomer({
                        fullName: payload.fullName,
                        email: payload.email,
                        password: payload.password,
                      })
                    : await api.loginCustomer({ email: payload.email, password: payload.password });
              setCustomerToken(auth.token);
              setCustomerName(auth.fullName);
              setCustomerEmail(auth.email ?? '');
              setProfileSignedIn(true);
              setBookings([]);
              if (pendingBookingAfterAuth) {
                setBookingSalonId(pendingBookingAfterAuth.salonId);
                setBookingSalonName(pendingBookingAfterAuth.salonName);
                setBookingInitialServiceId(pendingBookingAfterAuth.serviceId ?? null);
                setPendingBookingAfterAuth(null);
                setBusinessId(null);
              }
            }}
          />
        )}
        {!(tab === 'profile' && profileSignedIn && (personalInfoOpen || settingsOpen)) && (
          <BottomTabBar active={tab} onChange={setTab} />
        )}
      </>
    );

  return (
    <View style={styles.mainShell}>
      <OfflineBanner />
      {stack}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  mainShell: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
