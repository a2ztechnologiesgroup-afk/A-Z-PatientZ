import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import PatientForm from '../components/PatientForm';
import TemplateChooser from '../components/TemplateChooser';
import PreviewAndExport from '../components/PreviewAndExport';
import Summary from '../components/Summary';
import { medicalTemplates } from '../templates/templates';
import type { PatientData, Template, DoctorExcuseData } from '../types';
import { ArrowRightIcon, SpinnerIcon } from '../components/Icons';
import ProgressIndicator from '../components/ProgressIndicator';
import HospitalSearchStep from '../components/HospitalSearchStep';
import type { Hospital } from '../components/HospitalSearchStep';
import { validateDischargeSummary } from '../utils/validation';

const initialFormData: PatientData = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  dob: '',
  gender: '',
  ethnicity: '',
  knownAllergies: '',
  otherAllergy: '',
  patientStreetAddress: '',
  patientCity: '',
  patientState: '',
  patientZip: '',
  patientPhone: '',
  patientSsnLast4: '',
  heightFt: '',
  heightIn: '',
  weight: '',
  admissionTemp: '',
  dischargeTemp: '',
  intake: '',
  admissionTime: '',
  discharge: '',
  dischargeTime: '',
  symptoms: '',
  diagnosis: '',
  prescriptions: '',
  instructions: '',
  hospitalName: '',
  hospitalAddress: '',
  hospitalPhone: '',
  hospitalUrl: '',
  hospitalLogoUrl: '',
  hospitalStyle: {
    primaryColor: '#334155', // slate-700
    fontFamily: 'sans-serif',
  },
  returnToWorkSchoolDate: '',
  attendingPhysician: '',
  medicalHistory: {
    chronicConditions: '',
    pastSurgeries: '',
    familyMedicalHistory: '',
    socialHistory: '',
    immunizationStatus: '',
  },
  diagnosisExplanation: '',
  treatmentExplanation: '',
  symptomInstructions: '',
  referrals: [],
  lifestyleRecommendations: '',
  medicationSideEffects: '',
  followUpCare: '',
  faq: [],
  showWatermark: true,
  watermarkText: 'PATIENT COPY',
};

const APP_STORAGE_KEY = 'dischargeFormData_v5'; // Incremented version for new structure

const pageSteps = [
  { id: 'search', name: 'Find Facility' },
  { id: 'form', name: 'Fill Form Details' },
  { id: 'template', name: 'Choose Template' },
  { id: 'preview', name: 'Preview & Export' },
];

interface DischargeSummaryPageProps {
  onGoHome: () => void;
}

