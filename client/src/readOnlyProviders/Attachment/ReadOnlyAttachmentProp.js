/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { html } from 'htm/preact';

import { useShowEntryEvent, useError } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { isFunction } from 'min-dash';
import { jsx, jsxs } from '@bpmn-io/properties-panel/preact/jsx-runtime';
import axios from 'axios';
import { getLocation } from '../../utils/navigation';

export default function (element) {
  return [
    {
      id: 'attachment',
      element,
      component: Attachment
    }
  ];
}

function Attachment(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const debounce = useService('debounceInput');
  const { diagramId } = getLocation();
  // Get attachment 
  const getValue = () => {
    if (element.businessObject.attachment) {
      if (typeof element.businessObject.attachment === 'string') {
        return [...element.businessObject.attachment.split(',')];
      }
      return [...element.businessObject.attachment];
    } else {
      return [];
    }
  };

  return html`<${AttachmentfieldEntry}
    id=${id}
    element=${element}
    getValue=${getValue}
    debounce=${debounce}
    diagramId=${diagramId}
  />`;
}

var hooks = require('@bpmn-io/properties-panel/preact/hooks');
var classnames = require('classnames');

function AttachmentList(props) {
  const API_URL = process.env.REACT_APP_API_URL;
  const {
    diagramId,
    element,
    handleHide,
    value = []
  } = props;
  const [localValue, setLocalValue] = hooks.useState(value || []);
  const nodeId = element.businessObject.id;
  // View file on click
  const onClick = e => {
    e.stopPropagation();
    // Function for getting selected attachment file
    axios.get(`${API_URL}/api/attachments/${diagramId}/${nodeId}/${e.target.name}`, { responseType: 'blob' })
      .then((res) => {
        var url = URL.createObjectURL(res.data);
        window.open(url);
      })
      .catch(err => console.error(err));
  }
  // Check value changes
  hooks.useEffect(() => {
    if (value === localValue) {
      return;
    }
    setLocalValue(value);
  }, [value]);
  return jsxs("div", {
    class: "bio-properties-panel-attachments-wrapper",
    children: [
      jsx("div", { class: "bio-properties-panel-attachments-bg", onClick: handleHide }),
      jsxs("div", {
        class: "bio-properties-panel-attachments-container",
        children: [
          jsxs("div", {
            class: "bio-properties-panel-attachment-header-container",
            children: [
              jsx("h1", { children: "Attachments" })
            ]
          }),
          jsx("div", {
            class: "bio-properties-panel-attachment-list-container",
            children: localValue.map(el =>
              jsxs("div", {
                class: "bio-properties-panel-attachment-container",
                children: [
                  jsx("a", {
                    name: el,
                    title: el,
                    children: jsx("p", { children: el.length > 20 ? el.substring(0, 21) + "..." : el }),
                    target: "_blank",
                    onClick: onClick,
                    class: "bio-properties-panel-a"
                  })
                ]
              })
            )
          })
          ,
          jsx("div", {
            class: "text-end pb-2",
            children: jsx("button", {
              class: "bio-properties-panel-attachment-close-btn",
              onClick: handleHide,
              children: "Close"
            })
          })
        ]
      })

    ]
  })
}

// Create html element for file attachment
function Attachmentfield(props) {
  const {
    element,
    id,
    diagramId,
    value = []
  } = props;
  const [localValue, setLocalValue] = hooks.useState(value || []);
  const [isShown, setIsShown] = hooks.useState(false);
  const ref = useShowEntryEvent(id);
  const handleShow = () => {
    setIsShown(true);
  }
  const handleHide = () => {
    setIsShown(false);
  }
  // Check value changes
  hooks.useEffect(() => {
    if (value === localValue) {
      return;
    }
    setLocalValue(value);
  }, [value]);
  return jsxs("div", {
    class: "bio-properties-panel-attachment-field",
    children: [localValue.length > 0 &&
      jsx("button", {
        ref: ref,
        name: id,
        class: "bio-properties-panel-attachment-btn",
        onClick: handleShow,
        children: "View attachments..."
      }),
    (localValue.length > 0 && isShown) &&
    jsx(AttachmentList, {
      element: element,
      id: id,
      value: localValue,
      handleHide: handleHide,
      diagramId: diagramId
    })
    ]
  });
}

// Create html element for field wrapper
function AttachmentfieldEntry(props) {
  const {
    diagramId,
    element,
    id,
    debounce,
    getValue,
    validate,
  } = props;
  const globalError = useError(id);
  const [localError, setLocalError] = hooks.useState(null);
  let value = getValue(element);
  hooks.useEffect(() => {
    if (isFunction(validate)) {
      const newValidationError = validate(value) || null;
      setLocalError(newValidationError);
    }
  }, [value, validate]);

  const error = globalError || localError;
  return value.length > 0 && jsxs("div", {
    class: classnames('bio-properties-panel-attachment-entry', error ? 'has-error' : ''),
    "data-entry-id": id,
    children: [jsx(Attachmentfield, {
      debounce: debounce,
      id: id,
      value: value,
      element: element,
      diagramId: diagramId
    }, element), error && jsx("div", {
      class: "bio-properties-panel-error",
      children: error
    })]
  });
}

function prefixId(id) {
  return `bio-properties-panel-${id}`;
}