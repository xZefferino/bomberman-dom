// New VDOM Implementation based on the provided example

const TEXT_NODE_TAG = "#text"; // Internal constant for identifying text VNodes

// Virtual DOM element factory (replaces original h, adapted from provided vNode)
export function h(tag, attrs = {}, ...childrenArgs) {
    const flatChildren = childrenArgs.flat().map(child => {
        if (typeof child === 'string' || typeof child === 'number') {
            // Wrap primitive children in a text VNode structure
            return { tag: TEXT_NODE_TAG, attrs: {}, children: String(child), el: null };
        }
        // Assume child is already a VNode object or null/undefined
        if (child && typeof child.tag === 'string') { // Basic check for VNode-like structure
            return child;
        }
        if (child == null || typeof child === 'boolean') {
            // Represent null/boolean as empty text node for consistent child handling in patch
            return { tag: TEXT_NODE_TAG, attrs: {}, children: '', el: null };
        }
        // If it's something else unexpected, log an error or handle appropriately
        console.warn("Unexpected child type in h():", child);
        return { tag: TEXT_NODE_TAG, attrs: {}, children: '', el: null }; // Fallback
    });

    return { tag, attrs, children: flatChildren, el: null };
}

// Mounts a VNode to the Real DOM in the given container
// Accepts an optional beforeNode for insertion using insertBefore
export const mount = (vNode, container, beforeNode = null) => {
    let elToMount; // Renamed to avoid conflict if 'el' is used as a loop var or param elsewhere

    if (vNode.tag === TEXT_NODE_TAG) {
        elToMount = document.createTextNode(vNode.children);
    } else {
        elToMount = document.createElement(vNode.tag);

        // Set attributes and event listeners
        for (const key in vNode.attrs) {
            if (key.startsWith('on') && typeof vNode.attrs[key] === 'function') {
                elToMount.addEventListener(key.substring(2).toLowerCase(), vNode.attrs[key]);
            } else if (vNode.attrs[key] != null) // Check for null/undefined
                elToMount.setAttribute(key, vNode.attrs[key]);
        }

        // Mount children (recursively)
        // Children are always appended to their new parent 'elToMount',
        // so the recursive call doesn't need 'beforeNode'.
        if (Array.isArray(vNode.children)) {
            vNode.children.forEach(childVNode => {
                if (childVNode) { // Ensure childVNode is not null/undefined before mounting
                    mount(childVNode, elToMount); // Mount child into the current element 'elToMount'
                }
            });
        }
    }

    vNode.el = elToMount; // Store the created DOM element on the VNode

    // Append/Insert elToMount into the container
    if (beforeNode) {
        container.insertBefore(elToMount, beforeNode);
    } else {
        container.appendChild(elToMount);
    }
};

// Unmounts a vNode from the Real DOM
export const unmount = (vNode) => {
    if (vNode.el && vNode.el.parentNode) {
        vNode.el.parentNode.removeChild(vNode.el);
    }
    // vNode.el = null; // Optional: clear the .el property
};