const DischargeSummaryPage: React.FC<DischargeSummaryPageProps> = ({ onGoHome }) => {
  const [formData, setFormData] = useState<PatientData>(() => {
    try {
      const savedData = localStorage.getItem(APP_STORAGE_KEY);
      if (savedData) {
          const parsed = JSON.parse(savedData);
          // Make sure not to overwrite new blank initial state with old filled state
          // but allow keeping hospital info if it exists
          const mergedData = { ...initialFormData, ...parsed };
          Object.keys(initialFormData).forEach(key => {
              if (initialFormData[key as keyof PatientData] === '' && !['hospitalName', 'hospitalAddress', 'hospitalPhone', 'hospitalUrl', 'hospitalLogoUrl'].includes(key)) {
                  mergedData[key as keyof PatientData] = parsed[key] || '';
              }
          });
          return mergedData;
      }
      return initialFormData;
    } catch (error) {
      console.error("Failed to parse saved form data:", error);
      return initialFormData;
    }
  });

  const [step, setStep] = useState<'search' | 'form' | 'template' | 'preview'>('search');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(medicalTemplates[0]);
  const [physicians, setPhysicians] = useState<{ name: string; specialty: string }[]>([]);
  const [isFetchingPhysicians, setIsFetchingPhysicians] = useState(false);
  const [fetchPhysiciansError, setFetchPhysiciansError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientData, string>>>({});
  const [logoFetchStatus, setLogoFetchStatus] = useState<'idle' | 'success' | 'error'>('idle');


  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error("Failed to save form data:", error);
    }
  }, [formData]);

  const handleStepClick = (stepId: string) => {
    const currentStepIndex = pageSteps.findIndex(s => s.id === step);
    const clickedStepIndex = pageSteps.findIndex(s => s.id === stepId);

    if (clickedStepIndex < currentStepIndex) {
      setStep(stepId as typeof step);
    }
  };

  const handleHospitalSelect = async (hospital: Hospital) => {
    setFormData(prev => ({
      ...prev,
      hospitalName: hospital.name,
      hospitalAddress: hospital.address,
      hospitalPhone: hospital.phone,
      hospitalUrl: hospital.url,
      hospitalLogoUrl: '', // Reset logo URL before fetching new one
      attendingPhysician: '',
    }));

    setIsFetchingPhysicians(true);
    setFetchPhysiciansError(null);
    setPhysicians([]);
    setLogoFetchStatus('idle');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const logoPromise = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Using Google Search, find a high-quality, publicly accessible URL for the official logo of "${hospital.name}" located at "${hospital.address}". The URL should preferably point to an SVG or transparent PNG. Your response MUST be a single, minified line of JSON with no markdown formatting. The JSON object must have one key: "logoUrl". If a logo absolutely cannot be found, return a JSON object with a null value: {"logoUrl": null}.`,
          config: {
              tools: [{googleSearch: {}}],
          },
      }).then(response => {
          try {
              let jsonString = response.text.trim();
              if (jsonString.startsWith("```json")) {
                  jsonString = jsonString.substring(7, jsonString.length - 3).trim();
              } else if (jsonString.startsWith("```")) {
                  jsonString = jsonString.substring(3, jsonString.length - 3).trim();
              }
              const data = JSON.parse(jsonString);
              return data.logoUrl || null;
          } catch {
              return null;
          }
      }).catch(err => {
          console.error("Logo search failed:", err);
          return null;
      });

      const physiciansPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find 5-10 physicians who practice at "${hospital.name}". Your response MUST be a single, minified line of JSON with no markdown formatting. The JSON must be an array of objects, where each object has "name" and "specialty" keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, specialty: { type: Type.STRING } },
              required: ["name", "specialty"],
            }
          }
        }
      }).then(response => JSON.parse(response.text.trim()))
      .catch(err => {
          console.error("Physician search failed:", err);
          setFetchPhysiciansError("Could not fetch physicians for this facility. You can still enter one manually.");
          return [];
      });

      const [logoUrl, physicianResults] = await Promise.all([logoPromise, physiciansPromise]);
      
      setLogoFetchStatus(logoUrl ? 'success' : 'error');

      if (logoUrl) {
          setFormData(prev => ({ ...prev, hospitalLogoUrl: logoUrl }));
      }
      setPhysicians(physicianResults);

    } catch (error) {
      console.error("An unexpected error occurred during hospital selection processing:", error);
      setFetchPhysiciansError("An unexpected error occurred. Please try again.");
    } finally {
      setIsFetchingPhysicians(false);
      setStep('form');
    }
  };


  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setStep('preview');
  };

  const handleNextFromForm = () => {
    const validationErrors = validateDischargeSummary(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
        setStep('template');
    }
  };

  const dataWithTemplate = { ...formData, hospitalStyle: selectedTemplate };

  const renderContent = () => {
    if (isFetchingPhysicians) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                <SpinnerIcon className="w-10 h-10 text-purple-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-100">Gathering Facility Information...</h2>
                <p className="text-slate-300">Please wait while we find the logo and providers for {formData.hospitalName}.</p>
            </div>
        );
    }

    switch (step) {
      case 'search':
        return <HospitalSearchStep onHospitalSelect={handleHospitalSelect} />;
      case 'form':
        return (
          <>
            <div className="flex-grow overflow-y-auto custom-scrollbar-dark">
              <PatientForm 
                formData={formData} 
                setFormData={setFormData} 
                physicians={physicians} 
                physicianError={fetchPhysiciansError} 
                errors={errors} 
                setErrors={setErrors}
                logoFetchStatus={logoFetchStatus}
                setLogoFetchStatus={setLogoFetchStatus}
              />
            </div>
            <div className="p-4 sm:p-6 border-t border-white/20 flex justify-end gap-4 glassmorphism shrink-0">
              <button
                onClick={() => setStep('search')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-slate-100 font-semibold rounded-lg shadow-sm hover:bg-white/20 transition-colors"
              >
                <span>Change Facility</span>
              </button>
              <button
                onClick={handleNextFromForm}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
              >
                <span>Next: Choose Template</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          </>
        );
      case 'template':
        return (
          <TemplateChooser
            data={formData}
            templates={medicalTemplates}
            onSelect={handleTemplateSelect}
            onBack={() => setStep('form')}
            onCancel={onGoHome}
            PreviewComponent={Summary}
          />
        );
      case 'preview':
        return (
          <PreviewAndExport
            data={dataWithTemplate}
            setFormData={setFormData as React.Dispatch<React.SetStateAction<PatientData | DoctorExcuseData>>}
            onBack={() => setStep('template')}
            PreviewComponent={Summary}
            fileName={`discharge_summary_${formData.lastName || 'patient'}`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 glassmorphism rounded-xl shadow-2xl overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-8 py-5 border-b border-white/20 shrink-0 bg-white/5">
        <ProgressIndicator steps={pageSteps} currentStepId={step} onStepClick={handleStepClick} />
      </div>
      {renderContent()}
    </div>
  );
};

export default DischargeSummaryPage;