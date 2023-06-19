import React from 'react';
import { classes, templates } from 'core/js/reactHelpers';

export default function TextInput (props) {
  const {
    _isInteractionComplete,
    _id,
    _isEnabled,
    _isCorrect,
    _shouldShowMarking,
    _globals,
    displayTitle,
    body,
    instruction,
    ariaQuestion
  } = props;

  return (
    <div className="component__inner textinputAI__inner">

      <templates.header {...props} />

      {/* complex unless and if combination to set the correct classes for CSS to use in showing marking and disabled states */}
      <div
        className={classes([
          'component__widget textinputAI__widget',
          !_isEnabled && 'is-disabled',
          _isInteractionComplete && 'is-complete is-submitted show-user-answer',
          _isCorrect && 'is-correct'
        ])}
        aria-labelledby={ariaQuestion ? null : (displayTitle || body || instruction) && `${_id}-header`}
        aria-label={ariaQuestion || null}
      >

      <textarea id={`${_id}-userInput`} class="js-textinputAI-textbox" rows="10" cols="80"></textarea>
      </div>
      <div className="btn__container" />
    </div>
  );

}
