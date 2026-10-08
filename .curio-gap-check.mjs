import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});

const probe = async (path, width, height) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:3123${path}`, {
    waitUntil: "networkidle2",
    timeout: 180000,
  });
  await new Promise((r) => setTimeout(r, 800));
  const result = await page.evaluate(() => {
    const nav = [...document.querySelectorAll("nav.fixed")].find(
      (el) => getComputedStyle(el).display !== "none"
    );
    const navBottom = nav ? Math.round(nav.getBoundingClientRect().bottom) : null;
    const header = document.querySelector("header");
    const headerTop = header ? Math.round(header.getBoundingClientRect().top) : null;
    window.scrollTo(0, 900);
    const scrolledTo = window.scrollY;
    window.scrollTo(0, 0);
    return {
      navBottom,
      headerTop,
      gap: navBottom !== null && headerTop !== null ? headerTop - navBottom : null,
      footer: document.querySelectorAll("footer").length,
      docHeight: Math.round(document.documentElement.scrollHeight),
      innerHeight: window.innerHeight,
      scrolledTo,
    };
  });
  await page.close();
  return { path, viewport: `${width}x${height}`, ...result };
};

console.log(
  JSON.stringify(
    [await probe("/curio", 390, 844), await probe("/curio", 1440, 900)],
    null,
    2
  )
);
await browser.close();
