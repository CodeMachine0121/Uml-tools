<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { UmlElementType } from '../../domain/entities/UmlElement';
  
  const dispatch = createEventDispatcher<{
    // Send a custom event named select when a tool is selected
    select: UmlElementType;
  }>();
  
  let selectedTool: UmlElementType | null = null;
  
  const tools = [
    { type: UmlElementType.CLASS, label: 'Class', icon: '□' },
    { type: UmlElementType.INTERFACE, label: 'Interface', icon: '◇' },
    { type: UmlElementType.DEPENDENCY_ARROW, label: 'Dependency', icon: '→' },
    { type: UmlElementType.IMPLEMENTATION_ARROW, label: 'Implementation', icon: '⇢' },
    { type: UmlElementType.INHERITANCE_ARROW, label: 'Inheritance', icon: '↗' },
    { type: UmlElementType.ASSOCIATION_ARROW, label: 'Association', icon: '↔' },
    { type: UmlElementType.TEXT, label: 'Text', icon: 'T' }
  ];
  
  function selectTool(type: UmlElementType) {
    selectedTool = type;
    dispatch('select', type);
  }
</script>

<div class="toolbox">
  <h2>Toolbox</h2>
  <div class="tools">
    {#each tools as tool}
      <button 
        class="tool-button" 
        class:selected={selectedTool === tool.type}
        on:click={() => selectTool(tool.type)}
        title={tool.label}
      >
        <span class="icon">{tool.icon}</span>
        <span class="label">{tool.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .toolbox {
    width: 200px;
    background-color: #f0f0f0;
    border-right: 1px solid #ddd;
    padding: 10px;
    display: flex;
    flex-direction: column;
  }
  
  h2 {
    margin-top: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
    font-size: 1.2rem;
  }
  
  .tools {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .tool-button {
    display: flex;
    align-items: center;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .tool-button:hover {
    background-color: #e9e9e9;
  }
  
  .tool-button.selected {
    background-color: #e0f7fa;
    border-color: #80deea;
  }
  
  .icon {
    font-size: 1.5rem;
    width: 30px;
    text-align: center;
  }
  
  .label {
    margin-left: 8px;
  }
</style>