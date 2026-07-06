# KetoLife Pro

PWA offline-first para seguimiento de dieta cetogénica (keto) y ayuno intermitente 16:8.

## Características

- Interfaz bilingüe (español / inglés).
- Seguimiento de ventana de alimentación (10:00–18:00).
- Registro de comidas, macronutrientes y agua.
- Hábitos diarios y recordatorios.
- Guía de alimentos keto con búsqueda.
- Registro de peso con gráfica SVG.
- Evidencia de progreso (fotos y notas).
- Exportación/importación de datos JSON.
- Funciona sin conexión como PWA instalable.

## Requisitos

- Navegador moderno con soporte para IndexedDB, Service Workers y Notificaciones Web.
- Sin backend, sin paso de compilación, sin dependencias externas.

## Ejecutar localmente

```bash
python3 -m http.server 8080
```

Abre [http://localhost:8080](http://localhost:8080) en tu navegador.

## Instalar como PWA

1. Abre la app en un navegador compatible (Chrome, Edge, Safari iOS 16.4+, etc.).
2. Toca el ícono de instalación en la barra de direcciones / menú compartir.
3. Sigue las instrucciones para agregar a la pantalla de inicio.

## Estructura del proyecto

```
keto-pwa/
├── index.html
├── manifest.json
├── css/          # tokens, base, layout, componentes
├── js/           # app, db, i18n, componentes, service worker
├── icons/        # íconos PWA
└── README.md
```

## Licencia

Uso personal.
