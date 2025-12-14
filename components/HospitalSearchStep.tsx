import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SearchIcon, SpinnerIcon, WarningIcon } from './Icons';
import { US_STATES } from '../utils/formData';

export interface Hospital {
  name: string;
  address: string;
  phone: string;
  url?: string;
}

interface HospitalSearchStepProps {
  onHospitalSelect: (hospital: Hospital) => void;
}

const HospitalSearchStep: React.FC<HospitalSearchStepProps> = ({ onHospitalSelect }) => {
  const [searchMode, setSearchMode] = useState<'zip' | 'state'>('zip');
  
  // State for search inputs
  const [zipCode, setZipCode] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // State for search results and status
  const [searchResults, setSearchResults] = useState<Hospital[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // State for fetching cities
  const [cities, setCities] = useState<string[]>([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async (stateAbbr: string) => {
      if (!stateAbbr) {
        setCities([]);
        setSelectedCity('');
        return;
      }
      setIsFetchingCities(true);
      setCitiesError(null);
      setSearchResults([]);
      setSearchError(null);
      const stateName = US_STATES.find(s => s.abbreviation === stateAbbr)?.name;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Using Google Search, provide a comprehensive list of all cities in the US state of ${stateName}. Return the data as a single, minified line of JSON with no markdown formatting. The JSON object must have one key: "cities", which is an array of strings.`,
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
        setCitiesError("Could not load cities for this state.");
        setCities([]);
      } finally {
        setIsFetchingCities(false);
      }
    };

    fetchCities(selectedState);
  }, [selectedState]);
  
  useEffect(() => {
    if (selectedCity) {
      handleHospitalSearch();
    }
  }, [selectedCity]);

  const handleHospitalSearch = async () => {
    const isZipSearch = searchMode === 'zip' && zipCode.trim().length >= 5;
    const isStateSearch = searchMode === 'state' && selectedState && selectedCity;

    if (!isZipSearch && !isStateSearch) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    const prompt = isZipSearch
      ? `Find the official name, full address, main phone number, and official website URL for hospitals or clinics within the ZIP code "${zipCode}". Provide up to 10 results.`
      : `Find the official name, full address, main phone number, and official website URL for hospitals or clinics in "${selectedCity}, ${selectedState}". Provide up to 10 results.`;
      
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                url: { type: Type.STRING },
              },
              required: ["name", "address", "phone"],
            },
          },
        },
      });
      const results = JSON.parse(response.text.trim());
      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchError("No facilities found matching your criteria. Please try a different search.");
      }
    } catch (error) {
      console.error("Hospital search failed:", error);
      setSearchError("An error occurred during the search. Please check your input and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSwitchMode = (mode: 'zip' | 'state') => {
    setSearchMode(mode);
    setSearchError(null);
    setSearchResults([]);
    setZipCode('');
    setSelectedState('');
    setSelectedCity('');
    setCities([]);
    setCitiesError(null);
  };

  const renderZipSearch = () => (
    <div className="animate-fade-in">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter 5-digit ZIP code"
          maxLength={5}
          className="flex-grow px-4 py-3 glass-input rounded-lg shadow-sm text-center tracking-widest text-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleHospitalSearch()}
        />
        <button
          onClick={handleHospitalSearch}
          disabled={isSearching || zipCode.length < 5}
          className="px-5 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
          <span>Search</span>
        </button>
      </div>
       <button onClick={() => handleSwitchMode('state')} className="text-sm text-purple-300 hover:text-purple-200 hover:underline">
        Search another way
      </button>
    </div>
  );
  
  const renderStateSearch = () => (
    <div className="space-y-4 animate-fade-in">
        <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-4 py-3 glass-input rounded-lg shadow-sm"
        >
            <option value="">-- Select a State --</option>
            {US_STATES.map(s => <option key={s.abbreviation} value={s.abbreviation}>{s.name}</option>)}
        </select>

        {selectedState && (
            <div className="relative animate-fade-in">
                <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedState || isFetchingCities || cities.length === 0}
                    className="w-full px-4 py-3 glass-input rounded-lg shadow-sm appearance-none"
                >
                    <option value="">
                        {isFetchingCities ? 'Loading cities...' : cities.length > 0 ? '-- Select a City --' : 'No cities found.'}
                    </option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {isFetchingCities && <SpinnerIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />}
                {citiesError && <p className="text-red-400 text-xs text-left mt-1">{citiesError}</p>}
            </div>
        )}
        <button onClick={() => handleSwitchMode('zip')} className="text-sm text-purple-300 hover:text-purple-200 hover:underline">
            Search by ZIP code instead
        </button>
    </div>
  );

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center">
      <div className="w-full max-w-xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">Let's Get Started</h2>
        <p className="text-slate-300 mt-2 mb-6">Find the clinic or hospital where the patient was treated.</p>
        
        {searchMode === 'zip' ? renderZipSearch() : renderStateSearch()}

        <div className="mt-6 min-h-[200px]">
          {isSearching && (
            <div className="flex flex-col justify-center items-center p-8 animate-fade-in">
              <SpinnerIcon className="w-8 h-8 text-purple-400" />
              <p className="mt-2 text-slate-300">Searching for facilities...</p>
            </div>
          )}
          {searchError && !isSearching && (
            <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-md flex items-center gap-3 text-red-300 animate-fade-in">
              <WarningIcon className="w-6 h-6 shrink-0" />
              <p className="text-left">{searchError}</p>
            </div>
          )}
          {searchResults.length > 0 && !isSearching && (
            <div className="animate-fade-in">
                <h3 className="font-semibold text-slate-300 mb-2 text-left">Select a facility:</h3>
                <ul className="space-y-3 text-left max-h-[40vh] overflow-y-auto custom-scrollbar-dark pr-2">
                {searchResults.map((hospital, index) => (
                    <li key={index}>
                    <button
                        onClick={() => onHospitalSelect(hospital)}
                        className="w-full text-left p-4 glassmorphism rounded-lg hover:bg-purple-500/20 transition"
                    >
                        <p className="font-bold text-slate-100">{hospital.name}</p>
                        <p className="text-sm text-slate-300 mt-1">{hospital.address}</p>
                        <p className="text-sm text-slate-400">{hospital.phone}</p>
                        {hospital.url && <p className="text-sm text-purple-300 truncate">{hospital.url.replace(/^(https?:\/\/)?(www\.)?/, '')}</p>}
                    </button>
                    </li>
                ))}
                </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalSearchStep;
