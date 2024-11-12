/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import SearchPadModule from '../searchPad';

import BpmnSearchProvider from './BpmnSearchProvider';


export default {
  __depends__: [
    SearchPadModule
  ],
  __init__: [ 'bpmnSearch' ],
  bpmnSearch: [ 'type', BpmnSearchProvider ]
};