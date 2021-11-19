const express = require("express");
const app = express();
var fs = require("fs");

var DB = JSON.parse(fs.readFileSync("tops.json", "utf8"));
var connected = {};

function clean() {
  const keylist = Object.keys(connected);
  for (const key of keylist) {
    if (Date.now() - connected[key][0] > 1000 * 60 * 2) {
      // del after 3 min
      delete connected[key];
    }
  }
}

setInterval(clean, 1000 * 60 * 2); //5 min

function sort_object(obj) {
  items = Object.keys(obj).map(function (key) {
    return [key, obj[key]];
  });
  items.sort(function (first, second) {
    return second[1] - first[1];
  });
  sorted_obj = {};
  items.slice(0, 100).forEach(function (v) {
    // top 100
    use_key = v[0];
    use_value = v[1];
    sorted_obj[use_key] = use_value;
  });
  return sorted_obj;
}

app.get("/tops", (req, res, next) => {
  res.sendFile("./tops.json", { root: __dirname });
});

app.get("/log", (req, res, next) => {
  const query = Array.from(
    new URL(req.url, req.protocol + "://" + req.headers.host + "/").searchParams
  );
  if (query[0] !== undefined) {
    const common = query[0][0].substr(0, 8);
    if (common in connected) {
      const time = Math.round((Date.now() - connected[common][1])/1000);
      connected[common] = [Date.now(), connected[common][1]];
      if (
        time >= Object.keys(DB)[Object.keys(DB).length - 1] ||
        Object.keys(DB)[Object.keys(DB).length - 1] === undefined ||
        Object.keys(DB).length < 100
      ) {
        // fill top 100
        let tmp = DB;
        tmp[common] = time;
        tmp = sort_object(tmp);
        if (common in tmp) {
          DB = tmp;
          fs.writeFileSync("tops.json", JSON.stringify(DB));
        }
      }
    } else {
      connected[common] = [Date.now(), Date.now()];
    }
  }
  res.status(200);
  res.end();
});

app.get("/", (req, res, next) => {
  res.sendFile("./index.html", { root: __dirname });
});

app.get("/image.gif", (req, res, next) => {
  res.sendFile("./image.gif", { root: __dirname });
});

app.get("/polkka.mp3", (req, res, next) => {
  res.sendFile("./polkka.mp3");
});

app.get("/info.txt", (req, res, next) => {
  res.sendFile("./info.txt", { root: __dirname });
});

app.get("/polkka.ogg", (req, res, next) => {
  res.sendFile("./polkka.ogg", { root: __dirname });
});

app.get("/icon.png", (req, res, next) => {
  res.sendFile("./icon.png", { root: __dirname });
});

app.listen(80);
