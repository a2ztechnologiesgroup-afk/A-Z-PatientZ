import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import DischargeSummaryPage from './pages/DischargeSummaryPage';
import DoctorExcusePage from './pages/DoctorExcusePage';
import FuneralProgramPage from './pages/FuneralProgramPage';
import { HomeIcon } from './components/Icons';

type Page = 'home' | 'discharge' | 'excuse' | 'funeral';

function App() {
  const [page, setPage] = useState<Page>('home');

  const pageTitles: Record<Page, string> = {
    home: 'Document Generators',
    discharge: 'Patient Discharge Summary Generator',
    excuse: "Doctor's Excuse Generator",
    funeral: "Funeral Program Generator",
  };

  const renderPage = () => {
    switch (page) {
      case 'discharge':
        return <DischargeSummaryPage onGoHome={() => setPage('home')} />;
      case 'excuse':
        return <DoctorExcusePage onGoHome={() => setPage('home')} />;
      case 'funeral':
        return <FuneralProgramPage onGoHome={() => setPage('home')} />;
      case 'home':
      default:
        return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100">
      <header className="z-10 glassmorphism shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-4">
                  {page !== 'home' && (
                     <button 
                       onClick={() => setPage('home')} 
                       className="p-2 rounded-full hover:bg-white/10 transition-colors"
                       aria-label="Go to Home"
                     >
                       <HomeIcon className="w-6 h-6 text-slate-100" />
                     </button>
                  )}
                  <h1 className="text-2xl font-bold text-slate-50 tracking-wider">
                      {pageTitles[page]}
                  </h1>
                </div>
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:px-8 flex flex-col">
        <div className="flex-grow flex flex-col h-full overflow-hidden">
         {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;