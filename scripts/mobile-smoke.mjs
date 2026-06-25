import { chromium } from 'playwright';

const baseUrl = process.env.MATIMATO_SMOKE_URL ?? 'http://127.0.0.1:3000';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const viewports = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-15', width: 390, height: 844 },
  { name: 'iphone-15-pro-max', width: 430, height: 932 }
];
const screens = [
  { name: 'home', label: 'Own the grid.' },
  { name: 'journey', nav: 'Journey', label: 'Unlock complexity with XP.' },
  { name: 'ranks', nav: 'Ranks', label: 'Climb the arena.', scroll: true },
  { name: 'history', nav: 'History', label: 'Recent duels.', scroll: true },
  { name: 'profile', nav: 'Profile', label: 'Player card', scroll: true }
];

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  });
  await context.route('**/api/leaderboard', (route) => route.fulfill({ json: { leaderboard: Array.from({ length: 50 }, (_, index) => ({ playerId: `rank-${index}`, tag: `Player ${index + 1}`, score: 2500 - index * 10, wins: 50 - index })) } }));
  await context.route('**/api/history?**', (route) => route.fulfill({ json: { history: Array.from({ length: 40 }, (_, index) => ({ id: `history-${index}`, result: index % 3 === 0 ? 'defeat' : 'victory', opponent: 'Matimato AI', score: 40 + index, opponentScore: 35 + index, completedAt: new Date(2026, 5, 25 - (index % 12)).toISOString() })) } }));
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${viewport.name}: console error ${message.text()}`);
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const playNow = page.getByRole('button', { name: 'Play now' });
  if (await playNow.isVisible({ timeout: 1500 }).catch(() => false)) {
    await playNow.click();
  }

  for (const screen of screens) {
    if (screen.nav) await page.getByRole('button', { name: screen.nav, exact: true }).click();
    await page.getByText(screen.label, { exact: false }).waitFor({ timeout: 7000 });
    const result = await page.evaluate(({ shouldScroll }) => {
      const doc = document.documentElement;
      const nav = document.querySelector('.nav')?.getBoundingClientRect();
      const slot = document.querySelector('.screen-slot')?.getBoundingClientRect();
      const overflowElements = [...document.querySelectorAll('button, .list-card, .kpi, .chip, h1, h2, p')]
        .filter((element) => !element.classList.contains('sr-only') && element.scrollWidth > element.clientWidth + 1);
      let scrollOk = true;
      if (shouldScroll) {
        const scroller = document.querySelector('.scroll-panel, .scroll-list');
        if (!scroller) scrollOk = false;
        else {
          const before = scroller.scrollTop;
          scroller.scrollTop = scroller.scrollHeight;
          scrollOk = scroller.scrollTop > before || scroller.scrollHeight <= scroller.clientHeight;
        }
      }
      return {
        docScroll: doc.scrollHeight - window.innerHeight,
        navOverlap: Boolean(nav && slot && nav.top < slot.bottom - 1),
        overflowCount: overflowElements.length,
        scrollOk
      };
    }, { shouldScroll: Boolean(screen.scroll) });
    if (result.docScroll > 2) failures.push(`${viewport.name}/${screen.name}: document scroll ${result.docScroll}`);
    if (result.navOverlap) failures.push(`${viewport.name}/${screen.name}: nav overlaps content`);
    if (result.overflowCount > 0) failures.push(`${viewport.name}/${screen.name}: ${result.overflowCount} text/control overflows`);
    if (!result.scrollOk) failures.push(`${viewport.name}/${screen.name}: scroll region did not move`);
  }
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`mobile smoke passed for ${viewports.length} viewports at ${baseUrl}`);
