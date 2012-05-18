
var _popcorn;

function setupPopcorn(){

  var playbutton, playing;
  playbutton = document.getElementById("playpause");

  window.popcorn = _popcorn;
  _popcorn.on('play', function() {
    playing = true;
    playbutton.childNodes[0].className = 'icon-pause';
    playbutton.childNodes[1].innerHTML = 'Pause Quiz';
  });

  _popcorn.on('pause', function() {
    if (playing) {
      playing = false;
      playbutton.childNodes[0].className = 'icon-play';
      playbutton.childNodes[1].innerHTML = 'Play Quiz';
    }
  });
}

function start(){

  var track, title, score, questions = [], playbutton, playing = false;

  //Help
  var helpButton = document.getElementById("help");
  if (helpButton) {
    helpButton.addEventListener( "click", function(e) {
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
  }

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

    var twitterContainer = document.getElementById("twitter");
    twitterContainer.innerHTML = "";

    var tweetButton = document.createElement( "a" );
    tweetButton.href = "https://twitter.com/share";
    tweetButton.className = "twitter-share-button";
    tweetButton.setAttribute( "data-via", "NewsHour" );
    tweetButton.setAttribute( "data-count", "none" );
    tweetButton.innerHTML = "Tweet my score";
    tweetButton.setAttribute( "data-text", "I got " + points + '/' + outOf + " on this quiz!");
   
    twitterContainer.appendChild( tweetButton );
    twttr.widgets.load();
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
    if (_popcorn.currentTime() < options.start) { //rewind
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

  setupPopcorn();

  playbutton = document.getElementById('playpause');
  playbutton.addEventListener('click', function( e ) {
    e.preventDefault();
    if ( playing && playing === true ) {
      playing = false;
      _popcorn.pause();
      return;  
    }
    playing = true;
    _popcorn.play();
  }, false);


  /*
  tell quiz-answers editor what questions are available
  */
  window.addEventListener('message', function(e) {
    var start, end, events, event, answers = [], i, j;
    if (typeof e.data === 'object' && e.data.msg === 'request-quiz-answers') {
      start = e.data.start;
      end = e.data.end;
      if (_popcorn && _popcorn.data && _popcorn.data.trackEvents) {
        events = _popcorn.data.trackEvents.byStart.filter(function(evt) {
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

_popcorn.defaults( "quiz", {
  onSetup: setupQuiz,
  onStart: startQuiz,
  onEnd: endQuiz,
  onAnswer: answerQuiz
});


}

document.addEventListener( "DOMContentLoaded", function( e ){

  if(window.Butter) {


    function popcornWrapper( media ) {
      //Wraps events in a canplayall event listener for export
      var wrapEvents = "canplayall";
      media.popcornScripts = { };
      media.popcornScripts.beforeEvents = 'popcorn.on( "'+wrapEvents+'", evts );\nfunction evts() { ';
      media.popcornScripts.afterEvents = '\npopcorn.off( "'+wrapEvents+'", evts );\n}'
    }
       
    Butter({
      config: "quiz.conf",
      ready: function( butter ){

        media = butter.media[ 0 ];
        popcornWrapper( media );

        track = media.addTrack( "Questions" );
        media.addTrack( "Answers" );
        media.addTrack( "Hints" );
        media.addTrack( "MediaLeft" );
        media.addTrack( "MediaRight" );

        media.listen("mediaready", function(){
          _popcorn = media.popcorn.popcorn;
          setupPopcorn();
        });

        media.onReady( function(){
          _popcorn = media.popcorn.popcorn;
          start();
        } );

        butter.listen("mediachanged", function(e) {
          popcornWrapper( e.data );
        }, false);

        window.butter = butter;
      }
    }); //Butter
  }
  else {
    var media = document.getElementsByTagName('audio')[0];
    if(media.readyState === 4){
      start();
      _popcorn = Popcorn.instances[0];
    }
    else{
        
      media.addEventListener( 'canplay', canPlayStart ); 

      function canPlayStart(){
        _popcorn = Popcorn.instances[0];
        start();
        media.removeEventListener( 'canplay', canPlayStart )
      }

    }
  }

}, false );

