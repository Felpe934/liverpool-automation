import { test } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { gotoWithHydrationRetry } from './utils/navigation';
import { acceptCookiesIfPresent, searchProduct } from './utils/liverpool-flow';

const BASE_URL = 'https://www.liverpool.com.mx/tienda/home';
const SEARCH_TERM = 'playstation 5';

test('Auditoría de accesibilidad (axe-core) en la página de resultados de búsqueda', async ({
  page,
}, testInfo) => {
  await gotoWithHydrationRetry(page, BASE_URL);
  await acceptCookiesIfPresent(page);
  await searchProduct(page, SEARCH_TERM);

  await page
    .locator('a[data-testid$="-card-card-link"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const violations = accessibilityScanResults.violations;
  const criticalViolations = violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  console.log(`\n--- REPORTE DE ACCESIBILIDAD ---`);
  console.log(`Total de violaciones encontradas: ${violations.length}`);
  console.log(`Críticas/Serias: ${criticalViolations.length}`);

  if (violations.length > 0) {
    violations.forEach((v, i) => {
      console.log(`\n${i + 1}. [${v.impact?.toUpperCase()}] ${v.id}`);
      console.log(`   Descripción: ${v.description}`);
      console.log(`   Elementos afectados: ${v.nodes.length}`);
      console.log(`   Más info: ${v.helpUrl}`);
    });
  } else {
    console.log('Sin violaciones detectadas.');
  }

  // NOTA DE DISEÑO (ver TEST_STRATEGY.md):
  // Este test es de naturaleza AUDITORA/INFORMATIVA, no un gate de aceptación.
  // Escaneamos el sitio real de producción de Liverpool (que no controlamos)
  // y adjuntamos el reporte completo como evidencia en el HTML report de
  // Playwright, en vez de usar expect() para no bloquear el pipeline de CI
  // por un problema de accesibilidad que está fuera de nuestro alcance arreglar.
  await testInfo.attach('accessibility-report.json', {
    body: JSON.stringify(
      {
        totalViolations: violations.length,
        criticalOrSerious: criticalViolations.length,
        violations: violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.helpUrl,
          nodesAffected: v.nodes.length,
        })),
      },
      null,
      2
    ),
    contentType: 'application/json',
  });

  if (criticalViolations.length > 0) {
    console.warn(
      `\n  ADVERTENCIA: Se encontraron ${criticalViolations.length} violación(es) crítica(s)/seria(s) en el sitio de Liverpool. Ver reporte adjunto para detalles. Esto NO falla el pipeline por diseño (ver TEST_STRATEGY.md).`
    );
  }
});