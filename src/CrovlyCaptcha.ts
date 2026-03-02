import { defineComponent, ref, h, onMounted, onBeforeUnmount, watch } from "vue";
import { loadCrovlyScript, getCrovlyGlobal } from "./script-loader";
import type { CrovlyWidgetInstance, CrovlyErrorCode } from "./types";

/**
 * Vue 3 component that renders a Crovly captcha widget.
 *
 * @example
 * ```vue
 * <template>
 *   <CrovlyCaptcha
 *     site-key="crvl_site_xxx"
 *     theme="dark"
 *     @verify="onVerify"
 *     @error="onError"
 *   />
 * </template>
 *
 * <script setup lang="ts">
 * import { CrovlyCaptcha } from '@crovly/vue';
 *
 * function onVerify(token: string) {
 *   console.log('Token:', token);
 * }
 *
 * function onError(code: string, message: string) {
 *   console.error('Error:', code, message);
 * }
 * </script>
 * ```
 */
export const CrovlyCaptcha = defineComponent({
  name: "CrovlyCaptcha",

  props: {
    /** Your site key from the Crovly dashboard. */
    siteKey: {
      type: String,
      required: true,
    },
    /** Color theme. Defaults to "auto" (follows prefers-color-scheme). */
    theme: {
      type: String as () => "light" | "dark" | "auto",
      default: "auto",
    },
    /** Widget visibility mode. "invisible" runs verification silently. */
    size: {
      type: String as () => "normal" | "invisible",
      default: "normal",
    },
    /** Language code (e.g. "en", "tr", "ar"). */
    lang: {
      type: String,
      default: undefined,
    },
    /** Show the "Protected by Crovly" badge. Defaults to true. */
    badge: {
      type: Boolean,
      default: true,
    },
    /** Name of the hidden form field that holds the token. Defaults to "crovly-token". */
    responseFieldName: {
      type: String,
      default: "crovly-token",
    },
  },

  emits: {
    /** Emitted when verification succeeds with the token string. */
    verify: (_token: string) => true,
    /** Emitted when verification fails. */
    error: (_code: CrovlyErrorCode, _message: string) => true,
    /** Emitted when the token expires and a refresh cycle begins. */
    expire: () => true,
  },

  setup(props, { emit }) {
    const containerRef = ref<HTMLElement | null>(null);
    const widgetInstance = ref<CrovlyWidgetInstance | null>(null);
    let destroyed = false;

    async function initWidget() {
      const container = containerRef.value;
      if (!container || destroyed) return;

      try {
        await loadCrovlyScript();
      } catch (err) {
        if (!destroyed) {
          emit(
            "error",
            "NETWORK_ERROR" as CrovlyErrorCode,
            err instanceof Error ? err.message : "Failed to load Crovly script"
          );
        }
        return;
      }

      if (destroyed) return;

      const crovly = getCrovlyGlobal();
      if (!crovly) {
        emit(
          "error",
          "UNKNOWN" as CrovlyErrorCode,
          "Crovly global not found after script load"
        );
        return;
      }

      // Clean up any previous widget on this container
      if (widgetInstance.value) {
        widgetInstance.value.remove();
        widgetInstance.value = null;
      }

      const widget = crovly.render(container, {
        siteKey: props.siteKey,
        theme: props.theme,
        size: props.size,
        lang: props.lang,
        badge: props.badge,
        responseFieldName: props.responseFieldName,
        onVerify: (token: string) => emit("verify", token),
        onError: (code: string, message: string) =>
          emit("error", code as CrovlyErrorCode, message),
        onExpire: () => emit("expire"),
      });

      if (!destroyed) {
        widgetInstance.value = widget;
      } else {
        widget.remove();
      }
    }

    onMounted(() => {
      initWidget();
    });

    // Re-initialize when config props change
    watch(
      () => [
        props.siteKey,
        props.theme,
        props.size,
        props.lang,
        props.badge,
        props.responseFieldName,
      ],
      () => {
        initWidget();
      }
    );

    onBeforeUnmount(() => {
      destroyed = true;
      if (widgetInstance.value) {
        widgetInstance.value.remove();
        widgetInstance.value = null;
      }
    });

    return () =>
      h("div", {
        ref: containerRef,
      });
  },
});
