// src/screens/Faqs.tsx — mirrors web's .portal card/accordion styling.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { ws, wc } from '../webStyle';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

type FAQ = { q: string; a: string };
type Section = { title: string; icon: string; faqs: FAQ[] };

const SECTIONS: Section[] = [
  {
    title: 'Getting Started',
    icon: '🚀',
    faqs: [
      {
        q: 'What is GodwitCare?',
        a: 'GodwitCare is a travel health platform that connects you with certified medical professionals via WhatsApp. We provide instant consultations, digital prescriptions, and referral letters — wherever you are in the world.',
      },
      {
        q: 'How do I create an account?',
        a: 'Tap "Get Started" on the welcome screen and complete the three-step registration: your personal details, trip information, and a health declaration. The whole process takes under five minutes.',
      },
      {
        q: 'Which countries are covered?',
        a: 'GodwitCare operates globally. Our UK & Europe plan covers travel within the UK, European Union, and EEA countries. Our clinicians are based in the UK and operate on UK time (GMT/BST).',
      },
      {
        q: 'Is GodwitCare available 24/7?',
        a: 'Our clinicians are available Monday to Friday, 9:00 AM – 5:00 PM UK time. Outside these hours you can still submit a consultation request and a clinician will respond at the next available opportunity.',
      },
    ],
  },
  {
    title: 'Consultations',
    icon: '💬',
    faqs: [
      {
        q: 'How does a WhatsApp consultation work?',
        a: 'After submitting your pre-consultation checklist, tap "Notify Clinician" in the Consultation Tracker. A doctor will contact you via WhatsApp call within the agreed timeframe to discuss your symptoms and provide medical advice.',
      },
      {
        q: 'What conditions can be treated?',
        a: 'We handle a wide range of non-emergency travel health conditions: infections, stomach issues, skin conditions, allergies, minor injuries, and more. For medical emergencies, always call the local emergency number (e.g. 999 in the UK).',
      },
      {
        q: 'Can I consult a doctor for someone else in my group?',
        a: 'Yes. When registering, add all travellers under your package. During a consultation you can request advice for any listed traveller. Each traveller\'s health details remain confidential within your group.',
      },
      {
        q: 'What happens if I need an in-person examination?',
        a: 'If a clinician determines that an in-person examination is necessary, they will advise you accordingly and can provide a referral letter to present at a local clinic or hospital.',
      },
      {
        q: 'Are controlled substances prescribed?',
        a: 'No. GodwitCare does not prescribe controlled substances such as opioids, benzodiazepines, or stimulants. Recreational drugs are strictly outside the scope of our service.',
      },
    ],
  },
  {
    title: 'Prescriptions & Referrals',
    icon: '💊',
    faqs: [
      {
        q: 'How do I receive my prescription?',
        a: 'Once your consultation is complete, your digital prescription is generated and available in the app under "Prescription" in Quick Links. It is digitally signed by the prescribing doctor and valid at pharmacies.',
      },
      {
        q: 'How long is a prescription valid?',
        a: 'Prescriptions are typically valid for 6 months from the date of issue, unless otherwise stated. Some medications may have shorter validity periods — always check with the pharmacist.',
      },
      {
        q: 'What is a referral letter?',
        a: 'A referral letter is a formal document from your GodwitCare clinician addressed to a local doctor or hospital. It summarises your presenting complaint, medical history, and recommended treatment, helping local providers deliver faster, better care.',
      },
      {
        q: 'Can I download my documents?',
        a: 'Yes. Tap the download icon (⬇) in the PDF viewer to save any prescription or referral letter to your device\'s Downloads folder.',
      },
    ],
  },
  {
    title: 'Account & Billing',
    icon: '💳',
    faqs: [
      {
        q: 'What packages are available?',
        a: 'We offer 7-day, 14-day, and 30-day packages. Each covers unlimited consultations within the package period. Pricing details are available on our website at godwitcare.com.',
      },
      {
        q: 'Can I cancel or change my package?',
        a: 'You may cancel at any time. If you cancel before your trip starts, a refund will be processed within 5–10 business days. Mid-trip cancellations are not eligible for a refund unless exceptional circumstances apply.',
      },
      {
        q: 'How do I update my personal details?',
        a: 'Go to Profile in the sidebar, tap "Edit" to enter edit mode, update your information, and tap "Save".',
      },
      {
        q: 'How do I add or change my profile photo?',
        a: 'In the Profile screen, tap your avatar photo to open the photo options. You can take a new photo, choose one from your gallery, or remove the existing photo.',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    icon: '🔒',
    faqs: [
      {
        q: 'Is my medical data secure?',
        a: 'Yes. All data is encrypted in transit (TLS) and at rest. We comply with UK GDPR and the Data Protection Act 2018. Your medical records are never shared with third parties without your explicit consent.',
      },
      {
        q: 'What is the PIN lock feature?',
        a: 'PIN lock adds a 4-digit code screen when you reopen the app, keeping your health data private if someone else picks up your phone. You can also enable fingerprint/Face ID as an alternative. Set it up under Profile → PIN & Biometrics.',
      },
      {
        q: 'Who can see my consultation history?',
        a: 'Only you and your treating GodwitCare clinician can see your consultation records. Administrators have access only for billing and support purposes.',
      },
    ],
  },
  {
    title: 'Technical',
    icon: '📱',
    faqs: [
      {
        q: 'The PDF is not opening — what should I do?',
        a: 'Make sure you are connected to the same WiFi network as your registered device. If the issue persists, try the download button (⬇) to save the PDF to your device and open it with a local PDF viewer.',
      },
      {
        q: 'I forgot my PIN — how do I reset it?',
        a: 'On the PIN screen, tap "Sign out instead" to log out, then log back in with your WhatsApp number and password. Once authenticated, you can set a new PIN under Profile → PIN & Biometrics.',
      },
      {
        q: 'The app is not connecting to the server.',
        a: 'Check that your device and the app server are on the same WiFi network. If you are using the app on a mobile data connection, ensure the server is publicly accessible. Contact support if the issue continues.',
      },
    ],
  },
];

function FaqItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  }
  return (
    <View style={f.item}>
      <TouchableOpacity style={f.question} onPress={toggle} activeOpacity={0.75}>
        <Text style={f.questionTxt}>{faq.q}</Text>
        <Text style={[f.caret, open && f.caretOpen]}>›</Text>
      </TouchableOpacity>
      {open && <Text style={f.answer}>{faq.a}</Text>}
    </View>
  );
}

export default function Faqs() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="FAQs" subtitle="Frequently asked questions" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Everything you need to know about GodwitCare. Can't find your answer? Contact us via WhatsApp.
        </Text>
        {SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={{ fontSize: 17 }}>{section.icon}</Text>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
            <View style={ws.card}>
              {section.faqs.map((faq, i) => (
                <React.Fragment key={faq.q}>
                  {i > 0 && <View style={s.sep} />}
                  <FaqItem faq={faq} />
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: wc.textMuted, lineHeight: 18, marginBottom: 14 },
  section: { marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: wc.textPrimary },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: wc.border },
});

const f = StyleSheet.create({
  item: { padding: 14 },
  question: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  questionTxt: { flex: 1, fontSize: 14, fontWeight: '500', color: wc.textPrimary, lineHeight: 19 },
  caret: { fontSize: 19, color: wc.fillAccent, transform: [{ rotate: '0deg' }], marginTop: -2, fontWeight: '300' },
  caretOpen: { transform: [{ rotate: '90deg' }] },
  answer: { fontSize: 14, color: wc.textSecondary, lineHeight: 19, marginTop: 8, paddingRight: 12 },
});
