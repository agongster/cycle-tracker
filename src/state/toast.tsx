/**
 * Toast messages ("+5 care points!") live in their own contexts, apart from the app data.
 * Showing or hiding a toast then re-renders only the toast, not every screen.
 */
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export interface ToastMessage {
  id: number;
  message: string;
}
export type ShowToast = (message: string, ms?: number) => void;

const ToastMessageContext = createContext<ToastMessage | null>(null);
const ShowToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ShowToast>((message, ms = 2400) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), ms);
    // Android reads the toast through its live region. iOS needs an explicit announcement.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, []);

  return (
    <ShowToastContext.Provider value={showToast}>
      <ToastMessageContext.Provider value={toast}>{children}</ToastMessageContext.Provider>
    </ShowToastContext.Provider>
  );
}

/** Stable function for showing a toast. Using it doesn't re-render on every toast. */
export const useShowToast = () => useContext(ShowToastContext);

/** The toast currently on screen (only the toast component needs this). */
export const useToastMessage = () => useContext(ToastMessageContext);
