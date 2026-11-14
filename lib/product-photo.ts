export function prepareProductPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const photo = new window.Image();
    photo.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 1024 / Math.max(photo.naturalWidth, photo.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Não foi possível preparar a foto.'));
        return;
      }
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        reject(new Error('Não foi possível salvar a foto.'));
      }
    };
    photo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível abrir essa imagem.'));
    };
    photo.src = objectUrl;
  });
}

