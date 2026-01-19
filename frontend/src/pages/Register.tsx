// pages/Register.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { registrationService, type RegisterData } from '../services/api';
import { showToast } from '../utils/toast';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import ProgressIndicator from '../components/Registration/ProgressIndicator';
import StepNavigation from '../components/Registration/StepNavigation';
import AccountStep from '../components/Registration/AccountStep';
import PersonalInfoStep from '../components/Registration/PersonalInfoStep';
import MusicProfileStep from '../components/Registration/MusicProfileStep';

const BRAZILIAN_CITIES = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Brasília', state: 'DF' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Manaus', state: 'AM' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Recife', state: 'PE' },
  { city: 'Goiânia', state: 'GO' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Belém', state: 'PA' },
  { city: 'Guarulhos', state: 'SP' },
  { city: 'Campinas', state: 'SP' },
  { city: 'São Luís', state: 'MA' },
  { city: 'São Gonçalo', state: 'RJ' },
  { city: 'Maceió', state: 'AL' },
  { city: 'Duque de Caxias', state: 'RJ' },
  { city: 'Natal', state: 'RN' },
  { city: 'Teresina', state: 'PI' },
  { city: 'Campo Grande', state: 'MS' },
  { city: 'Nova Iguaçu', state: 'RJ' },
  { city: 'São Bernardo do Campo', state: 'SP' },
  { city: 'João Pessoa', state: 'PB' },
  { city: 'Santo André', state: 'SP' },
  { city: 'Osasco', state: 'SP' },
  { city: 'São José dos Campos', state: 'SP' },
  { city: 'Ribeirão Preto', state: 'SP' },
  { city: 'Uberlândia', state: 'MG' },
  { city: 'Sorocaba', state: 'SP' },
  { city: 'Contagem', state: 'MG' },
  { city: 'Aracaju', state: 'SE' },
  { city: 'Feira de Santana', state: 'BA' },
  { city: 'Cuiabá', state: 'MT' },
  { city: 'Joinville', state: 'SC' },
  { city: 'Juiz de Fora', state: 'MG' },
  { city: 'Londrina', state: 'PR' },
  { city: 'Aparecida de Goiânia', state: 'GO' },
  { city: 'Niterói', state: 'RJ' },
  { city: 'Caxias do Sul', state: 'RS' },
  { city: 'Florianópolis', state: 'SC' },
  { city: 'Vila Velha', state: 'ES' },
  { city: 'Santos', state: 'SP' },
  { city: 'Mauá', state: 'SP' },
  { city: 'Carapicuíba', state: 'SP' },
  { city: 'Olinda', state: 'PE' },
  { city: 'São João de Meriti', state: 'RJ' },
  { city: 'Campos dos Goytacazes', state: 'RJ' },
  { city: 'Betim', state: 'MG' },
  { city: 'Diadema', state: 'SP' },
  { city: 'Jundiaí', state: 'SP' },
  { city: 'Montes Claros', state: 'MG' },
  { city: 'Piracicaba', state: 'SP' },
  { city: 'Bauru', state: 'SP' },
  { city: 'Porto Velho', state: 'RO' },
  { city: 'Vitória', state: 'ES' },
  { city: 'Pelotas', state: 'RS' },
  { city: 'Canoas', state: 'RS' },
  { city: 'Monte Carmelo', state: 'MG' },
  { city: 'Santa Rita do Sapucaí', state: 'MG' },
  { city: 'Barra do Garças', state: 'MT' },
  { city: 'Santa Maria', state: 'RS' },
  { city: 'Ponta Grossa', state: 'PR' },
  { city: 'Foz do Iguaçu', state: 'PR' },
  { city: 'Praia Grande', state: 'SP' },
  { city: 'Governador Valadares', state: 'MG' },
].sort((a, b) => a.city.localeCompare(b.city));

