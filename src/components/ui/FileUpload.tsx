'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface VideoMetadata {
  /** Duracion en minutos */
  duration: number;
  /** Duracion en segundos (valor original) */
  durationSeconds: number;
  /** Ancho del video */
  width: number;
  /** Alto del video */
  height: number;
}

interface FileUploadProps {
  /** Archivo pendiente de subir o URL existente */
  value: File | string | null;
  /** Callback cuando se selecciona o elimina un archivo */
  onChange: (file: File | null) => void;
  /** Tipos de archivo aceptados (ej: "image/*", "video/*", ".pdf") */
  accept?: string;
  /** Mostrar preview de imagen */
  showPreview?: boolean;
  /** Mostrar preview de video */
  showVideoPreview?: boolean;
  /** Etiqueta del campo */
  label?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Tamaño máximo en bytes (default: 10MB) */
  maxSize?: number;
  /** Clases CSS adicionales */
  className?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** Callback para metadatos de video (duracion, dimensiones) */
  onVideoMetadata?: (metadata: VideoMetadata) => void;
}

export function FileUpload({
  value,
  onChange,
  accept = 'image/*',
  showPreview = true,
  showVideoPreview = true,
  label,
  helperText,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false,
  onVideoMetadata,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generar preview URL cuando cambia el valor
  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === 'string' && value) {
      setPreviewUrl(value);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  const handleFileSelect = (file: File | null) => {
    setError(null);

    if (!file) {
      onChange(null);
      return;
    }

    // Validar tamaño
    if (file.size > maxSize) {
      setError(`El archivo excede el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Validar tipo si se especifica accept
    if (accept && accept !== '*') {
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const isValid = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });

      if (!isValid) {
        setError('Tipo de archivo no permitido');
        return;
      }
    }

    // Extraer metadatos de video si es un archivo de video
    if (file.type.startsWith('video/') && onVideoMetadata) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const durationSeconds = video.duration;
        const durationMinutes = Math.round(durationSeconds / 60);
        onVideoMetadata({
          duration: durationMinutes,
          durationSeconds: Math.round(durationSeconds),
          width: video.videoWidth,
          height: video.videoHeight,
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        console.error('Error al cargar metadatos del video');
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    }

    onChange(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const hasValue = value !== null;
  const isImage = accept?.includes('image') && showPreview;
  const isVideo = accept?.includes('video') && showVideoPreview;

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="label">{label}</label>}

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-all cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          hasValue && isImage ? 'border-transparent p-0' : 'border-surface-300 p-6',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-accent-red'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {hasValue && isImage && previewUrl ? (
          // Preview de imagen
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="px-3 py-1.5 bg-white text-surface-900 rounded-lg text-sm font-medium hover:bg-surface-100"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="px-3 py-1.5 bg-accent-red text-white rounded-lg text-sm font-medium hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
            {value instanceof File && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                Pendiente de guardar
              </div>
            )}
          </div>
        ) : hasValue && isVideo && previewUrl ? (
          // Preview de video
          <div className="relative group">
            <video
              src={previewUrl}
              className="w-full h-48 object-cover rounded-xl bg-black"
              controls
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="px-3 py-1.5 bg-white text-surface-900 rounded-lg text-sm font-medium hover:bg-surface-100 shadow-lg"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="px-3 py-1.5 bg-accent-red text-white rounded-lg text-sm font-medium hover:bg-red-600 shadow-lg"
              >
                Eliminar
              </button>
            </div>
            {value instanceof File && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                Pendiente de guardar
              </div>
            )}
          </div>
        ) : hasValue && !isImage && !isVideo ? (
          // Archivo no imagen
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-100 rounded-lg">
              <svg className="w-6 h-6 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">
                {value instanceof File ? value.name : 'Archivo existente'}
              </p>
              {value instanceof File && (
                <p className="text-xs text-surface-500">
                  {(value.size / 1024).toFixed(1)} KB - Pendiente de guardar
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="p-2 text-surface-400 hover:text-accent-red"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          // Estado vacío
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-surface-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-surface-600">
              <span className="font-medium text-primary">Clic para subir</span> o arrastra aquí
            </p>
            <p className="mt-1 text-xs text-surface-500">
              {accept === 'image/*' ? 'PNG, JPG, GIF' : accept} hasta {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-accent-red">{error}</p>}
      {helperText && !error && <p className="text-sm text-surface-500">{helperText}</p>}
    </div>
  );
}
