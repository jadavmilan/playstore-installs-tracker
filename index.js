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

  const packageNames = response.data.values || [];

  const output = [];

  for (let i = 0; i < packageNames.length; i++) {
    const packageName = packageNames[i][0];

    if (!packageName) {
      output.push(['']);
      continue;
    }

    try {
      const app = await gplay.app({
        appId: packageName
      });

      const installs = app.installs || 'N/A';

      output.push([installs]);

      console.log(`${packageName} => ${installs}`);
    } catch (e) {
      output.push(['ERROR']);

      console.log(`${packageName} => ERROR`);
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `H2:H${output.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: output
    }
  });

  console.log(`Updated ${output.length} rows`);
}

main().catch(console.error);
