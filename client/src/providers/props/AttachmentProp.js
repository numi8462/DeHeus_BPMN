/*
 * This file contains code adapted from the [bpmn-js] library.
 * Source: [URL of the source code if available]
 * 
 * [bpmn-js] is licensed under the [bpmn.io License].
 * You can find a copy of the license at [https://bpmn.io/license/].
 */

import { html } from 'htm/preact';

import { useShowEntryEvent, isTextFieldEntryEdited, useError } from '@bpmn-io/properties-panel';
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
      component: Attachment,
      isEdited: isTextFieldEntryEdited
    }
  ];
}

function reader(file, callback) {
  const fr = new FileReader();
  fr.onload = () => callback(null, fr.result);
  fr.onerror = (err) => callback(err);
  fr.readAsDataURL(file);
}

function Attachment(props) {
  const API_URL = process.env.REACT_APP_API_URL;
  const { element, id } = props;
  const modeling = useService('modeling');
  const debounce = useService('debounceInput');
  const nodeId = element.businessObject.id;
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
  // Update property of the element and save it in the diagram file 
  const setValue = async (names, value) => {
    reader(value, (err, res) => {
      const file = { name: value.name, data: res };
      // Function for adding an attachment file in the storage
      axios.post(`${API_URL}/api/attachments/${diagramId}`, {
        nodeId: nodeId,
        file: file,
        type: value.type
      })
        .catch(err => console.error(err));
    });
    return modeling.updateProperties(element, {
      attachment: names
    });
  };

  const deleteValue = async (names, value) => {
    // Function for deleting attachment files
    axios.post(`${API_URL}/api/attachments/${diagramId}/${nodeId}/${value}`)
      .catch(err => console.error(err));
    return modeling.updateProperties(element, {
      attachment: names
    });
  };

  return html`<${AttachmentfieldEntry}
    id=${id}
    element=${element}
    getValue=${getValue}
    setValue=${setValue}
    deleteValue=${deleteValue}
    debounce=${debounce}
    diagramId=${diagramId}
  />`;
}

var hooks = require('../../../node_modules/@bpmn-io/properties-panel/preact/hooks');
var classnames = require('classnames');

function AttachmentList(props) {
  const API_URL = process.env.REACT_APP_API_URL;
  const {
    diagramId,
    element,
    id,
    onChange,
    onDelete,
    handleHide,
    resetFile,
    value = []
  } = props;
  const [localValue, setLocalValue] = hooks.useState(value || []);
  const nodeId = element.businessObject.id;
  const onDeleteClick = e => {
    e.stopPropagation();
    e.preventDefault();
    if (localValue.length > 0) {
      onDelete(e.target.name);
      const newList = localValue.filter(el => { return el.name !== e.target.name });
      setLocalValue(newList);
    }
    if (localValue.length === 0) {
      handleHide();
    }
  }
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
  const btnOnClick = e => {
    e.preventDefault();
    document.getElementById("add-attachment").click();
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
              jsx("h1", { children: "Attachments" }),
              jsx("button", {
                name: id,
                class: "attachment-add-btn",
                onClick: btnOnClick,
              }),
              jsx("input", {
                id: "add-attachment",
                type: "file",
                name: id,
                class: "bio-properties-panel-input-file",
                onChange: onChange,
                onClick: resetFile,
                accept: "image/*, .pdf, .doc, .docx"
              })
            ]
          })
          ,
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
                  }),
                  jsx("button", {
                    onClick: onDeleteClick,
                    class: "attachment-del-btn",
                    name: el
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
    debounce,
    id,
    onChange,
    onDelete,
    diagramId,
    value = []
  } = props;
  const [localValue, setLocalValue] = hooks.useState(value || []);
  const [isShown, setIsShown] = hooks.useState(false);
  const ref = useShowEntryEvent(id);
  // Call onChange function to set new property value
  const handleChangeCallback = hooks.useMemo(() => {
    return debounce(target => onChange(target.files.length > 0 ? target.files[0] : undefined));
  }, [onChange, debounce]);
  const handleDeleteCallback = hooks.useMemo(() => {
    return debounce(fileName => onDelete(fileName));
  }, [onDelete, debounce]);
  // Attach new file 
  const handleChange = e => {
    if (e.target.files.length > 0) {
      let newFile = e.target.files[0];
      const newList = [...value];
      if (newList.length > 0) {
        const duplicate = newList.find(el => { return el === newFile.name }) || null;
        if (duplicate === null) {
          handleChangeCallback(e.target);
          newList.push(newFile.name);
          setLocalValue(newList);
        }
      } else {
        handleChangeCallback(e.target);
        newList.push(newFile.name);
        setLocalValue(newList);
      }
    }
  };
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
  //
  const btnOnClick = e => {
    e.preventDefault();
    document.getElementById(prefixId(id)).click();
  }
  const resetFile = e => {
    e.target.value = null;
  }
  return jsxs("div", {
    class: "bio-properties-panel-attachment-field",
    children: [localValue.length > 0 ?
      jsx("button", {
        ref: ref,
        name: id,
        class: "bio-properties-panel-attachment-btn",
        onClick: handleShow,
        children: "View attachments..."
      }) :
      jsx("button", {
        ref: ref,
        name: id,
        class: "bio-properties-panel-attachment-btn",
        onClick: btnOnClick,
        children: "Select a file..."
      }),
    jsx("input", {
      ref: ref,
      id: prefixId(id),
      type: "file",
      name: id,
      class: "bio-properties-panel-input-file",
      onClick: resetFile,
      onChange: handleChange,
      accept: "image/*, .pdf, .doc, .docx"
    }),
    (localValue.length > 0 && isShown) &&
    jsx(AttachmentList, {
      element: element,
      id: id,
      onChange: handleChange,
      onDelete: handleDeleteCallback,
      value: localValue,
      resetFile: resetFile,
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
    getNames,
    getValue,
    setValue,
    deleteValue,
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
  // Change attachment in the element 
  const onChange = newValue => {
    let newValidationError = null;
    if (isFunction(validate)) {
      newValidationError = validate(newValue) || null;
    }
    const newList = [...value, newValue.name];
    setValue(newList, newValue, newValidationError);
    setLocalError(newValidationError);
  };

  const onDelete = fileName => {
    let newValidationError = null;
    if (isFunction(validate)) {
      newValidationError = validate(fileName) || null;
    }
    const newList = value.filter(el => { return fileName !== el });
    // Delete file in DB
    deleteValue(newList, fileName, newValidationError);
    setLocalError(newValidationError);
  };

  const error = globalError || localError;
  return jsxs("div", {
    class: classnames('bio-properties-panel-attachment-entry', error ? 'has-error' : ''),
    "data-entry-id": id,
    children: [jsx(Attachmentfield, {
      debounce: debounce,
      id: id,
      onChange: onChange,
      value: value,
      element: element,
      onDelete: onDelete,
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