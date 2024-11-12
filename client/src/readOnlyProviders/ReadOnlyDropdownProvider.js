import dropdownProps from './Dropdown/DropdownProps';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;


/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function ReadOnlyDropdownProvider(propertiesPanel, translate) {

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
        groups.push(createMagicGroup(element, translate));
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

ReadOnlyDropdownProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom magic group
function createMagicGroup(element, translate) {

  // create a group called "Properties".
  const magicGroup = {
    id: 'dropdown',
    label: translate('Properties'),
    entries: dropdownProps(element),  
  };

  return magicGroup;
}