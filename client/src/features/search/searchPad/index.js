/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import OverlaysModule from 'diagram-js/lib/features/overlays';
import SelectionModule from 'diagram-js/lib/features/selection';
import TranslateModule from 'diagram-js/lib/i18n/translate/index.js';

import SearchPad from './SearchPad';


/**
 * @type { import('didi').ModuleDeclaration }
 */
export default {
  __depends__: [
    TranslateModule,
    OverlaysModule,
    SelectionModule
  ],
  searchPad: [ 'type', SearchPad ]
};