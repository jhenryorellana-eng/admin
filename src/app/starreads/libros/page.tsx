'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseStarReads } from '@/lib/supabase/starreads-client';
import { deleteFileByUrlStarReads } from '@/lib/supabase/starreads-storage';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { formatDate, INTELLIGENCE_TYPES } from '@/lib/utils';

type Book = {
  id: string;
  title: string;
  slug: string;
  author: string;
  author_verified: boolean;
  description: string | null;
  cover_url: string | null;
  average_rating: number | null;
  total_ideas: number;
  total_illuminated: number;
  total_fires: number;
  total_saves: number;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  ideas_count?: number;
  main_intelligence?: string;
};

export default function LibrosPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [intelligenceFilter, setIntelligenceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      // Fetch books
      const { data: booksData, error } = await supabaseStarReads
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch ideas to get counts and intelligence types per book
      const { data: ideasData } = await supabaseStarReads
        .from('ideas')
        .select('book_id, intelligence_type');

      // Map counts and main intelligence to books
      const booksWithCounts = (booksData || []).map((book) => {
        const bookIdeas = ideasData?.filter((i) => i.book_id === book.id) || [];
        const ideasCount = bookIdeas.length;

        // Find most common intelligence type
        let mainIntelligence = '';
        if (bookIdeas.length > 0) {
          const typeCounts: Record<string, number> = {};
          bookIdeas.forEach((idea) => {
            if (idea.intelligence_type) {
              typeCounts[idea.intelligence_type] = (typeCounts[idea.intelligence_type] || 0) + 1;
            }
          });
          const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            mainIntelligence = sorted[0][0];
          }
        }

        return {
          ...book,
          ideas_count: ideasCount,
          main_intelligence: mainIntelligence,
        };
      });

      setBooks(booksWithCounts);
    } catch (error) {
      console.error('Error fetching books:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los libros',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = (book: Book) => {
    openConfirm(
      'Eliminar libro',
      `¿Estas seguro de que deseas eliminar "${book.title}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          // 1. Obtener ideas del libro para borrar archivos de storage
          const { data: ideas } = await supabaseStarReads
            .from('ideas')
            .select('video_url, video_thumbnail_url')
            .eq('book_id', book.id);

          // 2. Borrar archivos de ideas (videos y thumbnails)
          for (const idea of ideas || []) {
            if (idea.video_url) await deleteFileByUrlStarReads(idea.video_url);
            if (idea.video_thumbnail_url) await deleteFileByUrlStarReads(idea.video_thumbnail_url);
          }

          // 3. Borrar portada del libro
          if (book.cover_url) await deleteFileByUrlStarReads(book.cover_url);

          // 4. Borrar registro DB (cascade eliminará ideas)
          const { error } = await supabaseStarReads.from('books').delete().eq('id', book.id);
          if (error) throw error;

          setBooks(books.filter((b) => b.id !== book.id));
          addToast({
            type: 'success',
            title: 'Libro eliminado',
            message: `"${book.title}" ha sido eliminado junto con sus archivos`,
          });
        } catch (error) {
          console.error('Error deleting book:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el libro',
          });
        }
      }
    );
  };

  const handleTogglePublish = async (book: Book) => {
    try {
      const updateData: Record<string, any> = {
        is_published: !book.is_published,
      };

      // Set published_at when publishing for the first time
      if (!book.is_published && !book.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarReads
        .from('books')
        .update(updateData)
        .eq('id', book.id);

      if (error) throw error;

      setBooks(
        books.map((b) =>
          b.id === book.id
            ? { ...b, is_published: !b.is_published, published_at: updateData.published_at || b.published_at }
            : b
        )
      );
      addToast({
        type: 'success',
        title: book.is_published ? 'Libro despublicado' : 'Libro publicado',
        message: `"${book.title}" ahora esta ${book.is_published ? 'en borrador' : 'publicado'}`,
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado del libro',
      });
    }
  };

  // Filter books
  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase());
    const matchesIntelligence = !intelligenceFilter || book.main_intelligence === intelligenceFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'published' && book.is_published) ||
      (statusFilter === 'draft' && !book.is_published);
    return matchesSearch && matchesIntelligence && matchesStatus;
  });

  const getIntelligenceLabel = (value: string) => {
    return INTELLIGENCE_TYPES.find((t) => t.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Libros</h1>
          <p className="text-surface-500 mt-1">
            Gestiona los libros de StarReads
          </p>
        </div>
        <Link href="/starreads/libros/nuevo">
          <Button
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nuevo Libro
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por titulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={intelligenceFilter}
              onChange={(e) => setIntelligenceFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas las inteligencias' },
                ...INTELLIGENCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                { value: 'published', label: 'Publicados' },
                { value: 'draft', label: 'Borradores' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Books Table */}
      {filteredBooks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-surface-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron libros</p>
            <Link href="/starreads/libros/nuevo">
              <Button variant="primary" className="mt-4">
                Crear primer libro
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libro</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Ideas</TableHead>
              <TableHead>Inteligencia principal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          width={48}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{book.title}</p>
                      <p className="text-xs text-surface-400">/{book.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{book.author}</span>
                    {book.author_verified && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </div>
                </TableCell>
                <TableCell>{book.ideas_count || 0}</TableCell>
                <TableCell>
                  {book.main_intelligence ? (
                    <Badge variant="info">{getIntelligenceLabel(book.main_intelligence)}</Badge>
                  ) : (
                    <span className="text-surface-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={book.is_published ? 'success' : 'warning'}>
                    {book.is_published ? 'Publicado' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-surface-500">
                  {formatDate(book.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/starreads/libros/${book.id}/ideas`}>
                      <Button variant="ghost" size="sm" title="Ver Ideas">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </Button>
                    </Link>
                    <Link href={`/starreads/libros/${book.id}`}>
                      <Button variant="ghost" size="sm" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(book)}
                      title={book.is_published ? 'Despublicar' : 'Publicar'}
                    >
                      {book.is_published ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(book)}
                      title="Eliminar"
                      className="text-accent-red hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
