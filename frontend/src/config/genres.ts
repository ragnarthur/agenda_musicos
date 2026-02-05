export const MUSICAL_GENRES = [
  { value: 'repertorio_diverso', label: 'Repertório Diverso' },
  { value: 'mpb', label: 'MPB' },
  { value: 'pop_rock', label: 'Pop/Rock' },
  { value: 'sertanejo', label: 'Sertanejo' },
  { value: 'forro', label: 'Forró' },
  { value: 'pagode_samba', label: 'Pagode/Samba' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'blues', label: 'Blues' },
  { value: 'gospel', label: 'Gospel/Religioso' },
  { value: 'classico', label: 'Clássico/Erudito' },
  { value: 'eletronica', label: 'Eletrônica' },
  { value: 'funk', label: 'Funk' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'axe', label: 'Axé' },
  { value: 'bossa_nova', label: 'Bossa Nova' },
  { value: 'outro', label: 'Outro' },
];

export const getGenreLabel = (value: string): string => {
  const genre = MUSICAL_GENRES.find(g => g.value === value);
  return genre?.label || value;
};
