import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { DoctorExcuseData } from '../types';
import { SpinnerIcon, SparkleIcon } from './Icons';
import { validateDoctorExcuse } from '../utils/validation';

interface DoctorExcuseFormProps {
  formData: DoctorExcuseData;
  setFormData: React.Dispatch<React.SetStateAction<DoctorExcuseData>>;
  physicians?: { name: string; specialty: string }[];
  physicianError?: string | null;
  errors: Partial<Record<keyof DoctorExcuseData, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof DoctorExcuseData, string>>>>;
}

interface InputGroupProps {
  label: string;
  name: keyof DoctorExcuseData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  isTextArea?: boolean; // Added isTextArea
  rows?: number;
  className?: string;
  disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, name, value, onChange, onBlur, error, type = 'text', placeholder, isTextArea = false, rows = 3, className, disabled=false }) => {
  const baseClasses = `w-full px-3 py-2 glass-input rounded-md shadow-sm placeholder-slate-400 focus:border-transparent transition duration-150 ease-in-out`;
  const stateClasses = `${error ? 'error' : ''} ${disabled ? 'bg-slate-800/60 cursor-not-allowed text-slate-400' : ''}`;
  const dateClasses = type === 'date' && !value ? 'text-slate-400' : 'text-slate-100';

  const commonProps = {
    id: name,
    name,
    value,
    onChange,
    onBlur,
    disabled,
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {isTextArea ? (
        <textarea
          {...commonProps}
          placeholder={placeholder || label}
          rows={rows}
          className={`${baseClasses} ${stateClasses}`}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
          placeholder={placeholder || label}
          className={`${baseClasses} ${stateClasses} ${dateClasses}`}
        />
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

const DoctorExcuseForm: React.FC<DoctorExcuseFormProps> = ({ formData, setFormData, physicians, physicianError, errors, setErrors }) => {
  const [isGeneratingExcuse, setIsGeneratingExcuse] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name as keyof DoctorExcuseData]) {
        setErrors(prev => ({...prev, [name]: undefined}));
    }
    // Clear AI-generated reason if diagnosis changes
    if (name === 'diagnosis') {
      setFormData(prev => ({ ...prev, [name]: value, aiReasonForAbsence: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target as { name: keyof DoctorExcuseData };
      const fieldErrors = validateDoctorExcuse({ ...formData, [name]: e.target.value });
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
  };
  
  // Auto-fill absenceStartDate with dateOfVisit
  useEffect(() => {
    if (formData.dateOfVisit && formData.dateOfVisit !== formData.absenceStartDate) {
      setFormData(prev => ({ ...prev, absenceStartDate: prev.dateOfVisit }));
    }
  }, [formData.dateOfVisit, setFormData]);

  // Auto-fill returnDate with absenceEndDate + 1 day
  useEffect(() => {
    if (formData.absenceEndDate) {
      const endDate = new Date(formData.absenceEndDate + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1); // Add one day
      const newReturnDate = endDate.toISOString().split('T')[0];
      if (newReturnDate !== formData.returnDate) {
        setFormData(prev => ({ ...prev, returnDate: newReturnDate }));
      }
    } else if (formData.returnDate) {
      setFormData(prev => ({ ...prev, returnDate: '' })); // Clear if absenceEndDate is cleared
    }
  }, [formData.absenceEndDate, setFormData]);

  const handleGenerateExcuse = async () => {
    if (!formData.diagnosis.trim()) {
      setErrors(prev => ({ ...prev, diagnosis: "A diagnosis is required to generate an excuse." }));
      return;
    }

    setIsGeneratingExcuse(true);
    setGenerationError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Given the diagnosis: "${formData.diagnosis}", provide a vague, professional, and plausible medical reason for a patient's absence from work/school. Keep it concise, suitable for a doctor's note. Example: "acute medical condition".`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 50,
        },
      });

      setFormData(prev => ({ ...prev, aiReasonForAbsence: response.text.trim() }));

    } catch (error) {
      console.error("Failed to generate excuse:", error);
      setGenerationError("An error occurred while generating the excuse. Please try again.");
    } finally {
      setIsGeneratingExcuse(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="p-4 glassmorphism rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-1">{formData.hospitalName}</h3>
            <p className="text-sm text-slate-300 mb-4">{formData.hospitalAddress}</p>
        </div>

        <div className="space-y-6">

          <div className="p-4 glassmorphism rounded-lg">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Excuse Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Patient First Name" name="patientFirstName" value={formData.patientFirstName} onChange={handleChange} onBlur={handleBlur} error={errors.patientFirstName} />
                <InputGroup label="Patient Last Name" name="patientLastName" value={formData.patientLastName} onChange={handleChange} onBlur={handleBlur} error={errors.patientLastName} />
                <InputGroup label="Patient Date of Birth" name="patientDob" value={formData.patientDob || ''} onChange={handleChange} onBlur={handleBlur} error={errors.patientDob} type="date" className="md:col-span-2" />
                <InputGroup label="Date of Visit" name="dateOfVisit" value={formData.dateOfVisit} onChange={handleChange} onBlur={handleBlur} error={errors.dateOfVisit} type="date" />
                <div />
                <InputGroup label="Absence Start Date" name="absenceStartDate" value={formData.absenceStartDate} onChange={handleChange} onBlur={handleBlur} error={errors.absenceStartDate} type="date" disabled /> {/* Disabled as it's autofilled */}
                <InputGroup label="Absence End Date" name="absenceEndDate" value={formData.absenceEndDate} onChange={handleChange} onBlur={handleBlur} error={errors.absenceEndDate} type="date" />
                <InputGroup label="Return to Work/School Date" name="returnDate" value={formData.returnDate} onChange={handleChange} onBlur={handleBlur} error={errors.returnDate} type="date" disabled /> {/* Disabled as it's autofilled */}
                
                <div className="md:col-span-2">
                  <InputGroup label="Diagnosis / Reason for Absence" name="diagnosis" value={formData.diagnosis} onChange={handleChange} onBlur={handleBlur} error={errors.diagnosis} placeholder="e.g., Influenza" isTextArea rows={3} />
                  <div className="p-3 bg-black/20 border border-white/10 rounded-md mt-2">
                    <button onClick={handleGenerateExcuse} disabled={isGeneratingExcuse || !formData.diagnosis.trim()} className="w-full px-3 py-2 bg-purple-600/80 rounded hover:bg-purple-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {isGeneratingExcuse ? <><SpinnerIcon className="w-5 h-5" /> Generating...</> : <><SparkleIcon className="w-5 h-5" /> Generate AI Written Excuse</>}
                    </button>
                    {generationError && <p className="text-red-400 text-sm mt-2">{generationError}</p>}
                  </div>
                </div>
              </div>
          </div>

          <div className="p-4 glassmorphism rounded-lg">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Physician</h3>
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Attending Physician</label>
                  
                  {physicians && physicians.length > 0 && (
                    <div className="mb-2">
                      <select name="attendingPhysician" value={formData.attendingPhysician || ''} onChange={handleChange} onBlur={handleBlur} className="w-full px-3 py-2 glass-input rounded-md">
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
        </div>
      </div>
    </>
  );
};

export default DoctorExcuseForm;