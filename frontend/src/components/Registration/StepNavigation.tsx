// components/Registration/StepNavigation.tsx
import React from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isLoading: boolean;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  isValid,
  isLoading,
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
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
  );
};

export default StepNavigation;
