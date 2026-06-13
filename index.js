const { google } = require('googleapis');
const gplay = require('google-play-scraper');

function formatInstalls(installs) {
  if (!installs) return 'N/A';

  const num = parseInt(installs.replace(/[^0-9]/g, ''));

  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B+';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';

  return installs;
}

// 🔥 delay function (important)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
    const value = rows[i][0]?.trim();

    if (!value) {
      output.push(['']);
      continue;
    }

    try {
      const app = await gplay.app({ appId: value });

      output.push([formatInstalls(app.installs)]);

      console.log(`${value} => OK`);

    } catch (err) {
      output.push(['NOT FOUND']);
      console.log(`${value} => FAIL`);
    }

    // 🔥 IMPORTANT: anti-block delay
    await delay(250);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:H${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: output }
  });

  console.log("DONE UPDATED");
}

main().catch(console.error);
