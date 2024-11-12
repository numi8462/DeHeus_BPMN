import { html } from 'htm/preact';

import { useError } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

// import hooks from the vendored preact package
import { useState } from '@bpmn-io/properties-panel/preact/hooks';
import { jsx, jsxs } from '@bpmn-io/properties-panel/preact/jsx-runtime';

export default function(element) {
  return [
    {
      id: 'endToEndProp',
      element,
      component: EndToEndProp,
    },
    {
      id: 'functionProp',
      element,
      component: FunctionProp,
    },
    {
      id: 'departmentProp',
      element,
      component: DepartmentProp,
    },
    {
      id: 'domainProp',
      element,
      component: DomainProp,
    }
  ];
}

// Properties for End to End
function EndToEndProp(props) {
  const { element, id } = props;

  const translate = useService('translate');


  const getValue = () => {
    return element.businessObject.endToEndProp || '';
  };

  return html`<${PropertyFieldEntry}
    id=${ id }
    label=${ translate("End to End") }
    getValue=${ getValue }
  />`;
}

// Properties for Function
function FunctionProp(props) {
  const { element, id } = props;
  const translate = useService('translate');

  const getValue = () => {
    return element.businessObject.functionProp || '';
  };

  return html`<${PropertyFieldEntry}
    id=${ id }
    label=${ translate("Function") }
    getValue=${ getValue }
  />`;
}

// Properties for Department
function DepartmentProp(props) {
  const { element, id } = props;
  const translate = useService('translate');
  const getValue = () => {
    return element.businessObject.departmentProp || '';
  };

  return html`<${PropertyFieldEntry}
    id=${ id }
    label=${ translate("Department") }
    getValue=${ getValue }
  />`;
}

// Properties for Domain
function DomainProp(props) {
  const { element, id } = props;
  const translate = useService('translate');

  const getValue = () => {
    return element.businessObject.domainProp || '';
  };

  return html`<${PropertyFieldEntry}
    id=${ id }
    label=${ translate("Domain") }
    getValue=${ getValue }
  />`;
}

var classnames = require('classnames');

function PropertyFieldEntry(props) {
  const {
    id,
    label,
    getValue
  } = props;
  const globalError = useError(id);
  const [localError, setLocalError] = useState(null);
  let value = getValue();
  const error = globalError || localError;
  return value !== "" && jsxs("div", {
    class: classnames('bio-properties-panel-dropdown-properties-entry', error ? 'has-error' : ''),
    "data-entry-id": id,
    children: [value !== "" && jsx('p', {
      class: 'bio-properties-panel-dropdown-properties-label',
      children: [label]
    }),
    jsx("input", {
      class: 'bio-properties-panel-dropdown-properties-value',
      value: value,
      label: label,
      disabled: true,
      defaultValue: value
    }), error && jsx("div", {
      class: "bio-properties-panel-error",
      children: error
    })]
  });
}