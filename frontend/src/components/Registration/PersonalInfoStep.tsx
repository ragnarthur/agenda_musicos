// components/Registration/PersonalInfoStep.tsx
import React, { useRef, useEffect } from 'react';
import { User, Phone, MapPin } from 'lucide-react';

type InputChange =
  | React.ChangeEvent<HTMLInputElement>
  | { target: { name: string; value: string } };

interface PersonalInfoStepProps {
  formData: {
    first_name: string;
    last_name: string;
    phone: string;
    city: string;
    state: string;
  };
  onChange: (e: InputChange) => void;
  errors: Record<string, string>;
  filteredCities: Array<{ city: string; state: string }>;
  showCitySuggestions: boolean;
  handleCityChange: (value: string) => void;
  selectCity: (cityObj: { city: string; state: string }) => void;
  setShowCitySuggestions: (show: boolean) => void;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  formData,
  onChange,
  errors,
  filteredCities,
  showCitySuggestions,
  handleCityChange,
  selectCity,
  setShowCitySuggestions,
}) => {
  const cityInputRef = useRef<HTMLDivElement>(null);
  const emitChange = (name: string, value: string) => onChange({ target: { name, value } });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setShowCitySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowCitySuggestions]);

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">
        Conte-nos um pouco sobre você. Isso ajudará outros músicos a te encontrar.
      </p>

      <div className="space-y-4">
        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={onChange}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                ${errors.first_name ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder="João"
              autoComplete="given-name"
            />
          </div>
          {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Sobrenome <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={onChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Silva"
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefone <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={onChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
              autoComplete="tel"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Será visível apenas para músicos com quem você se conectar
          </p>
        </div>

        {/* City with Autocomplete */}
        <div ref={cityInputRef}>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Cidade <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city && formData.state ? `${formData.city} - ${formData.state}` : formData.city}
              onChange={(e) => {
                const value = e.target.value;
                if (!value.trim()) {
                  emitChange('city', '');
                  emitChange('state', '');
                  setShowCitySuggestions(false);
                } else {
                  handleCityChange(value.replace(/ - [A-Z]{2}$/, ''));
                }
              }}
              onFocus={() => {
                if (formData.city.trim().length > 0) {
                  handleCityChange(formData.city.replace(/ - [A-Z]{2}$/, ''));
                }
              }}
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent relative z-10 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Digite sua cidade"
              autoComplete="off"
            />

            {/* City Suggestions Dropdown */}
            {showCitySuggestions && filteredCities.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCities.slice(0, 10).map((cityObj) => (
                  <button
                    key={`${cityObj.city}-${cityObj.state}`}
                    type="button"
                    onClick={() => selectCity(cityObj)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{cityObj.city}</span>
                    </div>
                    <span className="text-sm text-gray-500">{cityObj.state}</span>
                  </button>
                ))}
                {filteredCities.length > 10 && (
                  <div className="px-4 py-2 text-xs text-gray-500 border-t">
                    +{filteredCities.length - 10} cidades... continue digitando
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ajuda outros músicos da sua região a te encontrar
          </p>
          {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;
