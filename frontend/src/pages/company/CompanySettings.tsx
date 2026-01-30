// pages/company/CompanySettings.tsx
// Página de configurações da empresa
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, Globe, MapPin, Save, AlertCircle } from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';
import type { Organization } from '../../services/publicApi';
import Loading from '../../components/common/Loading';
import { formatPhone } from '../../utils/formatting';

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const CompanySettings: React.FC = () => {
  const { organization, updateOrganization, loading: authLoading } = useCompanyAuth();

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    description: '',
    city: '',
    state: '',
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Inicializar com dados da organização
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        contact_name: organization.contact_name || '',
        contact_email: organization.contact_email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        description: organization.description || '',
        city: organization.city || '',
        state: organization.state || '',
      });
    }
  }, [organization]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      // Filtrar apenas campos que foram alterados
      const updates: Partial<Organization> = {};
      Object.keys(formData).forEach(key => {
        const formKey = key as keyof typeof formData;
        const orgKey = key as keyof Organization;
        if (formData[formKey] !== (organization?.[orgKey] || '')) {
          updates[orgKey] = formData[formKey] as any;
        }
      });

      await updateOrganization(updates);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      // O toast já é mostrado pelo updateOrganization
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        contact_name: organization.contact_name || '',
        contact_email: organization.contact_email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        description: organization.description || '',
        city: organization.city || '',
        state: organization.state || '',
      });
      setHasChanges(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
          <p className="text-gray-600">Gerencie as informações da sua empresa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Perfil da Empresa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Perfil da Empresa</h2>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Nome da Empresa */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Casa de Shows XYZ"
                />
              </div>

              {/* Descrição */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Conte um pouco sobre sua empresa, tipo de eventos que organiza, etc."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Esta descrição será exibida no seu perfil para os músicos.
                </p>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="inline h-4 w-4 mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://www.suaempresa.com.br"
                />
              </div>

              {/* Localização */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Cidade *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Monte Carmelo"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Informações de Contato */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Informações de Contato</h2>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Nome do Responsável */}
              <div>
                <label
                  htmlFor="contact_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  id="contact_name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: João Silva"
                />
              </div>

              {/* Email de Contato */}
              <div>
                <label
                  htmlFor="contact_email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email de Contato
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="contato@suaempresa.com.br"
                />
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="(34) 99999-9999"
                />
              </div>
            </div>
          </motion.div>

          {/* Aviso de mudanças não salvas */}
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Você tem alterações não salvas
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Não esqueça de salvar suas mudanças antes de sair da página.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!hasChanges || saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasChanges || saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySettings;
