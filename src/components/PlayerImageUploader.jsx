import React, { useState, useEffect } from 'react';
import { fileToTransparentPng } from '@/lib/playerPhotoPng';
import { base44 } from '@/api/base44Client';

// name=src/components/PlayerImageUploader.jsx
//
// NOTE: This component previously posted to a local Express route
// (server/routes/players-upload.js) that was never wired into the app —
// express/multer aren't even project dependencies, so the request always
// failed in every environment. It also had no auth check and built its
// file path from an unvalidated `playerId`, which is a path-traversal risk.
// That dead route has been removed. Uploads now go through Base44's own
// file storage integration, the same one used everywhere else in this app
// (see base44.integrations.Core.UploadFile usages), and persist to the
// Player record via the SDK, which enforces the entity's own RLS.
export default function PlayerImageUploader({ playerId, currentImageUrl, onSaved, currentUser }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const maxSizeMB = 5;

  // Roles allowed to change avatar (normalize names to lower case, no accents)
  const allowedRoles = ['admin', 'administrador', 'preparador fisico', 'preparador', 'preparador_fisico', 'tecnico', 'técnico'];
  function normalizeRole(r) {
    if (!r) return '';
    return r.toString().toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  }
  const userRoles = (currentUser && currentUser.roles) || (currentUser && currentUser.role ? [currentUser.role] : []);
  const canEdit = userRoles.map(normalizeRole).some(r => allowedRoles.includes(r));

  useEffect(() => {
    setPreview(currentImageUrl || '');
  }, [currentImageUrl]);

  async function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      return alert('Solo se permiten imágenes.');
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      return alert(`Máximo ${maxSizeMB} MB.`);
    }
    const pngFile = await fileToTransparentPng(f);
    setFile(pngFile);
    setPreview(URL.createObjectURL(pngFile));
  }

  async function upload() {
    if (!file) return alert('Seleccioná una imagen primero.');
    if (!playerId) return alert('Falta el jugador.');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const saved = await base44.entities.Player.update(playerId, { photo_url: file_url });
      setPreview(file_url);
      setFile(null);
      onSaved && onSaved(file_url, saved);
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen. ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#222' }}>
        {preview ? (
          <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: '#666', padding: 8 }}>Sin foto</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={onFileChange} />
        <div style={{ marginTop: 6 }}>
          <button onClick={upload} disabled={uploading}>{uploading ? 'Subiendo...' : 'Guardar imagen'}</button>
        </div>
      </div>
    </div>
  );
}
