import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { PatientData } from '../types';
import { SpinnerIcon, SparkleIcon } from './Icons';
import { US_STATES, GENDERS, ETHNICITIES, ALLERGIES } from '../utils/formData';
import { validateDischargeSummary } from '../utils/validation';

type LogoFetchStatus = 'idle' | 'success' | 'error';

interface PatientFormProps {
  formData: PatientData;
  setFormData: React.Dispatch<React.SetStateAction<PatientData>>;
  physicians?: { name: string; specialty: string }[];
  physicianError?: string | null;
  errors: Partial<Record<keyof PatientData, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof PatientData, string>>>>;
  logoFetchStatus: LogoFetchStatus;
  setLogoFetchStatus: React.Dispatch<React.SetStateAction<LogoFetchStatus>>;
}

interface InputGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  isTextArea?: boolean; // Added isTextArea
  rows?: number;
  maxLength?: number;
  className?: string;
  onFocus?: () => void;
  children?: React.ReactNode;
  isSelect?: boolean;
  disabled?: boolean;
  step?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, name, value, onChange, onBlur, error, type = 'text', placeholder, isTextArea = false, rows = 3, maxLength, className = '', onFocus, children, isSelect=false, disabled=false, step }) => {
  const baseClasses = `w-full px-3 py-2 glass-input rounded-md shadow-sm transition duration-150 ease-in-out`;
  const stateClasses = `${error ? 'error' : ''} ${disabled ? 'bg-slate-800/60 cursor-not-allowed text-slate-400' : ''}`;
  const dateClasses = type === 'date' && !value ? 'text-slate-400' : 'text-slate-100';

  const commonProps = {
    id: name,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    step
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {isTextArea ? (
        <textarea {...commonProps} placeholder={placeholder} rows={rows} maxLength={maxLength} onFocus={onFocus} className={`${baseClasses} ${stateClasses}`}></textarea>
      ) : isSelect ? (
        <select {...commonProps} className={`${baseClasses} ${stateClasses}`}>
          {children}
        </select>
      ) : (
        <input {...commonProps} type={type} placeholder={placeholder} maxLength={maxLength} onFocus={onFocus} className={`${baseClasses} ${stateClasses} ${dateClasses}`} />
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

const StatusBanner: React.FC<{
    status: LogoFetchStatus;
    onDismiss: () => void;
}> = ({ status, onDismiss }) => {
    if (status === 'idle') return null;

    const isSuccess = status === 'success';
    const bgColor = isSuccess ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30';
    const textColor = isSuccess ? 'text-green-300' : 'text-red-300';
    const message = isSuccess ? 'Successfully fetched facility logo.' : 'Could not find a logo for this facility.';

    return (
        <div className={`p-3 mb-4 rounded-md flex justify-between items-center text-sm animate-fade-in ${bgColor} ${textColor}`}>
            <span>{message}</span>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/10">&times;</button>
        </div>
    );
};

type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const TABS = [
    { id: 'patient', name: 'Patient Info', fields: ['firstName', 'lastName', 'dob', 'gender', 'ethnicity', 'patientStreetAddress', 'patientCity', 'patientState', 'patientZip', 'patientPhone', 'patientSsnLast4'] },
    { id: 'vitals', name: 'Vitals & Dates', fields: ['heightFt', 'heightIn', 'weight', 'admissionTemp', 'dischargeTemp', 'intake', 'admissionTime', 'discharge', 'dischargeTime', 'returnToWorkSchoolDate'] },
    { id: 'medical', name: 'Medical Details', fields: ['symptoms', 'diagnosis', 'prescriptions', 'instructions', 'knownAllergies', 'otherAllergy'] },
    { id: 'history', name: 'Medical History', fields: ['medicalHistory.chronicConditions', 'medicalHistory.pastSurgeries', 'medicalHistory.familyMedicalHistory', 'medicalHistory.socialHistory', 'medicalHistory.immunizationStatus'] },
    { id: 'physician', name: 'Physician', fields: ['attendingPhysician'] },
];

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    hasError: boolean;
    children: React.ReactNode;
}> = ({ isActive, onClick, hasError, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:bg-white/10'
        }`}
    >
        {children}
        {hasError && <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-800" />}
    </button>
);


const PatientForm: React.FC<PatientFormProps> = ({ formData, setFormData, physicians, physicianError, errors, setErrors, logoFetchStatus, setLogoFetchStatus }) => {
  // AI Content Generation State
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // NPI Lookup state is no longer needed since physician credentials/NPI are removed.
  // Address Autocomplete State
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isAddressSuggestionsOpen, setIsAddressSuggestionsOpen] = useState(false);
  const [addressLookupStatus, setAddressLookupStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const addressInputRef = useRef<HTMLDivElement>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  // Effect to switch to the first tab with an error
  useEffect(() => {
      const errorKeys = Object.keys(errors).filter(key => errors[key as keyof PatientData]);
      if (errorKeys.length > 0) {
          const firstErrorKey = errorKeys[0];
          const tabWithError = TABS.find(tab => tab.fields.some(field => field === firstErrorKey || firstErrorKey.startsWith(field)));
          if (tabWithError && tabWithError.id !== activeTab) {
              setActiveTab(tabWithError.id);
          }
      }
  }, [errors]);
  
  // Effect to auto-dismiss the logo status banner
  useEffect(() => {
      if (logoFetchStatus !== 'idle') {
          const timer = setTimeout(() => setLogoFetchStatus('idle'), 5000);
          return () => clearTimeout(timer);
      }
  }, [logoFetchStatus, setLogoFetchStatus]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target as { name: keyof PatientData };
    const fieldErrors = validateDischargeSummary({ ...formData, [name]: e.target.value });
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (errors[name as keyof PatientData]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    if (name.startsWith('medicalHistory.')) {
        const key = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            medicalHistory: {
                ...prev.medicalHistory,
                [key]: value
            }
        }));
    } else if (name === 'attendingPhysician') {
        // Clear NPI/credentials if physician name changes (no longer needed)
        setFormData(prev => ({ ...prev, attendingPhysician: value }));
    } else if (name === 'patientPhone') {
        setFormData(prev => ({ ...prev, patientPhone: formatPhoneNumber(value) }));
    } else if (name === 'patientSsnLast4') {
        const ssnValue = value.replace(/[^\d]/g, '');
        setFormData(prev => ({ ...prev, patientSsnLast4: ssnValue }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // No longer needed since NPI lookup is removed
  // useEffect(() => {
  //   const handler = setTimeout(() => {
  //       const physicianName = formData.attendingPhysician?.trim();
  //       if (physicianName && physicianName.length > 5) {
  //           handleNpiLookup(physicianName);
  //       }
  //   }, 1000);
  //   return () => clearTimeout(handler);
  // }, [formData.attendingPhysician]);

  useEffect(() => {
    const handler = setTimeout(() => {
        const streetAddress = formData.patientStreetAddress?.trim();
        if (streetAddress && streetAddress.length >= 5 && isAddressSuggestionsOpen) {
            handleAddressSearch(streetAddress);
        } else {
            setAddressSuggestions([]);
        }
    }, 500);
    return () => clearTimeout(handler);
  }, [formData.patientStreetAddress, isAddressSuggestionsOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
            setIsAddressSuggestionsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressSearch = async (partialAddress: string) => {
    setAddressLookupStatus('loading');
    setAddressSuggestions([]);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Provide address auto-completion suggestions for "${partialAddress}". Return up to 5 results as a clean, minified JSON array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            streetAddress: { type: Type.STRING, description: "Full street address, including number and street name." },
                            city: { type: Type.STRING, description: "City name." },
                            state: { type: Type.STRING, description: "State abbreviation (e.g., CA, NY)." },
                            zip: { type: Type.STRING, description: "5-digit ZIP code." }
                        },
                        required: ["streetAddress", "city", "state", "zip"],
                    }
                }
            },
        });
        const data = JSON.parse(response.text.trim());
        setAddressSuggestions(data || []);
        setAddressLookupStatus('idle');
    } catch (error) {
        console.error("Address search failed:", error);
        setAddressLookupStatus('error');
        setAddressSuggestions([]);
    }
  };

  const handleAddressSelect = (address: { streetAddress: string; city: string; state: string; zip: string; }) => {
    setFormData(prev => ({
        ...prev,
        patientStreetAddress: address.streetAddress || '',
        patientCity: address.city || '',
        patientState: address.state || '',
        patientZip: address.zip || ''
    }));
    setIsAddressSuggestionsOpen(false);
    setAddressSuggestions([]);
  };

  // NPI lookup function removed
  // const handleNpiLookup = async (physicianName: string) => { ... }
  
  const handleGenerateMedicalDetails = async () => {
    if (!formData.diagnosis) {
        setErrors(prev => ({ ...prev, diagnosis: "A diagnosis is required to generate details." }));
        return;
    }
    setIsGeneratingDetails(true);
    setGenerationError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `You are an expert medical scribe AI responsible for completing patient discharge summaries.
            A final diagnosis has been provided: "${formData.diagnosis}".
            The user may have partially filled out the form. Your task is to:
            1. Review the entire provided form data for context.
            2. Based on the diagnosis of "${formData.diagnosis}", intelligently and realistically fill in ALL missing fields in the schema.
            3. Correct any existing information that seems inconsistent or incorrect for this diagnosis.
            4. Generate all supplementary patient-facing explanations.

            The response MUST be a single, minified line of JSON with no markdown formatting. The JSON object must adhere to the provided schema. For dates, use "YYYY-MM-DD" format. For temperatures, provide a realistic value as a string (e.g., "101.2").

            Here is the current, partially filled form data for your review:
            ${JSON.stringify(formData)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        symptoms: { type: Type.STRING, description: "Typical symptoms at admission for the diagnosis." },
                        prescriptions: { type: Type.STRING, description: "Standard prescriptions at discharge, including dosages." },
                        instructions: { type: Type.STRING, description: "General discharge instructions." },
                        knownAllergies: { type: Type.STRING, description: "Common related allergies or 'None'." },
                        otherAllergy: { type: Type.STRING, description: "Specify allergy if 'knownAllergies' is 'Other'." },
                        admissionTemp: { type: Type.STRING, description: "Typical admission temperature in Fahrenheit (e.g., '101.5')." },
                        dischargeTemp: { type: Type.STRING, description: "Typical discharge temperature in Fahrenheit (e.g., '98.7')." },
                        returnToWorkSchoolDate: { type: Type.STRING, description: "A realistic return date in YYYY-MM-DD format based on the diagnosis and discharge date." },
                        medicalHistory: {
                            type: Type.OBJECT,
                            properties: {
                                chronicConditions: { type: Type.STRING, description: "Plausible chronic conditions related to the diagnosis." },
                                pastSurgeries: { type: Type.STRING, description: "Plausible past surgeries or 'None'." },
                                familyMedicalHistory: { type: Type.STRING, description: "Plausible family medical history." },
                                socialHistory: { type: Type.STRING, description: "Plausible social history (e.g., 'Non-smoker')." },
                                immunizationStatus: { type: Type.STRING, description: "e.g., 'Up to date'." },
                            }
                        },
                        diagnosisExplanation: { type: Type.STRING, description: "A simple explanation of the diagnosis." },
                        treatmentExplanation: { type: Type.STRING, description: "A summary of treatment provided." },
                        medicationSideEffects: { type: Type.STRING, description: "Common potential side effects for the prescriptions." },
                        lifestyleRecommendations: { type: Type.STRING, description: "Recommendations for diet, activity, etc." },
                        followUpCare: { type: Type.STRING, description: "Instructions for follow-up appointments." },
                        symptomInstructions: { type: Type.STRING, description: "Symptoms to watch for and when to seek emergency care." },
                        faq: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    answer: { type: Type.STRING },
                                },
                                required: ["question", "answer"]
                            }
                        }
                    },
                }
            }
        });
        
        const data = JSON.parse(response.text.trim());

        // Overwrite form data with the comprehensive AI response
        setFormData(prev => ({
             ...prev,
             ...data,
             // Ensure nested medicalHistory object is merged correctly
             medicalHistory: {
                 ...prev.medicalHistory,
                 ...(data.medicalHistory || {}),
             }
        }));
    } catch (error) {
        console.error("Failed to generate medical details:", error);
        setGenerationError("An error occurred while generating details. Please try again.");
    } finally {
        setIsGeneratingDetails(false);
    }
  };


  // NPI status rendering removed
  // const renderNpiStatus = () => { ... }

  const tabsWithErrors = TABS.map(tab => ({
    ...tab,
    hasError: tab.fields.some(field => {
        const key = field as keyof PatientData;
        const nestedKey = field.split('.');
        if (nestedKey.length > 1 && nestedKey[0] === 'medicalHistory' && formData.medicalHistory) {
             return !!errors[nestedKey[0] as keyof PatientData];
        }
        return !!errors[key];
    })
  }));

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="p-4 glassmorphism rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-1">{formData.hospitalName}</h3>
            <p className="text-sm text-slate-300 mb-4">{formData.hospitalAddress}</p>
            <StatusBanner status={logoFetchStatus} onDismiss={() => setLogoFetchStatus('idle')} />
        </div>

        <div className="p-2 mb-6 glassmorphism rounded-lg flex items-center justify-center flex-wrap gap-2">
            {tabsWithErrors.map(tab => (
                <TabButton
                    key={tab.id}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    hasError={tab.hasError}
                >
                    {tab.name}
                </TabButton>
            ))}
        </div>
        
        <div className="space-y-6">
            {/* Tab Content */}
            {activeTab === 'patient' && (
                <div className="p-4 glassmorphism rounded-lg animate-fade-in">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <InputGroup label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} error={errors.firstName} className="md:col-span-2" />
                        <InputGroup label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} />
                        <InputGroup label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} error={errors.lastName} className="md:col-span-2" />
                        <InputGroup label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} />
                        <InputGroup label="Date of Birth" name="dob" value={formData.dob} onChange={handleChange} onBlur={handleBlur} error={errors.dob} type="date" className="md:col-span-2" />
                        <InputGroup label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange} isSelect>
                            <option value="">-- Select --</option>
                            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </InputGroup>
                        <InputGroup label="Ethnicity" name="ethnicity" value={formData.ethnicity || ''} onChange={handleChange} isSelect>
                            <option value="">-- Select --</option>
                            {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                        </InputGroup>
                         <div className="relative md:col-span-4" ref={addressInputRef}>
                            <InputGroup 
                                label="Street Address" 
                                name="patientStreetAddress" 
                                value={formData.patientStreetAddress || ''} 
                                onChange={handleChange} 
                                onFocus={() => setIsAddressSuggestionsOpen(true)}
                                placeholder="Start typing your address (min 5 chars)..."
                            />
                            {isAddressSuggestionsOpen && (
                                <>
                                {addressLookupStatus === 'loading' && <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg p-3 text-sm text-slate-300">Searching for addresses...</div>}
                                {addressLookupStatus === 'error' && <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-red-500/50 rounded-md shadow-lg p-3 text-sm text-red-400">Could not fetch addresses. Please enter the full address manually.</div>}
                                {addressLookupStatus !== 'loading' && addressSuggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {addressSuggestions.map((addr, index) => (
                                        <li key={index} onClick={() => handleAddressSelect(addr)} className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer">
                                            {addr.streetAddress}, {addr.city}, {addr.state} {addr.zip}
                                        </li>
                                    ))}
                                    </ul>
                                )}
                                </>
                            )}
                        </div>
                        <InputGroup label="City" name="patientCity" value={formData.patientCity || ''} onChange={handleChange} disabled className="md:col-span-2" />
                        <InputGroup label="State" name="patientState" value={formData.patientState || ''} onChange={handleChange} disabled />
                        <InputGroup label="ZIP Code" name="patientZip" value={formData.patientZip || ''} onChange={handleChange} disabled />
                        <div className="flex items-center gap-2 md:col-span-4">
                             <InputGroup label="Patient Phone" name="patientPhone" value={formData.patientPhone || ''} onChange={handleChange} className="grow" />
                             <InputGroup label="SSN (Last 4)" name="patientSsnLast4" value={formData.patientSsnLast4 || ''} onChange={handleChange} onBlur={handleBlur} error={errors.patientSsnLast4} maxLength={4} />
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'vitals' && (
                <div className="p-4 glassmorphism rounded-lg animate-fade-in">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Vitals & Visit Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex gap-2">
                            <InputGroup label="Height (ft)" name="heightFt" value={formData.heightFt} onChange={handleChange} type="number" />
                            <InputGroup label="(in)" name="heightIn" value={formData.heightIn} onChange={handleChange} type="number" />
                        </div>
                        <InputGroup label="Weight (lbs)" name="weight" value={formData.weight} onChange={handleChange} type="number" />
                        <div/>
                        <InputGroup label="Admission Temp (°F)" name="admissionTemp" value={formData.admissionTemp || ''} onChange={handleChange} type="number" step="0.1" />
                        <InputGroup label="Discharge Temp (°F)" name="dischargeTemp" value={formData.dischargeTemp || ''} onChange={handleChange} type="number" step="0.1" />
                        <div/>
                        <InputGroup label="Admission Date" name="intake" value={formData.intake} onChange={handleChange} onBlur={handleBlur} error={errors.intake} type="date" />
                        <InputGroup label="Admission Time" name="admissionTime" value={formData.admissionTime || ''} onChange={handleChange} type="time" />
                        <div/>
                        <InputGroup label="Discharge Date" name="discharge" value={formData.discharge} onChange={handleChange} onBlur={handleBlur} error={errors.discharge} type="date" />
                        <InputGroup label="Discharge Time" name="dischargeTime" value={formData.dischargeTime || ''} onChange={handleChange} type="time" />
                        <div/>
                        <InputGroup label="Return to Work/School" name="returnToWorkSchoolDate" value={formData.returnToWorkSchoolDate || ''} onChange={handleChange} type="date" />
                    </div>
                </div>
            )}
            
             {activeTab === 'medical' && (
                <div className="p-4 glassmorphism rounded-lg animate-fade-in">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Medical Details</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <InputGroup label="Known Allergies" name="knownAllergies" value={formData.knownAllergies || ''} onChange={handleChange} isSelect>
                               <option value="">-- Select --</option>
                               {ALLERGIES.map(a => <option key={a} value={a}>{a}</option>)}
                           </InputGroup>
                           {formData.knownAllergies === 'Other' && <InputGroup label="Please specify" name="otherAllergy" value={formData.otherAllergy || ''} onChange={handleChange} />}
                        </div>
                        
                        <InputGroup label="Final Diagnosis" name="diagnosis" value={formData.diagnosis} onChange={handleChange} onBlur={handleBlur} error={errors.diagnosis} isTextArea />
                        
                        <div className="p-3 bg-black/20 border border-white/10 rounded-md">
                            <h4 className="text-md font-semibold text-slate-100 mb-3 flex items-center gap-2">
                                <SparkleIcon className="w-5 h-5 text-purple-300" />
                                AI Clinical Assistant
                            </h4>
                            <button onClick={handleGenerateMedicalDetails} disabled={isGeneratingDetails || !formData.diagnosis} className="w-full px-3 py-2 bg-purple-600/80 rounded hover:bg-purple-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                {isGeneratingDetails ? <><SpinnerIcon className="w-5 h-5" /> Generating...</> : 'AI Complete & Correct Form'}
                            </button>
                             {generationError && <p className="text-red-400 text-sm mt-2">{generationError}</p>}
                        </div>

                        <InputGroup label="Symptoms at Admission" name="symptoms" value={formData.symptoms} onChange={handleChange} isTextArea />
                        <InputGroup label="Prescriptions at Discharge" name="prescriptions" value={formData.prescriptions} onChange={handleChange} isTextArea />
                        <InputGroup label="Discharge Instructions" name="instructions" value={formData.instructions} onChange={handleChange} isTextArea />
                    </div>
                </div>
            )}
            
            {activeTab === 'history' && (
                <div className="p-4 glassmorphism rounded-lg animate-fade-in">
                    <details open>
                        <summary className="text-lg font-semibold text-slate-100 mb-3 cursor-pointer">Medical History (Optional)</summary>
                        <div className="space-y-4 pt-2">
                            <InputGroup label="Chronic Conditions" name="medicalHistory.chronicConditions" value={formData.medicalHistory?.chronicConditions || ''} onChange={handleChange} isTextArea />
                            <InputGroup label="Past Surgeries/Hospitalizations" name="medicalHistory.pastSurgeries" value={formData.medicalHistory?.pastSurgeries || ''} onChange={handleChange} isTextArea />
                            <InputGroup label="Family Medical History" name="medicalHistory.familyMedicalHistory" value={formData.medicalHistory?.familyMedicalHistory || ''} onChange={handleChange} isTextArea />
                            <InputGroup label="Social History (e.g., smoking, alcohol)" name="medicalHistory.socialHistory" value={formData.medicalHistory?.socialHistory || ''} onChange={handleChange} isTextArea />
                            <InputGroup label="Immunization Status" name="medicalHistory.immunizationStatus" value={formData.medicalHistory?.immunizationStatus || ''} onChange={handleChange} isTextArea />
                        </div>
                    </details>
                </div>
            )}

            {activeTab === 'physician' && (
                 <div className="p-4 glassmorphism rounded-lg animate-fade-in">
                     <h3 className="text-lg font-semibold text-slate-100 mb-3">Physician Information</h3>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Attending Physician</label>
                        {physicians && physicians.length > 0 && (
                            <div className="mb-2">
                            <select name="attendingPhysician" value={formData.attendingPhysician || ''} onChange={handleChange} className="w-full px-3 py-2 glass-input rounded-md">
                                <option value="">-- Select from list or type below --</option>
                                {physicians.map((p, i) => <option key={i} value={p.name}>{p.name} - {p.specialty}</option>)}
                            </select>
                            </div>
                        )}
                        {physicianError && <p className="text-sm text-amber-400 mt-2 mb-2">{physicianError}</p>}
                        <div className="relative">
                            <input
                                name="attendingPhysician"
                                type="text"
                                value={formData.attendingPhysician || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="e.g., Dr. John Smith"
                                className={`w-full px-3 py-2 glass-input rounded-md shadow-sm ${errors.attendingPhysician ? 'error' : ''}`}
                            />
                             {errors.attendingPhysician && <p className="form-error">{errors.attendingPhysician}</p>}
                        </div>
                     </div>
                 </div>
            )}
        </div>
      </div>
    </>
  );
};

export default PatientForm;