<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  export let position = { x: 0, y: 0 };
  export let initialText = '';
  export let placeholder = '输入文本';
  export let title = '';

  const dispatch = createEventDispatcher<{
    submit: { text: string };
    cancel: void;
  }>();

  let text = initialText;
  let inputElement: HTMLInputElement;

  // 当组件挂载后，自动聚焦到输入框
  function handleMount() {
    setTimeout(() => {
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 50);
  }

  function handleSubmit() {
    if (text.trim()) {
      dispatch('submit', { text });
    } else {
      dispatch('cancel');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    } else if (event.key === 'Escape') {
      dispatch('cancel');
    }
  }
</script>

<div 
  class="text-input-dialog"
  style="left: {position.x}px; top: {position.y}px;"
  transition:fade={{ duration: 150 }}
  use:handleMount
>
  <form on:submit|preventDefault={handleSubmit}>
    {#if title}
      <h3 class="dialog-title">{title}</h3>
    {/if}
    <input 
      bind:this={inputElement}
      bind:value={text}
      on:keydown={handleKeydown}
      placeholder={placeholder}
      type="text"
    />
    <div class="actions">
      <button type="button" on:click={() => dispatch('cancel')}>取消</button>
      <button type="submit">确定</button>
    </div>
  </form>
</div>

<style>
  .text-input-dialog {
    position: absolute;
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    padding: 12px;
    z-index: 1000;
    min-width: 200px;
  }

  form {
    display: flex;
    flex-direction: column;
  }

  .dialog-title {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  button[type="button"] {
    background-color: #f0f0f0;
    color: #333;
  }

  button[type="button"]:hover {
    background-color: #e0e0e0;
  }

  button[type="submit"] {
    background-color: #4CAF50;
    color: white;
  }

  button[type="submit"]:hover {
    background-color: #45a049;
  }
</style>
