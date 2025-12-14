import React from 'react';
import type { FuneralProgramData } from '../types';
import { ArrowRightIcon } from './Icons';

interface ParticipantInfoStepProps {
  formData: FuneralProgramData;
  setFormData: React.Dispatch<React.SetStateAction<FuneralProgramData>>;
  onNext: () => void;
  onBack: () => void;
  errors: Partial<Record<keyof FuneralProgramData, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof FuneralProgramData, string>>>>;
}

const PARTICIPATION_ROLES = [
  "Pallbearer",
  "Speaker (Eulogist)",
  "Musician / Vocalist",
  "Scripture Reader",
  "Usher",
  "Gift Bearer",
  "Honorary Pallbearer",
  "Not Participating"
];

const RELATIONSHIPS = [
  "Spouse", "Partner", "Parent", "Step-Parent", "Child", "Step-Child", "Sibling", "Grandparent",
  "Grandchild", "Aunt", "Uncle", "Niece", "Nephew", "Cousin", "Friend", "Colleague", "Other"
];


const InputGroup: React.FC<{ label: string; name: keyof FuneralProgramData; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; }> = ({ label, name, value, onChange, error }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            id={name}
            name={name}
            type="text"
            value={value}
            onChange={onChange}
            className={`w-full px-3 py-2 glass-input rounded-md shadow-sm ${error ? 'error' : ''}`}
        />
        {error && <p className="form-error">{error}</p>}
    </div>
);

const ParticipantInfoStep: React.FC<ParticipantInfoStepProps> = ({ formData, setFormData, onNext, onBack, errors, setErrors }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name as keyof FuneralProgramData]) {
        setErrors(prev => ({...prev, [name]: undefined}));
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentRoles = prev.creatorParticipationRoles || [];
      if (value === "Not Participating") {
        return { ...prev, creatorParticipationRoles: checked ? ["Not Participating"] : [] };
      }
      
      let newRoles = checked
        ? [...currentRoles.filter(role => role !== "Not Participating"), value]
        : currentRoles.filter(role => role !== value);
      
      return { ...prev, creatorParticipationRoles: newRoles };
    });
  };

  const isNotParticipating = formData.creatorParticipationRoles?.includes("Not Participating");

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center animate-fade-in">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">Your Information</h2>
        <p className="text-slate-300 mt-2 mb-8">Please provide your name and indicate your role in the service. This information will be used to personalize the program.</p>

        <div className="p-6 glassmorphism rounded-lg space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputGroup label="Your First Name" name="creatorFirstName" value={formData.creatorFirstName} onChange={handleChange} error={errors.creatorFirstName} />
              <InputGroup label="Your Last Name" name="creatorLastName" value={formData.creatorLastName} onChange={handleChange} error={errors.creatorLastName} />
          </div>
          
          <div>
            <label htmlFor="creatorRelationship" className="block text-sm font-medium text-slate-300 mb-1">Relationship to Deceased</label>
            <select
                id="creatorRelationship"
                name="creatorRelationship"
                value={formData.creatorRelationship}
                onChange={handleChange}
                className={`w-full px-3 py-2 glass-input rounded-md shadow-sm ${errors.creatorRelationship ? 'error' : ''}`}
            >
                <option value="">-- Please Select --</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.creatorRelationship && <p className="form-error">{errors.creatorRelationship}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">How will you be participating in the service?</label>
            <div className="grid grid-cols-2 gap-3">
              {PARTICIPATION_ROLES.map(role => (
                <div key={role} className="flex items-center">
                  <input
                    id={`role-${role}`}
                    name="participationRole"
                    type="checkbox"
                    value={role}
                    checked={formData.creatorParticipationRoles?.includes(role)}
                    onChange={handleRoleChange}
                    disabled={role !== "Not Participating" && isNotParticipating}
                    className="h-4 w-4 rounded border-slate-500 bg-white/10 text-purple-500 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <label htmlFor={`role-${role}`} className={`ml-2 block text-sm text-slate-200 ${role !== "Not Participating" && isNotParticipating ? 'opacity-50' : ''}`}>{role}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center w-full">
            <button
                onClick={onBack}
                className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
              >
                Back
            </button>
            <button
                onClick={onNext}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
            >
                <span>Next: Enter Program Details</span>
                <ArrowRightIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantInfoStep;