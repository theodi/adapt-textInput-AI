import Adapt from 'core/js/adapt';
import QuestionModel from 'core/js/models/questionModel';

class TextInputAIModel extends QuestionModel {

  // Extend from the ComponentModel trackable - Doesn't work for SCORM

  trackable() {
    try {
      if (Adapt.spoor) {
        if (Adapt.spoor.config._isEnabled) {
          return QuestionModel.resultExtend('trackable', []);
        }
      }
    } catch (err) { console.log(err); }
    return QuestionModel.resultExtend('trackable', [
      '_userFeedback',
      '_userFeedbackRating'
    ]);
  }

  trackableType() {
    try {
      if (Adapt.spoor) {
        if (Adapt.spoor.config._isEnabled) {
          return QuestionModel.resultExtend('trackableType', []);
        }
      }
    } catch (err) { console.log(err); }
    return QuestionModel.resultExtend('trackableType', [
      Array,
      Number
    ]);
  }

  initialize(...args) {
    this.listenTo(Adapt, 'tutor:opened', this.onTutorOpened);
    this.listenTo(Adapt, 'tutor:closed', this.onTutorClosed);
    this.createAIConversation();
    super.initialize(...args);
    this.set('_shouldShowMarking', false);
    this.set('_canShowMarking', false);
  }

  canSubmit() {
    return true;
  }

  isCorrect() {
    // Not yet marked (still waiting for the score)

    if (!this.get('_score')) {
      return undefined;
    }

    let isCorrect = false;

    if (this.get('_score') >= this.get('passScore')) {
      isCorrect = true;
    } else {
      isCorrect = false;
    }

    try {
      if (Adapt.spoor) {
        if (Adapt.spoor.config._isEnabled) {
          this.set('_userAnswer', isCorrect);
        }
      }
    } catch (error) {}

    this.set('_isCorrect', isCorrect);
    return isCorrect;
  }

  get score() {
    if (this.get('_score')) {
      return this.get('_score');
    } else {
      return 0;
    }
  }

  markQuestion() {
    this.set('_canShowFeedback', true);
    const conversation = this.get('conversation');
    let question = this.get('chatTemplate');
    const inputId = `${this.get('_id')}-userInput`;
    const input = document.getElementById(inputId).value;
    this.set('_userAnswer', input);
    this.set('userAnswer', input);
    try {
      if (Adapt.spoor) {
        if (Adapt.spoor.config._isEnabled) {
          this.set('userAnswer', input);
          this.set('_userAnswer', false);
          this.setCookie('_userAnswer', input);
        }
      }
    } catch (error) {}
    question = question.replace('{{userAnswer}}', '\n\n' + input + '\n\n');
    conversation.push({ role: 'user', content: question });
    this.set('conversation', conversation);
    this.chatWithGPT(800);
  }

  restoreUserAnswers() {
    if (!this.get('_isSubmitted')) return;

    this.setQuestionAsSubmitted();
    this.set('_shouldShowMarking', true);
    this.set('_canShowMarking', true);
    this.set('_userFeedbackRendered', true);
    try {
      if (Adapt.spoor) {
        if (Adapt.spoor.config._isEnabled) {
          this.set('_userAnswer', this.isCorrect());
          const data = JSON.parse(this.getCookie('textInputAI-' + this.get('_id')));
          if (data._userAnswer) { this.set('userAnswer', data._userAnswer); }
          if (data._userFeedback) { this.set('_userFeedback', data._userFeeback); }
          this.set('_userFeedback', data._userFeedback);
        }
      }
    } catch (err) {
      const bands = this.get('_feedback')._bands;
      const closest = 100;
      let band = null;
      for (let i = 0; i < bands.length; i++) {
        const diff = bands[i]._score - this.get('_score');
        if ((this.get('_score') >= bands[i]._score) && (diff < closest)) {
          band = i;
        }
      }
      this.set('_userFeedback', bands[band].feedback);
    }
    // this.markQuestion();
    // this.setScore();
    this.setupFeedback();
  }

