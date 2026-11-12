# ==========================================
# ESTAGIO 1: BUILDER (Compilacao TypeScript)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copia manifestos de dependencias
COPY package*.json ./

# Instala todas as dependencias (incluindo devDependencies para build)
RUN npm ci

# Copia codigo-fonte e configuracoes de compilacao
COPY tsconfig.json ./
COPY src ./src

# Compila o TypeScript gerando os bundles em dist/
RUN npm run build

# ==========================================
# ESTAGIO 2: RUNNER (Execucao Enxuta em Producao)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3333

# Copia manifestos de dependencias
COPY package*.json ./

# Instala estritamente as dependencias de producao
RUN npm ci --omit=dev && npm cache clean --force

# Copia os artefatos compilados do estagio builder
COPY --from=builder /usr/src/app/dist ./dist

# Copia templates Handlebars para manter views em producao
COPY src/modules/mailer/templates/views ./src/modules/mailer/templates/views

# Seguranca: Executa a aplicacao sob o usuario sem privilegios 'node'
USER node

EXPOSE 3333

# Inicializa o servico
CMD ["node", "dist/server.js"]

