const express = require("express");
const app = express();
const fs = require("fs");
const request = require("request");

var sitemap = ["tops","","info.txt","icon.png"];
var DB = JSON.parse(fs.readFileSync("tops.json", "utf8"));
var connected = {};

function clean() {
	const keylist = Object.keys(connected);
	for (const key of keylist) {
		if (Date.now() - connected[key][0] > 1000 * 60 * 3) {
			// del after 3 min
			delete connected[key];
		}
	}
}

setInterval(clean, 1000 * 60 * 2); //5 min

function sort_array(obj) {
	obj.sort((a, b) => {
		return b.time - a.time;
	});
	return obj.slice(0, 100);
}

fs.readdirSync('./assets/').forEach(file => {
	app.get('/' + file, (req, res, next) => {
		res.sendFile('/assets/' + file, { root: __dirname });
	});
	sitemap.push(file);
});

app.post("/log", (req, res, next) => {
	const query = Array.from(
		new URL(req.url, req.protocol + "://" + req.headers.host + "/").searchParams
	);
	if (query[0] !== undefined) {
		const common = query[0][0].substr(0, 8).replace(/[^a-z0-9.,\-_\!]/gmi, '');
		if (common.length < 1) {
			res.status(400);
			res.end();
			return;
		}
		if (common in connected) {
			const time = Math.round((Date.now() - connected[common][1]) / 1000);
			connected[common] = [Date.now(), connected[common][1]];
			if (
				time >= DB[DB.length - 1] ||
				DB[DB.length - 1] === undefined ||
				DB.length < 100
			) {
				// fill top 100
				let tmp = DB;
				let cur = tmp.find(({ name }) => name === common)
				if (cur === undefined || cur.time < time) {
					let ind = tmp.indexOf(cur);
					if (ind === -1)
						tmp.push({ name: common, time: time });
					else
						tmp[ind].time = time;
					tmp = sort_array(tmp);
					if (tmp.find(({ name }) => name === common) !== undefined) {
						DB = tmp;
						fs.writeFileSync("tops.json", JSON.stringify(DB));
					}
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

app.get("/tops", (req, res, next) => {
	res.sendFile("./tops.json", { root: __dirname });
});

app.get("/info.txt", (req, res, next) => {
	res.sendFile("./info.txt", { root: __dirname });
});

app.get("/icon.png", (req, res, next) => {
	res.sendFile("./icon.png", { root: __dirname });
});

app.get("/robots.txt", (req, res, next) => {
	res.send("User-agent: *\nAllow: /\nSitemap: https://leekspin.co/sitemap.xml");
	res.status(200);
	res.end();
});

function genSiteMap(){
	const lastmod = new Date(Date.now()).toISOString().split("T")[0];
	let response = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
	sitemap.forEach(function (URLs){
		response+="<url>\n<loc>https://leekspin.co/"+URLs+"</loc>\n";
		response+="<lastmod>"+lastmod+"</lastmod>\n</url>\n"
	});
	response+="</urlset>"
	app.get("/sitemap.xml", (req, res, next) => {
		res.send(response);
		res.status(200);
		res.end();
	});
}

genSiteMap();
app.listen(8080);
request.get("http://www.google.com/ping?sitemap=https://leekspin.co/sitemap.xml");
request.get("http://www.bing.com/ping?sitemap=https://leekspin.co/sitemap.xml");
