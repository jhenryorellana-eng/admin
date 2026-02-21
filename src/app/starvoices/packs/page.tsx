'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseStarVoices } from '@/lib/supabase/starvoices-client';
import { deleteFileByUrlStarVoices } from '@/lib/supabase/starvoices-storage';
import {
  Button, Card, Badge, Input, Select,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Spinner,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { formatDate, STARVOICES_CATEGORIES } from '@/lib/utils';

type Pack = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string;
  audio_count: number;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  useEffect(() => { fetchPacks(); }, []);

  async function fetchPacks() {
    try {
      const { data, error } = await supabaseStarVoices
        .from('packs')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setPacks(data || []);
    } catch (error) {
      console.error('Error fetching packs:', error);
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los packs' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = (pack: Pack) => {
    openConfirm(
      'Eliminar pack',
      `¿Estas seguro de que deseas eliminar "${pack.title}"? Se eliminaran todos sus audios. Esta accion no se puede deshacer.`,
      async () => {
        try {
          // Delete audios storage files
          const { data: audios } = await supabaseStarVoices
            .from('audios').select('audio_url, cover_url').eq('pack_id', pack.id);
          for (const audio of audios || []) {
            if (audio.audio_url) await deleteFileByUrlStarVoices(audio.audio_url);
            if (audio.cover_url) await deleteFileByUrlStarVoices(audio.cover_url);
          }
          // Delete pack cover
          if (pack.cover_url) await deleteFileByUrlStarVoices(pack.cover_url);
          // Delete from DB (cascade deletes audios)
          const { error } = await supabaseStarVoices.from('packs').delete().eq('id', pack.id);
          if (error) throw error;
          setPacks(packs.filter((p) => p.id !== pack.id));
          addToast({ type: 'success', title: 'Pack eliminado', message: `"${pack.title}" ha sido eliminado` });
        } catch (error) {
          console.error('Error deleting pack:', error);
          addToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el pack' });
        }
      }
    );
  };

  const handleTogglePublish = async (pack: Pack) => {
    try {
      const { error } = await supabaseStarVoices
        .from('packs').update({ is_published: !pack.is_published }).eq('id', pack.id);
      if (error) throw error;
      setPacks(packs.map((p) => p.id === pack.id ? { ...p, is_published: !p.is_published } : p));
      addToast({
        type: 'success',
        title: pack.is_published ? 'Pack despublicado' : 'Pack publicado',
        message: `"${pack.title}" ahora esta ${pack.is_published ? 'en borrador' : 'publicado'}`,
      });
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo cambiar el estado' });
    }
  };

  const getCategoryLabel = (value: string) => STARVOICES_CATEGORIES.find((c) => c.value === value)?.label || value;

  const filteredPacks = packs.filter((pack) => {
    const matchesSearch = pack.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || pack.category === categoryFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'published' && pack.is_published) ||
      (statusFilter === 'draft' && !pack.is_published);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Packs de Audio</h1>
          <p className="text-surface-500 mt-1">Gestiona los packs de StarVoices</p>
        </div>
        <Link href="/starvoices/packs/nuevo">
          <Button leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            Nuevo Pack
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar por titulo..." value={search} onChange={(e) => setSearch(e.target.value)}
              leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ value: '', label: 'Todas las categorias' }, ...STARVOICES_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              options={[{ value: '', label: 'Todos' }, { value: 'published', label: 'Publicados' }, { value: 'draft', label: 'Borradores' }]}
            />
          </div>
        </div>
      </Card>

      {filteredPacks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron packs</p>
            <Link href="/starvoices/packs/nuevo"><Button variant="primary" className="mt-4">Crear primer pack</Button></Link>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pack</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Audios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPacks.map((pack) => (
              <TableRow key={pack.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                      {pack.cover_url ? (
                        <Image src={pack.cover_url} alt={pack.title} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{pack.title}</p>
                      {pack.is_featured && <Badge variant="info">Destacado</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="info">{getCategoryLabel(pack.category)}</Badge></TableCell>
                <TableCell>{pack.audio_count}</TableCell>
                <TableCell><Badge variant={pack.is_published ? 'success' : 'warning'}>{pack.is_published ? 'Publicado' : 'Borrador'}</Badge></TableCell>
                <TableCell className="text-surface-500">{formatDate(pack.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/starvoices/packs/${pack.id}/audios`}>
                      <Button variant="ghost" size="sm" title="Ver Audios">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
                      </Button>
                    </Link>
                    <Link href={`/starvoices/packs/${pack.id}`}>
                      <Button variant="ghost" size="sm" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(pack)} title={pack.is_published ? 'Despublicar' : 'Publicar'}>
                      {pack.is_published ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pack)} title="Eliminar" className="text-accent-red hover:bg-red-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
