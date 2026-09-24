# Gateway — Nginx

> **Estado**: funcional desde Sprint 1 (Batch 2, **T-S1.14**). Punto único de
> entrada para la app móvil según DT-02 (`docs/05-arquitectura.md`).

## Propósito

`gateway/nginx/` es el **API Gateway** de EVENTIVO. En desarrollo se sirve con
la imagen `nginx:1.27-alpine` declarada en `docker/docker-compose.dev.yml`.

| Capacidad | Implementación |
| --- | --- |
| Routing a servicios | `location /auth/` → upstream `auth:3001` (los demás servicios se añaden en sprints 2-4) |
| Red interna | `/internal/*` → **403 siempre** hacia el exterior (DT-02) |
| Rate limiting por IP | 20 r/s global (`api_global`); 5 r/s en `/auth/login` (`login`) |
| Seguridad | `server_tokens off`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |
| Tamaño máx. de body | `client_max_body_size 2m` |

## Estructura

```text
gateway/nginx/
├── nginx.conf          # configuración principal (http, límites, upstreams)
├── conf.d/
│   └── default.conf    # servidor :80 y rutas por servicio
└── README.md           # este documento
```

En el compose de desarrollo ambos archivos se montan **read-only** sobre la
imagen oficial:

```yaml
gateway:
  image: nginx:1.27-alpine
  ports: ["8080:80"]
  volumes:
    - ../gateway/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ../gateway/nginx/conf.d:/etc/nginx/conf.d:ro
  depends_on:
    auth: { condition: service_healthy }
```

## Cómo probar (desarrollo)

```bash
docker compose -f docker/docker-compose.dev.yml up -d auth-db
cp services/auth/.env.example services/auth/.env
docker compose -f docker/docker-compose.dev.yml up --build auth gateway
```

```bash
curl http://localhost:8080/healthz                 # "ok" (el propio gateway)
curl http://localhost:8080/auth/health             # health del auth-service vía gateway
curl -i http://localhost:8080/internal/auth/x      # 403 (red interna bloqueada)
```

> **Nota**: el upstream `auth` se resuelve por nombre de contenedor en la red de
> docker-compose; al levantar con `docker compose` no es necesario cambiarlo.

## Producción

Se reutiliza la misma configuración con un `server` adicional en `:443` (TLS,
HSTS y certificados del free tier). La app móvil apunta a
`https://api.eventivo.ucv.edu.pe` en producción y a `http://10.0.2.2:8080`
(emulador Android) / `http://localhost:8080` (simulador iOS) en desarrollo.

## Referencias

- Arquitectura: [`docs/05-arquitectura.md`](../../docs/05-arquitectura.md)
- Compose: [`docker/docker-compose.dev.yml`](../../docker/docker-compose.dev.yml)
- Manual de demo S1: [`docs/manual-demo-s1.md`](../../docs/manual-demo-s1.md)