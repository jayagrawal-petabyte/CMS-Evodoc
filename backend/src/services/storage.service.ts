import { supabase } from '../plugins/supabase'

export class StorageService {
  async upload(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    })
    if (error) throw error
    return path
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 900): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds)
    if (error) throw error
    return data.signedUrl
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async delete(bucket: string, path: string): Promise<void> {
    await supabase.storage.from(bucket).remove([path])
  }
}

export const storageService = new StorageService()
