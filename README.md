This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dependencias de desarrollo

Todas verificadas en el registro oficial de npm (existencia y mantenimiento) antes de instalarse:

- **vitest** (`5.1.0`): framework de pruebas unitarias para la lógica pura en `src/lib`.
- **@vitest/coverage-v8** (`5.1.0`): proveedor de cobertura V8; el proyecto exige un mínimo del 80 % en la lógica de negocio.
- **prettier** (`3.10.1`): formateo determinista exigido por `npm run check`.
- **@types/node** (de `^20` a `^22`): versión de tipos requerida por el peer de `vitest`; coincide con el runtime Node 22.
- **jsdom** (`26.1.0`): entorno DOM para las pruebas de componentes. Se fija en 26 porque la 31 exige Node `^22.22` y aquí se usa 22.16.
- **@testing-library/react** (`16.3.3`) + **@testing-library/dom** (`^10`): renderizado e interacción de componentes en las pruebas.
- **@testing-library/jest-dom** (`7.0.1`): matchers de aserciones DOM (accesibilidad, visibilidad).
- **@testing-library/user-event** (`14.6.12`): simulación de interacciones reales de usuario (clic, teclado).
- **axe-core** (`4.12.1`): motor de auditoría de accesibilidad (mantenido por Deque) usado en las pruebas de componentes. Se usa directo porque `jest-axe` no incluye definiciones de tipos.
- **firebase-admin** (`14.5.1`): SDK oficial de Firebase para el servidor, publicado por Google y actualizado en noviembre de 2026. Se usa la cuenta de servicio porque las credenciales del proyecto son de Admin SDK; permiten leer y escribir Firestore desde Route Handlers sin exponer la clave privada en el navegador.

## Firebase / Firestore

La conexión se hace únicamente en el servidor (`src/lib/firebase-admin.ts`). El navegador nunca recibe las credenciales: habla con los Route Handlers y estos usan el Admin SDK.

Variables requeridas en `.env.local` (ver `.env.example`):

```bash
PROJECT_ID=tu-proyecto
CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Estas variables no deben llevar el prefijo `NEXT_PUBLIC_`. La clave privada se normaliza para aceptar el formato con `\n` escapados.

Endpoints:

- `GET /api/health`: comprueba que el servidor puede hablar con Firestore.
- `GET /api/sessions`: lista las sesiones guardadas.
- `POST /api/sessions`: crea o actualiza una sesión.
- `DELETE /api/sessions?id=...`: elimina una sesión.
- `GET /api/subjects`: lista las materias.
- `PUT /api/subjects`: reemplaza la lista de materias.

Estructura en Firestore:

- Colección `sessions`, un documento por sesión con id igual a `session.id`.
- Documento `config/subjects` con el campo `items: string[]`.

`localStorage` sigue siendo la fuente inmediata en el cliente; al montar la aplicación se combinan los datos remotos y locales, y cada cambio local se envía al servidor. Los errores de red no bloquean la interfaz.

> Seguridad: la cuenta de servicio tiene acceso total al proyecto. Si una clave privada se expone, revócala en Google Cloud Console y genera otra. No la incluyas en el repositorio ni en variables `NEXT_PUBLIC_`. Los endpoints aún no tienen autenticación: no despliegues esta versión en producción sin añadirla.

## Componentes

El temporizador visual y el selector de materia viven en `src/components/PomodoroTimer.tsx`, con sus pruebas en `src/components/PomodoroTimer.test.tsx`. Es un Client Component autónomo que reutiliza `src/lib/timer.ts`, es responsive mobile-first y cumple WCAG 2.2 AA (HTML semántico, controles nativos, foco visible y anuncio de fase con `aria-live`).

El encabezado y el pie son `sticky` y el nav enlaza a `#temporizador` y `#registro`. Antes de iniciar se puede ajustar la duración del enfoque (1-180 minutos); el valor persiste en `localStorage` mediante `durationsStore`. Al pulsar Iniciar, la sesión se registra en el historial como `in-progress` (columna Estado: «En curso») y, si el temporizador llega a cero, pasa a `completed` («Completada»). El resumen por materia solo suma sesiones completadas, tanto en local como en Firestore.

## Lógica del temporizador

La lógica pura de estados y transiciones vive en `src/lib/timer.ts`, con sus pruebas en `src/lib/timer.test.ts`. No depende de React ni del reloj real: recibe y devuelve estado inmutable.

Verificación completa (tipos, lint, formato y pruebas con cobertura):

```bash
npm run check
```
