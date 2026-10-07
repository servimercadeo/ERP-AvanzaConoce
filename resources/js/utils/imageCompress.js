// Reduce una foto antes de subirla. Las fotos de celular pesan 3–12 MB y el servidor
// de producción rechaza el archivo antes de que llegue a Laravel cuando supera
// `upload_max_filesize` de PHP, lo que se ve como "The fotografia failed to upload".
// Redimensionar a ~1280px en JPEG deja la foto por debajo de ~500 KB sin pérdida visible
// para un avatar o una ficha.
//
// Si el navegador no puede decodificar la imagen (p. ej. HEIC fuera de Safari) se
// devuelve el archivo original para que el backend responda con su propio error.
export async function compressImage(file, { maxDim = 1280, quality = 0.82 } = {}) {
    if (!file || !file.type?.startsWith("image/") || file.type === "image/gif") {
        return file;
    }

    try {
        const bitmap = await loadImage(file);
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // Fondo blanco: los PNG con transparencia quedarían negros al pasar a JPEG.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (!blob || blob.size >= file.size) return file;

        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
        return file;
    }
}

async function loadImage(file) {
    // createImageBitmap respeta la orientación EXIF con esta opción (fotos de celular
    // que si no saldrían giradas).
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch {
            // Algunos navegadores no aceptan el objeto de opciones; se cae al <img>.
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
    } finally {
        URL.revokeObjectURL(url);
    }
}

// Convierte el error de axios/fetch de una subida de foto en un mensaje en español.
export function mensajeErrorFoto(data, fallback = "No se pudo subir la fotografía.") {
    const msg = data?.errors?.fotografia?.[0] ?? data?.message ?? "";
    if (/failed to upload/i.test(msg)) {
        return "La foto es demasiado pesada o no se pudo procesar. Intenta con una imagen JPG o PNG más liviana.";
    }
    if (/must be an image/i.test(msg)) {
        return "El archivo seleccionado no es una imagen válida (usa JPG o PNG).";
    }
    if (/greater than/i.test(msg)) {
        return "La foto supera el tamaño máximo permitido (5 MB).";
    }
    return msg || fallback;
}
