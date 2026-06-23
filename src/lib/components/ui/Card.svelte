<script lang="ts">
  export let className = "";
</script>

<div class={`glass-card p-5 ${className}`} {...$$restProps}>
  <slot />
</div>
