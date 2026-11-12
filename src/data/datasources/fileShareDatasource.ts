import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Yerel dosyayı sistem paylaşım menüsüne verir; web'de tarayıcı indirmesi kullanılır. */
export const fileShareDatasource = {
  /** Metin dosyasını (CSV gibi) önbelleğe yazıp paylaşır. */
  async shareText(fileName: string, content: string, mimeType: string, dialogTitle: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    }
    if (!(await Sharing.isAvailableAsync())) return false;
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
    return true;
  },

  /** Zaten yerel bir dosya olan görseli (örn. view-shot çıktısı) paylaşır. */
  async shareImage(uri: string, dialogTitle: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.download = 'altin-kasam.png';
      link.click();
      return true;
    }
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle });
    return true;
  },
};
