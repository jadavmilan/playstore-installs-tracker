const { google } = require('googleapis');
const gplay = require('google-play-scraper');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// 🔥 FORMAT INSTALS
function formatInstalls(installs) {
  if (!installs) return null;

  const num = parseInt(installs.replace(/[^0-9]/g, ''));

  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B+';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';

  return installs;
}

// 🔥 STEP 1: DIRECT FETCH
async function fetchApp(appId) {
  try {
    return await gplay.app({ appId });
  } catch (e) {
    return null;
  }
}

// 🔥 STEP 2: FALLBACK SEARCH (VERY IMPORTANT)
async function fallbackSearch(appId) {
  try {
    const res = await gplay.search({
      term: appId,
      num: 1
    });

    if (res && res.length > 0) {
      return await gplay.app({ appId: res[0].appId });
    }

    return null;
  } catch (e) {
    return null;
  }
}

// 🔥 STEP 3: SAFE FETCH (FINAL LOGIC)
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

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetId = process.env.SHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'G2:G'
  });

  const rows = response.data.values || [];

  const output = [];

  for (let i = 0; i < rows.length; i++) {
    const appId = rows[i][0]?.trim();

    if (!appId) {
      output.push(['']);
      continue;
    }

    const app = await safeGetApp(appId);

    if (app && app.installs) {
      output.push([formatInstalls(app.installs)]);
      console.log(`${appId} => OK`);
    } else {
      output.push(['NOT FOUND']);
      console.log(`${appId} => NOT FOUND`);
    }

    // 🔥 anti-block delay
    await delay(300);
  }

  // 🔥 WRITE BACK TO SHEET
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:H${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: output
    }
  });

  console.log("🔥 DONE - SHEET UPDATED");
}

main().catch(console.error);
