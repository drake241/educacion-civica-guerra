# Valmira vs Cerro Azul (v2 multijugador)

Juego en **tiempo real** para Educación Cívica: cada alumno entra con celular, elige país, recibe **rol aleatorio**, vota por rondas de guerra; el **proyector** muestra mapa de dos países, medidores e iconos (hambruna, aranceles…).

## En línea (GitHub Pages)

- **Inicio:** https://drake241.github.io/educacion-civica-guerra/
- **Alumnos:** https://drake241.github.io/educacion-civica-guerra/join.html
- **Proyector:** https://drake241.github.io/educacion-civica-guerra/proyector.html (pin **4125**)

Repo: https://github.com/drake241/educacion-civica-guerra

## Antes del primer uso (obligatorio)

1. Crear proyecto **Supabase** (gratis) y ejecutar SQL: [`supabase/SUPABASE_SETUP.md`](supabase/SUPABASE_SETUP.md)
2. Copiar `js/config.example.js` → `js/config.js` con URL y anon key
3. Subir `config.js` al repo **o** pegar credenciales en GitHub Pages (la anon key es pública con RLS)

Sin Supabase, join/proyector mostrarán error de configuración.

## Flujo en clase

1. Proyector: `proyector.html` → pin → **Nueva sala** (código) → compartir enlace/QR a alumnos
2. Alumnos: `join.html` → código → nombre → país
3. **Iniciar guerra** → intro → discusión → votación → revelar → consecuencia → siguiente ronda (×5)
4. **Calcular final** (paz, victoria, colapso, empate)

Guion detallado: [`guia-exposicion.md`](guia-exposicion.md)

## Archivos v2

| Archivo | Uso |
|---------|-----|
| `join.html` / `jugar.html` | Jugador |
| `proyector.html` | Mapa + controles profe |
| `js/supabase-api.js` | RPC y Realtime |
| `js/game-content.js` | Rondas y finales |
| `contenido.json` | Guion de la guerra |
| `supabase/migrations/*.sql` | Base de datos |

## v1 legacy

[`admin.html`](admin.html) + `game-core.js`: facilitador manual, sin multijugador.

## Desarrollo local

```bash
python3 -m http.server 8080
# http://localhost:8080/join.html
```

## Prueba E2E (profe + alumnos)

Contra **GitHub Pages** (Supabase debe estar configurado en `js/config.js` del deploy):

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Otra URL base:

```bash
CIVICA_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
```

## Simular clase (demo profe)

Con el código visible en el proyector:

```bash
ROOM_CODE=XXXXX node scripts/simulate-class.js
```

Deja navegadores abiertos y envía votos cuando abrís **Abrir votación** en el proyector (el panel «Votación: N de M» se actualiza solo).
```
