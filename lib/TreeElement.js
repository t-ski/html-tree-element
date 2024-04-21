(() => {
    
    class TreeElement extends HTMLElement {
        #shadowRoot;
        #templateEl = document.createElement("TEMPLATE");
        #options = {
            childrenPropertyIdentifier: "children",
            horizontal: false,
            linkColor: "#000000",
            linkLength: "5rem",
            linkMargin: "1rem",
            linkSlopeEnd: 1.0,
            linkSlopeStart: 1.0,
            linkStrength: 1
        };
        #contentCallback = this.#defaultContentCallback;
        #linkRenderers = [];

        constructor() {
            super();

            this.#shadowRoot = this.attachShadow({
                mode: "open"
            });

            const sheet = new CSSStyleSheet();
            sheet.replaceSync(":host { display: block; }");
            this.#shadowRoot.adoptedStyleSheets = [ sheet ];
        }

        connectedCallback() {
            window.addEventListener("resize", () => this.#render());
        }

        disconnectedCallback() {
            window.removeEventListener("resize", () => this.#render());
        }

        #defaultContentCallback(node, el) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            while(walker.nextNode()) {
                walker.currentNode.textContent = walker.currentNode.textContent
                .replace(/\{\{ *([\w_][\w\d_]*) *\}\}/g, (_, property) => {
                    return (node[property] || "").toString();
                });
            }
            Array.from(el.getElementsByTagName("*"))
            .forEach((childEl) => {
                Array.from(childEl.attributes)
                .filter((attribute) => {
                   return /^on\w+$/i.test(attribute.name)
                   && /^ *[\w_][\w\d_]* *\( *\) *$/i.test(attribute.value);
                })
                .forEach((attribute) => {
                    childEl[attribute.name] = node[attribute.value.trim().match(/^[\w_][\w\d_]*/)[0]] || (() => {}).bind(node); // TODO
                });
            });
        }

        #render() {
            this.#linkRenderers
            .forEach((linkRenderer) => {
                const { actualWidth, actualHeight } = linkRenderer.prepare();
                linkRenderer.renderers
                .forEach((renderer) => renderer(actualWidth, actualHeight));
            });
        }

        setTemplate(templateElementOrSelector) {
            this.#templateEl = !(templateElementOrSelector instanceof HTMLTemplateElement)
            ? document.querySelector(templateElementOrSelector)
            : templateElementOrSelector;

            if(!(this.#templateEl instanceof HTMLTemplateElement)) throw new TypeError("Not a template element");

            return this;
        }

        setOptions(options) {
            this.#options = {
                ...this.#options,
                ...options
            };

            return this;
        }

        setContentCallback(callback) {
            this.#contentCallback = callback;

            if(!(this.#contentCallback instanceof Function)) throw new TypeError("Not a function");

            return this;
        }

        render(treeObj) {
            this.#linkRenderers = [];

            const prepareNode = (node) => {
                const countLeafs = (node) => {
                    return node[this.#options.childrenPropertyIdentifier]
                    .reduce((acc, child) => {
                        return acc + ((child[this.#options.childrenPropertyIdentifier] || []).length ? countLeafs(child) : 1);
                    }, 0) || 1;
                };

                const childrenLeafCounts = node[this.#options.childrenPropertyIdentifier]
                .map((child) => countLeafs(child));
                const totalLeafCount = childrenLeafCounts
                .reduce((a, c) => a + c, 0);

                node[this.#options.childrenPropertyIdentifier] = node[this.#options.childrenPropertyIdentifier]
                .map((child, i) => {
                    return {
                        ...prepareNode(child),

                        ratio: (childrenLeafCounts[i] / totalLeafCount) || 1
                    };
                });
                node.ratio = node.ratio || 1;

                return node;
            };
            
            const createWrapperElement = (node) => {
                const wrapperElement = document.createElement("DIV");
                wrapperElement.style.display = "flex";
                wrapperElement.style.flexDirection = this.#options.horizontal ? "row" : "column";
                wrapperElement.style[this.#options.horizontal ? "height" : "width"] = `${node.ratio * 100}%`;

                const contentElement = document.createElement("DIV");
                contentElement.style.display = "flex";
                contentElement.style.alignItems = "center";
                contentElement.style.justifyContent = "center";
                contentElement.appendChild(this.#templateEl.content.cloneNode(true));
                wrapperElement.appendChild(contentElement);
                
                const callbackNodeArg = Object.assign({}, node);
                delete callbackNodeArg.ratio;
                delete callbackNodeArg[this.#options.childrenPropertyIdentifier];
                this.#contentCallback(callbackNodeArg, contentElement);

                if(!(node[this.#options.childrenPropertyIdentifier] || []).length) return wrapperElement;

                const linksElement = document.createElement("CANVAS");
                linksElement.style.margin = this.#options.linkMargin;
                linksElement.style[this.#options.horizontal ? "width" : "height"] = this.#options.linkLength;
                wrapperElement.appendChild(linksElement);

                const childrenElement = document.createElement("DIV");
                childrenElement.style.display = "flex";
                childrenElement.style.flexDirection = this.#options.horizontal ? "column" : "row";
                wrapperElement.appendChild(childrenElement);

                const ctx = linksElement.getContext("2d");

                const linkRenderers = {
                    prepare: () => {
                        const actualWidth = linksElement.offsetWidth;
                        const actualHeight = linksElement.offsetHeight;

                        linksElement.width = actualWidth;
                        linksElement.height = actualHeight;

                        return { actualWidth, actualHeight };
                    },
                    renderers: []
                };

                node[this.#options.childrenPropertyIdentifier]
                .reduce((ratioOffset, child) => {
                    linkRenderers.renderers
                    .push((actualWidth, actualHeight) => {
                        const mVDim = [ actualWidth, actualHeight ];
                        const mDim = this.#options.horizontal
                        ? mVDim.reverse()
                        : mVDim;
                        const mVDir = [
                            [ mDim[0] / 2, 0],
                            [ mDim[0] / 2, mDim[1] * this.#options.linkSlopeStart ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] *  (1 - this.#options.linkSlopeEnd) ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] ]
                        ];
                        const mDir = this.#options.horizontal
                        ? mVDir.map((row) => row.reverse())
                        : mVDir;

                        ctx.lineWidth = this.#options.linkStrength;
                        ctx.strokeStyle = this.#options.linkColor;
                        ctx.beginPath();
                        ctx.moveTo(mDir[0][0], mDir[0][1]);
                        ctx.bezierCurveTo(mDir[1][0], mDir[1][1], mDir[2][0], mDir[2][1], mDir[3][0], mDir[3][1]);
                        ctx.stroke();
                        ctx.closePath();
                    });
                    
                    childrenElement.appendChild(createWrapperElement(child));

                    return ratioOffset + child.ratio;
                }, 0);

                this.#linkRenderers.push(linkRenderers);

                return wrapperElement;
            };
            
            this.#shadowRoot
            .appendChild(createWrapperElement(prepareNode(treeObj)));

            this.#render();
        }
    }
    
    customElements.define("dom-tree", TreeElement);

})();