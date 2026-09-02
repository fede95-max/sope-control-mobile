# sope-control-mobile

App Expo (fase 12): login contra `sope-control-api` y vista del hogar.

Todavía no está en stores. No hay gráficos ni el resto de pantallas.

## Requisitos

- Node.js 20+
- Expo Go en el teléfono, o un emulador
- `sope-control-api` corriendo en `:3000`

## Arranque

```bash
cd sope-control-mobile
npx expo start
```

En emulador Android la URL por defecto es `http://10.0.2.2:3000/api/v1`. En iOS simulator, `http://127.0.0.1:3000/api/v1`.

En un teléfono físico, creá `.env.local` (no se sube al git):

```
EXPO_PUBLIC_API_BASE_URL=http://TU_IP_LAN:3000/api/v1
```

Contraseña de prueba: `Passw0rd`.
