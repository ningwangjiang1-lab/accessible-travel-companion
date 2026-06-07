import {API_BASE_URL} from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_TOKEN = '@accessible_travel_token';

/**
 * Upload Service — 文件上传
 */

/** 上传图片文件，返回 URL */
export async function uploadImage(file: File): Promise<{url: string; filename: string}> {
  const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({error: '上传失败'}));
    throw new Error(err.error || '上传失败');
  }

  return response.json();
}
