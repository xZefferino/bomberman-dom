// Custom event system for the mini-framework
const eventRegistry = {};

export function addEvent(el, eventName, handler) {
    if (!eventRegistry[eventName]) {
        eventRegistry[eventName] = [];
        document.addEventListener(eventName.slice(2).toLowerCase(), (e) => {
            eventRegistry[eventName].forEach(({ element, fn }) => {
                if (element.contains(e.target) || element === e.target) {
                    fn(e);
                }
            });
        });
    }
    eventRegistry[eventName].push({ element: el, fn: handler });
}

// Attach events after rendering
export function attachEvents(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null, false);
    do {
        const el = walker.currentNode;
        if (el.__customEvent) {
            for (const [eventName, handler] of Object.entries(el.__customEvent)) {
                addEvent(el, eventName, handler);
            }
            delete el.__customEvent;
        }
    } while (walker.nextNode());
}
