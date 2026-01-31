import ipaddress
import socket
from io import BytesIO
from urllib.parse import urlparse

import requests
from django.core.files.base import ContentFile


class RemoteImageError(ValueError):
    pass


def download_image_from_url(
    image_url: str,
    *,
    max_bytes: int,
    label: str = "imagem",
    user_agent: str = "GigFlowAvatar/1.0",
) -> ContentFile:
    if not image_url:
        raise RemoteImageError("URL inválida.")

    parsed = urlparse(image_url)

    # Whitelist de esquemas permitidos
    allowed_schemes = {"http", "https"}
    if not parsed.scheme or not parsed.netloc:
        raise RemoteImageError("URL inválida.")
    if parsed.scheme not in allowed_schemes:
        raise RemoteImageError("Apenas URLs http/https são permitidas.")

    image_url_lower = image_url.lower()
    if "javascript:" in image_url_lower:
        raise RemoteImageError("URL não permitida.")
    if "data:" in image_url_lower:
        raise RemoteImageError("URLs data: não são permitidas. Use upload de arquivo.")
    if "vbscript:" in image_url_lower:
        raise RemoteImageError("URL não permitida.")

    parsed_host = parsed.hostname or ""
    if not parsed_host or parsed_host in {"localhost"} or parsed_host.endswith(".local"):
        raise RemoteImageError("URL não permitida.")

    try:
        if parsed.port and parsed.port not in (80, 443):
            raise RemoteImageError("URL não permitida.")
    except ValueError as exc:
        raise RemoteImageError("URL inválida.") from exc

    try:
        addresses = socket.getaddrinfo(parsed_host, parsed.port or 443)
    except socket.gaierror as exc:
        raise RemoteImageError("URL inválida.") from exc

    for addr in addresses:
        ip = addr[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip)
        except ValueError as exc:
            raise RemoteImageError("URL inválida.") from exc
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        ):
            raise RemoteImageError("URL não permitida.")

    try:
        response = requests.get(
            image_url,
            stream=True,
            timeout=(3.05, 5),
            allow_redirects=False,
            headers={"User-Agent": user_agent},
        )
    except requests.RequestException as exc:
        raise RemoteImageError(f"Não foi possível baixar a imagem do {label}.") from exc

    if response.status_code != 200:
        raise RemoteImageError(f"Não foi possível baixar a imagem do {label}.")

    content_type = (response.headers.get("Content-Type") or "").split(";")[0].lower()
    if not content_type.startswith("image/"):
        raise RemoteImageError("URL não aponta para uma imagem válida.")

    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > max_bytes:
                raise RemoteImageError("Imagem muito grande. Use uma imagem menor.")
        except (TypeError, ValueError):
            pass

    buffer = BytesIO()
    total_read = 0
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total_read += len(chunk)
        if total_read > max_bytes:
            raise RemoteImageError("Imagem muito grande. Use uma imagem menor.")
        buffer.write(chunk)

    if total_read == 0:
        raise RemoteImageError(f"Não foi possível baixar a imagem do {label}.")

    buffer.seek(0)
    content = ContentFile(buffer.read(), name=f"{label}-remote")
    content.content_type = content_type
    return content
