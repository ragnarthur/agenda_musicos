// components/Registration/MusicProfileStep.tsx
import React from 'react';
import { Music, FileText } from 'lucide-react';

const BASE_INSTRUMENTS = [
  { value: 'vocal', label: 'Vocal' },
  { value: 'guitar', label: 'Guitarra' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'piano', label: 'Piano' },
  { value: 'synth', label: 'Sintetizador' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'cajon', label: 'Cajón' },
  { value: 'violin', label: 'Violino' },
  { value: 'viola', label: 'Viola' },
  { value: 'cello', label: 'Violoncelo' },
  { value: 'double_bass', label: 'Contrabaixo acústico' },
  { value: 'saxophone', label: 'Saxofone' },
  { value: 'trumpet', label: 'Trompete' },
  { value: 'trombone', label: 'Trombone' },
  { value: 'flute', label: 'Flauta' },
  { value: 'clarinet', label: 'Clarinete' },
  { value: 'harmonica', label: 'Gaita' },
  { value: 'ukulele', label: 'Ukulele' },
  { value: 'banjo', label: 'Banjo' },
  { value: 'mandolin', label: 'Bandolim' },
  { value: 'dj', label: 'DJ' },
  { value: 'producer', label: 'Produtor(a)' },
];

const INSTRUMENTS = [...BASE_INSTRUMENTS, { value: 'other', label: 'Outro (digite)' }];

const SELECT_INSTRUMENT_OPTIONS = [
  { value: '', label: 'Selecione um instrumento principal' },
  ...INSTRUMENTS,
];

interface MusicProfileStepProps {
  formData: {
    isMultiInstrumentist: boolean;
    instrument: string;
    instruments: string[];
    instrumentOther: string;
    bio: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
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

        {/* Instruments Selection */}
        {!formData.isMultiInstrumentist ? (
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
                  bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                  ${errors.instrument ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
                `}
              >
                {SELECT_INSTRUMENT_OPTIONS.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Instrument Input */}
            {formData.instrument === 'other' && (
              <div className="mt-3">
                <label htmlFor="instrumentOther" className="block text-sm font-medium text-gray-700 mb-1">
                  Qual instrumento?
                </label>
                <input
                  id="instrumentOther"
                  name="instrumentOther"
                  type="text"
                  value={formData.instrumentOther}
                  onChange={onChange}
                  className={`
                    w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                    bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                    ${errors.instrument ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
                  `}
                  placeholder="Ex.: Violino, Trompete, Flauta..."
                />
              </div>
            )}

            {errors.instrument && <p className="mt-1 text-sm text-red-600">{errors.instrument}</p>}
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
              {INSTRUMENTS.map((inst) => {
                const checked = formData.instruments.includes(inst.value);
                return (
                  <label
                    key={inst.value}
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
                      onChange={() => toggleInstrument(inst.value)}
                      className="sr-only"
                    />
                    <span
                      className={`
                        h-4 w-4 rounded border flex items-center justify-center text-[10px]
                        ${
                          checked
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'border-gray-300 text-transparent'
                        }
                      `}
                    >
                      ✓
                    </span>
                    <span className="text-sm font-medium">{inst.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom Instrument Input for Multi */}
            {formData.instruments.includes('other') && (
              <div className="mb-4">
                <label htmlFor="instrumentOther" className="block text-sm font-medium text-gray-700 mb-1">
                  Outro instrumento
                </label>
                <input
                  id="instrumentOther"
                  name="instrumentOther"
                  type="text"
                  value={formData.instrumentOther}
                  onChange={onChange}
                  className={`
                    w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                    ${errors.instrument ? 'border-red-500' : 'border-gray-300'}
                  `}
                  placeholder="Ex.: Violino, Trompete, Flauta..."
                />
              </div>
            )}

            {errors.instrument && <p className="mt-1 text-sm text-red-600">{errors.instrument}</p>}
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
              maxLength={240}
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none ${
                errors.bio ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Conte um pouco sobre sua experiência musical (até 240 caracteres)..."
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Mini-bio obrigatória. Máximo de 240 caracteres.
          </p>
          {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio}</p>}
        </div>
      </div>
    </div>
  );
};

export default MusicProfileStep;
