import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import FuneralSearchStep from '../components/FuneralSearchStep';
import type { LocationSelection } from '../components/FuneralSearchStep';
import ParticipantInfoStep from '../components/ParticipantInfoStep';
import FuneralProgramForm from '../components/FuneralProgramForm';
import TemplateChooser from '../components/TemplateChooser';
import PreviewAndExport from '../components/PreviewAndExport';
import FuneralProgramPreview from '../components/FuneralProgramPreview';
import { funeralTemplates } from '../templates/funeralTemplates';
import type { FuneralProgramData, Template, PatientData, DoctorExcuseData } from '../types';
import { ArrowRightIcon, SpinnerIcon } from '../components/Icons';
import ProgressIndicator from '../components/ProgressIndicator';
import { validateFuneralProgram } from '../utils/validation';

const today = new Date().toISOString().split('T')[0];

const initialFormData: FuneralProgramData = {
  deceasedFirstName: '',
  deceasedLastName: '',
  deceasedMiddleName: '',
  deceasedSuffix: '',
  dateOfBirth: '',
  dateOfDeath: '',
  photoUrl: '',
  obituary: '',
  serviceDate: today,
  serviceTime: '',
  funeralHomeName: '',
  funeralHomeAddress: '',
  cemeteryName: '',
  cemeteryAddress: '',
  hospitalLogoUrl: '', // Initialized to empty string
  orderOfService: '',
  pallbearers: '',
  acknowledgements: 'The family wishes to express their sincere gratitude for the support they have received. In lieu of flowers, donations may be made to a charity of your choice in memory of the deceased.',
  creatorFirstName: '',
  creatorLastName: '',
  creatorRelationship: '',
  creatorParticipationRoles: [],
  hospitalStyle: funeralTemplates[0],
  showWatermark: false,
};

const APP_STORAGE_KEY = 'funeralProgramFormData_v2';

const pageSteps = [
  { id: 'search', name: 'Find Facilities' },
  { id: 'participant', name: 'Participant Info' },
  { id: 'form', name: 'Enter Details' },
  { id: 'template', name: 'Choose Template' },
  { id: 'preview', name: 'Preview & Export' },
];

interface FuneralProgramPageProps {
  onGoHome: () => void;
}

