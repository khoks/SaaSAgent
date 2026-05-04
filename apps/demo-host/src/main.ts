/**
 * Demo-host entry point.
 *
 * Imports @saasagent/web-shell for its custom-element side-effect registration
 * (the package's index module calls `customElements.define('saas-agent', ...)`
 * if not already defined). After that, any <saas-agent> in the HTML is upgraded
 * and connects to the runtime via the `runtime` attribute.
 */

import '@saasagent/web-shell';

// eslint-disable-next-line no-console
console.log(
  '[demo-host] <saas-agent> custom element registered. The shell will connect to the runtime URL declared in the element attribute.',
);
