const { test, expect } = require('@playwright/test');

// A release must never mix old cached scripts with new pages
test('the service worker prefers the network over an old cached file', async ({ page }) => {
  await page.goto('/privacy.html');
  const text = await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise(r => setTimeout(r, 50));
    const names = await caches.keys();
    const cache = await caches.open(names[0]);
    await cache.put('/auth.js', new Response('OLD CACHED VERSION'));
    return (await fetch('/auth.js')).text();
  });
  expect(text).toContain('sendLoginLink');
});

test('offline, cached files still open', async ({ page, context }) => {
  await page.goto('/privacy.html');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise(r => setTimeout(r, 50));
  });
  await context.setOffline(true);
  const text = await page.evaluate(async () => (await fetch('/auth.js')).text());
  await context.setOffline(false);
  expect(text).toContain('sendLoginLink');
});
