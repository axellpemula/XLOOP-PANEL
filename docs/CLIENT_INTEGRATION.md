# Integrasi Client — `/api/validate`

Panduan untuk sisi tool/mod yang memakai lisensi XLOOP. Tujuannya: response validasi **tidak bisa dipalsukan** dan tool **tidak bisa jalan** tanpa payload rahasia dari server.

---

## Alur verifikasi yang benar

1. **Buat nonce baru tiap request** (16–64 karakter `[A-Za-z0-9_-]`). Jangan pernah reuse nonce.
2. Kirim `POST /api/validate` dengan body: `key`, `tool_slug`, `tool_version`, `hardware_id`, `nonce`.
3. Terima response. **Kalau bukan** `{ payload, signature }` → anggap gagal.
4. **Verifikasi `signature`** (Ed25519) atas **byte JSON payload sebelum di-base64** memakai public key yang ditanam di tool. Signature tidak valid → gagal.
5. Decode `payload`, lalu cek:
   - `valid === true`
   - `nonce` sama persis dengan yang kamu kirim
   - `hardware_id` sama persis dengan yang kamu kirim
   - `tool` dan `version` sesuai tool kamu
   - `server_time` wajar (opsional: tolak kalau selisih > 5 menit, indikasi response lama diputar ulang)
6. Pakai `secret_payload` sebagai bagian yang dibutuhkan tool untuk jalan. **Simpan di memori saja**, jangan ditulis ke disk, jangan di-log.
7. Sebar pengecekan di beberapa titik kode — jangan satu fungsi `isValid()` yang gampang di-patch.

### Bentuk response

Sukses:

```json
{ "payload": "<base64 dari JSON payload>", "signature": "<base64 signature Ed25519>" }
```

Payload setelah di-decode:

```json
{
  "valid": true,
  "tool": "perkakas",
  "version": "1.8.0",
  "expired_at": "2025-12-31T00:00:00.000Z",
  "max_device": 1,
  "current_devices": 1,
  "hardware_id": "<sama persis dengan request>",
  "nonce": "<sama persis dengan request>",
  "server_time": "2025-06-01T10:00:00.000Z",
  "secret_payload": "<isi tool_secrets, atau null>"
}
```

Gagal (tanpa signature — semua response non-sukses wajib dianggap gagal):

```json
{ "valid": false, "reason": "key_expired" }
```

Reason yang mungkin: `invalid_request`, `invalid_key`, `key_expired`, `key_banned`, `wrong_tool`, `wrong_version`, `device_limit_exceeded`, `rate_limited`, `signing_unavailable`.

---

## Hardware ID

Buat `hardware_id` yang stabil di satu device tapi tidak mengidentifikasi pribadi user:

```python
import hashlib, platform, uuid

def build_hardware_id() -> str:
    raw = "|".join([
        platform.system(),
        platform.machine(),
        platform.node(),
        str(uuid.getnode()),          # MAC address
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
```

Kirim sebagai string 16–128 karakter. Server menyimpan hash ini di `device_logs` dan membatasi jumlah device sesuai `max_device` key.

---

## Contoh Python

```python
import base64
import hashlib
import json
import platform
import secrets
import uuid
from urllib import request, error

from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.exceptions import InvalidSignature

PANEL_URL = "https://panel.xloop.dev"
TOOL_SLUG = "perkakas"
TOOL_VERSION = "1.8.0"

# Tempel public key dari halaman Tool Management (PEM mentah).
PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...isi_public_key_kamu...
-----END PUBLIC KEY-----
"""

PUBLIC_KEY = load_pem_public_key(PUBLIC_KEY_PEM)

# Disimpan di memori proses, bukan di disk.
_SECRET_CACHE: dict[str, str | None] = {"value": None}


def verify_license(key: str) -> tuple[bool, str]:
    hardware_id = hashlib.sha256(
        f"{platform.system()}|{platform.machine()}|{platform.node()}|{uuid.getnode()}".encode()
    ).hexdigest()

    nonce = secrets.token_urlsafe(24)  # 32 karakter, aman

    body = json.dumps({
        "key": key,
        "tool_slug": TOOL_SLUG,
        "tool_version": TOOL_VERSION,
        "hardware_id": hardware_id,
        "nonce": nonce,
    }).encode("utf-8")

    req = request.Request(
        f"{PANEL_URL}/api/validate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
    except error.HTTPError as exc:
        # 400 / 429 tetap membawa reason yang bisa dibaca.
        try:
            data = json.loads(exc.read())
        except Exception:
            return False, f"http_{exc.code}"
    except Exception:
        return False, "network_error"

    if "signature" not in data or "payload" not in data:
        return False, data.get("reason", "signature_missing")

    signature = base64.b64decode(data["signature"])
    payload_bytes = base64.b64decode(data["payload"])

    # 1. Verifikasi signature atas byte payload asli.
    try:
        PUBLIC_KEY.verify(signature, payload_bytes)
    except InvalidSignature:
        return False, "bad_signature"

    payload = json.loads(payload_bytes)

    # 2. Cek isi payload terikat ke request ini.
    if not payload.get("valid"):
        return False, "not_valid"
    if payload.get("nonce") != nonce:
        return False, "nonce_mismatch"
    if payload.get("hardware_id") != hardware_id:
        return False, "hwid_mismatch"
    if payload.get("tool") != TOOL_SLUG or payload.get("version") != TOOL_VERSION:
        return False, "tool_mismatch"

    # 3. Simpan rahasia di memori untuk dipakai bagian lain tool.
    _SECRET_CACHE["value"] = payload.get("secret_payload")
    return True, "ok"


def get_secret() -> str | None:
    """Bagian tool yang butuh data rahasia memanggil ini."""
    return _SECRET_CACHE["value"]
```

