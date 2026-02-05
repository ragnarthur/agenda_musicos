import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Star,
  Calendar,
  DollarSign,
  Package,
  MessageCircle,
  Instagram,
  Phone,
  Award,
  Music,
  Settings,
  UserPlus,
  FileText,
  Disc3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import ProfileHeader from '../components/Profile/ProfileHeader';
import StatCard from '../components/Profile/StatCard';
import ReviewCard from '../components/Profile/ReviewCard';
import ImageCropModal from '../components/modals/ImageCropModal';
import { musicianService } from '../services/api';
import { connectionService } from '../services/connectionService';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, showToast } from '../utils/toast';
import { logError } from '../utils/logger';
import { formatInstrumentLabel, formatCurrency, getMusicianInstruments } from '../utils/formatting';
import { getGenreLabel } from '../config/genres';
import type { Musician, MusicianBadge } from '../types';

interface Connection {
  id: number;
  full_name: string;
  instrument?: string | null;
  avatar?: string | null;
}

interface Review {
  id: number;
  rated_by_name: string;
  rated_by_avatar: string | null;
  rating: number;
  comment?: string;
  time_ago: string;
}

interface MusicianStats {
  total_events: number;
  events_as_leader: number;
  events_as_member: number;
}

interface ConnectionStatus {
  is_connected: boolean;
  connection_id: number | null;
  connection_type: string | null;
}

const MusicianProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsTotal, setConnectionsTotal] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [badges, setBadges] = useState<MusicianBadge[]>([]);
  const [stats, setStats] = useState<MusicianStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingInProgress, setConnectingInProgress] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'cover'>('avatar');
  const [isCropOpen, setIsCropOpen] = useState(false);
  const { user, refreshUser } = useAuth();

  const isOwnProfile = Boolean(user && (user.id === Number(id) || user.user?.id === Number(id)));

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch principal data
      const musicianData = await musicianService.getById(Number(id));
      setMusician(musicianData);

      // Fetch dados secundários em paralelo (com fallbacks)
      const [connectionsRes, reviewsRes, badgesRes, statsRes] = await Promise.allSettled([
        musicianService.getConnections(Number(id), { type: 'follow', limit: 6 }),
        musicianService.getReviews(Number(id)),
        musicianService.getBadges(Number(id)),
        musicianService.getStats(Number(id)),
      ]);

      if (connectionsRes.status === 'fulfilled') {
        setConnections(connectionsRes.value.connections || []);
        setConnectionsTotal(
          connectionsRes.value.total ?? connectionsRes.value.connections?.length ?? 0
        );
      }
      if (reviewsRes.status === 'fulfilled') {
        setReviews(reviewsRes.value || []);
      }
      if (badgesRes.status === 'fulfilled') {
        setBadges(badgesRes.value || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      // Verificar status de conexão (apenas se não for o próprio perfil)
      if (!isOwnProfile && user) {
        try {
          const status = await musicianService.checkConnection(Number(id));
          setConnectionStatus(status);
        } catch {
          setConnectionStatus({ is_connected: false, connection_id: null, connection_type: null });
        }
      }
    } catch (err) {
      logError('Error fetching data:', err);
      showToast.apiError(err);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }, [id, isOwnProfile, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async () => {
    if (!musician || connectingInProgress) return;

    setConnectingInProgress(true);
    try {
      if (connectionStatus?.is_connected && connectionStatus.connection_id) {
        // Desconectar
        await connectionService.delete(connectionStatus.connection_id);
        setConnectionStatus({ is_connected: false, connection_id: null, connection_type: null });
        showToast.success('Conexão removida');
      } else {
        // Conectar
        const newConnection = await connectionService.create({
          target_id: musician.id,
          connection_type: 'follow',
        });
        setConnectionStatus({
          is_connected: true,
          connection_id: newConnection.id,
          connection_type: 'follow',
        });
        showToast.success(`Você agora segue ${musician.full_name}`);
      }
    } catch (err) {
      logError('Erro ao conectar:', err);
      showToast.apiError(err);
    } finally {
      setConnectingInProgress(false);
    }
  };

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
      error: err => getErrorMessage(err, 'Não foi possível atualizar a foto de perfil.'),
    });

    try {
      const response = await uploadPromise;
      setMusician(prev => (prev ? { ...prev, avatar_url: response.avatar } : prev));
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
      error: err => getErrorMessage(err, 'Não foi possível atualizar a imagem de capa.'),
    });

    try {
      const response = await uploadPromise;
      setMusician(prev => (prev ? { ...prev, cover_image_url: response.cover_image } : prev));
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
    if (file.type && !file.type.startsWith('image/')) {
      showToast.error('Envie uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }
    openCropper(file, 'avatar');
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
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
        <div className="page-shell py-6 sm:py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error || 'Músico não encontrado'}
          </div>
        </div>
      </Layout>
    );
  }

  const totalEvents = stats?.total_events ?? 0;

  return (
    <Layout>
      <div className="min-h-[100svh] bg-transparent transition-colors duration-200">
        <div className="page-shell py-6 sm:py-8">
          {/* Back Button + Edit Profile */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/musicos"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar para músicos
            </Link>

            {isOwnProfile && (
              <Link
                to="/configuracoes/financeiro"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Editar Perfil
              </Link>
            )}
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-8 overflow-hidden transition-colors duration-200">
            <ProfileHeader
              musician={musician}
              isOwnProfile={isOwnProfile}
              connectionStatus={connectionStatus}
              onConnect={handleConnect}
              connectingInProgress={connectingInProgress}
              onAvatarChange={isOwnProfile ? handleAvatarUpload : undefined}
              onCoverChange={isOwnProfile ? handleCoverUpload : undefined}
              uploadingAvatar={uploadingAvatar}
              uploadingCover={uploadingCover}
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              value={formatCurrency(musician.base_fee)}
              label="Cachê Base"
              color="purple"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sobre</h2>
                </div>
                {musician.bio ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {musician.bio}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">
                    {isOwnProfile
                      ? 'Adicione uma bio para que outros músicos conheçam você melhor.'
                      : 'Este músico ainda não adicionou uma bio.'}
                  </p>
                )}
              </div>

              {/* Badges Section */}
              {(badges.length > 0 || isOwnProfile) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Conquistas</h2>
                  </div>
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {badges.map(badge => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700/50 rounded-full"
                        >
                          <span className="text-xl">{badge.icon || '🏆'}</span>
                          <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                              {badge.name}
                            </p>
                            {badge.description && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {badge.description}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">
                      {isOwnProfile
                        ? 'Continue usando a plataforma para desbloquear conquistas!'
                        : 'Nenhuma conquista ainda.'}
                    </p>
                  )}
                  {isOwnProfile && (
                    <Link
                      to="/conexoes"
                      className="inline-flex items-center gap-1 mt-4 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Ver todas as conquistas disponíveis →
                    </Link>
                  )}
                </div>
              )}

              {/* Equipment Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Equipamentos e Serviços
                  </h2>
                </div>
                {musician.equipment_items && musician.equipment_items.length > 0 ? (
                  <ul className="space-y-3">
                    {musician.equipment_items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">
                    {isOwnProfile
                      ? 'Adicione equipamentos e serviços extras que você oferece.'
                      : 'Nenhum equipamento ou serviço adicional.'}
                  </p>
                )}
                {isOwnProfile && (
                  <Link
                    to="/configuracoes/financeiro"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Gerenciar equipamentos →
                  </Link>
                )}
              </div>

              {/* Reviews Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Avaliações {reviews.length > 0 && `(${reviews.length})`}
                  </h2>
                </div>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic">
                    {isOwnProfile
                      ? 'Suas avaliações aparecerão aqui após participar de eventos.'
                      : 'Este músico ainda não recebeu avaliações.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-6">
              {/* Instruments Section */}
              {getMusicianInstruments(musician).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Music className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Instrumentos
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getMusicianInstruments(musician).map((inst, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm border border-indigo-200 dark:border-indigo-700/50"
                      >
                        {formatInstrumentLabel(inst)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Musical Genres Section */}
              {musician.musical_genres && musician.musical_genres.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Disc3 className="h-5 w-5 text-purple-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Gêneros Musicais
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {musician.musical_genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm border border-purple-200 dark:border-purple-700/50"
                      >
                        {getGenreLabel(genre)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contato</h2>
                <div className="space-y-3">
                  {musician.phone ? (
                    <a
                      href={`tel:${musician.phone}`}
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>{musician.phone}</span>
                    </a>
                  ) : null}

                  {musician.whatsapp ? (
                    <a
                      href={`https://wa.me/55${musician.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span>WhatsApp</span>
                    </a>
                  ) : null}

                  {musician.instagram ? (
                    <a
                      href={`https://instagram.com/${musician.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <span>@{musician.instagram.replace('@', '')}</span>
                    </a>
                  ) : null}

                  {!musician.phone && !musician.whatsapp && !musician.instagram && (
                    <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                      {isOwnProfile
                        ? 'Adicione informações de contato no seu perfil.'
                        : 'Informações de contato não disponíveis.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Connections Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Conexões</h2>
                  {connectionsTotal > 6 && (
                    <Link
                      to="/conexoes"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver todas
                    </Link>
                  )}
                </div>

                {connections.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {connections.slice(0, 6).map(conn => (
                      <Link
                        key={conn.id}
                        to={`/musicos/${conn.id}`}
                        className="text-center hover:scale-105 transition-transform"
                      >
                        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-2 overflow-hidden ring-2 ring-blue-500/10 dark:ring-blue-400/10">
                          {conn.avatar ? (
                            <img
                              src={conn.avatar}
                              alt={conn.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                              {conn.full_name[0]}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {conn.full_name.split(' ')[0]}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                    {isOwnProfile
                      ? 'Conecte-se com outros músicos da plataforma!'
                      : 'Nenhuma conexão ainda.'}
                  </p>
                )}

                {isOwnProfile && (
                  <Link
                    to="/musicos"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <UserPlus className="h-4 w-4" />
                    Encontrar músicos
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MusicianProfile;
