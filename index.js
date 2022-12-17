const music_key = '';

const axios = require('axios');
const fs = require('fs');
const ffmetadata = require("ffmetadata");
const { exec } = require('child_process');

axios.get(`https://api-music.inspare.cc/favourites/${music_key}`).then((d) => {
	if (!d.data) return;

	var tracks = Object.values(d.data);
	var i = 0;

	if (!fs.existsSync('./temp')) {
		fs.mkdirSync('./temp');
		console.log('made folder');
	}
	if (!fs.existsSync('./temp/artwork')) {
		fs.mkdirSync('./temp/artwork');
		console.log('made folder');
	}

	const download = (a) => {
		if (fs.existsSync(`${__dirname}/temp/${a.id}.m4a`)) {
			i++;
			return download(tracks[i]);
		}
		if (a.youtube) {
			console.log('YouTube video ' + a.id + ' started');
			axios({
				url: `https://api-music.inspare.cc/stream/${a.id}?type=yt`,
				method: "get",
				responseType: "stream"
			}).then((res) => {
				var write_stream = fs.createWriteStream(`${__dirname}/temp/${a.id}.m4a`);
				res.data.pipe(write_stream);
				write_stream.on('finish', () => {
					i++;
					download(tracks[i]);
				});
			});
			return;
		}
		if (!a.id) return;
		axios.get(`https://api-music.inspare.cc/track/${a.id}`).then((track) => {
			console.log(`${a.artist.name} - ${a.title} Started`);
			axios({
				url: `https://api-music.inspare.cc/stream/${a.id}`,
				method: "get",
				responseType: "stream"
			}).then((res) => {
				if (Number(res.headers['content-length']) === 0) {
					console.log('error');
					i++;
					download(tracks[i]);
					return;
				};
				var write_stream = fs.createWriteStream(`${__dirname}/temp/${a.id}.m4a`);
				res.data.pipe(write_stream);
				write_stream.on('finish', () => {
					//download cover image
					axios({
						url: a.album.cover_xl,
						method: "get",
						responseType: "stream"
					}).then((res) => {
						console.log('Cover Downloaded');
						var image_stream = fs.createWriteStream(`${__dirname}/temp/artwork/${a.id}.jpg`);
						res.data.pipe(image_stream);
						image_stream.on('finish', () => {
							//encode new file
							exec(`ffmpeg.exe -i ${__dirname}/temp/${a.id}.m4a ${__dirname}/temp/${a.id}.mp3`, (error, stdout, stderr) => {
								if (error) {
									console.error(`exec error: ${error}`);
									return;
								}
								//remove original file
								fs.unlinkSync(`${__dirname}/temp/${a.id}.m4a`);
								//write metadata to new file
								ffmetadata.write(__dirname + `/temp/${a.id}.mp3`, {
									artist: a.artist.name,
									title: a.title,
									album: a.album.title,
									date: a.release_date.split('-')[0]
								}, function (err) {
									if (err) {
										console.error("Error writing metadata", err);
									} else {
										i++;
										download(tracks[i]);
										console.log(`${a.artist.name} - ${a.title} Finished`);
									}
								});
							});
						});
					}).catch(() => {
						console.log('a');
						i++;
						download(tracks[i]);
					});
				});
			}).catch(() => {
				console.log('errored');
				i++;
				download(tracks[i]);
			});
		});
	};

	download(tracks[i]);
});