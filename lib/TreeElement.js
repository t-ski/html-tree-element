(() => {
    
    class TreeElement extends HTMLElement {
        static #defaultConfiguration = {
            childrenPropertyIdentifier: "children",
            horizontal: false,
            linkColor: "#000000",
            linkLength: "5rem",
            linkMargin: 0,
            linkSlopeEnd: 1.0,
            linkSlopeStart: 1.0,
            linkStrength: 1
        };
        
        static observedAttributes = [ "data", "configuration", "template", "nodecallback" ];

        static #defaultNodeCallback(node, el) {
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

        static configureDefault(configuration) {
            TreeElement.#defaultConfiguration = {
                ...TreeElement.#defaultConfiguration,
                ...configuration
            };
        }

        #configuration = TreeElement.#defaultConfiguration;
        #template = document.createElement("TEMPLATE");
        #nodeCallback = TreeElement.#defaultNodeCallback;
        #linkRenderers = [];
        #shadowRoot;
        #dataObj;
        
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

        attributeChangedCallback(name, _, newValue) {
            switch(name) {
                case "data":
                    setTimeout(() => this.render(window[newValue]), 0);
                    break;
                case "configure":
                    this.configure(newValue);
                    break;
                case "template":
                    this.template(newValue);
                    break;
                case "nodecallback":
                    this.nodeCallback(window[newValue]);
                    break;
            }
        }

        #render() {
            this.#linkRenderers
            .forEach((linkRenderer) => {
                const { actualWidth, actualHeight } = linkRenderer.prepare();
                linkRenderer.renderers
                .forEach((renderer) => renderer(actualWidth, actualHeight));
            });
        }

        configure(overrideConfiguration = {}) {
            if(!Object.keys(overrideConfiguration).length) throw new TypeError("Not a keyed object");

            this.#configuration = {
                ...this.#configuration,
                ...overrideConfiguration
            };

            return this;
        }

        template(templateElementOrSelector) {
            this.#template = !(templateElementOrSelector instanceof HTMLTemplateElement)
            ? document.querySelector(templateElementOrSelector)
            : templateElementOrSelector;

            if(!(this.#template instanceof HTMLTemplateElement)) throw new TypeError("Not a template element");

            return this;
        }

        nodeCallback(nodeCallback) {
            this.#nodeCallback = nodeCallback;

            if(!(this.#nodeCallback instanceof Function)) throw new TypeError("Not a function");

            return this;
        }

        render(dataObj) {
            this.#dataObj = dataObj || this.#dataObj;

            if(!this.#dataObj) throw new ReferenceError("Data argument is undefined");
            if(!this.#dataObj[this.#configuration.childrenPropertyIdentifier]) throw new SyntaxError("Data argument does not represent a valid tree root");

            this.#linkRenderers = [];

            const calcSpaceRatio = (node) => {
                const countLeafs = (node) => {
                    return (node[this.#configuration.childrenPropertyIdentifier] || [])
                    .reduce((acc, child) => {
                        return acc + ((child[this.#configuration.childrenPropertyIdentifier] || []).length ? countLeafs(child) : 1);
                    }, 0) || 1;
                };

                const childrenLeafCounts = (node[this.#configuration.childrenPropertyIdentifier] || [])
                .map((child) => countLeafs(child));
                const totalLeafCount = childrenLeafCounts
                .reduce((a, c) => a + c, 0);

                node[this.#configuration.childrenPropertyIdentifier] = (node[this.#configuration.childrenPropertyIdentifier] || [])
                .map((child, i) => {
                    return {
                        ...calcSpaceRatio(child),

                        ratio: (childrenLeafCounts[i] / totalLeafCount) || 1
                    };
                });
                node.ratio = node.ratio || 1;

                return node;
            };
            const createWrapperElement = (node) => {
                const wrapperElement = document.createElement("DIV");
                wrapperElement.style.display = "flex";
                wrapperElement.style.flexDirection = this.#configuration.horizontal ? "row" : "column";
                wrapperElement.style[this.#configuration.horizontal ? "height" : "width"] = `${node.ratio * 100}%`;

                const contentElement = document.createElement("DIV");
                contentElement.style.display = "flex";
                contentElement.style.alignItems = "center";
                contentElement.style.justifyContent = "center";
                contentElement.appendChild(this.#template.content.cloneNode(true));
                wrapperElement.appendChild(contentElement);
                
                const callbackNodeArg = Object.assign({}, node);
                delete callbackNodeArg.ratio;
                delete callbackNodeArg[this.#configuration.childrenPropertyIdentifier];
                this.#nodeCallback(callbackNodeArg, contentElement);

                if(!(node[this.#configuration.childrenPropertyIdentifier] || []).length) return wrapperElement;

                const linksElement = document.createElement("CANVAS");
                linksElement.style.margin = this.#configuration.linkMargin;
                linksElement.style[this.#configuration.horizontal ? "width" : "height"] = this.#configuration.linkLength;
                wrapperElement.appendChild(linksElement);

                const childrenElement = document.createElement("DIV");
                childrenElement.style.display = "flex";
                childrenElement.style.flexDirection = this.#configuration.horizontal ? "column" : "row";
                wrapperElement.appendChild(childrenElement);

                const ctx = linksElement.getContext("2d");

                const linkRenderers = {
                    prepare: () => {
                        const actualWidth = linksElement.offsetWidth * 2;
                        const actualHeight = linksElement.offsetHeight * 2;

                        linksElement.width = actualWidth;
                        linksElement.height = actualHeight;

                        return { actualWidth, actualHeight };
                    },
                    renderers: []
                };

                (node[this.#configuration.childrenPropertyIdentifier] || [])
                .reduce((ratioOffset, child) => {
                    linkRenderers.renderers
                    .push((actualWidth, actualHeight) => {
                        const mVDim = [ actualWidth, actualHeight ];
                        const mDim = this.#configuration.horizontal
                        ? mVDim.reverse()
                        : mVDim;
                        const mVDir = [
                            [ mDim[0] / 2, 0],
                            [ mDim[0] / 2, mDim[1] * Math.min(1.0, Math.max(0.0, this.#configuration.linkSlopeStart)) ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] *  (1 - Math.min(1.0, Math.max(0.0, this.#configuration.linkSlopeEnd))) ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] ]
                        ];
                        const mDir = this.#configuration.horizontal
                        ? mVDir.map((row) => row.reverse())
                        : mVDir;

                        ctx.lineWidth = this.#configuration.linkStrength;
                        ctx.strokeStyle = this.#configuration.linkColor;
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
            .appendChild(createWrapperElement(calcSpaceRatio(this.#dataObj)));

            this.#render();
        }
    }
    
    customElements.define("tree-element", TreeElement);

    window.HTMLTreeElement = TreeElement;

})();