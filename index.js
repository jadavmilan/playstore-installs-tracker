const { google } = require('googleapis');
const gplay = require('google-play-scraper');

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
      output.push(['', '']);
      continue;
    }

    // Apple App Store Link
    if (value.includes('apps.apple.com')) {
      output.push(['IOS APP', 'IOS APP']);
      continue;
    }

    try {
      const app = await gplay.app({
        appId: value
      });

      output.push([
        app.installs || 'N/A',
        app.title || 'Unknown'
      ]);

      console.log(`${value} => ${app.installs}`);
    } catch (e) {
      output.push([
        'NOT FOUND',
        'NOT FOUND'
      ]);

      console.log(`${value} => NOT FOUND`);
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:I${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: output
    }
  });

  console.log(`Updated ${output.length} rows`);
}

main().catch(console.error);
