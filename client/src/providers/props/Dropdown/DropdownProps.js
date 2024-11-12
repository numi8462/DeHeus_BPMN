import { html } from 'htm/preact';

import { SelectEntry, isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

// import hooks from the vendored preact package
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';

export default function(element) {
  return [
    {
      id: 'endToEndProp',
      element,
      component: EndToEndProp,
      isEdited: isSelectEntryEdited
    },
    {
      id: 'functionProp',
      element,
      component: FunctionProp,
      isEdited: isSelectEntryEdited
    },
    {
      id: 'departmentProp',
      element,
      component: DepartmentProp,
      isEdited: isSelectEntryEdited
    },
    {
      id: 'domainProp',
      element,
      component: DomainProp,
      isEdited: isSelectEntryEdited
    }
  ];
}

// Properties for End to End
function EndToEndProp(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');


  const getValue = () => {
    return element.businessObject.endToEndProp || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      endToEndProp: value
    });
  };

  const [ spells, setSpells ] = useState([]);

  useEffect(() => {
    function fetchSpells() {
        const spellList = [
            { label: 'Procure to Pay', value: 'PTP' },
            { label: 'Order to Cash', value: 'OTC' },
            { label: 'Record to Report', value: 'RTR' },
            { label: 'Production & Planning', value: 'PAP' },
            { label: 'Inventory to Fulfillment', value: 'ITF' },
            { label: 'Acquire to Retire', value: 'ATR' }
        ];
        setSpells(spellList);
    }

    fetchSpells();
  }, []);

  const getOptions = () => {
    return [
      { label: '<none>', value: undefined },
      ...spells
    ];
  };

  return html`<${SelectEntry}
    id=${ id }
    element=${ element }
    description=${ translate('Select an Option') }
    label=${ translate('End to End') }
    getValue=${ getValue }
    setValue=${ setValue }
    getOptions=${ getOptions }
    debounce=${ debounce }
  />`;
}

// Properties for Function
function FunctionProp(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.functionProp || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      functionProp: value
    });
  };

  const [ options, setOptions ] = useState([]);

  useEffect(() => {
    const optionList = [
      "Purchase",
      "Sale" ,
      "Production",
      "Accounting GL",
      "Accounting AR",
      "Accounting AP",
      "Accounting FA",
      "Accounting C&B",
    ];
    setOptions(optionList);
  }, []);

  const getOptions = () => {
    return [
      { label: '<none>', value: undefined },
      ...options.map(spell => ({
        label: spell,
        value: spell
      }))
    ];
  };

  return html`<${SelectEntry}
    id=${ id }
    element=${ element }
    description=${ translate('Select an Option') }
    label=${ translate('Function') }
    getValue=${ getValue }
    setValue=${ setValue }
    getOptions=${ getOptions }
    debounce=${ debounce }
  />`;
}

// Properties for Department
function DepartmentProp(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.departmentProp || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      departmentProp: value
    });
  };

  const [ options, setOptions ] = useState([]);

  useEffect(() => {
    const optionList = [
      "Quality",
      "Sales Livestock",
      "Nutrition & Support Aqua",
      "Sales Aqua",
      "Production Livestock",
      "Production Aqua",
      "Information Technology",
      "Data and Digital",
      "Depots & Transportation",
      "Human Resources",
      "Legal",
      "General",
      "Finance",
      "Purchasing",
      "Marketing",
     " Logistics",
      "Nutrition and support Livestock",
      "Project",
      "Genetics",
     " Petfood",
     " Premix",
    ];
    setOptions(optionList);
  }, []);

  const getOptions = () => {
    return [
      { label: '<none>', value: undefined },
      ...options.map(spell => ({
        label: spell,
        value: spell
      }))
    ];
  };

  return html`<${SelectEntry}
    id=${ id }
    element=${ element }
    description=${ translate('Select an Option') }
    label=${ translate('Department') }
    getValue=${ getValue }
    setValue=${ setValue }
    getOptions=${ getOptions }
    debounce=${ debounce }
  />`;
}

// Properties for Domain
function DomainProp(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.domainProp || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      domainProp: value
    });
  };

  const [ options, setOptions ] = useState([]);

  useEffect(() => {
    const optionList = [
      "Operation",
      "Finance",
    ];
    setOptions(optionList);
  }, []);

  const getOptions = () => {
    return [
      { label: '<none>', value: undefined },
      ...options.map(spell => ({
        label: spell,
        value: spell
      }))
    ];
  };

  return html`<${SelectEntry}
    id=${ id }
    element=${ element }
    description=${ translate('Select an Option') }
    label=${ translate('Domain') }
    getValue=${ getValue }
    setValue=${ setValue }
    getOptions=${ getOptions }
    debounce=${ debounce }
  />`;
}