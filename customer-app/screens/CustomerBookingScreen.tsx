import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api, type PublicService, type PublicStaff } from '../api';
import { colors, spacing } from '../constants/theme';
import { radius, shadow, typography } from '../constants/design';
import type { ConfirmedBookingSnapshot } from '../types/booking';
import type { FontFamilies } from '../types/fonts';
import { playSuccessTone } from '../utils/sound';

type BookingStep = 'services' | 'pickStaff' | 'datetime' | 'review';

type Props = {
  salonId: number;
  salonName: string;
  token: string;
  fonts: FontFamilies;
  initialServiceId?: number | null;
  onBack: () => void;
  onBooked: (snapshot: ConfirmedBookingSnapshot) => void;
};

const DEFAULT_STEP_ORDER: BookingStep[] = ['services', 'pickStaff', 'datetime', 'review'];
const SINGLE_SERVICE_STEP_ORDER: BookingStep[] = ['pickStaff', 'datetime', 'review'];
const CALENDAR_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function stepIndex(stepOrder: BookingStep[], s: BookingStep) {
  return stepOrder.indexOf(s);
}

function humanDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  return `${minutes} mins`;
}

export function CustomerBookingScreen({
  salonId,
  salonName,
  token,
  fonts,
  initialServiceId,
  onBack,
  onBooked,
}: Props) {
  const insets = useSafeAreaInsets();
  const isSingleServiceFlow = initialServiceId != null;
  const stepOrder = isSingleServiceFlow ? SINGLE_SERVICE_STEP_ORDER : DEFAULT_STEP_ORDER;
  const [step, setStep] = useState<BookingStep>(isSingleServiceFlow ? 'pickStaff' : 'services');
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceCategoryTab, setServiceCategoryTab] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [wantPickStaff, setWantPickStaff] = useState<boolean>(false);
  const [hasChosenStaff, setHasChosenStaff] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarSheetRef = useRef<BottomSheet>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const calendarSnapPoints = useMemo(() => ['74%'], []);
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');
    api
      .salonServices(salonId)
      .then((data) => {
        if (!isMounted) return;
        setServices(data.services);
        setStaff(data.staff);
        const firstId = data.services[0]?.id ?? null;
        if (initialServiceId != null && data.services.some((s) => s.id === initialServiceId)) {
          setSelectedServiceId(initialServiceId);
        } else {
          setSelectedServiceId(firstId);
        }
        setSelectedStaffId(data.staff[0]?.id ?? null);
      })
      .catch((e: Error) => {
        if (!isMounted) return;
        setError(e.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [salonId, initialServiceId]);

  useEffect(() => {
    setStep(isSingleServiceFlow ? 'pickStaff' : 'services');
    setWantPickStaff(false);
    setHasChosenStaff(true);
    setOccupiedSlots([]);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setSelectedTime('10:00');
  }, [salonId, isSingleServiceFlow]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );
  const selectedStaffName = useMemo(
    () => staff.find((member) => member.id === selectedStaffId)?.fullName ?? 'No preference',
    [staff, selectedStaffId]
  );
  const selectedProfessionalLabel = wantPickStaff
    ? selectedStaffName
    : 'No preference (auto-assigned)';

  const serviceCategoryTabs = useMemo(() => {
    const categories = services
      .map((service) => service.category?.trim())
      .filter((value): value is string => Boolean(value));
    const uniqueCategories = Array.from(new Set(categories));
    return ['All', ...uniqueCategories];
  }, [services]);

  const visibleServices = useMemo(() => {
    if (!serviceCategoryTab || serviceCategoryTab === 'All') return services;
    return services.filter((service) => (service.category?.trim() ?? '') === serviceCategoryTab);
  }, [services, serviceCategoryTab]);

  useEffect(() => {
    if (!serviceCategoryTabs.length) {
      setServiceCategoryTab('');
      return;
    }
    if (!serviceCategoryTabs.includes(serviceCategoryTab)) {
      setServiceCategoryTab(serviceCategoryTabs[0]);
    }
  }, [serviceCategoryTabs, serviceCategoryTab]);

  const basePrice = selectedService?.price ?? 0;
  const totalPrice = basePrice;
  const dateOptions = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        date.setHours(0, 0, 0, 0);
        return date;
      }),
    []
  );
  const [visibleStripDate, setVisibleStripDate] = useState<Date>(() => dateOptions[0] ?? selectedDate);
  const stripMonthLabel = useMemo(
    () => (visibleStripDate ?? selectedDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [selectedDate, visibleStripDate]
  );
  const dateStripItemWidth = 74;
  const dateStripViewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onDateStripViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: Date }> }) => {
      const firstVisible = viewableItems?.[0]?.item;
      if (firstVisible) setVisibleStripDate(firstVisible);
    }
  ).current;

  const calendarMonthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [calendarMonth]
  );
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calendarMonth);
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    const weekOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - weekOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const value = new Date(gridStart);
      value.setDate(gridStart.getDate() + index);
      value.setHours(0, 0, 0, 0);
      return {
        value,
        inCurrentMonth: value.getMonth() === calendarMonth.getMonth(),
      };
    });
  }, [calendarMonth]);

  const timeOptions = ['09:00', '10:00', '11:00', '13:00', '15:00', '17:00'];

  useEffect(() => {
    const day = selectedDate.toISOString().slice(0, 10);
    api
      .salonAvailability(salonId, day, wantPickStaff ? selectedStaffId ?? undefined : undefined)
      .then((res) => {
        const normalized = res.occupiedSlotsUtc
          .map((slot) => slot.slice(0, 5))
          .filter((slot) => timeOptions.includes(slot));
        setOccupiedSlots(normalized);
        if (normalized.includes(selectedTime)) {
          const firstAvailable = timeOptions.find((slot) => !normalized.includes(slot));
          if (firstAvailable) setSelectedTime(firstAvailable);
        }
      })
      .catch(() => setOccupiedSlots([]));
  }, [salonId, selectedDate, selectedStaffId, selectedTime, wantPickStaff]);

  const slotHasConflict = occupiedSlots.includes(selectedTime);
  const availableTimeOptions = timeOptions.filter((slot) => !occupiedSlots.includes(slot));
  const isFullyBooked = availableTimeOptions.length === 0;
  const effectiveStaffIdForBooking = wantPickStaff ? selectedStaffId ?? undefined : undefined;

  const goNextLinear = (from: BookingStep) => {
    setError('');
    const idx = stepIndex(stepOrder, from);
    if (idx < 0 || idx >= stepOrder.length - 1) return;
    setStep(stepOrder[idx + 1]);
  };

  const goBackStep = () => {
    setError('');
    const idx = stepIndex(stepOrder, step);
    if (idx <= 0) {
      onBack();
      return;
    }
    setStep(stepOrder[idx - 1]);
  };

  const onConfirmBooking = async () => {
    if (!token) {
      Alert.alert('Session required', 'Please sign in again to confirm your booking.');
      return;
    }
    if (!selectedService) {
      setError('Please select a service.');
      return;
    }
    if (slotHasConflict) {
      setError('This time slot is not available. Go back to date & time to fix it.');
      Alert.alert('Time unavailable', 'Please pick another date or time.');
      setStep('datetime');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startAt = new Date(selectedDate);
      startAt.setHours(hours, minutes, 0, 0);
      const endAt = new Date(startAt.getTime() + selectedService.durationMinutes * 60 * 1000);
      const created = await api.createBooking(token, {
        companyId: salonId,
        serviceId: selectedService.id,
        staffId: effectiveStaffIdForBooking,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: 'BOOKED',
      });
      await playSuccessTone();
      onBooked({
        refId: String(created.id),
        businessId: String(created.companyId),
        businessName: created.companyName,
        heroImage: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000&q=80',
        timeHeadline: new Date(created.startAt).toLocaleString(),
        durationLine: `${selectedService.durationMinutes} min duration`,
        activitySubtitle: `${selectedService.name} • ${totalPrice} CZK`,
        totalCzk: totalPrice,
        serviceName: selectedService.name,
        priceLabel: `${totalPrice} CZK`,
        mapRegion: { latitude: 50.06, longitude: 19.93, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        addressFull: created.companyName,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to confirm booking';
      setError(message);
      Alert.alert('Could not confirm', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (isLoading) {
      return <Text style={[styles.info, { fontFamily: fonts.regular }]}>Loading…</Text>;
    }

    if (step === 'services') {
      return (
        <>
          {serviceCategoryTabs.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesCategoryTabs}
            >
              {serviceCategoryTabs.map((category) => {
                const active = serviceCategoryTab === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setServiceCategoryTab(category)}
                    style={[styles.servicesCategoryTabBtn, active && styles.servicesCategoryTabBtnActive]}
                  >
                    <Text
                      style={[
                        styles.servicesCategoryTabText,
                        { fontFamily: fonts.semibold },
                        active && styles.servicesCategoryTabTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <Text style={[styles.servicesSectionTitle, { fontFamily: fonts.bold }]}>
            {serviceCategoryTab === 'All' || !serviceCategoryTab ? 'All services' : serviceCategoryTab}
          </Text>
          {visibleServices.map((service) => {
            const selected = selectedServiceId === service.id;
            return (
              <Pressable
                key={service.id}
                onPress={() => setSelectedServiceId(service.id)}
                style={styles.serviceRow}
              >
                <View style={styles.serviceRowLeft}>
                  <Text style={[styles.serviceRowTitle, { fontFamily: fonts.semibold }]}>{service.name}</Text>
                  <Text style={[styles.serviceRowMeta, { fontFamily: fonts.regular }]}>
                    {humanDuration(service.durationMinutes)}
                  </Text>
                  {service.description ? (
                    <Text style={[styles.serviceRowDesc, { fontFamily: fonts.regular }]} numberOfLines={1}>
                      {service.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.serviceRowPrice, { fontFamily: fonts.semibold }]}>{service.price} CZK</Text>
                </View>
                <View style={[styles.servicePickCircle, selected && styles.servicePickCircleOn]}>
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Ionicons name="add" size={18} color={colors.text} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </>
      );
    }

    if (step === 'datetime') {
      return (
        <>
          <View style={styles.timeHeaderRow}>
            <Pressable style={styles.timeHeaderPill}>
              <View style={styles.timeHeaderMiniIcon}>
                <Ionicons name={wantPickStaff ? 'person-outline' : 'people-outline'} size={12} color="#7c3aed" />
              </View>
              <Text style={[styles.timeHeaderPillText, { fontFamily: fonts.semibold }]}>{selectedProfessionalLabel}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.calendarIconBtn}
              onPress={() => {
                const initialMonth = new Date(selectedDate);
                initialMonth.setDate(1);
                initialMonth.setHours(0, 0, 0, 0);
                setCalendarMonth(initialMonth);
                setIsCalendarOpen(true);
                requestAnimationFrame(() => {
                  calendarSheetRef.current?.snapToIndex(0);
                });
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
          {slotHasConflict ? (
            <View style={styles.warnBox}>
              <Text style={[styles.warnText, { fontFamily: fonts.semibold }]}>Time conflict</Text>
              <Text style={[styles.stepHint, { fontFamily: fonts.regular }]}>
                This slot is already booked. Choose another time or date, then continue.
              </Text>
            </View>
          ) : null}
          <Text style={[styles.monthTitle, { fontFamily: fonts.bold }]}>{stripMonthLabel}</Text>
          <FlatList
            horizontal
            data={dateOptions}
            keyExtractor={(item) => item.toISOString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStripContent}
            onViewableItemsChanged={onDateStripViewableItemsChanged}
            viewabilityConfig={dateStripViewabilityConfig}
            getItemLayout={(_, index) => ({
              length: dateStripItemWidth,
              offset: dateStripItemWidth * index,
              index,
            })}
            renderItem={({ item: date }) => {
              const isActive = date.toDateString() === selectedDate.toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <Pressable onPress={() => setSelectedDate(date)} style={styles.singleDateItem}>
                  <View
                    style={[
                      styles.singleDateCircle,
                      isActive && styles.singleDateCircleOn,
                      isPast && styles.singleDateCircleDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.singleDateNum,
                        { fontFamily: fonts.bold },
                        isActive && styles.singleDateNumOn,
                        isPast && styles.singleDateNumDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.singleDateWeekday,
                      { fontFamily: fonts.regular },
                      isPast && styles.singleDateWeekdayDisabled,
                    ]}
                  >
                    {date.toLocaleDateString(undefined, { weekday: 'long' })}
                  </Text>
                </Pressable>
              );
            }}
          />
          {isFullyBooked ? (
            <View style={styles.fullyBookedWrap}>
              <View style={styles.fullyBookedIcon}>
                <Ionicons name="calendar-outline" size={24} color="#7c3aed" />
              </View>
              <Text style={[styles.fullyBookedTitle, { fontFamily: fonts.bold }]}>Fully booked on this date</Text>
              <Text style={[styles.fullyBookedSubtitle, { fontFamily: fonts.regular }]}>
                Available from {dateOptions[1]?.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })}
              </Text>
              <Pressable
                onPress={() => {
                  const next = dateOptions.find((d) => d.toDateString() !== selectedDate.toDateString());
                  if (next) setSelectedDate(next);
                }}
                style={styles.fullyBookedAction}
              >
                <Text style={[styles.fullyBookedActionText, { fontFamily: fonts.semibold }]}>Go to next available date</Text>
              </Pressable>
              <Pressable style={styles.fullyBookedActionSecondary}>
                <Text style={[styles.fullyBookedActionText, { fontFamily: fonts.semibold }]}>Join waitlist</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timeListWrap}>
              {timeOptions.map((time) => {
                const isActive = time === selectedTime;
                const isOccupied = occupiedSlots.includes(time);
                return (
                  <Pressable
                    key={time}
                    disabled={isOccupied}
                    onPress={() => setSelectedTime(time)}
                    style={[styles.timeListItem, isActive && styles.timeListItemOn, isOccupied && styles.timeListItemBusy]}
                  >
                    <Text style={[styles.timeListItemText, { fontFamily: fonts.semibold }, isOccupied && styles.slotTextDisabled]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.waitlistRow}>
            <Text style={[styles.waitlistHint, { fontFamily: fonts.regular }]}>Can’t find a suitable time? </Text>
            <Pressable>
              <Text style={[styles.waitlistLink, { fontFamily: fonts.semibold }]}>Join waitlist</Text>
            </Pressable>
          </View>
        </>
      );
    }

    if (step === 'pickStaff') {
      return (
        <>
          <View style={styles.proChoiceList}>
            <View style={[styles.staffListRow, wantPickStaff === false && styles.staffListRowOn]}>
              <View style={styles.noPrefIconWrap}>
                <Ionicons name="people-outline" size={24} color="#6f52ed" />
              </View>
              <View style={styles.staffListContent}>
                <Text style={[styles.staffListName, { fontFamily: fonts.semibold }]}>No preference</Text>
                <Text style={[styles.staffListMeta, { fontFamily: fonts.regular }]}>for maximum availability</Text>
              </View>
              <Pressable
                onPress={() => {
                  setWantPickStaff(false);
                  setSelectedStaffId(null);
                  setHasChosenStaff(true);
                }}
                style={[styles.selectPill, wantPickStaff === false && hasChosenStaff && styles.selectPillOn]}
              >
                <Text
                  style={[
                    styles.selectPillText,
                    { fontFamily: fonts.semibold },
                    wantPickStaff === false && hasChosenStaff && styles.selectPillTextOn,
                  ]}
                >
                  {wantPickStaff === false && hasChosenStaff ? 'Selected' : 'Select'}
                </Text>
              </Pressable>
            </View>
            {staff.map((person) => {
              const isSelected = wantPickStaff === true && selectedStaffId === person.id;
              return (
                <View key={person.id} style={[styles.staffListRow, isSelected && styles.staffListRowOn]}>
                  <View style={styles.staffAvatarWrap}>
                    <View style={styles.staffAvatarPlaceholder} />
                    <View style={styles.staffRatingBadge}>
                      <Text style={[styles.staffRatingText, { fontFamily: fonts.semibold }]}>5.0</Text>
                      <Ionicons name="star" size={10} color="#fbbf24" />
                    </View>
                  </View>
                  <View style={styles.staffListContent}>
                    <Text style={[styles.staffListName, { fontFamily: fonts.semibold }]}>{person.fullName}</Text>
                    <Text style={[styles.staffListMeta, { fontFamily: fonts.regular }]}>View profile</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setWantPickStaff(true);
                      setSelectedStaffId(person.id);
                      setHasChosenStaff(true);
                    }}
                    style={[styles.selectPill, isSelected && styles.selectPillOn]}
                  >
                    <Text
                      style={[
                        styles.selectPillText,
                        { fontFamily: fonts.semibold },
                        isSelected && styles.selectPillTextOn,
                      ]}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {staff.length === 0 ? (
            <Text style={[styles.proChoiceHelper, { fontFamily: fonts.regular }]}>
              No professionals listed yet.
            </Text>
          ) : null}
        </>
      );
    }

    if (step === 'review') {
      const valid = selectedService && !slotHasConflict;
      const reviewStartAt = new Date(selectedDate);
      const [reviewHours, reviewMinutes] = selectedTime.split(':').map((value) => Number(value));
      reviewStartAt.setHours(reviewHours || 0, reviewMinutes || 0, 0, 0);
      const reviewEndAt = new Date(reviewStartAt);
      reviewEndAt.setMinutes(reviewEndAt.getMinutes() + (selectedService?.durationMinutes ?? 60));
      return (
        <>
          {!valid ? (
            <View style={styles.warnBox}>
              <Text style={[styles.warnText, { fontFamily: fonts.semibold }]}>Please correct details</Text>
              <Text style={[styles.stepHint, { fontFamily: fonts.regular }]}>
                Your slot may no longer be free. Go back to date & time to fix conflicts.
              </Text>
              <Pressable onPress={() => setStep('datetime')} style={styles.secondaryBtn}>
                <Text style={[styles.secondaryBtnText, { fontFamily: fonts.semibold }]}>Edit date & time</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.summaryCard}>
              <View style={styles.reviewBusinessRow}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=280&q=80' }}
                  style={styles.reviewBusinessImage}
                />
                <View style={styles.reviewBusinessTextWrap}>
                  <Text style={[styles.reviewBusinessName, { fontFamily: fonts.bold }]} numberOfLines={1}>
                    {salonName}
                  </Text>
                  <View style={styles.reviewRatingRow}>
                    <Text style={[styles.reviewRatingText, { fontFamily: fonts.semibold }]}>5.0</Text>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Ionicons name="star" size={12} color="#fbbf24" />
                  </View>
                  <Text style={[styles.reviewBusinessAddress, { fontFamily: fonts.regular }]} numberOfLines={1}>
                    {selectedService?.category || 'Salon booking'}
                  </Text>
                </View>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewInfoRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.text} />
                <Text style={[styles.reviewInfoText, { fontFamily: fonts.regular }]}>
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
              <View style={styles.reviewInfoRow}>
                <Ionicons name="time-outline" size={18} color={colors.text} />
                <Text style={[styles.reviewInfoText, { fontFamily: fonts.regular }]}>
                  {selectedTime}-{reviewEndAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}{' '}
                  ({humanDuration(selectedService?.durationMinutes ?? 0)} duration)
                </Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewServiceRow}>
                <View style={styles.reviewServiceTextWrap}>
                  <Text style={[styles.reviewServiceName, { fontFamily: fonts.semibold }]}>
                    {selectedService?.name ?? 'Service'}
                  </Text>
                  <Text style={[styles.reviewServiceMeta, { fontFamily: fonts.regular }]}>
                    {humanDuration(selectedService?.durationMinutes ?? 0)} with{' '}
                    {selectedProfessionalLabel}
                  </Text>
                </View>
                <Text style={[styles.reviewServicePrice, { fontFamily: fonts.semibold }]}>{totalPrice} CZK</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewTotalRow}>
                <Text style={[styles.reviewTotalLabel, { fontFamily: fonts.bold }]}>Total</Text>
                <Text style={[styles.reviewTotalValue, { fontFamily: fonts.bold }]}>{totalPrice} CZK</Text>
              </View>
            </View>
          )}
          <Text style={[styles.moreDetailsHeading, { fontFamily: fonts.bold }]}>More details</Text>
          <View style={styles.moreDetailsCard}>
            <Text style={[styles.moreDetailsTitle, { fontFamily: fonts.semibold }]}>Cancellation policy</Text>
            <Text style={[styles.moreDetailsText, { fontFamily: fonts.regular }]}>Cancel for free anytime</Text>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom:
            insets.bottom + (step === 'services' || step === 'pickStaff' || step === 'datetime' || step === 'review' ? 82 : 20),
          paddingHorizontal: spacing.screenHorizontal,
        }}
      >
        {step === 'services' && !isSingleServiceFlow ? (
          <View style={styles.serviceTopBar}>
            <Pressable onPress={goBackStep} style={styles.topIconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.serviceTopTitle, { fontFamily: fonts.bold }]}>Services</Text>
            <Pressable onPress={onBack} style={styles.topIconBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.topBar}>
            <Pressable onPress={goBackStep} style={styles.topIconBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            {step === 'pickStaff' ? (
              <Text style={[styles.topBarCenterTitle, { fontFamily: fonts.semibold }]}>Select professional</Text>
            ) : step === 'datetime' ? (
              <Text style={[styles.topBarCenterTitle, { fontFamily: fonts.semibold }]}>Select time</Text>
            ) : step === 'review' ? (
              <Text style={[styles.topBarCenterTitle, { fontFamily: fonts.semibold }]}>Review booking</Text>
            ) : (
              <View />
            )}
            <Pressable onPress={onBack} style={styles.topIconBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        )}
        {error ? <Text style={[styles.error, { fontFamily: fonts.regular }]}>{error}</Text> : null}
        {renderStepContent()}
      </ScrollView>
      {step === 'services' || step === 'pickStaff' || step === 'datetime' || step === 'review' ? (
        <View style={[styles.singleFlowFooter, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.servicesFooterLeft}>
            <Text style={[styles.singleFlowPrice, { fontFamily: fonts.bold }]}>{totalPrice} CZK</Text>
            <View style={styles.servicesFooterMetaRow}>
              <Ionicons name="bag-handle-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.servicesFooterMeta, { fontFamily: fonts.regular }]}>
                {selectedService ? `1 service · ${humanDuration(selectedService.durationMinutes)}` : 'Select a service'}
              </Text>
            </View>
          </View>
          <Pressable
            disabled={
              !selectedService ||
              isSubmitting ||
              (step === 'pickStaff' && !hasChosenStaff) ||
              (step === 'datetime' && (slotHasConflict || isFullyBooked))
            }
            onPress={() => {
              if (step === 'services') {
                setStep('pickStaff');
                return;
              }
              if (step === 'pickStaff') {
                setStep('datetime');
                return;
              }
              if (step === 'datetime') {
                if (slotHasConflict || isFullyBooked) return;
                setStep('review');
                return;
              }
              if (step === 'review') {
                void onConfirmBooking();
              }
            }}
            style={[
              styles.singleFlowCta,
              (!selectedService ||
                isSubmitting ||
                (step === 'pickStaff' && !hasChosenStaff) ||
                (step === 'datetime' && (slotHasConflict || isFullyBooked))) &&
                styles.btnDisabled,
            ]}
          >
            <Text style={[styles.singleFlowCtaText, { fontFamily: fonts.bold }]}>
              {step === 'review' ? (isSubmitting ? 'Confirming…' : 'Confirm') : 'Continue'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <BottomSheet
        ref={calendarSheetRef}
        index={-1}
        snapPoints={calendarSnapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableOverDrag={false}
        onClose={() => setIsCalendarOpen(false)}
        onChange={(index) => setIsCalendarOpen(index >= 0)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.24} />
        )}
        backgroundStyle={styles.calendarSheet}
        handleIndicatorStyle={styles.calendarHandle}
        style={styles.calendarSheetContainer}
      >
        <View style={[styles.calendarContent, { paddingBottom: Math.max(insets.bottom + 16, 22) }]}>
            <View style={styles.calendarHeaderRow}>
              <Text style={[styles.calendarTitle, { fontFamily: fonts.bold }]}>Select date</Text>
              <Pressable
                onPress={() => {
                  calendarSheetRef.current?.close();
                }}
                style={styles.calendarCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.calendarMonthRow}>
              <Pressable
                onPress={() => {
                  const prev = new Date(calendarMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarMonth(prev);
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <Text style={[styles.calendarMonthText, { fontFamily: fonts.bold }]}>{calendarMonthLabel}</Text>
              <Pressable
                onPress={() => {
                  const next = new Date(calendarMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarMonth(next);
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.calendarWeekRow}>
              {CALENDAR_WEEK_DAYS.map((day) => (
                <Text key={day} style={[styles.calendarWeekText, { fontFamily: fonts.regular }]}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((cell) => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const isDisabled = cell.value < now;
                const isSelected = cell.value.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={cell.value.toISOString()}
                    disabled={isDisabled}
                    onPress={() => {
                      setSelectedDate(cell.value);
                      calendarSheetRef.current?.close();
                    }}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDayCellOn]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { fontFamily: fonts.semibold },
                        !cell.inCurrentMonth && styles.calendarDayTextMuted,
                        isDisabled && styles.calendarDayTextDisabled,
                        isSelected && styles.calendarDayTextOn,
                      ]}
                    >
                      {cell.value.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenterTitle: {
    fontSize: 16,
    color: colors.text,
  },
  serviceTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTopTitle: {
    fontSize: 16,
    color: colors.text,
    letterSpacing: 0,
  },
  stepHint: { ...typography.bodyMuted, fontSize: 13, marginBottom: 12, lineHeight: 19 },
  info: { color: colors.textMuted, marginBottom: 12 },
  error: { color: colors.error, marginBottom: 12 },
  item: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  itemOn: { borderColor: colors.primaryButton, backgroundColor: '#f8f4ff' },
  itemTitle: { fontSize: 16, color: colors.text },
  itemMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  servicesCategoryTabs: {
    paddingBottom: 8,
    gap: 8,
  },
  servicesCategoryTabBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 38,
    justifyContent: 'center',
  },
  servicesCategoryTabBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  servicesCategoryTabText: {
    fontSize: 16,
    color: colors.text,
  },
  servicesCategoryTabTextActive: {
    color: '#fff',
  },
  servicesSectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
    marginTop: 2,
    color: colors.text,
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  serviceRowLeft: { flex: 1, paddingRight: 12 },
  serviceRowTitle: { fontSize: 15, lineHeight: 20, color: colors.text },
  serviceRowMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  serviceRowDesc: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  serviceRowPrice: { marginTop: 6, fontSize: 15, color: colors.text },
  servicePickCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginTop: 12,
    ...shadow.card,
  },
  servicePickCircleOn: {
    backgroundColor: '#6f52ed',
    borderColor: '#6f52ed',
  },
  staffHead: { marginTop: 10, marginBottom: 8, fontSize: 14, color: colors.text },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  timeHeaderMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f0ff',
  },
  timeHeaderPillText: { fontSize: 14, color: colors.text },
  calendarIconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  calendarSheetContainer: {
    zIndex: 20,
    elevation: 20,
  },
  calendarSheet: {
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: 430,
    maxHeight: '74%',
    marginHorizontal: 10,
    marginBottom: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...shadow.card,
  },
  calendarHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
  },
  calendarContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 34,
    lineHeight: 38,
    color: colors.text,
    letterSpacing: -0.4,
  },
  calendarCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthText: {
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.3,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calendarWeekText: {
    width: '14.2%',
    textAlign: 'center',
    fontSize: 14,
    color: '#737373',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  calendarDayCell: {
    width: '14.2%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    marginBottom: 4,
  },
  calendarDayCellOn: {
    backgroundColor: '#6f52ed',
  },
  calendarDayText: {
    fontSize: 20,
    color: colors.text,
  },
  calendarDayTextOn: {
    color: '#fff',
  },
  calendarDayTextMuted: {
    color: '#a3a3a3',
  },
  calendarDayTextDisabled: {
    color: '#c7c7c7',
  },
  staffItem: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadow.card,
  },
  proChoiceList: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  noPrefIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },
  staffListRowOn: {
    backgroundColor: '#f9f8ff',
  },
  staffAvatarWrap: {
    width: 56,
    marginRight: 10,
    alignItems: 'center',
  },
  staffAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ddd6fe',
  },
  staffRatingBadge: {
    marginTop: -10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  staffRatingText: {
    fontSize: 12,
    color: colors.text,
  },
  staffListContent: {
    flex: 1,
    paddingRight: 12,
  },
  staffListName: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 20,
  },
  staffListMeta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 17,
  },
  proChoiceHelper: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
  },
  selectPill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectPillText: { color: colors.text, fontSize: 14 },
  selectPillOn: {
    borderColor: '#6f52ed',
    backgroundColor: '#f3f0ff',
  },
  selectPillTextOn: {
    color: '#5b3de0',
  },
  slotPill: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotPillOn: { borderColor: colors.primaryButton, backgroundColor: '#f8f4ff' },
  slotPillBusy: { backgroundColor: '#f3f4f6' },
  slotText: { fontSize: 13, color: colors.text },
  singleDateItem: {
    marginRight: 8,
    alignItems: 'center',
    minWidth: 66,
  },
  dateStripContent: {
    paddingBottom: 4,
  },
  singleDateCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  singleDateCircleOn: {
    backgroundColor: '#6f52ed',
    borderColor: '#6f52ed',
  },
  singleDateCircleDisabled: {
    borderColor: '#ececec',
    backgroundColor: '#fff',
  },
  singleDateNum: { fontSize: 20, color: colors.text },
  singleDateNumOn: { color: '#fff' },
  singleDateNumDisabled: { color: '#b6b6b6' },
  singleDateWeekday: { marginTop: 8, fontSize: 11, color: colors.text, textTransform: 'capitalize' },
  singleDateWeekdayDisabled: { color: '#b6b6b6' },
  slotTextDisabled: { color: colors.textMuted },
  monthTitle: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.2,
  },
  monthHeaderRow: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeListWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  timeListItem: {
    width: '31.5%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
  },
  timeListItemOn: {
    borderColor: '#6f52ed',
    backgroundColor: '#f8f4ff',
  },
  timeListItemBusy: {
    backgroundColor: '#f5f5f5',
  },
  timeListItemText: {
    fontSize: 14,
    color: colors.text,
  },
  fullyBookedWrap: {
    marginTop: 42,
    alignItems: 'center',
  },
  fullyBookedIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fullyBookedTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  fullyBookedSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  fullyBookedAction: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  fullyBookedActionSecondary: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  fullyBookedActionText: {
    fontSize: 14,
    color: colors.text,
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  waitlistHint: {
    fontSize: 15,
    color: colors.text,
  },
  waitlistLink: {
    fontSize: 15,
    color: '#6f52ed',
  },
  btnDisabled: { opacity: 0.5 },
  secondaryBtn: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryButton,
  },
  secondaryBtnText: { color: colors.primaryButton, fontSize: 14 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    ...shadow.card,
  },
  reviewBusinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewBusinessImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#ececec',
  },
  reviewBusinessTextWrap: {
    flex: 1,
  },
  reviewBusinessName: {
    fontSize: 16,
    color: colors.text,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  reviewRatingText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 2,
  },
  reviewBusinessAddress: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  reviewDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reviewInfoText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  reviewServiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewServiceTextWrap: {
    flex: 1,
  },
  reviewServiceName: {
    fontSize: 16,
    color: colors.text,
  },
  reviewServiceMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  reviewServicePrice: {
    fontSize: 16,
    color: colors.text,
  },
  reviewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewTotalLabel: {
    fontSize: 15,
    color: colors.text,
  },
  reviewTotalValue: {
    fontSize: 15,
    color: colors.text,
  },
  moreDetailsHeading: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 18,
    color: colors.text,
  },
  moreDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadow.card,
  },
  moreDetailsTitle: { fontSize: 14, color: colors.text, marginBottom: 4 },
  moreDetailsText: { fontSize: 13, color: colors.textMuted },
  warnBox: {
    backgroundColor: '#fff7ed',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warnText: { color: '#c2410c', marginBottom: 6 },
  singleFlowFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singleFlowPrice: { fontSize: 24, color: colors.text },
  servicesFooterLeft: { flex: 1 },
  servicesFooterMetaRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  servicesFooterMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  singleFlowCta: {
    backgroundColor: '#0b0f19',
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleFlowCtaText: { color: '#fff', fontSize: 15 },
});
