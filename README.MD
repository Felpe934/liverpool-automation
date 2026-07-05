# Liverpool PS5 Search — Test Automation Framework

Automatizacion E2E del flujo de busqueda de "playstation 5" en Liverpool Mexico, con validacion cruzada contra la respuesta de red real, usando Playwright + TypeScript.

## Stack

- Playwright (TypeScript)
- playwright-extra + puppeteer-extra-plugin-stealth (necesario porque Liverpool usa bot-detection Akamai que bloquea Chromium headless por defecto)
- @axe-core/playwright (auditoria de accesibilidad)

## Instalacion

git clone https://github.com/Felpe934/liverpool-automation.git
cd liverpool-automation
npm install
npx playwright install --with-deps

## Como correr los tests

Headless (default, requerido por el challenge):
npm test

Headed (con ventana visible del navegador):
npm run test:headed

Todos los navegadores (Chromium, Firefox, WebKit):
npm run test:all-browsers

Un archivo de test especifico:
npx playwright test tests/liverpool-search.spec.ts --project=chromium

Ver el ultimo reporte HTML generado:
npm run report

## Estructura del proyecto

tests/
  liverpool-search.spec.ts     -> Flujo principal (Parte 1 + Parte 2 del challenge)
  data-driven-search.spec.ts   -> Bonus: mismo flujo parametrizado (PS5, Xbox, Switch)
  performance.spec.ts          -> Bonus: assertion de tiempo de carga
  accessibility.spec.ts        -> Bonus: auditoria axe-core (reporta, no bloquea CI)
  fixtures.ts                  -> Fixture custom con navegador stealth (bypass Akamai)
  utils/
    liverpool-flow.ts          -> Logica reutilizable de busqueda/filtro/extraccion
    navigation.ts              -> Helper de navegacion con retry ante bug de assets 404
    api-validation.ts          -> Interceptacion de red + validacion cruzada UI vs API

## Notas tecnicas importantes

- Bot-detection (Akamai): Liverpool bloquea Chromium headless estandar con "Access Denied". Se resolvio con playwright-extra + stealth plugin. Ver detalle en TEST_STRATEGY.md.
- Bug intermitente de assets 404: el sitio a veces sirve HTML con hashes de build desincronizados del CDN, dejando la pagina sin estilos. Se mitiga con reintentos automaticos (gotoWithHydrationRetry), hasta 5 intentos con backoff.
- CI corre solo en Chromium por estabilidad; localmente puedes correr los 3 navegadores con npm run test:all-browsers.

## CI/CD

El pipeline de GitHub Actions (.github/workflows/test.yml) se ejecuta en cada push/PR a main:
1. Instala dependencias y navegadores
2. Corre el suite completo en headless
3. Sube el reporte HTML como artifact (disponible incluso si algun test falla)

Ultimo run exitoso: ver pestana Actions de este repositorio (https://github.com/Felpe934/liverpool-automation/actions)

## Documento de estrategia

Ver TEST_STRATEGY.md para el analisis de trade-offs, manejo de CAPTCHA hipotetico, riesgos de flakiness y consideraciones de escalado a CI de equipo.