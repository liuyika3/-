import { chromium } from 'playwright';

const shots = [
  {
    name: 'philips-smartsleep',
    url: 'https://www.usa.philips.com/c-p/HF3650_60/smartsleep-sleep-and-wake-up-light/overview',
    out: 'public/products/philips-smartsleep.png',
  },
  {
    name: 'osea-ocean-cleanser',
    url: 'https://oseamalibu.com/collections/skincare/products/ocean-cleanser',
    out: 'public/products/osea-ocean-cleanser.png',
  },
  // Hema detail pages can be flaky; keep a fallback stock image shot
  {
    name: 'lemon-pack',
    url: 'https://www.pakutaso.com/en/20220659175content-48.html',
    out: 'public/products/lemon-pack.png',
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  for (const s of shots) {
    console.log(`[shot] ${s.name}`);
    await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    // Try to remove cookie banners/overlays by pressing Escape
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(800);

    // Full-page screenshot then we can use as product image (good enough for demo)
    await page.screenshot({ path: s.out, fullPage: false });
  }

  await browser.close();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

