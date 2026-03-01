// @ts-expect-error svelte component import
import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    name: 'Svelte Application',
  },
});

export default app;
