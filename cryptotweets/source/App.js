/* CryptoTweets, a game built using Enyo 2.0
 *
 * Ben Combee, February 2012
 */

function swapElements(obj, idx1, idx2) {
	var hold = obj[idx1];
	obj[idx1] = obj[idx2];
	obj[idx2] = hold;
}

function forEachLetter(that, fn) {
	var args = enyo.cloneArray(arguments, 2);
	for (var chCode = 65; chCode < (65 + 26); ++chCode) {
		args.unshift(String.fromCharCode(chCode));
		fn.apply(that, args);
	}
}

enyo.kind({
	name: "Cypher",
	kind: enyo.Object,
	statics: {

		// this function will provide an array where all 26 English capital
		// letters are included, but none are in their original position. The
		// distribution is probably not uniform, but it works well enough for
		// game purposes
		shuffledAlphabet: function() {
			var alpha = [
				"A","B","C","D","E","F","G","H","I",
				"J","K","L","M","N","O","P","Q","R",
				"S","T","U","V","W","X","Y","Z"];
			var i, swapPos;

			// we'll go through alphabet and randomly swap each letter with
			// another letter in the string, rejecting swaps that would put a
			// letter back in its original position.
			for (i = 0; i < 26; ++i) {
			do {
					swapPos = enyo.irand(25);
					// skip over the item that we're swapping
					if (swapPos > i) ++swapPos;
					// and skip over a swap that puts the letter
					// back in its original position
				} while (alpha[swapPos] === String.fromCharCode(65 + i));

				swapElements(alpha, i, swapPos);
			}

			var alphaHash = {};
			alpha.forEach(function(val,idx,arr) {
				alphaHash[String.fromCharCode(idx + 65)] = val;
			});
			return alphaHash;
		},

		cleanupLetter: function(inLetter) {
			if (typeof inLetter === "number") {
				inLetter = String.fromCharCode(inLetter);
			}
			return inLetter.toUpperCase();
		}
	},

	resetGuesses: function() {
		this.guesses = {};
	},

	constructor: function() {
		this.inherited(arguments);
		this.cypher = Cypher.shuffledAlphabet();
		this.resetGuesses();
	},

	cypherLetter: function (clearLetter) {
		clearLetter = Cypher.cleanupLetter(clearLetter);
		return this.cypher[clearLetter];
	},

	guessLetter: function (clearLetter) {
		clearLetter = Cypher.cleanupLetter(clearLetter);
		return this.guesses[clearLetter];
	},

	setGuess: function (clearLetter, guessLetter) {
		clearLetter = Cypher.cleanupLetter(clearLetter);
		guessLetter = Cypher.cleanupLetter(guessLetter);
		
		// clear out any old guess with the same letter

		// set the new guess
		this.guesses[clearLetter] = guessLetter;
	}
});


enyo.kind({
	name: "Cryptogram",
	kind: "enyo.Control",
	classes: "cryptogram",

	published: {
		//* required, should be capital letter in range "A" to "Z"
		text: ""
	},

	computeDistribution: function () {
		var distribution = {};
		this.distribution = distribution;
		forEachLetter(this, function(ch) {
			distribution[ch] = 0;
		});
		for (var i = this.text.length - 1; i >= 0; --i) {
			var ch = this.text[i];
			if (ch >= 'A' && ch <= 'Z') {
				distribution[ch]++;
			}
		}

		// save a sorted list of letters in highest-first order
		this.sortedDistribtionKeys = Object.keys(this.distribution);
		this.sortedDistribtionKeys.sort(function(a, b) {
			return distribution[b] - distribution[a];
		});
	},

	reset: function() {
		this.cypher = new Cypher();
	},

	create: function() {
		this.inherited(arguments);
		this.reset();
		this.textChanged();
	},

	textChanged: function() {
		this.text = this.text.toUpperCase();
		this.computeDistribution();
		this.refresh();
	},

	outputDistribution: function() {
		var text = "<div class=distribution>";
		enyo.forEach(this.sortedDistribtionKeys, function(ch) {
			if (this.distribution[ch] > 0) {
				text += "<span class=distroLetter>" + this.cypher.cypherLetter(ch) + 
					": " + this.distribution[ch] + "</span>";
			}
		}, this);
		text += "</div>";
		return text;
	},

	outputCell: function(top, middle, bottom, letter) {
		return (
			"<div class='cell" +
			(letter ? (" letter" + letter) : "") +
			"'><span class=top>" + (top || "&nbsp") +
			"</span><br>" + middle + "<br><span class=bottom>" +
			bottom + "</span></div>");
	},

	refresh: function() {
		var cypher = this.cypher;
		var outputCell = enyo.bind(this, this.outputCell);
		var html = Array.prototype.map.call(this.text,
			function(v) {
				if (v === " ") {
					return outputCell("&nbsp", "&nbsp", "&nbsp");
				}
				if (v >= "A" && v <= "Z") {
					return outputCell(
						cypher.guessLetter(v),
						"&mdash;",
						cypher.cypherLetter(v),
						v);
				}
				else {
					return outputCell(v, "&nbsp", v);
				}
			}).join("");
		html += "<br clear=all>";
		html += this.outputDistribution();
		this.setContent(html);
	},

	giveHint: function() {
		// pick a unguessed letter to reveal
		var unguessed = [];
		forEachLetter(this, function(ch) {
			if (!this.cypher.guessLetter(ch) && this.distribution[ch] > 0) {
				unguessed.push(ch);
			}
		});

		if (unguessed.length > 0) {
			var pick = unguessed[enyo.irand(unguessed.length)];
			this.cypher.setGuess(pick, pick);
			this.refresh();
		}
	},

	restart: function() {
		this.cypher.resetGuesses();
		this.refresh();
	},

	selectCellByCypherLetter: function(ch) {
		// FIXME
	},

	makeGuessByCypherLetter: function(cypher, guess) {
		// FIXME
	}
});

