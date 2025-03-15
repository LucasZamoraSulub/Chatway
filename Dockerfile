# Fase de compilación
FROM node:21-bullseye-slim as builder

WORKDIR /app

# Habilitar pnpm y configurar entorno
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

# Copiar solo archivos esenciales para la instalación de dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copiar el resto del código fuente
COPY . .

# Compilar el código TypeScript a JavaScript en la carpeta dist/
RUN pnpm run build && ls -la dist

# Fase de despliegue
FROM node:21-bullseye-slim as deploy

WORKDIR /app

ARG PORT
ENV PORT $PORT
EXPOSE $PORT

# Copiar archivos esenciales desde la fase de compilación
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/*.json /app/*-lock.yaml ./

# Instalar solo las dependencias necesarias para producción
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

RUN pnpm install --production --ignore-scripts

# Asegurar que el directorio dist/ existe antes de ejecutar
RUN if [ ! -d "dist" ]; then echo "🚨 ERROR: La carpeta dist/ no se generó correctamente" && exit 1; fi

# Ejecutar el bot directamente en producción
CMD ["npm", "start"]