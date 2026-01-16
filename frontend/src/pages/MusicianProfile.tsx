import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Star, Calendar, DollarSign, Package, MessageCircle, Phone } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import ProfileHeader from '../components/Profile/ProfileHeader';
import StatCard from '../components/Profile/StatCard';
import ReviewCard from '../components/Profile/ReviewCard';
import ImageCropModal from '../components/modals/ImageCropModal';
import { musicianService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toast';
import type { Musician } from '../types';

interface Connection {
  id: number;
  full_name: string;
  instrument: string;
  avatar: string | null;
}

interface Review {
  id: number;
  rated_by_name: string;
  rated_by_avatar: string | null;
  rating: number;
  comment: string;
  time_ago: string;
}

const MusicianProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'cover'>('avatar');
  const [isCropOpen, setIsCropOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [musicianData, connectionsResponse, reviewsResponse] = await Promise.all([
          musicianService.getById(Number(id)),
          fetch(`/api/musicians/${id}/connections/`).then(r => r.json()),
          fetch(`/api/musicians/${id}/reviews/`).then(r => r.json()),
        ]);

        setMusician(musicianData);
        setConnections(connectionsResponse.connections || []);
        setReviews(reviewsResponse || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error || !musician) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error || 'Músico não encontrado'}
          </div>
        </div>
      </Layout>
    );
  }

  // Mock data for events (replace with real data later)
  const totalEvents = 42;
  const isOwnProfile = Boolean(user && (user.id === musician.id || user.user?.id === musician.user?.id));

  const openCropper = (file: File, target: 'avatar' | 'cover') => {
    setCropFile(file);
    setCropTarget(target);
    setIsCropOpen(true);
  };

  const closeCropper = () => {
    setIsCropOpen(false);
    setCropFile(null);
  };

  const uploadAvatarFile = async (file: File) => {
    setUploadingAvatar(true);
    const uploadPromise = musicianService.uploadAvatar(file);
    showToast.promise(uploadPromise, {
      loading: 'Atualizando foto de perfil...',
      success: 'Foto de perfil atualizada!',
      error: 'Não foi possível atualizar a foto de perfil.',
    });

    try {
      const response = await uploadPromise;
      setMusician((prev) => (prev ? { ...prev, avatar_url: response.avatar } : prev));
      await refreshUser();
    } catch {
      // Erro já tratado pelo toast
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadCoverFile = async (file: File) => {
    setUploadingCover(true);
    const uploadPromise = musicianService.uploadCover(file);
    showToast.promise(uploadPromise, {
      loading: 'Atualizando imagem de capa...',
      success: 'Imagem de capa atualizada!',
      error: 'Não foi possível atualizar a imagem de capa.',
    });

    try {
      const response = await uploadPromise;
      setMusician((prev) => (prev ? { ...prev, cover_image_url: response.cover_image } : prev));
      await refreshUser();
    } catch {
      // Erro já tratado pelo toast
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast.error('Envie uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }
    openCropper(file, 'avatar');
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast.error('Envie uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }
    openCropper(file, 'cover');
  };

  const handleCropConfirm = async (file: File) => {
    setIsCropOpen(false);
    setCropFile(null);
    if (cropTarget === 'avatar') {
      await uploadAvatarFile(file);
    } else {
      await uploadCoverFile(file);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-transparent transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/musicos"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar para músicos
          </Link>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-8 overflow-hidden transition-colors duration-200">
            <ProfileHeader
              musician={musician}
              isOwnProfile={isOwnProfile}
              onUploadAvatar={isOwnProfile ? () => avatarInputRef.current?.click() : undefined}
              onUploadCover={isOwnProfile ? () => coverInputRef.current?.click() : undefined}
              uploadingAvatar={uploadingAvatar}
              uploadingCover={uploadingCover}
            />
            {isOwnProfile && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
          {isOwnProfile && (
            <ImageCropModal
              isOpen={isCropOpen}
              file={cropFile}
              target={cropTarget}
              onClose={closeCropper}
              onConfirm={handleCropConfirm}
            />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Users className="h-6 w-6 text-white" />}
              value={connections.length || 0}
              label="Conexões"
              color="blue"
            />
            <StatCard
              icon={<Star className="h-6 w-6 text-white" />}
              value={Number(musician.average_rating ?? 0).toFixed(1)}
              label={`${musician.total_ratings || 0} Avaliações`}
              color="orange"
            />
            <StatCard
              icon={<Calendar className="h-6 w-6 text-white" />}
              value={totalEvents}
              label="Eventos"
              color="green"
            />
            <StatCard
              icon={<DollarSign className="h-6 w-6 text-white" />}
              value={musician.base_fee ? `R$ ${musician.base_fee}` : '-'}
              label="Cachê Base"
              color="purple"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              {musician.bio && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sobre</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{musician.bio}</p>
                </div>
              )}

              {/* Equipment Section */}
              {musician.equipment_items && musician.equipment_items.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Equipamentos e Serviços</h2>
                  </div>
                  <ul className="space-y-3">
                    {musician.equipment_items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">R$ {item.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviews Section */}
              {reviews.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Avaliações ({reviews.length})</h2>
                  </div>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-8">
              {/* Contact Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contato</h2>
                <div className="space-y-3">
                  {musician.phone && (
                    <a
                      href={`tel:${musician.phone}`}
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>{musician.phone}</span>
                    </a>
                  )}
                  {musician.whatsapp && (
                    <a
                      href={`https://wa.me/55${musician.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        💬
                      </div>
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {musician.instagram && (
                    <a
                      href={`https://instagram.com/${musician.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                        📷
                      </div>
                      <span>@{musician.instagram.replace('@', '')}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Connections Section */}
              {connections.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Conexões</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {connections.map((conn) => (
                      <Link key={conn.id} to={`/musicos/${conn.id}`} className="text-center hover:scale-105 transition-transform">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-2 overflow-hidden ring-2 ring-blue-500/10 dark:ring-blue-400/10">
                          {conn.avatar ? (
                            <img src={conn.avatar} alt={conn.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                              {conn.full_name[0]}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{conn.full_name}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MusicianProfile;
