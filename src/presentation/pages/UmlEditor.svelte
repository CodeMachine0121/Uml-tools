<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbox from '../components/Toolbox.svelte';
  import Canvas from '../components/Canvas.svelte';
  import MermaidPanel from '../components/MermaidPanel.svelte';
  import { DiagramService } from '../../application/services/DiagramService';
  import { InMemoryDiagramRepository } from '../../infrastructure/repositories/DiagramRepository';
  import { UmlElementType } from '../../domain/entities/UmlElement';
  import type { UmlDiagram } from '../../domain/entities/UmlDiagram';
  import type { UmlElement } from '../../domain/entities/UmlElement';

  // Initialize services
  const repository = new InMemoryDiagramRepository();
  const diagramService = new DiagramService(repository);
  
  let currentDiagram: UmlDiagram;
  let selectedTool: UmlElementType | null = null;
  let showMermaidPanel = false;
  let mermaidCode = '';

  onMount(async () => {
    // Create a new diagram on mount
    currentDiagram = await diagramService.createDiagram('New Diagram');
  });

  function handleToolSelect(event: CustomEvent<UmlElementType>) {
    selectedTool = event.detail;
  }

  async function handleElementAdd(event: CustomEvent<{ type: UmlElementType, position: { x: number, y: number }, size?: { width: number, height: number } }>) {
    if (!currentDiagram) return;
    
    const { type, position, size } = event.detail;
    await diagramService.addElement(currentDiagram.id, type, position, size);
    
    // Refresh the diagram
    currentDiagram = await diagramService.repository.findById(currentDiagram.id) as UmlDiagram;
  }

  async function handleTextAdd(event: CustomEvent<{ position: { x: number, y: number }, text: string }>) {
    if (!currentDiagram) return;
    
    const { position, text } = event.detail;
    await diagramService.addTextElement(currentDiagram.id, position, text);
    
    // Refresh the diagram
    currentDiagram = await diagramService.repository.findById(currentDiagram.id) as UmlDiagram;
  }

  async function handleElementConnect(event: CustomEvent<{ sourceId: string, targetId: string, type: UmlElementType }>) {
    if (!currentDiagram) return;
    
    const { sourceId, targetId, type } = event.detail;
    await diagramService.connectElements(currentDiagram.id, sourceId, targetId, type);
    
    // Refresh the diagram
    currentDiagram = await diagramService.repository.findById(currentDiagram.id) as UmlDiagram;
  }

  async function handleElementUpdate(event: CustomEvent<{ elementId: string, updates: Partial<UmlElement> }>) {
    if (!currentDiagram) return;
    
    const { elementId, updates } = event.detail;
    await diagramService.updateElement(currentDiagram.id, elementId, updates);
    
    // Refresh the diagram
    currentDiagram = await diagramService.repository.findById(currentDiagram.id) as UmlDiagram;
  }

  async function handleElementRemove(event: CustomEvent<{ elementId: string }>) {
    if (!currentDiagram) return;
    
    const { elementId } = event.detail;
    await diagramService.removeElement(currentDiagram.id, elementId);
    
    // Refresh the diagram
    currentDiagram = await diagramService.repository.findById(currentDiagram.id) as UmlDiagram;
  }

  async function exportToMermaid() {
    if (!currentDiagram) return;
    
    const result = await diagramService.exportToMermaid(currentDiagram.id);
    mermaidCode = result.code;
    showMermaidPanel = true;
  }

  async function importFromMermaid(event: CustomEvent<{ code: string }>) {
    const { code } = event.detail;
    currentDiagram = await diagramService.importFromMermaid(code);
    showMermaidPanel = false;
  }
</script>

<div class="editor-container">
  <Toolbox on:select={handleToolSelect} />
  
  <div class="main-content">
    <div class="canvas-container">
      <Canvas 
        diagram={currentDiagram} 
        selectedTool={selectedTool}
        on:elementAdd={handleElementAdd}
        on:textAdd={handleTextAdd}
        on:elementConnect={handleElementConnect}
        on:elementUpdate={handleElementUpdate}
        on:elementRemove={handleElementRemove}
      />
    </div>
    
    <div class="actions">
      <button on:click={exportToMermaid}>Export to Mermaid</button>
    </div>
    
    {#if showMermaidPanel}
      <MermaidPanel 
        code={mermaidCode} 
        on:import={importFromMermaid}
        on:close={() => showMermaidPanel = false}
      />
    {/if}
  </div>
</div>

<style>
  .editor-container {
    display: flex;
    width: 100%;
    height: 100%;
  }
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .canvas-container {
    flex: 1;
    background-color: #f5f5f5;
    overflow: auto;
  }
  
  .actions {
    padding: 10px;
    background-color: #f0f0f0;
    border-top: 1px solid #ddd;
  }
  
  button {
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #45a049;
  }
</style>