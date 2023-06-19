import Adapt from 'core/js/adapt';
import QuestionView from 'core/js/views/questionView';
class TextInputAIView extends QuestionView {

  preRender() {
    if (this.model.get('userAnswer')) {
      this.$('.js-textinputAI-textbox').val(this.model.get('userAnswer'));
      return true;
    } 
    if (this.model.get('_userAnswer')) {
      this.$('.js-textinputAI-textbox').val(this.model.get('_userAnswer'));
    }
    this.listenTo(Adapt, 'questionView:triggerRecordInteraction', this.recordInteraction);
    return true;
  }

  onQuestionRendered() {
    this.setReadyStatus();
  }

  // This is important and should give the user feedback on how they answered the question
  // Normally done through ticks and crosses by adding classes
  showMarking() {
    super.showMarking();
    if (!this.model.get('_canShowMarking')) return;
  }

  // Used by the question view to reset the look and feel of the component.
  resetQuestion() {
    this.$('.js-textinputAI-textbox').prop('disabled', !this.model.get('_isEnabled')).val('');

    this.model.set({
      _isCorrect: undefined
    });
  }

  //Only record the interaction once we have a score!
  recordInteraction() {
    if ((this.model.get('_recordInteraction') === true || !this.model.has('_recordInteraction')) && this.model.get('score')) {
      Adapt.trigger('questionView:recordInteraction', this);
    }
  }

  showCorrectAnswer() {
  }

  hideCorrectAnswer() {
  }

  onInputChanged(e) {
    const $input = $(e.target);
    this.model.setItemUserAnswer($input.parents('.js-textinputAI-item').index(), $input.val());
  }

}

TextInputAIView.template = 'textinputAI.jsx';

export default TextInputAIView;
