<script setup lang="ts">
import type { WidgetInstance } from '../types/feedback-widget'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { nextTick, onUnmounted, ref, watch } from 'vue'

const widgetContainer = ref<HTMLDivElement>()
const isWidgetLoaded = ref(false)
const widgetInstance = ref<WidgetInstance>()
const showFallbackForm = ref(false)
const showSuccessMessage = ref(false)

const open = ref(false)

let cleanupTimeout: ReturnType<typeof setTimeout> | null = null

// Step: Mount the widget after scripts are loaded
async function mountWidget() {
  await nextTick()
  if (!widgetContainer.value)
    return
  
  try {
    console.log('[FeedbackWidget] Attempting to mount widget...')
    console.log('[FeedbackWidget] window.mountFeedbackWidget available:', typeof window.mountFeedbackWidget)
    
    // Check if the function is available
    if (typeof window.mountFeedbackWidget !== 'function') {
      console.error('[FeedbackWidget] mountFeedbackWidget function not available on window object')
      console.log('[FeedbackWidget] Available window properties:', Object.keys(window).filter(key => key.includes('feedback') || key.includes('mount')))
      throw new Error('Feedback widget script not loaded or mountFeedbackWidget function not found')
    }
    
    console.log('[FeedbackWidget] Calling mountFeedbackWidget...')
    widgetInstance.value = window.mountFeedbackWidget('#feedback-widget', {
      app: 'nimiq-tutorial',
      lang: 'en',
      feedbackEndpoint: 'https://nimiq-feedback.je-cf9.workers.dev/api/feedback',
      dev: import.meta.env.DEV,
      dark: document.documentElement.getAttribute('data-theme') === 'dark',
    })
    
    console.log('[FeedbackWidget] Widget instance created:', widgetInstance.value)
    
    widgetInstance.value.communication?.on('form-selected', (formType) => {
      console.log('Form selected:', formType)
    })
    widgetInstance.value.communication?.on('form-submitted', (data) => {
      console.log('Feedback submitted successfully:', data)
      showSuccessMessage.value = true
      setTimeout(() => {
        showSuccessMessage.value = false
        open.value = false
      }, 2000)
    })
    widgetInstance.value.communication?.on('form-error', (error) => {
      console.error('Feedback submission error:', error)
    })
    isWidgetLoaded.value = true
    console.log('[FeedbackWidget] Widget mounted successfully')
  }
  catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    console.error('[FeedbackWidget] Failed to initialize feedback widget:', errorObj)
    console.error('[FeedbackWidget] Error details:', {
      message: errorObj.message,
      stack: errorObj.stack,
      widgetContainer: widgetContainer.value,
      mountFunctionType: typeof window.mountFeedbackWidget
    })
    showFallbackForm.value = true
    isWidgetLoaded.value = false
  }
}

function cleanupWidget() {
  if (widgetInstance.value) {
    try {
      widgetInstance.value.destroy()
    }
    catch {}
    widgetInstance.value = undefined
  }
}

function handleRetry() {
  open.value = false
  nextTick(() => {
    open.value = true
  })
}

watch(open, async (newValue) => {
  if (newValue) {
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout)
      cleanupTimeout = null
    }
    document.body.style.overflow = 'hidden'
    showFallbackForm.value = false
    showSuccessMessage.value = false
    try {
      await mountWidget()
    }
    catch {
      showFallbackForm.value = true
      isWidgetLoaded.value = false
    }
  }
  else {
    document.body.style.overflow = ''
    // Delay cleanup by 500ms
    cleanupTimeout = setTimeout(() => {
      cleanupWidget()
      showFallbackForm.value = false
      isWidgetLoaded.value = false
      cleanupTimeout = null
    }, 500)
  }
}, { immediate: false })

