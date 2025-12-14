

export interface HospitalStyle {
  primaryColor: string;
  fontFamily: 'serif' | 'sans-serif';
  backgroundColor?: string;
  textColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  // New Detailed Styling
  headerPaddingTop?: string; // e.g., '1rem'
  headerPaddingBottom?: string; // e.g., '1rem'
  footerPadding?: string; // e.g., '1rem'
  h1Size?: string;        // e.g., '2rem'
  h2Size?: string;        // e.g., '1.5rem'
  bodySize?: string;      // e.g., '1rem'
}

export interface Template extends HospitalStyle {
  name: string;
}

export interface PatientData {
  // Structured Name
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  dob: string;
  
  // Demographics
  gender?: string;
  ethnicity?: string;

  patientStreetAddress?: string;
  patientCity?: string;
  patientState?: string;
  patientZip?: string;
  patientPhone?: string;
  patientSsnLast4?: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  admissionTemp?: string; // New
  dischargeTemp?: string; // New
  intake: string;
  admissionTime?: string;
  discharge: string;
  dischargeTime?: string;
  symptoms: string;
  diagnosis: string;
  prescriptions: string;
  instructions: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalUrl?: string;
  hospitalLogoUrl?: string;
  hospitalStyle?: HospitalStyle;
  returnToWorkSchoolDate?: string;
  attendingPhysician?: string;

  // Allergies
  knownAllergies?: string;
  otherAllergy?: string;

  // Medical History (Optional)
  medicalHistory?: {
    chronicConditions?: string;
    pastSurgeries?: string;
    familyMedicalHistory?: string;
    socialHistory?: string; // e.g., smoking, alcohol use
    immunizationStatus?: string;
  };

  // AI Generated Content
  diagnosisExplanation?: string;
  treatmentExplanation?: string;
  symptomInstructions?: string;
  referrals?: {
    name: string;
    specialty: string;
    practice: string;
    address: string;
    phone: string;
  }[];
  lifestyleRecommendations?: string;
  medicationSideEffects?: string;
  followUpCare?: string;
  faq?: {
      question: string;
      answer: string;
  }[];
  showWatermark?: boolean;
  watermarkText?: string;
}

export interface DoctorExcuseData {
  // Structured Name
  patientFirstName: string;
  patientMiddleName: string;
  patientLastName: string;
  patientSuffix: string;
  
  patientDob?: string;
  dateOfVisit: string;
  absenceStartDate: string;
  absenceEndDate: string;
  returnDate: string;
  diagnosis: string;
  aiReasonForAbsence?: string; // New field for AI-generated vague reason
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalUrl?: string;
  hospitalLogoUrl?: string;
  hospitalStyle?: HospitalStyle;
  attendingPhysician?: string;
  showWatermark?: boolean;
  watermarkText?: string;
}

export interface FuneralProgramData {
  // Deceased Info
  deceasedFirstName: string;
  deceasedLastName: string;
  deceasedMiddleName?: string;
  deceasedSuffix?: string;
  dateOfBirth: string;
  dateOfDeath: string;
  photoUrl?: string;
  obituary: string;
  
  // Service Info
  serviceDate: string;
  serviceTime: string;
  
  // Location Info
  funeralHomeName: string;
  funeralHomeAddress: string;
  cemeteryName: string;
  cemeteryAddress: string;
  hospitalLogoUrl?: string; // Added hospitalLogoUrl for consistency and potential use

  // Program Content
  orderOfService: string;
  pallbearers: string;
  acknowledgements: string;

  // Creator Info
  creatorFirstName: string;
  creatorLastName: string;
  creatorRelationship: string;
  creatorParticipationRoles?: string[];
  
  // Styling
  hospitalStyle?: HospitalStyle;
  showWatermark?: boolean;
  watermarkText?: string;
}