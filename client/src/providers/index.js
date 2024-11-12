/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import AttachmentPropertiesProvider from './AttachmentPropertiesProvider';
import ParameterPropertiesProvider from './ParameterProvider';
import DropdownPropertiesProvider from './DropdownProvider';

export default {
  // initiate custom modules for properties panel
  __init__: [ 
    'attachmentPropertiesProvider',
    'dropdownPropertiesProvider',
    'parameterPropertiesProvider'
  ],
  attachmentPropertiesProvider: [ 'type', AttachmentPropertiesProvider ],
  dropdownPropertiesProvider: [ 'type', DropdownPropertiesProvider ],
  parameterPropertiesProvider: [ 'type', ParameterPropertiesProvider ]
};