const Register: React.FC = () => {
  const typedSubtitle = useTypewriterOnce(
    'Cadastre-se para gerenciar sua agenda e oportunidades profissionais',
    42
  );
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const stepNames = ['Segurança da Conta', 'Informações Pessoais', 'Perfil Musical'];
  const BIO_MAX_LENGTH = 240;

  // Form state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resending, setResending] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<Array<{ city: string; state: string }>>([]);

  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string; instrumentOther: string; instruments: string[]; isMultiInstrumentist: boolean; city: string; state: string; bio: string }>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    instagram: '',
    whatsapp: '',
    instrument: '',
    instruments: [],
    instrumentOther: '',
    isMultiInstrumentist: false,
    bio: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  // City autocomplete logic
  const handleCityChange = (value: string) => {
    setFormData(prev => ({ ...prev, city: value }));

    if (value.trim().length > 0) {
      const searchWords = value.toLowerCase().trim().split(/\s+/);
      const filtered = BRAZILIAN_CITIES.filter(cityObj => {
        const cityWords = cityObj.city.toLowerCase().split(/[\s-]+/);
        return searchWords.every(searchWord =>
          cityWords.some(cityWord => cityWord.includes(searchWord))
        );
      });
      setFilteredCities(filtered);
      setShowCitySuggestions(true);
    } else {
      setFilteredCities([]);
      setShowCitySuggestions(false);
    }
  };

  const selectCity = (cityObj: { city: string; state: string }) => {
    setFormData(prev => ({
      ...prev,
      city: cityObj.city,
      state: cityObj.state
    }));
    setShowCitySuggestions(false);
    setFilteredCities([]);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  type FieldChangeEvent =
    | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    | { target: { name: string; value: string } };

  const handleChange = (e: FieldChangeEvent) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
      setFormData(prev => ({ ...prev, whatsapp: formatWhatsApp(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear errors when user types
    if (errors[name] || name === 'instrument' || name === 'instrumentOther') {
      setErrors(prev => ({ ...prev, [name]: '', instrument: '' }));
    }
  };

  const toggleInstrument = (value: string) => {
    setFormData((prev) => {
      const exists = prev.instruments.includes(value);
      let instruments = exists
        ? prev.instruments.filter((inst) => inst !== value)
        : [...prev.instruments, value];

      if (!instruments.includes('other')) {
        instruments = instruments.filter((inst) => inst !== 'other');
      }

      return {
        ...prev,
        instruments,
        instrumentOther: instruments.includes('other') ? prev.instrumentOther : '',
      };
    });
    if (errors.instrument) {
      setErrors((prev) => ({ ...prev, instrument: '' }));
    }
  };

  const toggleMultiInstrumentist = (value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isMultiInstrumentist: value,
      instruments: value ? prev.instruments : [],
      instrumentOther: value ? prev.instrumentOther : '',
    }));
    if (errors.instrument) {
      setErrors((prev) => ({ ...prev, instrument: '' }));
    }
  };

  // Check if current step is valid (without setting errors)
  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      // Step 1: Account Security
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
      if (!formData.username || formData.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(formData.username)) return false;
      if (!formData.password || formData.password.length < 6) return false;
      if (formData.password !== formData.confirmPassword) return false;
      return true;
    } else if (step === 2) {
      // Step 2: Personal Info
      if (!formData.first_name) return false;
      if (!formData.city.trim()) return false;
      return true;
    } else if (step === 3) {
      // Step 3: Musical Profile
      const extraInstrument = formData.instrumentOther.trim();
      const bioTrimmed = formData.bio.trim();

      // Bio é obrigatória
      if (!bioTrimmed || bioTrimmed.length > BIO_MAX_LENGTH) return false;

      if (formData.isMultiInstrumentist) {
        const selectedInstruments = formData.instruments
          .filter((inst) => inst !== 'other')
          .map((inst) => inst.trim())
          .filter(Boolean);

        const includeOther = formData.instruments.includes('other');

        if (includeOther) {
          if (!extraInstrument || extraInstrument.length < 3) return false;
          selectedInstruments.push(extraInstrument);
        }

        if (!selectedInstruments.length) return false;
        if (selectedInstruments.some((inst) => inst.length > 50)) return false;
      } else {
        const primary =
          formData.instrument === 'other' ? extraInstrument : (formData.instrument || '').trim();

        if (!primary) return false;
        if (primary.length > 50) return false;
        if (formData.instrument === 'other' && primary.length < 3) return false;
      }
      return true;
    }
    return false;
  };

  // Validate individual steps (with error messages)
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Step 1: Account Security
      if (!formData.email) {
        newErrors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }

      if (!formData.username) {
        newErrors.username = 'Nome de usuário é obrigatório';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Mínimo de 3 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Apenas letras, números e underscore';
      }

      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Mínimo de 6 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não conferem';
      }
    } else if (step === 2) {
      // Step 2: Personal Info
      if (!formData.first_name) {
        newErrors.first_name = 'Nome é obrigatório';
      }

       const cityTrimmed = formData.city.trim();
       if (!cityTrimmed) {
         newErrors.city = 'Cidade é obrigatória';
       } else if (cityTrimmed.length > 60) {
         newErrors.city = 'Cidade deve ter no máximo 60 caracteres';
       }
       if (formData.state && formData.state.length > 3) {
         newErrors.state = 'Estado deve ter no máximo 3 caracteres';
       }
    } else if (step === 3) {
      // Step 3: Musical Profile
      const extraInstrument = formData.instrumentOther.trim();
      const bioTrimmed = formData.bio.trim();

      if (!bioTrimmed) {
        newErrors.bio = 'Mini-bio é obrigatória';
      } else if (bioTrimmed.length > BIO_MAX_LENGTH) {
        newErrors.bio = `Mini-bio deve ter no máximo ${BIO_MAX_LENGTH} caracteres`;
      }

      if (formData.isMultiInstrumentist) {
        const selectedInstruments = formData.instruments
          .filter((inst) => inst !== 'other')
          .map((inst) => inst.trim())
          .filter(Boolean);

        const includeOther = formData.instruments.includes('other');

        if (includeOther) {
          if (!extraInstrument) {
            newErrors.instrument = 'Informe o instrumento em "Outro"';
          } else if (extraInstrument.length < 3) {
            newErrors.instrument = 'Use pelo menos 3 caracteres para o instrumento adicional';
          } else {
            selectedInstruments.push(extraInstrument);
          }
        }

        if (!selectedInstruments.length && !newErrors.instrument) {
          newErrors.instrument = 'Selecione ou informe pelo menos um instrumento';
        } else if (selectedInstruments.some((inst) => inst.length > 50) && !newErrors.instrument) {
          newErrors.instrument = 'Instrumento deve ter no máximo 50 caracteres';
        }
      } else {
        const primary =
          formData.instrument === 'other' ? extraInstrument : (formData.instrument || '').trim();

        if (!primary) {
          newErrors.instrument = 'Instrumento é obrigatório';
        } else if (primary.length > 50) {
          newErrors.instrument = 'Instrumento deve ter no máximo 50 caracteres';
        } else if (formData.instrument === 'other' && primary.length < 3) {
          newErrors.instrument = 'Use pelo menos 3 caracteres para o instrumento';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      setErrors({});
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleFinalSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    setErrors({});

    try {
      const { confirmPassword, ...restFormData } = formData;
      void confirmPassword;
      const { instrumentOther, instruments, isMultiInstrumentist, ...data } = restFormData;
      const customInstrument = instrumentOther.trim();

      let allInstruments: string[] = [];
      if (isMultiInstrumentist) {
        allInstruments = instruments
          .filter((inst) => inst !== 'other')
          .map((inst) => inst.trim())
          .filter(Boolean);

        if (instruments.includes('other') && customInstrument.trim()) {
          allInstruments.push(customInstrument.trim());
        }
      } else {
        const primary =
          data.instrument === 'other' ? customInstrument : (data.instrument || '').trim();
        if (primary) {
          allInstruments = [primary];
        }
      }

      const primaryInstrument = allInstruments[0] || '';
      const sanitizedBio = formData.bio.trim().slice(0, BIO_MAX_LENGTH);

      const payload = {
        ...data,
        instrument: primaryInstrument,
        instruments: allInstruments,
        bio: sanitizedBio,
      };

      const response = await registrationService.register(payload);
      setRegisteredEmail(response.email);
      setSuccess(true);
      showToast.success('Cadastro iniciado! Verifique seu email.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string | string[]> } };
      if (error.response?.data) {
        const apiErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(error.response.data)) {
          apiErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(apiErrors);
        // If there are errors in earlier steps, navigate back to them
        if (apiErrors.email || apiErrors.username || apiErrors.password || apiErrors.confirmPassword) {
          setCurrentStep(1);
        } else if (apiErrors.first_name) {
          setCurrentStep(2);
        }
      } else {
        showToast.error('Erro ao fazer cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Render appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AccountStep
            formData={{
              email: formData.email,
              username: formData.username,
              password: formData.password,
              confirmPassword: formData.confirmPassword,
            }}
            onChange={handleChange}
            errors={errors}
          />
        );

      case 2:
        return (
          <PersonalInfoStep
            formData={{
              first_name: formData.first_name,
              last_name: formData.last_name || '',
              instagram: formData.instagram || '',
              whatsapp: formData.whatsapp || '',
              city: formData.city,
              state: formData.state,
            }}
            onChange={handleChange}
            errors={errors}
            filteredCities={filteredCities}
            showCitySuggestions={showCitySuggestions}
            handleCityChange={handleCityChange}
            selectCity={selectCity}
            setShowCitySuggestions={setShowCitySuggestions}
          />
        );

      case 3:
        return (
          <MusicProfileStep
            formData={{
              isMultiInstrumentist: formData.isMultiInstrumentist,
              instrument: formData.instrument || '',
              instruments: formData.instruments,
              instrumentOther: formData.instrumentOther,
              bio: formData.bio ?? '',
            }}
            onChange={handleChange}
            errors={errors}
            toggleMultiInstrumentist={toggleMultiInstrumentist}
            toggleInstrument={toggleInstrument}
          />
        );

      default:
        return null;
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 dark:from-slate-950 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifique seu email!</h2>
            <p className="text-gray-600 mb-6">
              Enviamos um link de verificação para:
              <br />
              <strong className="text-gray-900">{registeredEmail}</strong>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-800 font-medium">Como receber o código:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                <li>O email é enviado por <strong>catsinthegarden01@gmail.com</strong>.</li>
                <li>Procure pelo código/link na caixa de entrada e no spam.</li>
                <li>Clique no link para confirmar e seguir para o pagamento.</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Clique no link do email para confirmar sua conta e continuar para o pagamento.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setResending(true);
                try {
                  await registrationService.resendVerification(registeredEmail);
                  showToast.success('Email reenviado! Verifique sua caixa de entrada.');
                } catch {
                  showToast.error('Não foi possível reenviar agora. Tente novamente.');
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
              className="w-full btn-secondary mb-3 disabled:opacity-50"
            >
              {resending ? 'Reenviando...' : 'Reenviar email de verificação'}
            </button>
            <div className="space-y-3">
              <Link to="/login" className="block w-full btn-primary text-center">
                Ir para Login
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setCurrentStep(1);
                  setFormData({
                    email: '',
                    username: '',
                    password: '',
                    confirmPassword: '',
                    first_name: '',
                    last_name: '',
                    instrument: '',
                    instruments: [],
                    instrumentOther: '',
                    isMultiInstrumentist: false,
                    bio: '',
                    city: '',
                    state: '',
                  });
                }}
                className="block w-full btn-secondary text-center"
              >
                Fazer novo cadastro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main registration form (multi-step)
  return (
    <FullscreenBackground
      className="px-4 py-8"
      contentClassName="flex items-center justify-center"
      enableBlueWaves
    >
      {/* Mantive as partículas no cadastro pra ficar vivo, mas com modo desempenho automático */}
      <div className="max-w-2xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28">
              <OwlMascot className="h-24 w-24 sm:h-28 sm:w-28" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
          <p className="text-gray-300 min-h-[1.6em]">
            {typedSubtitle}
            <span className="ml-1 inline-block h-[1em] w-[2px] bg-gray-300/80 align-middle animate-pulse" />
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepNames={stepNames}
          />
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Step Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {stepNames[currentStep - 1]}
          </h2>

          {/* Current Step Content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <StepNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleFinalSubmit}
            isValid={isStepValid(currentStep)}
            isLoading={loading}
          />
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Já tem conta?{' '}
            <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">
              Entrar
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-sky-400">DXM Tech</span>
        </div>
      </div>
    </FullscreenBackground>
  );
};

export default Register;

const useTypewriterOnce = (text: string, speed = 45) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return displayText;
};
