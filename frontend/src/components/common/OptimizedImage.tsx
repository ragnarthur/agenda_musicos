// components/common/OptimizedImage.tsx
// Componente de imagem otimizada com lazy loading e placeholder
import { useState, useCallback } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { User } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError' | 'src'> {
  src: string | null | undefined;
  alt: string;
  fallback?: 'avatar' | 'cover' | 'none';
  fallbackClassName?: string;
  showSkeleton?: boolean;
  lazy?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  fallback = 'avatar',
  fallbackClassName = '',
  showSkeleton = true,
  lazy = true,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Se não tem src ou deu erro, mostra fallback
  if (!src || hasError) {
    if (fallback === 'none') return null;

    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${fallbackClassName || className}`}
        role="img"
        aria-label={alt}
      >
        {fallback === 'avatar' && (
          <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />
        )}
        {fallback === 'cover' && (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton/placeholder enquanto carrega */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        {...props}
      />
    </div>
  );
}

// Componente específico para avatares
interface AvatarImageProps {
  src: string | null | undefined;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function AvatarImage({ src, alt, size = 'md', className = '' }: AvatarImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fallback="avatar"
      className={`rounded-full ${sizeClasses[size]} ${className}`}
    />
  );
}

// Componente específico para imagens de capa
interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  aspectRatio?: 'video' | 'banner' | 'square';
  className?: string;
}

const aspectClasses = {
  video: 'aspect-video',
  banner: 'aspect-[3/1]',
  square: 'aspect-square',
};

export function CoverImage({ src, alt, aspectRatio = 'banner', className = '' }: CoverImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fallback="cover"
      className={`w-full ${aspectClasses[aspectRatio]} ${className}`}
    />
  );
}
