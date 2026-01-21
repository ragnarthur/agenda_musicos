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

const PRESETS = {
  avatar: [
    { id: 'center', label: 'Central' },
    { id: 'portrait', label: 'Retrato' },
    { id: 'close', label: 'Fechado' },
  ],
  cover: [
    { id: 'center', label: 'Central' },
    { id: 'top', label: 'Topo' },
    { id: 'bottom', label: 'Base' },
    { id: 'left', label: 'Esquerda' },
    { id: 'right', label: 'Direita' },
  ],
} as const;

type CropPreset = typeof PRESETS.avatar[number]['id'] | typeof PRESETS.cover[number]['id'];

const isJpeg = (file: File) => file.type === 'image/jpeg' || file.type === 'image/jpg';

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

const readExifOrientation = async (file: File) => {
  if (!isJpeg(file)) return 1;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 1 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      void view.getUint16(offset, false);
      offset += 2;
      if (view.getUint32(offset, false) !== 0x45786966) return 1;
      offset += 6;
      const tiffOffset = offset;
      const endian = view.getUint16(tiffOffset, false);
      const littleEndian = endian === 0x4949;
      if (!littleEndian && endian !== 0x4d4d) return 1;
      const getUint16 = (valueOffset: number) => view.getUint16(valueOffset, littleEndian);
      const getUint32 = (valueOffset: number) => view.getUint32(valueOffset, littleEndian);
      const firstIfdOffset = getUint32(tiffOffset + 4);
      if (firstIfdOffset < 8) return 1;
      const ifdOffset = tiffOffset + firstIfdOffset;
      const entries = getUint16(ifdOffset);
      for (let i = 0; i < entries; i += 1) {
        const entryOffset = ifdOffset + 2 + i * 12;
        const tag = getUint16(entryOffset);
        if (tag === 0x0112) {
          const type = getUint16(entryOffset + 2);
          const count = getUint32(entryOffset + 4);
          if (type === 3 && count === 1) {
            return getUint16(entryOffset + 8);
          }
          const valueOffset = getUint32(entryOffset + 8);
          return getUint16(tiffOffset + valueOffset);
        }
      }
      return 1;
    }
    const length = view.getUint16(offset, false);
    if (length < 2) break;
    offset += length;
  }
  return 1;
};

const loadImageFromBlob = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao abrir imagem.'));
    };
    img.src = url;
  });

const loadDrawable = async (blob: Blob): Promise<HTMLImageElement | ImageBitmap> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'none' });
    } catch {
      // fallback para Image quando o navegador nao suporta as opcoes
    }
  }
  return loadImageFromBlob(blob);
};