onUnmounted(() => {
  cleanupWidget()
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-bind="$attrs">
      <slot />
    </DialogTrigger>
    <DialogPortal>
      <Transition name="backdrop">
        <DialogOverlay class="fixed inset-0 z-50 bg-black/15 backdrop-blur-sm" />
      </Transition>
      <Transition name="modal">
        <DialogContent
          class="modal-container fixed bottom-0 left-0 right-0 z-50 h-max max-h-[85vh] w-full transform overflow-y-auto rounded-t-2xl shadow-lg outline-none lg:left-1/2 lg:top-1/2 lg:max-w-[500px] lg:rounded-2xl lg:-translate-x-1/2 lg:-translate-y-1/2"
          @open-auto-focus.prevent
        >
          <div class="relative bg-white py-8 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
            <DialogTitle class="sr-only mb-3 px-6 text-center text-2xl text-neutral-900 font-bold leading-none lg:px-10 dark:text-neutral" as="h2">
              Share Your Feedback
            </DialogTitle>

            <div class="mt-3 px-6 lg:px-10">
              <!-- Loading state -->
              <div v-if="!isWidgetLoaded && !showFallbackForm && !showSuccessMessage" class="h-64 flex items-center justify-center">
                <div class="flex items-center text-neutral-500 space-x-2 dark:text-neutral-400">
                  <div class="i-ph:spinner h-5 w-5" />
                  <span>Loading feedback form...</span>
                </div>
              </div>

              <!-- Success state -->
              <div v-if="showSuccessMessage" class="h-64 flex flex-col items-center justify-center rounded-xl bg-green-50 px-6 py-4 space-y-4 dark:bg-green-900">
                <div class="i-ph:check-circle h-12 w-12 text-green-500" />
                <div class="text-lg text-green-600 font-medium dark:text-green-400">
                  Thank you for your feedback!
                </div>
              </div>

              <!-- External Widget -->
              <div
                id="feedback-widget"
                ref="widgetContainer"
                :class="{ block: isWidgetLoaded && !showSuccessMessage, hidden: !isWidgetLoaded || showSuccessMessage }"
              />

              <!-- Error state -->
              <div v-if="showFallbackForm && !isWidgetLoaded" class="h-64 flex items-center justify-center">
                <div class="text-center space-y-4">
                  <div class="i-ph:warning-circle mx-auto h-12 w-12 text-yellow-500" />
                  <div class="text-neutral-500 dark:text-neutral-400">
                    Unable to load feedback form
                  </div>
                  <div class="text-sm text-neutral-400 dark:text-neutral-500">
                    Please try again later or contact us directly in <a href="https://t.me/Nimiq" target="_blank" class="text-blue-600 underline hover:text-blue-700">Telegram</a>
                  </div>
                  <button
                    class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    @click="handleRetry"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>

            <DialogClose
              class="absolute right-4 top-4 cursor-pointer transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Close"
            >
              <div class="i-ph:x h-6 w-6" />
            </DialogClose>
          </div>
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Based on crypto-map Modal.vue transitions */

.backdrop-enter-active {
  transition: opacity 650ms cubic-bezier(0.3, 1, 0.2, 1);
}

.backdrop-leave-active {
  transition: opacity 650ms cubic-bezier(0.3, 0, 0, 1);
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

@media (max-width: 1023px) {
  .modal-enter-active,
  .modal-leave-active {
    transition: transform 200ms ease-out;
  }

  .modal-enter-from,
  .modal-leave-to {
    transform: translateY(100%);
  }
}

@media (min-width: 1024px) {
  .modal-enter-active,
  .modal-leave-active {
    transition:
      opacity 250ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 0.5rem)) scale(0.96);
  }
}

/* Use CSS variables from theme */
.modal-container {
  background-color: var(--tk-background-primary);
  color: var(--tk-text-primary);
  border-color: var(--tk-border-primary);
}

/* lg breakpoint */
@media (min-width: 1024px) {
  .lg\:rounded-2xl {
    border-radius: 1rem;
  }

  .lg\:max-w-\[500px\] {
    max-width: 500px;
  }

  .lg\:px-10 {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}
</style>
