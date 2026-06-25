# ⚽ Polla Mundialista

Una plataforma web interactiva y moderna para llevar los pronósticos de los partidos del Mundial en tu instituto. Cuenta con un sistema de monedas simbólicas internas sin dinero real integrado y con activación manual por el administrador.

---

## 🛠️ Tecnologías y Características
- **Framework**: Next.js 16 (App Router) y React 19.
- **Base de Datos**: PostgreSQL y Prisma ORM.
- **Diseño Visual**: Estilo mundialista premium, dark mode por defecto, componentes glassmorphism y layouts responsive para escritorio y celular.
- **Autenticación**: JWT seguro (con la librería `jose`) almacenado en cookies HttpOnly y verificado en tiempo real con Next.js Middleware.
- **Notificaciones**: Avisos dinámicos en tiempo real mediante `react-hot-toast`.
- **Contenedores**: Preparado para producción con Docker multi-etapa y Docker Compose.

---

## 🚀 Ejecución en Desarrollo (Local)

Sigue estos pasos para levantar el entorno de desarrollo localmente:

### 1. Iniciar Base de Datos (Docker)
Levanta la base de datos PostgreSQL de desarrollo:
```bash
docker compose up -d db
```
*Nota: Se mapea al puerto local `5435` para evitar conflictos con servicios nativos corriendo en el puerto por defecto.*

### 2. Sincronizar Base de Datos y Sembrar
Sincroniza la estructura de la base de datos utilizando Prisma y luego siembra los datos iniciales de prueba (fases, partidos, usuarios y pronósticos de prueba):
```bash
npx prisma db push
node prisma/seed.js
```

### 3. Iniciar Servidor de Desarrollo
Inicia el servidor Next.js:
```bash
npm run dev
```
Entra a [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 👥 Cuentas de Prueba Sembradas

Todas las cuentas creadas por el seeder usan la contraseña **`password123`**:

| Nombre | Rol | Estado | Correo Electrónico |
| :--- | :--- | :--- | :--- |
| **Administrador Polla** | `ADMIN` | `ACTIVE` | `admin@polla.com` |
| **Juan Pérez** | `USER` | `ACTIVE` | `juan@example.com` |
| **María Gómez** | `USER` | `INACTIVE` | `maria@example.com` |

---

## 🐳 Despliegue en Producción (Docker)

Para compilar y arrancar la aplicación completa bajo un ambiente productivo optimizado (standalone):

```bash
# Construir imágenes y encender servicios
docker compose up --build
```
La aplicación estará sirviendo en el puerto `3000` ([http://localhost:3000](http://localhost:3000)).

---

## 📋 Reglas de Negocio Implementadas

1. **Guardado Inteligente**: Un usuario no autenticado puede rellenar puntuaciones en la grilla pública. Al presionar "Guardar Pronósticos" se abrirá un modal de Login/Registro. Si se loguea de forma exitosa y su cuenta es activa, sus pronósticos se guardarán de forma inmediata y automática.
2. **Activación de Cuenta**: Al registrarse, las cuentas quedan en estado `INACTIVE`. Si un usuario inactivo intenta guardar, verá un modal con un botón directo a WhatsApp para notificar al administrador sobre su pago simbólico para que lo active manualmente.
3. **Puntuación Mundialista**:
   - **Ganador Correcto**: +1 punto.
   - **Empate Correcto**: +1 punto.
   - **Marcador Exacto**: +3 puntos (esta regla tiene prioridad y otorga 3 puntos, no 4 en total).
   - Todo lo demás otorga 0 puntos.
4. **Fases del Torneo**:
   - **Ronda de 32** (Abierta por defecto en el seed).
   - **Octavos de Final** (Bloqueada).
   - **Cuartos de Final** (Bloqueada).
   - **Semifinal** (Bloqueada).
   - **Final** (Bloqueada).
   *Los pronósticos solo se pueden registrar para partidos pertenecientes a fases con estado `OPEN` y antes de la fecha límite establecida (`closeAt`).*
