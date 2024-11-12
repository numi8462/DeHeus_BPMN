import CopyPasteModule from 'bpmn-js/lib/features/copy-paste';
import ReplaceModule from 'diagram-js/lib/features/replace';
import SelectionModule from 'diagram-js/lib/features/selection';

import BpmnReplace from 'bpmn-js/lib/features/replace/BpmnReplace';

export default {
  __depends__: [
    CopyPasteModule,
    ReplaceModule,
    SelectionModule
  ],
  bpmnReplace: [ 'type', BpmnReplace ]
};
