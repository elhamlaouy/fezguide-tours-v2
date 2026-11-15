// Test helper: the editor mounts only the open workspace and opens collection items on demand,
// so a test goes where the control lives before using it.
const TABS = ['sections', 'page', 'content', 'photos', 'appearance', 'settings', 'history'];
export async function openLazy(window, act, done = () => false) {
  for (let round = 0; round < 4 && !done(); round += 1) {
    const closed = [...window.document.querySelectorAll('details[data-lazy]:not([open])')];
    if (!closed.length) return;
    await act(async () => { for (const details of closed) { details.open = true; details.dispatchEvent(new window.Event('toggle')); } });
  }
}
// A tour's fields are grouped in tabs that mount one group at a time: open each tab of the open tours until the control shows.
export async function openTourTabs(window, act, done = () => false) {
  for (const tab of ['basics', 'price', 'itinerary', 'included', 'photos', 'policies']) {
    if (done()) return;
    const buttons = [...window.document.querySelectorAll(`[data-tour-tab="${tab}"]`)];
    if (!buttons.length) return;
    await act(async () => { for (const button of buttons) button.click(); });
    await openLazy(window, act, done);
  }
}
export async function reveal(window, act, selector) {
  const has = () => window.document.querySelector(selector);
  if (has()) return;
  for (const tab of TABS) {
    await act(async () => { window.document.querySelector(`[data-workspace-tab="${tab}"]`)?.click(); });
    await openLazy(window, act, has);
    await openTourTabs(window, act, has);
    if (has()) return;
  }
}
