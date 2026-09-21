FROM node:20-alpine

RUN apk add --no-cache tini

ENV NODE_ENV=production
USER node

WORKDIR /app

COPY --chown=node:node . ./

# devDependencies 里有 tsc，先装全量再构建，构建完裁掉，保持镜像体积。
# NODE_ENV=production 已在上面设置，必须显式 --include=dev，否则 npm 跳过 devDeps → tsc 不存在（exit 127）
RUN npm install --ignore-scripts --no-audit --no-fund --include=dev \
  && npm run build \
  && npm prune --omit=dev

EXPOSE 3000

CMD [ "/sbin/tini", "--", "node", "dist/main.js" ]
