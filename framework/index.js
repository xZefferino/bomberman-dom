// Mini-Framework: Virtual DOM, Rendering, and Element Creation

// Virtual DOM element factory
export function h(tag, attrs = {}, ...children) {
    return { tag, attrs, children: children.flat() };
}

// Render virtual DOM to real DOM
export function render(vnode, container) {
    container.innerHTML = '';
    container.appendChild(_createElement(vnode));
}

function _createElement(vnode) {
    if (vnode == null || typeof vnode === 'boolean') {
        return document.createTextNode('');
    }

    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return document.createTextNode(vnode);
    }

    const el = document.createElement(vnode.tag);

    // Set attributes
    for (const [key, value] of Object.entries(vnode.attrs || {})) {
        if (key.startsWith('on') && typeof value === 'function') {
            el.setAttribute(key, '');
            el.__customEvent = el.__customEvent || {};
            el.__customEvent[key] = value;
        } else {
            el.setAttribute(key, value);
        }
    }

    // Render children
    (vnode.children || []).forEach(child => {
        el.appendChild(_createElement(child));
    });

    return el;
}


// Patch function for future diffing (not implemented yet)
export function patch() {
    // ...future implementation for efficient updates...
}
