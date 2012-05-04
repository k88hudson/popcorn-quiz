document.addEventListener( "DOMContentLoaded", function( e ){

  Butter({
    config: "quiz.conf",
    ready: function( butter ){
      var playbutton, playing = false,
        media = butter.media[ 0 ];

      function start(){
        var track, popcorn, title, score, questions = [];

        //Help
        document.getElementById("help").addEventListener( "click", function(e) {
          e.preventDefault();
          var helpPanel = document.getElementById("help-panel");
       
          if(helpPanel.className === "on") {
            helpPanel.className = "off"
            this.parentNode.className = ""; 
          } else {
            helpPanel.className = "on";
            this.parentNode.className = "active"; 
          }
        }, false);

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

        function startQuiz(options) {
          var i = this.allEvents.indexOf(this);
          if (i >= 0) {
            title.nodeValue = 'Question ' + (i + 1) + ' of ' + this.allEvents.length;
          }
        }

        function endQuiz(options) {
          var i;
          title.nodeValue = '';
          if (this.popcorn.currentTime() < options.start) { //rewind
            i = this.allEvents.indexOf(this);
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

        track = media.addTrack( "Questions" );
        media.addTrack( "Answers" );
        media.addTrack( "Hints" );
        media.addTrack( "MediaLeft" );
        media.addTrack( "MediaRight" );
        popcorn = media.popcorn.popcorn;

        popcorn.on('play', function() {
          playing = true;
          playbutton.childNodes[0].className = 'icon-pause';
          playbutton.childNodes[1].innerHTML = 'Pause Quiz';
        });

        popcorn.on('pause', function() {
          if (playing) {
            playbutton.childNodes[0].className = 'icon-pause';
            playbutton.childNodes[1].innerHTML = 'Pause Quiz';
          }
        });

        playbutton = document.getElementById('playpause');
        playbutton.addEventListener('click', function() {
          if (playing) {
            if (!popcorn.paused()) {
              playing = false;
              popcorn.pause();
              playbutton.childNodes[0].className = "icon-play";
              playbutton.childNodes[1].innerHTML = 'Play Quiz';
            }
            return;
          }

          popcorn.play();
        }, false);


        /*
        tell quiz-answers editor what questions are available
        */
        window.addEventListener('message', function(e) {
          var start, end, events, event, answers = [], i, j;
          if (typeof e.data === 'object' && e.data.msg === 'request-quiz-answers') {
            start = e.data.start;
            end = e.data.end;
            if (popcorn && popcorn.data && popcorn.data.trackEvents) {
              events = popcorn.data.trackEvents.byStart.filter(function(evt) {
                return evt._natives && evt._natives.type === 'quiz' &&
                  evt.start <= end && evt.end > start;
              });

              for (i = 0; i < events.length; i++) {
                event = events[i];
                if (event.answers) {
                  for (j = 0; j < event.answers.length; j++) {
                    answers.push({
                      i: j,
                      answer: event.answers[j]
                    });
                  }
                }
              }

              e.source.postMessage({
                msg: 'response-quiz-answers',
                answers: answers
              }, '*');
            }
          }
        }, false);

        popcorn.defaults('quiz', {
          onSetup: setupQuiz,
          onStart: startQuiz,
          onEnd: endQuiz,
          onAnswer: answerQuiz
        });

      }

      media.onReady( start );
      
      window.butter = butter;
    }
  }); //Butter
}, false );
