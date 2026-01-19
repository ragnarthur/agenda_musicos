// components/Registration/StepNavigation.tsx
import React from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isLoading: boolean;
  missingRequirements?: string[];
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  isValid,
  isLoading,
  missingRequirements = [],
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="pt-6 border-t border-gray-200">
      {/* Banner de requisitos faltantes */}
      {!isValid && missingRequirements.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">
                Para continuar, complete:
              </p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
                {missingRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
      {/* Back Button */}
      {!isFirstStep ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      ) : (
        <div />
      )}

      {/* Next or Submit Button */}
      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isLoading}
          className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar Conta'
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid || isLoading}
          className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
      </div>
    </div>
  );
};

export default StepNavigation;
