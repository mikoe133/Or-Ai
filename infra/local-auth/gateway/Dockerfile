FROM nginx:1.28.3-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236
COPY nginx.conf /etc/nginx/nginx.conf
ARG WEB_PORT=5173
RUN case "$WEB_PORT" in ''|*[!0-9]*) exit 1;; esac && sed -i "s/__WEB_PORT__/$WEB_PORT/g" /etc/nginx/nginx.conf
ENTRYPOINT ["nginx", "-g", "daemon off;"]