Contoh pemakaian tersebar di beberapa titik:

```python
def load_feature_module(key: str):
    ok, reason = verify_license(key)
    if not ok:
        raise SystemExit(f"Lisensi ditolak: {reason}")

    secret = get_secret()
    if not secret:
        raise SystemExit("Lisensi tidak lengkap")

    return decrypt_module(secret)   # modul tidak bisa didekripsi tanpa secret
```

---

## Contoh JavaScript (Node 18+)

```js
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { createHash, randomBytes, createHmac } from "node:crypto";
import os from "node:os";

const PANEL_URL = "https://panel.xloop.dev";
const TOOL_SLUG = "perkakas";
const TOOL_VERSION = "1.8.0";

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...isi_public_key_kamu...
-----END PUBLIC KEY-----`;

const publicKey = createPublicKey(PUBLIC_KEY_PEM);
let secretCache = null;

export function buildHardwareId() {
  const raw = [os.platform(), os.arch(), os.hostname(), os.cpus()[0]?.model ?? "", os.totalmem()].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export async function verifyLicense(key) {
  const hardwareId = buildHardwareId();
  const nonce = randomBytes(16).toString("base64url"); // 22 karakter

  let body;
  try {
    const response = await fetch(`${PANEL_URL}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        tool_slug: TOOL_SLUG,
        tool_version: TOOL_VERSION,
        hardware_id: hardwareId,
        nonce,
      }),
    });
    body = await response.json();
  } catch {
    return { ok: false, reason: "network_error" };
  }

  if (!body?.payload || !body?.signature) {
    return { ok: false, reason: body?.reason ?? "signature_missing" };
  }

  const payloadBytes = Buffer.from(body.payload, "base64");
  const signature = Buffer.from(body.signature, "base64");

  // 1. Verifikasi signature atas byte payload asli (sebelum base64).
  const validSignature = cryptoVerify(null, payloadBytes, publicKey, signature);
  if (!validSignature) return { ok: false, reason: "bad_signature" };

  const payload = JSON.parse(payloadBytes.toString("utf8"));

  // 2. Cek keterikatan ke request ini.
  if (payload.valid !== true) return { ok: false, reason: "not_valid" };
  if (payload.nonce !== nonce) return { ok: false, reason: "nonce_mismatch" };
  if (payload.hardware_id !== hardwareId) return { ok: false, reason: "hwid_mismatch" };
  if (payload.tool !== TOOL_SLUG || payload.version !== TOOL_VERSION) {
    return { ok: false, reason: "tool_mismatch" };
  }

  secretCache = payload.secret_payload ?? null;
  return { ok: true, expiredAt: payload.expired_at, devices: payload.current_devices };
}

export function requireSecret() {
  if (!secretCache) throw new Error("Lisensi belum diverifikasi");
  return secretCache;
}
```

Catatan JS: **verifikasi selalu atas `Buffer` hasil decode base64**, jangan `JSON.stringify` ulang lalu verifikasi — urutan key/whitespace bisa berubah dan signature jadi tidak valid.

---

## Praktik yang dianjurkan

- **Sebar pengecekan.** Panggil verifikasi saat startup, sebelum memuat modul inti, dan sebelum aksi penting (mis. sebelum kirim data ke server tool). Patch satu `isValid()` jadi `true` tidak boleh cukup.
- **Jangan simpan `secret_payload` ke disk / cache file.** Simpan di memori proses saja.
- **Jangan percaya `{ "valid": true }` polos.** Semua response non-tanda-tangan = gagal.
- **Nonce sekali pakai.** Tolak payload dengan nonce yang bukan dari request ini (mencegah replay).
- **Cek `expired_at`** untuk menampilkan sisa masa aktif di UI tool.
- **Tangani `device_limit_exceeded`** dengan pesan jelas ke user: "Device ini tidak terdaftar. Hubungi admin untuk reset HWID."
- **Rate limit**: maksimal 30 request/menit per IP dan 15/menit per key. Jangan validasi di setiap klik — simpan hasil sebentar di memori (mis. 5 menit) lalu validasi ulang.

## Catatan jujur soal anti-bypass

Kode yang berjalan di device user tidak bisa 100% tidak bisa di-patch. Tujuan desain ini adalah membuat bypass **mahal dan tidak menarik**:

- Response sukses ditandatangani Ed25519 dan terikat ke nonce + HWID + tool + version, jadi tidak bisa dipalsukan atau diputar ulang begitu saja.
- Bagian penting tool (config, kunci dekripsi, payload) baru dikirim setelah validasi lolos, sehingga patch `false` → `true` tetap tidak membuat tool punya data yang dibutuhkan.
- Pengecekan tersebar di beberapa titik sehingga satu patch tidak cukup.

Kalau kamu butuh jaminan lebih kuat, gabungkan dengan obfuscation, server-side gating untuk fitur inti, dan rotasi key berkala.
