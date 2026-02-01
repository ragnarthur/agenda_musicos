import React from 'react';
import { motion } from 'framer-motion';
import AnimatedBackground from '../Layout/AnimatedBackground';
import type { LucideIcon } from 'lucide-react';

interface AdminHeroProps {
  title: string;
  description: string;
  stats?: { label: string; value: number; icon: LucideIcon }[];
}

export const AdminHero: React.FC<AdminHeroProps> = ({ title, description, stats }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="admin-hero mb-6 py-8 md:py-12 px-4 md:px-6"
    >
      <div className="relative z-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold text-white mb-2"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-indigo-100 text-lg"
        >
          {description}
        </motion.p>

        {stats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 200 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-white" />
                    <span className="text-sm text-indigo-100">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatedBackground enableBlueWaves={false} enableParticles={true} />
    </motion.div>
  );
};
