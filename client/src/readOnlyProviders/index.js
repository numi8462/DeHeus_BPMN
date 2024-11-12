/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import ReadOnlyAttachmentProvider from './ReadOnlyAttachmentProvider';
import ReadOnlyDropdownProvider from './ReadOnlyDropdownProvider';
import ReadOnlyParameterProvider from './ReadOnlyParameterProvider';

export default {
  // initiate custom modules for properties panel
  __init__: [ 
    'readOnlyAttachmentProvider',
    'readOnlyDropdownProvider',
    'readOnlyParameterProvider'
  ],
  readOnlyAttachmentProvider: [ 'type', ReadOnlyAttachmentProvider],
  readOnlyDropdownProvider: [ 'type', ReadOnlyDropdownProvider],
  readOnlyParameterProvider: ['type', ReadOnlyParameterProvider]
};