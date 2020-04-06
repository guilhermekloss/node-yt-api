const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { promisify } = require('util');

const scope = ["https://www.googleapis.com/auth/youtube.readonly"];
const creds = require('./client_secret.json');
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

(async () => {
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)();
    const ids = rows.map(r => r.id).join(',');

    fs.readFile("oauth-client-creds.json", (err, content) => {
        if (err) {
            return console.log("Cannot load client secret file:", err);
        }

        // Authorize a client with credentials, then make API call.
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        );

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scope
        });
        console.log("Visit this URL to authorize this app:", authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Enter the auth code from that URL: ", code => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                oAuth2Client.setCredentials(token);
                callApi(oAuth2Client);
            });
        });
    });

    let callApi = auth => {
        const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth });

        youtubeAnalytics.reports
            .query({
                startDate: "2019-01-01",
                endDate: "2019-12-31",
                ids: "channel==MINE",
                filters: `video==${ids}`,
                dimensions: "video",
                metrics: "estimatedMinutesWatched,averageViewDuration"
            })
            .then(async response => {
                console.log(response.data.rows);
                response.data.rows.forEach(async (row, index) => {
                    rows[index].minutes_watched = row[1];
                    rows[index].avd = row[2];
                    await promisify(rows[index].save)();
                });
            })
            .catch(error => console.log("The API returned an error: ", error.message));
    };
})();