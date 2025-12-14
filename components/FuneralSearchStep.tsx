import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon, WarningIcon, ArrowRightIcon } from './Icons';
import { US_STATES } from '../utils/formData';

interface Location {
  name: string;
  address: string;
}

export interface LocationSelection {
  funeralHome: Location | null;
  cemetery: Location | null;
}

interface FuneralSearchStepProps {
  onLocationSelect: (selection: LocationSelection) => void;
}

const SelectGroup: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    options: { value: string; label: string }[];
    isLoading?: boolean;
    error?: string | null;
    defaultOptionText: string;
}> = ({ label, value, onChange, disabled = false, options, isLoading = false, error, defaultOptionText }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-slate-300 mb-1 text-left">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled || isLoading}
                className="w-full px-3 py-2.5 glass-input rounded-md shadow-sm appearance-none"
            >
                <option value="">{isLoading ? 'Loading...' : defaultOptionText}</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {isLoading && <SpinnerIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />}
        </div>
        {error && <p className="text-red-400 text-xs text-left mt-1">{error}</p>}
    </div>
);


const FuneralSearchStep: React.FC<FuneralSearchStepProps> = ({ onLocationSelect }) => {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  const [cities, setCities] = useState<string[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [funeralHomes, setFuneralHomes] = useState<Location[]>([]);
  const [isHomesLoading, setIsHomesLoading] = useState(false);
  const [homesError, setHomesError] = useState<string | null>(null);

  const [cemeteries, setCemeteries] = useState<Location[]>([]);
  const [isCemeteriesLoading, setIsCemeteriesLoading] = useState(false);
  const [cemeteriesError, setCemeteriesError] = useState<string | null>(null);
  
  const [selectedFuneralHome, setSelectedFuneralHome] = useState('');
  const [selectedCemetery, setSelectedCemetery] = useState('');

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async (selectedState: string) => {
      if (!selectedState) {
        setCities([]);
        setCity('');
        return;
      }
      setIsCitiesLoading(true);
      setCitiesError(null);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Using Google Search, provide a comprehensive list of all cities in the US state of ${selectedState}. Return the data as a single, minified line of JSON with no markdown formatting. The JSON object must have one key: "cities", which is an array of strings.`,
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
        setCities(data.cities.sort() || []);
      } catch (error) {
        console.error("Failed to fetch cities:", error);
        setCitiesError("Could not load cities.");
        setCities([]);
      } finally {
        setIsCitiesLoading(false);
      }
    };
    fetchCities(state);
  }, [state]);

  // Fetch funeral homes and cemeteries when city changes
  useEffect(() => {
    const fetchLocations = async (selectedCity: string, selectedState: string) => {
      setIsHomesLoading(true);
      setIsCemeteriesLoading(true);
      setHomesError(null);
      setCemeteriesError(null);
      setFuneralHomes([]);
      setCemeteries([]);
      setSelectedFuneralHome('');
      setSelectedCemetery('');

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Using Google Search, find all funeral homes and all cemeteries within a 15-mile radius of ${selectedCity}, ${selectedState}.
Provide up to 10 results for each category.
Your response MUST be a single, minified line of JSON with no markdown formatting. The JSON object must have two keys: "funeralHomes" and "cemeteries".
Each key should contain an array of objects, where each object has "name" and "address" string properties.
If no results are found for a category, return an empty array for that key.
Example: {"funeralHomes":[{"name":"Example Home","address":"123 Main St"}],"cemeteries":[]}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
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

        if (data.funeralHomes) {
            setFuneralHomes(data.funeralHomes);
            if(data.funeralHomes.length === 0) {
                 setHomesError("No funeral homes found in this area.");
            }
        } else {
             setHomesError("Could not load funeral homes.");
        }


        if (data.cemeteries) {
            setCemeteries(data.cemeteries);
            if(data.cemeteries.length === 0) {
                 setCemeteriesError("No cemeteries found in this area.");
            }
        } else {
             setCemeteriesError("Could not load cemeteries.");
        }

      } catch (error) {
          console.error("Failed to fetch locations:", error);
          setHomesError("An error occurred while fetching funeral homes. Please try a different city.");
          setCemeteriesError("An error occurred while fetching cemeteries. Please try a different city.");
      } finally {
        setIsHomesLoading(false);
        setIsCemeteriesLoading(false);
      }
    };

    if (city && state) {
      fetchLocations(city, state);
    }
  }, [city, state]);

  const handleNext = () => {
    const funeralHome = funeralHomes.find(fh => fh.name === selectedFuneralHome) || null;
    const cemetery = cemeteries.find(c => c.name === selectedCemetery) || null;
    onLocationSelect({ funeralHome, cemetery });
  };
  
  const isNextDisabled = !selectedFuneralHome || !selectedCemetery;

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">Select Service Locations</h2>
        <p className="text-slate-300 mt-2 mb-8">Choose the state and city to find local funeral homes and cemeteries.</p>
        
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <SelectGroup
                    label="State"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setCity(''); }}
                    options={US_STATES.map(s => ({ value: s.abbreviation, label: s.name }))}
                    defaultOptionText="-- Select a State --"
                />
                <SelectGroup
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!state || isCitiesLoading}
                    options={cities.map(c => ({ value: c, label: c }))}
                    isLoading={isCitiesLoading}
                    error={citiesError}
                    defaultOptionText={state ? "-- Select a City --" : "-- Choose a State First --"}
                />
            </div>
             <div className="flex flex-col sm:flex-row gap-4">
                <SelectGroup
                    label="Funeral Home"
                    value={selectedFuneralHome}
                    onChange={(e) => setSelectedFuneralHome(e.target.value)}
                    disabled={!city || isHomesLoading}
                    options={funeralHomes.map(fh => ({ value: fh.name, label: fh.name }))}
                    isLoading={isHomesLoading}
                    error={homesError}
                    defaultOptionText={city ? "-- Select a Funeral Home --" : "-- Choose a City First --"}
                />
                <SelectGroup
                    label="Cemetery / Burial Site"
                    value={selectedCemetery}
                    onChange={(e) => setSelectedCemetery(e.target.value)}
                    disabled={!city || isCemeteriesLoading}
                    options={cemeteries.map(c => ({ value: c.name, label: c.name }))}
                    isLoading={isCemeteriesLoading}
                    error={cemeteriesError}
                    defaultOptionText={city ? "-- Select a Cemetery --" : "-- Choose a City First --"}
                />
            </div>
        </div>

        <div className="mt-8">
            <button
                onClick={handleNext}
                disabled={isNextDisabled}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
            >
                <span>Next: Enter Program Details</span>
                <ArrowRightIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default FuneralSearchStep;