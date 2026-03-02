import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { loadCrovlyScript, getCrovlyGlobal } from "./script-loader";
import type {
  CrovlyErrorCode,
  CrovlyWidgetInstance,
  UseCrovlyOptions,
  UseCrovlyReturn,
} from "./types";

/**
 * Vue 3 composable for programmatic Crovly captcha control.
 *
 * Returns reactive refs (`token`, `error`, `isLoading`), a `reset` function,
 * and a `containerRef` to bind to a DOM element.
 *
 * @example
 * ```vue
 * <template>
 *   <form @submit.prevent="handleSubmit">
 *     <div ref="containerRef" />
 *     <p v-if="error" class="text-red-500">Error: {{ error.message }}</p>
 *     <button type="submit" :disabled="isLoading || !token">
 *       {{ isLoading ? 'Verifying...' : 'Submit' }}
 *     </button>
 *     <button type="button" @click="reset">Reset</button>
 *   </form>
 * </template>
 *
 * <script setup lang="ts">
 * import { useCrovly } from '@crovly/vue';
 *
 * const { token, error, isLoading, reset, containerRef } = useCrovly({
 *   siteKey: 'crvl_site_xxx',
 *   theme: 'dark',
 * });
 *
 * function handleSubmit() {
 *   // token.value contains the verification token
 * }
 * </script>
 * ```
 */
export function useCrovly(options: UseCrovlyOptions): UseCrovlyReturn {
  const token = ref<string | null>(null);
  const error = ref<{ code: CrovlyErrorCode; message: string } | null>(null);
  const isLoading = ref(true);
  const containerRef = ref<HTMLElement | null>(null);

  let widgetInstance: CrovlyWidgetInstance | null = null;
  let destroyed = false;

  const {
    siteKey,
    theme = "auto",
    size = "normal",
    lang,
    badge = true,
    responseFieldName = "crovly-token",
  } = options;

  async function initWidget() {
    const container = containerRef.value;
    if (!container || destroyed) return;

    token.value = null;
    error.value = null;
    isLoading.value = true;

    try {
      await loadCrovlyScript();
    } catch (err) {
      error.value = {
        code: "NETWORK_ERROR",
        message:
          err instanceof Error ? err.message : "Failed to load Crovly script",
      };
      isLoading.value = false;
      return;
    }

    if (destroyed) return;

    const crovly = getCrovlyGlobal();
    if (!crovly) {
      error.value = {
        code: "UNKNOWN",
        message: "Crovly global not found after script load",
      };
      isLoading.value = false;
      return;
    }

    // Clean up previous instance
    if (widgetInstance) {
      widgetInstance.remove();
      widgetInstance = null;
    }

    const widget = crovly.render(container, {
      siteKey,
      theme,
      size,
      lang,
      badge,
      responseFieldName,
      onVerify: (t: string) => {
        token.value = t;
        error.value = null;
        isLoading.value = false;
      },
      onError: (code: string, message: string) => {
        token.value = null;
        error.value = { code: code as CrovlyErrorCode, message };
        isLoading.value = false;
      },
      onExpire: () => {
        token.value = null;
        error.value = null;
        isLoading.value = true;
      },
    });

    if (!destroyed) {
      widgetInstance = widget;
    } else {
      widget.remove();
    }
  }

  function reset() {
    if (widgetInstance) {
      widgetInstance.reset();
      token.value = null;
      error.value = null;
      isLoading.value = true;
    } else {
      // Widget not initialized yet, re-init
      initWidget();
    }
  }

  // Wait for containerRef to be populated, then init
  onMounted(() => {
    // containerRef may already be set by template ref binding
    if (containerRef.value) {
      initWidget();
    }
  });

  // Watch for containerRef becoming available (e.g. conditional rendering)
  watch(containerRef, (newVal) => {
    if (newVal && !widgetInstance) {
      initWidget();
    }
  });

  onBeforeUnmount(() => {
    destroyed = true;
    if (widgetInstance) {
      widgetInstance.remove();
      widgetInstance = null;
    }
  });

  return {
    token,
    error,
    isLoading,
    reset,
    containerRef,
  };
}
