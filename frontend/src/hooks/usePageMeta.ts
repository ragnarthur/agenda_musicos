import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

/**
 * Hook para definir meta tags dinâmicas de SEO.
 * Usa manipulação direta do DOM para compatibilidade com React 19.
 */
export function usePageMeta({ title, description, image, url, type = 'website' }: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = title.includes('GigFlow') ? title : `${title} | GigFlow`;
    document.title = fullTitle;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setNameMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setNameMeta('description', description);

    // Open Graph
    setMeta('og:title', fullTitle);
    setMeta('og:description', description);
    setMeta('og:type', type);
    if (image) setMeta('og:image', image);
    if (url) setMeta('og:url', url);

    // Twitter Card
    setNameMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    setNameMeta('twitter:title', fullTitle);
    setNameMeta('twitter:description', description);
    if (image) setNameMeta('twitter:image', image);
  }, [title, description, image, url, type]);
}
