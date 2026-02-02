'use client';

import { LucideIcon } from 'lucide-react';
import {
  Home,
  BookOpen,
  Users,
  Bell,
  User,
  ArrowLeft,
  X,
  MoreHorizontal,
  SmilePlus,
  MessageCircle,
  Pencil,
  Trash2,
  ThumbsUp,
  Heart,
  Lightbulb,
  PartyPopper,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  Lock,
  Trophy,
  Flame,
  Zap,
  Send,
  Image,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  BookMarked,
  GraduationCap,
  Award,
  TrendingUp,
  Plus,
  RefreshCw,
  Settings,
  LogOut,
  Info,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  Share2,
  Download,
  Upload,
  Bookmark,
  Flag,
  MoreVertical,
  Check,
  Copy,
  ExternalLink,
  Menu,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize,
  Minimize,
  Loader2,
  Camera,
  FileText,
  Video,
  Headphones,
  Link,
} from 'lucide-react';
import { CSSProperties } from 'react';

// Mapeo de Material Symbols a Lucide
const iconMap: Record<string, LucideIcon> = {
  // Navigation
  home: Home,
  auto_stories: BookOpen,
  hub: Users,
  notifications: Bell,
  person: User,
  arrow_back: ArrowLeft,
  arrow_left: ArrowLeft,
  close: X,
  menu: Menu,

  // Actions
  more_horiz: MoreHorizontal,
  more_vert: MoreVertical,
  add_reaction: SmilePlus,
  chat_bubble: MessageCircle,
  edit: Pencil,
  delete: Trash2,
  send: Send,
  image: Image,
  add: Plus,
  refresh: RefreshCw,
  search: Search,
  filter: Filter,
  share: Share2,
  download: Download,
  upload: Upload,
  bookmark: Bookmark,
  flag: Flag,
  check: Check,
  copy: Copy,
  open_in_new: ExternalLink,

  // Reactions
  thumb_up: ThumbsUp,
  favorite: Heart,
  lightbulb: Lightbulb,
  celebration: PartyPopper,

  // Gamification
  star: Star,
  emoji_events: Trophy,
  local_fire_department: Flame,
  bolt: Zap,
  workspace_premium: Award,
  trending_up: TrendingUp,
  school: GraduationCap,

  // Status
  check_circle: CheckCircle,
  cancel: XCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,

  // Media
  play_circle: PlayCircle,
  play_arrow: Play,
  pause: Pause,
  skip_next: SkipForward,
  skip_previous: SkipBack,
  volume_up: Volume2,
  volume_off: VolumeX,
  fullscreen: Maximize,
  fullscreen_exit: Minimize,

  // Time & Calendar
  schedule: Clock,
  calendar_today: Calendar,

  // Security
  lock: Lock,
  visibility: Eye,
  visibility_off: EyeOff,

  // Navigation arrows
  keyboard_arrow_down: ChevronDown,
  keyboard_arrow_up: ChevronUp,
  keyboard_arrow_right: ChevronRight,
  keyboard_arrow_left: ChevronLeft,
  expand_more: ChevronDown,
  expand_less: ChevronUp,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,

  // Learning
  menu_book: BookMarked,
  book: BookOpen,

  // Settings
  settings: Settings,
  logout: LogOut,

  // Spinner
  progress_activity: Loader2,
  loading: Loader2,

  // Camera
  photo_camera: Camera,
  camera: Camera,

  // Mood/Emoji
  mood: SmilePlus,
  sentiment_neutral: Users,
  emoji: SmilePlus,

  // Development/Login
  developer_mode: Settings,
  login: LogOut,
  code: Settings,

  // Files/Materials
  picture_as_pdf: FileText,
  description: FileText,
  smart_display: Video,
  headphones: Headphones,
  link: Link,
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}

export function Icon({ name, size = 24, className = '', filled = false, style }: IconProps) {
  const IconComponent = iconMap[name.toLowerCase()];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      className={className}
      style={style}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 0 : 2}
    />
  );
}

export default Icon;
