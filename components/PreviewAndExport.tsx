import React, { useState, useRef, useEffect } from 'react';
import type { PatientData, DoctorExcuseData, FuneralProgramData } from '../types';
import { PdfIcon, WordIcon, ArrowLeftIcon, SpinnerIcon } from './Icons';

interface PreviewAndExportProps<T> {
  data: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  onBack: () => void;
  PreviewComponent: React.FC<{ data: T; forwardedRef: React.RefObject<HTMLDivElement> }>;
  fileName: string;
}

const PreviewAndExport = <T extends PatientData | DoctorExcuseData | FuneralProgramData>({
  data,
  setFormData,
  onBack,
  PreviewComponent,
  fileName,
}: PreviewAndExportProps<T>) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'docx' | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const currentStyle = (prev as PatientData | DoctorExcuseData | FuneralProgramData).hospitalStyle || {};
      return {
        ...prev,
        hospitalStyle: {
          ...currentStyle,
          [name]: value,
        }
      } as T;
    });
  };

  const exportPDF = async () => {
    const contentToExport = previewRef.current;
    if (!contentToExport || !(window as any).jspdf || !(window as any).html2canvas) {
        alert('PDF export library is not available. Please try again later.');
        return;
    }
    
    setIsExporting(true);
    setExportType('pdf');
    setIsExportMenuOpen(false);

    try {
        const { jsPDF } = (window as any).jspdf;
        // Determine if it's a funeral program for special handling
        const isFuneralProgram = (data as FuneralProgramData).deceasedFirstName !== undefined;

        const pdf = new jsPDF({
            orientation: isFuneralProgram ? 'l' : 'p', // Landscape for funeral, Portrait for others
            unit: 'in',
            format: 'letter',
        });

        // Select elements based on document type
        const pageElements = isFuneralProgram
          ? contentToExport.querySelectorAll<HTMLElement>('.physical-sheet')
          : contentToExport.querySelectorAll<HTMLElement>('.document-page');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i];
            const canvas = await (window as any).html2canvas(pageElement, {
              scale: 2, // Good balance of quality and performance
              useCORS: true,
              logging: false,
              width: pageElement.offsetWidth,
              height: pageElement.offsetHeight,
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        }
        
        pdf.save(`${fileName}.pdf`);

    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('An error occurred during PDF export.');
    } finally {
        setIsExporting(false);
        setExportType(null);
    }
  };
  
    const svgToPng = (svgDataUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    resolve(pngDataUrl);
                } else {
                    reject(new Error('Could not get canvas context'));
                }
            };
            img.onerror = (e) => {
                reject(new Error(`Error loading image ${e}`));
            };
            img.crossOrigin = "anonymous";
            img.src = svgDataUrl;
        });
    };

  const exportDocx = async () => {
    if (!previewRef.current) return;
    
    if (typeof (window as any).htmlToDocx === 'undefined') {
        alert('DOCX export library is not available. Please try again later.');
        console.error('htmlToDocx is not defined on the window object.');
        return;
    }

    setIsExporting(true);
    setExportType('docx');
    setIsExportMenuOpen(false);

    try {
      const mergedContent = document.createElement('div');
      const isFuneralProgram = (data as FuneralProgramData).deceasedFirstName !== undefined;
      const pageElements = isFuneralProgram
          ? previewRef.current.querySelectorAll<HTMLElement>('.physical-sheet')
          : previewRef.current.querySelectorAll<HTMLElement>('.document-page');

      // Clone and merge all pages into a single element for export
      pageElements.forEach(page => {
        const pageClone = page.cloneNode(true) as HTMLElement;
        // Add a page break for Word
        pageClone.style.pageBreakAfter = 'always';
        mergedContent.appendChild(pageClone);
      });
      
      const signatureImgs = mergedContent.querySelectorAll('img[src^="data:image/svg+xml"]');
      for (const signatureImg of Array.from(signatureImgs)) {
        if (signatureImg instanceof HTMLImageElement) {
            try {
                const pngSrc = await svgToPng(signatureImg.src);
                signatureImg.src = pngSrc;
                signatureImg.style.width = '200px';
                signatureImg.style.height = 'auto';
            } catch(e) {
                console.error("Could not convert signature SVG to PNG for DOCX export:", e);
                signatureImg.remove(); // Remove if conversion fails
            }
        }
      }
      
      const fileBlob = await (window as any).htmlToDocx.asBlob(mergedContent.innerHTML, {
        orientation: isFuneralProgram ? 'landscape' : 'portrait', // Landscape for funeral, Portrait for others
        margins: { top: 720, right: 720, bottom: 720, left: 720 },
      });
      
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      alert('An error occurred during DOCX export.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 shrink-0">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Back to Templates</span>
            </button>
            <div className="relative inline-block text-left" ref={exportMenuRef}>
              <div>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExporting}
                  className="inline-flex w-full justify-center items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:bg-purple-400"
                >
                  {isExporting && <SpinnerIcon className="w-5 h-5" />}
                  {isExporting ? `Exporting ${exportType?.toUpperCase()}...` : 'Export As'}
                  <svg className={`-mr-1 ml-2 h-5 w-5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {isExportMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-20 border border-white/20">
                  <div className="py-1">
                    <button
                      onClick={exportPDF}
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                    >
                      <PdfIcon className="w-5 h-5 text-red-400" />
                      <span>Export to PDF</span>
                    </button>
                    <button
                      onClick={exportDocx}
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                    >
                      <WordIcon className="w-5 h-5 text-blue-400" />
                      <span>Export to Word (.docx)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 border-t border-white/20 pt-4">
                <h3 className="text-base font-semibold text-slate-100 mb-2">Document Options</h3>
                <div className="p-3 glassmorphism rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 items-end">
                    <div className="flex items-center pt-5">
                        <input id="showWatermark" name="showWatermark" type="checkbox" checked={data.showWatermark ?? false} onChange={handleWatermarkChange} className="h-4 w-4 rounded border-slate-500 bg-white/10 text-purple-500 focus:ring-purple-500" />
                        <label htmlFor="showWatermark" className="ml-2 block text-sm font-medium text-slate-200">Show Watermark</label>
                    </div>
                    {data.showWatermark && (
                        <div>
                            <label htmlFor="watermarkText" className="block text-sm font-medium text-slate-200 mb-1">Watermark Text</label>
                            <input type="text" name="watermarkText" id="watermarkText" value={data.watermarkText || ''} onChange={handleWatermarkChange} className="w-full px-2 py-1.5 glass-input rounded-md shadow-sm text-sm" placeholder="e.g., DRAFT" />
                        </div>
                    )}
                    <div>
                        <label htmlFor="headerPaddingTop" className="block text-sm font-medium text-slate-200 mb-1">Header Top Padding</label>
                        <input type="text" name="headerPaddingTop" id="headerPaddingTop" value={((data as any).hospitalStyle?.headerPaddingTop) || ''} onChange={handleStyleChange} className="w-full px-2 py-1.5 glass-input rounded-md shadow-sm text-sm" placeholder="e.g., 1.5rem" />
                    </div>
                    <div>
                        <label htmlFor="headerPaddingBottom" className="block text-sm font-medium text-slate-200 mb-1">Header Bottom Padding</label>
                        <input type="text" name="headerPaddingBottom" id="headerPaddingBottom" value={((data as any).hospitalStyle?.headerPaddingBottom) || ''} onChange={handleStyleChange} className="w-full px-2 py-1.5 glass-input rounded-md shadow-sm text-sm" placeholder="e.g., 1.5rem" />
                    </div>
                </div>
            </div>
       </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar-dark flex justify-center">
        {/* The ref is now on the container that holds the paginated preview */}
        <div ref={previewRef}>
            <PreviewComponent data={data} forwardedRef={useRef(null)} />
        </div>
      </div>
    </div>
  );
};

export default PreviewAndExport;