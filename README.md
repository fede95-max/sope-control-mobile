# sope-control-mobile

App Expo para sope-control: login contra la API y pantallas del hogar.

## Descargar APK

La última APK de Android se publica en GitHub Releases:

**[Descargar sope-control.apk](https://github.com/fede95-max/sope-control-mobile/releases/latest/download/sope-control.apk)**

También está en [Releases](https://github.com/fede95-max/sope-control-mobile/releases/latest). Cada push a `main` regenera el archivo.

En el teléfono: permití instalar apps de orígenes desconocidos y abrí el APK.

La app usa la API de producción:

`https://zvoiin6umc2fek72xbgxhans2u0iiynq.lambda-url.sa-east-1.on.aws/api/v1`

## Requisitos (desarrollo)

- Node.js 22+
- Expo Go en el teléfono, o un emulador

## Arranque

```bash
cd sope-control-mobile
npx expo start
```

Por defecto apunta a la API de producción. Para usar un API local, creá `.env.local` (no se sube al git):

```
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

En emulador Android usá `http://10.0.2.2:3000/api/v1`. En un teléfono físico, `http://TU_IP_LAN:3000/api/v1`.

Contraseña de prueba: `Passw0rd`.
