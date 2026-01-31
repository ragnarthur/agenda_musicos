from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError, features

# Image upload limits
MAX_AVATAR_BYTES = 2 * 1024 * 1024
MAX_COVER_BYTES = 5 * 1024 * 1024
MAX_AVATAR_SIZE = 512
MAX_COVER_SIZE = (1600, 900)
MAX_IMAGE_PIXELS = 12_000_000


def _process_profile_image(uploaded_file, *, max_bytes, max_size, crop_square, quality, prefix):
    if uploaded_file.size > max_bytes:
        size_mb = max_bytes // (1024 * 1024)
        raise ValueError(f"Arquivo muito grande. Tamanho máximo: {size_mb}MB.")

    try:
        image = Image.open(uploaded_file)
        image_format = (image.format or "").upper()
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError("Arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.") from exc

    if not image_format:
        content_type = getattr(uploaded_file, "content_type", "") or ""
        if content_type.lower() in ("image/jpeg", "image/jpg"):
            image_format = "JPEG"
        elif content_type.lower() == "image/png":
            image_format = "PNG"
        elif content_type.lower() == "image/webp":
            image_format = "WEBP"

    if image_format not in {"JPEG", "PNG", "WEBP"}:
        raise ValueError("Formato não suportado. Use JPG, PNG ou WEBP.")

    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise ValueError("Imagem muito grande. Reduza a resolução.")

    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_alpha else "RGB")

    if crop_square:
        image = ImageOps.fit(image, (max_size, max_size), method=Image.LANCZOS)
    else:
        if isinstance(max_size, tuple):
            width, height = max_size
            aspect = image.width / image.height
            if aspect > width / height:
                image = ImageOps.fit(image, (width, int(width / aspect)), method=Image.LANCZOS)
            else:
                image = ImageOps.fit(image, (int(height * aspect), height), method=Image.LANCZOS)
        else:
            image.thumbnail((max_size, max_size), Image.LANCZOS)

    buffer = BytesIO()
    if features.check("webp"):
        output_format = "WEBP"
        output_ext = "webp"
    elif has_alpha:
        output_format = "PNG"
        output_ext = "png"
    else:
        output_format = "JPEG"
        output_ext = "jpg"

    if output_format == "JPEG" and image.mode != "RGB":
        image = image.convert("RGB")

    save_kwargs = {"format": output_format}
    if output_format == "WEBP":
        save_kwargs.update({"quality": quality, "method": 6})
    elif output_format == "JPEG":
        save_kwargs.update({"quality": quality, "optimize": True})
    elif output_format == "PNG":
        save_kwargs.update({"optimize": True, "compress_level": 6})

    image.save(buffer, **save_kwargs)
    buffer.seek(0)
    return ContentFile(buffer.getvalue(), name=f"{prefix}-{uuid4().hex}.{output_ext}")