enyo.kind({
	name: "App",
	kind: "Control",

	components: [
	{
		kind: "enyo.Signals",
		onkeydown: "handleKeyDown"
	},
	{
		tag: "button", classes: "btn",
		content: "Hint", onclick: "giveHint"
	},
	{
		tag: "button", classes: "btn",
		content: "Reset", onclick: "restart"
	},
	{
		tag: "button", classes: "btn",
		content: "Next", onclick: "nextTweet"
	},
	{
		tag: "button", classes: "btn",
		content: "Fetch Tweets", onclick: "fetchTweets"
	},
	{
		tag: "button", classes: "btn",
		content: "Fetch News", onclick: "fetchNews"
	},
	{
		kind: "Cryptogram"
	}
	],
	create: function() {
		this.inherited(arguments);

		this.tweets = [
			"Tweets are being loaded!",
			"RT @Fab_N_Fancy: People remember Bobby Brown lost his father, mother, and ex-wife of 15 yrs in less than 4 months. That's hard on a persons heart! Bless him!",
			"RT @justinbieber: makin a SMASH right now with @only1darkchild - bringing back that real SOUL. #realmusic #BELIEVE",
			"RT @RyanAbe: Disney should make a hairless princess, so little girls with cancer can feel beautiful, as well.",
			"RT @THEVOWM0VIE: I don't know where I stand with you. And I don't know what I mean to you. All I know is every time I think of you, I want to be with you."
		];
		this.nextTweetIndex = 0;
		//this.nextTweet();
	},
	fetchTweets: function() {
		var request = new enyo.JsonpRequest({
			url: "http://search.twitter.com/search.json",
			callbackName: "callback"
		});
		request.response(enyo.bind(this, "handleTwitterResults"));
		request.go({
			q: "from:TopTweets -filter:links"
		});
	},
	fetchNews: function() {
		var request = new enyo.JsonpRequest({
			url: "http://api.usatoday.com/open/articles/topnews",
			callbackName: "jsoncallbackmethod"
		});
		request.response(enyo.bind(this, "handleUSATodayResults"));
		request.go({
			encoding: "json",
			api_key: "wcucm5mftznpwrembw824np3",
			count: 15
		});		
	},
	handleTwitterResults: function(inRequest, inResponse) {
		this.tweets = [];
		enyo.forEach(inResponse.results, function(t) {
			this.tweets.push(t.text);
		}, this);
		this.nextTweetIndex = 0;
		this.nextTweet();
	},
	handleUSATodayResults: function(inRequest, inResponse) {
		this.tweets = [];
		enyo.forEach(inResponse.stories, function(t) {
			this.tweets.push(t.title);
		}, this);
		this.nextTweetIndex = 0;
		this.nextTweet();
	},
	giveHint: function() {
		this.$.cryptogram.giveHint();
	},
	restart: function() {
		this.$.cryptogram.restart();
	},
	nextTweet: function() {
		if (this.nextTweetIndex >= this.tweets.length) {
			this.nextTweetIndex = 0;
		}
		this.$.cryptogram.reset();
		this.$.cryptogram.setText(this.tweets[this.nextTweetIndex++	]);
	},
	handleKeyDown: function(inSender, inEvent) {
		if (!this.cellSelected) {
			// select cell using key
		}
		else {
			// make guess with key

		}
	}
});
