# Noname (MVP sin consola)

## ✅ Despliegue 1-click (sin terminal)

### 1) Frontend estático
1. Crea un repositorio en GitHub y sube esta carpeta `web/`.
2. En Cloudflare Pages (o Netlify):
   - **Nuevo proyecto** → conecta tu repo.
   - **Framework preset:** “None / Static”.
   - **Build command:** *vacío*.
   - **Output folder:** `web`.
3. Publica y copia la URL pública.

### 2) Backend Cloudflare Worker
1. Crea una cuenta en Cloudflare.
2. Abre el botón de despliegue 1-click:

[![Deploy to Cloudflare](https://deploy.cloudflareworkers.com/button)](https://deploy.cloudflareworkers.com/?url=https://github.com/TU_USUARIO/TU_REPO)

3. En el flujo web, selecciona el repo y confirma.
4. En Cloudflare **Workers & Pages → KV**:
   - Crea un namespace llamado `NONAME_KV`.
5. En Cloudflare **Workers & Pages → Durable Objects**:
   - Asegura el objeto `RelayRoom`.
6. En Cloudflare **Workers & Pages → Worker → Settings → Variables & Bindings**:
   - **KV Namespace Binding:** `NONAME_KV`.
   - **Durable Object Binding:** `RELAY_ROOM` con la clase `RelayRoom`.
7. Publica el Worker y copia su URL `https://<tu-worker>.workers.dev`.

### 3) Configurar la web (sin consola)
1. Abre tu URL del frontend.
2. Ve a **Ajustes** y pega la URL del Worker en **API Base URL**.
3. Pulsa **Guardar**.

## ✅ Setup Wizard (en la propia web)
En la Home:
- **Comprobar API**
- **Probar WebSocket relay**
- **Sembrar bots DEMO**

## ✅ Modo DEMO offline
Si no hay API, la app funciona con almacenamiento local:
- Puntos/minutos locales
- Ranking DEMO

## 📁 Estructura
- `/web` → frontend estático
- `/worker` → Cloudflare Worker + Durable Object

## 🔒 Privacidad
- El backend **no guarda imágenes**.
- Las fotos viajan sólo como relay y se descartan.
- El backend guarda solo puntos, alias y timestamps.
