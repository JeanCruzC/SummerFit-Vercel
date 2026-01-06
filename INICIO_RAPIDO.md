# 🚀 Guía de Inicio Rápido - SummerFit

## ✅ Lo que se ha implementado:

### 1. Landing Page Premium (`/`)
- Página principal con diseño moderno
- Secciones: Hero, Features, Benefits, CTA
- Navegación a Login y Registro

### 2. Sistema de Autenticación
- **Login**: `/login` - Autenticación con Supabase
- **Registro**: `/register` - Creación de cuentas
- **Dashboard**: `/dashboard` - Redirige a Streamlit después de login

### 3. Credenciales Supabase Configuradas
```
URL: https://guokspyuzpvzsobhfbvx.supabase.co
Publishable Key: sb_publishable_qOR34CoTXiSWAfAQqVocCw_XhyCNA1R
Secret Key: sb_secret_XHsxDpTG6J0W7qdOwNMwRA_LNoC9gUX
```

## 🎯 Cómo ejecutar:

### Frontend Next.js (Landing + Auth):
```bash
cd /home/jcc/Descargas/SummerFit--main/web
npm install  # Si no tienes npm, instala Node.js primero
npm run dev
```
Abre: http://localhost:3000

### Backend Streamlit (Dashboard):
```bash
cd /home/jcc/Descargas/SummerFit--main
pip install -r requirements.txt
streamlit run app/streamlit_app.py
```
Abre: http://localhost:8501

## 📋 Flujo de Usuario:

1. Usuario visita `/` (Landing page)
2. Click en "Comenzar gratis" → `/register`
3. Crea cuenta con Supabase
4. Redirige a `/dashboard`
5. Dashboard redirige automáticamente a Streamlit (puerto 8501)
6. Usuario usa la app Streamlit con su sesión autenticada

## 🔧 Archivos Creados:

```
web/
├── app/
│   ├── (marketing)/
│   │   └── page.tsx          # Landing page principal
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx      # Página de login
│   │   └── register/
│   │       └── page.tsx      # Página de registro
│   └── (dashboard)/
│       └── dashboard/
│           └── page.tsx      # Redirige a Streamlit
├── middleware.ts             # Protección de rutas
└── .env.local               # Variables de entorno

.env                          # Variables para Streamlit
```

## 🎨 Características del Diseño:

- ✅ Gradientes purple/pink modernos
- ✅ Glassmorphism effects
- ✅ Animaciones suaves
- ✅ Responsive mobile-first
- ✅ Iconos Lucide React
- ✅ Formularios con validación
- ✅ Estados de loading

## 🔐 Seguridad:

- Autenticación con Supabase Auth
- Middleware para proteger rutas
- Cookies seguras con SSR
- Validación de formularios

## 📝 Próximos Pasos:

1. Instalar Node.js si no lo tienes
2. Ejecutar `npm install` en la carpeta web
3. Ejecutar ambos servidores (Next.js y Streamlit)
4. Crear una cuenta de prueba
5. Disfrutar de la app completa

## 🐛 Solución de Problemas:

**Si npm no funciona:**
```bash
# Instalar Node.js en Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Si Streamlit no conecta con Supabase:**
- Verifica que el archivo `.env` existe en la raíz
- Verifica las credenciales en el archivo

**Si el login no funciona:**
- Verifica que Supabase esté configurado correctamente
- Revisa la consola del navegador para errores
