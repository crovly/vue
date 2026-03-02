# @crovly/vue

Official Vue 3 SDK for [Crovly](https://crovly.com) — privacy-first, Proof of Work captcha.

## Installation

```bash
npm install @crovly/vue
```

Vue 3.3+ is required as a peer dependency.

## Component Usage

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input name="email" type="email" required />

    <CrovlyCaptcha
      site-key="crvl_site_xxx"
      theme="dark"
      @verify="onVerify"
      @error="onError"
      @expire="onExpire"
    />

    <button type="submit" :disabled="!token">Submit</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CrovlyCaptcha } from "@crovly/vue";

const token = ref<string | null>(null);

function onVerify(t: string) {
  token.value = t;
}

function onError(code: string, message: string) {
  console.error("Captcha error:", code, message);
}

function onExpire() {
  token.value = null;
}

async function handleSubmit() {
  await fetch("/api/submit", {
    method: "POST",
    body: JSON.stringify({ token: token.value }),
  });
}
</script>
```

## Composable Usage

The `useCrovly` composable gives you reactive state and a template ref for the container element.

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input name="username" />
    <input name="password" type="password" />

    <div ref="containerRef" />

    <p v-if="error" class="text-red-500">Error: {{ error.message }}</p>

    <button type="submit" :disabled="isLoading || !token">
      {{ isLoading ? "Verifying..." : "Log in" }}
    </button>

    <button type="button" @click="reset">Reset Captcha</button>
  </form>
</template>

<script setup lang="ts">
import { useCrovly } from "@crovly/vue";

const { token, error, isLoading, reset, containerRef } = useCrovly({
  siteKey: "crvl_site_xxx",
  theme: "auto",
});

function handleSubmit() {
  // token.value contains the verification token
  console.log("Submitting with token:", token.value);
}
</script>
```

## Nuxt 3

Since Crovly requires browser APIs, wrap the component in a `<ClientOnly>` block:

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input name="email" type="email" required />

    <ClientOnly>
      <CrovlyCaptcha
        :site-key="runtimeConfig.public.crovlySiteKey"
        theme="auto"
        @verify="(t) => (token = t)"
      />
    </ClientOnly>

    <button type="submit" :disabled="!token">Submit</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CrovlyCaptcha } from "@crovly/vue";

const runtimeConfig = useRuntimeConfig();
const token = ref<string | null>(null);

async function handleSubmit() {
  await $fetch("/api/submit", {
    method: "POST",
    body: { token: token.value },
  });
}
</script>
```

In `nuxt.config.ts`, add your site key:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      crovlySiteKey: process.env.CROVLY_SITE_KEY || "",
    },
  },
});
```

## Props Reference

### `<CrovlyCaptcha />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `site-key` | `string` | **required** | Your site key from the Crovly dashboard |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Color theme |
| `size` | `"normal" \| "invisible"` | `"normal"` | Widget visibility mode |
| `lang` | `string` | - | Language code (e.g. `"en"`, `"tr"`) |
| `badge` | `boolean` | `true` | Show "Protected by Crovly" badge |
| `response-field-name` | `string` | `"crovly-token"` | Hidden form field name |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `verify` | `token: string` | Emitted on successful verification |
| `error` | `code: string, message: string` | Emitted on verification failure |
| `expire` | - | Emitted when token expires |

### `useCrovly(options)`

Returns reactive refs and a reset function.

| Return | Type | Description |
|--------|------|-------------|
| `token` | `Ref<string \| null>` | Verification token |
| `error` | `Ref<{ code: string; message: string } \| null>` | Error details |
| `isLoading` | `Ref<boolean>` | Loading/verifying state |
| `reset` | `() => void` | Reset and re-verify |
| `containerRef` | `Ref<HTMLElement \| null>` | Bind to a `<div>` via template ref |

## Backend Verification

After obtaining the token, verify it on your server:

```javascript
const res = await fetch("https://api.crovly.com/verify-token", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_SECRET_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ token, expectedIp: req.ip }),
});
const { success, score } = await res.json();
```

## Documentation

Full documentation at [docs.crovly.com](https://docs.crovly.com).

## License

MIT
