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

## Lógica del temporizador

La lógica pura de estados y transiciones vive en `src/lib/timer.ts`, con sus pruebas en `src/lib/timer.test.ts`. No depende de React ni del reloj real: recibe y devuelve estado inmutable.

Verificación completa (tipos, lint, formato y pruebas con cobertura):

```bash
npm run check
```
