
# HTML Tree Element 

A DOM-based rendering solution for displaying tree structures.  
  
Most tree rendering solutions use SVG or canvas draw entirely. Working with tree nodes based on pure HTML, i.e. resolving to DOM-bound elements provides favourable properties.

## Integration

### Via CDN

``` html
<script src="https://raw.githubusercontent.com/t-ski/html-tree/main/lib/TreeElement.js"></script>
```

### Via NPM

``` cli
npm i t-ski/html-tree
```

## Usage

...

``` html
<template id="my-tree-node">
	{{ name }} <small>({{ age }} y.o.)</small>
	<button type="button" onclick"sayHello()">Say Hello</button>
</template>
<tree-element id="my-tree" />
<script>
	document.querySelector("#my-tree)
	.template("#my-tree-node")
	.render({
		data: {
			name: "Claire",
			age: 48
		},
		methods: {
			sayHello: () => alert("Hello, my name is Claire!")
		},
		children: [
			{
				data: {
					name: "Haley",
					age: 25
				},
				methods: {
					sayHello: () => alert("Hey, I'm Haley!")
				}
			},
			{
				data: {
					name: "Alex",
					age: 22
				},
				methods: {
					sayHello: () => alert("Hello, I am Alex!")
				}
			},
			{
				data: {
					name: "Luke",
					age: 20
				},
				methods: {
					sayHello: () => alert("Hi, I'm Luke!")
				}
			}
		]
	});
</script>
```

## Configuration

### Defaults

### Node Callback

## Default

## Vue Example

... solved via sub/shadow apps living on the shadow DOM.
Write all necessary props/methods to node sub objects ...

``` js
document.querySelector("#my-tree")
.nodeCallback((node, el) => {
	new Vue({
		el,
		data: node.data,
		methods: node.methods
	});
})
.render(treeObj);
```

## Attribute Interface

...

## 

<sub>© Thassilo Martin Schiepanski</sub>