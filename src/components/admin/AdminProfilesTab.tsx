import React, { useState, useEffect, useRef } from 'react';
import { adminFetch } from '../../client/adminFetch';
import { isVideoUrl } from '../ProtectedMedia';
import { TileSkeleton } from './AdminSkeletons';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { Profile, BotMediaItem, BotMediaCategory } from '../../types';
import {
  X,
  User,
  Users,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Star,
  Bot,
  HelpCircle,
  MessageSquare,
  Flame,
  HardDrive,
  Smile,
  Lock,
  Send,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sliders,
  RefreshCw,
  Edit,
  Clock,
  Banknote,
  QrCode,
  AlertTriangle
} from 'lucide-react';

export interface AdminProfilesTabProps {
  token: string | null;
  profiles: Profile[];
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  editingProfile: Profile | null;
  setEditingProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  botQueue: BotMediaItem[];
  setBotQueue: React.Dispatch<React.SetStateAction<BotMediaItem[]>>;
  initialLoading: boolean;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchData: () => Promise<void> | void;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  botUsername: string;
  channelId: string;
  channelIdInput: string;
  operatingMode: 'solo_bot' | 'bot_and_channel';
  setShowHelpGuide: (show: boolean) => void;
  setActiveTab?: (tab: any) => void;
}

