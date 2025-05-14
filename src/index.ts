import axios from "axios";
import * as cherrio from "cheerio";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webHookUrl, threadId } : { webHookUrl: string, threadId: string } = require("../config.json");

if (!webHookUrl || !threadId) {
	throw new Error("Invalid config.json");
}

(async () => {
  const body = await scrape() || "本日の試合はありません";

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

async function scrape(): Promise<string | null> {
  try {
    let body = "";
    const url = "https://baseball.yahoo.co.jp/npb/schedule/";
    const response = await axios.get(url);
    const html = response.data;
    const $ = cherrio.load(html);
    // $(".bb-scheduleTable__row").each((i, elem) => {
    $(".bb-scheduleTable__row--today").each((i, elem) => {
      const text : string = $(elem).text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
      if (text.includes("楽天")) {
        const status = $(elem).find(".bb-scheduleTable__status").text().trim();

        if (status === "見どころ" || status === "予告先発") {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const homeStarter = $(elem).find(".bb-scheduleTable__homePlayer").text().trim();
          const startTime = $(elem).find(".bb-scheduleTable__info > span").contents().text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const awayStarter = $(elem).find(".bb-scheduleTable__awayPlayer").text().trim();
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();

          // eslint-disable-next-line no-irregular-whitespace
          body = `${startTime}～　${homeTeam} (予: ${homeStarter})  vs  ${awayTeam} (予: ${awayStarter})　＠${stadium}`;
        }
        if (status.includes("表") || status.includes("裏")) {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const score = $(elem).find(".bb-scheduleTable__score").text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();

          body = `試合中\n## ${homeTeam} ${score} ${awayTeam}\n＠${stadium} ${status}`;
        }
        if (status === "試合前") {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const startTime = $(elem).find(".bb-scheduleTable__info > span").text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();

          // eslint-disable-next-line no-irregular-whitespace
          body = `${startTime}～　${homeTeam}  vs  ${awayTeam}　＠${stadium}`;
        }
        if (status === "試合終了") {
          const homeTeam = $(elem).find(".bb-scheduleTable__homeName").text().trim();
          const awayTeam = $(elem).find(".bb-scheduleTable__awayName").text().trim();
          const score = $(elem).find(".bb-scheduleTable__score").text().split("\n").map((elem) => (elem.trim())).filter(v => v).join("");
          const stadium = $(elem).find(".bb-scheduleTable__data--stadium").text().trim();
          const winPlayer = $(elem).find(".bb-scheduleTable__player--win").text().trim();
          const losePlayer = $(elem).find(".bb-scheduleTable__player--lose").text().trim();
          const savePlayer = $(elem).find(".bb-scheduleTable__player--save").text().trim();

          body = `${status}\n## ${homeTeam} ${score} ${awayTeam}\n＠${stadium}`;
          if (winPlayer) {
            // eslint-disable-next-line no-irregular-whitespace
            body += `　(勝) ${winPlayer}`;
          }
          if (savePlayer) {
            // eslint-disable-next-line no-irregular-whitespace
            body += `　(S) ${savePlayer}`;
          }
          if (losePlayer) {
            // eslint-disable-next-line no-irregular-whitespace
            body += `　(敗) ${losePlayer}`;
          }

          const [homeScore, awayScore] = score.split("-").map(Number);

          if ((homeTeam === "楽天" && homeScore > awayScore) || (awayTeam === "楽天" && homeScore < awayScore)) {
            body += "\n\nエントリー!\nhttps://event.rakuten.co.jp/campaign/sports/";
          }
        }
      }
      else return;
    });
    console.log(body);
    return body;
  } catch (e) {
    console.error(e);
    return null;
  }
}