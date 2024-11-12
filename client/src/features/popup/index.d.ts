import ReplaceMenuProvider from './ReplaceMenuProvider';
declare namespace _default {
    const __depends__: (import("didi").ModuleDeclaration | {
      bpmnReplace: (string | typeof import("../replace/BpmnReplace").default)[];
    } | {
      bpmnAutoPlace: (string | typeof import("bpmn-js/lib/features/auto-place/BpmnAutoPlace").default)[];
    })[];
    const __init__: string[];
    const replaceMenuProvider: (string | typeof ReplaceMenuProvider)[];
}
export default _default;

