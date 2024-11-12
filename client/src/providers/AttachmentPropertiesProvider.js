/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import attachmentProp from './props/AttachmentProp';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;


/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function AttachmentPropertiesProvider(propertiesPanel, translate) {

  /**
   * Return the groups provided for the given element.
   *
   * @param {DiagramElement} element
   *
   * @return {(Object[]) => (Object[])} groups middleware
   */
  this.getGroups = function(element) {

    /**
     * We return a middleware that modifies
     * the existing groups.
     *
     * @param {Object[]} groups
     *
     * @return {Object[]} modified groups
     */
    return function(groups) {

      // Add the "attachment" group
      if (is(element, 'bpmn:BaseElement')) {
        groups.push(createAttachGroup(element, translate));
      }

      return groups;
    };
  };


  // registration ////////

  // Register our custom properties provider.
  // Use a lower priority to ensure it is loaded after
  // the basic BPMN properties.
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

AttachmentPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom attachment group
function createAttachGroup(element, translate) {

  // create a group called "Attachment".
  const attachGroup = {
    id: 'attachment',
    label: translate('Attachment'),
    entries: attachmentProp(element)
  };

  return attachGroup;
}