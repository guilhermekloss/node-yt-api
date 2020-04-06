
const got = require('got');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { promisify } = require('util');

const creds = require('./client_secret.json');

const doc = new GoogleSpreadsheet('1ydSEU9Dbap_Y0IoDoLXFvixPur-jpC0IfzMEvoUDhmI');

(async () => {
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)();

    const ids = rows.map(r => r.id).join(',');

    const response = await got(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=88999603415-a4m4fjq434bnlsdosn6ob837ke024pm6.apps.googleusercontent.com`
    );

    items = JSON.parse(response.body).items;
    console.log(items);

    let index = 0;
    for (const item of items) {
        rows[index].title = item.snippet.title;
        rows[index].views = item.statistics.viewCount;
        rows[index].likes = item.statistics.likeCount;
        rows[index].dislikes = item.statistics.dislikeCount;
        rows[index].comments = item.statistics.commentCount;

        await promisify(rows[index].save)();
        index++;
    };
})();