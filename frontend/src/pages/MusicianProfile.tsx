import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Star, Calendar, DollarSign, Package, MessageCircle, Phone } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import ProfileHeader from '../components/Profile/ProfileHeader';
import StatCard from '../components/Profile/StatCard';
import ReviewCard from '../components/Profile/ReviewCard';
import { musicianService } from '../services/api';
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Músico não encontrado'}
          </div>
        </div>
      </Layout>
    );
  }

  // Mock data for events (replace with real data later)
  const totalEvents = 42;
  const isOwnProfile = false; // Replace with real auth logic

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/musicos"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar para músicos
          </Link>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
            <ProfileHeader
              musician={musician}
              isOwnProfile={isOwnProfile}
              onUploadAvatar={() => {/* TODO: implement upload */}}
              onUploadCover={() => {/* TODO: implement upload */}}
            />
          </div>

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
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Sobre</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{musician.bio}</p>
                </div>
              )}

              {/* Equipment Section */}
              {musician.equipment_items && musician.equipment_items.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-900">Equipamentos e Serviços</h2>
                  </div>
                  <ul className="space-y-3">
                    {musician.equipment_items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="font-semibold text-gray-900">R$ {item.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviews Section */}
              {reviews.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="h-5 w-5 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-900">Avaliações ({reviews.length})</h2>
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
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contato</h2>
                <div className="space-y-3">
                  {musician.phone && (
                    <a
                      href={`tel:${musician.phone}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <span>{musician.phone}</span>
                    </a>
                  )}
                  {musician.whatsapp && (
                    <a
                      href={`https://wa.me/55${musician.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 hover:text-green-600 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
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
                      className="flex items-center gap-3 text-gray-700 hover:text-pink-600 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                        📷
                      </div>
                      <span>@{musician.instagram.replace('@', '')}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Connections Section */}
              {connections.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Conexões</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {connections.map((conn) => (
                      <Link key={conn.id} to={`/musicos/${conn.id}`} className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-2 overflow-hidden">
                          {conn.avatar ? (
                            <img src={conn.avatar} alt={conn.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                              {conn.full_name[0]}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 truncate">{conn.full_name}</p>
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
