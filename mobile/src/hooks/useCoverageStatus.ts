// src/hooks/useCoverageStatus.ts — single source of truth for whether a patient's coverage
// still allows booking, and the purchase-anchored countdown shown on the Coverage Status
// widget. Shared by Home.tsx (display + gating "New Consultation") and ConsultationTracker.tsx
// (gating the actual booking flow) so the two screens can never disagree about whether
// coverage has expired — which is exactly the bug this was extracted to prevent.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL, authFetch, getActivationPaymentSummary, type ActivationPaymentSummary } from '../api';
import { useAuth } from '../state/auth';
import { clinicDateKey } from '../lib/appointmentTime';

export type CoverageTraveler = { id?: number; fullName: string; dateOfBirth?: string };
export type RegData = {
  id: number; from: string; to: string; start: string; end: string;
  packageDays: number | null; travelers: CoverageTraveler[];
};
export type CoverageState = 'unactivated' | 'active' | 'expiring' | 'expired';

// Calendar-day arithmetic (ignores time-of-day) so a package purchased at, say, 11:50pm still
// counts as starting that calendar day, not spilling into the next one.
function addCalendarDays(dateInput: string, days: number): Date {
  const d = new Date(dateInput);
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}
function startOfDay(dateInput: string): Date {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function useCoverageStatus() {
  const { user, loading: authLoading } = useAuth();
  const [reg, setReg] = useState<RegData | null>(null);
  const [activation, setActivation] = useState<ActivationPaymentSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !user?.email) return;
      const email = user.email;
      let alive = true;
      (async () => {
        try {
          const res = await authFetch(`${API_BASE_URL}/registrations?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            const latest = Array.isArray(data) ? data[data.length - 1] : data;
            if (latest && alive) {
              setReg({
                id: latest.id,
                from: latest['Travelling From'] ?? latest.travellingFrom ?? '',
                to: latest['Travelling To (UK & Europe)'] ?? latest.travellingTo ?? '',
                start: latest['Travel Start Date'] ?? latest.travelStartDate ?? '',
                end: latest['Travel End Date'] ?? latest.travelEndDate ?? '',
                packageDays: latest['Package Days'] ?? latest.packageDays ?? null,
                travelers: Array.isArray(latest.travelers) ? latest.travelers : [],
              });
            }
          }
          const a = await getActivationPaymentSummary().catch(() => null);
          if (alive) setActivation(a);
        } finally {
          if (alive) setLoaded(true);
        }
      })();
      return () => { alive = false; };
    }, [user?.email, authLoading])
  );

  const now = Date.now();
  const todayKey = clinicDateKey(new Date());

  // Trip-date-anchored expiry check — one of two signals `bookingBlocked` combines.
  const isExpired = !!reg?.end && todayKey > reg.end;
  const packageDaysPurchased = activation?.packageDays || reg?.packageDays || 0;

  // Purchase-anchored coverage window — Start + Total Days = End, so the numbers shown on the
  // Coverage Status widget always add up, independent of the (possibly different) trip dates.
  const coverageStart = activation?.activatedAt ? startOfDay(activation.activatedAt) : null;
  const coverageEnd = activation?.activatedAt && packageDaysPurchased > 0
    ? addCalendarDays(activation.activatedAt, packageDaysPurchased)
    : null;
  const coverageDaysLeft = coverageEnd ? Math.max(0, Math.ceil((coverageEnd.getTime() - now) / 86400000)) : null;
  const coverageDaysElapsed = coverageStart
    ? Math.max(0, Math.min(packageDaysPurchased, Math.floor((now - coverageStart.getTime()) / 86400000)))
    : 0;
  const coverageProgress = packageDaysPurchased > 0 ? coverageDaysElapsed / packageDaysPurchased : 0;

  const coverageState: CoverageState =
    !activation?.activated || coverageDaysLeft === null ? 'unactivated'
      : coverageDaysLeft === 0 ? 'expired'
      : coverageDaysLeft <= 2 ? 'expiring'
      : 'active';

  // Booking is blocked if EITHER the trip window has closed OR the purchased package days have
  // run out — whichever says "expired" wins. Used to gate booking everywhere it can happen
  // (Home's "New Consultation"/"Book Appointment" CTAs, and the tracker screen's slot picker).
  const bookingBlocked = isExpired || coverageState === 'expired';

  return {
    reg, activation, loaded,
    isExpired, packageDaysPurchased,
    coverageStart, coverageEnd, coverageDaysLeft, coverageDaysElapsed, coverageProgress,
    coverageState, bookingBlocked,
  };
}
