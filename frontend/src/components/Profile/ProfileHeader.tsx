import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  Star,
  Camera,
  Loader2,
  Info,
  UserPlus,
  UserCheck,
  MessageCircle,
  Briefcase,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Musician } from '../../types';
import { formatInstrumentLabel, getMusicianInstruments } from '../../utils/formatting';

interface ConnectionStatus {
  is_connected: boolean;
  connection_id: number | null;
  connection_type: string | null;
}

interface ProfileHeaderProps {
  musician: Musician;
  isOwnProfile: boolean;
  connectionStatus?: ConnectionStatus | null;
  onConnect?: () => void;
  connectingInProgress?: boolean;
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingAvatar?: boolean;
  uploadingCover?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  musician,
  isOwnProfile,
  connectionStatus,
  onConnect,
  connectingInProgress = false,
  onAvatarChange,
  onCoverChange,
  uploadingAvatar = false,
  uploadingCover = false,
}) => {
  const [showAvatarHint, setShowAvatarHint] = useState(false);
  const [showCoverHint, setShowCoverHint] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  const isConnected = connectionStatus?.is_connected ?? false;

  const handleWhatsAppClick = () => {
    if (musician.whatsapp) {
      const phone = musician.whatsapp.replace(/\D/g, '');
      window.open(
        `https://wa.me/55${phone}?text=Olá ${musician.full_name}, vi seu perfil na Rede Musical!`,
        '_blank'
      );
    }
  };

  useEffect(() => {
    if (!expandedImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  useEffect(() => {
    if (!expandedImage) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [expandedImage]);

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative min-h-[200px] sm:min-h-[280px] md:h-[320px] bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl overflow-hidden">
        {musician.cover_image_url ? (
          <img
            src={musician.cover_image_url}
            alt="Capa"
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setExpandedImage({ src: musician.cover_image_url!, alt: 'Capa' })}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 dark:to-black/50 pointer-events-none" />

        {isOwnProfile && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 group">
            <label
              htmlFor="cover-upload-input"
              className={`backdrop-blur-md bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-2.5 sm:p-2 rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer ${
                uploadingCover ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              aria-label="Alterar imagem de capa"
            >
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-200 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-200" />
              )}
            </label>
            <input
              id="cover-upload-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/*"
              onChange={onCoverChange}
              disabled={uploadingCover}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => setShowCoverHint(prev => !prev)}
              className="sm:hidden rounded-full border border-white/10 bg-gray-900/70 p-1.5 text-white shadow-lg"
              aria-label="Informacoes sobre o upload da capa"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <span
              className={`pointer-events-none absolute right-0 top-11 z-30 w-max max-w-[220px] rounded-lg border border-white/10 bg-gray-900/90 px-2.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-md transition-opacity duration-200 ${
                showCoverHint ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              Capa: JPG, PNG ou WEBP • até 5MB
            </span>
          </div>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="relative px-4 sm:px-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-16 md:-mt-20"
        >
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden ring-4 ring-blue-500/20 dark:ring-blue-400/20 hover:ring-blue-500/40 dark:hover:ring-blue-400/40 transition-all">
              {musician.avatar_url ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={musician.avatar_url}
                    alt={musician.full_name}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() =>
                      setExpandedImage({ src: musician.avatar_url!, alt: musician.full_name })
                    }
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-500 dark:text-gray-300">
                    {musician.full_name[0]}
                  </span>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <div className="relative flex flex-col items-start gap-2 group">
                <div className="flex items-center gap-2">
                  <motion.label
                    htmlFor="avatar-upload-input"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 p-2.5 sm:p-2 rounded-full shadow-lg transition-colors cursor-pointer ${
                      uploadingAvatar ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    aria-label="Alterar foto de perfil"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    )}
                  </motion.label>
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                    onChange={onAvatarChange}
                    disabled={uploadingAvatar}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAvatarHint(prev => !prev)}
                    className="sm:hidden rounded-full border border-white/10 bg-gray-900/70 p-1.5 text-white shadow-lg"
                    aria-label="Informacoes sobre o upload do avatar"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span
                  className={`pointer-events-none absolute left-0 -top-9 z-30 w-max max-w-[200px] rounded-lg border border-white/10 bg-gray-900/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-md transition-opacity duration-200 ${
                    showAvatarHint ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
                  }`}
                >
                  Avatar: JPG, PNG ou WEBP • até 2MB
                </span>
              </div>
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 md:mb-4 md:pl-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {musician.full_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-400 mb-3">
              {musician.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm sm:text-base">
                    {musician.city}
                    {musician.state ? `, ${musician.state}` : ''}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {getMusicianInstruments(musician).slice(0, 3).map((inst, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="px-2 sm:px-3 py-1 backdrop-blur-sm bg-blue-500/20 dark:bg-blue-400/10 text-blue-800 dark:text-blue-300 rounded-full text-xs sm:text-sm border border-blue-200/30 dark:border-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/20 transition-colors"
                  >
                    {formatInstrumentLabel(inst)}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Rating */}
            {(musician.total_ratings ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 sm:h-5 sm:w-5 transition-all ${
                        i < Math.round(Number(musician.average_rating ?? 0))
                          ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {Number(musician.average_rating ?? 0).toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  ({musician.total_ratings}{' '}
                  {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex flex-wrap gap-2 sm:gap-3 md:mb-4 w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onConnect}
                disabled={connectingInProgress}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg font-medium transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed ${
                  isConnected
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white hover:shadow-green-500/50'
                    : 'bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white hover:shadow-sky-500/50'
                }`}
              >
                {connectingInProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isConnected ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Seguindo</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Seguir</span>
                  </>
                )}
              </motion.button>

              {musician.whatsapp && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWhatsAppClick}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-all"
                title="Em breve"
              >
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Convidar</span>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>

      {expandedImage && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setExpandedImage(null)}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                aria-label="Fechar imagem"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={expandedImage.src}
                alt={expandedImage.alt}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                onClick={event => event.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default ProfileHeader;
