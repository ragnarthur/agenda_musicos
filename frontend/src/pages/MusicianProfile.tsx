// pages/MusicianProfile.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Music, Phone, Instagram } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { musicianService } from '../services/api';
import type { Musician } from '../types';

const MusicianProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        setLoading(true);
        const data = await musicianService.getById(Number(id));
        setMusician(data);
      } catch (err) {
        console.error('Error fetching musician:', err);
        setError('Erro ao carregar perfil do músico');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMusician();
    }
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            to="/musicos"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar para músicos
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Músico não encontrado'}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Botão voltar */}
        <Link
          to="/musicos"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar para músicos
        </Link>

        {/* Card de perfil */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Nome */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {musician.full_name}
          </h1>

          {/* Cidade - DESTAQUE */}
          {musician.city && (
            <div className="flex items-center gap-2 text-gray-600 mb-6">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span className="text-lg">{musician.city}</span>
            </div>
          )}

          {/* Instrumento(s) */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Music className="h-4 w-4" />
              Instrumento(s)
            </h2>
            <div className="flex flex-wrap gap-2">
              {musician.instruments && musician.instruments.length > 0 ? (
                musician.instruments.map((inst, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {inst}
                  </span>
                ))
              ) : musician.instrument ? (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {musician.instrument}
                </span>
              ) : (
                <span className="text-gray-500 text-sm">Não especificado</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {musician.bio && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Sobre</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{musician.bio}</p>
            </div>
          )}

          {/* Avaliações */}
          {(musician.total_ratings ?? 0) > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Avaliações</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(Number(musician.average_rating ?? 0))
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-600 text-sm">
                  {Number(musician.average_rating ?? 0).toFixed(1)} ({musician.total_ratings}{' '}
                  {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>
            </div>
          )}

          {/* Contatos */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Contato</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {musician.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{musician.phone}</span>
                </div>
              )}
              {musician.instagram && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Instagram className="h-5 w-5 text-gray-400" />
                  <a
                    href={`https://instagram.com/${musician.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    @{musician.instagram.replace('@', '')}
                  </a>
                </div>
              )}
            </div>

            {!musician.phone && !musician.instagram && (
              <p className="text-gray-500 text-sm italic">
                Informações de contato não disponíveis
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MusicianProfile;
