FROM node:24.14.0-alpine AS browser
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM golang:1.27.1-alpine AS bastion
WORKDIR /src
COPY go.mod ./
COPY cmd/ ./cmd/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /bastion ./cmd/bastion

FROM scratch
COPY --from=bastion /bastion /bastion
COPY --from=bastion /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=browser /src/web/dist /web
USER 65532:65532
ENV LISTEN=0.0.0.0:8080 ASSETS=/web
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD ["/bastion", "-healthcheck"]
ENTRYPOINT ["/bastion"]
