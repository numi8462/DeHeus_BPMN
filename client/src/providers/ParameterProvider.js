/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

// Import your custom list group entries.
import parametersProps from './props/parameter/ParametersProp';

// Import the properties panel list group component.
import { ListGroup } from '@bpmn-io/properties-panel';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;


/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function ParameterPropertiesProvider(propertiesPanel, injector, translate) {

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

      if (is(element, 'bpmn:BaseElement')) {
        groups.push(createParametersGroup(element, injector, translate));
      }

      return groups;
    };
  };


  // registration ////////

  // Use a lower priority to ensure it is loaded after
  // the basic BPMN properties.
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

ParameterPropertiesProvider.$inject = [ 'propertiesPanel', 'injector', 'translate' ];

// Create the custom parameters list group.
function createParametersGroup(element, injector, translate) {

  // Create a group called "parameters".
  const parametersGroup = {
    id: 'parameters',
    label: translate('Extended'),
    component: ListGroup,
    ...parametersProps({ element, injector })
  };

  return parametersGroup;
}