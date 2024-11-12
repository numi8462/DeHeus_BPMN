import OverlaysModule from 'diagram-js/lib/features/overlays';
import ChangeSupportModule from 'diagram-js/lib/features/change-support';
import RootElementsModule from 'diagram-js/lib/features/root-elements';
import DrilldownBreadcrumbs from 'bpmn-js/lib/features/drilldown/DrilldownBreadcrumbs';
import DrilldownCentering from 'bpmn-js/lib/features/drilldown/DrilldownCentering';
import SubprocessCompatibility from 'bpmn-js/lib/features/drilldown/SubprocessCompatibility';
import DrilldownOverlayBehavior from './DrilldownOverlayBehaviour';

export default {
  __depends__: [ OverlaysModule, ChangeSupportModule, RootElementsModule ],
  __init__: [ 'drilldownBreadcrumbs', 'drilldownOverlayBehavior', 'drilldownCentering', 'subprocessCompatibility' ],
  drilldownBreadcrumbs: [ 'type', DrilldownBreadcrumbs ],
  drilldownCentering: [ 'type', DrilldownCentering ],
  drilldownOverlayBehavior: [ 'type', DrilldownOverlayBehavior ],
  subprocessCompatibility: [ 'type', SubprocessCompatibility ]
};