import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type CropTarget = 'avatar' | 'cover';

interface ImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  target: CropTarget;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

const OUTPUT_SIZES = {
  avatar: { width: 512, height: 512 },
  cover: { width: 1600, height: 900 },
};
const MAX_OUTPUT_BYTES = {
  avatar: 2 * 1024 * 1024,
  cover: 5 * 1024 * 1024,
};

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  file,
  target,
  onClose,
  onConfirm,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const pinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    startZoom: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const aspectRatio = target === 'avatar' ? 1 : 16 / 9;
  const zoomMax = target === 'avatar' ? 3.0 : 2.5;
  const isAvatar = target === 'avatar';

  React.useEffect(() => {
    if (!isOpen || !file) {
      setImageUrl(null);
      setLoadError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setLoadError(null);
    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const updateCropSize = () => {
      const rect = cropRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCropSize({ width: rect.width, height: rect.height });
    };
    updateCropSize();
    window.addEventListener('resize', updateCropSize);
    return () => window.removeEventListener('resize', updateCropSize);
  }, [isOpen, target]);

  useEffect(() => {
    if (!isOpen) return;
    const updateFrameSize = () => {
      const isMobile = window.innerWidth < 640;
      const maxWidth = Math.min(window.innerWidth * (isMobile ? 0.95 : 0.9), 720);
      const reservedHeight = isMobile ? 240 : 240;
      const minHeight = isMobile ? 260 : 300;
      const maxHeight = Math.max(minHeight, window.innerHeight - reservedHeight);
      const widthByHeight = maxHeight * aspectRatio;
      const nextWidth = Math.min(maxWidth, widthByHeight);
      const nextHeight = nextWidth / aspectRatio;
      setFrameSize({ width: nextWidth, height: nextHeight });
    };
    updateFrameSize();
    window.addEventListener('resize', updateFrameSize);
    return () => window.removeEventListener('resize', updateFrameSize);
  }, [aspectRatio, isOpen]);

  useEffect(() => {
    if (!isOpen || !naturalSize.width) return;

    // Obter dimensões atuais do DOM diretamente para evitar race condition
    const rect = cropRef.current?.getBoundingClientRect();
    const currentCropWidth = rect?.width || cropSize.width;
    const currentCropHeight = rect?.height || cropSize.height;

    if (!currentCropWidth) return;

    const nextBaseScale = Math.max(
      currentCropWidth / naturalSize.width,
      currentCropHeight / naturalSize.height
    );
    const scaledWidth = naturalSize.width * nextBaseScale;
    const scaledHeight = naturalSize.height * nextBaseScale;

    requestAnimationFrame(() => {
      setBaseScale(nextBaseScale);
      setZoom(1);
      setOffset({
        x: (currentCropWidth - scaledWidth) / 2,
        y: (currentCropHeight - scaledHeight) / 2,
      });
      // Atualizar cropSize se estava desatualizado
      if (rect && (rect.width !== cropSize.width || rect.height !== cropSize.height)) {
        setCropSize({ width: rect.width, height: rect.height });
      }
    });
  }, [cropSize.height, cropSize.width, isOpen, naturalSize.height, naturalSize.width, target]);

  useEffect(() => {
    if (!isOpen || !imgRef.current || !naturalSize.width || !cropSize.width) return;
    const output = OUTPUT_SIZES[target];
    const scale = baseScale * zoom;
    const sx = Math.max(0, -offset.x / scale);
    const sy = Math.max(0, -offset.y / scale);
    const sw = cropSize.width / scale;
    const sh = cropSize.height / scale;

    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current) return;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, output.width, output.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.7);
  }, [zoom, offset, cropSize, naturalSize, baseScale, isOpen, target]);

  const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao processar imagem.'));
          }
        }, type, quality);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        const [header, data] = dataUrl.split(',');
        const mimeMatch = /data:(.*?);base64/.exec(header || '');
        const mime = mimeMatch?.[1] || type;
        const binary = atob(data);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        resolve(new Blob([buffer], { type: mime }));
      } catch (err) {
        reject(err);
      }
    });

  const clampOffset = (x: number, y: number, scale: number) => {
    const scaledWidth = naturalSize.width * scale;
    const scaledHeight = naturalSize.height * scale;
    const minX = cropSize.width - scaledWidth;
    const minY = cropSize.height - scaledHeight;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize.width) return;
    if (loadError) setLoadError(null);
    event.preventDefault();
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || isPinching) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const scale = baseScale * zoom;
    setOffset(clampOffset(dragRef.current.originX + deltaX, dragRef.current.originY + deltaY, scale));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const getTouchDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && cropRef.current) {
      e.preventDefault();
      const centerX = cropSize.width / 2;
      const centerY = cropSize.height / 2;
      pinchRef.current = {
        distance: getTouchDistance(e.touches),
        centerX,
        centerY,
        startZoom: zoom,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
      setIsPinching(true);
      dragRef.current.active = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const scaleFactor = newDistance / pinchRef.current.distance;
      const nextZoom = Math.min(Math.max(pinchRef.current.startZoom * scaleFactor, 1), zoomMax);
      const prevScale = baseScale * pinchRef.current.startZoom;
      const nextScale = baseScale * nextZoom;
      const imageX = (pinchRef.current.centerX - pinchRef.current.startOffsetX) / prevScale;
      const imageY = (pinchRef.current.centerY - pinchRef.current.startOffsetY) / prevScale;
      const nextOffsetX = pinchRef.current.centerX - imageX * nextScale;
      const nextOffsetY = pinchRef.current.centerY - imageY * nextScale;
      if (loadError) setLoadError(null);
      setZoom(nextZoom);
      setOffset(clampOffset(nextOffsetX, nextOffsetY, nextScale));
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    setIsPinching(false);
  };

  const handleReset = () => {
    if (!naturalSize.width || !cropSize.width) return;
    requestAnimationFrame(() => {
      setZoom(1);
      const nextBaseScale = Math.max(
        cropSize.width / naturalSize.width,
        cropSize.height / naturalSize.height
      );
      const scaledWidth = naturalSize.width * nextBaseScale;
      const scaledHeight = naturalSize.height * nextBaseScale;
      setBaseScale(nextBaseScale);
      setOffset({
        x: (cropSize.width - scaledWidth) / 2,
        y: (cropSize.height - scaledHeight) / 2,
      });
    });
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !file || loadError) return;
    const output = OUTPUT_SIZES[target];
    const maxBytes = MAX_OUTPUT_BYTES[target];
    const scale = baseScale * zoom;
    const sx = Math.max(0, -offset.x / scale);
    const sy = Math.max(0, -offset.y / scale);
    const sw = cropSize.width / scale;
    const sh = cropSize.height / scale;

    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, output.width, output.height);
    try {
      let quality = 0.92;
      let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      while (blob.size > maxBytes && quality > 0.7) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      }
      if (blob.size > maxBytes) {
        setLoadError('Imagem muito grande. Escolha uma foto menor ou reduza o zoom.');
        return;
      }
      const croppedFile = new File([blob], `${target}-crop.jpg`, { type: 'image/jpeg' });
      onConfirm(croppedFile);
    } catch {
      setLoadError('Não foi possível processar esta imagem. Use JPG, PNG ou WEBP.');
    }
  };

  if (!isOpen || !file) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
    >
      <div className="w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl bg-white p-3 sm:p-6 pb-safe pt-safe shadow-2xl dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4 shrink-0">
          <div>
            <h2 id="crop-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Ajustar {target === 'avatar' ? 'avatar' : 'capa'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste para posicionar e use o zoom para ajustar.
            </p>
            {loadError && (
              <p className="mt-2 text-sm text-red-600">
                {loadError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Resetar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-2 sm:gap-4 pb-4">
          <div className="relative">
            <div
              className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-gray-200/80 bg-white/90 px-2.5 py-1 text-[11px] text-gray-600 shadow-sm backdrop-blur sm:hidden"
              aria-hidden="true"
            >
              <span className="inline-flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M8 12l-2-2-2 2" />
                  <path d="M16 12l2-2 2 2" />
                  <path d="M9 7l3 3 3-3" />
                  <path d="M9 17l3-3 3 3" />
                </svg>
                Pinch para zoom
              </span>
            </div>
            <div
              ref={cropRef}
              className="relative w-[min(90vw,720px)] max-h-[55vh] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-inner dark:border-gray-700 dark:bg-gray-800 cursor-grab active:cursor-grabbing"
              style={{
                aspectRatio: `${aspectRatio}`,
                width: frameSize.width || undefined,
                height: frameSize.height || undefined,
                touchAction: 'none',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Pré-visualização"
                onLoad={(event) => {
                  const img = event.currentTarget;
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                onError={() => setLoadError('Não foi possível abrir esta foto. Use JPG, PNG ou WEBP.')}
                className="absolute left-0 top-0 select-none pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${baseScale * zoom})`,
                  transformOrigin: 'top left',
                  willChange: 'transform',
                }}
                draggable={false}
              />
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: isAvatar
                  ? 'radial-gradient(circle at center, transparent 0 46%, rgba(0,0,0,0.55) 47%)'
                  : 'linear-gradient(0deg, rgba(0,0,0,0.18), rgba(0,0,0,0.18))',
              }}
            />
            <div
              className={`pointer-events-none absolute inset-0 ring-2 ring-white/80 dark:ring-white/20 ${
                isAvatar ? 'rounded-full' : 'rounded-2xl'
              }`}
            />
          </div>
          </div>

          {previewUrl && (
            <div className="mt-4 hidden sm:flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </p>
              <div
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                style={{
                  width: isAvatar ? 100 : 160,
                  aspectRatio: `${aspectRatio}`,
                }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

            <div className="flex w-full max-w-xl flex-col gap-2 sm:gap-4">
             <div className="sticky bottom-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur pt-2 pb-[env(safe-area-inset-bottom)]">
               <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!imageUrl || !!loadError || !naturalSize.width}
                  className="rounded-lg bg-sky-600 px-5 py-2.5 sm:px-4 sm:py-2 text-base sm:text-sm font-semibold text-white hover:bg-sky-700 active:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
                >
                  Salvar e enviar
                </button>
              </div>
            </div>
           </div>
         </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageCropModal;
