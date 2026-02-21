import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES').format(num);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const COURSE_CATEGORIES = [
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'emprendimiento', label: 'Emprendimiento' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'creatividad', label: 'Creatividad' },
  { value: 'comunicacion', label: 'Comunicación' },
] as const;

export const BADGE_CATEGORIES = [
  { value: 'learning', label: 'Aprendizaje' },
  { value: 'social', label: 'Social' },
  { value: 'streak', label: 'Racha' },
  { value: 'achievement', label: 'Logro' },
  { value: 'special', label: 'Especial' },
] as const;

export const BADGE_RARITIES = [
  { value: 'common', label: 'Común', color: 'bg-surface-400' },
  { value: 'uncommon', label: 'Poco común', color: 'bg-accent-green' },
  { value: 'rare', label: 'Raro', color: 'bg-accent-cyan' },
  { value: 'epic', label: 'Épico', color: 'bg-primary' },
  { value: 'legendary', label: 'Legendario', color: 'bg-accent-orange' },
] as const;

export const MATERIAL_TYPES = [
  { value: 'pdf', label: 'PDF', accept: '.pdf' },
  { value: 'image', label: 'Imagen', accept: '.png,.jpg,.jpeg,.webp' },
  { value: 'video', label: 'Video', accept: '.mp4,.webm' },
  { value: 'url', label: 'Enlace externo', accept: '' },
] as const;

// Categorías para StarEduca Senior (Padres)
export const SENIOR_COURSE_CATEGORIES = [
  { value: 'maternidad', label: 'Maternidad y Paternidad' },
  { value: 'comunicacion', label: 'Comunicación Familiar' },
  { value: 'limites', label: 'Límites y Disciplina' },
  { value: 'emociones', label: 'Inteligencia Emocional' },
  { value: 'adolescencia', label: 'Adolescencia' },
] as const;

// Tipos de material para StarEduca Senior
export const SENIOR_MATERIAL_TYPES = [
  { value: 'video', label: 'Video', accept: '.mp4,.webm', maxSize: 100 * 1024 * 1024 },
  { value: 'image', label: 'Imagen', accept: '.png,.jpg,.jpeg,.webp', maxSize: 10 * 1024 * 1024 },
  { value: 'audio', label: 'Audio', accept: '.mp3,.wav,.m4a', maxSize: 50 * 1024 * 1024 },
  { value: 'pdf', label: 'PDF', accept: '.pdf', maxSize: 50 * 1024 * 1024 },
  { value: 'link', label: 'Enlace Web', accept: '', maxSize: 0 },
] as const;

// Tipos de inteligencia para StarReads
export const INTELLIGENCE_TYPES = [
  { value: 'mental', label: 'Mental' },
  { value: 'emocional', label: 'Emocional' },
  { value: 'social', label: 'Social' },
  { value: 'financiera', label: 'Financiera' },
  { value: 'creativa', label: 'Creativa' },
  { value: 'fisica', label: 'Física' },
  { value: 'espiritual', label: 'Espiritual' },
] as const;

export const STARVOICES_CATEGORIES = [
  { value: 'comunicacion', label: 'Comunicacion Digital' },
  { value: 'tecnologia', label: 'Tecnologia y Adolescentes' },
  { value: 'emocional', label: 'Inteligencia Emocional' },
  { value: 'educacion', label: 'Motivacion Escolar' },
  { value: 'relaciones', label: 'Relaciones Familiares' },
  { value: 'bienestar', label: 'Bienestar Familiar' },
];
