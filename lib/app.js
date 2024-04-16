const DOM_TREE = (() => {
    const exports = {};
    
    exports.Tree = class {
        #rootObj;

        constructor(obj) {
            this.#rootObj = obj;
        }
        
        #getLeafs(rootObj = this.#rootObj) {
            return rootObj.children
            .reduce((acc, node) => acc + (node.children || []).length ? this.#getLeafs(node) : 1, 0);
        }

        mount(selector, horizontally = false) {
            const tableElement = document.createElement("table");
            const xProperty = horizontally ? 0 : 0;
            const yProperty = horizontally ? 0 : 0;
            for(let i = 0; i < yProperty; i++) {
                const rowElement = document.createElement("tr");
                for(let j = 0; j < xProperty; j++) {
                    const cellElement = document.createElement("td");
                    rowElement.appendChild(cellElement);
                }
                tableElement.appendChild(rowElement);
            }
            document.querySelector(selector)
            .appendChild(tableElement);
        }
    };

    return exports;
})();