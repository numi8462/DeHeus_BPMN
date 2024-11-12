/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { Element } from 'diagram-js/lib/model/Types';

export type Token = {
  matched: string;
  normal: string;
};

export type SearchResult = {
  primaryTokens: Token[];
  secondaryTokens: Token[];
  tertiaryTokens: Token[];
  fourthTokens: Token[];
  fifthTokens: Token[];
  sixthTokens: Token[];
  seventhTokens: Token[];
  eighthTokens: Token[];
  ninthTokens: Token[];
  element: Element;
};

export default interface SearchPadProvider {
  find(pattern: string): SearchResult[];
}