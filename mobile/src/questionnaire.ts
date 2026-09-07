export type QuestionnaireQuestion = { id: string; label: string };
export type QuestionnaireSection = { title: string; questions: QuestionnaireQuestion[] };

/** The canonical section and question structure used by the patient and doctor views. */
export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    title: 'Emergency Symptoms', questions: [
      { id: 'emergency_pain', label: 'Experiencing severe pain?' },
      { id: 'emergency_breath', label: 'Difficulty breathing or shortness of breath?' },
      { id: 'emergency_unconscious', label: 'Unconsciousness or altered mental state?' },
      { id: 'emergency_bleeding', label: 'Recent injury with heavy bleeding?' },
    ]
  },
  {
    title: 'Signs of a Stroke (FAST)', questions: [
      { id: 'stroke_face', label: 'Facial droop?' },
      { id: 'stroke_weakness', label: 'Weakness on one side?' },
      { id: 'stroke_speech', label: 'Slurred speech?' },
    ]
  },
  {
    title: 'Indications of Sepsis', questions: [
      { id: 'sepsis_confusion', label: 'Slurred speech or confusion?' },
      { id: 'sepsis_shiver', label: 'Shivering or muscle pain?' },
      { id: 'sepsis_skin', label: 'Skin discoloration or rash?' },
    ]
  },
  {
    title: 'Signs of Heart Attack', questions: [
      { id: 'heartattack_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
    ]
  },
  {
    title: 'General Symptoms', questions: [
      { id: 'general_symptoms_fever', label: 'Experiencing persistent fever?' },
      { id: 'general_symptoms_fatigue', label: 'Feeling extreme fatigue or weakness?' },
      { id: 'general_symptoms_weightloss', label: 'Unexplained weight loss?' },
    ]
  },
  {
    title: 'Respiratory & ENT Issues', questions: [
      { id: 'respiratory_ent_cough', label: 'Persistent cough?' },
      { id: 'respiratory_ent_taste', label: 'Sudden loss of taste or smell?' },
      { id: 'respiratory_ent_throat', label: 'Severe sore throat?' },
    ]
  },
  {
    title: 'Digestive Issues', questions: [
      { id: 'digestive_abdominal_pain', label: 'Severe abdominal pain?' },
      { id: 'digestive_gi', label: 'Persistent nausea, vomiting, or diarrhea?' },
    ]
  },
  {
    title: 'Neurological Symptoms', questions: [
      { id: 'neuro_headache', label: 'New or worsening severe headaches?' },
      { id: 'neuro_vision', label: 'Sudden onset of vision changes?' },
      { id: 'neuro_balance', label: 'Difficulty with balance or coordination?' },
    ]
  },
  {
    title: 'Mental Well-being', questions: [
      { id: 'mental_anxiety', label: 'Experiencing severe anxiety or panic attacks?' },
      { id: 'mental_sadness', label: 'Persistent feelings of sadness or self-harm thoughts?' },
    ]
  },
];
