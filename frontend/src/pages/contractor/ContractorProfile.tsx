import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Mail, Phone, LogOut, Save, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import FormField from '../../components/form/FormField';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { BRAZILIAN_STATES } from '../../config/cities';
import { CONTRACTOR_ROUTES } from '../../routes/contractorRoutes';
import { showToast } from '../../utils/toast';

export default function ContractorProfile() {
  const { organization, logout, updateOrganization } = useCompanyAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState(organization?.name || '');
  const [phone, setPhone] = useState(organization?.phone || '');
  const [state, setState] = useState(organization?.state || '');
  const [city, setCity] = useState(organization?.city || '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        showToast.error('Nome é obrigatório');
        return;
      }

      setSaving(true);
      try {
        await updateOrganization({
          name: name.trim(),
          phone: phone.trim() || null,
          state: state || null,
          city: city.trim() || null,
        });
      } catch {
        // Error toast is handled by updateOrganization
      } finally {
        setSaving(false);
      }
    },
    [name, phone, state, city, updateOrganization]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate(CONTRACTOR_ROUTES.login);
  }, [logout, navigate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <ContractorLayout>
      <div className="page-stack">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Meu Perfil
          </h1>
          <p className="text-sm text-muted mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Header */}
        <motion.div
          className="hero-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18 }
          }
        >
          <div className="hero-animated" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {organization?.name}
              </h2>
              <div className="flex items-center gap-1 text-sm text-muted mt-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{organization?.email}</span>
              </div>
              {organization?.city && organization?.state && (
                <div className="flex items-center gap-1 text-sm text-muted mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {organization.city} - {organization.state}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          className="card-contrast max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18, delay: 0.05 }
          }
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Editar Perfil
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <FormField
              id="name"
              label="Nome / Empresa"
              required
              icon={<User className="w-4 h-4" />}
            >
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field pl-10"
                required
              />
            </FormField>

            <FormField id="phone" label="Telefone" icon={<Phone className="w-4 h-4" />}>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="input-field pl-10"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="state" label="Estado" icon={<MapPin className="w-4 h-4" />}>
                <select
                  id="state"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="input-field pl-10"
                >
                  <option value="">Selecione...</option>
                  {BRAZILIAN_STATES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="city" label="Cidade" icon={<MapPin className="w-4 h-4" />}>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Nome da cidade"
                  className="input-field pl-10"
                />
              </FormField>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 min-h-[44px]"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Account Section */}
        <motion.div
          className="card-contrast max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }
          }
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conta</h3>
          {organization?.created_at && (
            <div className="flex items-center gap-2 text-sm text-muted mb-4">
              <Calendar className="w-4 h-4" />
              Membro desde {formatDate(organization.created_at)}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </motion.div>
      </div>
    </ContractorLayout>
  );
}
