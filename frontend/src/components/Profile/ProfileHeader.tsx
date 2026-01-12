import React from 'react';
import { MapPin, Star, Camera } from 'lucide-react';
import type { Musician } from '../../types';

interface ProfileHeaderProps {
  musician: Musician;
  isOwnProfile: boolean;
  onUploadAvatar?: () => void;
  onUploadCover?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  musician,
  isOwnProfile,
  onUploadAvatar,
  onUploadCover
}) => {
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

        {isOwnProfile && (
          <button
            onClick={onUploadCover}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
          >
            <Camera className="h-5 w-5 text-gray-700" />
          </button>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="relative px-8 pb-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20">
          {/* Avatar */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
              {musician.avatar_url ? (
                <img
                  src={musician.avatar_url}
                  alt={musician.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-5xl font-bold text-gray-500">
                    {musician.full_name[0]}
                  </span>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <button
                onClick={onUploadAvatar}
                className="absolute bottom-2 right-2 bg-sky-600 hover:bg-sky-700 p-2 rounded-full shadow-lg transition-colors"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 md:mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {musician.full_name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
              {musician.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{musician.city}{musician.state ? `, ${musician.state}` : ''}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {musician.instruments && musician.instruments.length > 0 ? (
                  musician.instruments.slice(0, 3).map((inst, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {inst}
                    </span>
                  ))
                ) : musician.instrument && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {musician.instrument}
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
                      className={`h-5 w-5 ${
                        i < Math.round(Number(musician.average_rating ?? 0))
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">
                  {Number(musician.average_rating ?? 0).toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">
                  ({musician.total_ratings} {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3 md:mb-4">
              <button className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors">
                Seguir
              </button>
              <button className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors">
                Mensagem
              </button>
              <button className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors">
                Contratar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
