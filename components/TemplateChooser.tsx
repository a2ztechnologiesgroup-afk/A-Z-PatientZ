import React, { useState } from 'react';
import type { PatientData, DoctorExcuseData, FuneralProgramData, Template } from '../types';
import { ChevronsLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon, ArrowRightIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface TemplateChooserProps<T> {
  data: T;
  templates: Template[];
  onSelect: (template: Template) => void;
  onBack: () => void;
  onCancel: () => void;
  PreviewComponent: React.FC<{ data: T; forwardedRef: React.RefObject<HTMLDivElement> }>;
}

const TEMPLATES_PER_PAGE = 4; 

const PaginationControl: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => (
    <nav className="flex items-center justify-center space-x-2" aria-label="Pagination">
        <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go to first page"
        >
            <ChevronsLeftIcon className="w-5 h-5 text-slate-300" />
        </button>
        <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go to previous page"
        >
            <ChevronLeftIcon className="w-5 h-5 text-slate-300" />
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
            <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                    currentPage === pageNumber
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
                aria-current={currentPage === pageNumber ? 'page' : undefined}
            >
                {pageNumber}
            </button>
        ))}

        <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go to next page"
        >
            <ChevronRightIcon className="w-5 h-5 text-slate-300" />
        </button>
        <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go to last page"
        >
            <ChevronsRightIcon className="w-5 h-5 text-slate-300" />
        </button>
    </nav>
);

const TemplateChooser = <T extends PatientData | DoctorExcuseData | FuneralProgramData>({
  data,
  templates,
  onSelect,
  onBack,
  onCancel,
  PreviewComponent,
}: TemplateChooserProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const totalPages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);
  const startIndex = (currentPage - 1) * TEMPLATES_PER_PAGE;
  const endIndex = startIndex + TEMPLATES_PER_PAGE;
  const currentTemplates = templates.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedTemplate(null); // Reset selection on page change
    }
  };

  const handleNext = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 h-full flex flex-col">
        <div className="text-center mb-6 pb-4 border-b border-white/20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50">Choose a Template</h2>
           <p className="text-sm text-slate-300 mt-1">
              Select a style for your document. Page {currentPage} of {totalPages}.
          </p>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar-dark pr-4 -mr-4">
            <div className="grid grid-cols-1 gap-12 max-w-4xl mx-auto">
              {currentTemplates.map((template) => (
                <div
                  key={template.name}
                  className="group flex flex-col"
                >
                  <div
                    onClick={() => setSelectedTemplate(template)}
                    className="cursor-pointer"
                  >
                      <div className={`border-2 rounded-lg transition-all duration-200 bg-white/5 overflow-hidden ${
                          selectedTemplate?.name === template.name
                           ? 'border-purple-400 ring-4 ring-purple-500/30 shadow-2xl'
                           : 'border-white/20 hover:border-purple-400 hover:shadow-xl'
                      }`}>
                        {/* The aspect-ratio container forces the correct shape, and scale makes the content inside larger */}
                        <div className="aspect-[8.5/11] w-full relative pointer-events-none overflow-hidden">
                            <div className="transform scale-[0.65] origin-top-left w-[154%] h-[154%] absolute top-0 left-0">
                                <PreviewComponent
                                    data={{ ...data, hospitalStyle: template }}
                                    forwardedRef={React.createRef()}
                                />
                            </div>
                        </div>
                      </div>
                      <p className={`text-center font-semibold text-base mt-3 transition-colors ${
                          selectedTemplate?.name === template.name ? 'text-purple-300' : 'text-slate-200 group-hover:text-purple-300'
                      }`}>
                        {template.name}
                      </p>
                  </div>
                   {selectedTemplate?.name === template.name && (
                    <div className="mt-4 animate-fade-in">
                        <button
                            onClick={handleNext}
                            className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors text-base"
                        >
                            <span>Next: Preview & Export</span>
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                   )}
                </div>
              ))}
            </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/20 flex flex-wrap justify-between items-center gap-4 shrink-0">
          <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
          />
          <div className="flex items-center gap-4">
               <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-6 py-3 bg-white/10 text-slate-100 font-semibold rounded-lg shadow-sm hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={onCancel}
        title="Are you sure you want to cancel?"
        message="You'll be taken back to the main menu, losing any unsaved progress."
        confirmText="Cancel Anyway"
        cancelText="No"
      />
    </>
  );
};

export default TemplateChooser;