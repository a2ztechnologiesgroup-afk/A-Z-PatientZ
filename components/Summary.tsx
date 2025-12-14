import React, { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import type { PatientData, HospitalStyle } from '../types';
import { Barcode, useBarcode } from '../hooks/useBarcode';
import { HospitalIcon, PhoneIcon, GlobeIcon } from './Icons';
import { usePreviewScaler } from '../hooks/usePreviewScaler';


interface SummaryProps {
  data: PatientData;
  forwardedRef: React.RefObject<HTMLDivElement>;
}

const QRCodeComponent: React.FC<{ text: string, size?: number, className?: string, title?: string }> = ({ text, size = 80, className, title }) => {
    if (!text) {
        return null;
    }

    const encodedText = encodeURIComponent(text);
    const qrUrl = `https://quickchart.io/qr?text=${encodedText}&size=${size}&ecLevel=M`;

    return (
        <div className={className || 'flex flex-col items-center'}>
            <img 
                src={qrUrl} 
                alt={title || 'QR Code'} 
                width={size} 
                height={size} 
                className="block"
                crossOrigin="anonymous" // Required for html2canvas PDF export
            />
            {title && <p className="text-center text-xs opacity-70 mt-1">{title}</p>}
        </div>
    );
};


// Helper Components
const SummaryItem: React.FC<{ label: string; value?: string | number; multiline?: boolean; className?: string, styles?: React.CSSProperties }> = ({ label, value, multiline = false, className = '', styles }) => (
    value ? (
        <div className={className} style={styles}>
            <p className="text-xs font-bold opacity-70 uppercase tracking-wider">{label}</p>
            {multiline ? (
                 <p className="whitespace-pre-wrap mt-1">{value}</p>
            ) : (
                <p className="font-medium">{value}</p>
            )}
        </div>
    ) : null
);

const Section: React.FC<{ title: string; color: string; bgColor: string; children: React.ReactNode; styles?: React.CSSProperties }> = ({ title, color, bgColor, children, styles }) => (
    <section className="border rounded-md p-4 mb-6 relative" style={{ borderColor: 'rgba(0,0,0,0.1)', breakInside: 'avoid', ...styles }}>
        <h3 className="text-base font-bold -mt-7 mb-2 px-2 inline-block absolute" style={{ color: color, backgroundColor: bgColor }}>{title}</h3>
        <div className="pt-2">
            {children}
        </div>
    </section>
);

const Watermark: React.FC<{ text?: string }> = ({ text = 'PATIENT COPY' }) => (
    <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ zIndex: 0, pointerEvents: 'none' }}
    >
        <div
            className="text-center font-bold whitespace-nowrap"
            style={{
                transform: 'rotate(-45deg)',
                fontSize: '6rem',
                color: 'rgba(0, 0, 0, 0.07)',
                letterSpacing: '0.5rem',
            }}
        >
            {text}
        </div>
    </div>
);


// Helper Functions
const formatPatientName = (patientData: PatientData): string => {
    const { firstName, middleName, lastName, suffix } = patientData;
    if (!lastName && !firstName) return 'Unknown Patient';
    const parts = [lastName ? `${lastName},` : '', firstName, middleName, suffix];
    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ');
};

const generatePatientId = (patientData: PatientData): string => {
    const { lastName, firstName, dob } = patientData;
    if (!lastName || !firstName || !dob) {
        return 'Patient ID: UNKNOWN';
    }
    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
    
    const dobFormatted = dob.replace(/-/g, '');
    const year = dob.substring(0, 4);
    const pseudoRandom = (((firstName.length + lastName.length) * parseInt(year)) % 10000).toString().padStart(4, '0');
    return `Patient ID: ${initials}-${dobFormatted}-${pseudoRandom}`;
};

const generateBarcodeValue = (patientData: PatientData): string => {
    const { lastName, firstName, intake } = patientData;
    if (!lastName || !firstName || !intake) {
        return 'PATIENT-ID-UNKNOWN';
    }
    // Format: LASTNAME_FIRSTNAME-YYYYMMDD
    const nameFormatted = `${lastName.trim()}_${firstName.trim()}`.toUpperCase();
    const intakeFormatted = intake.replace(/-/g, '');
    return `${nameFormatted}-${intakeFormatted}`;
};

