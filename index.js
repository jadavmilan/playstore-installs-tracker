const { google } = require('googleapis');
const gplay = require('google-play-scraper');

function formatInstalls(installs) {
  if (!installs) return 'N/A';

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
    return Number.isInteger(value) ? `${value.toFixed(1)}K+` : `${value.toFixed(1)}K+`;
  }

  return installs;
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

  for (const row of rows) {
    const value = row[0]?.trim();

    if (!value) {
      output.push(['']);
      continue;
    }

    // iOS handling
    if (
      value.includes('apps.apple.com') ||
      value.startsWith('http://apps.apple.com') ||
      value.startsWith('https://apps.apple.com')
    ) {
      output.push(['IOS APP']);
      continue;
    }

    try {
      const app = await gplay.app({
        appId: value
      });

      output.push([
        formatInstalls(app.installs)
      ]);

      console.log(`${value} => ${formatInstalls(app.installs)}`);

    } catch (error) {
      output.push(['NOT FOUND']);
      console.log(`${value} => NOT FOUND`);
    }
  }

  // Only column H (installs only)
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:H${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: output
    }
  });

  console.log(`Updated ${output.length} rows (ONLY INSTALLS)`);
}

main().catch(console.error);
