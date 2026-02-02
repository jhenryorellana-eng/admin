# Starbiz Admin

Panel de administración para Starbiz Academy.

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3003`

## Credenciales de Acceso

- **Email:** jhenry.orellana@gmail.com
- **Contraseña:** Ceojunior2026$

## Configuración de Base de Datos

Antes de usar la aplicación, ejecuta las migraciones en el proyecto **StarEduca-Junior** de Supabase:

1. Abre el archivo `supabase-migrations.sql`
2. Copia el contenido
3. Ejecuta en el SQL Editor de Supabase Dashboard del proyecto **stareduca-junior**
4. **NO ejecutar en hub-central** (ese proyecto es para datos de usuarios/familias)

## Variables de Entorno

```env
# IMPORTANTE: Usar credenciales del proyecto STAREDUCA-JUNIOR
# (donde están las tablas de cursos, badges, etc.)
# NO usar hub-central (ese es para datos de usuarios/familias)
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto-stareduca-junior].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-stareduca-junior]
```

## Arquitectura de Base de Datos

| Proyecto Supabase | Usado por | Datos |
|-------------------|-----------|-------|
| **StarEduca-Junior** | stareduca-junior, admin | cursos, módulos, lecciones, badges, xp_config |
| **Hub-Central** | hub-central, super apps | profiles, families, memberships |

## Funcionalidades

### Dashboard
- KPIs globales de la plataforma
- Accesos rápidos a cada mini app

### StarEduca Junior
- **Cursos**: CRUD completo con módulos y lecciones
- **Exámenes**: Gestión de preguntas con respuestas múltiples
- **Badges**: Configuración de insignias y criterios
- **XP Config**: Ajuste de puntos por acción
- **Estudiantes**: Vista de progreso y estadísticas

## Estructura de Carpetas

```
src/
├── app/                    # Páginas (Next.js App Router)
│   ├── login/              # Página de login
│   ├── stareduca-junior/   # Gestión de StarEduca Junior
│   │   ├── cursos/         # CRUD de cursos
│   │   ├── badges/         # CRUD de badges
│   │   ├── xp-config/      # Configuración de XP
│   │   └── estudiantes/    # Vista de estudiantes
│   └── page.tsx            # Dashboard principal
├── components/
│   ├── layout/             # Sidebar, Header, AuthGuard
│   └── ui/                 # Componentes reutilizables
├── lib/
│   ├── auth.ts             # Autenticación (hardcoded para MVP)
│   ├── supabase/           # Cliente de Supabase
│   └── utils.ts            # Utilidades
├── stores/                 # Estado global (Zustand)
└── types/                  # Tipos TypeScript
```

## Scripts

```bash
npm run dev     # Desarrollo (puerto 3003)
npm run build   # Build de producción
npm run start   # Iniciar en producción
npm run lint    # Linting
```
