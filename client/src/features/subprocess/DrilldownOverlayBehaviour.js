/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil';
import { classes, domify } from 'min-dom';
import { getPlaneIdFromShape } from 'bpmn-js/lib/util/DrilldownUtil';
import axios from 'axios';
import { getLocation } from '../../utils/navigation';
import Swal from 'sweetalert2';

/**
 * @typedef {import('diagram-js/lib/core/Canvas').default} Canvas
 * @typedef {import('diagram-js/lib/core/ElementRegistry').default} ElementRegistry
 * @typedef {import('diagram-js/lib/core/EventBus').default} EventBus
 * @typedef {import('diagram-js/lib/features/overlays/Overlays').default} Overlays
 * @typedef {import('diagram-js/lib/i18n/translate/translate').default} Translate
 *
 * @typedef {import('bpmn-js/lib/model/Types').Element} Element
 * @typedef {import('bpmn-js/lib/model/Types').Parent} Parent
 * @typedef {import('bpmn-js/lib/model/Types').Shape} Shape
 */

var LOW_PRIORITY = 250;
var ARROW_DOWN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.81801948,3.50735931 L10.4996894,9.1896894 L10.5,4 L12,4 L12,12 L4,12 L4,10.5 L9.6896894,10.4996894 L3.75735931,4.56801948 C3.46446609,4.27512627 3.46446609,3.80025253 3.75735931,3.50735931 C4.05025253,3.21446609 4.52512627,3.21446609 4.81801948,3.50735931 Z"/></svg>';

var EMPTY_MARKER = 'bjs-drilldown-empty';

/**
 * @param {Canvas} canvas
 * @param {EventBus} eventBus
 * @param {ElementRegistry} elementRegistry
 * @param {Overlays} overlays
 * @param {Translate} translate
 */
export default function DrilldownOverlayBehavior(
  canvas, eventBus, elementRegistry, overlays, translate
) {
  CommandInterceptor.call(this, eventBus);

  this._canvas = canvas;
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._overlays = overlays;
  this._translate = translate;
  var self = this;

  this.executed('shape.toggleCollapse', LOW_PRIORITY, function (context) {
    var shape = context.shape;

    // Add overlay to the collapsed shape
    if (self._canDrillDown(shape)) {
      self._addOverlay(shape);
    } else {
      self._removeOverlay(shape);
    }
  }, true);


  this.reverted('shape.toggleCollapse', LOW_PRIORITY, function (context) {
    var shape = context.shape;

    // Add overlay to the collapsed shape
    if (self._canDrillDown(shape)) {
      self._addOverlay(shape);
    } else {
      self._removeOverlay(shape);
    }
  }, true);


  this.executed(['shape.create', 'shape.move', 'shape.delete'], LOW_PRIORITY,
    function (context) {
      var oldParent = context.oldParent,
        newParent = context.newParent || context.parent,
        shape = context.shape;

      // Add overlay to the collapsed shape
      if (self._canDrillDown(shape)) {
        self._addOverlay(shape);
      }

      self._updateDrilldownOverlay(oldParent);
      self._updateDrilldownOverlay(newParent);
      self._updateDrilldownOverlay(shape);
    }, true);


  this.reverted(['shape.create', 'shape.move', 'shape.delete'], LOW_PRIORITY,
    function (context) {
      var oldParent = context.oldParent,
        newParent = context.newParent || context.parent,
        shape = context.shape;

      // Add overlay to the collapsed shape
      if (self._canDrillDown(shape)) {
        self._addOverlay(shape);
      }

      self._updateDrilldownOverlay(oldParent);
      self._updateDrilldownOverlay(newParent);
      self._updateDrilldownOverlay(shape);
    }, true);


  eventBus.on('import.render.complete', function () {
    elementRegistry.filter(function (e) {
      return self._canDrillDown(e);
    }).map(function (el) {
      self._addOverlay(el);
    });
  });

}

inherits(DrilldownOverlayBehavior, CommandInterceptor);

/**
 * @param {Shape} shape
 */
DrilldownOverlayBehavior.prototype._updateDrilldownOverlay = function (shape) {
  var canvas = this._canvas;

  if (!shape) {
    return;
  }

  var root = canvas.findRoot(shape);

  if (root) {
    this._updateOverlayVisibility(root);
  }
};

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
DrilldownOverlayBehavior.prototype._canDrillDown = function (element) {
  var canvas = this._canvas;

  return is(element, 'bpmn:SubProcess') && canvas.findRoot(getPlaneIdFromShape(element));
};

/**
 * Update the visibility of the drilldown overlay. If the plane has no elements,
 * the drilldown will only be shown when the element is selected.
 *
 * @param {Parent} element The collapsed root or shape.
 */
