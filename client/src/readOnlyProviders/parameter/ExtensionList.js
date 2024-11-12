/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { html } from 'htm/preact';

import {
  ListEntry, CollapsibleEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';
import ExtensionProps from './ExtensionProps';

export default function ExtensionList(props) {
  const {
    element,
    idPrefix,
    parameter
  } = props;

  const id = `${idPrefix}-extensions`;
  const translate = useService('translate');

  let extensions = parameter.get('extensions');

  const extensionsList = (extensions && extensions.get('extensions')) || [];

  return html`<${ListEntry}
    element=${element}
    autoFocusEntry=${`[data-entry-id="${id}-extension-${extensionsList.length - 1}"] input`}
    id=${id}
    label=${translate('Extensions')}
    items=${extensionsList}
    component=${Extension} 
    />`;
}

function Extension(props) {
  const {
    element,
    id: idPrefix,
    index,
    item: extension,
    open
  } = props;

  const id = `${idPrefix}-extension-${index}`;
  const translate = useService('translate');

  return html`
  <${CollapsibleEntry}
    id=${id}
    element=${element}
    entries=${ExtensionProps({
    extension,
    element,
    idPrefix: id
  })}
    label=${extension.get('key') || translate('<empty>')}
    open=${open}
  />`;
}

