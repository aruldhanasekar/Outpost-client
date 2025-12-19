// services/attachmentApi.ts
// API for uploading attachments to S3

import { auth } from '../firebase.config';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// ======================================================
// TYPES
// ======================================================

export interface UploadUrlResponse {
  upload_url: string;
  attachment_id: string;
  storage_path: string;
  expires_in: number;
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  status: string;
  created_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ======================================================
// HELPER: Get Auth Token
// ======================================================
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
}

// ======================================================
// API: Get Presigned Upload URL
// ======================================================
export async function getUploadUrl(
  filename: string,
  contentType: string,
  size: number
): Promise<UploadUrlResponse> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/attachments/upload-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
      size
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get upload URL' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }
  
  return response.json();
}

// ======================================================
// API: Upload File to S3 (with progress)
// ======================================================
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100)
        });
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });
    
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

// ======================================================
// API: Confirm Upload
// ======================================================
export async function confirmUpload(attachmentId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/attachments/confirm/${attachmentId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to confirm upload' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }
}

// ======================================================
// API: Delete Attachment
// ======================================================
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete attachment' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }
}

// ======================================================
// COMPLETE UPLOAD FLOW: Get URL → Upload → Confirm
// ======================================================
export interface UploadedAttachment {
  id: string;
  filename: string;
  size: number;
  contentType: string;
}

export async function uploadAttachment(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedAttachment> {
  // 1. Get presigned upload URL
  const { upload_url, attachment_id } = await getUploadUrl(
    file.name,
    file.type || 'application/octet-stream',
    file.size
  );
  
  // 2. Upload to S3
  await uploadToS3(upload_url, file, onProgress);
  
  // 3. Confirm upload
  await confirmUpload(attachment_id);
  
  return {
    id: attachment_id,
    filename: file.name,
    size: file.size,
    contentType: file.type || 'application/octet-stream'
  };
}