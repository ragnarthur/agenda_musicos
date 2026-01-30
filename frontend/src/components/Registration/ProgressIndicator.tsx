// components/Registration/ProgressIndicator.tsx
import React from 'react';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepNames,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-sky-600 text-white'
                        : isCurrent
                          ? 'bg-sky-600 text-white ring-4 ring-sky-200'
                          : 'bg-gray-300 text-gray-600'
                    }
                  `}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                </div>

                {/* Step Name */}
                <div
                  className={`
                    mt-2 text-xs sm:text-sm font-medium text-center px-1
                    ${isCurrent ? 'text-sky-600' : isCompleted ? 'text-gray-700' : 'text-gray-500'}
                  `}
                >
                  {stepNames[index]}
                </div>
              </div>

              {/* Connector Line */}
              {stepNumber < totalSteps && (
                <div
                  className={`
                    h-1 flex-1 mx-2 mt-[-30px] transition-all duration-300
                    ${isCompleted ? 'bg-sky-600' : 'bg-gray-300'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;
