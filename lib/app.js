const DOM_TREE = (() => {
    const exports = {};
    
    exports.Tree = class {
        #root;
        
        constructor(bareObj) {
            const prepareNode = (node) => {
                const countLeafs = (node) => {
                    return node.children
                    .reduce((acc, child) => {
                        return acc + ((child.children || []).length ? countLeafs(child) : 1);
                    }, 0) || 1;
                };

                const childrenLeafCounts = node.children
                .map((child) => countLeafs(child));
                const totalLeafCount = childrenLeafCounts
                .reduce((a, c) => a + c, 0);

                node.children = node.children
                .map((child, i) => {
                    return {
                        ...prepareNode(child),

                        width: (childrenLeafCounts[i] / totalLeafCount) || 1
                    };
                });

                return node;
            };

            this.#root = prepareNode(bareObj);
            this.#root.width = 1;
        }
        
        mount(selector) {
            const createWrapperElement = (node) => {
                const wrapperElement = document.createElement("DIV");
                wrapperElement.style.display = "flex";
                wrapperElement.style.flexDirection = "row";
                wrapperElement.style.flexWrap = "wrap";
                wrapperElement.style.alignItems = "flex-start";
                wrapperElement.style.width = `${node.width * 100}%`;

                const color = `#${Math.round((Math.random() + Math.random()) / 2 * (16**6 - 1)).toString(16)}`;

                const contentElement = document.createElement("DIV");
                contentElement.style.width = "100%";
                contentElement.style.backgroundColor = color;
                contentElement.style.textAlign = "center";
                contentElement.textContent = "•";
                wrapperElement.appendChild(contentElement);

                const linksElement = document.createElement("DIV");
                linksElement.style.width = "100%";
                linksElement.style.backgroundColor = color;
                linksElement.style.textAlign = "center";
                linksElement.textContent = "| | |";
                wrapperElement.appendChild(linksElement);

                node.children
                .forEach((child) => {
                    wrapperElement.appendChild(createWrapperElement(child));
                });

                return wrapperElement;
            };
            
            document.querySelector(selector).style.width = "100vw";
            document.querySelector(selector)
            .appendChild(createWrapperElement(this.#root));
        }

        toString() {
            return JSON.stringify(this.#root, null, 2);
        }
    };

    return exports;
})();