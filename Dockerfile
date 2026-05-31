FROM node:20-alpine

RUN apk add --no-cache tini

ENV NODE_ENV=production
USER node

WORKDIR /app

COPY --chown=node:node . ./

RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock

EXPOSE 3000

CMD [ "/sbin/tini", "--", "node", "app.js" ]
