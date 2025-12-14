import React from 'react';
import type { DoctorExcuseData } from '../types';
import { Barcode } from '../hooks/useBarcode';
import { HospitalIcon, PhoneIcon, GlobeIcon } from './Icons';
import { usePreviewScaler } from '../hooks/usePreviewScaler';


interface DoctorExcusePreviewProps {
  data: DoctorExcuseData;
  forwardedRef: React.RefObject<HTMLDivElement>;
}

const Watermark: React.FC<{ text?: string }> = ({ text = 'PATIENT COPY' }) => (
    <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ zIndex: 0, pointerEvents: 'none' }}
    >
        <div
            className="text-center font-bold whitespace-nowrap"
            style={{
                transform: 'rotate(-45deg)',
                fontSize: '5rem', // a bit smaller for the note
                color: 'rgba(0, 0, 0, 0.07)',
                letterSpacing: '0.5rem',
            }}
        >
            {text}
        </div>
    </div>
);

const DoctorExcusePreview: React.FC<DoctorExcusePreviewProps> = ({ data, forwardedRef }) => {
  const { containerRef, scale } = usePreviewScaler(8.5);
  const primaryColor = data.hospitalStyle?.primaryColor || '#1f2937';
  const fontFamily = data.hospitalStyle?.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const backgroundColor = data.hospitalStyle?.backgroundColor || '#FFFFFF';
  const textColor = data.hospitalStyle?.textColor || '#111827';
  const headerBackgroundColor = data.hospitalStyle?.headerBackgroundColor || 'transparent';
  const headerTextColor = data.hospitalStyle?.headerTextColor || textColor;
  const isDarkHeader = headerBackgroundColor !== 'transparent';

  const formattedName = [data.patientFirstName, data.patientMiddleName, data.patientLastName, data.patientSuffix].filter(Boolean).join(' ');
  const barcodeName = [data.patientLastName, data.patientFirstName].filter(Boolean).join('_').toUpperCase();
  const barcodeValue = barcodeName && data.dateOfVisit ? `${barcodeName}-${data.dateOfVisit}` : 'PATIENT-NOTE';

  // Determine the reason for absence, prioritizing AI-generated vague reason
  const reasonForAbsence = data.aiReasonForAbsence || data.diagnosis || 'medical reasons';

  const formatDate = (dateString: string) => {
      if (!dateString) return '';
      try {
        return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
      } catch (e) {
          return dateString;
      }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-300 pb-4">Note Preview</h2>
        <div ref={containerRef} className="w-full">
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                <div ref={forwardedRef} className={`p-12 shadow-lg border text-base leading-relaxed ${fontFamily} document-page relative overflow-hidden`} style={{ backgroundColor: backgroundColor, color: textColor, borderColor: 'rgba(0,0,0,0.1)' }}>
                    {data.showWatermark && <Watermark text={data.watermarkText} />}
                    <div className="relative z-10">
                        {/* Header */}
                        <header className={`flex justify-between items-center pb-6 border-b-2 mb-8 ${isDarkHeader ? 'p-4 rounded-t-md' : ''}`} style={{ borderColor: primaryColor, backgroundColor: headerBackgroundColor }}>
                            <div className="flex items-center gap-6">
                                {data.hospitalLogoUrl && (
                                    <div className={`p-1 ${isDarkHeader ? 'bg-white/90 rounded-md' : ''}`}>
                                        <img 
                                            src={data.hospitalLogoUrl} 
                                            alt={`${data.hospitalName} logo`}
                                            className="h-24 w-24 object-contain"
                                            crossOrigin="anonymous" // Required for html2canvas PDF export
                                        />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-3xl font-bold" style={{ color: headerTextColor }}>{data.hospitalName || 'Clinic/Hospital Name'}</h1>
                                    <div className="flex items-center mt-2 text-sm" style={{ color: headerTextColor, opacity: 0.9 }}>
                                        <HospitalIcon className="w-4 h-4 mr-2 shrink-0"/>
                                        <span>{data.hospitalAddress || '123 Health St, Wellness City, MD 12345'}</span>
                                    </div>
                                    <div className="flex items-center mt-1 text-sm" style={{ color: headerTextColor, opacity: 0.9 }}>
                                        <PhoneIcon className="w-4 h-4 mr-2 shrink-0"/>
                                        <span>{data.hospitalPhone || '(123) 456-7890'}</span>
                                    </div>
                                    {data.hospitalUrl && (
                                        <div className="flex items-center mt-1 text-sm" style={{ color: headerTextColor, opacity: 0.9 }}>
                                            <GlobeIcon className="w-4 h-4 mr-2 shrink-0"/>
                                            <span>{data.hospitalUrl.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <h2 className="text-xl font-bold mb-2" style={{ color: isDarkHeader ? headerTextColor : primaryColor }}>Physician's Note</h2>
                                <Barcode value={barcodeValue} options={{ height: 30 }} />
                            </div>
                        </header>

                        {/* Note Body */}
                        <main className="space-y-6">
                            <p><strong>Date:</strong> {formatDate(data.dateOfVisit)}</p>
                            
                            <h2 className="text-xl font-bold pt-4 text-center" style={{ color: primaryColor }}>Physician's Note for Absence</h2>

                            <p className="pt-4">To Whom It May Concern:</p>

                            <p>
                                Please excuse <strong>{formattedName || '[Patient Name]'}</strong> from work/school.
                            </p>
                            <p>
                                They were under my care for <strong>{reasonForAbsence}</strong> for the period starting on <strong>{formatDate(data.absenceStartDate)}</strong> and ending on <strong>{formatDate(data.absenceEndDate)}</strong>.
                            </p>
                            <p>
                                They are cleared to return to normal activities on <strong>{formatDate(data.returnDate)}</strong>.
                            </p>
                            
                            <p className="pt-4">If you have any questions, please do not hesitate to contact our office.</p>

                            <p>Sincerely,</p>
                        </main>

                        {/* Signature */}
                        <footer className="mt-16">
                            <div className="w-2/3">
                                
                                <div className="border-t-2 pt-2" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
                                    <p className="text-lg font-bold">
                                        {data.attendingPhysician || '[Physician Name]'}
                                    </p>
                                    <p className="text-sm opacity-70 mt-1">Attending Physician</p>
                                </div>
                            </div>
                        </footer>
                    </div>
                    <div className="absolute bottom-4 left-12 right-12 text-center text-[8px] text-slate-400 z-20">
                        <p>This is an AI-generated document for educational/entertainment purposes only.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default DoctorExcusePreview;