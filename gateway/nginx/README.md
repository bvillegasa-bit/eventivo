# Gateway — Nginx (placeholder)

> **Estado**: estructura creada en Sprint 1 (Batch 1); configuración funcional
> en un sprint siguiente (T-S1.13, Batch 2).

## Propósito

`gateway/nginx/` alojará el **API Gateway** de EVENTIVO: punto único de entrada
para la app móvil, con:

- **Routing** a los 5 microservicios (`/auth/*` → `auth`, `/eventos/*` → `evento`, …).
- **Rate limiting** por IP.
- **TLS** (terminación HTTPS) en el free tier.
- **Encabezados de seguridad** (HSTS, X-Content-Type-Options, CSP, …).

## Estructura prevista

```text
gateway/nginx/
├── nginx.conf          # configuración principal (upstreams, server, TLS)
├── conf.d/
│   └── default.conf    # rutas por servicio
└── README.md           # este documento
```

## Referencias

- Arquitectura: [`docs/05-arquitectura.md`](../../docs/05-arquitectura.md)
- Servicios en desarrollo: [`docker/docker-compose.dev.yml`](../../docker/docker-compose.dev.yml)