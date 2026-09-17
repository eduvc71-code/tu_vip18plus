import React, { useState, useEffect } from 'react';
import { Profile, CustomerRequest, AuditLog, SyncErrorLog, CustomButton, DynamicPoll } from '../types';
import { isVideoUrl } from './ProtectedMedia';
import {
  X,
  Lock,
  Plus,
  Edit,
  Trash2,
  Upload,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldAlert,
  Clock,
  Eye,
  Activity,
  LogOut,
  QrCode,
  Inbox,
  Banknote,
  Pin,
  Webhook,
  MessageSquare,
  Flame,
  Sparkles,
  HardDrive,
  FileVideo,
  FileImage,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  BarChart2,
  ExternalLink
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername: string;
  channelId: string;
}

type AdminTab = 'profiles' | 'requests' | 'buttons' | 'polls' | 'backups' | 'telegram' | 'audit';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  botUsername,
  channelId
}) => {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('profiles');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncErrors, setSyncErrors] = useState<SyncErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / New Form State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    zone: 'Contenido +18 VIP',
    description: '',
    rate_bs: 0,
    commission_bs: 0,
    status: 'borrador' as const,
    priority_order: 0
  });

  const [publishing, setPublishing] = useState(false);
  const [editingDescForUrl, setEditingDescForUrl] = useState<string | null>(null);
  const [tempDescText, setTempDescText] = useState<string>('');

  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<FileList | null>(null);
  const [newBotUsername, setNewBotUsername] = useState(botUsername || '');
  const [autoReplyDelay, setAutoReplyDelay] = useState('10');
  const [modelDisplayName, setModelDisplayName] = useState('');
  const [modelVipLink, setModelVipLink] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [pinnedMessageText, setPinnedMessageText] = useState('');
  const [pinnedMessageActive, setPinnedMessageActive] = useState(false);
  
  // Reply state for customer requests
  const [replyingRequestId, setReplyingRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('confirmado');
  const [sendingReply, setSendingReply] = useState(false);

  // Backup server state
  const [backups, setBackups] = useState<{ key: string; size: number; lastModified: string; name: string; url: string }[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [uploadingBackups, setUploadingBackups] = useState(false);
  const [backupFiles, setBackupFiles] = useState<FileList | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [channelIdInput, setChannelIdInput] = useState(channelId || '');
  const [channelVerified, setChannelVerified] = useState<boolean | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>('');
  const [verifyingChannel, setVerifyingChannel] = useState(false);
  const [enlargedMediaUrl, setEnlargedMediaUrl] = useState<string | null>(null);

  // Upload workflow state (comment and ephemeral before upload)
  const [uploadComment, setUploadComment] = useState('');
  const [uploadSugestiva, setUploadSugestiva] = useState(false);
  const [uploadDuration, setUploadDuration] = useState(10);

  // Custom buttons state
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [editingButton, setEditingButton] = useState<Partial<CustomButton> | null>(null);
  const [buttonFormData, setButtonFormData] = useState({
    label: '',
    url: '',
    visible_channel: true,
    visible_miniapp: true,
    is_active: true
  });
  const [savingButton, setSavingButton] = useState(false);

  // Dynamic polls state
  const [dynamicPolls, setDynamicPolls] = useState<DynamicPoll[]>([]);
  const [editingPoll, setEditingPoll] = useState<Partial<DynamicPoll> | null>(null);
  const [pollFormData, setPollFormData] = useState({
    question: '',
    options: ['', ''],
    visible_channel: true,
    visible_miniapp: true,
    publish_telegram: true
  });
  const [savingPoll, setSavingPoll] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);

  useEffect(() => {
    setNewBotUsername(botUsername || '');
  }, [botUsername]);

  useEffect(() => {
    if (channelId) setChannelIdInput(channelId);
  }, [channelId]);

  useEffect(() => {
    if (isOpen) {
      const magicToken = new URLSearchParams(window.location.search).get('admin_token') || '';
      const savedToken = localStorage.getItem('danii_admin_token') || '';
      const tokenToTry = magicToken || savedToken;

      if (tokenToTry) {
        void verifyAndAuthenticate(tokenToTry);
      } else {
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    }
  }, [isOpen]);

  const verifyAndAuthenticate = async (tok: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setToken(tok);
        setIsAuthenticated(true);
        try { localStorage.setItem('danii_admin_token', tok); } catch {}
        await fetchData(tok);
      } else {
        setIsAuthenticated(false);
        try { localStorage.removeItem('danii_admin_token'); } catch {}
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  };

  const handleLoginWithPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) return;
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        try { localStorage.setItem('danii_admin_token', data.token); } catch {}
        await fetchData(data.token);
      } else {
        setLoginError(data.error || 'Credenciales incorrectas');
      }
    } catch {
      setLoginError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (tok: string = token) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${tok}` };
      const [resP, resR, resL, resI, resB, resPolls] = await Promise.all([
        fetch('/api/admin/profiles', { headers }),
        fetch('/api/admin/requests', { headers }),
        fetch('/api/admin/logs', { headers }),
        fetch('/api/info'),
        fetch('/api/admin/buttons', { headers }),
        fetch('/api/admin/polls', { headers })
      ]);

      if (resP.ok) {
        const fetchedProfiles = await resP.json();
        setProfiles(fetchedProfiles);
        if (fetchedProfiles.length > 0) {
          const p = fetchedProfiles[0];
          setEditingProfile(p);
          setFormData({
            name: p.name, age: p.age, zone: p.zone,
            description: p.description, rate_bs: p.rate_bs,
            commission_bs: 0, status: p.status,
            priority_order: p.priority_order || 0
          });
        }
      }
      if (resR.ok) setRequests(await resR.json());
      if (resL.ok) {
        const logsData = await resL.json();
        setAuditLogs(logsData.audit_logs || []);
        setSyncErrors(logsData.sync_errors || []);
      }
      if (resB.ok) setCustomButtons(await resB.json());
      if (resPolls.ok) setDynamicPolls(await resPolls.json());
      if (resI.ok) {
        const infoData = await resI.json();
        if (infoData.auto_reply_delay_minutes !== undefined) setAutoReplyDelay(String(infoData.auto_reply_delay_minutes));
        if (infoData.qr_image_url !== undefined) setQrImageUrl(infoData.qr_image_url);
        if (infoData.pinned_message_text !== undefined) setPinnedMessageText(infoData.pinned_message_text);
        if (infoData.pinned_message_active !== undefined) setPinnedMessageActive(Boolean(infoData.pinned_message_active));
        if (infoData.channel_id) setChannelIdInput(infoData.channel_id);
        if (infoData.channel_title) setChannelTitle(infoData.channel_title);
        if (infoData.model_display_name !== undefined) setModelDisplayName(infoData.model_display_name || '');
        if (infoData.model_vip_link !== undefined) setModelVipLink(infoData.model_vip_link || '');
      }
      
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar datos administrativos' });
    } finally {
      setLoading(false);
      void fetchBackups(tok);
      void fetchChannelStatus(tok);
    }
  };

  const fetchChannelStatus = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/settings/channel', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channel_id) setChannelIdInput(data.channel_id);
        setChannelVerified(data.verified);
        setChannelTitle(data.title || '');
      }
    } catch {
      // ignore
    }
  };

  const fetchBackups = async (authToken = token) => {
    if (!authToken) return;
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/admin/backups', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleUploadBackups = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFiles || backupFiles.length === 0) return;
    setUploadingBackups(true);
    setMessage(null);
    try {
      const formDataUpload = new FormData();
      Array.from(backupFiles).forEach(file => formDataUpload.append('files', file));
      const res = await fetch('/api/admin/backups/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `¡${data.count || backupFiles.length} archivo(s) respaldado(s) con éxito en Backblaze B2!` });
        setBackupFiles(null);
        await fetchBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al subir respaldos' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al subir archivos de respaldo' });
    } finally {
      setUploadingBackups(false);
    }
  };

  const handleDeleteBackup = async (key: string) => {
    if (!confirm('¿Eliminar este archivo de respaldo de Backblaze B2? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/backups?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Archivo de respaldo eliminado del servidor B2' });
        await fetchBackups();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Error al eliminar respaldo' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al comunicarse con el servidor' });
    }
  };

  const handleLogout = () => {
    setToken('');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const isEdit = Boolean(editingProfile);
      const url = isEdit ? `/api/admin/profiles/${editingProfile!.id}` : '/api/admin/profiles';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const targetProfileId = isEdit ? editingProfile!.id : data.profile.id;
        if (selectedPhotoFiles && selectedPhotoFiles.length > 0) {
          try {
            const body = new FormData();
            for (let i = 0; i < selectedPhotoFiles.length; i++) {
              body.append('photos', selectedPhotoFiles[i]);
            }
            await fetch(`/api/admin/profiles/${targetProfileId}/photos`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body
            });
            setSelectedPhotoFiles(null);
          } catch { /* Ignore photo error */ }
        }
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
        }
        fetchData();
        setActiveTab('profiles');
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar perfil' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de servidor al guardar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhotos = async (profileId: string) => {
    if (!selectedPhotoFiles || selectedPhotoFiles.length === 0) return;
    setUploadingPhotos(true);
    try {
      const body = new FormData();
      for (let i = 0; i < selectedPhotoFiles.length; i++) {
        body.append('photos', selectedPhotoFiles[i]);
      }
      if (uploadComment.trim()) {
        body.append('description', uploadComment.trim());
      }
      if (uploadSugestiva) {
        body.append('is_ephemeral', 'true');
        body.append('ephemeral_duration', String(uploadDuration || 10));
      }
      const res = await fetch(`/api/admin/profiles/${profileId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: '✅ Guardado en Backblaze B2 exitosamente (Borrador). Puedes seguir seleccionando fotos para colocar comentarios o pulsar "Publicar en Canal VIP" cuando termines.'
        });
        setSelectedPhotoFiles(null);
        setUploadComment('');
        setUploadSugestiva(false);
        if (editingProfile && data.profile) setEditingProfile(data.profile);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al subir fotos' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al subir imágenes' });
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Custom Buttons Handlers
  const handleSaveButton = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buttonFormData.label.trim() || !buttonFormData.url.trim()) {
      setMessage({ type: 'error', text: 'La etiqueta y el enlace URL son obligatorios' });
      return;
    }
    setSavingButton(true);
    try {
      const res = await fetch('/api/admin/buttons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingButton?.id,
          ...buttonFormData
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Botón "${data.button.label}" guardado correctamente.` });
        setEditingButton(null);
        setButtonFormData({ label: '', url: '', visible_channel: true, visible_miniapp: true, is_active: true });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar botón' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar botón' });
    } finally {
      setSavingButton(false);
    }
  };

  const handleDeleteButton = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este botón?')) return;
    try {
      const res = await fetch(`/api/admin/buttons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Botón eliminado correctamente' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar botón' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar botón' });
    }
  };

  // Dynamic Polls Handlers
  const handleSavePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollFormData.options.map(o => o.trim()).filter(Boolean);
    if (!pollFormData.question.trim() || validOptions.length < 2) {
      setMessage({ type: 'error', text: 'Debes ingresar una pregunta y al menos 2 opciones' });
      return;
    }
    setSavingPoll(true);
    try {
      const res = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingPoll?.id,
          question: pollFormData.question.trim(),
          options: validOptions,
          visible_channel: pollFormData.visible_channel,
          visible_miniapp: pollFormData.visible_miniapp,
          publish_telegram: pollFormData.publish_telegram,
          is_active: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: data.telegram_published
            ? '🎉 ¡Encuesta creada y enviada al Canal VIP de Telegram y a la Mini App!'
            : '✅ Encuesta guardada para la Mini App exitosamente.'
        });
        setEditingPoll(null);
        setPollFormData({ question: '', options: ['', ''], visible_channel: true, visible_miniapp: true, publish_telegram: true });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al crear encuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al crear encuesta' });
    } finally {
      setSavingPoll(false);
    }
  };

  const handleDeletePoll = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta encuesta?')) return;
    try {
      const res = await fetch(`/api/admin/polls/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Encuesta eliminada correctamente' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar encuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al eliminar encuesta' });
    }
  };

  // Sync Database SQLite to B2
  const handleSyncDbToB2 = async () => {
    setSyncingDb(true);
    try {
      const res = await fetch('/api/admin/sync-db', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '💾 Base de datos SQLite respaldada en Backblaze B2 exitosamente.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al respaldar DB en B2' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al respaldar base de datos' });
    } finally {
      setSyncingDb(false);
    }
  };

  const handleSyncChannel = async (profileId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Sincronización con Canal Telegram exitosa: ${data.message}` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al publicar en canal' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de servidor al sincronizar' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, name: string) => {
    if (!window.confirm(`¿Está segura de eliminar el perfil de "${name}"? Se removerá del canal de Telegram y de la web.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Perfil ${name} eliminado con éxito.` });
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/webhook/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Webhook registrado correctamente en Telegram: ${data.webhook_url}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al registrar webhook' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de comunicación al configurar webhook' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!editingProfile) return;
    const updatedPhotos = (editingProfile.photos || []).filter(p => p !== photoUrl);
    const updatedEphemeral = { ...(editingProfile.ephemeral_config || {}) };
    delete updatedEphemeral[photoUrl];
    setEditingProfile({ ...editingProfile, photos: updatedPhotos, ephemeral_config: updatedEphemeral });
    try {
      const res = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photos: updatedPhotos, ephemeral_config: updatedEphemeral })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Archivo multimedia eliminado del perfil.' });
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar el archivo' });
    }
  };

  const handleAddBackupToProfile = async (backupUrl: string) => {
    const targetProfile = editingProfile || profiles[0];
    if (!targetProfile) {
      setMessage({ type: 'error', text: 'No se encontró un perfil activo para vincular el archivo.' });
      return;
    }
    const currentPhotos = targetProfile.photos || [];
    if (currentPhotos.includes(backupUrl)) {
      setMessage({ type: 'error', text: 'Este archivo ya se encuentra en la galería VIP.' });
      return;
    }
    const updatedPhotos = [...currentPhotos, backupUrl];
    if (editingProfile) {
      setEditingProfile({ ...editingProfile, photos: updatedPhotos });
    }
    try {
      const res = await fetch(`/api/admin/profiles/${targetProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photos: updatedPhotos })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '¡Archivo del respaldo vinculado a la Galería VIP con éxito!' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar la galería del perfil.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al vincular archivo.' });
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
      const res = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ephemeral_config: currentConfig })
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

  const handlePublishToChannel = async (profileId?: string) => {
    const targetId = profileId || editingProfile?.id || profiles[0]?.id;
    if (!targetId) {
      setMessage({ type: 'error', text: 'No hay perfil seleccionado para publicar en el canal.' });
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/profiles/${targetId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `🚀 ¡Publicado con éxito en el canal de Telegram con botones de reacciones sincronizados! (ID mensaje: #${data.telegramMessageId || 'OK'})`
        });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al sincronizar con el canal de Telegram' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al publicar en Telegram' });
    } finally {
      setPublishing(false);
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
      const res = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ media_descriptions: currentDesc })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Descripción de este archivo guardada con éxito.' });
        setEditingDescForUrl(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al guardar descripción del archivo' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar descripción' });
    }
  };

  const handleSendReply = async (requestId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply_message: replyText, status: replyStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        setReplyingRequestId(null);
        setReplyText('');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar respuesta' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al responder solicitud' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveAndPublish = async () => {
    const targetId = editingProfile?.id || profiles[0]?.id;
    if (!targetId) {
      setMessage({ type: 'error', text: 'No hay perfil seleccionado para publicar en el canal.' });
      return;
    }
    setPublishing(true);
    setMessage(null);
    try {
      // 1. Save profile updates first if editing
      if (editingProfile) {
        const resSave = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
        const dataSave = await resSave.json();
        if (!resSave.ok) {
          setMessage({ type: 'error', text: dataSave.error || 'Error al guardar los datos del perfil.' });
          setPublishing(false);
          return;
        }

        // 2. Upload any queued photos
        if (selectedPhotoFiles && selectedPhotoFiles.length > 0) {
          const body = new FormData();
          for (let i = 0; i < selectedPhotoFiles.length; i++) {
            body.append('photos', selectedPhotoFiles[i]);
          }
          await fetch(`/api/admin/profiles/${editingProfile.id}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body
          });
          setSelectedPhotoFiles(null);
        }
      }

      // 3. Publish to Telegram Channel
      const resPub = await fetch(`/api/admin/profiles/${targetId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const dataPub = await resPub.json();
      if (resPub.ok && dataPub.success) {
        setMessage({
          type: 'success',
          text: `🚀 ¡Perfil guardado y publicado con éxito en el Canal VIP! (Mensaje #${dataPub.telegramMessageId || 'OK'})`
        });
        fetchData();
      } else {
        const errorMsg = dataPub.message || 'Error al publicar en el canal de Telegram';
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar y publicar en Telegram.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveAndTestChannel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!channelIdInput.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un ID numérico (-100...) o @usuario del canal.' });
      return;
    }
    setVerifyingChannel(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel_id: channelIdInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannelVerified(true);
        setChannelTitle(data.channel_title || '');
        setChannelIdInput(data.channel_id);
        setMessage({
          type: 'success',
          text: `🎉 ¡Canal "${data.channel_title || data.channel_id}" verificado y vinculado exitosamente! Ahora el bot puede publicar fotos y novedades en él.`
        });
        fetchData();
      } else {
        setChannelVerified(false);
        setMessage({
          type: 'error',
          text: data.error || 'No se pudo conectar con el canal. Asegúrate de que el bot sea Administrador con permiso de publicar mensajes.'
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor.' });
    } finally {
      setVerifyingChannel(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bot_username: newBotUsername,
          channel_id: channelIdInput,
          telegram_only_access: true,
          auto_reply_delay_minutes: autoReplyDelay,
          model_display_name: modelDisplayName,
          model_vip_link: modelVipLink
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Configuración de Telegram y privacidad guardada.' });
        if (data.bot_username) setNewBotUsername(data.bot_username);
        if (data.auto_reply_delay_minutes !== undefined) setAutoReplyDelay(String(data.auto_reply_delay_minutes));
        if (data.model_display_name !== undefined) setModelDisplayName(data.model_display_name || '');
        if (data.model_vip_link !== undefined) setModelVipLink(data.model_vip_link || '');
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar configuración' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al guardar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const resetNewForm = () => {
    setEditingProfile(null);
    setFormData({ name: '', age: 18, zone: 'Contenido +18 VIP', description: '', rate_bs: 450, commission_bs: 50, status: 'borrador', priority_order: 0 });
    setActiveTab('profiles');
  };

  if (!isOpen) return null;

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md overflow-y-auto">
        <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-zinc-900 p-6 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Lock className="h-7 w-7" />
          </div>
          
          <div>
            <h2 className="font-serif text-xl font-bold text-white">
              Panel Administrativo VIP
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Ingresa con tu PIN o Telegram ID autorizado
            </p>
          </div>

          <form onSubmit={handleLoginWithPin} className="space-y-3 pt-2 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-300 mb-1">
                PIN de Acceso o ID Administrador
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresa tu PIN o ID Telegram"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 font-medium">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loading || !pinInput.trim()}
              className="w-full min-h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Entrar al Panel Admin</span>
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              👉 O pide un enlace directo enviando /admin en el Bot
            </a>
            <button
              onClick={onClose}
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Ir al Catálogo Público
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tab config ──────────────────────────────────────────────────────────────
  const tabs: { id: AdminTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'profiles', icon: <Users className="w-4 h-4" />, label: 'Mi Perfil' },
    { id: 'requests', icon: <Inbox className="w-4 h-4" />, label: 'Solicitudes', badge: requests.length },
    { id: 'buttons', icon: <Sparkles className="w-4 h-4" />, label: 'Botones', badge: customButtons.length },
    { id: 'polls', icon: <BarChart2 className="w-4 h-4" />, label: 'Encuestas', badge: dynamicPolls.length },
    { id: 'backups', icon: <HardDrive className="w-4 h-4" />, label: 'Backup Server', badge: backups.length },
    { id: 'telegram', icon: <QrCode className="w-4 h-4" />, label: 'Telegram' },
    { id: 'audit', icon: <Activity className="w-4 h-4" />, label: 'Auditoría' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-zinc-100 flex flex-col max-h-[88vh] overflow-hidden my-auto">

        {/* ── Header ── */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-serif truncate">
                Panel Administrativo — {modelDisplayName || formData.name || 'IAM Danii'}
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">Gestión de contenido y atención privada</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Global Alert Notification ── */}
        {message && (
          <div className={`shrink-0 px-6 py-3 text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-b border-rose-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertTriangle className="w-4 h-4 shrink-0" />
              }
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 ml-4 text-lg leading-none cursor-pointer">×</button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Tab Bar ── */}
          <div className="flex items-center gap-0.5 px-3 sm:px-4 pt-2 bg-zinc-950/40 border-b border-zinc-800/80 overflow-x-auto scrollbar-none shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`flex items-center gap-1.5 py-2.5 px-3 rounded-t-lg border-b-2 transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-400 bg-zinc-900/40'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-amber-400/20 text-amber-400'
                      : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Views ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

            {/* TAB: MY PROFILE FORM */}
            {activeTab === 'profiles' && (
              <div className="max-w-xl mx-auto space-y-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingProfile ? `Configurar Perfil VIP: ${editingProfile.name}` : 'Crear Perfil VIP'}
                </h3>

                {/* BANNER DE PUBLICACIÓN EN CANAL */}
                <div className="p-4 bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
                      <Send className="w-4 h-4" /> Publicar en Canal VIP Oficial
                    </h4>
                    <p className="text-[11px] text-zinc-300">
                      Sincroniza y publica el contenido en Telegram con los botones de reacciones (❤️, ⭐, 🔥, 👍) en tiempo real.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePublishToChannel()}
                    disabled={publishing || loading}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {publishing ? 'Publicando...' : '🚀 Publicar Ahora en Canal VIP'}
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Nombre Público *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">PRECIO SUSCRIPCIÓN (Bs.)</label>
                    <input
                      type="number"
                      value={formData.rate_bs}
                      onChange={(e) => setFormData({ ...formData, rate_bs: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Estado de Publicación</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="disponible">🟢 VIP Activa (+18 / Publicada)</option>
                      <option value="borrador">📁 Privada (Oculta / Borrador)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Descripción del Contenido VIP (Publicación y Bot)
                      </label>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        Visible en visor al reaccionar
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.description}
                      placeholder="Ej: 🔥 Nueva sesión exclusiva en lencería de seda... 💫 15 fotos + 2 videos HD. Esta descripción se publicará en Telegram con reacciones y se organizará de forma elegante al hacer click en la Mini App."
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors text-xs leading-relaxed"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                      💡 <strong>Organización VIP:</strong> En la Mini App solo se mostrará cuando el usuario toque para ver detalles y reaccionar (❤️, ⭐, 🔥, 👍). En Telegram se publicará con los botones interactivos sincronizados.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-900 space-y-3">
                    <label className="block text-zinc-300 font-bold text-xs flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" /> Seleccionar imágenes o videos para subir:
                    </label>

                    {/* Comentario y sugestivo para los archivos a subir */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Comentario / Descripción de este material:
                        </label>
                        <input
                          type="text"
                          value={uploadComment}
                          onChange={(e) => setUploadComment(e.target.value)}
                          placeholder="Ej: 🔥 Nueva sesión exclusiva en lencería de seda..."
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Este comentario se publicará en el canal de Telegram con las 10 reacciones interactivas.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-900">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadSugestiva}
                            onChange={(e) => setUploadSugestiva(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
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

                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                      <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-amber-500/50 hover:border-amber-500 text-amber-400 font-bold text-xs cursor-pointer transition-all active:scale-95 text-center">
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>
                          {selectedPhotoFiles && selectedPhotoFiles.length > 0
                            ? `${selectedPhotoFiles.length} archivo(s) listo(s) para subir`
                            : 'Toca aquí para abrir Galería o Archivos'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,image/*,video/*"
                          onChange={(e) => setSelectedPhotoFiles(e.target.files)}
                          className="hidden"
                        />
                      </label>

                      {editingProfile && selectedPhotoFiles && selectedPhotoFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUploadPhotos(editingProfile.id)}
                          disabled={uploadingPhotos}
                          className="py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-xs cursor-pointer shrink-0 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          <HardDrive className="w-4 h-4" />
                          {uploadingPhotos ? 'Guardando en B2...' : '💾 Guardar en B2 (Borrador)'}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Guarda el contenido en Backblaze B2 sin publicarlo al canal. Cuando estés lista/o, pulsa "🚀 Publicar en Canal VIP".
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {editingProfile ? 'Guardar Cambios' : 'Crear Perfil'}
                    </button>

                    {editingProfile && (
                      <button
                        type="button"
                        onClick={() => handlePublishToChannel(editingProfile.id)}
                        disabled={publishing || loading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        {publishing ? 'Publicando...' : '🚀 Publicar en Canal VIP'}
                      </button>
                    )}
                  </div>
                </form>

                {/* Media Gallery Manager */}
                {editingProfile && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4 text-xs">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" /> Galería actual ({editingProfile.photos?.length || 0} archivos)
                    </h4>

                    {editingProfile.photos && editingProfile.photos.length > 0 ? (
                      <div className="space-y-4">
                        {[
                          { label: 'Imágenes', items: editingProfile.photos.filter(item => !isVideoUrl(item)) },
                          { label: 'Videos', items: editingProfile.photos.filter(isVideoUrl) }
                        ].filter(group => group.items.length > 0).map(group => (
                          <div key={group.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-zinc-300">{group.label}</h5>
                              <span className="text-[10px] text-zinc-500">{group.items.length} archivo(s)</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {group.items.map((photoUrl, idx) => {
                                const isEphemeral = Boolean(editingProfile.ephemeral_config?.[photoUrl]?.enabled);
                                const duration = editingProfile.ephemeral_config?.[photoUrl]?.duration_seconds || 5;
                                const hasDescription = Boolean(editingProfile.media_descriptions?.[photoUrl]);
                                const isCover = editingProfile.photos?.[0] === photoUrl;

                                return (
                                  <div
                                    key={photoUrl}
                                    onClick={() => {
                                      setEnlargedMediaUrl(photoUrl);
                                      setTempDescText(editingProfile.media_descriptions?.[photoUrl] || '');
                                    }}
                                    className="group relative rounded-2xl overflow-hidden border border-zinc-800 hover:border-amber-500/70 bg-zinc-900 flex flex-col cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98]"
                                  >
                                    <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                                      {isVideoUrl(photoUrl) ? (
                                        <video src={photoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                      ) : (
                                        <img src={photoUrl} alt={`${group.label} ${idx + 1}`} draggable={false} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                      )}

                                      {/* Hover overlay with zoom prompt */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-center p-2">
                                        <span className="p-2 rounded-full bg-amber-500 text-zinc-950 shadow-lg">
                                          <Maximize2 className="w-4 h-4" />
                                        </span>
                                        <span className="text-[10px] font-black text-white bg-black/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                                          Toca para ampliar
                                        </span>
                                      </div>

                                      {/* Badges */}
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

                                      {/* Quick Delete */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemovePhoto(photoUrl);
                                        }}
                                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-md transition-opacity cursor-pointer z-20 opacity-80 group-hover:opacity-100"
                                        title="Eliminar archivo"
                                        aria-label="Eliminar archivo"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 italic">No hay fotos cargadas aún en este perfil.</p>
                    )}

                    {/* MODAL VISTA AMPLIADA Y CONFIGURACIÓN (SUGESTIVA & DESCRIPCIÓN) */}
                    {enlargedMediaUrl && (
                      <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
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
                          <div className="relative flex-1 bg-black/95 flex items-center justify-center p-2 sm:p-4 min-h-[220px] max-h-[50vh] overflow-hidden select-none">
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

                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={tempDescText}
                                  onChange={(e) => setTempDescText(e.target.value)}
                                  placeholder="Ej: 🔥 Nueva sesión exclusiva en lencería negra..."
                                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                                />
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

                            {/* Acciones inferiores */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-2">
                                {editingProfile.photos && editingProfile.photos[0] !== enlargedMediaUrl && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const currentList = editingProfile.photos || [];
                                      const reordered = [enlargedMediaUrl, ...currentList.filter(p => p !== enlargedMediaUrl)];
                                      setEditingProfile({ ...editingProfile, photos: reordered });
                                      try {
                                        await fetch(`/api/admin/profiles/${editingProfile.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ photos: reordered })
                                        });
                                        setMessage({ type: 'success', text: '⭐ Foto seleccionada como Portada Principal' });
                                        fetchData();
                                      } catch {
                                        setMessage({ type: 'error', text: 'Error al cambiar foto de portada' });
                                      }
                                    }}
                                    className="py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    ⭐ Poner como Portada
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const toRemove = enlargedMediaUrl;
                                    setEnlargedMediaUrl(null);
                                    handleRemovePhoto(toRemove);
                                  }}
                                  className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Eliminar Archivo
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
                  </div>
                )}
              </div>
            )}

            {/* TAB: TELEGRAM & SETTINGS */}
            {activeTab === 'telegram' && (
              <div className="space-y-6 text-xs">

                {/* QR COMISIÓN */}
                <div className="p-5 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-lg shadow-amber-500/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                      <QrCode className="w-5 h-5" /> Imagen QR de Suscripción VIP
                    </h4>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      Para Bot y Admin
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Sube aquí la fotografía de tu código QR. El bot la enviará automáticamente o tú puedes usarla con el comando <code className="text-amber-400 font-mono font-bold bg-zinc-900 px-1.5 py-0.5 rounded">/qr ID_CLIENTE</code>.
                  </p>

                  {qrImageUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                      <img src={qrImageUrl} alt="QR Pago VIP Oficial" className="w-28 h-28 object-contain bg-white rounded-lg p-1.5 shadow-md" />
                      <div className="space-y-1 text-xs">
                        <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Imagen QR cargada en el servidor
                        </p>
                        <p className="text-zinc-400">Esta es la imagen que el sistema enviará a los clientes.</p>
                        <p className="text-zinc-500 text-[11px] font-mono break-all">{qrImageUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Aún no has subido una imagen QR.
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      if (!e.target.files?.[0]) return;
                      const file = e.target.files[0];
                      const fd = new FormData();
                      fd.append('qr_image', file);
                      try {
                        setLoading(true);
                        const res = await fetch('/api/admin/settings/qr', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.qr_image_url) setQrImageUrl(data.qr_image_url);
                          setMessage({ type: 'success', text: 'Imagen QR de Pago VIP subida correctamente' });
                        } else {
                          setMessage({ type: 'error', text: 'Error al guardar imagen QR' });
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Error en red al subir QR' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs text-zinc-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-zinc-950 hover:file:bg-amber-400 cursor-pointer w-full sm:w-auto"
                  />
                </div>

                {/* MENSAJE FIJADO */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Pin className="w-4 h-4 text-amber-400" /> Mensaje Fijado en el Catálogo Web
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-zinc-400 font-medium">Estado:</span>
                      <input
                        type="checkbox"
                        checked={pinnedMessageActive}
                        onChange={(e) => setPinnedMessageActive(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className={`text-xs font-bold ${pinnedMessageActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {pinnedMessageActive ? 'ACTIVADO' : 'DESACTIVADO'}
                      </span>
                    </label>
                  </div>
                  <p className="text-zinc-400 text-xs">
                    Fija un anuncio que permanecerá visible en la parte superior del catálogo web.
                  </p>
                  <textarea
                    rows={2}
                    value={pinnedMessageText}
                    onChange={(e) => setPinnedMessageText(e.target.value)}
                    placeholder="Ej: 🔥 Nuevo contenido disponible - Consultas directas al bot..."
                    className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const res = await fetch('/api/admin/settings/pinned', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ pinned_message_text: pinnedMessageText, pinned_message_active: pinnedMessageActive })
                          });
                          if (res.ok) {
                            setMessage({ type: 'success', text: 'Mensaje fijado actualizado correctamente en el catálogo' });
                          } else {
                            setMessage({ type: 'error', text: 'Error al guardar mensaje fijado' });
                          }
                        } catch {
                          setMessage({ type: 'error', text: 'Error al conectar con el servidor' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition-all cursor-pointer"
                    >
                      Guardar Mensaje Fijado
                    </button>
                  </div>
                </div>

                {/* MODO PRIVADO */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        Modo Privado: Acceso Exclusivo desde Telegram
                      </h4>
                      <p className="text-zinc-400 text-xs mt-1">
                        Al activar, la web estará bloqueada para visitantes generales. Solo usuarios de Telegram (@{newBotUsername || 'bot'}) podrán acceder.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-emerald-500/20">
                      SOLO TELEGRAM
                    </span>
                  </div>
                </div>

                {/* PERSONALIZACIÓN */}
                <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-400" /> Personalización de la Mini App
                  </h4>
                  <p className="text-zinc-400">
                    Ajusta el nombre que verán tus clientes y el enlace a tu red social o plataforma de contenido.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-zinc-400 font-semibold">Nombre / Alias / Usuario Telegram</label>
                    <input
                      type="text"
                      value={modelDisplayName}
                      onChange={(e) => setModelDisplayName(e.target.value)}
                      placeholder="Ej: Maya, @maya_vip o Mi Alias"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-zinc-400 font-semibold">Red social / plataforma (OnlyFans, Instagram u otra)</label>
                    <input
                      type="url"
                      value={modelVipLink}
                      onChange={(e) => setModelVipLink(e.target.value)}
                      placeholder="https://"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-xs">@</span>
                      <input
                        type="text"
                        value={newBotUsername.replace(/^@/, '')}
                        onChange={(e) => setNewBotUsername(e.target.value)}
                        placeholder="Ej. catalogovipscz"
                        className="w-full pl-7 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      Guardar
                    </button>
                  </div>
                </form>

                {/* BOT USERNAME */}
                <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-400" /> Nombre de Usuario del Bot en Telegram
                  </h4>
                  <p className="text-zinc-400">
                    Username exacto del bot sin @. Los enlaces del catálogo redirigirán a este bot.
                  </p>
                </form>

                {/* AUTO REPLY DELAY */}
                <form onSubmit={handleSaveSettings} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Tiempo de Respuesta Automática del Bot
                  </h4>
                  <p className="text-zinc-400">
                    Si la Administradora tarda más de estos minutos en responder, el bot enviará un mensaje de seguimiento amable al cliente.
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={autoReplyDelay}
                      onChange={(e) => setAutoReplyDelay(e.target.value)}
                      placeholder="10"
                      className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <span className="text-zinc-400 font-bold">minutos</span>
                    <button
                      type="submit"
                      disabled={loading}
                      className="ml-auto py-2 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      Guardar
                    </button>
                  </div>
                </form>

                {/* VINCULACIÓN DE CANAL TELEGRAM */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-amber-400" />
                        Canal VIP Oficial de Telegram (Publicación y Novedades)
                      </h4>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        El bot publicará aquí tus publicaciones y fotos con botones interactivos de reacciones (❤️ ⭐ 🔥 👍).
                      </p>
                    </div>
                    {channelVerified === true && (
                      <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Conectado {channelTitle ? `(${channelTitle})` : ''}
                      </span>
                    )}
                    {channelVerified === false && (
                      <span className="shrink-0 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                        <AlertTriangle className="w-3.5 h-3.5" /> No Conectado
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveAndTestChannel} className="space-y-3">
                    <label className="block text-zinc-300 font-semibold text-xs">
                      ID Numérico (-100...) o @Usuario de tu Canal
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={channelIdInput}
                        onChange={(e) => setChannelIdInput(e.target.value)}
                        placeholder="Ej: @MiCanalVIP o -1001234567890"
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={verifyingChannel || loading}
                        className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition-all cursor-pointer shrink-0 disabled:opacity-60 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {verifyingChannel ? 'Verificando...' : 'Vincular y Probar Canal'}
                      </button>
                    </div>
                  </form>

                  {/* Guía rápida para el administrador */}
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-2 text-[11px] text-zinc-400">
                    <p className="font-bold text-zinc-300 text-xs">💡 ¿Cómo vincular tu canal fácilmente?</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                      <li>
                        Abre tu canal en Telegram ➡️ Ajustes del canal ➡️ <strong className="text-zinc-200">Administradores</strong> ➡️ <strong className="text-zinc-200">Añadir Administrador</strong>.
                      </li>
                      <li>
                        Busca a <code className="text-amber-400 font-bold bg-zinc-950 px-1.5 py-0.5 rounded">@{newBotUsername || 'Danii_Catalogo_SCZ_bot'}</code> y dale permiso para <strong className="text-zinc-200">Publicar mensajes</strong>.
                      </li>
                      <li>
                        <strong className="text-amber-400">Detección Automática:</strong> Al añadir el bot como admin en el canal, ¡se vinculará automáticamente! También puedes escribir arriba el nombre (@MiCanal) o reenviar cualquier post del canal al bot por privado.
                      </li>
                    </ol>
                  </div>
                </div>

                {/* WEBHOOK */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-blue-400" /> Configuración de Webhook
                  </h4>
                  <p className="text-zinc-400">
                    El bot sincroniza automáticamente con el canal <code className="text-amber-400">{channelIdInput || channelId}</code>.
                  </p>
                  <button
                    type="button"
                    onClick={handleRegisterWebhook}
                    disabled={loading}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
                  >
                    <Webhook className="w-4 h-4" />
                    Registrar / Refrescar Webhook en Telegram API
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SOLICITUDES DE CLIENTES */}
            {activeTab === 'requests' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-amber-400" /> Solicitudes de Disponibilidad
                  </h3>
                  <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
                    <Inbox className="w-10 h-10 text-zinc-700 mx-auto" />
                    <p className="text-zinc-400">No hay solicitudes registradas aún.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map(reqItem => (
                      <div key={reqItem.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {reqItem.telegram_first_name || 'Cliente'}
                              </span>
                              {reqItem.telegram_username && (
                                <span className="text-amber-400 font-mono">@{reqItem.telegram_username}</span>
                              )}
                              <span className="text-zinc-500 font-mono text-[11px]">
                                (ID: {reqItem.telegram_user_id || 'N/A'})
                              </span>
                            </div>
                            <p className="text-zinc-300">
                              Consulta por: <strong className="text-amber-300">{reqItem.profile_name}</strong>
                            </p>
                            {reqItem.notes && (
                              <p className="text-zinc-500 text-[11px] bg-zinc-900 px-2 py-1 rounded-lg">
                                "{reqItem.notes}"
                              </p>
                            )}
                            <p className="text-zinc-500 text-[11px]">
                              {new Date(reqItem.created_at).toLocaleString('es-BO')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              reqItem.status === 'pendiente' 
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' 
                                : reqItem.status === 'comision_pagada'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {reqItem.status === 'comision_pagada' ? 'PAGO COMPLETADO' : reqItem.status.toUpperCase()}
                            </span>

                            {reqItem.status !== 'comision_pagada' && (
                              <button
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    const res = await fetch(`/api/admin/requests/${reqItem.id}/pay`, {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                      setMessage({ type: 'success', text: `Venta pagada registrada para ${reqItem.telegram_first_name}` });
                                      fetchData();
                                    } else {
                                      setMessage({ type: 'error', text: 'Error al marcar venta pagada' });
                                    }
                                  } catch {
                                    setMessage({ type: 'error', text: 'Error en red' });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-extrabold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                              >
                                <Banknote className="w-3.5 h-3.5" /> Marcar Pago Completado
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reply Section */}
                        {replyingRequestId === reqItem.id ? (
                          <div className="pt-2 border-t border-zinc-800 space-y-2">
                            <select
                              value={replyStatus}
                              onChange={(e) => setReplyStatus(e.target.value)}
                              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                            >
                              <option value="confirmado">Confirmado</option>
                              <option value="rechazado">Rechazado</option>
                              <option value="completado">Completado</option>
                            </select>
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Escribe tu respuesta al cliente..."
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSendReply(reqItem.id)}
                                disabled={sendingReply}
                                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {sendingReply ? 'Enviando...' : 'Enviar Respuesta'}
                              </button>
                              <button
                                onClick={() => { setReplyingRequestId(null); setReplyText(''); }}
                                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingRequestId(reqItem.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Responder via Telegram
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: BOTONES PERSONALIZADOS */}
            {activeTab === 'buttons' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Botones Interactivos
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Crea botones con enlaces personalizados (Canal Free, OnlyFans, Promociones VIP).
                    </p>
                  </div>
                  <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </button>
                </div>

                {/* Formulario Crear / Editar Botón */}
                <form onSubmit={handleSaveButton} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    {editingButton ? <Edit className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-amber-400" />}
                    {editingButton ? 'Editar Botón Personalizado' : 'Crear Nuevo Botón'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-semibold">Texto / Etiqueta del Botón *</label>
                      <input
                        type="text"
                        required
                        value={buttonFormData.label}
                        onChange={e => setButtonFormData({ ...buttonFormData, label: e.target.value })}
                        placeholder="Ej: 🎁 Promoción 50% VIP o 💋 Canal Free"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1 font-semibold">Enlace Destino (URL o Telegram) *</label>
                      <input
                        type="url"
                        required
                        value={buttonFormData.url}
                        onChange={e => setButtonFormData({ ...buttonFormData, url: e.target.value })}
                        placeholder="https://t.me/... o https://..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={buttonFormData.visible_channel}
                        onChange={e => setButtonFormData({ ...buttonFormData, visible_channel: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-zinc-300 font-medium">📢 Mostrar en Canal Telegram</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={buttonFormData.visible_miniapp}
                        onChange={e => setButtonFormData({ ...buttonFormData, visible_miniapp: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-zinc-300 font-medium">📱 Mostrar en Mini App</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={buttonFormData.is_active}
                        onChange={e => setButtonFormData({ ...buttonFormData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-zinc-300 font-medium">🟢 Activo</span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={savingButton}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {savingButton ? 'Guardando...' : editingButton ? 'Guardar Cambios' : 'Crear Botón'}
                    </button>
                    {editingButton && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingButton(null);
                          setButtonFormData({ label: '', url: '', visible_channel: true, visible_miniapp: true, is_active: true });
                        }}
                        className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* Lista de Botones */}
                <div className="space-y-2">
                  <h4 className="font-bold text-zinc-300">Botones Registrados ({customButtons.length})</h4>
                  {customButtons.length === 0 ? (
                    <div className="p-6 text-center bg-zinc-950/60 border border-zinc-800 rounded-2xl text-zinc-400">
                      No hay botones configurados todavía. Agrega el primero arriba.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customButtons.map(btn => (
                        <div key={btn.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs">{btn.label}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${btn.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                {btn.is_active ? 'ACTIVO' : 'INACTIVO'}
                              </span>
                              {btn.visible_channel && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[9px] font-semibold">
                                  📢 Canal
                                </span>
                              )}
                              {btn.visible_miniapp && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-semibold">
                                  📱 Mini App
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono truncate">{btn.url}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={btn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                              title="Probar enlace"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingButton(btn);
                                setButtonFormData({
                                  label: btn.label,
                                  url: btn.url,
                                  visible_channel: Boolean(btn.visible_channel),
                                  visible_miniapp: Boolean(btn.visible_miniapp),
                                  is_active: Boolean(btn.is_active)
                                });
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteButton(btn.id)}
                              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: DINÁMICAS Y ENCUESTAS */}
            {activeTab === 'polls' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-amber-400" /> Dinámicas y Encuestas
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Lanza votaciones en el Canal de Telegram y en la Mini App para interactuar con tus seguidores.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </button>
                </div>

                {/* Formulario Crear Encuesta */}
                <form onSubmit={handleSavePoll} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-amber-400" /> Nueva Encuesta / Dinámica
                  </h4>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Pregunta de la Encuesta *</label>
                    <input
                      type="text"
                      required
                      value={pollFormData.question}
                      onChange={e => setPollFormData({ ...pollFormData, question: e.target.value })}
                      placeholder="Ej: ¿Qué color de lencería prefieren para este viernes?"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-zinc-400 font-semibold">Opciones de Votación (Mínimo 2) *</label>
                    {pollFormData.options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="w-5 text-zinc-500 text-right font-mono text-[11px]">{idx + 1}.</span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={e => {
                            const updated = [...pollFormData.options];
                            updated[idx] = e.target.value;
                            setPollFormData({ ...pollFormData, options: updated });
                          }}
                          placeholder={`Opción ${idx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                        {pollFormData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = pollFormData.options.filter((_, i) => i !== idx);
                              setPollFormData({ ...pollFormData, options: updated });
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollFormData.options.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setPollFormData({ ...pollFormData, options: [...pollFormData.options, ''] })}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir otra opción
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-zinc-900/60 rounded-xl space-y-2 border border-zinc-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollFormData.publish_telegram}
                        onChange={e => setPollFormData({ ...pollFormData, publish_telegram: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-zinc-200 font-bold">📢 Enviar directamente al Canal de Telegram como Encuesta Nativa</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollFormData.visible_miniapp}
                        onChange={e => setPollFormData({ ...pollFormData, visible_miniapp: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-zinc-300 font-medium">📱 Habilitar votación en la Mini App</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPoll}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {savingPoll ? 'Creando Encuesta...' : '🚀 Lanzar Encuesta'}
                  </button>
                </form>

                {/* Lista de Encuestas */}
                <div className="space-y-3">
                  <h4 className="font-bold text-zinc-300">Encuestas Activas ({dynamicPolls.length})</h4>
                  {dynamicPolls.length === 0 ? (
                    <div className="p-6 text-center bg-zinc-950/60 border border-zinc-800 rounded-2xl text-zinc-400">
                      No hay encuestas creadas aún.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dynamicPolls.map(poll => {
                        const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
                        return (
                          <div key={poll.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="font-bold text-white text-xs sm:text-sm">{poll.question}</h5>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                                  <span>{totalVotes} votos registrados</span>
                                  <span>•</span>
                                  <span>{new Date(poll.created_at).toLocaleDateString('es-BO')}</span>
                                  {poll.telegram_poll_id && (
                                    <>
                                      <span>•</span>
                                      <span className="text-sky-400 font-semibold">En Telegram Poll</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeletePoll(poll.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                title="Eliminar encuesta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {poll.options.map((opt, optIdx) => {
                                const votes = (poll.votes?.[optIdx] ?? (poll.votes as any)?.[opt]) || 0;
                                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-300 font-medium">{opt}</span>
                                      <span className="text-zinc-400 font-mono">{votes} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: BACKUP SERVER MINI APP */}
            {activeTab === 'backups' && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-amber-400" /> [ 💾 Backup Server Mini APP ]
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Servidor Seguro Backblaze B2 · Respaldo privado para ambos Administradores
                    </p>
                  </div>
                  <button
                    onClick={() => fetchBackups()}
                    disabled={loadingBackups}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} /> Actualizar
                  </button>
                </div>

                {/* Subida Directa */}
                <form onSubmit={handleUploadBackups} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-400" /> Subir Archivos al Servidor Seguro (B2)
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">
                      Hasta 100 MB por archivo
                    </span>
                  </div>

                  <p className="text-zinc-400 text-[11px]">
                    Selecciona fotos o videos de tu dispositivo. Se guardarán en la carpeta privada aislada <code className="text-amber-300">tu-vip/backups/</code> sin publicarse ni vincularse al catálogo.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={e => setBackupFiles(e.target.files)}
                      className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={uploadingBackups || !backupFiles || backupFiles.length === 0}
                      className="w-full sm:w-auto shrink-0 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploadingBackups ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" /> Subir al Servidor B2
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Respaldo Base de Datos SQLite a B2 */}
                <div className="p-4 bg-zinc-950 border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-amber-400" /> Respaldo Permanente de Base de Datos SQLite
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-mono">
                      Anti-pérdida en Render
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Guarda una copia instantánea del catálogo completo, votos y configuraciones en <code className="text-amber-300">tu-vip/db/catalogo.sqlite</code> en Backblaze B2 para que nunca se pierda al reiniciar el servidor.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncDbToB2}
                    disabled={syncingDb}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {syncingDb ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        Guardando en B2...
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3.5 h-3.5" /> 💾 Sincronizar Base de Datos a B2 Ahora
                      </>
                    )}
                  </button>
                </div>

                {/* Lista de Respaldos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-300 flex items-center gap-2">
                      Archivos Respaldados en Backblaze ({backups.length})
                    </h4>
                  </div>

                  {loadingBackups ? (
                    <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Cargando archivos del Servidor Seguro...
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
                      <HardDrive className="w-10 h-10 text-zinc-700 mx-auto" />
                      <p className="text-zinc-400">No hay archivos respaldados en Backblaze B2 aún.</p>
                      <p className="text-[11px] text-zinc-500">
                        Sube archivos desde el formulario arriba o envíalos directamente por el chat privado de Telegram con el botón <strong className="text-zinc-300">[ 💾 Backup Server Mini APP ]</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-900 max-h-96 overflow-y-auto">
                      {backups.map(item => {
                        const isVideo = isVideoUrl(item.name) || item.name.toLowerCase().endsWith('.mp4') || item.name.toLowerCase().endsWith('.mov');
                        const formattedSize = item.size < 1024 * 1024
                          ? `${(item.size / 1024).toFixed(1)} KB`
                          : `${(item.size / (1024 * 1024)).toFixed(2)} MB`;
                        const formattedDate = new Date(item.lastModified).toLocaleString('es-BO');

                        return (
                          <div key={item.key} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0">
                                {isVideo ? <FileVideo className="w-4 h-4" /> : <FileImage className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate text-xs">{item.name}</p>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-2">
                                  <span>{formattedSize}</span>
                                  <span>•</span>
                                  <span>{formattedDate}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddBackupToProfile(item.url)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                                title="Publicar este archivo de respaldo en la galería VIP de la Mini App"
                              >
                                <Plus className="w-3.5 h-3.5" /> Usar en Galería VIP
                              </button>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
                                title="Ver / Descargar"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteBackup(item.key)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors text-[11px]"
                                title="Eliminar de B2"
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
              </div>
            )}

            {/* TAB: AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" /> Registro de Auditoría
                  </h3>
                  <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-2">
                    <Activity className="w-10 h-10 text-zinc-700 mx-auto" />
                    <p className="text-zinc-400">No hay registros de auditoría aún.</p>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-900">
                      {auditLogs.map(log => (
                        <div key={log.id} className="p-3 flex items-start justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold mt-0.5">
                              {log.action}
                            </span>
                            <span className="text-zinc-300 text-xs break-words">{log.details}</span>
                          </div>
                          <span className="shrink-0 text-zinc-500 text-[10px] font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('es-BO')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncErrors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Errores de Sincronización ({syncErrors.length})
                    </h4>
                    <div className="bg-zinc-950 border border-rose-500/20 rounded-2xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900">
                        {syncErrors.map(err => (
                          <div key={err.id} className="p-3 flex items-start justify-between gap-4">
                            <span className="text-rose-300 text-xs break-words">{err.error_message}</span>
                            <span className="shrink-0 text-zinc-500 text-[10px] font-mono">
                              {new Date(err.timestamp).toLocaleTimeString('es-BO')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
