<script lang="ts">
  import UmlEditor from './pages/UmlEditor.svelte';
</script>

<main>
  <UmlEditor />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
</style>