  /* All of this is generic to ChatGPT feedback */

  onTutorClosed(tutor) {
    if (tutor.model.get('_id') !== this.get('_id')) {
      return;
    }
    this.clearTimer();
  }

  onTutorOpened(tutor) {
    if (tutor.model.get('_id') !== this.get('_id')) {
      return;
    }
    const tutorElement = document.querySelector('.notify__content-inner');
    // Create the elements
    const tutorAutoDiv = document.createElement('div');
    tutorAutoDiv.className = 'tutor__auto';
    const tutorAutoInnerDiv = document.createElement('div');
    tutorAutoInnerDiv.className = 'tutor__auto-inner';
    // Append the inner div to the auto div
    tutorAutoDiv.appendChild(tutorAutoInnerDiv);

    tutorAutoInnerDiv.innerHTML = 'Waiting for auto tutor response';
    tutorElement.appendChild(tutorAutoDiv);
    if (!this.get('_score')) {
      const button = document.querySelector('.notify__close-btn');
      button.style.display = 'none';
      button.parentNode.innerHTML += `
        <div class="base-timer">
          <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g class="base-timer__circle">
              <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
               <path
          id="base-timer-path-remaining"
          stroke-dasharray="283"
          class="base-timer__path-remaining white"
          d="
            M 50, 50
            m -45, 0
            a 45,45 0 1,0 90,0
            a 45,45 0 1,0 -90,0
          "
        ></path>
            </g>
          </svg>
          <span id="base-timer-label" class="base-timer__label">
          </span>
        </div>
        `;
      this.startTimer(20);
    }

    this.checkUserFeedback();

  }

  checkUserFeedback() {
    let userFeedback = this.get('_userFeedback');
    if (userFeedback) {
      const paragraphs = userFeedback.split('\n').map(function(line) {
        return '<p>' + line + '</p>';
      });
      userFeedback = paragraphs.join('');
      this.set('_userFeedback', userFeedback);
      try {
        if (Adapt.spoor) {
          if (Adapt.spoor.config._isEnabled) {
            this.setCookie('_userFeedback', userFeedback);
          }
        }
      } catch (err) {}
      if (this.get('_userFeedbackRendered')) {
        this.renderFeedback();
      } else {
        this.populateUserFeedback();
      }
    } else {
      setTimeout(() => this.checkUserFeedback(), 100); // Retry after 100 milliseconds
    }
  }

  renderFeedback() {
    const tutorAutoInnerDiv = document.querySelector('.tutor__auto-inner');
    // tutorAutoInnerDiv.innerHTML = "Auto-tutor response<br/><br/>";
    tutorAutoInnerDiv.innerHTML += this.get('_userFeedback');
    const marking = '<p>Score: ' + this.get('_score') + '/' + this.get('maxScore') + '</p>';
    tutorAutoInnerDiv.innerHTML += marking;
    Adapt.trigger('notify:resize');
  }

  populateUserFeedback() {
    this.set('_canShowFeedback', true);
    this.set('_userFeedbackRendered', true);

    const tutorAutoInnerDiv = document.querySelector('.tutor__auto-inner');

    let currentIndex = 0;

    const self = this;

    const appendWord = () => {
      const words = self.get('_userFeedback').split(' ');
      const totalWords = words.length;
      if (currentIndex < totalWords) {
        const word = words[currentIndex];
        let currentString = tutorAutoInnerDiv.innerHTML;
        currentString += ' ' + word;
        tutorAutoInnerDiv.innerHTML = currentString;
        currentIndex++;
        Adapt.trigger('notify:resize');
        // Add a delay between words (adjust the duration as needed)
        setTimeout(appendWord, 50);
      } else {
        self.set('userFeedbackRenderComplete', true);
        if (self.get('_score')) {
          const marking = '<p>Score: ' + self.get('_score') + '/' + self.get('maxScore') + '</p>';
          tutorAutoInnerDiv.innerHTML += marking;
        }
      }
    };
    appendWord();
  }

