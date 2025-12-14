import React from 'react';

interface ProgressIndicatorProps {
  steps: { id: string, name: string }[];
  currentStepId: string;
  onStepClick?: (stepId: string) => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStepId, onStepClick }) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step, stepIdx) => {
          const isCompleted = stepIdx < currentStepIndex;
          const isCurrent = stepIdx === currentStepIndex;

          const handleClick = () => {
            if (isCompleted && onStepClick) {
              onStepClick(step.id);
            }
          };

          return (
            <li key={step.name} className="md:flex-1">
              {isCompleted ? (
                <button
                  onClick={handleClick}
                  className="group flex w-full flex-col border-l-4 border-purple-500 py-2 pl-4 text-left md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors hover:border-purple-400"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 group-hover:text-purple-300">{`Step ${stepIdx + 1}`}</span>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-slate-50">{step.name}</span>
                </button>
              ) : isCurrent ? (
                <div className="flex flex-col border-l-4 border-purple-500 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4" aria-current="step">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">{`Step ${stepIdx + 1}`}</span>
                  <span className="text-sm font-medium text-slate-100">{step.name}</span>
                </div>
              ) : (
                <div className="group flex flex-col border-l-4 border-slate-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{`Step ${stepIdx + 1}`}</span>
                  <span className="text-sm font-medium text-slate-400">{step.name}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default ProgressIndicator;