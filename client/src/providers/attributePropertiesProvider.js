/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

// Import your custom property entries.
// The entry is a text input field with logic attached to create,
// update and delete the "spell" property.
import customProp from './props/attributesProp';
import { is } from 'bpmn-js/lib/util/ModelUtil';
const LOW_PRIORITY = 500;


/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function AttributePropertiesProvider(propertiesPanel, translate) {

  // API ////////

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

      // Add the "magic" group
      if (is(element, 'bpmn:BaseElement')) {
        groups.push(createAttributeGroup(element, translate));
      }

      return groups;
    };
  };


  // registration ////////

  // Register our custom magic properties provider.
  // Use a lower priority to ensure it is loaded after
  // the basic BPMN properties.
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

AttributePropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom attribute group
function createAttributeGroup(element,translate) {
  const customProperties = [];
  // create a group called "Attributes".
  const attrGroup = {
    id: 'attribute',
    label: translate('Attributes'),
    entries: customProp(element),
    
  };

  return attrGroup;
}