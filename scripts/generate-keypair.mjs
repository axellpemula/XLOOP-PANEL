#!/usr/bin/env node

import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicPem = publicKey.export({ type: "spki", format: "pem" });

const privateB64 = Buffer.from(privatePem, "utf8").toString("base64");
const publicB64 = Buffer.from(publicPem, "utf8").toString("base64");

console.log("");
console.log("Tempel ke .env.local:");
console.log("");
console.log(`LICENSE_SIGNING_PRIVATE_KEY=${privateB64}`);
console.log("");
console.log(`LICENSE_SIGNING_PUBLIC_KEY=${publicB64}`);
console.log("");
console.log("Catatan:");
console.log("- Private key hanya dipakai server. Jangan pernah commit atau kirim ke browser.");
console.log("- Public key aman dibagikan; tanam di sisi tool/mod untuk verifikasi signature.");
console.log("- Ganti keypair = semua tool versi lama harus di-update public key-nya.");
console.log("");
