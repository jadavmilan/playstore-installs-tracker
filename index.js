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

  for (let i = 0; i < packageNames.length; i++) {

    const packageName = packageNames[i][0];

    if (!packageName) continue;

    try {

      const app = await gplay.app({
        appId: packageName
      });

      const installs = app.installs || 'N/A';

      const row = i + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `H${row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[installs]]
        }
      });

      console.log(packageName, installs);

    } catch (e) {

      const row = i + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `H${row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['ERROR']]
        }
      });

      console.log(packageName, e.message);
    }
  }
}

main();
