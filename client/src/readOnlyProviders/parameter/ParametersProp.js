/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */
import {
  getParameters
} from '../../providers/util';

import ParameterProps from './ParameterProps';


export default function ParametersProps({ element, injector }) {

  const parameters = getParameters(element) || [];

  const items = parameters.map((parameter, index) => {
    const id = element.id + '-parameter-' + index;

    return {
      id,
      label: parameter.get('name') || '',
      entries: ParameterProps({
        idPrefix: id,
        element,
        parameter
      }),
      autoFocusEntry: id + '-name',
    };
  });

  return {
    items
  };
}