const createOrientedBlob = async (file: File, orientation: number) => {
  if (orientation === 1) return file;
  const drawable = await loadDrawable(file);
  const width = 'naturalWidth' in drawable ? drawable.naturalWidth : drawable.width;
  const height = 'naturalHeight' in drawable ? drawable.naturalHeight : drawable.height;
  const swapAxis = [5, 6, 7, 8].includes(orientation);
  const canvas = document.createElement('canvas');
  canvas.width = swapAxis ? height : width;
  canvas.height = swapAxis ? width : height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  switch (orientation) {
    case 2:
      ctx.setTransform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.setTransform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.setTransform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.setTransform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.setTransform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.setTransform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.setTransform(0, -1, 1, 0, 0, width);
      break;
    default:
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      break;
  }
  ctx.drawImage(drawable, 0, 0);
  if ('close' in drawable) drawable.close();
  return canvasToBlob(canvas, 'image/jpeg', 0.92);
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
  const [isRotating, setIsRotating] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
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
  const presets = isAvatar ? PRESETS.avatar : PRESETS.cover;
  const initialFocusKeyRef = useRef<string | null>(null);

  const setSourceUrlSafe = (nextUrl: string | null) => {
    if (sourceUrlRef.current && sourceUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(sourceUrlRef.current);
    }
    sourceUrlRef.current = nextUrl;
  };

  const setImageUrlSafe = (nextUrl: string | null) => {
    if (
      imageUrlRef.current &&
      imageUrlRef.current !== nextUrl &&
      imageUrlRef.current !== sourceUrlRef.current
    ) {
      URL.revokeObjectURL(imageUrlRef.current);
    }
    imageUrlRef.current = nextUrl;
    setImageUrl(nextUrl);
  };

  React.useEffect(() => {
    if (!isOpen || !file) {
      setImageUrlSafe(null);
      setSourceUrlSafe(null);
      setLoadError(null);
      setIsPreparing(false);
      setNaturalSize({ width: 0, height: 0 });
      return;
    }

    let active = true;
    setIsPreparing(true);
    setLoadError(null);
    setNaturalSize({ width: 0, height: 0 });

    const prepareImage = async () => {
      try {
        const orientation = await readExifOrientation(file);
        if (!active) return;
        const normalized = orientation > 1 ? await createOrientedBlob(file, orientation) : file;
        if (!active) return;
        const url = URL.createObjectURL(normalized);
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        setSourceUrlSafe(url);
        setImageUrlSafe(url);
      } catch {
        if (!active) return;
        const fallbackUrl = URL.createObjectURL(file);
        setSourceUrlSafe(fallbackUrl);
        setImageUrlSafe(fallbackUrl);
      } finally {
        if (active) setIsPreparing(false);
      }
    };

    prepareImage();

    return () => {
      active = false;
      setIsPreparing(false);
    };
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

  const getDefaultFocus = () => {
    const aspect = naturalSize.height / naturalSize.width;
    if (isAvatar) {
      if (aspect >= 1.3) return { x: 0.5, y: 0.35 };
      if (aspect <= 0.85) return { x: 0.5, y: 0.5 };
      return { x: 0.5, y: 0.42 };
    }
    if (aspect >= 1.2) return { x: 0.5, y: 0.3 };
    if (aspect <= 0.6) return { x: 0.5, y: 0.45 };
    return { x: 0.5, y: 0.4 };
  };

  useEffect(() => {
    if (!isOpen || !naturalSize.width || !frameSize.width) return;

    const nextBaseScale = Math.max(
      frameSize.width / naturalSize.width,
      frameSize.height / naturalSize.height
    );
    setBaseScale(nextBaseScale);
    setCropSize({ width: frameSize.width, height: frameSize.height });

    const key = sourceUrl ? `${sourceUrl}-${target}` : null;
    if (!key) {
      const centered = {
        x: (frameSize.width - naturalSize.width * scale) / 2,
        y: (frameSize.height - naturalSize.height * scale) / 2,
      };
      setZoom(1);
      setOffset(centered);
      return;
    }

    if (initialFocusKeyRef.current !== key) {
      const scale = nextBaseScale;
      const focus = getDefaultFocus();
      const nextOffset = clampOffset(
        frameSize.width / 2 - naturalSize.width * focus.x * scale,
        frameSize.height / 2 - naturalSize.height * focus.y * scale,
        scale
      );
      setZoom(1);
      setOffset(nextOffset);
      initialFocusKeyRef.current = key;
      return;
    }
    setOffset((prev) => clampOffset(prev.x, prev.y, nextBaseScale * zoom));
  }, [
    frameSize.width,
    frameSize.height,
    isOpen,
    naturalSize.height,
    naturalSize.width,
    target,
    sourceUrl,
  ]);

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
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        previewUrlRef.current = url;
        return url;
      });
    }, 'image/jpeg', 0.7);
  }, [zoom, offset, cropSize, naturalSize, baseScale, isOpen, target]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

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

  const getCenteredOffset = (scale: number) => ({
    x: (cropSize.width - naturalSize.width * scale) / 2,
    y: (cropSize.height - naturalSize.height * scale) / 2,
  });

  const applyPreset = (preset: CropPreset) => {
    if (!naturalSize.width || !cropSize.width || isPreparing) return;
    let nextZoom = zoom;
    if (preset === 'portrait') nextZoom = Math.min(zoomMax, 1.25);
    if (preset === 'close') nextZoom = Math.min(zoomMax, 1.55);
    const scale = baseScale * nextZoom;
    const centered = getCenteredOffset(scale);
    let nextOffset = { ...centered };
    if (preset === 'top') {
      nextOffset = { x: centered.x, y: 0 };
    }
    if (preset === 'bottom') {
      nextOffset = { x: centered.x, y: cropSize.height - naturalSize.height * scale };
    }
    if (preset === 'left') {
      nextOffset = { x: 0, y: centered.y };
    }
    if (preset === 'right') {
      nextOffset = { x: cropSize.width - naturalSize.width * scale, y: centered.y };
    }
    if (preset === 'portrait') {
      nextOffset = { x: centered.x, y: centered.y - cropSize.height * 0.08 };
    }
    if (preset === 'close') {
      nextOffset = { x: centered.x, y: centered.y - cropSize.height * 0.12 };
    }
    setZoom(nextZoom);
    setOffset(clampOffset(nextOffset.x, nextOffset.y, scale));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!naturalSize.width || isPreparing) return;
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.05 : -0.05;
    updateZoom(zoom + step);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!naturalSize.width || isPreparing) return;
    const step = event.shiftKey ? 20 : 6;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -step;
    if (event.key === 'ArrowRight') dx = step;
    if (event.key === 'ArrowUp') dy = -step;
    if (event.key === 'ArrowDown') dy = step;
    if (dx || dy) {
      event.preventDefault();
      const scale = baseScale * zoom;
      setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy, scale));
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      updateZoom(zoom + 0.1);
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      updateZoom(zoom - 0.1);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize.width || isPreparing) return;
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
    if (!dragRef.current.active || isPinching || isPreparing) return;
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
    if (isPreparing) return;
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
    if (isPreparing) return;
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

  const clampZoom = (value: number) => Math.min(Math.max(value, 1), zoomMax);

  const updateZoom = (value: number) => {
    if (isPreparing) return;
    const nextZoom = clampZoom(value);
    const scale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, scale));
  };

  const resetImage = () => {
    if (!sourceUrlRef.current) return;
    setLoadError(null);
    setImageUrlSafe(sourceUrlRef.current);
  };

  const rotateImage = async (direction: 'left' | 'right') => {
    if (!imgRef.current || isRotating || isPreparing) return;
    setIsRotating(true);
    setLoadError(null);
    try {
      const img = imgRef.current;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = height;
      canvas.height = width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const angle = direction === 'left' ? -90 : 90;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2);
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      const url = URL.createObjectURL(blob);
      setImageUrlSafe(url);
    } catch {
      setLoadError('Não foi possível girar esta imagem.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleReset = () => {
    if (!naturalSize.width || !cropSize.width || isPreparing) return;
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
    if (!imgRef.current || !file || loadError || isPreparing) return;
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
            {isPreparing && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Preparando imagem para edição...
              </p>
            )}
            {loadError && (
              <p className="mt-2 text-sm text-red-600">
                {loadError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetImage}
              disabled={!imageUrl || isRotating || isPreparing}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reverter foto
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!naturalSize.width || isPreparing}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Resetar enquadramento
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
              tabIndex={0}
              aria-label="Area de recorte"
              aria-busy={isPreparing}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              onKeyDown={handleKeyDown}
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
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
            </div>
            {!isAvatar && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-[10%] rounded-xl border border-white/35" />
              </div>
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
            {naturalSize.width > 0 && (
              <div
                className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs text-white shadow-sm backdrop-blur"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                style={{ touchAction: 'auto' }}
              >
                <button
                  type="button"
                  onClick={() => updateZoom(zoom - 0.1)}
                  disabled={zoom <= 1 || isPreparing}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-50"
                  aria-label="Diminuir zoom"
                >
                  −
                </button>
                <input
                  type="range"
                  min={1}
                  max={zoomMax}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => updateZoom(Number(event.target.value))}
                  disabled={isPreparing}
                  className="h-1.5 w-24 appearance-none rounded-full bg-white/30"
                  aria-label="Controle de zoom"
                />
                <button
                  type="button"
                  onClick={() => updateZoom(zoom + 0.1)}
                  disabled={zoom >= zoomMax || isPreparing}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-50"
                  aria-label="Aumentar zoom"
                >
                  +
                </button>
                <span className="h-3 w-px bg-white/30" />
                <button
                  type="button"
                  onClick={() => rotateImage('left')}
                  disabled={isRotating || isPreparing}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-50"
                  aria-label="Girar para a esquerda"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={() => rotateImage('right')}
                  disabled={isRotating || isPreparing}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-50"
                  aria-label="Girar para a direita"
                >
                  ↻
                </button>
              </div>
            )}
          </div>
          </div>

          {previewUrl && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </p>
              <div
                className={`overflow-hidden border border-gray-200 dark:border-gray-700 ${
                  isAvatar ? 'rounded-full' : 'rounded-lg'
                }`}
                style={{
                  width: isAvatar ? 80 : 160,
                  height: isAvatar ? 80 : 90,
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
              <div className="w-full rounded-xl border border-gray-200 bg-white/90 p-3 text-gray-700 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <span>Presets</span>
                  <span>Guias ativas</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      disabled={!naturalSize.width || isPreparing}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {isAvatar ? 'Grade 3x3 + máscara circular.' : 'Grade 3x3 + área segura da capa.'}
                </p>
              </div>
              <div className="sticky bottom-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur pt-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!imageUrl || !!loadError || !naturalSize.width || isPreparing}
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