const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 'Not available';
    try {
        const date = new Date(dateStr + 'T00:00:00'); // Use T00:00:00 to treat date as local
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const datePart = date.toLocaleDateString('en-US', options);
        if (!timeStr) return datePart;
        // timeStr is HH:mm (military time)
        return `${datePart}, ${timeStr}`;
    } catch (e) {
        return `${dateStr || ''} ${timeStr || ''}`;
    }
};

const generateBloodPressure = (data: PatientData): string => {
    if (!data.dob || !data.firstName || !data.lastName) return 'N/A';
    const age = new Date().getFullYear() - new Date(data.dob).getFullYear();

    // Seeded random function for deterministic results
    let seed = data.firstName.charCodeAt(0) + data.lastName.charCodeAt(0) + age;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
    
    let systolic, diastolic;
    if (age < 1) { // Infant
        systolic = Math.floor(random() * (90 - 75 + 1) + 75);
        diastolic = Math.floor(random() * (60 - 50 + 1) + 50);
    } else if (age < 13) { // Child
        systolic = Math.floor(random() * (110 - 90 + 1) + 90);
        diastolic = Math.floor(random() * (75 - 60 + 1) + 60);
    } else { // Teen/Adult
        systolic = Math.floor(random() * (125 - 110 + 1) + 110);
        diastolic = Math.floor(random() * (85 - 75 + 1) + 75);
    }

    return `${systolic}/${diastolic} mmHg`;
};


