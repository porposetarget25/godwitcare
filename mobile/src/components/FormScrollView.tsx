// src/components/FormScrollView.tsx — drop-in ScrollView replacement for screens with
// TextInputs. A plain ScrollView only lets the keyboard shrink the visible area; it never
// scrolls the focused field above the keyboard, which is what was still hiding inputs.
import React from 'react';
import { ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export function FormScrollView(props: ScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={20}
      keyboardOpeningTime={0}
      {...props}
    />
  );
}
