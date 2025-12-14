import React from 'react';
import { DocumentIcon, NoteIcon, FuneralIcon } from '../components/Icons';

interface HomePageProps {
  setPage: (page: 'discharge' | 'excuse' | 'funeral') => void;
}

const ToolCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  gridSpan?: string;
}> = ({ icon, title, description, onClick, gridSpan = 'lg:col-span-1' }) => (
  <button
    onClick={onClick}
    className={`glassmorphism card-3d-hover rounded-xl p-8 text-center flex flex-col items-center ${gridSpan}`}
  >
    <div className="bg-purple-500/20 p-4 rounded-full mb-4 ring-1 ring-purple-400/50">
      {icon}
    </div>
    <h2 className="text-2xl font-bold text-slate-50 mb-2">{title}</h2>
    <p className="text-slate-300">{description}</p>
  </button>
);

const HomePage: React.FC<HomePageProps> = ({ setPage }) => {
  return (
    <div className="flex-grow flex items-center justify-center h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
        <ToolCard
          icon={<DocumentIcon className="w-10 h-10 text-purple-300" />}
          title="Discharge Summary Generator"
          description="Generate detailed, professional patient discharge summaries with barcodes and QR codes."
          onClick={() => setPage('discharge')}
        />
        <ToolCard
          icon={<NoteIcon className="w-10 h-10 text-purple-300" />}
          title="Doctor's Excuse Generator"
          description="Quickly create and print official doctor's notes for work or school."
          onClick={() => setPage('excuse')}
        />
        <ToolCard
          icon={<FuneralIcon className="w-10 h-10 text-purple-300" />}
          title="Funeral Program Generator"
          description="Create and design a respectful funeral program to honor a loved one."
          onClick={() => setPage('funeral')}
        />
      </div>
    </div>
  );
};

export default HomePage;