/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { html } from 'htm/preact';

import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export default function(element) {

  return [
    {
      id: 'customId',
      element,
      component: AttrId,
      isEdited: isTextFieldEntryEdited
    },
    {
      id: 'custom_value',
      element,
      component: AttrValue,
      isEdited: isTextFieldEntryEdited
    }
  ];
}

function AttrId(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.customId || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      customId: value
    });
  };

  return html`<${TextFieldEntry}
    id=${ id }
    element=${ element }
    label=${ translate('id') }
    getValue=${ getValue }
    setValue=${ setValue }
    debounce=${ debounce }
  />`;
}

function AttrValue(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.custom_value || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      custom_value: value
    });
  };

  return html`<${TextFieldEntry}
    id=${ id }
    element=${ element }
    label=${ translate('value') }
    getValue=${ getValue }
    setValue=${ setValue }
    debounce=${ debounce }
  />`;
}