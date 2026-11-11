# 11:11

Página dedicada con la canción en inglés y español, letra animada y clave de entrada `11:11`.

## Verla en tu computadora

```
npm start
```

Abre http://localhost:3000. Para verla en el celular, conéctalo al mismo wifi y abre
`http://IP-DE-TU-PC:3000` (la IP sale con `ipconfig`).

## Cambiar textos y fotos

Todo lo editable está al inicio de `public/js/cards.js`: la clave, el "para ti", los pies de
foto del álbum, el mensaje final y la firma.

- `ajuste`: si notas la letra adelantada o atrasada respecto a la voz, cambia este número (en segundos).
- Fotos: reemplaza los archivos de `public/assets/img/` conservando los mismos nombres.

## Subirla a Render

1. Crea un repositorio **privado** en GitHub y sube esta carpeta:
   ```
   git init
   git add .
   git commit -m "11:11"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
2. En Render: **New → Static Site**, elige el repositorio.
3. **Publish directory:** `public`. Deja vacío el *Build command*.
4. Al terminar, Render te da la dirección `https://....onrender.com`. Con esa dirección genera el QR.

La carpeta `Letra/` (los mp3 originales) y `tools/` no se suben: están en `.gitignore`.

## Importante

La clave es solo una puerta visual. Quien tenga el enlace directo a una foto o a la canción
puede abrirlo, así que comparte el enlace solo con ella.
