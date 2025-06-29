<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let code: string = '';
  
  let isImporting = false;
  let importCode = '';
  
  const dispatch = createEventDispatcher<{
    import: { code: string };
    close: void;
  }>();
  
  function copyToClipboard() {
    navigator.clipboard.writeText(code)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  }
  
  function toggleImport() {
    isImporting = !isImporting;
    if (isImporting) {
      importCode = '';
    }
  }
  
  function handleImport() {
    if (!importCode.trim()) {
      alert('Please enter C# code to import');
      return;
    }
    
    dispatch('import', { code: importCode });
  }
  
  function handleClose() {
    dispatch('close');
  }
</script>

<div class="csharp-panel">
  <div class="header">
    <h2>{isImporting ? 'Import from C#' : 'Export to C#'}</h2>
    <button class="close-button" on:click={handleClose}>×</button>
  </div>
  
  {#if isImporting}
    <div class="import-container">
      <textarea 
        bind:value={importCode} 
        placeholder="Paste C# code here..."
        rows="10"
      ></textarea>
      <div class="actions">
        <button on:click={handleImport}>Import</button>
        <button on:click={toggleImport}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="export-container">
      <div class="code-container">
        <h3>C# Code</h3>
        <pre>{code}</pre>
        <button on:click={copyToClipboard}>Copy to Clipboard</button>
      </div>
      
      <div class="actions">
        <button on:click={toggleImport}>Switch to Import</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .csharp-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 1000px;
    height: 80%;
    max-height: 800px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
  }
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  
  .close-button:hover {
    background-color: #e0e0e0;
  }
  
  .export-container, .import-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    overflow: auto;
  }
  
  .code-container {
    margin-bottom: 16px;
  }
  
  pre {
    background-color: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    overflow: auto;
    max-height: 200px;
    font-family: monospace;
    white-space: pre-wrap;
  }
  
  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    resize: vertical;
    margin-bottom: 16px;
  }
  
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
  
  h3 {
    margin-top: 0;
    margin-bottom: 8px;
  }
</style>