// Compares 2 nodes and patches the differences onto the DOM
export const patch = (oldNode, newNode) => {
    // Case 1: newNode is null or invalid. Unmount oldNode.
    if (!newNode || typeof newNode.tag !== 'string') {
        if (oldNode && oldNode.el && oldNode.el.parentNode) { // Ensure oldNode and its element exist
            unmount(oldNode);
        }
        // console.warn("patch: newNode is invalid, unmounted oldNode if it existed.", newNode);
        return;
    }

    // At this point, newNode is a valid VNode.
    // oldNode comes from previousVNode, which should have been valid and mounted.
    // For safety, check oldNode before using its properties, especially oldNode.el
    if (!oldNode || !oldNode.el || !oldNode.el.parentNode) {
        // This implies oldNode is invalid or its DOM element is gone.
        // This situation should ideally be handled by the main render function's full mount logic.
        // If we are here, it's an unexpected state. Mounting newNode might be an option,
        // but patch is about updating an existing oldNode.
        // console.error("patch: oldNode or oldNode.el is invalid. Cannot reliably patch.", oldNode);
        // Attempting to mount newNode if oldNode's parent context is lost might be complex.
        // For now, if oldNode.el is gone, we can't proceed with patching it.
        // A more robust system might try to re-mount newNode in the container,
        // but `patch` doesn't have the original top-level container.
        // The `render` function's check `!document.body.contains(previousVNode.el)` should catch this.
        return;
    }

    const el = oldNode.el; // The DOM element we are working with.

    // Case 3: Tags are different. Replace the element.
    if (oldNode.tag !== newNode.tag) {
        const parent = el.parentNode;
        const nextSibling = el.nextSibling;
        unmount(oldNode); // Unmount the old node first
        mount(newNode, parent, nextSibling); // Mount the new node in its place
    } else { // Case 4: Tags are the same. Patch the existing element.
        newNode.el = el; // newNode reuses the DOM element.

        if (newNode.tag === TEXT_NODE_TAG) {
            if (el.nodeValue !== newNode.children) {
                el.nodeValue = newNode.children;
            }
        } else { // Element node
            // Patch attributes
            // Remove attributes that are in oldNode but not in newNode
            for (const key in oldNode.attrs) {
                if (!(key in newNode.attrs)) {
                    if (key.startsWith('on') && typeof oldNode.attrs[key] === 'function') {
                        el.removeEventListener(key.substring(2).toLowerCase(), oldNode.attrs[key]);
                    } else {
                        el.removeAttribute(key);
                    }
                }
            }

            // Add new or update existing attributes and event listeners
            for (const key in newNode.attrs) {
                const oldValue = oldNode.attrs ? oldNode.attrs[key] : undefined;
                const newValue = newNode.attrs[key];

                if (oldValue !== newValue) {
                    if (key.startsWith('on')) {
                        if (typeof oldValue === 'function') {
                            el.removeEventListener(key.substring(2).toLowerCase(), oldValue);
                        }
                        if (typeof newValue === 'function') {
                            el.addEventListener(key.substring(2).toLowerCase(), newValue);
                        }
                    } else if (newValue == null) {
                        el.removeAttribute(key);
                    }
                    else {
                        el.setAttribute(key, newValue);
                    }
                }
            }

            // Patch children
            const oldChildren = oldNode.children || [];
            const newChildren = newNode.children || [];
            const parentEl = el; // Children are patched into `el` (which is `newNode.el`)

            const commonLength = Math.min(oldChildren.length, newChildren.length);
            for (let i = 0; i < commonLength; i++) {
                const oldChild = oldChildren[i];
                const newChild = newChildren[i];

                if (oldChild && newChild) {
                    if (oldChild.el && !oldChild.el.parentNode) {
                        // oldChild's DOM element is detached (e.g., its parent was removed).
                        // It's effectively gone from parentEl. We should mount the newChild.
                        // Find the DOM element of the next *still attached* old child to determine insertion point.
                        let beforeDomElement = null;
                        for (let k = i + 1; k < oldChildren.length; k++) {
                            if (oldChildren[k] && oldChildren[k].el && oldChildren[k].el.parentNode === parentEl) {
                                beforeDomElement = oldChildren[k].el;
                                break;
                            }
                        }
                        // (Optional: if unmount does more than removeChild, like cleanup, call unmount(oldChild) here)
                        mount(newChild, parentEl, beforeDomElement);
                    } else {
                        // oldChild has no .el, or its .el is still attached to a parent.
                        // Proceed with normal patch. The patch function itself will handle
                        // cases like oldChild.el being null or oldChild.el.parentNode being null if it's not parentEl.
                        patch(oldChild, newChild);
                    }
                } else if (newChild) { // oldChild is falsy (e.g. null, undefined), newChild exists
                    let beforeDomElement = null;
                    // Find the DOM element of the next sibling in the *original* list of old children
                    // that is still attached to parentEl.
                    for (let k = i + 1; k < oldChildren.length; k++) {
                        if (oldChildren[k] && oldChildren[k].el && oldChildren[k].el.parentNode === parentEl) {
                            beforeDomElement = oldChildren[k].el;
                            break;
                        }
                    }
                    mount(newChild, parentEl, beforeDomElement);
                } else if (oldChild) { // newChild is falsy, oldChild exists
                    // Unmount oldChild if its .el is still a child of parentEl.
                    // The unmount function itself checks oldChild.el && oldChild.el.parentNode.
                    if (oldChild.el && oldChild.el.parentNode === parentEl) {
                        unmount(oldChild);
                    }
                    // (Optional: if oldChild.el is detached but unmount does listener cleanup, call unmount(oldChild))
                }
                // If both are falsy, do nothing.
            }

            // Remove surplus old children
            if (oldChildren.length > newChildren.length) {
                for (let i = commonLength; i < oldChildren.length; i++) {
                    if (oldChildren[i] && oldChildren[i].el && oldChildren[i].el.parentNode === parentEl) {
                        unmount(oldChildren[i]);
                    }
                    // (Optional: if oldChildren[i] is detached but unmount does listener cleanup, call unmount(oldChildren[i]))
                }
            }
            // Add new children (at the end)
            else if (newChildren.length > oldChildren.length) {
                for (let i = commonLength; i < newChildren.length; i++) {
                    if (newChildren[i]) {
                        mount(newChildren[i], parentEl); // Appends, so no 'beforeDomElement' needed
                    }
                }
            }
        }
    }
};

let previousVNodes = new WeakMap();

// Render function: renders the VDOM into the container
export function render(vnode, container) {
    if (!container || typeof container.appendChild !== 'function') {
        console.error("Render: Invalid container provided.", container);
        return;
    }

    let previousVNode = previousVNodes.get(container);

    // Determine if a full mount is needed:
    // 1. No previous VNode for this container.
    // 2. Previous VNode's element is null (wasn't mounted properly or vnode was invalid).
    // 3. Previous VNode's element is no longer in the document (detached externally).
    let needsFullMount = previousVNode == null || 
                         !previousVNode.el || 
                         (previousVNode.el && !document.body.contains(previousVNode.el));

    if (needsFullMount) {
        // console.log("Render: Full mount for container", container);
        container.innerHTML = ''; // Clear container for a clean first mount for this specific container
        mount(vnode, container); // mount should handle if vnode itself is invalid
    } else {
        // Subsequent renders for this specific container, and previousVNode.el is still in DOM
        // console.log("Render: Patching for container", container);
        patch(previousVNode, vnode); // patch handles if newNode is invalid
    }

    // Store the new vnode as the previous one for this container,
    // only if it's a valid vnode that likely resulted in a DOM element.
    if (vnode && typeof vnode.tag === 'string') {
        previousVNodes.set(container, vnode);
    } else {
        // If the new vnode is invalid, remove the association for this container
        // to ensure a full mount next time if a valid vnode comes for this container.
        previousVNodes.delete(container);
    }
}