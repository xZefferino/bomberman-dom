// Simple hash-based router for the mini-framework
let routes = {};
let rootElem = null;

export function defineRoutes(routeTable) {
    routes = routeTable;
}

export function startRouter(root, renderFn) {
    rootElem = root;
    window.addEventListener('hashchange', () => routeTo(window.location.hash, renderFn));
    routeTo(window.location.hash, renderFn);
}

function routeTo(hash, renderFn) {
    const path = hash.replace(/^#/, '') || '/';
    const page = routes[path] || routes['/404'] || (() => 'Not found');
    renderFn(page(), rootElem);
}

export function navigate(path) {
    window.location.hash = path;
}
