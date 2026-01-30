import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

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
        if (blob) resolve(blob);
        else reject(new Error('Falha ao processar imagem.'));
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
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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

      if (view.getUint32(offset, false) !== 0x45786966) return 1; // 'Exif'
      offset += 6;

      const tiffOffset = offset;
      const endian = view.getUint16(tiffOffset, false);
      const littleEndian = endian === 0x4949; // 'II'
      if (!littleEndian && endian !== 0x4d4d) return 1; // 'MM'

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
          if (type === 3 && count === 1) return getUint16(entryOffset + 8);

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
      // fallback
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
  useBodyScrollLock(isOpen);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // cropSize é a verdade: é o tamanho real do elemento que faz o recorte
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });

  // frameSize é só layout (width/height que você dá pro crop)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mobile UX: painel de ajustes recolhível (mais sutil)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

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
    startDistance: number;
    startZoom: number;
    imageX: number;
    imageY: number;
  } | null>(null);

  const isAvatar = target === 'avatar';
  const aspectRatio = isAvatar ? 1 : 16 / 9;
  const zoomMax = isAvatar ? 3.0 : 2.5;
  const presets = isAvatar ? PRESETS.avatar : PRESETS.cover;

  const initialFocusKeyRef = useRef<string | null>(null);

  const setSourceUrlRef = (nextUrl: string | null) => {
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

  // IMPORTANTÃO: baseScale calculado com cropSize (tamanho real do recorte)
  const baseScale = useMemo(() => {
    if (!naturalSize.width || !cropSize.width) return 1;
    return Math.max(cropSize.width / naturalSize.width, cropSize.height / naturalSize.height);
  }, [cropSize.height, cropSize.width, naturalSize.height, naturalSize.width]);

  const clampOffset = useCallback(
    (x: number, y: number, scale: number) => {
      const scaledWidth = naturalSize.width * scale;
      const scaledHeight = naturalSize.height * scale;

      let clampedX: number;
      let clampedY: number;

      if (scaledWidth <= cropSize.width) clampedX = (cropSize.width - scaledWidth) / 2;
      else {
        const minX = cropSize.width - scaledWidth;
        clampedX = Math.min(0, Math.max(minX, x));
      }

      if (scaledHeight <= cropSize.height) clampedY = (cropSize.height - scaledHeight) / 2;
      else {
        const minY = cropSize.height - scaledHeight;
        clampedY = Math.min(0, Math.max(minY, y));
      }

      return { x: clampedX, y: clampedY };
    },
    [cropSize.height, cropSize.width, naturalSize.height, naturalSize.width]
  );

  const clampZoom = (value: number) => Math.min(Math.max(value, 1), zoomMax);

  const getLocalPoint = (clientX: number, clientY: number) => {
    const rect = cropRef.current?.getBoundingClientRect();
    if (!rect) return { x: cropSize.width / 2, y: cropSize.height / 2 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const updateZoom = (value: number, anchor?: { x: number; y: number }) => {
    if (isPreparing || !naturalSize.width || !cropSize.width) return;

    const nextZoom = clampZoom(value);
    const prevScale = baseScale * zoom;
    const nextScale = baseScale * nextZoom;

    const a = anchor ?? { x: cropSize.width / 2, y: cropSize.height / 2 };

    // mantém o ponto ancorado (mais natural)
    const imageX = (a.x - offset.x) / prevScale;
    const imageY = (a.y - offset.y) / prevScale;

    const nextOffsetX = a.x - imageX * nextScale;
    const nextOffsetY = a.y - imageY * nextScale;

    setZoom(nextZoom);
    setOffset(clampOffset(nextOffsetX, nextOffsetY, nextScale));
  };

  const getCenteredOffset = (scale: number) => ({
    x: (cropSize.width - naturalSize.width * scale) / 2,
    y: (cropSize.height - naturalSize.height * scale) / 2,
  });

  const getDefaultFocus = useCallback(() => {
    const aspect = naturalSize.height / naturalSize.width;

    if (isAvatar) {
      if (aspect >= 1.3) return { x: 0.5, y: 0.35 };
      if (aspect <= 0.85) return { x: 0.5, y: 0.5 };
      return { x: 0.5, y: 0.42 };
    }

    if (aspect >= 1.2) return { x: 0.5, y: 0.3 };
    if (aspect <= 0.6) return { x: 0.5, y: 0.45 };
    return { x: 0.5, y: 0.4 };
  }, [isAvatar, naturalSize.height, naturalSize.width]);

  // Monta o frameSize pro layout (crop vai ter esse tamanho)
  useEffect(() => {
    if (!isOpen) return;

    const updateFrameSize = () => {
      const maxWidth = Math.min(window.innerWidth * 0.95, 720);
      const reservedHeight = 240;
      const minHeight = 260;
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

  // Mantém cropSize sempre correto usando ResizeObserver (melhor que window.resize)
  useEffect(() => {
    if (!isOpen) return;

    const el = cropRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setCropSize({ width: rect.width, height: rect.height });
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen, target]);

  // Reset do painel mobile ao abrir/fechar
  useEffect(() => {
    if (!isOpen) setMobileSettingsOpen(false);
  }, [isOpen]);

  // Prepara imagem (EXIF etc)
  useEffect(() => {
    if (!isOpen || !file) {
      setImageUrlSafe(null);
      setSourceUrlRef(null);
      setLoadError(null);
      setIsPreparing(false);
      setNaturalSize({ width: 0, height: 0 });

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);

      setMobileSettingsOpen(false);
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

        setSourceUrlRef(url);
        setImageUrlSafe(url);
      } catch {
        if (!active) return;
        const fallbackUrl = URL.createObjectURL(file);
        setSourceUrlRef(fallbackUrl);
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

  // Define offset inicial (com foco “inteligente”) quando já temos naturalSize e cropSize
  useEffect(() => {
    if (!isOpen || !naturalSize.width || !cropSize.width) return;

    const key = sourceUrlRef.current ? `${sourceUrlRef.current}-${target}` : null;
    const scale = baseScale * zoom;

    if (!key) {
      const centered = getCenteredOffset(scale);
      setZoom(1);
      setOffset(centered);
      return;
    }

    if (initialFocusKeyRef.current !== key) {
      const focus = getDefaultFocus();
      const nextOffset = clampOffset(
        cropSize.width / 2 - naturalSize.width * focus.x * baseScale,
        cropSize.height / 2 - naturalSize.height * focus.y * baseScale,
        baseScale
      );

      setZoom(1);
      setOffset(nextOffset);
      initialFocusKeyRef.current = key;
      return;
    }

    setOffset((prev) => clampOffset(prev.x, prev.y, scale));
  }, [
    baseScale,
    clampOffset,
    cropSize.height,
    cropSize.width,
    getDefaultFocus,
    isOpen,
    naturalSize.height,
    naturalSize.width,
    target,
    zoom,
  ]);

  // Gera preview final (lado direito / overlay no mobile)
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

  // Cleanup preview url
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // ESC para fechar
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSaving, onClose]);

  const applyPreset = (preset: CropPreset) => {
    if (!naturalSize.width || !cropSize.width || isPreparing) return;

    let nextZoom = zoom;
    if (preset === 'portrait') nextZoom = Math.min(zoomMax, 1.25);
    if (preset === 'close') nextZoom = Math.min(zoomMax, 1.55);

    const scale = baseScale * nextZoom;
    const centered = getCenteredOffset(scale);

    let nextOffset = { ...centered };

    if (preset === 'top') nextOffset = { x: centered.x, y: 0 };
    if (preset === 'bottom') nextOffset = { x: centered.x, y: cropSize.height - naturalSize.height * scale };
    if (preset === 'left') nextOffset = { x: 0, y: centered.y };
    if (preset === 'right') nextOffset = { x: cropSize.width - naturalSize.width * scale, y: centered.y };

    if (preset === 'portrait') nextOffset = { x: centered.x, y: centered.y - cropSize.height * 0.08 };
    if (preset === 'close') nextOffset = { x: centered.x, y: centered.y - cropSize.height * 0.12 };

    setZoom(nextZoom);
    setOffset(clampOffset(nextOffset.x, nextOffset.y, scale));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!naturalSize.width || isPreparing) return;
    event.preventDefault();

    const step = event.deltaY < 0 ? 0.08 : -0.08;
    const anchor = getLocalPoint(event.clientX, event.clientY);
    updateZoom(zoom + step, anchor);
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
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const getTouchDistance = (touches: React.TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const getTouchCenterLocal = (touches: React.TouchList) => {
    const rect = cropRef.current?.getBoundingClientRect();
    if (!rect) return { x: cropSize.width / 2, y: cropSize.height / 2 };

    const cx = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
    const cy = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;
    return { x: cx, y: cy };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPreparing || !naturalSize.width || !cropSize.width) return;

    if (e.touches.length === 2) {
      e.preventDefault();

      const center = getTouchCenterLocal(e.touches);
      const startDistance = getTouchDistance(e.touches);

      const startScale = baseScale * zoom;
      const imageX = (center.x - offset.x) / startScale;
      const imageY = (center.y - offset.y) / startScale;

      pinchRef.current = {
        startDistance,
        startZoom: zoom,
        imageX,
        imageY,
      };

      setIsPinching(true);
      dragRef.current.active = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPreparing || !naturalSize.width || !cropSize.width) return;
    if (e.touches.length !== 2 || !pinchRef.current) return;

    e.preventDefault();

    const center = getTouchCenterLocal(e.touches);
    const newDistance = getTouchDistance(e.touches);

    const scaleFactor = newDistance / pinchRef.current.startDistance;
    const nextZoom = clampZoom(pinchRef.current.startZoom * scaleFactor);
    const nextScale = baseScale * nextZoom;

    const nextOffsetX = center.x - pinchRef.current.imageX * nextScale;
    const nextOffsetY = center.y - pinchRef.current.imageY * nextScale;

    if (loadError) setLoadError(null);

    setZoom(nextZoom);
    setOffset(clampOffset(nextOffsetX, nextOffsetY, nextScale));
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    setIsPinching(false);
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
      const scale = baseScale * 1;
      const centered = getCenteredOffset(scale);
      setOffset(clampOffset(centered.x, centered.y, scale));
    });
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !file || loadError || isPreparing || isSaving) return;

    setIsSaving(true);

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
    if (!ctx) {
      setIsSaving(false);
      return;
    }

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, output.width, output.height);

    try {
      let quality = 0.92;
      let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

      let iterations = 0;
      const maxIterations = 10;

      while (blob.size > maxBytes && quality > 0.7 && iterations < maxIterations) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        iterations += 1;
      }

      if (iterations >= maxIterations) {
        setLoadError('Não foi possível reduzir a imagem para o tamanho desejado.');
        setIsSaving(false);
        return;
      }

      if (blob.size > maxBytes) {
        setLoadError('Imagem muito grande. Escolha uma foto menor ou reduza o zoom.');
        setIsSaving(false);
        return;
      }

      const croppedFile = new File([blob], `${target}-crop.jpg`, { type: 'image/jpeg' });
      onConfirm(croppedFile);
    } catch {
      setLoadError('Não foi possível processar esta imagem. Use JPG, PNG ou WEBP.');
      setIsSaving(false);
    }
  };

  if (!isOpen || !file) return null;
  if (typeof document === 'undefined') return null;

  const zoomPercent = Math.round(zoom * 100);
  const outputSize = OUTPUT_SIZES[target];

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
    >
      <div className="flex w-full max-w-5xl flex-col bg-white shadow-2xl dark:bg-gray-900 sm:max-h-[92vh] sm:rounded-2xl sm:overflow-hidden max-h-[100dvh] rounded-t-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="crop-title" className="text-base font-semibold text-gray-900 dark:text-white">
              Ajustar {isAvatar ? 'foto de perfil' : 'foto de capa'}
            </h2>
            {isPreparing && <span className="text-xs text-gray-400 animate-pulse">Carregando...</span>}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loadError && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-950 min-h-0">
            <div className="flex flex-col items-center gap-3">
              {/* Desktop-only helper line (no mobile pra não poluir) */}
              <div
                className="hidden sm:flex w-full items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400"
                style={{ width: frameSize.width || undefined }}
              >
                <span>Ajuste</span>
                <span className="text-xs font-normal text-gray-400">Arraste para mover e use o zoom</span>
              </div>

              <div className="relative">
                <div
                  ref={cropRef}
                  className={`relative overflow-hidden border border-white/15 bg-gray-900 cursor-grab active:cursor-grabbing shadow-2xl ${
                    isAvatar ? 'rounded-full' : 'rounded-2xl'
                  }`}
                  style={{
                    aspectRatio: `${aspectRatio}`,
                    width: frameSize.width || undefined,
                    height: frameSize.height || undefined,
                    touchAction: 'none',
                  }}
                  tabIndex={0}
                  aria-label="Pré-visualização"
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
                      // FIX CRÍTICO: Tailwind preflight limita img com max-width:100% — isso quebra o crop.
                      className="absolute left-0 top-0 select-none pointer-events-none max-w-none max-h-none"
                      style={{
                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${baseScale * zoom})`,
                        transformOrigin: 'top left',
                        willChange: 'transform',
                      }}
                      draggable={false}
                    />
                  )}

                  {/* Mobile: preview final como badge overlay (sutil, não vira card gigante) */}
                  {previewUrl && (
                    <div className="md:hidden absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-2 py-1 backdrop-blur-sm shadow-lg">
                      <div
                        className={`overflow-hidden border border-white/20 bg-black/30 ${
                          isAvatar ? 'rounded-full' : 'rounded-md'
                        }`}
                        style={{ width: 34, height: 34 }}
                      >
                        <img src={previewUrl} alt="Preview final" className="h-full w-full object-cover" />
                      </div>
                      <span className="hidden sm:inline text-xs text-white/80">
                        {outputSize.width}×{outputSize.height}
                      </span>
                    </div>
                  )}

                  {/* Inline controls */}
                  {naturalSize.width > 0 && (
                    <div
                      className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      style={{ touchAction: 'auto' }}
                    >
                      <button
                        type="button"
                        onClick={() => updateZoom(zoom - 0.1)}
                        disabled={zoom <= 1 || isPreparing}
                        className="rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:bg-white/12 disabled:opacity-40 transition-colors"
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
                        onChange={(e) => updateZoom(Number(e.target.value))}
                        disabled={isPreparing}
                        className="h-1 w-14 sm:w-20 appearance-none rounded-full bg-white/25 accent-white cursor-pointer"
                        aria-label="Controle de zoom"
                      />

                      <button
                        type="button"
                        onClick={() => updateZoom(zoom + 0.1)}
                        disabled={zoom >= zoomMax || isPreparing}
                        className="rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:bg-white/12 disabled:opacity-40 transition-colors"
                        aria-label="Aumentar zoom"
                      >
                        +
                      </button>

                      <span className="w-10 text-center text-xs font-medium tabular-nums">{zoomPercent}%</span>
                      <span className="h-3 w-px bg-white/20" />

                      <button
                        type="button"
                        onClick={() => rotateImage('left')}
                        disabled={isRotating || isPreparing}
                        className="rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:bg-white/12 disabled:opacity-40 transition-colors"
                        aria-label="Girar para a esquerda"
                      >
                        ↺
                      </button>

                      <button
                        type="button"
                        onClick={() => rotateImage('right')}
                        disabled={isRotating || isPreparing}
                        className="rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:bg-white/12 disabled:opacity-40 transition-colors"
                        aria-label="Girar para a direita"
                      >
                        ↻
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar desktop */}
          <div className="hidden md:flex flex-col w-56 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 gap-4">
            {previewUrl && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Preview final
                </p>

                <div
                  className={`mt-2 overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
                    isAvatar ? 'rounded-full' : 'rounded-lg'
                  }`}
                  style={{ width: isAvatar ? 120 : 180, height: isAvatar ? 120 : 101 }}
                >
                  <img src={previewUrl} alt="Preview final" className="h-full w-full object-cover" />
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Saida {outputSize.width} x {outputSize.height}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Enquadramento
              </p>

              <div className="grid grid-cols-1 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    disabled={!naturalSize.width || isPreparing}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:border-gray-600 transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleReset}
                disabled={!naturalSize.width || isPreparing}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors text-left"
              >
                Resetar posição
              </button>

              <button
                type="button"
                onClick={resetImage}
                disabled={!imageUrl || isRotating || isPreparing}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors text-left"
              >
                Desfazer rotação
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!imageUrl || !!loadError || !naturalSize.width || isPreparing || isSaving}
              className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 active:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Salvando...
                </>
              ) : (
                'Salvar foto'
              )}
            </button>
          </div>
        </div>

        {/* MOBILE: bottom sheet sutil (configs ficam escondidas por padrão) */}
        <div className="md:hidden shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl">
          {/* Bar principal (sempre visível) */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={() => setMobileSettingsOpen((v) => !v)}
              disabled={!naturalSize.width || isPreparing}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
              aria-expanded={mobileSettingsOpen}
              aria-controls="mobile-crop-settings"
            >
              <span>Ajustes</span>
              <span className="text-xs text-gray-400 dark:text-gray-400 tabular-nums">{zoomPercent}%</span>
              <svg
                className={`h-4 w-4 transition-transform ${mobileSettingsOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Ações rápidas (bem discretas) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={!naturalSize.width || isPreparing}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white/70 text-gray-700 hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
                aria-label="Resetar posição"
                title="Resetar posição"
              >
                ⟲
              </button>

              <button
                type="button"
                onClick={resetImage}
                disabled={!imageUrl || isRotating || isPreparing}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white/70 text-gray-700 hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
                aria-label="Desfazer rotação"
                title="Desfazer rotação"
              >
                ↩
              </button>
            </div>
          </div>

          {/* Painel recolhível */}
          <div
            id="mobile-crop-settings"
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
              mobileSettingsOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Enquadramento
              </p>

              <div className="mt-2 -mx-1 px-1 flex gap-2 overflow-x-auto no-scrollbar">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    disabled={!naturalSize.width || isPreparing}
                    className="shrink-0 rounded-full border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-400 dark:text-gray-400">
                Dica: pinça para zoom, arraste para mover.
              </p>
            </div>
          </div>

          {/* Botão salvar fixo */}
          <div className="px-4 pb-safe pb-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!imageUrl || !!loadError || !naturalSize.width || isPreparing || isSaving}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white hover:bg-sky-700 active:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Salvando...
                </>
              ) : (
                'Salvar foto'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageCropModal;
