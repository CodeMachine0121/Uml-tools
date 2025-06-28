<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { UmlDiagram } from '../../domain/entities/UmlDiagram';
  import { UmlElementType, type UmlElement, type UmlNode, type UmlArrow, type UmlText, type Position } from '../../domain/entities/UmlElement';
  
  export let diagram: UmlDiagram | undefined = undefined;
  export let selectedTool: UmlElementType | null = null;
  
  let canvas: HTMLDivElement;
  let isDrawing = false;
  let startPosition: Position | null = null;
  let selectedElement: UmlElement | null = null;
  let dragOffset = { x: 0, y: 0 };
  let connectionSource: UmlElement | null = null;
  
  const dispatch = createEventDispatcher<{
    elementAdd: { type: UmlElementType, position: Position, size?: { width: number, height: number } };
    textAdd: { position: Position, text: string };
    elementConnect: { sourceId: string, targetId: string, type: UmlElementType };
    elementUpdate: { elementId: string, updates: Partial<UmlElement> };
    elementRemove: { elementId: string };
  }>();
  
  function handleMouseDown(event: MouseEvent) {
    if (!diagram) return;
    
    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Check if clicking on an existing element
    const element = findElementAtPosition(position);
    
    if (element) {
      // Select element for dragging or connecting
      selectedElement = element;
      dragOffset = {
        x: position.x - element.position.x,
        y: position.y - element.position.y
      };
      
      // If an arrow tool is selected, start connection
      if (selectedTool && isArrowType(selectedTool)) {
        connectionSource = element;
      }
    } else if (selectedTool) {
      // Start drawing a new element
      isDrawing = true;
      startPosition = position;
      
      // If it's a text element, prompt for text input
      if (selectedTool === UmlElementType.TEXT) {
        isDrawing = false;
        const text = prompt('Enter text:');
        if (text) {
          dispatch('textAdd', { position, text });
        }
      }
    }
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!diagram) return;
    
    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Dragging an element
    if (selectedElement && !connectionSource) {
      dispatch('elementUpdate', {
        elementId: selectedElement.id,
        updates: {
          position: {
            x: position.x - dragOffset.x,
            y: position.y - dragOffset.y
          }
        }
      });
    }
    
    // Drawing a new element
    if (isDrawing && startPosition && selectedTool && !isArrowType(selectedTool)) {
      // We're just showing a preview here, actual element will be added on mouseup
    }
  }
  
  function handleMouseUp(event: MouseEvent) {
    if (!diagram) return;
    
    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Finish drawing a new element
    if (isDrawing && startPosition && selectedTool && !isArrowType(selectedTool)) {
      const size = {
        width: Math.abs(position.x - startPosition.x),
        height: Math.abs(position.y - startPosition.y)
      };
      
      // Ensure minimum size
      if (size.width < 10) size.width = 100;
      if (size.height < 10) size.height = 50;
      
      dispatch('elementAdd', {
        type: selectedTool,
        position: {
          x: Math.min(position.x, startPosition.x),
          y: Math.min(position.y, startPosition.y)
        },
        size
      });
    }
    
    // Finish connecting elements
    if (connectionSource && selectedTool && isArrowType(selectedTool)) {
      const targetElement = findElementAtPosition(position);
      if (targetElement && targetElement !== connectionSource) {
        dispatch('elementConnect', {
          sourceId: connectionSource.id,
          targetId: targetElement.id,
          type: selectedTool
        });
      }
    }
    
    // Reset state
    isDrawing = false;
    startPosition = null;
    selectedElement = null;
    connectionSource = null;
  }
  
  function handleDoubleClick(event: MouseEvent) {
    if (!diagram) return;
    
    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Check if double-clicking on an existing element
    const element = findElementAtPosition(position);
    
    if (element) {
      // Edit text of existing element
      const newText = prompt('Edit text:', element.text || '');
      if (newText !== null) {
        dispatch('elementUpdate', {
          elementId: element.id,
          updates: { text: newText }
        });
      }
    } else {
      // Add new text element
      const text = prompt('Enter text:');
      if (text) {
        dispatch('textAdd', { position, text });
      }
    }
  }
  
  function findElementAtPosition(position: Position): UmlElement | null {
    if (!diagram) return null;
    
    // Check in reverse order to select the top-most element
    for (let i = diagram.elements.length - 1; i >= 0; i--) {
      const element = diagram.elements[i];
      
      if (isNodeElement(element)) {
        if (
          position.x >= element.position.x &&
          position.x <= element.position.x + element.size.width &&
          position.y >= element.position.y &&
          position.y <= element.position.y + element.size.height
        ) {
          return element;
        }
      } else if (element.type === UmlElementType.TEXT) {
        // Simplified hit testing for text elements
        const textSize = 20; // Approximate size
        if (
          position.x >= element.position.x &&
          position.x <= element.position.x + textSize &&
          position.y >= element.position.y &&
          position.y <= element.position.y + textSize
        ) {
          return element;
        }
      }
    }
    
    return null;
  }
  
  function isNodeElement(element: UmlElement): element is UmlNode {
    return element.type === UmlElementType.CLASS || element.type === UmlElementType.INTERFACE;
  }
  
  function isArrowType(type: UmlElementType): boolean {
    return [
      UmlElementType.DEPENDENCY_ARROW,
      UmlElementType.IMPLEMENTATION_ARROW,
      UmlElementType.INHERITANCE_ARROW,
      UmlElementType.ASSOCIATION_ARROW
    ].includes(type);
  }
  
  function isArrowElement(element: UmlElement): element is UmlArrow {
    return isArrowType(element.type);
  }
  
  function isTextElement(element: UmlElement): element is UmlText {
    return element.type === UmlElementType.TEXT;
  }
  
  function getArrowPath(arrow: UmlArrow): string {
    if (!diagram) return '';
    
    const source = diagram.elements.find(e => e.id === arrow.source);
    const target = diagram.elements.find(e => e.id === arrow.target);
    
    if (!source || !target) return '';
    
    // Simple straight line for now
    let sourceX, sourceY, targetX, targetY;
    
    if (isNodeElement(source)) {
      sourceX = source.position.x + source.size.width / 2;
      sourceY = source.position.y + source.size.height / 2;
    } else {
      sourceX = source.position.x;
      sourceY = source.position.y;
    }
    
    if (isNodeElement(target)) {
      targetX = target.position.x + target.size.width / 2;
      targetY = target.position.y + target.size.height / 2;
    } else {
      targetX = target.position.x;
      targetY = target.position.y;
    }
    
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
  
  function getArrowMarker(type: UmlElementType): string {
    switch (type) {
      case UmlElementType.INHERITANCE_ARROW:
        return 'url(#inheritance-marker)';
      case UmlElementType.IMPLEMENTATION_ARROW:
        return 'url(#implementation-marker)';
      case UmlElementType.DEPENDENCY_ARROW:
        return 'url(#dependency-marker)';
      case UmlElementType.ASSOCIATION_ARROW:
        return 'url(#association-marker)';
      default:
        return '';
    }
  }
  
  function getArrowStyle(type: UmlElementType): string {
    switch (type) {
      case UmlElementType.DEPENDENCY_ARROW:
      case UmlElementType.IMPLEMENTATION_ARROW:
        return 'stroke-dasharray: 4';
      default:
        return '';
    }
  }
</script>

<div 
  class="canvas"
  bind:this={canvas}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:dblclick={handleDoubleClick}
>
  <svg width="100%" height="100%">
    <!-- Arrow markers -->
    <defs>
      <marker
        id="inheritance-marker"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="black" />
      </marker>
      
      <marker
        id="implementation-marker"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="black" />
      </marker>
      
      <marker
        id="dependency-marker"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="black" />
      </marker>
      
      <marker
        id="association-marker"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 5 L 10 5" stroke="black" />
      </marker>
    </defs>
    
    <!-- Arrows -->
    {#if diagram}
      {#each diagram.elements.filter(isArrowElement) as arrow}
        <path
          d={getArrowPath(arrow)}
          stroke="black"
          stroke-width="1.5"
          fill="none"
          marker-end={getArrowMarker(arrow.type)}
          style={getArrowStyle(arrow.type)}
        />
      {/each}
    {/if}
  </svg>
  
  <!-- UML Elements -->
  {#if diagram}
    {#each diagram.elements as element}
      {#if isNodeElement(element)}
        <div
          class="uml-node"
          class:uml-class={element.type === UmlElementType.CLASS}
          class:uml-interface={element.type === UmlElementType.INTERFACE}
          style="
            left: {element.position.x}px;
            top: {element.position.y}px;
            width: {element.size.width}px;
            height: {element.size.height}px;
          "
        >
          <div class="node-header">
            {#if element.type === UmlElementType.INTERFACE}
              <span class="stereotype">&lt;&lt;interface&gt;&gt;</span>
            {/if}
            <div class="node-name">{element.text || 'Unnamed'}</div>
          </div>
          <div class="node-attributes">
            <!-- Attributes would go here -->
          </div>
          <div class="node-methods">
            <!-- Methods would go here -->
          </div>
        </div>
      {:else if isTextElement(element)}
        <div
          class="uml-text"
          style="
            left: {element.position.x}px;
            top: {element.position.y}px;
          "
        >
          {element.text}
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: white;
    background-image: 
      linear-gradient(rgba(200, 200, 200, 0.2) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200, 200, 200, 0.2) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  
  svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  
  .uml-node {
    position: absolute;
    background-color: white;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .uml-class {
    background-color: #e3f2fd;
  }
  
  .uml-interface {
    background-color: #f3e5f5;
  }
  
  .node-header {
    padding: 8px;
    border-bottom: 1px solid #ddd;
    text-align: center;
    font-weight: bold;
  }
  
  .stereotype {
    display: block;
    font-size: 0.8em;
    font-style: italic;
    color: #666;
  }
  
  .node-attributes, .node-methods {
    padding: 8px;
    border-bottom: 1px solid #ddd;
    min-height: 20px;
  }
  
  .node-methods {
    border-bottom: none;
  }
  
  .uml-text {
    position: absolute;
    padding: 4px;
    background-color: transparent;
    font-family: sans-serif;
    cursor: move;
  }
</style>