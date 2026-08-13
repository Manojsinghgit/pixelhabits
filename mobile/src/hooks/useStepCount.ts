import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

export type StepCountStatus = 'loading' | 'unavailable' | 'denied' | 'ready';

interface StepCountState {
  status: StepCountStatus;
  steps: number;
  // iOS can query the full day from the motion coprocessor; Android's
  // pedometer sensor only reports a live count from the moment we start
  // listening, so the number there reflects "since app opened", not the
  // full day. The UI adapts its label based on this.
  isFullDay: boolean;
}

export function useStepCount() {
  const [state, setState] = useState<StepCountState>({ status: 'loading', steps: 0, isFullDay: false });
  const baseline = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      if (!available) {
        setState({ status: 'unavailable', steps: 0, isFullDay: false });
        return;
      }

      let permission = await Pedometer.getPermissionsAsync().catch(() => null);
      if (permission && permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Pedometer.requestPermissionsAsync().catch(() => permission);
      }
      if (cancelled) return;
      if (permission && permission.status !== 'granted') {
        setState({ status: 'denied', steps: 0, isFullDay: false });
        return;
      }

      const isFullDay = Platform.OS === 'ios';
      if (isFullDay) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date()).catch(() => null);
        baseline.current = result?.steps ?? 0;
      }

      if (cancelled) return;
      setState({ status: 'ready', steps: baseline.current, isFullDay });

      subscription = Pedometer.watchStepCount((result) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: 'ready', steps: baseline.current + result.steps }));
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return state;
}
