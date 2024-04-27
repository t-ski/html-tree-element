# HTML Tree Element 

Simple HTML tree element based on pure HTML node templates.

## Integration

### Via CDN

``` html
<script src="https://raw.githubusercontent.com/t-ski/html-tree/main/lib/TreeElement.js"></script>
```

### Via NPM

``` cli
npm i t-ski/html-tree
```

Existing tree rendering solutions usually rely on fine grained 2D drawing environments like SVG or canvas. The presented tree rendering solution provides a native HTML element interface in favour of simple integration. In fact, displaying a tree merely requires a template for the individual tree nodes, besides the hosting tree instance.

``` html
<script>
  const TREE_OBJECT = { // root
    genre: "Manga",
    children: [
      {
        genre: "Shonen"
      },
      {
        genre: "Shojo"
      },
      {
        genre: "Kodomomuke"
      }
    ]
  });
</script>

<!-- INDIVIDUAL TREE NODE TEMPLATE -->
<template id="tree-node-template">
  Genre: <em>{{ genre }}</em>
</template>

<!-- HOSTING TREE INSTANCE -->
<tree-element data="TREE_OBJECT" template="#tree-node-template" />
```

## API

Evidently, the tree element reflects data from an existing JavaScript object. The tree element provides a set of chainable methods for simple manipulation. Alternatively, window scope members can be bound via attibutes for an HTML-first approach.

> In general it holds that the attributes resemble the respective method names (see below):  
> ``` html
> <tree-element [method-identifier]="<window-identifier>" />
> ```

### Data Assignment

``` js
document.querySelector("tree-element")
.data(treeObject);  // TREE_OBJECT
```

``` html
<tree-element data="treeObject>" />
```

### Template Assignment

A node template can be assigned either through a CSS selector to apply, or directly given an element reference.

``` js
document.querySelector("tree-element")
.template(templateElementOrSelector);
```

``` html
<tree-element template="selector" />
```

> The attribute interface accepts only CSS selectors.

### Configuration

A minimal tree requires a node template and the actual tree data. However, several tree characteristics can be optionally adjusted given a configuration object.

``` js
document.querySelector("tree-element")
.configure(overrideConfiguration);
```

``` html
<tree-element configure="overrideConfiguration" />
```

| Configuration | Description | Default |
| :- | :- | -: |
| `childrenPropertyIdentifier` | Name of the child nodes property to traverse | `"children"` |
| `horizontal` | Whether to expand the tree horizontally | `false` |
| `linkCap` | Link cap (see [HTML Canvas Line Cap](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap?retiredLocale=de)) | `"round"` |
| `linkColor` | Link color | `"#000000"` |
| `linkMargin` | Link margin to nodes | `0` |
| `linkSlopeEnd` | Link slope at the inbound node (cubic bezier) | `1.0` |
| `linkSlopeStart` | Link slope at the outbound node (cubic bezier) | `1.0` |
| `linkStrength` | Link strength (in px) | `1` |
| `nodeMargin` | Margin between sibling nodes  | `"1rem"` |

### Node Manipulation Callback

To bind a dynamic rendering or interaction behaviour to each node, a node-wise callback function can be applied. In order to assign multiple node manipulation callbacks successively, the second argument can be set to `true`.

``` js
document.querySelector("tree-element")
.nodeCallback(nodeCallback, chainToCurrent = false);
```

``` html
<tree-element nodecallback="callbackFunction" />
```

The callback function accepts the following arguments in the given order:

| Argument | Description |
| :- | :- |
| `nodeData` | Actual data of the current node as given on the input |
| `nodeShadowRoot` | Shadow DOM root reference of the current node |
| `isLeafNode` | Whether the current node is a leaf node |

By default, Mustache-style templates in text nodes are substituted by node data properties (e.g. `{{ name }}`). Also, methods are bound to event attributes (e.g. `onclick="sayName()"`).

### Transformability

Since the tree solution is strongly HTML-based, the default rendering behaviour is in line with the HTML flex concept. However, transformability of the tree – i.e. movability and zoomability – can be optionally enabled. A transform tree maintains a scoped viewport within the tree structure is rendered.

``` js
document.querySelector("tree-element")
.transform(overrideOptions);
```

``` html
<tree-element nodecallback="callbackFunction" />
```

| Option | Description | Default |
| :- | :- | -: |
| `minZoom` | Minimum zoom factor | `0.5` |
| `maxZoom` | Maximum zoom factor | `3.0` |
| `safetyMargin` | Minimum visible space of tree bounding box within the viewport (in px) | `50` |
| `zoomSpeed` | Zoom speed factor | `1.0` |

## 

<sub>© Thassilo Martin Schiepanski</sub>