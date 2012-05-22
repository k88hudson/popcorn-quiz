(function (Popcorn, window) {

	"use strict";

	var styleSheet,
		console = window.console,
		sounds = {},
		isiPad = navigator.userAgent.match(/iPad/i),
		gonnaClean = false;

	/*
	djb2 hash function for indexing combined audio file paths
	http://www.cse.yorku.ca/~oz/hash.html
	*/
	function hash(s) {
		var i, c, h = 5381;
		for (i = 0; i < s.length; i++) {
			c = s.charCodeAt(i);
			h = ((h << 5) + h) + c; /* hash * 33 + c */
		}
		return h;
	}

	/*
	Only keep one copy of each set of sounds. It's a pretty safe bet that we'll only need one at a time.
	This will delete sounds we don't need anymore, but since Butter will delete and re-create
	similar events many times in quick succession, we hold on to them for a few seconds in case
	we need them again soon.
	*/
	function cleanUpSounds() {

		function doClean() {
			var i;

			for (i in sounds) {
				if (sounds.hasOwnProperty(i) && !sounds[i].count) {
					console.log('Unloading sounds \n' + sounds[i].urls.join('\n'));
					delete sounds[i];
				}
			}
			gonnaClean = false;
		}

		if (!gonnaClean) {
			gonnaClean = true;
			setTimeout(doClean, 10000);
		}
	}

	Popcorn.basePlugin( 'quiz' , function(options, base) {

		var popcorn = this,
			media = popcorn.media,
			guid,
			i, ul, li, answer, answers,
			question,
			button,
			element,
			explanation,
			rightSound, wrongSound,
			allowPause = false;

		function loadSounds() {
			var name, sound, i, rewind;

			function loadSound(urls) {
				var obj, h, source;

				h = hash(urls.join('\n'));
				obj = sounds[h];
				if (obj) {
					obj.count++;
					return obj;
				}

				obj = {
					count: 1,
					hash: h,
					urls: urls.slice(0)
				};
				obj.audio = document.createElement('audio');
				obj.audio.preload = true;
				obj.audio.addEventListener('ended', rewind, false);
				for (i = 0; i < urls.length; i++) {
					source = document.createElement('source');
					source.src = urls[i];
					obj.audio.appendChild(source);
				}

				sounds[h] = obj;
				return obj;
			}

			//No sounds in iPad because it can't handle two html5 media elements at once
			if (isiPad) {
				return;
			}

			rewind = function() {
				this.pause();
				this.currentTime = 0;
			};

			rightSound = loadSound(rightSound);
			wrongSound = loadSound(wrongSound);
		}

		function proceed() {
			var endTime = base.options.end - 0.1;
			if (popcorn.currentTime() < endTime) {
				popcorn.currentTime(endTime);
			}
			allowPause = false;
			popcorn.play();
		}

		function clickAnswer(i) {
			var status, sound;

			if (answer >= 0) {
				//don't re-answer this until reset
				return;
			}

			popcorn.pause();
			allowPause = false;

			answer = i;
			options.answer = i;

			base.addClass(answers[i].label.parentNode, 'answered');

			if (base.options.correct === i) {
				status = 'right';
				sound = rightSound;
			} else {
				status = 'wrong';
				sound = wrongSound;
			}

			base.addClass(base.container, status);
			base.addClass(base.ul, status);
			if (sound && sound.audio && sound.audio.readyState) {
				sound.audio.play();
			}

			if (typeof options.onAnswer === 'function') {
				if (Popcorn.plugin.debug) {
					options.onAnswer.call(base, options);
				} else {
					try {
						options.onAnswer.call(base, options, answer);
					} catch (e) {
						console.log('Error in quiz onAnswer event:' + e.message);
					}
				}
			}
		}

		if (!options.question || !options.target || !options.answers) {
			return;
		}

		//clone answers array to be safe
		if (Object.prototype.toString.call(options.answers) === '[object Array]') {
			answers = options.answers.slice(0);
		} else {
			answers = base.toArray(options.answers, /\n\r/);
		}

		if (!answers || !answers.length) {
			return;
		}

		rightSound = base.toArray(options.rightSound);
		if (!rightSound || !rightSound.length) {
			rightSound = [
				'audio/ding.mp3',
				'audio/ding.ogg'
			];
		}

		wrongSound = base.toArray(options.wrongSound);
		if (!wrongSound || !wrongSound.length) {
			wrongSound = [
				'audio/buzzer.mp3',
				'audio/buzzer.ogg'
			];
		}

		loadSounds();

		guid = 'question-' + Popcorn.guid();

		if (!styleSheet) {
			styleSheet = document.createElement('style');
			styleSheet.setAttribute('type', 'text/css');
			styleSheet.appendChild(
				document.createTextNode(
					'.popcorn-quiz { display: none; }\n' +
					'.popcorn-quiz > .popcorn-quiz-explanation { display: none; }\n' +
					'.popcorn-quiz.right > .popcorn-quiz-explanation, .popcorn-quiz.wrong > .popcorn-quiz-explanation { display: block; }\n' +
					'.popcorn-quiz > ul { list-style: none; }\n' +
					'.popcorn-quiz-answer { cursor: pointer; }\n' +
					'.popcorn-quiz-answer > label { cursor: pointer; }\n' +
					'.wrong .popcorn-quiz-answer, .right .popcorn-quiz-answer { color: #555; }\n' +
					'.wrong .popcorn-quiz-answer.answered { text-decoration: line-through; color: #F32520 !important; }\n' +
					'.wrong .popcorn-quiz-answer.correct, .right .popcorn-quiz-answer.correct { font-weight: bold; background: #57BA67; }\n' +
					'.popcorn-quiz.active { display: block; }\n' +
					'.popcorn-quiz-options { display: none; }\n' +
					'.popcorn-quiz-options.active { display: block; }\n'
			));
			document.head.appendChild(styleSheet);
		}

		base.makeContainer();

		/* Make questions and answers */

		question = document.createElement('h1');
		base.addClass(question, 'popcorn-quiz-question');
		question.appendChild(document.createTextNode(options.question));
		base.container.appendChild(question);
		base.answerContainer = document.getElementById( base.options.target + "-answers" );

		ul = document.createElement('ul');
		base.addClass( ul, 'popcorn-quiz-options');
		base.answerContainer.appendChild(ul);

		for (i = 0; i < answers.length; i++) {
			answer = {
				text: answers[i]
			};
			answers[i] = answer;
			answer.label = document.createElement('label');
			base.addClass(answer.label, "radio");
			answer.input = document.createElement('input');
			answer.input.setAttribute('type', 'radio');
			answer.input.setAttribute('name', guid);

			answer.label.appendChild(answer.input);
			answer.label.appendChild(document.createTextNode(answer.text));

			answer.label.addEventListener('click', (function(i) {
				return function() {
					clickAnswer(i);
				};
			}(i)), false);

			li = document.createElement('li');
			li.appendChild(answer.label);
			base.addClass(li, ['answer-' + i, 'popcorn-quiz-answer']);

			ul.appendChild(li);

			if (i === options.correct) {
				base.addClass(li, 'correct');
			}
		}

		base.ul = ul;

		answer = -1;

		element = document.createElement('div');
		base.addClass(element, 'popcorn-quiz-explanation');
		
		button = document.createElement('button');
		button.className = 'btn btn-large btn-primary';
		button.appendChild(document.createTextNode('Continue >>'));
		button.addEventListener('click', proceed);
		element.appendChild(button);

		if (options.explanation) {
			explanation = document.createElement('div');
			explanation.innerHTML = options.explanation;
			element.appendChild(explanation);
		}
	
		base.container.appendChild(element);

		// From template.js
		var score, title, questions = [];

	  function calculateScore() {
	    var i, points = 0, outOf = 0;

	    for (i = 0; i < questions.length; i++) {
	      q = questions[i];
	      if (q !== undefined) {
	        outOf++;
	        if (q) {
	          points++;
	        }
	      }
	    }
			score.nodeValue = 'Score: ' + points + '/' + outOf;
		  }

		  function setupQuiz(options) {
		    if (this.container) {
		      this.container.setAttribute('data-butter-exclude', 'true');
		    }
		  }

		  function startQuiz(b, options) {
		    var i = b.allEvents.indexOf( b );
		    console.log( "b", b, i );
		    if (i >= 0) {
		      title.nodeValue = 'Question ' + (i + 1) + ' of ' + b.allEvents.length;
		    }

		  }

		  function endQuiz(b, options) {
		    var i;
		    title.nodeValue = '';
		    console.log( b, calculateScore() );
		    if (b.popcorn.data.currentTime < options.start) { //rewind
		      i = b.allEvents.indexOf(b);
		      if (i >= 0) {
		        questions[i] = undefined;
		        calculateScore();
		      }
		    }
		  }

		  function answerQuiz(options) {

		    var q, i;

		    i = this.allEvents.indexOf(this);
		    if (i >= 0) {
		      q = this.allEvents[i];
		      questions[i] = (options.correct === options.answer);
		    }

		    calculateScore();
		  }

		  title = document.getElementById('question-title');
		  if (!title.childNodes.length) {
		    title.appendChild(document.createTextNode(''));
		  }
		  title = title.childNodes[0];

		  score = document.getElementById('score');
		  if (!score.childNodes.length) {
		    score.appendChild(document.createTextNode(''));
		  }
		  score = score.childNodes[0];

		  //console.log(base.options.question);
		  

		return {
			start: function( event, options ) {
				base.addClass(base.container, 'active');
				base.addClass(base.ul, 'active');
				allowPause = true;

				popcorn.on( "timeupdate", pauseQuiz );
				function pauseQuiz() {
					var ct = popcorn.currentTime();
					if( ct > ( base.options.end - 0.1 ) ) {
						allowPause && popcorn.pause();
						//popcorn.off( "timeupdate", pauseQuiz );
					}
				}
			},
			end: function( event, options ) {
				var i;
				base.removeClass(base.container, 'active');
				base.removeClass(base.ul, 'active');
				if (popcorn.currentTime() < options.start) {
					for (i = 0; i < answers.length; i++) {
						base.removeClass(answers[i].label.parentNode, 'answered');
						answers[i].input.checked = false;
					}
					answer = -1;
					base.removeClass(base.container, ['right', 'wrong']);
					base.removeClass(base.ul, ['right', 'wrong']);
				}

			},
			_teardown: function( options ) {
	
				if (rightSound) {
					rightSound.count--;
				}
				if (wrongSound) {
					wrongSound.count--;
				}
				cleanUpSounds();

				if (base.container && base.container.parentNode) {
					base.container.parentNode.removeChild(base.container);
				}
				if (base.ul && base.ul.parentNode) {
					base.ul.parentNode.removeChild(base.ul);
				}
			}
		};
	}, { //manifest
		about: {
			name: "Popcorn Quiz Plugin",
			version: "0.1",
			author: "Brian Chirls, @bchirls",
			website: "http://github.com/brianchirls"
		},
		options: {
			question: {
				elem: "input",
				type: "textarea",
				label: "Question"
			},
			explanation: {
				elem: "input",
				type: "textarea",
				label: "Explanation"
			},
			answers: {
				elem: "input",
				type: "textarea",
				label: "Answers"
			},
			correct: {
				elem: "input",
				type: "number",
				label: "Correct Answer"
			},
			target: "questions",
			start: {
				elem: "input",
				type: "number",
				label: "Start Time"
			},
			end: {
				elem: "input",
				type: "number",
				label: "End Time"
			}
		}
	});
})( Popcorn, window );