  createAIConversation() {
    const conversation = [
      { role: 'system', content: this.get('systemAI') },
      { role: 'assistant', content: 'The model answer is:\n\n' + this.get('modelAnswer') }
    ];
    this.set('conversation', conversation);
  }

  chatWithGPT(tokens) {
    const apiKey = this.get('aiAPIKey');
    let conversation = this.get('conversation');

    // Testing
    /*
   var assistantReply = "";
   //if (this.get('getScore')) {
      var self = this;
      setTimeout(function() {
        assistantReply = "3) Testing feedback,\n\n this not real \n\n All over the place? \n Boo";
        self.set('_userFeedback'," " + assistantReply);
        var assistantReply = "";
      },2000);
      setTimeout(function() {
        assistantReply = self.extractLowestNumberFromString("I'll give it 4 out of 10.",self.get('maxScore'));
        console.log("extracted score " + assistantReply);
        self.clearTimer();
        self.set('score', assistantReply);
        self.set('_score',assistantReply);
        self.set('_shouldShowMarking',true);
        self.set('_canShowMarking',true);
        self.isCorrect();
        Adapt.trigger('questionView:triggerRecordInteraction');
        self.checkQuestionCompletion();
        if (self.get('userFeedbackRenderComplete')) {
          self.renderFeedback();
        }
        self.updateButtons();
      },4000);
    return;
    */
    // Actual code here

    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: conversation,
        max_tokens: tokens,
        temperature: 0.7,
        n: 1,
        stop: null
      })
    })
      .then(response => {
        if (response.status === 429) {
          this.startTimer(40);
          const self = this;
          setTimeout(function() {
            self.chatWithGPT(tokens);
          }, 20000);
        } else {
          return response.json();
        }
      })
      .then(data => {
        const assistantReply = data.choices[0].message.content;
        if (this.get('getScore')) {
          const score = this.extractLowestNumberFromString(assistantReply, this.get('maxScore'));
          if (score) {
            this.clearTimer();
            this.set('chatGPTScore', score);
            this.set('_score', score);
            this.set('_shouldShowMarking', true);
            this.set('_canShowMarking', true);
            this.isCorrect();
            Adapt.trigger('questionView:triggerRecordInteraction');
            this.checkQuestionCompletion();
            if (this.get('userFeedbackRenderComplete')) {
              this.renderFeedback();
            }
            this.updateButtons();
          } else {
            this.createAIConversation();
            conversation = this.get('conversation');
            let question = 'This is the users answer: \n\n' + this.get('userAnswer') + '\n\n';
            question += 'Give the user a mark out of ' + this.get('maxScore') + ' for their answer, just return a number and nothing else.';
            conversation.push({ role: 'user', content: question });
            this.chatWithGPT(100);
          }
        } else {
          this.set('_userFeedback', ' ' + assistantReply);
        }
        if (!this.get('chatGPTScore') && !this.get('getScore')) {
          this.set('getScore', true);
          const question = 'Give the user a mark out of ' + this.get('maxScore') + ' for their answer, just return a number and nothing else.';
          conversation.push({ role: 'user', content: question });
          conversation.push({ role: 'assistant', content: assistantReply });
          this.chatWithGPT(100);
        }
      })
      .catch(error => {
        console.log(error.message);
      });
  }

  extractLowestNumberFromString(inputString, maxScore) {
    const numberRegex = /\d+/g; // Regular expression to match one or more digits globally
    const numbers = inputString.match(numberRegex); // Find all matches of numbers in the string

    if (numbers) {
      const parsedNumbers = numbers.map(Number); // Convert matched numbers to an array of integers
      const numCount = parsedNumbers.length; // Count the number of numbers in the string

      if (numCount === 1 && parsedNumbers[0] === maxScore) {
        return null; // Return null if there is only one number and it matches maxScore
      }

      const lowestNumber = Math.min(...parsedNumbers); // Find the lowest number using Math.min()
      return lowestNumber;
    }

    return null; // Return null if no number is found in the string
  }

  get maxScore() {
    return this.get('maxScore');
  }

  /* END GENERIC */

  /**
  * used by adapt-contrib-spoor to get the user's answers in the format required by the cmi.interactions.n.student_response data field
  * returns the user's answers as a string in the format 'answer1[,]answer2[,]answer3'
  * the use of [,] as an answer delimiter is from the SCORM 2004 specification for the fill-in interaction type
  */

  // Checks if the question should be set to complete
  // Calls setCompletionStatus and adds complete classes
  checkQuestionCompletion() {

    if (!this.get('_isCorrect')) {
      return false;
    }

    const isComplete = (this.get('_isCorrect') || this.get('_attemptsLeft') === 0);

    if (isComplete) {
      this.setCompletionStatus();
    }

    return isComplete;

  }

  getResponse() {
    const object = {};
    object._userAnswer = this.get('userAnswer');
    object._userFeedback = this.get('_userFeedback');
    return JSON.stringify(object);
  }

  /**
  * used by adapt-contrib-spoor to get the type of this question in the format required by the cmi.interactions.n.type data field
  */
  getResponseType() {
    return 'fill-in';
  }

  setCookie(key, value) {
    const id = this.get('_id');
    let object = JSON.parse(this.getCookie('textInputAI-' + id)) || {};
    object[key] = value;
    object = JSON.stringify(object);
    document.cookie = 'textInputAI-' + id + '=' + encodeURIComponent(object) + '; expires=Fri, 31 Dec 2032 23:59:59 GMT; path=/';
  }

  getCookie(name) {
    const cookies = document.cookie.split('; ');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].split('=');
      if (cookie[0] === name) {
        return decodeURIComponent(cookie[1]);
      }
    }
    return null;
  }

  /* Timers for AI Content */

  startTimer(limit) {
    document.querySelector('.notify__close-btn').style.display = 'none';
    document.querySelector('.base-timer').style.display = 'inline-block';
    let timerInterval = this.get('timerInterval');
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    let timePassed = 0;
    timerInterval = setInterval(() => {
      document.querySelector('.notify__close-btn').style.display = 'none';

      // The amount of time passed increments by one
      timePassed = timePassed += 1;
      const timeLeft = limit - timePassed;
      if (timeLeft < 1) {
        document.getElementById('base-timer-label').innerHTML = timeLeft;
        document.querySelector('.notify__close-btn').style.display = 'inline-block';
        document.querySelector('.base-timer').style.display = 'none';
        try {
          clearInterval(timerInterval);
        } catch (err) {}
      }

      // The time left label is updated
      document.getElementById('base-timer-label').innerHTML = timeLeft;
      this.setCircleDasharray(limit, timeLeft);
    }, 1000);
    this.set('timerInterval', timerInterval);
  }

  clearTimer() {
    try {
      const timerInterval = this.get('timerInterval');
      document.querySelector('.notify__close-btn').style.display = 'inline-block';
      document.querySelector('.base-timer').style.display = 'none';
      clearInterval(timerInterval);
    } catch (err) {}
  }

  calculateTimeFraction(limit, timeLeft) {
    const rawTimeFraction = timeLeft / limit;
    return rawTimeFraction - (1 / limit) * (1 - rawTimeFraction);
  }

  setCircleDasharray(limit, timeLeft) {
    const FULL_DASH_ARRAY = 283;
    const circleDasharray = `${(
      this.calculateTimeFraction(limit, timeLeft) * FULL_DASH_ARRAY
    ).toFixed(0)} 283`;
    document
      .getElementById('base-timer-path-remaining')
      .setAttribute('stroke-dasharray', circleDasharray);
  }

}

TextInputAIModel.genericAnswerIndexOffset = 65536;

export default TextInputAIModel;