const FuneralProgramPage: React.FC<FuneralProgramPageProps> = ({ onGoHome }) => {
  const [formData, setFormData] = useState<FuneralProgramData>(() => {
    try {
      const savedData = localStorage.getItem(APP_STORAGE_KEY);
      return savedData ? { ...initialFormData, ...JSON.parse(savedData) } : initialFormData;
    } catch (error) {
      console.error("Failed to parse saved data:", error);
      return initialFormData;
    }
  });

  const [step, setStep] = useState<'search' | 'participant' | 'form' | 'template' | 'preview'>('search');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(funeralTemplates[0]);
  const [errors, setErrors] = useState<Partial<Record<keyof FuneralProgramData, string>>>({});
  const [isFetchingLogo, setIsFetchingLogo] = useState(false);
  const [logoFetchStatus, setLogoFetchStatus] = useState<'idle' | 'success' | 'error'>('idle');


  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleStepClick = (stepId: string) => {
    const currentStepIndex = pageSteps.findIndex(s => s.id === step);
    const clickedStepIndex = pageSteps.findIndex(s => s.id === stepId);
    if (clickedStepIndex < currentStepIndex) {
      setStep(stepId as typeof step);
    }
  };

  const handleLocationSelect = async (locations: LocationSelection) => {
    setFormData(prev => ({
      ...prev,
      funeralHomeName: locations.funeralHome?.name || '',
      funeralHomeAddress: locations.funeralHome?.address || '',
      cemeteryName: locations.cemetery?.name || '',
      cemeteryAddress: locations.cemetery?.address || '',
      hospitalLogoUrl: '', // Reset logo URL before fetching new one
    }));

    if (locations.funeralHome?.name && locations.funeralHome?.address) {
        setIsFetchingLogo(true);
        setLogoFetchStatus('idle');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Using Google Search, find a high-quality, publicly accessible URL for the official logo of "${locations.funeralHome.name}" located at "${locations.funeralHome.address}". The URL should preferably point to an SVG or transparent PNG. Your response MUST be a single, minified line of JSON with no markdown formatting. The JSON object must have one key: "logoUrl". If a logo absolutely cannot be found, return a JSON object with a null value: {"logoUrl": null}.`,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });
            let jsonString = response.text.trim();
            if (jsonString.startsWith("```json")) {
                jsonString = jsonString.substring(7, jsonString.length - 3).trim();
            } else if (jsonString.startsWith("```")) {
                jsonString = jsonString.substring(3, jsonString.length - 3).trim();
            }
            const data = JSON.parse(jsonString);
            const logoUrl = data.logoUrl || null;
            if (logoUrl) {
                setFormData(prev => ({ ...prev, hospitalLogoUrl: logoUrl }));
                setLogoFetchStatus('success');
            } else {
                setLogoFetchStatus('error');
            }
        } catch (error) {
            console.error("Funeral home logo search failed:", error);
            setLogoFetchStatus('error');
        } finally {
            setIsFetchingLogo(false);
        }
    }
    setStep('participant');
  };

  const handleNextFromParticipant = () => {
    const newErrors: Partial<Record<keyof FuneralProgramData, string>> = {};
    if (!formData.creatorFirstName.trim()) newErrors.creatorFirstName = "Your first name is required.";
    if (!formData.creatorLastName.trim()) newErrors.creatorLastName = "Your last name is required.";
    if (!formData.creatorRelationship) newErrors.creatorRelationship = "Please select your relationship.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const { creatorLastName, creatorFirstName, creatorParticipationRoles, creatorRelationship } = formData;

    // Generate content from scratch instead of modifying a fixed template
    let updatedPallbearers = '';
    let updatedOrderOfService = 'Prelude Music Selections\nProcessional\nOpening Prayer & Welcome\nScripture Reading\nMusical Selection\nEulogy\nReflections & Tributes\nHymn\nClosing Remarks & Benediction\nRecessional';
    let updatedAcknowledgements = 'The family wishes to express their deepest and most sincere gratitude for the many kindnesses, prayers, and overwhelming support they have received during this time of profound loss. Your comforting words, beautiful floral tributes, and heartfelt gestures have been a great source of strength. \n\nIn lieu of flowers, and in honoring a lifelong passion for animal welfare, the family requests that donations be made in memory of the deceased to The Humane Society or a charity of your choice.';

    const creatorFullName = `${creatorFirstName} ${creatorLastName}`;
    const newPallbearers = [];

    if (creatorParticipationRoles && !creatorParticipationRoles.includes('Not Participating')) {
        if (creatorParticipationRoles.includes('Pallbearer')) {
            newPallbearers.push(creatorFullName);
        }
        if (creatorParticipationRoles.includes('Speaker (Eulogist)')) {
            updatedOrderOfService = updatedOrderOfService.replace('Eulogy', `Eulogy by ${creatorFullName}`);
        }
        if (creatorParticipationRoles.includes('Musician / Vocalist')) {
            updatedOrderOfService += `\nMusical Selection by ${creatorFullName}`;
        }
        if (creatorParticipationRoles.includes('Scripture Reader')) {
            updatedOrderOfService = updatedOrderOfService.replace('Scripture Reading', `Scripture Reading by ${creatorFullName}`);
        }
    }
    
    updatedPallbearers = newPallbearers.join(', ');
    
    if (creatorRelationship) {
        updatedAcknowledgements += `\n\nA special thank you from their loving ${creatorRelationship.toLowerCase()}, ${creatorFullName}.`;
    }

    setFormData(prev => ({
        ...prev,
        pallbearers: updatedPallbearers,
        orderOfService: updatedOrderOfService,
        acknowledgements: updatedAcknowledgements,
        obituary: `A cherished [Profession/Role] and beacon of light in our community, passed away peacefully, surrounded by loving family. Known for their boundless generosity and unwavering kindness, their legacy will live on in the countless lives they touched. They will be deeply and profoundly missed by all who knew them.`
    }));
    
    setStep('form');
  };


  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setStep('preview');
  };

  const handleNextFromForm = () => {
      const validationErrors = validateFuneralProgram(formData);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length === 0) {
          setStep('template');
      }
  };

  const dataWithTemplate = { ...formData, hospitalStyle: selectedTemplate };

  const renderContent = () => {
    if (isFetchingLogo) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                <SpinnerIcon className="w-10 h-10 text-purple-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-100">Finding Funeral Home Logo...</h2>
                <p className="text-slate-300">Please wait while we search for {formData.funeralHomeName}'s logo.</p>
            </div>
        );
    }

    switch (step) {
      case 'search':
        return <FuneralSearchStep onLocationSelect={handleLocationSelect} />;
      case 'participant':
        return <ParticipantInfoStep 
            formData={formData} 
            setFormData={setFormData}
            onNext={handleNextFromParticipant}
            onBack={() => setStep('search')}
            errors={errors}
            setErrors={setErrors}
        />;
      case 'form':
        return (
          <>
            <div className="flex-grow overflow-y-auto custom-scrollbar-dark">
              <FuneralProgramForm formData={formData} setFormData={setFormData} errors={errors} setErrors={setErrors} />
            </div>
            <div className="p-4 sm:p-6 border-t border-white/20 flex justify-between items-center gap-4 glassmorphism shrink-0">
              <button
                onClick={() => setStep('participant')}
                className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
              >
                Back
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
            templates={funeralTemplates}
            onSelect={handleTemplateSelect}
            onBack={() => setStep('form')}
            onCancel={onGoHome}
            PreviewComponent={FuneralProgramPreview}
          />
        );
      case 'preview':
        return (
          <PreviewAndExport
            data={dataWithTemplate}
            setFormData={setFormData as React.Dispatch<React.SetStateAction<PatientData | DoctorExcuseData | FuneralProgramData>>}
            onBack={() => setStep('template')}
            PreviewComponent={FuneralProgramPreview}
            fileName={`funeral_program_${formData.deceasedLastName}`}
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

export default FuneralProgramPage;