
import React, { useState, useRef } from 'react';
import type { FuneralProgramData } from '../types';
import { validateFuneralProgram } from '../utils/validation';

interface FuneralProgramFormProps {
  formData: FuneralProgramData;
  setFormData: React.Dispatch<React.SetStateAction<FuneralProgramData>>;
  errors: Partial<Record<keyof FuneralProgramData, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof FuneralProgramData, string>>>>;
}

interface InputGroupProps {
  label: string;
  name: keyof FuneralProgramData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  className?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, name, value, onChange, onBlur, error, type = 'text', placeholder, isTextArea = false, rows = 3, className = '' }) => (
  <div className={className}>
    <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    {isTextArea ? (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 glass-input rounded-md shadow-sm ${error ? 'error' : ''}`}
      />
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-3 py-2 glass-input rounded-md shadow-sm ${error ? 'error' : ''} ${type === 'date' && !value ? 'text-slate-400' : 'text-slate-100'}`}
      />
    )}
    {error && <p className="form-error">{error}</p>}
  </div>
);

const FuneralProgramForm: React.FC<FuneralProgramFormProps> = ({ formData, setFormData, errors, setErrors }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(formData.photoUrl || null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name as keyof FuneralProgramData]) {
      setErrors(prev => ({...prev, [name]: undefined}));
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target as { name: keyof FuneralProgramData };
    const fieldErrors = validateFuneralProgram({ ...formData, [name]: e.target.value });
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
  };

  const handlePhotoUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setPhotoPreviewUrl(reader.result);
                // Fix: Explicitly cast reader.result to string to satisfy TypeScript
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please upload a valid image file (e.g., JPG, PNG).');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handlePhotoUpload(e.target.files[0]);
      }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handlePhotoUpload(e.dataTransfer.files[0]);
      }
  };

  const removePhoto = () => {
      setPhotoPreviewUrl(null);
      setFormData(prev => ({ ...prev, photoUrl: '' }));
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 glassmorphism rounded-lg md:col-span-2">
            <h3 className="text-lg font-semibold text-slate-50 mb-1">Service Locations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
                <div>
                    <p className="font-semibold text-slate-300">Funeral Home:</p>
                    <p>{formData.funeralHomeName}</p>
                    <p className="text-slate-400">{formData.funeralHomeAddress}</p>
                </div>
                <div>
                    <p className="font-semibold text-slate-300">Cemetery / Burial Site:</p>
                    <p>{formData.cemeteryName}</p>
                    <p className="text-slate-400">{formData.cemeteryAddress}</p>
                </div>
            </div>
        </div>

        <div className="p-4 glassmorphism rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">In Memory Of</h3>
          <InputGroup label="First Name" name="deceasedFirstName" value={formData.deceasedFirstName} onChange={handleChange} onBlur={handleBlur} error={errors.deceasedFirstName} />
          <InputGroup label="Last Name" name="deceasedLastName" value={formData.deceasedLastName} onChange={handleChange} onBlur={handleBlur} error={errors.deceasedLastName} />
          <div className="flex gap-4">
             <InputGroup label="Date of Birth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} onBlur={handleBlur} error={errors.dateOfBirth} type="date" />
             <InputGroup label="Date of Passing" name="dateOfDeath" value={formData.dateOfDeath} onChange={handleChange} onBlur={handleBlur} error={errors.dateOfDeath} type="date" />
          </div>
          
          <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Photo of Deceased (Optional)</label>
              {photoPreviewUrl ? (
                  <div className="relative group w-32 h-32 mx-auto rounded-lg overflow-hidden border-2 border-slate-600">
                      <img src={photoPreviewUrl} alt="Deceased" className="w-full h-full object-cover" />
                      <button onClick={removePhoto} className="absolute top-0 right-0 p-1 bg-black/50 rounded-bl-lg text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs">&times;</button>
                  </div>
              ) : (
                  <div 
                      className="w-full h-32 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-colors text-sm"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                  >
                      Upload Photo
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>
              )}
          </div>
          
           <InputGroup label="Obituary / Biography" name="obituary" value={formData.obituary} onChange={handleChange} onBlur={handleBlur} error={errors.obituary} isTextArea rows={8} />
        </div>

        <div className="p-4 glassmorphism rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Service Details</h3>
          <div className="flex gap-4">
            <InputGroup label="Service Date" name="serviceDate" value={formData.serviceDate} onChange={handleChange} onBlur={handleBlur} error={errors.serviceDate} type="date" />
            <InputGroup label="Service Time" name="serviceTime" value={formData.serviceTime} onChange={handleChange} onBlur={handleBlur} error={errors.serviceTime} type="time" />
          </div>
          <InputGroup label="Order of Service" name="orderOfService" value={formData.orderOfService} onChange={handleChange} onBlur={handleBlur} error={errors.orderOfService} isTextArea rows={6} placeholder="e.g., Opening Prayer by Rev. John Smith..." />
          <InputGroup label="Pallbearers" name="pallbearers" value={formData.pallbearers} onChange={handleChange} onBlur={handleBlur} error={errors.pallbearers} isTextArea rows={4} placeholder="List names, separated by commas..." />
          <InputGroup label="Acknowledgements" name="acknowledgements" value={formData.acknowledgements} onChange={handleChange} onBlur={handleBlur} error={errors.acknowledgements} isTextArea rows={4} />
        </div>
      </div>
    </div>
  );
};

export default FuneralProgramForm;
