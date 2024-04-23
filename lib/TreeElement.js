"use strict";


(() => {
    
    class TreeElement extends HTMLElement {
        static #defaultConfiguration = {
            childrenPropertyIdentifier: "children",
            horizontal: false,
            linkCap: "round",
            linkColor: "#000000",
            linkLength: "5rem",
            linkMargin: 0,
            linkSlopeEnd: 1.0,
            linkSlopeStart: 1.0,
            linkStrength: 1,
            nodeMargin: "1rem"
        };
        
        static observedAttributes = [
            "data", "configuration", "template", "nodecallback", "transform"
        ];

        static #defaultNodeCallback(node, el) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            while(walker.nextNode()) {
                walker.currentNode.textContent = walker.currentNode.textContent
                .replace(/\{\{ *([\w_][\w\d_]*) *\}\}/g, (_, property) => {
                    return (node[property] || "").toString();
                });
            }
            Array.from(el.querySelectorAll("*"))
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
        #transformEnabled = false;
        #zoom = 1;
        #position = { x: 0, y: 0 };
        #shadowRoot;
        #transformChild;
        #styleSheet;
        
        constructor() {
            super();

            this.#shadowRoot = this.attachShadow({
                mode: "open"
            });

            this.#styleSheet = new CSSStyleSheet();
            this.#styleSheet.replaceSync(`
                :host {
                    display: block;
                    width: fit-content;
                    height: fit-content;
                }
            `.trim());
            this.#shadowRoot.adoptedStyleSheets = [ this.#styleSheet ];
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
                    this.configure(window[newValue]);
                    break;
                case "template":
                    this.template(newValue);
                    break;
                case "nodecallback":
                    this.nodeCallback(window[newValue]);
                    break;
                case "transform":
                    this.transform(window[newValue]);
                    break;
            }
        }

        #render() {
            this.#transformChild.style
            .transform = `scale(${this.#zoom}) translateX(${this.#position.x}px) translateY(${this.#position.y}px)`;

            this.#linkRenderers
            .forEach((linkRenderer) => {
                const { actualWidth, actualHeight } = linkRenderer.begin();
                linkRenderer.renderers
                .forEach((renderer) => renderer(actualWidth, actualHeight));
                linkRenderer.close();
            });
        }

        configure(overrideConfiguration = {}) {
            if(!Object.keys(overrideConfiguration).length) throw new TypeError("Not a keyed object");

            this.#configuration = {
                ...this.#configuration,
                ...overrideConfiguration
            };

            this.#styleSheet.insertRule(`
                .w {
                    display: flex;
                    flex-direction: ${this.#configuration.horizontal ? "row" : "column"};
                    ${this.#configuration.horizontal ? "width" : "height"}: fit-content;
                }
            `.trim());
            this.#styleSheet.insertRule(`
                .n {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: ${(v => !this.#configuration.horizontal ? v.reverse() : v)([
                        this.#configuration.nodeMargin.toString().replace(/\d*(\.\d+)?|\d+/, (d) => (parseFloat(d) / 2).toString()),
                        "0"
                    ]).join(" ")};
                }
            `.trim());
            this.#styleSheet.insertRule(`
                .l {
                    margin: ${(v => this.#configuration.horizontal ? v.reverse() : v)([ this.#configuration.linkMargin, "0" ]).join(" ")};
                    ${this.#configuration.horizontal ? "width" : "height"}: ${this.#configuration.linkLength};
                }
            `.trim());
            this.#styleSheet.insertRule(`
                .c {
                    display: flex;
                    flex-direction: ${this.#configuration.horizontal ? "column" : "row"};
                }
            `.trim());
            
            return this;
        }

        template(templateElementOrSelector) {
            this.#template = !(templateElementOrSelector instanceof HTMLTemplateElement)
            ? document.querySelector(templateElementOrSelector)
            : templateElementOrSelector;

            if(!(this.#template instanceof HTMLTemplateElement)) throw new TypeError("Not a template element");

            return this;
        }

        nodeCallback(nodeCallback, chainToCurrent = false) {
            const currentNodeCallback = this.#nodeCallback;
            this.#nodeCallback = chainToCurrent
            ? (...args) => {
                currentNodeCallback(...args);
                nodeCallback(...args);
            }
            : nodeCallback;

            if(!(this.#nodeCallback instanceof Function)) throw new TypeError("Not a function");

            return this;
        }

        transform(options = {}) {
            const transformOptions = {
                minZoom: 0.5,
                maxZoom: 3.0,
                panning: true,
                safetyMargin: 50,
                zoomSpeed: 1.0,

                ...options
            };
            
            if(this.#transformEnabled) return;
            this.#transformEnabled = true;

            this.#styleSheet.insertRule(`
                :host {
                    max-width: 100%;
                    max-height: 100%;
                    overflow: hidden;
                }
            `.trim());
            this.#styleSheet.insertRule(`
                :host > *:first-child {
                    transform-origin: 0 0 0;
                }
            `.trim());
            this.#styleSheet.insertRule(`
                *:first-child {
                    user-select: none;
                }
            `.trim());

            const constrainPosition = () => {
                const safetyMargin = transformOptions.safetyMargin;
                this.#position.x = Math.max(
                    -this.#transformChild.offsetWidth + this.#zoom,
                    Math.min(
                        (this.#shadowRoot.host.clientWidth - safetyMargin) / this.#zoom,
                        this.#position.x
                    )
                );
                this.#position.y = Math.max(
                    -this.#transformChild.offsetHeight + this.#zoom,
                    Math.min(
                        (this.#shadowRoot.host.clientHeight - safetyMargin) / this.#zoom,
                        this.#position.y
                    )
                );

                this.#render();
            };

            const mousePosition = { x: 0, y: 0 };
            const treePosition = { x: 0, y: 0 };
            const disableSideEffects = () => {
                window.addEventListener("selectstart", (e) => e.preventDefault());

                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                
                window.onscroll = (e) => {
                    e.preventDefault();
                    
                    window.scrollTo(scrollLeft, scrollTop);
                };
            };
            const enableSideEffects = () => {
                window.removeEventListener("selectstart", (e) => e.preventDefault());

                window.onscroll = () => {};
            };
            const moveCallback = (e) => {
                const newTreePosition = {
                    x: treePosition.x + (e.clientX - mousePosition.x) / this.#zoom,
                    y: treePosition.y + (e.clientY - mousePosition.y) / this.#zoom
                };
                
                this.#position.x = newTreePosition.x;
                this.#position.y = newTreePosition.y;
                
                constrainPosition();
            };
            const upCallback = () => {
                enableSideEffects();

                document.removeEventListener("mousemove", moveCallback);
                document.removeEventListener("mouseup", upCallback);

                this.#styleSheet.deleteRule(`
                    * {
                        user-select: none;
                    }
                `.trim());
            };
            this.#shadowRoot.host
            .addEventListener("mousedown", (e) => {
                if(e.buttons !== 1) return;

                mousePosition.x = e.clientX;
                mousePosition.y = e.clientY;
                treePosition.x = this.#position.x;
                treePosition.y = this.#position.y;

                this.#styleSheet.insertRule(`
                    * {
                        user-select: none;
                        pointer-events: none;
                    }
                `.trim());
                
                disableSideEffects();

                document.addEventListener("mousemove", moveCallback);
                document.addEventListener("mouseup", upCallback);
            });

            this.#shadowRoot.host
            .addEventListener("wheel", (e) => {
                e.preventDefault();

                this.#zoom -= (Math.max(1, this.#zoom) / transformOptions.maxZoom) * e.deltaY * (1 / 1000) * transformOptions.zoomSpeed;
                this.#zoom = Math.max(
                    transformOptions.minZoom,
                    Math.min(
                        transformOptions.maxZoom,
                        this.#zoom
                    )
                );
                
                constrainPosition();
            });

            return this;
        }

        render(dataObj) {
            if(!dataObj) throw new ReferenceError("Data argument is undefined");
            if(!dataObj[this.#configuration.childrenPropertyIdentifier]) throw new SyntaxError("Data argument does not represent a valid tree root");

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
                wrapperElement.style[this.#configuration.horizontal ? "height" : "width"] = `${node.ratio * 100}%`;
                wrapperElement.classList.add("w");
                
                const isLeafNode = !(node[this.#configuration.childrenPropertyIdentifier] || []).length;
                
                const nodeElement = document.createElement("DIV");
                nodeElement.classList.add("n");
                const nodeInnerElement = document.createElement("DIV");
                const nodeInnerShadowRoot = nodeInnerElement.attachShadow({ mode: "open" });
                nodeInnerShadowRoot.appendChild(this.#template.content.cloneNode(true));
                const callbackNodeArg = Object.assign({}, node);
                delete callbackNodeArg.ratio;
                delete callbackNodeArg[this.#configuration.childrenPropertyIdentifier];
                this.#nodeCallback(callbackNodeArg, nodeInnerShadowRoot, isLeafNode);
                nodeElement.appendChild(nodeInnerElement);
                wrapperElement.appendChild(nodeElement);

                if(isLeafNode) return wrapperElement;

                const linksElement = document.createElement("CANVAS");
                linksElement.classList.add("l");
                wrapperElement.appendChild(linksElement);
                const ctx = linksElement.getContext("2d");
                
                const childrenElement = document.createElement("DIV");
                childrenElement.classList.add("c");
                wrapperElement.appendChild(childrenElement);

                let originalWidth, originalHeight;
                const getOriginalSize = () => {
                    originalWidth = linksElement.offsetWidth;
                    originalHeight = linksElement.offsetHeight;
                };
                window.addEventListener("resize", getOriginalSize);

                const linkRenderers = {
                    begin: () => {
                        !originalWidth && getOriginalSize();

                        const actualWidth = originalWidth * window.devicePixelRatio * this.#zoom;
                        const actualHeight = originalHeight * window.devicePixelRatio * this.#zoom;

                        linksElement.width = actualWidth;
                        linksElement.height = actualHeight;

                        ctx.beginPath();

                        return { actualWidth, actualHeight };
                    },
                    close: () => {
                        ctx.closePath();
                    },
                    renderers: []
                };
                (node[this.#configuration.childrenPropertyIdentifier] || [])
                .reduce((ratioOffset, child) => {
                    linkRenderers.renderers
                    .push((actualWidth, actualHeight) => {
                        const lineStrength = this.#configuration.linkStrength * window.devicePixelRatio * this.#zoom;
                        const safetyOffset = lineStrength;
                        const mVDim = [ actualWidth, actualHeight ];
                        const mDim = this.#configuration.horizontal
                        ? mVDim.reverse()
                        : mVDim;
                        const mVDir = [
                            [ mDim[0] / 2, 0 + safetyOffset],
                            [ mDim[0] / 2, mDim[1] * Math.min(1.0, Math.max(0.0, this.#configuration.linkSlopeStart)) + safetyOffset ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] *  (1 - Math.min(1.0, Math.max(0.0, this.#configuration.linkSlopeEnd))) - safetyOffset ],
                            [ (ratioOffset * mDim[0]) + (child.ratio * mDim[0]) / 2, mDim[1] - safetyOffset ]
                        ];
                        const mDir = this.#configuration.horizontal
                        ? mVDir.map((row) => row.reverse())
                        : mVDir;

                        ctx.lineWidth = lineStrength;
                        ctx.lineCap = this.#configuration.linkCap;
                        ctx.strokeStyle = this.#configuration.linkColor;
                        ctx.moveTo(mDir[0][0], mDir[0][1]);
                        ctx.bezierCurveTo(mDir[1][0], mDir[1][1], mDir[2][0], mDir[2][1], mDir[3][0], mDir[3][1]);
                        ctx.stroke();
                    });

                    childrenElement.appendChild(createWrapperElement(child));

                    return ratioOffset + child.ratio;
                }, 0);

                this.#linkRenderers.push(linkRenderers);

                return wrapperElement;
            };
            
            this.#transformChild = createWrapperElement(calcSpaceRatio(dataObj));
            this.#shadowRoot.appendChild(this.#transformChild);

            this.#render();
        }
    }
    
    customElements.define("tree-element", TreeElement);

    window.HTMLTreeElement = TreeElement;

})();