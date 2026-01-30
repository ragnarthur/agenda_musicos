// components/navigation/UserTypeToggle.tsx
// Componente para seleção entre experiência de músicos e empresas
import React from 'react';
import { motion } from 'framer-motion';
import { Music, Building } from 'lucide-react';

type UserType = 'musician' | 'company';

interface UserTypeToggleProps {
  selected: UserType;
  onChange: (type: UserType) => void;
  disabled?: boolean;
}

const UserTypeToggle: React.FC<UserTypeToggleProps> = ({
  selected,
  onChange,
  disabled = false,
}) => {
  const toggleOptions = [
    {
      type: 'musician' as UserType,
      label: 'Para Músicos',
      icon: <Music className="w-4 h-4" />,
      description: 'Organize sua carreira musical',
    },
    {
      type: 'company' as UserType,
      label: 'Para Empresas',
      icon: <Building className="w-4 h-4" />,
      description: 'Encontre e contrate músicos',
    },
  ];

  return (
    <motion.div
      className="flex justify-center mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20 max-w-full">
        <div className="flex gap-1">
          {toggleOptions.map(({ type, label, icon, description }) => (
            <motion.button
              key={type}
              onClick={() => !disabled && onChange(type)}
              disabled={disabled}
              className={`relative px-6 py-3 rounded-xl font-medium transition-all flex flex-col items-center gap-2 min-w-[120px] sm:min-w-[140px] ${
                selected === type
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2 }}
            >
              {icon}
              <span className="font-medium">{label}</span>
              <span className="text-xs opacity-80 hidden sm:block">{description}</span>

              {/* Indicador ativo */}
              {selected === type && (
                <motion.div
                  className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
                  layoutId="activeTypeIndicator"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default UserTypeToggle;