export const AdminProfilesTab: React.FC<AdminProfilesTabProps> = ({
  token,
  profiles,
  setProfiles,
  editingProfile,
  setEditingProfile,
  formData,
  setFormData,
  botQueue,
  setBotQueue,
  initialLoading,
  loading,
  setLoading,
  fetchData,
  setMessage,
  botUsername,
  channelId,
  channelIdInput,
  operatingMode,
  setShowHelpGuide,
  setActiveTab
}) => {
  const [publishing, setPublishing] = useState(false);
  const [sendingDraftToBot, setSendingDraftToBot] = useState(false);
  const [tempDescText, setTempDescText] = useState<string>('');

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<FileList | null>(null);
  const [freePreviewUrl, setFreePreviewUrl] = useState<string | null>(null);
  const [publishedPostUrls, setPublishedPostUrls] = useState<string[]>([]);
  const [vipPreviewUrl, setVipPreviewUrl] = useState<string | null>(null);
  const [vipPreviewType, setVipPreviewType] = useState<'image' | 'video' | null>(null);
  const [freePreviewType, setFreePreviewType] = useState<'image' | 'video' | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(() => {
    return localStorage.getItem('watermarkEnabled') !== 'false';
  });
  const [watermarkText, setWatermarkText] = useState(() => {
    return localStorage.getItem('watermarkText')?.trim() || 'Iam Danii VIP';
  });

  useEffect(() => {
    localStorage.setItem('watermarkEnabled', String(watermarkEnabled));
    localStorage.setItem('watermarkText', watermarkText);
  }, [watermarkEnabled, watermarkText]);

  const [enlargedMediaUrl, setEnlargedMediaUrl] = useState<string | null>(null);
  const [showProfileGallery, setShowProfileGallery] = useState(false);

  const [uploadComment, setUploadComment] = useState('');
  const [uploadSugestiva, setUploadSugestiva] = useState(false);
  const [uploadDuration, setUploadDuration] = useState(10);
  const [step2Tab, setStep2Tab] = useState<'free' | 'vip' | 'bot'>('free');

  useEffect(() => {
    setShowProfileGallery(false);
    setPublishedPostUrls([]);
    const initialDesc = editingProfile?.description || formData.description || '';
    if (initialDesc) {
      setUploadComment(initialDesc);
    }
  }, [editingProfile?.id]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const tabSpaces = '    '; // 4 espacios tabulares para separar párrafos / indentar
      const updated = value.substring(0, start) + tabSpaces + value.substring(end);

      const name = target.getAttribute('name');
      if (name === 'uploadComment') {
        setUploadComment(updated);
      } else if (name === 'formDescription') {
        setFormData((prev: any) => ({ ...prev, description: updated }));
      } else if (name === 'tempDescText') {
        setTempDescText(updated);
      } else if (name === 'vipCaption') {
        setVipCaption(updated);
      } else if (name === 'paidModalCaption') {
        setPaidModalCaption(updated);
      }
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + tabSpaces.length;
      }, 0);
    }
  };

  const [vipFile, setVipFile] = useState<File | null>(null);
  const [vipStarCount, setVipStarCount] = useState<number | ''>(50);
  const [vipCaption, setVipCaption] = useState<string>('');
  const [vipDraftMediaUrl, setVipDraftMediaUrl] = useState<string | null>(null);
  const [vipPhase, setVipPhase] = useState<'upload' | 'preview' | 'edit'>('upload');
  const [uploadingVip, setUploadingVip] = useState(false);
  const [publishingVip, setPublishingVip] = useState(false);

  const [botFile, setBotFile] = useState<File | null>(null);
  const [botCategory, setBotCategory] = useState<BotMediaCategory>('general');
  const [botCaption, setBotCaption] = useState<string>('');
  const [uploadingBotMedia, setUploadingBotMedia] = useState(false);

  const [paidModalMediaUrl, setPaidModalMediaUrl] = useState<string | null>(null);
  const [paidModalStarCount, setPaidModalStarCount] = useState<number | ''>(50);
  const [paidModalCaption, setPaidModalCaption] = useState<string>('');
  const [publishingPaidMedia, setPublishingPaidMedia] = useState(false);

  const [profileStep, setProfileStep] = useState<1 | 2 | 3>(1);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescriptionOnly, setSavingDescriptionOnly] = useState(false);

  const formDescTextareaRef = useRef<HTMLTextAreaElement>(null);
  const uploadCommentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertEmojiIntoDescription = (emojiTag: string, target: 'form' | 'upload') => {
    if (target === 'form') {
      const el = formDescTextareaRef.current;
      if (el) {
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const current = formData.description || '';
        const updated = current.substring(0, start) + emojiTag + current.substring(end);
        setFormData((prev: any) => ({ ...prev, description: updated }));
        setTimeout(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = start + emojiTag.length;
        }, 0);
      } else {
        setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + emojiTag }));
      }
    } else if (target === 'upload') {
      const el = uploadCommentTextareaRef.current;
      if (el) {
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const current = uploadComment || '';
        const updated = current.substring(0, start) + emojiTag + current.substring(end);
        setUploadComment(updated);
        setTimeout(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = start + emojiTag.length;
        }, 0);
      } else {
        setUploadComment((prev) => prev + emojiTag);
      }
    }
  };

  const [previewModeModal, setPreviewModeModal] = useState<null | 'miniapp' | 'telegram'>(null);
  const [previewIncludeDrafts, setPreviewIncludeDrafts] = useState(true);

  const handleSaveProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setMessage(null);
    try {
      const isEdit = Boolean(editingProfile);
      const url = isEdit ? `/api/admin/profiles/${editingProfile!.id}` : '/api/admin/profiles';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await adminFetch(url, token, {
        method,
        json: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const targetProfileId = isEdit ? editingProfile!.id : data.profile.id;
        
        setMessage({ type: 'success', text: `Perfil ${isEdit ? 'actualizado' : 'creado'} y guardado con éxito.` });
        if (data.profile) {
          setEditingProfile(data.profile);
          setFormData({
            name: data.profile.name || '',
            age: data.profile.age || 18,
            zone: data.profile.zone || 'Contenido +18 VIP',
            description: data.profile.description || '',
            rate_bs: data.profile.rate_bs ?? 0,
            commission_bs: 0,
            status: data.profile.status || 'borrador',
            priority_order: data.profile.priority_order || 0
          });
          const savedDesc = data.profile.description || formData.description || '';
          if (savedDesc) {
            setUploadComment(savedDesc);
          }
        }
        fetchData();
        setActiveTab?.('profiles');
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar perfil' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de servidor al guardar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescriptionOnly = async () => {
    if (!editingProfile) {
      setMessage({ type: 'error', text: 'Selecciona un perfil antes de guardar la descripción.' });
      return;
    }
    if (!formData.description || !formData.description.trim()) {
      setMessage({ type: 'error', text: 'La descripción no puede quedar vacía.' });
      return;
    }
    setSavingDescriptionOnly(true);
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}`, token, {
        method: 'PUT',
        json: { description: formData.description }
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setMessage({ type: 'success', text: '✅ Mi descripción guardada con éxito.' });
        setEditingProfile(data.profile);
        setEditingDescription(false);
        setUploadComment(formData.description);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar la descripción' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar la descripción' });
    } finally {
      setSavingDescriptionOnly(false);
    }
  };

  
  const addWatermarkToImage = async (file: File, text: string): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file); // Retornar videos tal cual por ahora
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Configurar estilo de marca de agua
        // Tamaño de fuente relativo al ancho de la imagen (ej: 5%)
        const fontSize = Math.max(20, Math.floor(canvas.width * 0.05));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; // Blanco semi transparente
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Además, dibujar pequeño en una esquina abajo a la derecha
        ctx.font = `bold ${Math.max(14, Math.floor(canvas.width * 0.025))}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'right';
        ctx.fillText(text, canvas.width - 20, canvas.height - 20);

        canvas.toBlob((blob) => {
          if (blob) {
            const stampedFile = new File([blob], file.name, { type: file.type });
            resolve(stampedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.9);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUploadPhotos = async (profileId: string) => {
    if (!selectedPhotoFiles || selectedPhotoFiles.length === 0) return;
    if (!uploadComment.trim()) {
      setMessage({ type: 'error', text: 'Escribe la descripción del contenido antes de publicarlo.' });
      return;
    }
    setUploadingPhotos(true);
    for (let i = 0; i < selectedPhotoFiles.length; i++) {
      if (selectedPhotoFiles[i].size > 20 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Uno de los archivos pesa más de 20 MB. Telegram solo permite descargar hasta 20 MB a través de bots.' });
        setUploadingPhotos(false);
        return;
      }
    }
    try {
      const body = new FormData();
            for (let i = 0; i < selectedPhotoFiles.length; i++) {
              const originalFile = selectedPhotoFiles[i];
              if (watermarkEnabled && watermarkText.trim() !== '') {
                const stampedFile = await addWatermarkToImage(originalFile, watermarkText.trim());
                body.append('photos', stampedFile);
              } else {
                body.append('photos', originalFile);
              }
            }
      if (uploadComment.trim()) {
        body.append('description', uploadComment.trim());
      }
      if (uploadSugestiva) {
        body.append('is_ephemeral', 'true');
        body.append('ephemeral_duration', String(uploadDuration || 10));
      }
      const res = await adminFetch(`/api/admin/profiles/${profileId}/content/free`, token, {
        method: 'POST',
        body
      });
      const data = await res.json();
      setPublishedPostUrls(Array.isArray(data.publishedPosts)
        ? data.publishedPosts.map((post: { url?: string }) => post.url).filter((url: unknown): url is string => typeof url === 'string')
        : []);
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `🚀 ${data.publishedCount || selectedPhotoFiles.length} archivo(s) publicados en Canal Free. La URL quedó guardada en la base de B2.`
        });
        setSelectedPhotoFiles(null);
        setFreePreviewUrl(null);
        setFreePreviewType(null);
        setUploadComment('');
        setUploadSugestiva(false);
        if (editingProfile && data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        if (data.saved && data.profile) {
          setSelectedPhotoFiles(null);
          setFreePreviewUrl(null);
          setFreePreviewType(null);
          if (editingProfile) setEditingProfile(data.profile);
          setMessage({ type: 'error', text: data.error || `El contenido quedó guardado, pero solo ${data.publishedCount || 0} archivo(s) se publicaron. Revisa Auditoría antes de volver a subirlos.` });
          fetchData();
        } else {
          setMessage({ type: 'error', text: data.error || 'No se subió ni publicó el contenido.' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al subir imágenes a Telegram' });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSendDraftToBot = async (profileId: string) => {
    if (selectedPhotoFiles && selectedPhotoFiles.length > 0) {
      if (!uploadComment.trim()) {
        setMessage({ type: 'error', text: 'Escribe la descripción obligatoria del contenido antes de enviarlo al bot.' });
        return;
      }
      if (watermarkEnabled && watermarkText.trim() === '') {
        setMessage({ type: 'error', text: 'Ingresa el texto de la marca de agua o desactívala.' });
        return;
      }
      for (let i = 0; i < selectedPhotoFiles.length; i++) {
        if (selectedPhotoFiles[i].size > 20 * 1024 * 1024) {
          setMessage({ type: 'error', text: 'Uno de los archivos pesa más de 20 MB. Telegram solo permite descargar hasta 20 MB a través de bots.' });
          return;
        }
      }
    }

    setSendingDraftToBot(true);
    try {
      if (selectedPhotoFiles && selectedPhotoFiles.length > 0) {
        const body = new FormData();
        for (let i = 0; i < selectedPhotoFiles.length; i++) {
          const originalFile = selectedPhotoFiles[i];
          if (watermarkEnabled && watermarkText.trim() !== '') {
            const stampedFile = await addWatermarkToImage(originalFile, watermarkText.trim());
            body.append('photos', stampedFile);
          } else {
            body.append('photos', originalFile);
          }
        }
        body.append('description', uploadComment.trim());
        if (uploadSugestiva) {
          body.append('is_ephemeral', 'true');
          body.append('ephemeral_duration', String(uploadDuration || 10));
        }

        const resUpload = await adminFetch(`/api/admin/profiles/${profileId}/photos`, token, {
          method: 'POST',
          body
        });
        const uploadData = await resUpload.json();
        if (!resUpload.ok || !uploadData.success) {
          setMessage({ type: 'error', text: uploadData.error || 'Error al guardar el contenido antes de enviar al bot.' });
          return;
        }
        if (uploadData.profile) {
          setEditingProfile(uploadData.profile);
        }
      }

      const res = await adminFetch(`/api/admin/profiles/${profileId}/send-draft`, token, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: '📱 ¡Borrador enviado a tu chat privado con el Bot! Ábrelo en Telegram para editar la descripción con tus emojis Premium.'
        });
        setSelectedPhotoFiles(null);
        setFreePreviewUrl(null);
        setFreePreviewType(null);
        setUploadComment('');
        setUploadSugestiva(false);
        fetchData();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error al enviar el borrador al Bot'
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor al enviar el borrador al Bot.' });
    } finally {
      setSendingDraftToBot(false);
    }
  };

  const handleUploadVipMedia = async (profileId: string) => {
    if (vipFile && vipFile.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El archivo VIP no puede pesar más de 20 MB por las restricciones de Telegram Puro.' });
      return;
    }
    if (!vipFile) {
      setMessage({ type: 'error', text: 'Selecciona una foto o video para el contenido VIP' });
      return;
    }
    setUploadingVip(true);
    try {
      const body = new FormData();
      body.append('photo', vipFile);
      body.append('star_count', String(vipStarCount || 50));
      if (vipCaption.trim()) {
        body.append('caption', vipCaption.trim());
      }
      body.append('publish_now', 'false'); // Guardar primero como borrador

      const res = await adminFetch(`/api/admin/profiles/${profileId}/content/vip`, token, {
        method: 'POST',
        body
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `⭐ Contenido VIP guardado en Telegram y Base de Datos (⭐ ${data.star_count} Estrellas). Revisa la previsualización antes de publicar.`
        });
        setVipDraftMediaUrl(data.media_url);
        setVipPhase('preview');
        if (editingProfile && data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar contenido VIP' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al subir contenido VIP' });
    } finally {
      setUploadingVip(false);
    }
  };

  const handleEditVipMedia = async (profileId: string) => {
    if (!vipDraftMediaUrl) return;
    setUploadingVip(true);
    try {
      const res = await adminFetch(`/api/admin/profiles/${profileId}/content/vip`, token, {
        method: 'PUT',
        json: {
          media_url: vipDraftMediaUrl,
          star_count: vipStarCount,
          caption: vipCaption
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '✏️ Cambios guardados para este contenido VIP.' });
        setVipPhase('preview');
        if (editingProfile && data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al editar contenido VIP' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al editar contenido VIP' });
    } finally {
      setUploadingVip(false);
    }
  };

  const handlePublishVipMedia = async (profileId: string) => {
    if (!vipDraftMediaUrl) return;
    setPublishingVip(true);
    try {
      const res = await adminFetch(`/api/admin/profiles/${profileId}/publish-paid-media`, token, {
        method: 'POST',
        json: {
          media_url: vipDraftMediaUrl,
          star_count: vipStarCount,
          caption: vipCaption
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `🎉 ¡Contenido VIP publicado con éxito en el Canal por ⭐ ${vipStarCount} Estrellas!`
        });
        setVipDraftMediaUrl(null);
        setVipFile(null);
        setVipCaption('');
        setVipPhase('upload');
        if (editingProfile && data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al publicar contenido VIP en el canal' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al publicar contenido VIP' });
    } finally {
      setPublishingVip(false);
    }
  };

  const handleUploadBotMedia = async () => {
    if (botFile && botFile.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El archivo no puede pesar más de 20 MB.' });
      return;
    }
    if (!botFile) {
      setMessage({ type: 'error', text: 'Selecciona una foto o video para la biblioteca del Bot' });
      return;
    }
    setUploadingBotMedia(true);
    try {
      const fd = new FormData();
      fd.append('media', botFile);
      fd.append('category', botCategory);
      if (botCaption.trim()) {
        fd.append('caption', botCaption.trim());
      }
      const res = await adminFetch('/api/admin/bot-queue', token, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: '🤖 Archivo guardado con éxito en la biblioteca del Bot (sin publicar al canal ni a clientes).'
        });
        setBotFile(null);
        setBotCaption('');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar archivo en biblioteca del bot' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al guardar multimedia del bot' });
    } finally {
      setUploadingBotMedia(false);
    }
  };

  const handleDeleteBotMedia = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este archivo de la biblioteca del bot?')) return;
    try {
      const res = await adminFetch(`/api/admin/bot-queue/${id}`, token, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '🗑️ Archivo eliminado de la biblioteca del bot.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar archivo del bot' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar archivo' });
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!editingProfile) return;
    const updatedPhotos = (editingProfile.photos || []).filter(p => p !== photoUrl);
    const updatedEphemeral = { ...(editingProfile.ephemeral_config || {}) };
    delete updatedEphemeral[photoUrl];
    setEditingProfile({ ...editingProfile, photos: updatedPhotos, ephemeral_config: updatedEphemeral });
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}`, token, {
        method: 'PUT',
        json: { photos: updatedPhotos, ephemeral_config: updatedEphemeral }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Archivo multimedia eliminado del perfil.' });
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar el archivo' });
    }
  };

  const handleDeleteMediaPermanently = async (photoUrl: string) => {
    if (!editingProfile) return;
    if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR DEFINITIVAMENTE este archivo del Servidor Telegram y Servidor DB?\n\nEsta acción borrará el archivo de raíz y no se puede deshacer.')) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}/media`, token, {
        method: 'DELETE',
        json: { media_url: photoUrl }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '🗑️ Archivo eliminado físicamente del servidor y base de datos.' });
        if (enlargedMediaUrl === photoUrl) setEnlargedMediaUrl(null);
        if (data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar archivo del servidor' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar archivo' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEphemeral = async (photoUrl: string, enabled: boolean, durationSeconds: number = 5) => {
    if (!editingProfile) return;
    const currentConfig = { ...(editingProfile.ephemeral_config || {}) };
    if (enabled) {
      currentConfig[photoUrl] = { enabled: true, duration_seconds: durationSeconds };
    } else {
      delete currentConfig[photoUrl];
    }
    const updatedProfile = { ...editingProfile, ephemeral_config: currentConfig };
    setEditingProfile(updatedProfile);
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}`, token, {
        method: 'PUT',
        json: { ephemeral_config: currentConfig }
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: enabled ? `Imagen configurada como Sugestiva / Efímera (${durationSeconds}s)` : 'Modo efímero desactivado para este archivo'
        });
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al actualizar configuración efímera' });
    }
  };

  const handleOpenPublishPaidModal = (photoUrl: string) => {
    setPaidModalMediaUrl(photoUrl);
    setPaidModalStarCount(editingProfile?.media_stars?.[photoUrl] || 50);
    setPaidModalCaption(editingProfile?.media_descriptions?.[photoUrl] || '');
  };

  const handlePublishPaidMediaSubmit = async () => {
    if (!editingProfile || !paidModalMediaUrl) return;
    setPublishingPaidMedia(true);
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}/publish-paid-media`, token, {
        method: 'POST',
        json: {
          media_url: paidModalMediaUrl,
          star_count: paidModalStarCount,
          caption: paidModalCaption
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        if (data.profile) setEditingProfile(data.profile);
        setPaidModalMediaUrl(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al publicar contenido de pago' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor al publicar con estrellas' });
    } finally {
      setPublishingPaidMedia(false);
    }
  };

  const handlePublishToChannel = async (profileId?: string) => {
    const targetId = profileId || editingProfile?.id || profiles[0]?.id;
    if (!targetId) {
      setMessage({ type: 'error', text: 'No hay perfil seleccionado para publicar en Telegram y Mini App.' });
      return;
    }
    setPublishing(true);
    try {
      // Ensure profile data is saved with status 'disponible'
      const saveRes = await adminFetch(`/api/admin/profiles/${targetId}`, token, {
        method: 'PUT',
        json: {
          name: formData.name,
          rate_bs: formData.rate_bs,
          description: formData.description,
          status: 'disponible'
        }
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        setMessage({ type: 'error', text: errData.error || 'Error al guardar los datos antes de publicar' });
        setPublishing(false);
        return;
      }

      const res = await adminFetch(`/api/admin/profiles/${targetId}/publish`, token, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `🚀 ¡Publicado con éxito en Telegram y en la Mini App!`
        });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al publicar en Telegram' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al publicar en Telegram' });
    } finally {
      setPublishing(false);
    }
  };



  
  const handleBroadcastMedia = async (mediaUrl: string) => {
    if (!confirm('¿Estás seguro de que quieres enviar una difusión masiva por mensaje privado a TODOS los suscriptores del bot con este contenido? Esto puede tardar varios segundos.')) return;
    try {
      setMessage({ type: 'success', text: 'Iniciando difusión masiva...' });
      const res = await adminFetch(`/api/admin/profiles/${editingProfile?.id}/share-to-channel`, token, {
        method: 'POST',
        json: { media_url: mediaUrl }
      });
      const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: data.message || `Difusión iniciada a ${data.count} suscriptores.` });
          
          if (editingProfile) {
            const currentStatus = { ...(editingProfile.media_status || {}) };
            currentStatus[mediaUrl] = 1;
            setEditingProfile({ ...editingProfile, media_status: currentStatus });
          }
          fetchData();
        } else {
        setMessage({ type: 'error', text: data.error || 'Error al iniciar difusión' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al intentar enviar la difusión masiva.' });
    }
  };

const handleUpdateMediaDescription = async (photoUrl: string, descriptionText: string) => {
    if (!editingProfile) return;
    const currentDesc = { ...(editingProfile.media_descriptions || {}) };
    if (descriptionText.trim()) {
      currentDesc[photoUrl] = descriptionText.trim();
    } else {
      delete currentDesc[photoUrl];
    }
    const updatedProfile = { ...editingProfile, media_descriptions: currentDesc };
    setEditingProfile(updatedProfile);
    try {
      const res = await adminFetch(`/api/admin/profiles/${editingProfile.id}`, token, {
        method: 'PUT',
        json: { media_descriptions: currentDesc }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Descripción de este archivo guardada con éxito.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al guardar descripción del archivo' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar descripción' });
    }
  };

  return (
              <div className="w-full max-w-2xl mx-auto space-y-2.5 sm:space-y-3.5">
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>{editingProfile ? `Perfil VIP: ${editingProfile.name}` : 'Perfil VIP'}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const target = editingProfile || (profiles.length > 0 ? profiles[0] : null);
                        if (target && !editingProfile) {
                          setEditingProfile(target);
                          setFormData({
                            name: target.name, age: target.age ?? 18, zone: target.zone,
                            description: target.description, rate_bs: target.rate_bs ?? 0,
                            commission_bs: 0, status: target.status,
                            priority_order: target.priority_order || 0
                          });
                        }
                        const targetDesc = target?.description || formData.description;
                        if (targetDesc) {
                          setUploadComment(targetDesc);
                        }
                        setProfileStep(2);
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-md shadow-amber-500/20 font-sans"
                      title="Carga directa de contenido al servidor"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>⚡ Carga Directa de Contenido</span>
                    </button>
                  </div>
                </div>

                {/* ── 3-STEP WIZARD NAVIGATION ── */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 text-xs shadow-inner">
                  <button
                    type="button"
                    onClick={() => setProfileStep(1)}
                    className={`py-2 px-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      profileStep === 1
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>1. Datos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingProfile && !formData.name.trim()) {
                        setMessage({ type: 'error', text: 'Por favor ingresa primero el nombre del perfil.' });
                        return;
                      }
                      if (formData.description) {
                        setUploadComment(formData.description);
                      }
                      setProfileStep(2);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      profileStep === 2
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>2. Cargar Archivos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingProfile && !formData.name.trim()) {
                        setMessage({ type: 'error', text: 'Completa primero los datos del perfil.' });
                        return;
                      }
                      setProfileStep(3);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      profileStep === 3
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>3. Vista previa</span>
                  </button>
                </div>

                {/* ── PASO 1: DATOS BÁSICOS ── */}
                {profileStep === 1 && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSaveProfile(e);
                    if (formData.description) {
                      setUploadComment(formData.description);
                    }
                    setProfileStep(2);
                  }} className="space-y-3 text-xs">
                    <div className="p-3.5 sm:p-5 bg-zinc-950/90 border border-zinc-850 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900">
                        <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                          <User className="w-4 h-4 text-amber-400" /> Paso 1: Información Principal
                        </h4>
                        <span className="text-[10px] text-zinc-500">Datos públicos</span>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-semibold">Nombre Público *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          placeholder="Ej: Danii VIP"
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                            <span>🇧🇴 Precio Suscripción VIP (Bs.)</span>
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Solo Clientes Bolivia</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          value={formData.rate_bs}
                          placeholder="Ej: 120 o 350"
                          onChange={(e) => setFormData({ ...formData, rate_bs: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors font-bold"
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          Este monto solo se mostrará a los clientes que seleccionen el país "Bolivia" en la Mini App.
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-zinc-400 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Mi descripción
                          </label>
                          <div className="flex items-center gap-2.5">
                            <EmojiPickerPopover
                              token={token}
                              onInsertEmoji={(tag) => {
                                if (!editingDescription) setEditingDescription(true);
                                insertEmojiIntoDescription(tag, 'form');
                              }}
                              textareaRef={formDescTextareaRef}
                            />
                            <span className="text-[10px] text-rose-400 font-bold">* Obligatorio</span>
                            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                              <input
                                type="checkbox"
                                checked={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 cursor-pointer"
                              />
                              <span>{editingDescription ? 'Editar' : 'Locked'}</span>
                            </label>
                          </div>
                        </div>
                        <textarea
                          ref={formDescTextareaRef}
                          name="formDescription"
                          rows={4}
                          value={formData.description}
                          placeholder="Ej: 🔥 Nueva sesión exclusiva en lencería de seda... 💫 15 fotos + 2 videos HD. Esta descripción se publica en Telegram y se muestra en la Mini App."
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          onKeyDown={handleTabKeyDown}
                          readOnly={!editingDescription}
                          className={`w-full px-3 py-2.5 ${editingDescription ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800/40 opacity-80'} rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-y transition-colors text-xs leading-relaxed whitespace-pre-wrap font-sans`}
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          {editingDescription && (
                            <button
                              type="button"
                              disabled={savingDescriptionOnly}
                              onClick={handleSaveDescriptionOnly}
                              className="py-2 px-3 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-xs shadow-md disabled:opacity-50"
                            >
                              {savingDescriptionOnly ? 'Guardando...' : 'Guardar descripción'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading || !formData.name.trim()}
                        className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Guardar y Continuar a Galería (Paso 2) ➔
                      </button>
                    </div>
                  </form>
                )}

                {/* ── PASO 2: CARGAR / SUBIR Y GESTIONAR MULTIMEDIA ── */}
                {profileStep === 2 && (() => {
                  const photos = editingProfile?.photos || [];
                  const activePhotos = photos.filter(u => (editingProfile?.media_status?.[u] || 2) === 1);
                  const displayedPhotos = photos;

                  return (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 sm:p-5 bg-zinc-950/90 border border-zinc-850 rounded-xl sm:rounded-2xl space-y-3 shadow-md">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900">
                          <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                            <Upload className="w-4 h-4 text-amber-400" /> Paso 2: Gestión y Carga de Multimedia
                          </h4>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>{photos.length} Publicadas</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>0 Sin Publicar</span>
                            </span>
                          </div>
                        </div>

                        {/* Selector de Pestañas de Carga: Free / VIP / Bot */}
                        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setStep2Tab('free')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              step2Tab === 'free'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Free</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep2Tab('vip')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              step2Tab === 'vip'
                                ? 'bg-linear-to-r from-amber-500 to-amber-600 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span>VIP Stars</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep2Tab('bot')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              step2Tab === 'bot'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Bot className="w-3.5 h-3.5 shrink-0" />
                            <span>Bot</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowHelpGuide(true)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition-colors cursor-pointer shrink-0"
                            title="Ver guía práctica de carga"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* ── SUB-PESTAÑA 1: SUBIR CONTENIDO FREE ── */}
                        {step2Tab === 'free' && (
                          <div className="space-y-3.5 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850">
                            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                              <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                                <span>🟢</span> Contenido Free
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium">Publicación directa en Canal Free</span>
                            </div>

                            <p className="text-[11px] text-zinc-300 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-3 py-2">
                              Elige el archivo y pulsa una sola vez para aplicar la marca, guardar su URL en B2 y publicarlo en Canal Free.
                            </p>
                            {(operatingMode !== 'bot_and_channel' || !channelIdInput) && (
                              <p className="text-[11px] text-amber-200 rounded-lg bg-amber-950/40 border border-amber-500/30 px-3 py-2">
                                Para publicar en Canal Free, activa <strong>Híbrido (Bot + Canal)</strong> y configura el canal en la pestaña Telegram. No se subirá nada hasta que esté listo.
                              </p>
                            )}

                                                        {/* MARCA DE AGUA */}
                            <div className="p-3 bg-zinc-900/80 border border-zinc-700/80 rounded-xl space-y-2.5 mb-3">
                              <div className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={watermarkEnabled}
                                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                />
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                  Marca de agua para fotos
                                </span>
                              </div>
                              <input
                                type="text"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="Iam Danii VIP"
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-emerald-500"
                              />
                              <p className="text-[10px] text-zinc-500">Predeterminada: “Iam Danii VIP”. Los videos se publican sin modificar.</p>
                            </div>

                            {/* Selector de archivos para subir */}
                            <div className="flex flex-col gap-2.5">
                              <label className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 text-emerald-400 font-bold text-sm cursor-pointer transition-all active:scale-95 text-center">
                                <Upload className="w-5 h-5 shrink-0" />
                                <span>
                                  {selectedPhotoFiles && selectedPhotoFiles.length > 0
                                    ? `${selectedPhotoFiles.length} archivo(s) seleccionado(s)`
                                    : 'Seleccionar fotos o videos Free para Telegram'}
                                </span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,image/*,video/*"
                                  onChange={(e) => {
                                    setSelectedPhotoFiles(e.target.files);
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      setFreePreviewUrl(URL.createObjectURL(file));
                                      setFreePreviewType(file.type.startsWith('video/') ? 'video' : 'image');
                                    } else {
                                      setFreePreviewUrl(null);
                                      setFreePreviewType(null);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {/* Vista Previa */}
                              {freePreviewUrl && (
                              <div className="relative w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-zinc-700 bg-black">
                                  {freePreviewType === 'video' ? (
                                    <video src={freePreviewUrl} className="w-full h-auto max-h-48 object-contain" controls />
                                  ) : (
                                    <img src={freePreviewUrl} alt="Vista Previa" className="w-full h-auto max-h-48 object-contain" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPhotoFiles(null);
                                      setFreePreviewUrl(null);
                                      setFreePreviewType(null);
                                    }}
                                    className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                                    title="Cancelar Selección"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Descripción de la publicación Free replicada de Paso 1 */}
                            <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <label className="flex items-center gap-1.5 font-semibold text-zinc-300">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                  Descripción de la publicación <span className="text-rose-400 font-bold">(Obligatoria)</span>
                                </label>
                                <div className="flex items-center gap-2.5">
                                  <EmojiPickerPopover
                                    token={token}
                                    onInsertEmoji={(tag) => insertEmojiIntoDescription(tag, 'upload')}
                                    textareaRef={uploadCommentTextareaRef}
                                  />
                                  {formData.description && formData.description.trim() !== uploadComment.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => setUploadComment(formData.description)}
                                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer transition-colors flex items-center gap-1"
                                      title="Replicar exactamente la descripción guardada en el Paso 1"
                                    >
                                      <span>🔄 Replicar descripción del Paso 1</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                ref={uploadCommentTextareaRef}
                                name="uploadComment"
                                rows={4}
                                value={uploadComment}
                                onChange={(e) => setUploadComment(e.target.value)}
                                onKeyDown={handleTabKeyDown}
                                required
                                aria-required="true"
                                placeholder="Escribe o edita el texto que acompañará la publicación en Canal Free (admite párrafos, saltos de línea y sangrías)..."
                                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500 resize-y leading-relaxed whitespace-pre-wrap font-sans transition-colors"
                              />
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-850">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={uploadSugestiva}
                                    onChange={(e) => setUploadSugestiva(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                                    <Flame className={`w-3.5 h-3.5 ${uploadSugestiva ? 'text-rose-400' : 'text-zinc-500'}`} />
                                    Marcar como Sugestiva / Efímera
                                  </span>
                                </label>

                                {uploadSugestiva && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-400 font-semibold">Revelar por:</span>
                                    {[5, 10, 15, 30].map((sec) => (
                                      <button
                                        key={sec}
                                        type="button"
                                        onClick={() => setUploadDuration(sec)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                          uploadDuration === sec
                                            ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-105'
                                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                        }`}
                                      >
                                        {sec}s
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {editingProfile && selectedPhotoFiles && selectedPhotoFiles.length > 0 && (
                              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleUploadPhotos(editingProfile.id)}
                                  disabled={uploadingPhotos || sendingDraftToBot || !uploadComment.trim() || !watermarkEnabled || watermarkText.trim() === ''}
                                  className="flex-1 py-3.5 px-4 rounded-xl font-extrabold text-xs cursor-pointer shrink-0 shadow-lg flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 disabled:opacity-60 transition-all"
                                >
                                  <HardDrive className="w-4 h-4" />
                                  {uploadingPhotos
                                    ? 'Subiendo a Telegram...'
                                    : '🚀 Publicar en Canal Free'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendDraftToBot(editingProfile.id)}
                                  disabled={uploadingPhotos || sendingDraftToBot || !uploadComment.trim() || !watermarkEnabled || watermarkText.trim() === ''}
                                  className="flex-1 py-3.5 px-4 rounded-xl font-extrabold text-xs cursor-pointer shrink-0 shadow-lg flex items-center justify-center gap-2 bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-600/20 disabled:opacity-60 transition-all"
                                  title="Guarda el contenido y lo envía a tu chat privado con el bot para editar la descripción con emojis Premium antes de publicarlo"
                                >
                                  <Smile className="w-4 h-4 text-pink-200" />
                                  {sendingDraftToBot ? 'Enviando al Bot...' : '📝 Enviar a Borrador (Chat Bot Emojis)'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
{/* ── SUB-PESTAÑA 2: SUBIR CONTENIDO VIP ── */}
                        {step2Tab === 'vip' && (
                          <div className="space-y-3.5 bg-linear-to-br from-amber-500/10 via-zinc-900/60 to-zinc-950 p-3 sm:p-4 rounded-xl border border-amber-500/30">
                            {/* Indicador de Etapa Compacto */}
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                              <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                                <Star className="w-3.5 h-3.5 fill-current" /> Contenido VIP Stars
                              </span>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {vipPhase === 'upload' && 'Paso 1: Guardar'}
                                {vipPhase === 'preview' && 'Paso 2: Previsualizar'}
                                {vipPhase === 'edit' && 'Paso 3: Editar precio'}
                              </span>
                            </div>

                            {/* FASE A: GUARDAR (SUBIR) */}
                            {vipPhase === 'upload' && (
                              <div className="space-y-3.5">

                                {/* Selector de 1 archivo VIP */}
                                <div className="flex flex-col gap-2.5">
                                  <label className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border-2 border-dashed border-amber-500/50 hover:border-amber-500 text-amber-400 font-bold text-sm cursor-pointer transition-all active:scale-95 text-center">
                                    <Upload className="w-5 h-5 shrink-0" />
                                    <span>
                                      {vipFile ? `Archivo: ${vipFile.name}` : 'Seleccionar Foto o Video VIP (uno por uno)'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,image/*,video/*"
                                      onChange={(e) => {
                                        setVipFile(e.target.files ? e.target.files[0] : null);
                                        if (e.target.files && e.target.files[0]) {
                                          const file = e.target.files[0];
                                          setVipPreviewUrl(URL.createObjectURL(file));
                                          setVipPreviewType(file.type.startsWith('video/') ? 'video' : 'image');
                                        } else {
                                          setVipPreviewUrl(null);
                                          setVipPreviewType(null);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>

                                  {/* Vista Previa */}
                                  {vipPreviewUrl && (
                                    <div className="relative w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-amber-500/50 bg-black shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                      {vipPreviewType === 'video' ? (
                                        <video src={vipPreviewUrl} className="w-full h-auto max-h-48 object-contain" controls />
                                      ) : (
                                        <img src={vipPreviewUrl} alt="Vista Previa" className="w-full h-auto max-h-48 object-contain" />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setVipFile(null);
                                          setVipPreviewUrl(null);
                                          setVipPreviewType(null);
                                        }}
                                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                                        title="Cancelar Selección"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Selector de Estrellas */}
                                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 mt-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                                      <Star className="w-3.5 h-3.5 fill-current" /> Precio en Estrellas de Telegram:
                                    </label>
                                    <span className="font-mono text-xs font-black text-amber-300">⭐ {vipStarCount}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {[10, 25, 50, 100, 250, 500].map((stars) => (
                                      <button
                                        key={stars}
                                        type="button"
                                        onClick={() => setVipStarCount(stars)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          vipStarCount === stars
                                            ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20 scale-105'
                                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                        }`}
                                      >
                                        ⭐ {stars}
                                      </button>
                                    ))}
                                    <input
                                      type="number"
                                      min={1}
                                      max={2500}
                                      value={vipStarCount}
                                      onChange={(e) => setVipStarCount(e.target.value === '' ? '' : Math.max(1, Math.min(2500, Number(e.target.value))))}
                                      placeholder="Otro"
                                      className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs text-center focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </div>

                                {/* Descripción / Leyenda VIP */}
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                      Descripción o Leyenda Exclusiva del Contenido VIP:
                                    </label>
                                    <EmojiPickerPopover
                                      token={token}
                                      onInsertEmoji={(tag) => setVipCaption((prev) => (prev || '') + tag)}
                                    />
                                  </div>
                                  <textarea
                                    name="vipCaption"
                                    rows={3}
                                    value={vipCaption}
                                    onChange={(e) => setVipCaption(e.target.value)}
                                    onKeyDown={handleTabKeyDown}
                                    placeholder="Ej: 💎 Video VIP sin censura en ultra alta definición... Desbloquea ahora con Telegram Stars."
                                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500 resize-y leading-relaxed whitespace-pre-wrap font-sans transition-colors"
                                  />
                                </div>

                                {editingProfile && vipFile && (
                                  <button
                                    type="button"
                                    onClick={() => handleUploadVipMedia(editingProfile.id)}
                                    disabled={uploadingVip}
                                    className="w-full py-3 px-5 rounded-xl font-extrabold text-sm cursor-pointer bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all mt-3"
                                  >
                                    <HardDrive className="w-5 h-5" />
                                    {uploadingVip ? 'Guardando en Telegram...' : '💾 Guardar en Telegram y DB ➔'}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* FASE B: PREVISUALIZAR Y EDITAR */}
                            {(vipPhase === 'preview' || vipPhase === 'edit') && vipDraftMediaUrl && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    Previsualización del Paywall de Telegram (Lo que verá el cliente)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVipDraftMediaUrl(null);
                                      setVipFile(null);
                                      setVipCaption('');
                                      setVipPhase('upload');
                                    }}
                                    className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                                  >
                                    + Subir otro archivo
                                  </button>
                                </div>

                                {/* Tarjeta Simulada con Blur y Candado */}
                                <div className="max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-zinc-950 shadow-2xl relative">
                                  <div className="relative aspect-video w-full bg-zinc-900">
                                    {isVideoUrl(vipDraftMediaUrl) ? (
                                      <div className="w-full h-full flex items-center justify-center blur-md opacity-50 bg-black">
                                        <div className="w-12 h-12 rounded-full border-4 border-amber-500 flex items-center justify-center">
                                          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-3 border-l-amber-500 border-b-8 border-b-transparent ml-1"></div>
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={vipDraftMediaUrl} className="w-full h-full object-cover blur-xl opacity-60" alt="Preview VIP" />
                                    )}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                                      <Lock className="w-10 h-10 text-white mb-2" />
                                      <span className="text-white font-bold px-4 py-1.5 rounded-full bg-black/60 border border-white/20">
                                        Contenido Oculto
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{vipCaption || 'Contenido VIP exclusivo.'}</p>
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full py-2.5 rounded-xl font-extrabold text-sm bg-zinc-800 text-amber-500 flex items-center justify-center gap-2 border border-zinc-700/50"
                                    >
                                      <span>Desbloquear con</span>
                                      <span className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">
                                        ⭐ {vipStarCount}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setVipPhase('upload')}
                                    className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
                                  >
                                    ← Atrás (Subir otro)
                                  </button>
                                  {editingProfile && (
                                    <button
                                      type="button"
                                      onClick={() => handlePublishVipMedia(editingProfile.id)}
                                      disabled={publishingVip}
                                      className="flex-1 py-3 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                                    >
                                      <Send className="w-4 h-4" />
                                      {publishingVip ? 'Publicando...' : 'Publicar Ahora ➔'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
{/* ── SUB-PESTAÑA 3: CONTENIDO / BOT (BIBLIOTECA SIN PUBLICAR) ── */}
                        {step2Tab === 'bot' && (
                          <div className="space-y-4 bg-zinc-900/50 p-4 rounded-xl border border-indigo-500/30">
                            <div className="space-y-1">
                              <h5 className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                                <Bot className="w-4 h-4" /> Biblioteca de Multimedia para el Bot
                              </h5>
                              <p className="text-[11px] text-zinc-300">
                                Sube contenido multimedia directamente a los servidores de Telegram para uso del bot <strong>sin publicar al canal ni a la Mini App cliente</strong>. El bot lo despachará automáticamente cuando sea programado.
                              </p>
                            </div>

                            {/* Formulario de Subida para el Bot */}
                            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                    Categoría / Función del Bot:
                                  </label>
                                  <select
                                    value={botCategory}
                                    onChange={(e) => setBotCategory(e.target.value as BotMediaCategory)}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="bienvenida">🎉 Mensaje de Bienvenida (/start)</option>
                                    <option value="auto_reply">💬 Respuesta Automática a Consultas</option>
                                    <option value="vip_privado">🔒 Contenido Privado VIP (Chat Privado)</option>
                                    <option value="drip">⏳ Drip / Campaña Programada</option>
                                    <option value="general">📁 General / Soporte</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                    Texto / Leyenda del Bot (Opcional):
                                  </label>
                                  <input
                                    type="text"
                                    value={botCaption}
                                    onChange={(e) => setBotCaption(e.target.value)}
                                    placeholder="Ej: Mensaje enviado automáticamente al saludar..."
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                                <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border-2 border-dashed border-indigo-500/50 hover:border-indigo-500 text-indigo-400 font-bold text-xs cursor-pointer transition-all active:scale-95 text-center">
                                  <Upload className="w-4 h-4 shrink-0" />
                                  <span>
                                    {botFile ? `Archivo: ${botFile.name}` : 'Seleccionar Foto o Video para el Bot'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,image/*,video/*"
                                    onChange={(e) => setBotFile(e.target.files ? e.target.files[0] : null)}
                                    className="hidden"
                                  />
                                </label>

                                {botFile && (
                                  <button
                                    type="button"
                                    onClick={handleUploadBotMedia}
                                    disabled={uploadingBotMedia}
                                    className="py-3 px-5 rounded-xl font-extrabold text-xs cursor-pointer shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all"
                                  >
                                    <HardDrive className="w-4 h-4" />
                                    {uploadingBotMedia ? 'Subiendo a Telegram...' : '📥 Guardar en Biblioteca del Bot'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Galería de la Biblioteca del Bot */}
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                  <span>📦</span> Archivos Guardados en Biblioteca del Bot ({botQueue.length})
                                </span>
                                <span className="text-[10px] text-zinc-500">Listos para despachar por el bot</span>
                              </div>

                              {initialLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-hidden="true">
                                  {[0,1,2,3].map(i => <TileSkeleton key={i} aspectClass="aspect-video" />)}
                                </div>
                              ) : botQueue.length === 0 ? (
                                <div className="p-6 text-center bg-zinc-950 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                                  Aún no hay archivos en la biblioteca del bot. Sube uno arriba para guardarlo.
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {botQueue.map((item) => (
                                    <div
                                      key={item.id}
                                      className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col group"
                                    >
                                      <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                                        {isVideoUrl(item.media_url) ? (
                                          <video src={item.media_url} className="w-full h-full object-cover" muted playsInline />
                                        ) : (
                                          <img src={item.media_url} alt={item.caption || 'Bot Media'} className="w-full h-full object-cover" />
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteBotMedia(item.id)}
                                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow transition-opacity cursor-pointer opacity-80 group-hover:opacity-100"
                                          title="Eliminar de la biblioteca del bot"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <div className="p-2 space-y-1 text-[10px]">
                                        <div className="flex items-center justify-between">
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold uppercase tracking-wider text-[9px]">
                                            {item.category}
                                          </span>
                                          <span className="text-zinc-500">
                                            {new Date(item.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {item.caption && (
                                          <p className="text-zinc-300 truncate" title={item.caption}>
                                            {item.caption}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Separación y Filtros de Contenido */}
                        {photos.length > 0 ? (
                          <div className="space-y-3.5 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowProfileGallery(prev => !prev)}
                              aria-expanded={showProfileGallery}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:border-amber-500/50 font-bold text-xs transition-colors cursor-pointer"
                            >
                              {showProfileGallery ? 'Ocultar galería' : 'Ver galería'}
                            </button>
                            {showProfileGallery && (
                            <div className="space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-900 gap-2">
                              <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => {}}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                    false
                                      ? 'bg-emerald-600 text-white shadow'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  <span>Publicadas ({photos.length})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {}}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                    false
                                      ? 'bg-amber-500 text-zinc-950 shadow'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  <span>Sin Publicar (0)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {}}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                    true
                                      ? 'bg-zinc-700 text-white shadow'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  <span>Todos ({photos.length})</span>
                                </button>
                              </div>
                              <span className="text-[10px] text-zinc-500">Toca un archivo para ver detalles o cambiar su estado</span>
                            </div>

                            {initialLoading ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-hidden="true">
                                {[0,1,2,3,4,5,6,7].map(i => <TileSkeleton key={i} />)}
                              </div>
                            ) : displayedPhotos.length === 0 ? (
                              <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-850 rounded-2xl text-zinc-500 text-xs">
                                No hay archivos en este filtro.
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {displayedPhotos.map((photoUrl, idx) => {
                                  const isEphemeral = Boolean(editingProfile?.ephemeral_config?.[photoUrl]?.enabled);
                                  const duration = editingProfile?.ephemeral_config?.[photoUrl]?.duration_seconds || 5;
                                  const hasDescription = Boolean(editingProfile?.media_descriptions?.[photoUrl]);
                                  const isCover = editingProfile?.photos?.[0] === photoUrl;

                                  return (
                                    <div
                                      key={photoUrl}
                                      onClick={() => {
                                        setEnlargedMediaUrl(photoUrl);
                                        setTempDescText(editingProfile?.media_descriptions?.[photoUrl] || '');
                                      }}
                                      className="group relative rounded-2xl overflow-hidden border border-zinc-800 hover:border-amber-500/70 bg-zinc-900 flex flex-col cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98]"
                                    >
                                      <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                                        {isVideoUrl(photoUrl) ? (
                                          <video src={photoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                        ) : (
                                          <img src={photoUrl} alt={`Foto ${idx + 1}`} draggable={false} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        )}

                                        {/* Status Badge Superior Izquierdo */}
                                        <div className="absolute top-2 left-2 z-10">
                                          
                                        </div>

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-center p-2">
                                          <span className="p-2 rounded-full bg-amber-500 text-zinc-950 shadow-lg">
                                            <Maximize2 className="w-4 h-4" />
                                          </span>
                                          <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                                            Detalles / Estado
                                          </span>
                                        </div>

                                        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1 z-10 pointer-events-none">
                                          {isCover && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow">
                                              Portada
                                            </span>
                                          )}
                                          {isEphemeral && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-black text-[9px] flex items-center gap-0.5 shadow">
                                              <Flame className="w-2.5 h-2.5" /> {duration}s
                                            </span>
                                          )}
                                          {hasDescription && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white font-black text-[9px] flex items-center gap-0.5 shadow" title="Tiene descripción">
                                              <MessageSquare className="w-2.5 h-2.5" />
                                            </span>
                                          )}
                                        </div>

                                        {/* Botón Borrar Definitivamente del Servidor */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMediaPermanently(photoUrl);
                                          }}
                                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-md transition-opacity cursor-pointer z-20 opacity-80 group-hover:opacity-100"
                                          title="Borrar definitivamente del servidor"
                                          aria-label="Borrar definitivamente del servidor"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-zinc-500 italic text-center py-6">No hay fotos ni videos cargados aún. Selecciona archivos arriba para comenzar.</p>
                        )}
                      </div>

                      {editingProfile && photos.length > 0 && (!selectedPhotoFiles || selectedPhotoFiles.length === 0) && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={sendingDraftToBot}
                            onClick={() => handleSendDraftToBot(editingProfile.id)}
                            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 disabled:opacity-50"
                            title="Enviar el contenido cargado a tu chat privado con el bot para editar la descripción con emojis Premium"
                          >
                            <Smile className="w-4 h-4 text-pink-200" />
                            {sendingDraftToBot ? 'Enviando al Bot...' : '📝 Enviar Contenido a Borrador (Chat Bot Emojis)'}
                          </button>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setProfileStep(1)}
                          className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" /> Volver a Datos
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileStep(3)}
                          className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          Continuar para ver la vista previa (Paso 3) ➔
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── PASO 3: VER PARA PUBLICAR (DETALLES Y GESTIÓN DE STATUS) ── */}
                {profileStep === 3 && (() => {
                  const photos = editingProfile?.photos || [];
                  const displayedPhotos = photos;

                  return (
                    <div className="space-y-4 text-xs">
                      {/* Resumen del Perfil */}
                      <div className="p-5 bg-linear-to-br from-amber-500/10 via-zinc-950 to-zinc-950 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-xl shadow-amber-500/5">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                          <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                          <Eye className="w-4 h-4 text-amber-400" /> Paso 3: Vista previa
                          </h4>
                          <div className="flex items-center gap-1.5">
                            
                          </div>
                        </div>

                        {publishedPostUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2" aria-live="polite">
                            {publishedPostUrls.map((postUrl, index) => (
                              <a
                                key={postUrl}
                                href={postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {publishedPostUrls.length === 1 ? 'Ver publicación en Canal Free' : `Ver publicación ${index + 1} en Canal Free`}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Metadatos Rápidos */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-[11px]">
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Perfil</span>
                            <span className="font-bold text-white truncate block">{formData.name || 'Sin nombre'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Tarifa VIP</span>
                            <span className="font-bold text-amber-400">Bs. {formData.rate_bs || 0}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Modo Operativo</span>
                            <span className="font-bold text-zinc-300 truncate block">
                              {operatingMode === 'solo_bot' ? 'Solo Bot (Privado)' : 'Híbrido (Bot + Canal)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Total Archivos</span>
                            <span className="font-bold text-zinc-200">{photos.length} archivo(s)</span>
                          </div>
                        </div>

                        {/* Previsualizar Pantallas antes de Publicar */}
                        <div className="p-3.5 bg-linear-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-amber-400" /> Previsualizar Pantallas antes de Publicar
                            </h5>
                            <p className="text-[11px] text-zinc-400">
                              Mira exactamente cómo verán los clientes este perfil en la Mini App y cómo saldrá el post en Telegram.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewModeModal('miniapp')}
                              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                            >
                              <span>📱 Ver Mini App</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewModeModal('telegram')}
                              className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-sky-400 font-bold text-xs border border-sky-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                            >
                              <span>📢 Ver Telegram</span>
                            </button>
                          </div>
                        </div>

                        {/* Pestañas de Filtrado de Estado */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            {/* Acciones Masivas */}
                            {photos.length > 0 && (
                              <div className="flex items-center gap-2">
                                
                              </div>
                            )}
                          </div>

                          {/* Grid Multimedia con Detalles y Acciones */}
                          {displayedPhotos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                              {displayedPhotos.map((photoUrl, idx) => {
                                
                                const isCover = editingProfile?.photos?.[0] === photoUrl;
                                const isEphemeral = Boolean(editingProfile?.ephemeral_config?.[photoUrl]?.enabled);
                                const duration = editingProfile?.ephemeral_config?.[photoUrl]?.duration_seconds || 5;
                                const desc = editingProfile?.media_descriptions?.[photoUrl] || '';

                                return (
                                  <div
                                    key={photoUrl}
                                    className={`relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col transition-all shadow-md hover:border-emerald-500/50`}
                                  >
                                    {/* Thumbnail Visual */}
                                    <div
                                      onClick={() => {
                                        setEnlargedMediaUrl(photoUrl);
                                        setTempDescText(desc);
                                      }}
                                      className="relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden group"
                                    >
                                      {isVideoUrl(photoUrl) ? (
                                        <video src={photoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                      ) : (
                                        <img src={photoUrl} alt={`Archivo ${idx + 1}`} draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      )}

                                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                                        <span className="p-1.5 rounded-full bg-black/60 text-white group-hover:scale-110 transition-transform">
                                          <Sliders className="w-3.5 h-3.5" />
                                        </span>
                                      </div>

                                      

                                      {/* Tags Inferiores */}
                                      <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1 z-10">
                                        {isCover && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow">
                                            ⭐ Portada
                                          </span>
                                        )}
                                        {isEphemeral && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-black text-[9px] flex items-center gap-0.5 shadow">
                                            <Flame className="w-2.5 h-2.5" /> {duration}s
                                          </span>
                                        )}
                                        {editingProfile?.media_stars?.[photoUrl] && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-black text-[9px] flex items-center gap-0.5 shadow">
                                            ⭐ {editingProfile.media_stars[photoUrl]} Stars
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Detalles & Configuración de este Archivo */}
                                    <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-zinc-400 font-semibold flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3 text-amber-400" /> Descripción:
                                          </span>
                                          {desc ? (
                                            <span className="text-zinc-300 font-mono text-[9px] truncate max-w-35 italic">
                                              "{desc}"
                                            </span>
                                          ) : (
                                            <span className="text-zinc-600 italic text-[9px]">Sin descripción</span>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-zinc-400 font-semibold flex items-center gap-1">
                                            <Flame className="w-3 h-3 text-rose-400" /> Modo Sugestivo:
                                          </span>
                                          <span className="text-zinc-300 text-[9px]">
                                            {isEphemeral ? `${duration} segundos` : 'Desactivado'}
                                          </span>
                                        </div>
                                        {editingProfile?.media_stars?.[photoUrl] && (
                                          <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Cobro en Canal:
                                            </span>
                                            <span className="text-amber-300 font-bold text-[9px]">
                                              ⭐ {editingProfile.media_stars[photoUrl]} Estrellas
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Botones de Acción Individuales */}
                                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800">
                                        

                                        <button
                                          type="button"
                                          onClick={() => handleOpenPublishPaidModal(photoUrl)}
                                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1"
                                          title="Publicar de Pago en Canal VIP (Cobro con Telegram Stars)"
                                        >
                                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                          <span className="text-[10px] font-bold hidden sm:inline">⭐ Pago</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEnlargedMediaUrl(photoUrl);
                                            setTempDescText(desc);
                                          }}
                                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                                          title="Editar descripción y modo sugestivo"
                                        >
                                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMediaPermanently(photoUrl)}
                                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 border border-rose-800/40 transition-colors cursor-pointer"
                                          title="Eliminar definitivamente del servidor"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-8 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl text-center space-y-2">
                              <p className="text-zinc-400 font-semibold">
                                No hay archivos cargados.
                              </p>
                              <p className="text-zinc-500 text-[10px]">
                                Usa el paso anterior para subir contenido a tu perfil.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-center text-[11px] text-emerald-200">
                          El contenido Free se publica en el canal en el mismo paso en que lo subes. No necesitas volver a publicarlo aquí.
                        </div>
                      </div>

                      {/* Footer Navegación */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => setProfileStep(2)}
                          className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" /> Volver a Cargar (Paso 2)
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={async (e) => {
                            await handleSaveProfile(e);
                            setMessage({ type: 'success', text: 'Borrador guardado exitosamente.' });
                          }}
                          className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <HardDrive className="w-4 h-4 text-zinc-400" /> Guardar Borrador
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* MODAL SIMULADOR PREVISUALIZADOR DE PANTALLAS (MINI APP & TELEGRAM) */}
                {previewModeModal && (() => {
                  const pPhotos = editingProfile?.photos || [];
                  const displayList = pPhotos;const coverMedia = pPhotos[0] || null;

                  return (
                    <div
                      className="fixed inset-0 z-70 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
                      onClick={() => setPreviewModeModal(null)}
                    >
                      <div
                        className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col my-auto max-h-[92vh]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header del Simulador */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-amber-400" />
                              Simulador de Pantallas
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setPreviewModeModal('miniapp')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                previewModeModal === 'miniapp'
                                  ? 'bg-amber-500 text-zinc-950 shadow'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              📱 Mini App
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewModeModal('telegram')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                previewModeModal === 'telegram'
                                  ? 'bg-sky-500 text-zinc-950 shadow'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              📢 Telegram
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewModeModal(null)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Contenido según pestaña */}
                        <div className="p-4 overflow-y-auto space-y-4 flex-1">
                          {previewModeModal === 'miniapp' ? (
                            /* VISTA MINI APP */
                            <div className="space-y-3">
                              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <span>Simulador: Vista en el celular del cliente</span>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-zinc-300">
                                  <input
                                    type="checkbox"
                                    checked={previewIncludeDrafts}
                                    onChange={(e) => setPreviewIncludeDrafts(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-900 text-amber-500"
                                  />
                                  Simular con todo activado
                                </label>
                              </div>

                              {/* Mobile Card */}
                              <div className="border border-zinc-800 rounded-2xl bg-zinc-900 overflow-hidden shadow-xl space-y-0">
                                {/* Portada */}
                                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                                  {coverMedia ? (
                                    isVideoUrl(coverMedia) ? (
                                      <video src={coverMedia} className="w-full h-full object-cover" controls playsInline />
                                    ) : (
                                      <img src={coverMedia} alt="Portada" className="w-full h-full object-cover" />
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sin multimedia cargada</div>
                                  )}
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow">
                                    Canal VIP Free
                                  </span>
                                </div>

                                {/* Info Perfil */}
                                <div className="p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                                        {formData.name || 'Perfil VIP'}
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">VIP</span>
                                      </h3>
                                      <p className="text-[10px] text-zinc-400">Contenido Exclusivo • Acceso Total</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-sm font-black text-amber-400">Bs. {formData.rate_bs || 0}</span>
                                      <span className="block text-[9px] text-zinc-500 font-medium">Suscripción</span>
                                    </div>
                                  </div>

                                  {formData.description ? (
                                    <p className="text-[11px] text-zinc-300 bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80 whitespace-pre-wrap leading-relaxed">
                                      {formData.description}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-zinc-500 italic">Sin descripción general</p>
                                  )}

                                  {/* Galería visible */}
                                  <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                      Galería ({displayList.length} archivos):
                                    </span>
                                    {displayList.length > 0 ? (
                                      <div className="grid grid-cols-3 gap-1.5">
                                        {displayList.map((u, i) => (
                                          <div key={u} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
                                            {isVideoUrl(u) ? (
                                              <video src={u} className="w-full h-full object-cover" muted />
                                            ) : (
                                              <img src={u} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                            )}
                                            {editingProfile?.ephemeral_config?.[u]?.enabled && (
                                              <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-rose-600 text-white font-black text-[8px] flex items-center gap-0.5 shadow">
                                                <Flame className="w-2 h-2" /> {editingProfile?.ephemeral_config?.[u]?.duration_seconds || 5}s
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-zinc-500 italic text-[10px]">No hay archivos para mostrar al cliente.</p>
                                    )}
                                  </div>

                                  {/* Botón de Suscripción */}
                                  <button
                                    type="button"
                                    className="w-full py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 pointer-events-none"
                                  >
                                    💎 Suscribirse a {formData.name || 'Perfil VIP'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* VISTA TELEGRAM */
                            <div className="space-y-3">
                              <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-[11px] text-sky-300">
                                {operatingMode === 'solo_bot' ? (
                                  <>
                                    🔒 <strong>Modo A: Solo Bot (100% Privado)</strong>: En este modo confidencial, no se publica en canales públicos. Todo queda publicado únicamente en la Mini App para los suscriptores.
                                  </>
                                ) : (
                                  <>
                                    📢 <strong>Modo B: Híbrido (Bot + Canal)</strong>: Así aparecerá el post publicado en el Canal VIP Free oficial de Telegram.
                                  </>
                                )}
                              </div>

                              {/* Telegram Box */}
                              <div className="bg-[#182533] border border-[#2b394a] rounded-2xl overflow-hidden shadow-2xl space-y-0 text-white">
                                <div className="px-3.5 py-2.5 bg-[#17212b] border-b border-[#2b394a] flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-bold text-xs">
                                      VIP
                                    </div>
                                    <div>
                                      <span className="font-bold text-xs text-white block leading-tight">Canal VIP Free Oficial</span>
                                      <span className="text-[9px] text-zinc-400">Canal de Telegram</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-zinc-400 font-mono">Ahora</span>
                                </div>

                                {/* Portada Post */}
                                <div className="aspect-video w-full bg-black overflow-hidden relative">
                                  {coverMedia ? (
                                    isVideoUrl(coverMedia) ? (
                                      <video src={coverMedia} className="w-full h-full object-cover" controls playsInline />
                                    ) : (
                                      <img src={coverMedia} alt="Post Telegram" className="w-full h-full object-cover" />
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Sin imagen de portada</div>
                                  )}
                                </div>

                                {/* Caption Post */}
                                <div className="p-3.5 space-y-2 text-xs">
                                  <p className="font-bold text-amber-300">
                                    ✨ {formData.name || 'IAM Danii VIP'} • Contenido Exclusivo ✨
                                  </p>
                                  <p className="text-zinc-200 text-[11px] whitespace-pre-wrap leading-relaxed">
                                    {coverMedia && editingProfile?.media_descriptions?.[coverMedia]
                                      ? editingProfile.media_descriptions[coverMedia]
                                      : formData.description || '🔥 Nueva actualización exclusiva disponible. Toca el botón de abajo para entrar al Canal VIP Free.'}
                                  </p>
                                  <p className="text-[10px] text-amber-400/90 font-mono">
                                    Tarifa VIP: Bs. {formData.rate_bs || 0}
                                  </p>

                                  {/* Inline buttons Telegram */}
                                  <div className="pt-2 space-y-1.5">
                                    <button
                                      type="button"
                                      className="w-full py-2 px-3 rounded-lg bg-[#2b5278] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 pointer-events-none"
                                    >
                                      Ver lo Exclusivo 🔥
                                    </button>
                                    <button
                                      type="button"
                                      className="w-full py-2 px-3 rounded-lg bg-[#243447] text-[#64b5f6] font-semibold text-[10px] flex items-center justify-center gap-1.5 pointer-events-none"
                                    >
                                      💎 Solicitar Suscripción (Bs. {formData.rate_bs || 0})
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewModeModal(null)}
                            className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer transition-all"
                          >
                            Cerrar Vista Previa
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPreviewModeModal(null);
                              handlePublishToChannel(editingProfile?.id);
                            }}
                            disabled={publishing || loading}
                            className="py-2 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs cursor-pointer transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {publishing ? 'Publicando...' : '🚀 Todo Listo: Publicar Ahora'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                    {/* MODAL VISTA AMPLIADA Y CONFIGURACIÓN (SUGESTIVA & DESCRIPCIÓN) */}
                    {enlargedMediaUrl && editingProfile && (
                      <div
                        className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
                        onClick={() => setEnlargedMediaUrl(null)}
                      >
                        <div
                          className="relative w-full max-w-3xl bg-zinc-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col my-auto max-h-[95vh]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-800 bg-zinc-950/80">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-300">
                                {isVideoUrl(enlargedMediaUrl) ? '🎥 Video' : '📸 Fotografía'}
                              </span>
                              {editingProfile.photos && (
                                <span className="text-xs font-mono text-amber-400 font-bold">
                                  ({(editingProfile.photos.indexOf(enlargedMediaUrl) + 1)} de {editingProfile.photos.length})
                                </span>
                              )}
                              {editingProfile.photos?.[0] === enlargedMediaUrl && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase">
                                  ⭐ Portada Principal
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {editingProfile.photos && editingProfile.photos.length > 1 && (
                                <div className="flex items-center gap-1 mr-1">
                                  <button
                                    type="button"
                                    disabled={editingProfile.photos.indexOf(enlargedMediaUrl) <= 0}
                                    onClick={() => {
                                      const idx = editingProfile.photos!.indexOf(enlargedMediaUrl);
                                      if (idx > 0) {
                                        const prev = editingProfile.photos![idx - 1];
                                        setEnlargedMediaUrl(prev);
                                        setTempDescText(editingProfile.media_descriptions?.[prev] || '');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title="Foto anterior"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={editingProfile.photos.indexOf(enlargedMediaUrl) >= editingProfile.photos.length - 1}
                                    onClick={() => {
                                      const idx = editingProfile.photos!.indexOf(enlargedMediaUrl);
                                      if (idx < editingProfile.photos!.length - 1) {
                                        const next = editingProfile.photos![idx + 1];
                                        setEnlargedMediaUrl(next);
                                        setTempDescText(editingProfile.media_descriptions?.[next] || '');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title="Siguiente foto"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setEnlargedMediaUrl(null)}
                                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="Cerrar vista grande"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Large Media Display Container */}
                          <div className="relative flex-1 bg-black/95 flex items-center justify-center p-2 sm:p-4 min-h-55 max-h-[50vh] overflow-hidden select-none">
                            {isVideoUrl(enlargedMediaUrl) ? (
                              <video
                                src={enlargedMediaUrl}
                                controls
                                playsInline
                                autoPlay
                                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl shadow-2xl mx-auto"
                              />
                            ) : (
                              <img
                                src={enlargedMediaUrl}
                                alt="Vista ampliada"
                                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl shadow-2xl mx-auto"
                              />
                            )}

                            {/* Floating arrows */}
                            {editingProfile.photos && editingProfile.photos.indexOf(enlargedMediaUrl) > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = editingProfile.photos!.indexOf(enlargedMediaUrl);
                                  const prev = editingProfile.photos![idx - 1];
                                  setEnlargedMediaUrl(prev);
                                  setTempDescText(editingProfile.media_descriptions?.[prev] || '');
                                }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-amber-500 text-white hover:text-zinc-950 backdrop-blur-sm transition-all shadow-lg cursor-pointer"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                            )}
                            {editingProfile.photos && editingProfile.photos.indexOf(enlargedMediaUrl) < editingProfile.photos.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = editingProfile.photos!.indexOf(enlargedMediaUrl);
                                  const next = editingProfile.photos![idx + 1];
                                  setEnlargedMediaUrl(next);
                                  setTempDescText(editingProfile.media_descriptions?.[next] || '');
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-amber-500 text-white hover:text-zinc-950 backdrop-blur-sm transition-all shadow-lg cursor-pointer"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            )}
                          </div>

                          {/* Controles: Sugestiva & Descripción visibles aquí */}
                          <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800 space-y-3.5 overflow-y-auto max-h-[40vh]">
                            

                            {/* Sección Sugestiva / Efímera */}
                            {(() => {
                              const isEphemeral = Boolean(editingProfile.ephemeral_config?.[enlargedMediaUrl]?.enabled);
                              const duration = editingProfile.ephemeral_config?.[enlargedMediaUrl]?.duration_seconds || 5;

                              return (
                                <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Flame className={`w-4 h-4 ${isEphemeral ? 'text-rose-400' : 'text-zinc-400'}`} />
                                        Modo Sugestivo / Efímero
                                      </h5>
                                      <p className="text-[11px] text-zinc-400 mt-0.5">
                                        {isEphemeral
                                          ? `Activa: la imagen se muestra borrosa y solo se revela por ${duration} segundos al tocarla.`
                                          : 'Configura si esta foto es sugestiva para que requiera interacción con temporizador.'}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateEphemeral(enlargedMediaUrl, !isEphemeral, duration)}
                                      className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                                        isEphemeral
                                          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                      }`}
                                    >
                                      <Flame className="w-3.5 h-3.5" />
                                      {isEphemeral ? '🔥 Sugestiva Activa' : '⚡ Hacer Sugestiva'}
                                    </button>
                                  </div>

                                  {isEphemeral && (
                                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                                      <span className="text-[11px] text-zinc-400 font-semibold">Segundos de revelación:</span>
                                      <div className="flex items-center gap-1.5">
                                        {[5, 10, 15, 30].map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            onClick={() => handleUpdateEphemeral(enlargedMediaUrl, true, sec)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                              duration === sec
                                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-105'
                                                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                                            }`}
                                          >
                                            {sec}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Sección Descripción */}
                            <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <MessageSquare className="w-4 h-4 text-amber-400" />
                                  Descripción individual de esta foto o video
                                </h5>
                                <span className="text-[10px] text-zinc-500">
                                  Se muestra al publicar en Telegram y en la Mini App
                                </span>
                              </div>

                              <div className="space-y-2">
                                {formData.description && formData.description.trim() !== tempDescText.trim() && (
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setTempDescText(formData.description)}
                                      className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer transition-colors"
                                      title="Usar la descripción del perfil"
                                    >
                                      🔄 Replicar descripción del perfil
                                    </button>
                                  </div>
                                )}
                                <textarea
                                  name="tempDescText"
                                  rows={3}
                                  value={tempDescText}
                                  onChange={(e) => setTempDescText(e.target.value)}
                                  onKeyDown={handleTabKeyDown}
                                  placeholder="Ej: 🔥 Nueva sesión exclusiva en lencería negra (admite párrafos, saltos de línea y sangrías)..."
                                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-y leading-relaxed whitespace-pre-wrap font-sans"
                                />
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleUpdateMediaDescription(enlargedMediaUrl, tempDescText);
                                    }}
                                    className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-amber-500/10 flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Guardar Descripción
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Acciones inferiores */}
                              <div className="flex flex-col sm:flex-row flex-wrap items-stretch justify-between gap-2 pt-2 w-full">
                                <div className="flex flex-col sm:flex-row flex-wrap items-stretch gap-2 w-full sm:w-auto">
                                {editingProfile.photos && editingProfile.photos[0] !== enlargedMediaUrl && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const currentList = editingProfile.photos || [];
                                      const reordered = [enlargedMediaUrl, ...currentList.filter(p => p !== enlargedMediaUrl)];
                                      setEditingProfile({ ...editingProfile, photos: reordered });
                                      try {
                                        await adminFetch(`/api/admin/profiles/${editingProfile.id}`, token, {
                                          method: 'PUT',
                                          json: { photos: reordered }
                                        });
                                        setMessage({ type: 'success', text: '⭐ Foto seleccionada como Portada Principal' });
                                        fetchData();
                                      } catch {
                                        setMessage({ type: 'error', text: 'Error al cambiar foto de portada' });
                                      }
                                    }}
                                    className="py-3 sm:py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    ⭐ Poner como Portada
                                  </button>
                                )}

                                
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (enlargedMediaUrl) handleBroadcastMedia(enlargedMediaUrl);
                                    }}
                                    className="py-3 sm:py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                    title="Publicar en el Canal y Mini App"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Publicar (Telegram/App) 📢
                                  </button>

<button
                                  type="button"
                                  onClick={() => {
                                    if (enlargedMediaUrl) handleDeleteMediaPermanently(enlargedMediaUrl);
                                  }}
                                  className="py-3 sm:py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Borrar definitivamente del Servidor Telegram y Servidor DB"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Borrar del Servidor
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (enlargedMediaUrl) {
                                      handleOpenPublishPaidModal(enlargedMediaUrl);
                                      setEnlargedMediaUrl(null);
                                    }
                                  }}
                                  className="py-3 sm:py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Publicar de Pago en Canal con Cobro de Telegram Stars"
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  Publicar con Estrellas ⭐
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setEnlargedMediaUrl(null)}
                                className="ml-auto py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
                              >
                                Cerrar Vista
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODAL PUBLICAR CONTENIDO DE PAGO CON TELEGRAM STARS */}
                    {paidModalMediaUrl && (
                      <div
                        className="fixed inset-0 z-70 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
                        onClick={() => !publishingPaidMedia && setPaidModalMediaUrl(null)}
                      >
                        <div
                          className="relative w-full max-w-lg bg-zinc-900 border border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 flex flex-col my-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-linear-to-r from-amber-500/20 via-zinc-950 to-zinc-950">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Star className="w-5 h-5 fill-amber-400" />
                              </div>
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 font-serif">
                                  Publicar con Telegram Stars
                                </h4>
                                <p className="text-[11px] text-amber-300/80">
                                  Contenido exclusivo de pago bloqueado con candado
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={publishingPaidMedia}
                              onClick={() => setPaidModalMediaUrl(null)}
                              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Body */}
                          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Preview Container */}
                            <div className="flex items-center gap-3 p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800">
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-black shrink-0 relative border border-zinc-800">
                                {isVideoUrl(paidModalMediaUrl) ? (
                                  <video src={paidModalMediaUrl} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                  <img src={paidModalMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Lock className="w-5 h-5 text-amber-400" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                                  {isVideoUrl(paidModalMediaUrl) ? '🎥 Video de Pago' : '📸 Fotografía de Pago'}
                                </span>
                                <p className="text-xs text-zinc-300 mt-0.5">
                                  Telegram mostrará este contenido <strong>desenfocado</strong> en el Canal VIP hasta que el suscriptor pague las estrellas.
                                </p>
                              </div>
                            </div>

                            {/* Selector de Precio en Estrellas */}
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-zinc-200">
                                Precio en Telegram Stars:
                              </label>
                              {/* Presets */}
                              <div className="grid grid-cols-5 gap-1.5">
                                {[10, 25, 50, 100, 250].map((stars) => (
                                  <button
                                    key={stars}
                                    type="button"
                                    onClick={() => setPaidModalStarCount(stars)}
                                    className={`py-2 px-1 rounded-xl font-black text-xs transition-all cursor-pointer flex flex-col items-center justify-center border ${
                                      paidModalStarCount === stars
                                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/30 scale-105'
                                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750 hover:text-white'
                                    }`}
                                  >
                                    <span>{stars}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="2500"
                                    value={paidModalStarCount}
                                    onChange={(e) => setPaidModalStarCount(e.target.value === '' ? '' : Math.max(1, Math.min(2500, Number(e.target.value))))}
                                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                                  />
                                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <span className="text-xs text-zinc-400 font-semibold">Estrellas (1–2500)</span>
                              </div>
                            </div>

                            {/* Descripción / Mensaje Opcional */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-zinc-200">
                                Descripción o Mensaje del Post (Opcional):
                              </label>
                              <textarea
                                name="paidModalCaption"
                                value={paidModalCaption}
                                onChange={(e) => setPaidModalCaption(e.target.value)}
                                onKeyDown={handleTabKeyDown}
                                placeholder="Ej: 🔥 Desbloquea este contenido exclusivo con estrellas (admite párrafos y saltos de línea)..."
                                rows={3}
                                className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-y leading-relaxed whitespace-pre-wrap font-sans transition-colors"
                              />
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              disabled={publishingPaidMedia}
                              onClick={() => setPaidModalMediaUrl(null)}
                              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={publishingPaidMedia || paidModalStarCount === '' || paidModalStarCount <= 0}
                              onClick={handlePublishPaidMediaSubmit}
                              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black text-xs cursor-pointer transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                            >
                              {publishingPaidMedia ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Publicando en Canal...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>Publicar por {paidModalStarCount} Stars</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
              </div>
  );
};
