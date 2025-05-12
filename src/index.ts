import axios from "axios";
import * as cherrio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {webHookUrl, threadId} : {webHookUrl : string, threadId : string} = require("../config.json");

if (!webHookUrl || !threadId) {
	throw new Error("Invalid config.json");
}

let body = "";

(async () => {
  await scrape();
  if (!body) {
    body = "本日の試合はありません";
  }
  await axios({
		url: webHookUrl + `?thread_id=${threadId}`,
		method: "post",
		headers: {
			"Accept": "application/json",
			"Content-type": "application/json",
		},
		data: {
      content: body
    }
	});
})();

async function scrape() : Promise<void> {
  try {
    const url = "https://baseball.yahoo.co.jp/npb/schedule/";
    const response = await axios.get(url);
    const html = response.data;
    const $ = cherrio.load(html);
    // $(".bb-scheduleTable__row").each((i, elem) => {
    $(".bb-scheduleTable__row").each((i, elem) => {
      const text : string = $(elem).text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
      if (text.includes("楽天")) {
        if (text.includes("みどころ")) {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const homeStarter = $(elem).find(".bb-scheduleTable__player--probable").text().trim();
          const startTime = $(elem).find(".bb-scheduleTable__info > span").contents().text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const awayStarter = $(elem).find(".bb-scheduleTable__player--probable").text().trim();
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();

          // eslint-disable-next-line no-irregular-whitespace
          body = `${startTime}～　${homeTeam} (${homeStarter})  vs  ${awayTeam} (${awayStarter})　＠${stadium}`;
        }
        if (text.includes("試合前")) {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const startTime = $(elem).find(".bb-scheduleTable__info > span").text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();

          // eslint-disable-next-line no-irregular-whitespace
          body = `${startTime}～　${homeTeam}  vs  ${awayTeam}　＠${stadium}`;
        }
        if (text.includes("試合終了")) {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const startTime = $(elem).find(".bb-scheduleTable__info > span").text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();
        }
      }
      else return;
    });
  } catch (e) {
    console.error(e);
  }
  console.log(body);
}

