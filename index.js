const express = require("express");
const app = express();
const fs = require("fs");
const request = require("request");

var sitemap = ["tops","","info.txt","icon.png"];
var DB = JSON.parse(fs.readFileSync("tops.json", "utf8"));
const banned_words = JSON.parse(fs.readFileSync("banned_words.json", "utf8"));
var connected = {};

function clean() {
	const keylist = Object.keys(connected);
	for (const key of keylist) {
		if (Date.now() - connected[key].time[0] > 1000 * 60 * 3) {
			// del after 3 min
			delete connected[key];
		}
	}
}

setInterval(clean, 1000 * 60 * 2); //2 min

function sort_array(obj) {
	obj.sort((a, b) => {
		return b.time - a.time;
	});
	return obj.slice(0, 100);
}

fs.readdirSync('./assets/').forEach(file => {
	app.get('/' + file, (req, res) => {
		res.sendFile('/assets/' + file, { root: __dirname });
	});
	sitemap.push(file);
});

app.post("/log", (req, res) => {
	if(!req.query['uid']) {
		res.status(400);
		res.end();
		return;
	}
	const uid = req.query['uid'].substr(0, 8).replace(/[^a-z0-9.,\-_\!]/gmi, '');
	if (uid.length < 1) {
		res.status(400);
		res.end();
		return;
	}

	if(req.query['n']){
		const username = req.query['n'].substr(0, 8).replace(/[^a-z0-9.,\-_\!]/gmi, '');
		if (username.length < 1) {
			res.status(400);
			res.end();
			return;
		}

		if (banned_words.includes(username.toLowerCase())) {
			res.status(400);
			res.end();
			return;
		}

		if(uid in connected)
			connected[uid].time = [Date.now(),  connected[uid].time[1]];
		else
			connected[uid] = {name:username,time:[Date.now(), Date.now()]};

		const time = Math.round((Date.now() - connected[uid].time[1]) / 1000);

		if(uid in connected){
			if (connected[uid].name && connected[uid].name != username){
				let tmps = DB;
				const ind = tmps.findIndex(({ name }) => name === connected[uid].name)
				if(ind !== -1 && time >= tmps[ind].time) {
					tmps.splice(ind,1);
					DB = tmps;
					fs.writeFileSync("tops.json", JSON.stringify(DB));
				}
			}
			connected[uid].name = username;
		}

		if (DB.length == 0 || time >= DB[DB.length - 1].time || DB.length < 100) {
			// fill top 100
			let tmp = DB;
			const ind = tmp.findIndex(({ name }) => name === username)
			if (ind === -1 || tmp[ind].time < time) {
				if (ind === -1)
					tmp.push({ name: username, time: time });
				else
					tmp[ind].time = time;
				tmp = sort_array(tmp);
				if (tmp.find(({ name }) => name === username) !== undefined) {
					DB = tmp;
					fs.writeFileSync("tops.json", JSON.stringify(DB));
				}
			}
		}

		res.send({name: username, time: time});
	} else {
		if(uid in connected)
			connected[uid].time = [Date.now(), connected[uid].time[1]];
		else
			connected[uid] = {name:"",time:[Date.now(), Date.now()]};
	}
	res.status(200);
	res.end();
});

app.get("/", (req, res) => {
	res.sendFile("./index.html", { root: __dirname });
});

app.get("/tops", (req, res) => {
	res.sendFile("./tops.json", { root: __dirname });
});

app.get("/info.txt", (req, res) => {
	res.sendFile("./info.txt", { root: __dirname });
});

app.get("/icon.png", (req, res) => {
	res.sendFile("./icon.png", { root: __dirname });
});

app.get("/robots.txt", (req, res) => {
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
	app.get("/sitemap.xml", (req, res) => {
		res.send(response);
		res.status(200);
		res.end();
	});
}

genSiteMap();
app.listen(8080);
request.get("http://www.google.com/ping?sitemap=https://leekspin.co/sitemap.xml");
request.get("http://www.bing.com/ping?sitemap=https://leekspin.co/sitemap.xml");
