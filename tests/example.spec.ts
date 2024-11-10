import { test, expect, Locator } from '@playwright/test';
import fs from 'fs';

type BgData = {
  bggId: string;
  imageUrl: string;
  title: string;
  year: string;
};

const getImageUrl = (row: HTMLTableRowElement) =>
  (row.querySelector('td:nth-child(2) img') as HTMLImageElement | null)?.src;
// rowLocator
//   .locator('td')
//   .nth(1)
//   .locator('img')
//   .evaluate((image: HTMLImageElement) => image.src);

const getTitleCell = (rowLocator: Locator) => rowLocator.locator('td').nth(2);

// const getBggLink = (rowLocator: Locator) =>
//   getTitleCell(rowLocator)
//     .locator('a')
//     .evaluate((a: HTMLAnchorElement) => a.href);

// const getTitle = (rowLocator: Locator) =>
//   getTitleCell(rowLocator)
//     .locator('a')
//     .evaluate((a: HTMLAnchorElement) => a.innerText);

// const getYear = (rowLocator: Locator) =>
//   getTitleCell(rowLocator)
//     .locator('span')
//     .evaluate((span: HTMLSpanElement) => {
//       const yearWithParenthesis = span.innerText;
//       return yearWithParenthesis.slice(1, yearWithParenthesis.length - 1);
//     });

const extractBgFromRow = (rowLocator: HTMLTableRowElement) => {
  const result: Partial<BgData> = {};

  result.imageUrl = getImageUrl(rowLocator);
  // result.bggLink = await getBggLink(rowLocator);
  // result.title = await getTitle(rowLocator);
  // result.year = await getYear(rowLocator);

  return result as BgData;
};

const extractBgsFromPage = async (page: any) => {
  const bgRowLocator = page.locator(
    '.collection_table tr:not(.geekcollection_ad)'
  );
  await expect(bgRowLocator.nth(1)).toBeVisible();

  const extractedBgs = await bgRowLocator.evaluateAll(
    (rows: HTMLTableRowElement[]) => {
      const bgs: BgData[] = [];

      rows.forEach((row) => {
        const result: Partial<BgData> = {};

        result.imageUrl =
          (row.querySelector('td:nth-child(2) img') as HTMLImageElement | null)
            ?.src ?? '';

        const titleLink = row.querySelector(
          'td:nth-child(3) a'
        ) as HTMLAnchorElement | null;
        result.bggId = titleLink?.href.split('/')[4];
        result.title = titleLink?.innerText ?? '';

        result.year =
          (
            row.querySelector('td:nth-child(3) span') as HTMLSpanElement | null
          )?.innerText.slice(1, -1) ?? '';

        if (!result.bggId) {
          return;
        }

        bgs.push(result as BgData);
      });

      return bgs;
    }
  );

  return extractedBgs;
};

const initialPage = 44;

test('run', async ({ page }) => {
  await page.goto('https://boardgamegeek.com/login');
  await page.getByPlaceholder('Username').click();
  await page.getByPlaceholder('Username').fill('leodiehl');
  await page.getByPlaceholder('Username').press('Tab');
  await page.getByPlaceholder('Password').fill('v2@3u3F9');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/https:\/\/boardgamegeek.com\/\?/);

  let currentPage = initialPage;
  let pagesCount = 0;

  while (true) {
    const result: BgData[] = [];

    pagesCount += 1;
    if (pagesCount > 10) {
      break;
    }

    console.log('--- currentPage ---'); // [XXX] REMOVE BEFORE COMMITING
    console.log(currentPage); // [XXX] REMOVE BEFORE COMMITING

    try {
      await page.goto(
        `https://boardgamegeek.com/browse/boardgame/page/${currentPage}?sort=numvoters&sortdir=desc`
      );
    } catch (error) {
      console.log('--- error ---'); // [XXX] REMOVE BEFORE COMMITING
      console.log(error); // [XXX] REMOVE BEFORE COMMITING
      break;
    }

    const extractedBgs = await extractBgsFromPage(page);
    result.push(...extractedBgs);
    const orderedResult = result.map((bg, index) => ({
      ...bg,
      orderByNumberOfVoters: index + 1,
    }));

    fs.writeFileSync(
      `${currentPage}.json`,
      JSON.stringify(orderedResult, null, 2)
    );

    currentPage += 1;
  }
});
