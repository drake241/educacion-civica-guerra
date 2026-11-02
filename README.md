# Juego: Valmira vs Cerro Azul

Simulación de crisis bélica para comparar **parlamentarismo** y **presidencialismo** (Educación Cívica, 10.°).


## Juego en línea (GitHub Pages)

- **Proyector:** https://drake241.github.io/educacion-civica-guerra/
- **Panel facilitador:** https://drake241.github.io/educacion-civica-guerra/admin.html

Funciona en celulares y laptops con internet. El estado del juego se guarda en el navegador (`localStorage`); admin y proyector deben ser pestañas del **mismo navegador** en la misma PC para sincronizar en vivo.

### Desarrollo local

Los navegadores bloquean `fetch` a JSON en `file://`. Usá un servidor local:

```bash
cd Educacion_Civica_Sistemas_Gobierno
python3 -m http.server 8080
```

- **Proyector:** http://localhost:8080/index.html
- **Facilitador:** http://localhost:8080/admin.html (contraseña de aula en el panel; no es seguridad real)

Misma carpeta en USB: mismo comando desde esa carpeta.

## Archivos

| Archivo | Uso |
|---------|-----|
| `contenido.json` | Crisis, opciones, efectos |
| `game-core.js` | Estado compartido (`localStorage`) |
| `index.html` | Vista pública |
| `admin.html` | Panel facilitador |
| `guia-exposicion.md` | Guion 20 min |

Ver `guia-exposicion.md` para el guion completo.
