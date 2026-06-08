// src/state/registration.tsx
import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Registration } from '../api';

const STORAGE_KEY = 'reg-draft';

const defaults: Registration = {
  'First Name': '',
  'Middle Name': '',
  'Last Name': '',
  'Date of Birth': '',
  'Gender': '',
  'Primary WhatsApp Number': '',
  'Carer/Secondary WhatsApp Number': '',
  'Email Address': '',
  'Are you on any long-term/regular medication that we should be aware of?': false,
  'Do you have any health condition that can affect your trip?': false,
  'Do you have any allergies that can affect your trip?': false,
  'Have you been advised to produce a fit-to-fly certificate?': false,
  'Travelling From': '',
  'Travelling To (UK & Europe)': '',
  'Travel Start Date': '',
  'Travel End Date': '',
  'Package Days': 7,
};

type Ctx = {
  draft: Registration;
  setDraft: (updater: Registration | ((prev: Registration) => Registration)) => void;
  clearDraft: () => void;
};

const RegCtx = createContext<Ctx>({
  draft: defaults,
  setDraft: () => {},
  clearDraft: () => {},
} as any);

export function RegProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraftState] = useState<Registration>(defaults);

  // Load from storage on mount
  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((cached) => {
      if (cached) {
        try {
          setDraftState(JSON.parse(cached));
        } catch {}
      }
    });
  }, []);

  function setDraft(updater: Registration | ((prev: Registration) => Registration)) {
    setDraftState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function clearDraft() {
    setDraftState(defaults);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }

  return (
    <RegCtx.Provider value={{ draft, setDraft, clearDraft }}>
      {children}
    </RegCtx.Provider>
  );
}

export function useReg() {
  return useContext(RegCtx);
}
