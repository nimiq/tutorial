// Type definitions for Nimiq Feedback Widget

export type FormType = 'bug' | 'idea' | 'feedback'

export interface WidgetProps {
  app: string
  lang?: string
  feedbackEndpoint: string
  tags?: string[]
  initialForm?: 'bug' | 'idea' | 'feedback'
  dark?: boolean
  dev?: boolean
}

export interface WidgetEvents {
  'form-selected': FormType
  'go-back': void
  'form-submitted': { success: true, data: any }
  'form-error': { success: false, error: string, details?: any }
  'before-submit': { formData: FormData, type: FormType, app: string }
}

export interface WidgetCommunication {
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback?: (data: any) => void) => void
  emit: (event: string, data: any) => void
}

export interface WidgetInstance {
  showFormGrid: () => void
  showForm: (formType: 'bug' | 'idea' | 'feedback') => void
  closeWidget: () => void
  goBack: () => void
  communication?: WidgetCommunication
  destroy: () => void
}

declare global {
  interface Window {
    mountFeedbackWidget: MountFeedbackWidgetFn
  }
}

export type MountFeedbackWidgetFn = (selector: string, props?: WidgetProps) => WidgetInstance

export {}
