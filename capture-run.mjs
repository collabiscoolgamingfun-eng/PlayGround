import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const runtime = join(process.env.HOME || '/home/runner', '.local/share/omgithub-playwright');
const require = createRequire(join(runtime, 'package.json'));
const { chromium } = require('playwright');
const cfgPath = join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json');
let config;
try {
  config = JSON.parse(readFileSync(cfgPath, 'utf8'));
} catch (error) {
  console.error(`capture setup defect: cannot read ${cfgPath}: ${error.message}`);
  process.exit(1);
}
if (process.platform === 'linux') {
  try {
    process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim();
  } catch (error) {
    console.error(`browser infrastructure: cannot read display: ${error.message}`);
    process.exit(75);
  }
}

const url = process.env.CAPTURE_URL;
const output = process.env.CAPTURE_DIR;
if (!url || !output) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.');
  process.exit(1);
}
try {
  new URL(url);
} catch {
  console.error(`script defect: invalid CAPTURE_URL: ${url}`);
  process.exit(1);
}
mkdirSync(output, { recursive: true });

const transient = (error) => { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { exitCode: 75 }); };
let browser;
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient);
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: name === 'mobile',
      isMobile: name === 'mobile',
    }).catch(transient);
    const page = await context.newPage().catch(transient);
    page.setDefaultTimeout(30000);
    page.on('pageerror', (error) => console.error(`pageerror ${name}: ${error.message}`));
    const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(transient);
    if (!response?.ok()) {
      const status = response?.status();
      const code = !response || [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1;
      throw Object.assign(new Error(`HTTP ${status} loading preview`), { exitCode: code });
    }
    await page.locator('body').waitFor({ state: 'visible' }).catch(transient);
    await page.waitForFunction(() => document.fonts.status === 'loaded').catch(() => {});
    try {
      await page.locator('#scene').waitFor({ state: 'visible', timeout: 20000 });
    } catch {
      throw Object.assign(new Error('rendering defect: #scene canvas not visible'), { exitCode: 1 });
    }
    await page.waitForTimeout(2500);
    try {
      const play = page.getByRole('button', { name: /^play$/i });
      if ((await play.count()) > 0 && (await play.first().isVisible())) {
        await play.first().click({ timeout: 4000 });
        await page.waitForTimeout(2500);
      }
    } catch (error) {
      console.error(`auto-start skipped: ${error.message}`);
    }
    const rendered = await page.evaluate(() => {
      const c = document.getElementById('scene');
      return !!(c && c.width > 50 && c.height > 50);
    }).catch(transient);
    if (!rendered) throw Object.assign(new Error('rendering defect: canvas has no pixels'), { exitCode: 1 });
    await page.screenshot({ path: join(output, `final-${name}.png`), timeout: 30000 }).catch((error) => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) transient(error);
      throw error;
    });
    console.log(`Capture ${name}: ok`);
    await context.close().catch(() => {});
  }
} catch (error) {
  console.error(error);
  process.exitCode = error.exitCode || 1;
} finally {
  await browser?.close().catch((error) => { console.error(error); process.exitCode ||= 75; });
}
