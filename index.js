const { google } = require('googleapis');
const gplay = require('google-play-scraper');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Format installs
function formatInstalls(installs) {
  if (!installs) return null;

  const num = parseInt(installs.replace(/[^0-9]/g, ''));

  if (num >= 1000000000) {
    const value = num / 1000000000;
    return Number.isInteger(value) ? `${value}B+` : `${value.toFixed(1)}B+`;
  }

  if (num >= 1000000) {
    const value = num / 1000000;
    return Number.isInteger(value) ? `${value}M+` : `${value.toFixed(1)}M+`;
  }

  if (num >= 1000) {
    const value = num / 1000;
    return Number.isInteger(value) ? `${value}K+` : `${value.toFixed(1)}K+`;
  }

  return installs;
}

// Direct fetch
async function fetchApp(appId) {
  try {
    return await gplay.app({ appId });
  } catch (e) {
    return null;
  }
}

// Fallback search
async function fallbackSearch(appId) {
  try {
    const keyword = appId.split('.').pop();

    const res = await gplay.search({
      term: keyword,
      num: 5
    });

    if (!res || res.length === 0) {
      return null;
    }

    // exact package match search
    const exactMatch = res.find(
      app => app.appId?.toLowerCase() === appId.toLowerCase()
    );

    if (exactMatch) {
      return await gplay.app({
        appId: exactMatch.appId
      });
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Safe fetch
async function safeGetApp(appId) {
  let app = await fetchApp(appId);

  if (!app) {
    app = await fallbackSearch(appId);
  }

  return app;
}

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({
    version: 'v4',
    auth
  });

  const sheetId = process.env.SHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'G2:G'
  });

  const rows = response.data.values || [];

  const output = [];

  for (let i = 0; i < rows.length; i++) {
    const value = rows[i][0]?.trim();

    if (!value) {
      output.push(['']);
      continue;
    }

    // IOS URL CHECK
    if (
      value.includes('apps.apple.com') ||
      value.startsWith('http://apps.apple.com') ||
      value.startsWith('https://apps.apple.com')
    ) {
      output.push(['IOS APP']);
      console.log(`${value} => IOS APP`);
      continue;
    }

    try {
      const app = await safeGetApp(value);

      if (app && app.installs) {
        const installs = formatInstalls(app.installs);

        output.push([installs]);

        console.log(`${value} => ${installs}`);
      } else {
        output.push(['NO DETECT']);

        console.log(`${value} => NO DETECT`);
      }
    } catch (error) {
      output.push(['NO DETECT']);

      console.log(`${value} => NO DETECT`);
    }

    await delay(300);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:H${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: output
    }
  });

  console.log(`🔥 DONE - Updated ${output.length} rows`);
}

main().catch(console.error);
