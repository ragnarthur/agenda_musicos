// components/form/FormField.tsx
import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  icon,
  required = false,
  error,
  children,
  hint,
}) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-3 text-gray-400" aria-hidden="true">
            {icon}
          </div>
        )}
        {children}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
