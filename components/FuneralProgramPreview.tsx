import React from 'react';
import type { FuneralProgramData } from '../types';
import { usePreviewScaler } from '../hooks/usePreviewScaler';

interface FuneralProgramPreviewProps {
  data: FuneralProgramData;
  forwardedRef: React.RefObject<HTMLDivElement>;
}

const Watermark: React.FC<{ text?: string, className?: string }> = ({ text, className = '' }) => (
    text ? <div
        className={`absolute inset-0 flex items-center justify-center overflow-hidden ${className}`}
        style={{ zIndex: 0, pointerEvents: 'none' }}
    >
        <div
            className="text-center font-bold whitespace-nowrap"
            style={{
                transform: 'rotate(-45deg)',
                fontSize: '3rem', // Smaller for individual booklet pages
                color: 'rgba(0, 0, 0, 0.07)',
                letterSpacing: '0.2rem', // Smaller letter spacing for readability at smaller sizes
            }}
        >
            {text}
        </div>
    </div> : null
);

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
};

const FuneralProgramPreview: React.FC<FuneralProgramPreviewProps> = ({ data, forwardedRef }) => {
  const { containerRef, scale } = usePreviewScaler(11);
  const primaryColor = data.hospitalStyle?.primaryColor || '#581C87'; // Default to a respectful purple
  const fontFamily = data.hospitalStyle?.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const backgroundColor = data.hospitalStyle?.backgroundColor || '#F5F3FF';
  const textColor = data.hospitalStyle?.textColor || '#3730A3';
  const bodySize = data.hospitalStyle?.bodySize || '0.85rem';

  const fullName = [data.deceasedFirstName, data.deceasedMiddleName, data.deceasedLastName, data.deceasedSuffix].filter(Boolean).join(' ');
  const lifeDates = `${formatDate(data.dateOfBirth)} - ${formatDate(data.dateOfDeath)}`;

  const pageStyles: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    fontFamily: fontFamily === 'font-serif' ? 'serif' : 'sans-serif',
    fontSize: bodySize,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-300 pb-4">Program Preview</h2>
      <div ref={containerRef} className="w-full">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <div ref={forwardedRef} className="physical-sheets-container"> {/* Container for two physical sheets */}

                {/* Physical Sheet 1: Back Cover (Booklet Page 4) and Front Cover (Booklet Page 1) */}
                <div className="physical-sheet shadow-lg border-2 border-slate-200" style={pageStyles}>
                {/* Booklet Page 4 (Back Cover) */}
                <div className="booklet-page p-8 relative flex flex-col justify-between items-center text-center">
                    {data.showWatermark && <Watermark text={data.watermarkText} className="opacity-50"/>}
                    <div className="relative z-10 flex flex-col items-center justify-center flex-grow">
                    {data.photoUrl ? (
                        <img 
                        src={data.photoUrl} 
                        alt="Deceased" 
                        className="w-40 h-40 object-cover rounded-full border-2 mb-4" 
                        style={{ borderColor: primaryColor }}
                        crossOrigin="anonymous" // Required for html2canvas PDF export
                        />
                    ) : (
                        <div className="w-40 h-40 flex items-center justify-center bg-slate-200/50 rounded-full border-2 mb-4 text-slate-500 text-sm" style={{ borderColor: primaryColor }}>
                            No Photo
                        </div>
                    )}
                    <h1 className="text-3xl font-bold my-2" style={{ color: primaryColor, fontFamily: "'Dancing Script', cursive" }}>
                        {fullName}
                    </h1>
                    <p className="text-lg">{lifeDates}</p>
                    </div>
                    <footer className="relative z-10 text-xs mt-auto pt-4 border-t w-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                        <p className="opacity-70">Program created by {data.creatorFirstName} {data.creatorLastName}</p>
                        <p className="text-[8px] mt-1 opacity-60">This is an AI-generated document for educational/entertainment purposes only.</p>
                    </footer>
                </div>

                {/* Booklet Page 1 (Front Cover) */}
                <div className="booklet-page p-8 relative flex flex-col justify-between items-center text-center">
                    {data.showWatermark && <Watermark text={data.watermarkText}/>}
                    <header className="relative z-10 mb-auto">
                        <p className="text-lg tracking-widest uppercase">A Celebration of Life</p>
                        <h1 className="text-5xl font-bold my-2" style={{ color: primaryColor, fontFamily: "'Dancing Script', cursive" }}>
                            {fullName}
                        </h1>
                        <p className="text-xl">{lifeDates}</p>
                    </header>
                    <div className="relative z-10 mt-auto text-sm space-y-2">
                        <p className="font-bold">{formatDate(data.serviceDate)} at {data.serviceTime}</p>
                        <p>{data.funeralHomeName}</p>
                        <p className="text-slate-400">{data.funeralHomeAddress}</p>
                    </div>
                </div>
                </div>

                {/* Physical Sheet 2: Inside Left (Booklet Page 2) and Inside Right (Booklet Page 3) */}
                <div className="physical-sheet shadow-lg border-2 border-slate-200" style={pageStyles}>
                {/* Booklet Page 2 (Inside Left) */}
                <div className="booklet-page p-8 relative overflow-hidden">
                    {data.showWatermark && <Watermark text={data.watermarkText}/>}
                    <div className="relative z-10 text-left">
                        <h2 className="text-xl font-semibold border-b-2 pb-2 mb-4" style={{ borderColor: primaryColor }}>Obituary</h2>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.obituary}</p>
                    </div>
                </div>

                {/* Booklet Page 3 (Inside Right) */}
                <div className="booklet-page p-8 relative flex flex-col">
                    {data.showWatermark && <Watermark text={data.watermarkText}/>}
                    <div className="relative z-10 text-left flex-grow">
                        <h2 className="text-xl font-semibold border-b-2 pb-2 mb-4" style={{ borderColor: primaryColor }}>Order of Service</h2>
                        <p className="whitespace-pre-wrap text-sm">{data.orderOfService}</p>
                        <h2 className="text-xl font-semibold border-b-2 pb-2 mt-6 mb-4" style={{ borderColor: primaryColor }}>Pallbearers</h2>
                        <p className="whitespace-pre-wrap text-sm">{data.pallbearers}</p>
                        <h2 className="text-xl font-semibold border-b-2 pb-2 mt-6 mb-4" style={{ borderColor: primaryColor }}>Acknowledgements</h2>
                        <p className="whitespace-pre-wrap text-sm italic">{data.acknowledgements}</p>
                    </div>
                    {data.hospitalLogoUrl && (
                        <div className="relative z-10 mt-auto pt-4 flex justify-center">
                            <img 
                                src={data.hospitalLogoUrl} 
                                alt={`${data.funeralHomeName} logo`}
                                className="h-16 w-auto object-contain"
                                crossOrigin="anonymous" // Required for html2canvas PDF export
                            />
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FuneralProgramPreview;