DrilldownOverlayBehavior.prototype._updateOverlayVisibility = function (element) {
  var overlays = this._overlays;

  var businessObject = getBusinessObject(element);

  var overlay = overlays.get({ element: businessObject.id, type: 'drilldown' })[0];

  if (!overlay) {
    return;
  }

  var hasFlowElements = businessObject
    && businessObject.get('flowElements')
    && businessObject.get('flowElements').length;

  classes(overlay.html).toggle(EMPTY_MARKER, !hasFlowElements);
};

/**
 * Add a drilldown button to the given element assuming the plane has the same
 * ID as the element.
 *
 * @param {Shape} element The collapsed shape.
 */
DrilldownOverlayBehavior.prototype._addOverlay = function (element) {
  var canvas = this._canvas,
    overlays = this._overlays,
    bo = getBusinessObject(element);

  var existingOverlays = overlays.get({ element: element, type: 'drilldown' });

  if (existingOverlays.length) {
    this._removeOverlay(element);
  }

  var button = domify('<button type="button" class="bjs-drilldown">' + ARROW_DOWN_SVG + '</button>'),
    elementName = bo.get('name') || bo.get('id'),
    title = this._translate('Open {element}', { element: elementName });
  button.setAttribute('title', title);

  button.addEventListener('click', function () {
    const API_URL = process.env.REACT_APP_API_URL;
    const projectId = window.location.pathname.split("/")[2];
    const name = element.businessObject.name;
    const { userName, diagramId } = getLocation();
    if (name) {
      axios.post(`${API_URL}/api/diagram/createSub`, {
        projectId: projectId,
        diagramId: diagramId,
        processName: name,
        elementId: element.id,
        userEmail: userName
      })
        .then((res) => {
          if (res.data.message.endsWith("exists")) {
            axios.get(`${API_URL}/api/diagrams/get-diagram-with-project/${projectId}/${res.data.data.id}/${userName}`)
              .then((response) => {
                if (response.data.fileData) {
                  const { diagramName, fileData } = response.data;
                  const url = `/project/${projectId}/${diagramName.replace(/ /g, '-')}`;
                  const data = { id: res.data.data.id, url: url, userName: userName, fileData: fileData }
                  const newWindow = window.open(url, "_blank");
                  newWindow.addEventListener("load", () => {
                    setTimeout(() => {
                      newWindow.postMessage(data, window.location.origin);
                    }, 500);
                  });
                } else {
                  if (response.data.message && response.data.message.startsWith("available")) {
                    const url = `/project/${projectId}/${name.replace(/ /g, '-')}`;
                    const data = { id: res.data.data.id, url: url, userName: userName }
                    const newWindow = window.open(url, "_blank");
                    newWindow.addEventListener("load", () => {
                      setTimeout(() => {
                        newWindow.postMessage(data, window.location.origin);
                      }, 500);
                    });
                  } else {
                    // alert("Publishing in progress");
                    Swal.fire({
                      title: 'Publishing in progress!',
                      text: 'Please try again after the diagram is published.',
                      icon: 'error',
                      confirmButtonText: 'OK'
                    });
                  }
                }
              }).catch((error) => {
                console.error("Error fetching diagram data:", error);
                // alert('Failed to open the diagram.');
                Swal.fire({
                  title: 'Failed to open the diagram!',
                  text: 'Please try again.',
                  icon: 'error',
                  confirmButtonText: 'OK'
                });
              })
          } else {
            const url = `/project/${projectId}/${res.data.data.name.replace(/ /g, '-')}`;
            const newWindow = window.open(url, "_blank");
            const data = { id: res.data.data.id, url: url, userName: userName };
            newWindow.addEventListener("load", () => {
              setTimeout(() => {
                newWindow.postMessage(data, window.location.origin);
              }, 500);
            });
          }
        })
        .catch(err => console.error(err));
    } else {
      // alert("To create a subprocess, there must be a name for it");
      Swal.fire({
        title: 'Error!',
        text: 'To create a subprocess, there must be a name for it.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  });

  overlays.add(element, 'drilldown', {
    position: {
      bottom: -7,
      right: -8
    },
    html: button
  });

  this._updateOverlayVisibility(element);
};

DrilldownOverlayBehavior.prototype._removeOverlay = function (element) {
  var overlays = this._overlays;

  overlays.remove({
    element: element,
    type: 'drilldown'
  });
};

DrilldownOverlayBehavior.$inject = [
  'canvas',
  'eventBus',
  'elementRegistry',
  'overlays',
  'translate'
];