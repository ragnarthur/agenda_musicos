import React, { useEffect, useRef, useState } from 'react';

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
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const aspectRatio = target === 'avatar' ? 1 : 16 / 9;
  const zoomMax = target === 'avatar' ? 2.6 : 2.2;

  useEffect(() => {
    if (!isOpen || !file) {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
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
    if (!isOpen || !naturalSize.width || !cropSize.width) return;
    const nextBaseScale = Math.max(
      cropSize.width / naturalSize.width,
      cropSize.height / naturalSize.height
    );
    setBaseScale(nextBaseScale);
    setZoom(1);
    const scaledWidth = naturalSize.width * nextBaseScale;
    const scaledHeight = naturalSize.height * nextBaseScale;
    setOffset({
      x: (cropSize.width - scaledWidth) / 2,
      y: (cropSize.height - scaledHeight) / 2,
    });
  }, [cropSize.height, cropSize.width, isOpen, naturalSize.height, naturalSize.width, target]);

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
    if (!dragRef.current.active) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const scale = baseScale * zoom;
    setOffset(clampOffset(dragRef.current.originX + deltaX, dragRef.current.originY + deltaY, scale));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleZoomChange = (value: number) => {
    const nextZoom = Math.min(Math.max(value, 1), zoomMax);
    const prevScale = baseScale * zoom;
    const nextScale = baseScale * nextZoom;
    const centerX = (-offset.x + cropSize.width / 2) / prevScale;
    const centerY = (-offset.y + cropSize.height / 2) / prevScale;
    const nextOffsetX = -(centerX * nextScale - cropSize.width / 2);
    const nextOffsetY = -(centerY * nextScale - cropSize.height / 2);
    setZoom(nextZoom);
    setOffset(clampOffset(nextOffsetX, nextOffsetY, nextScale));
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !file) return;
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
    if (!ctx) return;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, output.width, output.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `${target}-crop.jpg`, { type: 'image/jpeg' });
        onConfirm(croppedFile);
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 id="crop-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Ajustar {target === 'avatar' ? 'avatar' : 'capa'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste para posicionar e use o zoom para ajustar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            ref={cropRef}
            className="relative w-[min(90vw,720px)] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-inner dark:border-gray-700 dark:bg-gray-800"
            style={{ aspectRatio: `${aspectRatio}` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
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
                className="absolute left-0 top-0 select-none touch-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${baseScale * zoom})`,
                  transformOrigin: 'top left',
                  willChange: 'transform',
                }}
                draggable={false}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/80 dark:ring-white/20" />
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom
              <input
                type="range"
                min={1}
                max={zoomMax}
                step={0.01}
                value={zoom}
                onChange={(event) => handleZoomChange(Number(event.target.value))}
                className="mt-2 w-full accent-sky-600"
              />
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Salvar e enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
