# Test Strategy

## 1. ¿Qué no automatizaría en este flujo, y por qué?

**Visual regression del layout completo de la página de resultados.** Durante el desarrollo confirmé que Liverpool usa banners promocionales rotativos, precios dinámicos (descuentos que cambian según inventario/vendedor), y descubrí un bug real e intermitente del sitio donde el CDN sirve HTML con hashes de build desincronizados de los assets estáticos disponibles (ver sección 3). Un screenshot diff sobre esta página generaría falsos positivos constantemente, no por mala implementación sino por la naturaleza cambiante del contenido. En su lugar, haría visual regression solo sobre componentes aislados y estables (ej. el ícono del carrito, el header estático), nunca sobre la grilla completa de productos.

**Verificación del contenido exacto de imágenes de producto.** Validar que la imagen "correcta" se muestre requeriría comparación visual o ML, es costoso y frágil comparado con el valor que aporta; el nombre/SKU ya identifica el producto de forma confiable.

**Pruebas de carga/concurrencia real contra Liverpool.** No es nuestro sitio; generar tráfico de carga contra un ambiente de producción de terceros es éticamente cuestionable y probablemente violaría sus términos de servicio.

## 2. Si Liverpool añadiera un CAPTCHA al flujo de búsqueda, ¿cómo lo manejaría?

Primero diagnosticaría si es un CAPTCHA de fricción total (bloquea toda navegación) o condicional (solo aparece bajo ciertas señales de bot). Durante este proyecto ya enfrenté un caso similar: Akamai bloqueaba el navegador headless con "Access Denied" en `errors.edgesuite.net`. Lo resolví con `playwright-extra` + `puppeteer-extra-plugin-stealth`, que parcha las señales de automatización (`navigator.webdriver`, fingerprint de Chrome headless, etc.) sin necesidad de resolver ningún challenge.

Si el CAPTCHA es del tipo que *sí* requiere interacción humana real (reCAPTCHA v2/hCaptcha visual), **no lo automatizaría con bypass o servicios de resolución de terceros** — eso viola términos de servicio y es una mala práctica de ingeniería. La estrategia correcta sería:
1. Aislar el entorno de pruebas (whitelisting de IP de CI con el equipo de Liverpool si es un partner de confianza, o usar un ambiente de staging sin el CAPTCHA activo).
2. Si no hay ambiente alterno disponible, documentar la limitación explícitamente y reducir el alcance de E2E real, complementando con pruebas a nivel de API/contrato (como ya hacemos en la Parte 2) que no dependen del CAPTCHA.

## 3. ¿Qué riesgos de flakiness existen, y cómo los mitigué?

**Bot-detection de Akamai en modo headless** (confirmado con mensaje `Access Denied` / `errors.edgesuite.net`). Mitigado con stealth plugin, user-agent realista, locale/timezone `es-MX`, y viewport de escritorio fijo.

**Assets estáticos 404 intermitentes.** Descubrí durante el desarrollo que la home de Liverpool a veces sirve HTML apuntando a hashes de build de CSS/JS que ya no existen (probablemente desincronización de CDN/despliegue), dejando la página sin estilos. Esto le pasaría a un usuario real también, no es exclusivo de automatización. Mitigado con un helper `gotoWithHydrationRetry` que detecta 404s en `_next/static` y hace `reload()` con backoff progresivo (hasta 5 intentos) antes de fallar.

**Elementos duplicados en el DOM (strict mode violations).** El input de búsqueda existe dos veces (versión desktop y móvil) con el mismo `data-testid`. Mitigado filtrando por `:visible` y tomando `.first()`.

**Timing de red al interceptar respuestas.** La intercepción de la búsqueda debe registrarse *antes* de disparar la acción que la dispara (el click de ordenar), no después — evita una condición de carrera donde la respuesta llega antes de que empecemos a escuchar.

**Retries en CI:** configuré `retries: 2` solo quando `CI=true`, nunca en local, para no ocultar fallos reales durante el desarrollo pero sí absorber flakiness de red transitoria en el pipeline.

## 4. Si tuviera que integrar esto en el CI de un equipo con 50+ suites

- **Aislar por tags/proyectos**: correr este suite como su propio job independiente (no bloqueante para otros equipos), con un timeout generoso pero acotado (usamos 60s/test) para no consumir minutos de runner compartidos innecesariamente.
- **Reducir a smoke tests en cada PR, suite completa en nightly**: el flujo completo con 3 browsers + bonus (accesibilidad, performance) correría solo 1 vez al día; en cada PR solo Chromium + el flujo crítico (Partes 1 y 2).
- **Externalizar la accesibilidad como auditoría, no gate**: como ya implementé (`expect.soft` reemplazado por reporte adjunto vía `testInfo.attach`), estos checks informan sin bloquear el merge de otros equipos por un problema de un tercero.
- **Sharding**: con 50+ suites, usaría `--shard` de Playwright para paralelizar entre múltiples runners en vez de saturar uno solo.
- **Alertas separadas del gate de CI**: si el sitio externo (Liverpool) empieza a fallar por su propio bug (como el 404 de assets que documentamos), un Slack/email de alerta es más útil que un pipeline rojo que bloquea a 50 equipos por un problema que no es de ellos.