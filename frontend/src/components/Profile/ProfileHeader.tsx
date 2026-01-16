import React, { useState } from 'react';
import { MapPin, Star, Camera, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Musician } from '../../types';
import { formatInstrumentLabel } from '../../utils/formatting';

interface ProfileHeaderProps {
  musician: Musician;
  isOwnProfile: boolean;
  onUploadAvatar?: () => void;
  onUploadCover?: () => void;
  uploadingAvatar?: boolean;
  uploadingCover?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  musician,
  isOwnProfile,
  onUploadAvatar,
  onUploadCover,
  uploadingAvatar = false,
  uploadingCover = false,
}) => {
  const [showAvatarHint, setShowAvatarHint] = useState(false);
  const [showCoverHint, setShowCoverHint] = useState(false);

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl overflow-hidden">
        {musician.cover_image_url ? (
          <img
            src={musician.cover_image_url}
            alt="Capa"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 dark:to-black/40" />

        {isOwnProfile && (
          <div className="absolute top-4 right-4 relative flex items-center gap-2 group">
            <button
              onClick={onUploadCover}
              disabled={uploadingCover}
              className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-label="Alterar imagem de capa"
            >
              {uploadingCover ? (
                <Loader2 className="h-5 w-5 text-gray-700 dark:text-gray-200 animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCoverHint((prev) => !prev)}
              className="sm:hidden rounded-full border border-white/10 bg-gray-900/70 p-2 text-white shadow-lg"
              aria-label="Informacoes sobre o upload da capa"
            >
              <Info className="h-4 w-4" />
            </button>
            <span
              className={`pointer-events-none absolute right-0 mt-2 w-max max-w-[260px] rounded-lg border border-white/10 bg-gray-900/90 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md transition-opacity duration-200 ${
                showCoverHint ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              Capa: JPG, PNG ou WEBP • até 5MB
            </span>
          </div>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="relative px-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20"
        >
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-40 h-40 rounded-full border-4 border-white dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden ring-4 ring-blue-500/20 dark:ring-blue-400/20 hover:ring-blue-500/40 dark:hover:ring-blue-400/40 transition-all">
              {musician.avatar_url ? (
                <img
                  src={musician.avatar_url}
                  alt={musician.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-5xl font-bold text-gray-500 dark:text-gray-300">
                    {musician.full_name[0]}
                  </span>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <div className="relative flex flex-col items-start gap-2 group">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onUploadAvatar}
                    disabled={uploadingAvatar}
                    className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 p-2 rounded-full shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    aria-label="Alterar foto de perfil"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowAvatarHint((prev) => !prev)}
                    className="sm:hidden rounded-full border border-white/10 bg-gray-900/70 p-2 text-white shadow-lg"
                    aria-label="Informacoes sobre o upload do avatar"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <span
                  className={`pointer-events-none w-max max-w-[220px] rounded-lg border border-white/10 bg-gray-900/90 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md transition-opacity duration-200 ${
                    showAvatarHint ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
                  }`}
                >
                  Avatar: JPG, PNG ou WEBP • até 2MB
                </span>
              </div>
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 md:mb-4 md:pl-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {musician.full_name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-3">
              {musician.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{musician.city}{musician.state ? `, ${musician.state}` : ''}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {musician.instruments && musician.instruments.length > 0 ? (
                  musician.instruments.slice(0, 3).map((inst, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="px-3 py-1 backdrop-blur-sm bg-blue-500/20 dark:bg-blue-400/10 text-blue-800 dark:text-blue-300 rounded-full text-sm border border-blue-200/30 dark:border-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/20 transition-colors"
                    >
                      {formatInstrumentLabel(inst)}
                    </motion.span>
                  ))
                ) : musician.instrument && (
                  <span className="px-3 py-1 backdrop-blur-sm bg-blue-500/20 dark:bg-blue-400/10 text-blue-800 dark:text-blue-300 rounded-full text-sm border border-blue-200/30 dark:border-blue-400/20">
                    {formatInstrumentLabel(musician.instrument)}
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            {(musician.total_ratings ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 transition-all ${
                        i < Math.round(Number(musician.average_rating ?? 0))
                          ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Number(musician.average_rating ?? 0).toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  ({musician.total_ratings} {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3 md:mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-sky-500/50"
              >
                Seguir
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-all"
              >
                Mensagem
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-all"
              >
                Contratar
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileHeader;
