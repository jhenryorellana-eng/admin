'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseStarVoices } from '@/lib/supabase/starvoices-client';
import {
  Button, Card, CardContent, Input, Textarea, Modal, ModalFooter, Spinner, Badge, FileUpload,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { uploadFileStarVoices, generateAudioFilePath, generateAudioCoverPath, deleteFileByUrlStarVoices, isStorageUrlStarVoices } from '@/lib/supabase/starvoices-storage';

interface Audio {
  id: string;
  pack_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number;
  tags: string[];
  sort_order: number;
  is_preview: boolean;
  is_published: boolean;
  created_at: string;
}

interface AudioForm {
  title: string;
  description: string;
  duration_seconds: number;
  tags: string;
  is_preview: boolean;
  is_published: boolean;
}

const INITIAL_FORM: AudioForm = {
  title: '', description: '', duration_seconds: 180, tags: '', is_preview: false, is_published: false,
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function AudiosPage() {
  const router = useRouter();
  const params = useParams();
  const packId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [packTitle, setPackTitle] = useState('');
  const [audios, setAudios] = useState<Audio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAudio, setEditingAudio] = useState<Audio | null>(null);
  const [form, setForm] = useState<AudioForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const fetchPack = useCallback(async () => {
    const { data } = await supabaseStarVoices.from('packs').select('title').eq('id', packId).single();
    if (data) setPackTitle(data.title);
  }, [packId]);

  const fetchAudios = useCallback(async () => {
    const { data, error } = await supabaseStarVoices.from('audios').select('*').eq('pack_id', packId).order('sort_order');
    if (error) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los audios' });
    } else {
      setAudios(data || []);
    }
  }, [packId, addToast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPack(), fetchAudios()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPack, fetchAudios]);

  const openCreateModal = () => {
    setEditingAudio(null);
    setForm(INITIAL_FORM);
    setAudioFile(null);
    setCoverFile(null);
    setShowModal(true);
  };

  const openEditModal = (audio: Audio) => {
    setEditingAudio(audio);
    setForm({
      title: audio.title, description: audio.description || '', duration_seconds: audio.duration_seconds,
      tags: (audio.tags || []).join(', '), is_preview: audio.is_preview, is_published: audio.is_published,
    });
    setAudioFile(null);
    setCoverFile(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' }); return; }
    if (!audioFile) { addToast({ type: 'error', title: 'Error', message: 'El archivo de audio es obligatorio' }); return; }
    setIsSaving(true);
    try {
      const tempId = crypto.randomUUID();
      const audioPath = generateAudioFilePath(tempId, audioFile.name);
      const audioUrl = await uploadFileStarVoices(audioPath, audioFile);
      if (!audioUrl) throw new Error('No se pudo subir el audio');

      let coverUrl: string | null = null;
      if (coverFile) {
        const coverPath = generateAudioCoverPath(tempId, coverFile.name);
        coverUrl = await uploadFileStarVoices(coverPath, coverFile);
      }

      const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const nextOrder = audios.length;
      const { data, error } = await supabaseStarVoices.from('audios').insert({
        pack_id: packId, title: form.title.trim(), description: form.description.trim() || null,
        audio_url: audioUrl, cover_url: coverUrl, duration_seconds: form.duration_seconds,
        tags, sort_order: nextOrder, is_preview: form.is_preview, is_published: form.is_published,
      }).select().single();
      if (error) throw error;
      setAudios([...audios, data]);
      setShowModal(false);
      addToast({ type: 'success', title: 'Audio creado' });

      // Notificar a usuarios si el audio se publica
      if (form.is_published) {
        await supabaseStarVoices.from('notifications').insert({
          type: 'new_audio',
          title: 'Nuevo episodio disponible',
          message: `"${form.title.trim()}" del pack "${packTitle}" ya esta disponible`,
          data: { audioId: data.id, packId },
        });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAudio) return;
    if (!form.title.trim()) { addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' }); return; }
    setIsSaving(true);
    try {
      let audioUrl: string | null = editingAudio.audio_url;
      let coverUrl: string | null = editingAudio.cover_url;

      if (audioFile) {
        const audioPath = generateAudioFilePath(editingAudio.id, audioFile.name);
        const newUrl = await uploadFileStarVoices(audioPath, audioFile);
        if (!newUrl) throw new Error('No se pudo subir el audio');
        if (editingAudio.audio_url && isStorageUrlStarVoices(editingAudio.audio_url)) {
          await deleteFileByUrlStarVoices(editingAudio.audio_url);
        }
        audioUrl = newUrl;
      }
      if (coverFile) {
        const coverPath = generateAudioCoverPath(editingAudio.id, coverFile.name);
        const newUrl = await uploadFileStarVoices(coverPath, coverFile);
        if (editingAudio.cover_url && isStorageUrlStarVoices(editingAudio.cover_url)) {
          await deleteFileByUrlStarVoices(editingAudio.cover_url);
        }
        coverUrl = newUrl;
      }

      const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const { error } = await supabaseStarVoices.from('audios').update({
        title: form.title.trim(), description: form.description.trim() || null,
        audio_url: audioUrl, cover_url: coverUrl, duration_seconds: form.duration_seconds,
        tags, is_preview: form.is_preview, is_published: form.is_published,
      }).eq('id', editingAudio.id);
      if (error) throw error;
      setAudios(audios.map((a) => a.id === editingAudio.id ? {
        ...a, title: form.title.trim(), description: form.description.trim() || null,
        audio_url: audioUrl!, cover_url: coverUrl, duration_seconds: form.duration_seconds,
        tags, is_preview: form.is_preview, is_published: form.is_published,
      } : a));
      setShowModal(false);
      addToast({ type: 'success', title: 'Audio actualizado' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (audio: Audio) => {
    openConfirm('Eliminar audio', `¿Eliminar "${audio.title}"? Esta accion no se puede deshacer.`, async () => {
      try {
        const { error } = await supabaseStarVoices.from('audios').delete().eq('id', audio.id);
        if (error) throw error;
        if (audio.audio_url && isStorageUrlStarVoices(audio.audio_url)) await deleteFileByUrlStarVoices(audio.audio_url);
        if (audio.cover_url && isStorageUrlStarVoices(audio.cover_url)) await deleteFileByUrlStarVoices(audio.cover_url);
        setAudios(audios.filter((a) => a.id !== audio.id));
        addToast({ type: 'success', title: 'Audio eliminado' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const current = audios[index]; const previous = audios[index - 1];
    try {
      await supabaseStarVoices.from('audios').update({ sort_order: previous.sort_order }).eq('id', current.id);
      await supabaseStarVoices.from('audios').update({ sort_order: current.sort_order }).eq('id', previous.id);
      const updated = [...audios];
      updated[index] = { ...current, sort_order: previous.sort_order };
      updated[index - 1] = { ...previous, sort_order: current.sort_order };
      updated.sort((a, b) => a.sort_order - b.sort_order);
      setAudios(updated);
    } catch (error: any) { addToast({ type: 'error', title: 'Error', message: error.message }); }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= audios.length - 1) return;
    const current = audios[index]; const next = audios[index + 1];
    try {
      await supabaseStarVoices.from('audios').update({ sort_order: next.sort_order }).eq('id', current.id);
      await supabaseStarVoices.from('audios').update({ sort_order: current.sort_order }).eq('id', next.id);
      const updated = [...audios];
      updated[index] = { ...current, sort_order: next.sort_order };
      updated[index + 1] = { ...next, sort_order: current.sort_order };
      updated.sort((a, b) => a.sort_order - b.sort_order);
      setAudios(updated);
    } catch (error: any) { addToast({ type: 'error', title: 'Error', message: error.message }); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(`/starvoices/packs/${packId}`)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900">Audios</h1>
          <p className="text-surface-500">{packTitle}</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Audio
        </Button>
      </div>

      {audios.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <svg className="w-12 h-12 mx-auto text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
          <p className="mt-4 text-surface-500">No hay audios todavia</p>
          <Button className="mt-4" onClick={openCreateModal}>Crear primer audio</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {audios.map((audio, index) => (
            <Card key={audio.id}>
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">{index + 1}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 truncate">{audio.title}</h3>
                  {audio.description && <p className="text-sm text-surface-500 truncate mt-0.5">{audio.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {audio.is_preview && <Badge variant="info">Preview</Badge>}
                  <Badge variant={audio.is_published ? 'success' : 'warning'}>{audio.is_published ? 'Pub' : 'Borr'}</Badge>
                </div>
                <span className="text-sm text-surface-500 shrink-0">{formatDuration(audio.duration_seconds)}</span>
                <div className="flex flex-col shrink-0">
                  <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-surface-100 rounded transition-colors disabled:opacity-30" title="Mover arriba">
                    <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => handleMoveDown(index)} disabled={index === audios.length - 1} className="p-1 hover:bg-surface-100 rounded transition-colors disabled:opacity-30" title="Mover abajo">
                    <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(audio)} title="Editar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-accent-red hover:bg-red-50" onClick={() => handleDelete(audio)} title="Eliminar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAudio ? 'Editar Audio' : 'Nuevo Audio'} size="lg">
        <div className="space-y-4">
          <Input label="Titulo *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Por que tu hijo no te cuenta nada" autoFocus />
          <Textarea label="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion breve del audio..." rows={3} />
          <FileUpload label={editingAudio ? 'Reemplazar audio' : 'Archivo de audio *'} accept="audio/*" value={audioFile || (editingAudio?.audio_url) || null} onChange={(file) => {
            setAudioFile(file);
            if (file) {
              const audio = new globalThis.Audio();
              audio.src = URL.createObjectURL(file);
              audio.addEventListener('loadedmetadata', () => {
                const seconds = Math.round(audio.duration);
                if (seconds && isFinite(seconds)) {
                  setForm(prev => ({ ...prev, duration_seconds: seconds }));
                }
                URL.revokeObjectURL(audio.src);
              });
            }
          }} maxSize={100 * 1024 * 1024} helperText="MP3, WAV o OGG. Maximo 100MB." />
          <FileUpload label="Portada del audio" accept="image/*" value={coverFile || (editingAudio?.cover_url) || null} onChange={setCoverFile} showPreview={true} helperText="PNG, JPG o WebP. Opcional." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duracion (segundos)" type="number" value={form.duration_seconds.toString()} onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || 180 })} min={1} />
            <Input label="Tags (separados por coma)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="comunicacion, adolescentes" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-sm text-surface-900">Preview</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-sm text-surface-900">Publicado</span>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={editingAudio ? handleUpdate : handleCreate} isLoading={isSaving}>{editingAudio ? 'Guardar' : 'Crear'}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
