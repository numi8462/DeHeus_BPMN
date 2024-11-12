/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';
import ExtensionList from './ExtensionList';


export default function ParameterProps(props) {

  const {
    idPrefix,
    parameter
  } = props;

  const entries = [
    {
      id: idPrefix + '-name',
      component: Name,
      idPrefix,
      parameter
    },
    {
      id: idPrefix + '-value',
      component: Value,
      idPrefix,
      parameter
    },
    {
      id: idPrefix + '-extensions',
      component: ExtensionList,
      idPrefix,
      parameter
    }
  ];

  return entries;
}
function Name(props) {
  const {
    idPrefix,
    parameter
  } = props;

  const translate = useService('translate');
  const debounce = useService('debounceInput');
  const getValue = (parameter) => {
    return parameter.name;
  };

  return TextFieldEntry({
    element: parameter,
    id: idPrefix + '-name',
    label: translate('Name'),
    getValue,
    debounce,
    disabled: true
  });
}

function Value(props) {
  const {
    idPrefix,
    parameter
  } = props;

  const translate = useService('translate');
  const debounce = useService('debounceInput');
  const getValue = (parameter) => {
    return parameter.value;
  };

  return TextFieldEntry({
    element: parameter,
    id: idPrefix + '-value',
    label: translate('Value'),
    getValue,
    debounce,
    disabled: true
  });
}