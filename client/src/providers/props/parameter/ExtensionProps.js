/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { TextFieldEntry } from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


export default function ExtensionProps(props) {

  const {
    extension,
    element,
    idPrefix
  } = props;

  const entries = [
    {
      id: idPrefix + '-key',
      component: Key,
      extension,
      idPrefix,
      element
    }
  ];

  return entries;
}

function Key(props) {
  const {
    idPrefix,
    element,
    extension
  } = props;

  const commandStack = useService('commandStack'),
        translate = useService('translate'),
        debounce = useService('debounceInput');

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: extension,
      properties: {
        key: value
      }
    });
  };

  const getValue = () => {
    return extension.key;
  };

  return TextFieldEntry({
    element: extension,
    id: idPrefix + '-key',
    label: translate('Key'),
    getValue,
    setValue,
    debounce
  });
}