// components/Registration/MusicProfileStep.tsx
import React, { useState, useMemo } from 'react';
import { Music, FileText, Check, Search, Plus, Sparkles } from 'lucide-react';
import { useInstruments } from '../../hooks/useInstruments';

const BIO_MAX_LENGTH = 340;

interface MusicProfileStepProps {
  formData: {
    isMultiInstrumentist: boolean;
    instrument: string;
    instruments: string[];
    instrumentOther: string;
    bio: string;
  };
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  errors: Record<string, string>;
  toggleMultiInstrumentist: (value: boolean) => void;
  toggleInstrument: (value: string) => void;
}

const MusicProfileStep: React.FC<MusicProfileStepProps> = ({
  formData,
  onChange,
  errors,
  toggleMultiInstrumentist,
  toggleInstrument,
}) => {
  const { instruments, loading: loadingInstruments, createCustomInstrument } = useInstruments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customInstrumentName, setCustomInstrumentName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Filter instruments based on search query
  const filteredInstruments = useMemo(() => {
    if (!searchQuery.trim()) {
      return instruments;
    }
    const query = searchQuery.toLowerCase();
    return instruments.filter(
      inst =>
        inst.display_name.toLowerCase().includes(query) || inst.name.toLowerCase().includes(query)
    );
  }, [instruments, searchQuery]);

  const handleCreateCustomInstrument = async () => {
    if (!customInstrumentName.trim()) {
      return;
    }

    setIsCreatingCustom(true);
    const newInstrument = await createCustomInstrument(customInstrumentName);
    setIsCreatingCustom(false);

    if (newInstrument) {
      // Add automatically to selected instruments
      if (formData.isMultiInstrumentist) {
        toggleInstrument(newInstrument.name);
      } else {
        // For single instrument, update via onChange simulation
        const event = {
          target: { name: 'instrument', value: newInstrument.name },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(event);
      }

      // Clear custom form
      setCustomInstrumentName('');
      setSearchQuery('');
      setShowCustomForm(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">
        Selecione seus instrumentos e escreva uma breve bio para seu perfil.
      </p>

      <div className="space-y-6">
        {/* Multi-Instrumentist Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Você é multi-instrumentista?
          </label>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
            <button
              type="button"
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                !formData.isMultiInstrumentist
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => toggleMultiInstrumentist(false)}
            >
              Não
            </button>
            <button
              type="button"
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                formData.isMultiInstrumentist
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => toggleMultiInstrumentist(true)}
            >
              Sim
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div>
          <label
            htmlFor="instrument-search"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Buscar Instrumento
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="instrument-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Digite para buscar..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Instruments Selection */}
        {loadingInstruments ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando instrumentos...</p>
          </div>
        ) : !formData.isMultiInstrumentist ? (
          // Single Instrument
          <div>
            <label htmlFor="instrument" className="block text-sm font-medium text-gray-700 mb-1">
              Instrumento principal <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Music className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="instrument"
                name="instrument"
                value={formData.instrument}
                onChange={onChange}
                className={`
                  w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                  bg-white text-gray-900
                  ${errors.instrument ? 'border-red-500' : 'border-gray-300'}
                `}
              >
                <option value="">Selecione um instrumento</option>
                {filteredInstruments.map(inst => (
                  <option key={inst.id} value={inst.name}>
                    {inst.display_name}
                    {inst.type === 'community' ? ' ✨' : ''}
                  </option>
                ))}
              </select>
            </div>

            {errors.instrument && <p className="mt-1 text-sm text-red-600">{errors.instrument}</p>}
            {!errors.instrument && formData.instrument && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Instrumento selecionado
              </p>
            )}
          </div>
        ) : (
          // Multiple Instruments
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Selecione os instrumentos <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">Marque todos que você toca/canta</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {filteredInstruments.map(inst => {
                const checked = formData.instruments.includes(inst.name);
                return (
                  <label
                    key={inst.id}
                    className={`
                      flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors
                      ${
                        checked
                          ? 'border-sky-300 bg-sky-50 text-sky-800'
                          : 'border-gray-200 hover:border-sky-200'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInstrument(inst.name)}
                      className="sr-only"
                    />
                    <span
                      className={`
                        h-4 w-4 rounded border flex items-center justify-center text-xs
                        ${
                          checked
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'border-gray-300 text-transparent'
                        }
                      `}
                    >
                      ✓
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {inst.display_name}
                      {inst.type === 'community' && <Sparkles className="h-3 w-3 text-blue-500" />}
                    </span>
                  </label>
                );
              })}
            </div>

            {errors.instrument && <p className="mt-1 text-sm text-red-600">{errors.instrument}</p>}
            {!errors.instrument &&
              (() => {
                const selectedCount = formData.instruments.length;
                if (selectedCount > 0) {
                  return (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {selectedCount} instrumento
                      {selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
                    </p>
                  );
                }
                return null;
              })()}
          </div>
        )}

        {/* Create Custom Instrument */}
        {searchQuery && filteredInstruments.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Instrumento "{searchQuery}" não encontrado. Deseja adicioná-lo?
            </p>

            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowCustomForm(true);
                  setCustomInstrumentName(searchQuery);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Criar instrumento customizado
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="custom-instrument-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nome do instrumento
                  </label>
                  <input
                    id="custom-instrument-name"
                    type="text"
                    value={customInstrumentName}
                    onChange={e => setCustomInstrumentName(e.target.value)}
                    placeholder="Ex: Cavaquinho, Alaúde, Theremin..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Mínimo 3 caracteres, máximo 50</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCustomInstrument}
                    disabled={
                      isCreatingCustom ||
                      !customInstrumentName.trim() ||
                      customInstrumentName.trim().length < 3
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingCustom ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomInstrumentName('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Sobre você <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-2.5 pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={onChange}
              rows={4}
              maxLength={BIO_MAX_LENGTH}
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none bg-white text-gray-900 ${
                errors.bio ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Conte um pouco sobre sua experiência musical..."
            />
          </div>
          {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio}</p>}
          <p className="mt-1 text-xs text-gray-500 flex justify-between">
            <span>Mini-bio obrigatória</span>
            <span
              className={
                formData.bio.length > BIO_MAX_LENGTH
                  ? 'text-red-500 font-medium'
                  : formData.bio.trim()
                    ? 'text-green-600'
                    : ''
              }
            >
              {formData.bio.length}/{BIO_MAX_LENGTH}
            </span>
          </p>
          {!errors.bio && formData.bio.trim() && formData.bio.length <= BIO_MAX_LENGTH && (
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Bio preenchida
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicProfileStep;