// Page Chrome Components
const DocumentHeader: React.FC<{ data: PatientData }> = ({ data }) => {
    const hospitalStyle: Partial<HospitalStyle> = data.hospitalStyle ?? {};
    const headerBackgroundColor = hospitalStyle.headerBackgroundColor || 'transparent';
    const headerTextColor = hospitalStyle.headerTextColor || hospitalStyle.textColor || '#111827';
    const isDarkHeader = headerBackgroundColor !== 'transparent';
    const barcodeValue = generateBarcodeValue(data);

    const hospitalVCard = `BEGIN:VCARD
VERSION:3.0
FN:${data.hospitalName}
ORG:${data.hospitalName}
TEL;TYPE=WORK,VOICE:${data.hospitalPhone}
ADR;TYPE=WORK:;;${data.hospitalAddress.replace(/\n/g, ', ')}
URL:${data.hospitalUrl || ''}
END:VCARD`;

    return (
        <header 
            className={`flex justify-between items-start border-b-2 mb-6 ${isDarkHeader ? 'rounded-t-md' : ''}`}
            style={{ 
                paddingTop: hospitalStyle.headerPaddingTop || '1.5rem',
                paddingBottom: hospitalStyle.headerPaddingBottom || '1.5rem',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
                borderColor: hospitalStyle.primaryColor || '#1f2937', 
                backgroundColor: headerBackgroundColor 
            }}
        >
            <div className="flex items-center gap-4">
                {data.hospitalLogoUrl && (
                    <div className={`p-1 ${isDarkHeader ? 'bg-white/90 rounded-md' : ''}`}>
                        <img 
                            src={data.hospitalLogoUrl} 
                            alt={`${data.hospitalName} logo`}
                            className="h-20 w-20 object-contain"
                            crossOrigin="anonymous" // Required for html2canvas PDF export
                        />
                    </div>
                )}
                <div>
                    <h1 className="font-extrabold" style={{ color: headerTextColor, fontSize: hospitalStyle.h1Size || '1.75rem' }}>{data.hospitalName || 'Hospital Name'}</h1>
                    <div className="flex items-center mt-2 text-xs" style={{ color: headerTextColor, opacity: 0.9 }}>
                        <HospitalIcon className="w-4 h-4 mr-2 shrink-0"/>
                        <span>{data.hospitalAddress || '123 Health St, Wellness City, MD 12345'}</span>
                    </div>
                    <div className="flex items-center mt-1 text-xs" style={{ color: headerTextColor, opacity: 0.9 }}>
                        <PhoneIcon className="w-4 h-4 mr-2 shrink-0"/>
                        <span>{data.hospitalPhone || '(123) 456-7890'}</span>
                    </div>
                     {data.hospitalUrl && (
                        <div className="flex items-center mt-1 text-xs" style={{ color: headerTextColor, opacity: 0.9 }}>
                            <GlobeIcon className="w-4 h-4 mr-2 shrink-0"/>
                            <span>{data.hospitalUrl.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                 <h2 className="font-bold mb-2" style={{ color: isDarkHeader ? headerTextColor : (hospitalStyle.primaryColor || '#1f2937'), fontSize: hospitalStyle.h2Size || '1.25rem' }}>Patient Discharge Summary</h2>
                 <div className="text-sm font-semibold" style={{ color: headerTextColor }}>{formatPatientName(data)}</div>
                 <div className="text-xs opacity-80" style={{ color: headerTextColor }}>DOB: {data.dob}</div>
                 <p className="text-xs opacity-70 mt-1 mb-2">{generatePatientId(data)}</p>
                 <div className="text-xs opacity-80 grid grid-cols-[auto,1fr] gap-x-3 mb-2 text-left" style={{ color: isDarkHeader ? headerTextColor : (hospitalStyle.textColor || '#111827') }}>
                    <span className="font-semibold">Admitted:</span>
                    <span>{formatDateTime(data.intake, data.admissionTime)}</span>
                    <span className="font-semibold">Discharged:</span>
                    <span>{formatDateTime(data.discharge, data.dischargeTime)}</span>
                 </div>
                 <div className="flex items-end gap-4 mt-1">
                    <QRCodeComponent text={hospitalVCard} size={60} title="Hospital Contact" />
                    <Barcode value={barcodeValue} options={{ width: 1.5, height: 30, margin: 0 }} className="text-center" />
                 </div>
            </div>
        </header>
    );
};

const CondensedHeader: React.FC<{ data: PatientData, hospitalStyle: Partial<HospitalStyle> }> = ({ data, hospitalStyle }) => (
    <header className="flex justify-between items-start border-b-2 mb-6 p-6" style={{ borderColor: hospitalStyle.primaryColor || '#1f2937' }}>
        <div>
            <h2 className="font-bold text-lg" style={{ color: hospitalStyle.textColor || '#111827' }}>Patient Discharge Summary</h2>
        </div>
        <div className="text-right shrink-0 ml-4">
            <p className="font-semibold text-sm">{formatPatientName(data)}</p>
            <p className="text-xs opacity-70" style={{ color: hospitalStyle.textColor || '#111827' }}>{generatePatientId(data)}</p>
        </div>
    </header>
);

const DocumentFooter: React.FC<{ data: PatientData, pageNumberText: string, pageIndex: number }> = ({ data, pageNumberText, pageIndex }) => {
    const hospitalStyle: Partial<HospitalStyle> = data.hospitalStyle ?? {};
    const barcodeValue = generateBarcodeValue(data);

    return (
        <footer 
            className="mt-auto pt-4 border-t flex items-end justify-between" 
            style={{ 
                paddingTop: hospitalStyle.footerPadding || '1rem',
                borderColor: 'rgba(0,0,0,0.2)' 
            }}
        >
            {pageIndex > 0 ? <Barcode value={barcodeValue} /> : <div style={{width: '200px'}}></div>}
            
            <div className="text-center text-[9px] opacity-60">
                <p>This is an AI-generated document for educational/entertainment purposes only.</p>
                <p className="mt-1 font-medium">{pageNumberText}</p>
            </div>

            <div style={{width: '200px'}}></div> {/* Spacer to balance barcode */}
        </footer>
    );
};

// Main Summary Component - Refactored for Paging
const Summary: React.FC<SummaryProps> = ({ data, forwardedRef }) => {
    const { containerRef, scale } = usePreviewScaler(8.5);
    const hospitalStyle: Partial<HospitalStyle> = data.hospitalStyle ?? {};
    const primaryColor = hospitalStyle.primaryColor || '#1f2937';
    const fontFamily = hospitalStyle.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
    const backgroundColor = hospitalStyle.backgroundColor || '#FFFFFF';
    const textColor = hospitalStyle.textColor || '#111827';
    const bodySize = hospitalStyle.bodySize || '0.9rem';

    const contentRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<React.ReactNode[]>([]);
    
    // Signature SVG generation removed
    // const signatureSvg = useMemo(() => (
    //   data.attendingPhysician ? generateSignatureSvg(data.attendingPhysician) : ''
    // ), [data.attendingPhysician]);

    const calculateAge = (dob: string) => !dob ? '' : new Date().getFullYear() - new Date(dob).getFullYear();
    const formatHeight = () => data.heightFt && data.heightIn ? `${parseInt(data.heightFt) * 12 + parseInt(data.heightIn)} in (${data.heightFt}' ${data.heightIn}")` : '';
    const formatWeight = () => data.weight ? `${data.weight} lbs (${(parseFloat(data.weight) / 2.20462).toFixed(1)} kg)` : '';
    const formatFullAddress = (d: PatientData) => [d.patientStreetAddress, [d.patientCity, d.patientState, d.patientZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');
    const formatSsn = (last4?: string) => last4 && /^\d{4}$/.test(last4) ? `xxx-xx-${last4}` : '';
    const formatAllergies = () => data.knownAllergies === 'Other' ? data.otherAllergy : data.knownAllergies;

    // FIX: Added a type guard to ensure `val` is a string before calling `.trim()`.
    const medicalHistoryProvided = data.medicalHistory && Object.values(data.medicalHistory).some(val => val && typeof val === 'string' && val.trim() !== '');
    
    const pageStyles: React.CSSProperties = {
        backgroundColor: backgroundColor,
        color: textColor,
        fontSize: bodySize,
        fontFamily: fontFamily === 'font-serif' ? 'serif' : 'sans-serif',
        width: '8.5in',
        height: '11in',
        boxSizing: 'border-box',
    };

     const contentWrapperStyles: React.CSSProperties = {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    };
    
    // This effect runs after render to measure and split content into pages
    useLayoutEffect(() => {
        const contentNode = contentRef.current;
        if (!contentNode || contentNode.children.length === 0) {
            setPages([]);
            return;
        };

        const PAGE_CONTENT_HEIGHT_PX = 780; // A conservative height for an 8.5x11 page with headers/footers/margins.
        const MIN_CONTENT_HEIGHT_FOR_NEW_SECTION = 120; // Prevents starting a new section if less than this much space is left.

        const children = Array.from(contentNode.children) as HTMLElement[];
        const newPages: HTMLElement[][] = [];
        let currentPageContent: HTMLElement[] = [];
        let currentPageHeight = 0;

        children.forEach((section) => {
            const isSignatureBlock = section.classList.contains('signature-block');
            const sectionMargin = section.tagName.toLowerCase() === 'section' ? 24 : (isSignatureBlock ? 32 : 0);
            const sectionHeight = section.offsetHeight + sectionMargin;

            const mustStartNewPage = 
                currentPageContent.length > 0 && 
                (
                    // Condition 1: The section overflows the page.
                    (currentPageHeight + sectionHeight > PAGE_CONTENT_HEIGHT_PX) ||
                    // Condition 2: The section would start in an awkwardly small space at the page bottom.
                    (!isSignatureBlock && (PAGE_CONTENT_HEIGHT_PX - currentPageHeight) < MIN_CONTENT_HEIGHT_FOR_NEW_SECTION)
                );

            if (mustStartNewPage) {
                newPages.push(currentPageContent);
                currentPageContent = [section];
                currentPageHeight = sectionHeight;
            } else {
                currentPageContent.push(section);
                currentPageHeight += sectionHeight;
            }
        });
        
        if (currentPageContent.length > 0) {
            newPages.push(currentPageContent);
        }
        
        // Post-processing to prevent the signature block from being orphaned on the last page.
        const lastPageIndex = newPages.length - 1;
        if (lastPageIndex > 0) {
            const lastPageContent = newPages[lastPageIndex];
            // Check if the last page contains only one element AND it's the signature block.
            if (lastPageContent.length === 1 && lastPageContent[0]?.classList.contains('signature-block')) {
                const prevPageContent = newPages[lastPageIndex - 1];
                // Only pull an element if the previous page won't be left empty or with just one item itself.
                if (prevPageContent && prevPageContent.length > 1) {
                    const elementToMove = prevPageContent.pop();
                    if (elementToMove) {
                        // Move the last element of the previous page to the start of the final page.
                        lastPageContent.unshift(elementToMove);
                    }
                }
            }
        }
        
        const pageNodes = newPages.map((pageContent, pageIndex) => {
            const pageHtml = pageContent.map(el => el.outerHTML).join('');
            return (
                <div key={pageIndex} className="document-page p-8 shadow-lg border-slate-200 border bg-white mb-8 relative overflow-hidden" style={pageStyles}>
                    {data.showWatermark && <Watermark text={data.watermarkText} />}
                    <div style={contentWrapperStyles}>
                        {pageIndex === 0 ? <DocumentHeader data={data} /> : <CondensedHeader data={data} hospitalStyle={hospitalStyle} />}
                        <main className="flex-grow" dangerouslySetInnerHTML={{ __html: pageHtml }} />
                        <DocumentFooter data={data} pageNumberText={`Page ${pageIndex + 1} of ${newPages.length}`} pageIndex={pageIndex} />
                    </div>
                </div>
            );
        });

        setPages(pageNodes);

    }, [data]); // Rerun when data changes to re-paginate

    const sectionStyles: React.CSSProperties = { fontSize: bodySize };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-300 pb-4">Summary Preview</h2>
            <div ref={containerRef} className="w-full">
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    {/* This is the container for the final, paged preview */}
                    <div ref={forwardedRef}>
                        {pages.length > 0 ? pages : 
                            <div className="flex justify-center items-center p-8 text-slate-600 bg-white rounded-lg shadow">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating document preview...
                            </div>
                        }
                    </div>
                </div>
            </div>

            {/* This is the hidden container used for measuring the content */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '700px', ...pageStyles, display: 'flex', flexDirection: 'column' }} >
              <div ref={contentRef} style={{color: '#111827'}}>
                    <Section title="Patient Information" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                            <SummaryItem label="Patient Name" value={formatPatientName(data)} className="col-span-2 md:col-span-4"/>
                            <SummaryItem label="Date of Birth" value={data.dob} className="col-span-2"/>
                            <SummaryItem label="Age" value={calculateAge(data.dob)} className="col-span-2"/>
                            <SummaryItem label="Patient Address" value={formatFullAddress(data)} className="col-span-2 md:col-span-4" multiline/>
                            <SummaryItem label="Patient Phone" value={data.patientPhone} className="col-span-2" />
                            <SummaryItem label="SSN" value={formatSsn(data.patientSsnLast4)} className="col-span-2" />
                             <SummaryItem label="Gender" value={data.gender} />
                            <SummaryItem label="Ethnicity" value={data.ethnicity} />
                            <SummaryItem label="Known Allergies" value={formatAllergies()} className="col-span-2"/>
                        </div>
                    </Section>

                    <Section title="Vitals & Visit" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                            <SummaryItem label="Admission" value={formatDateTime(data.intake, data.admissionTime)} className="col-span-2" />
                            <SummaryItem label="Discharge" value={formatDateTime(data.discharge, data.dischargeTime)} className="col-span-2" />
                            <SummaryItem label="Height" value={formatHeight()} />
                            <SummaryItem label="Weight" value={formatWeight()} />
                            <SummaryItem label="Blood Pressure (Admission)" value={generateBloodPressure(data)} />
                            <div />
                            <SummaryItem label="Temp (Admission)" value={data.admissionTemp ? `${data.admissionTemp}°F` : ''} />
                            <SummaryItem label="Temp (Discharge)" value={data.dischargeTemp ? `${data.dischargeTemp}°F` : ''} />
                         </div>
                    </Section>

                    {medicalHistoryProvided && (
                        <Section title="Medical History" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}>
                            <div className="space-y-4">
                                <SummaryItem label="Chronic Conditions" value={data.medicalHistory?.chronicConditions} multiline />
                                <SummaryItem label="Past Surgeries/Hospitalizations" value={data.medicalHistory?.pastSurgeries} multiline />
                                <SummaryItem label="Family Medical History" value={data.medicalHistory?.familyMedicalHistory} multiline />
                                <SummaryItem label="Social History" value={data.medicalHistory?.socialHistory} multiline />
                                <SummaryItem label="Immunization Status" value={data.medicalHistory?.immunizationStatus} multiline />
                            </div>
                        </Section>
                    )}
                    
                    <Section title="Medical Details" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}>
                        <div className="space-y-4">
                            <SummaryItem label="Symptoms at Admission" value={data.symptoms} multiline/>
                            <SummaryItem label="Final Diagnosis" value={data.diagnosis} multiline/>
                        </div>
                    </Section>

                    {data.diagnosisExplanation && <Section title="Understanding Your Diagnosis" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><p className="whitespace-pre-wrap">{data.diagnosisExplanation}</p></Section>}
                    {data.treatmentExplanation && <Section title="Your Treatment Plan" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><SummaryItem label="Prescriptions at Discharge" value={data.prescriptions} multiline/><p className="mt-4 whitespace-pre-wrap">{data.treatmentExplanation}</p></Section>}
                    {data.medicationSideEffects && <Section title="Medication Information" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><SummaryItem label="Potential Side Effects" value={data.medicationSideEffects} multiline/></Section>}
                    {data.lifestyleRecommendations && <Section title="Lifestyle & Recovery Recommendations" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><p className="whitespace-pre-wrap">{data.lifestyleRecommendations}</p></Section>}

                    <Section title="Discharge & Follow-up Instructions" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}>
                        <div className="space-y-4">
                           <SummaryItem label="General Instructions" value={data.instructions} multiline/>
                           {data.symptomInstructions && <SummaryItem label="Symptom Monitoring" value={data.symptomInstructions} multiline/>}
                        </div>
                    </Section>

                    {data.followUpCare && <Section title="Follow-Up Care" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><p className="whitespace-pre-wrap">{data.followUpCare}</p></Section>}
                    {data.referrals && data.referrals.length > 0 && <Section title="Specialist Referrals" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><div className="space-y-4">{data.referrals.map((ref, index) => (<div key={index} className="p-3 border-l-4 rounded" style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}10` }}><p className="font-bold">{ref.name} <span className="font-normal opacity-80">- {ref.specialty}</span></p><p className="text-sm">{ref.practice}</p><p className="text-sm">{ref.address}</p><p className="text-sm">{ref.phone}</p></div>))}</div></Section>}
                    {data.faq && data.faq.length > 0 && <Section title="Frequently Asked Questions" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><div className="space-y-4">{data.faq.map((item, index) => (<div key={index}><p className="font-bold">{item.question}</p><p className="mt-1 whitespace-pre-wrap">{item.answer}</p></div>))}</div></Section>}
                    {data.returnToWorkSchoolDate && <Section title="Work/School Status" color={primaryColor} bgColor={backgroundColor} styles={sectionStyles}><p>Physician recommends the patient may return to work/school no earlier than <strong>{data.returnToWorkSchoolDate}</strong>.</p></Section>}

                    {data.attendingPhysician && (
                        <div className="pt-8 signature-block">
                            <div className="w-1/2">
                                {/* Removed signature SVG image */}
                                <div className="border-t pt-2" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
                                    <p className="font-bold">
                                      {data.attendingPhysician}
                                    </p>
                                    <p className="text-xs opacity-70 mt-1">Attending Physician</p>
                                </div>
                            </div>
                        </div>
                    )}
              </div>
            </div>
        </div>
    );
};

export default Summary;