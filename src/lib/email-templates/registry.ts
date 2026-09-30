import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as bookingConfirmed } from './booking-confirmed'
import { template as bookingCancelled } from './booking-cancelled'
import { template as eventCancelled } from './event-cancelled'
import { template as eventReminder } from './event-reminder'
import { template as newBooking } from './new-booking'
import { approvedTemplate, rejectedTemplate } from './organiser-decision'
import { applicationNewTemplate, competitionEntryAdminTemplate } from './admin-notices'
import { template as competitionEntry } from './competition-entry'
import { grantedTemplate, revokedTemplate } from './organiser-role'
import { template as eventPhotos } from './event-photos'
import { slotOwnerNewBooking, slotBookingConfirmed, slotBookingCancelled, slotSplitCancelledByHost, slotSplitResult, slotOwnerSplitResult } from './slot-emails'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'slot-owner-new-booking': slotOwnerNewBooking,
  'slot-booking-confirmed': slotBookingConfirmed,
  'slot-booking-cancelled': slotBookingCancelled,
  'slot-split-cancelled-by-host': slotSplitCancelledByHost,
  'slot-split-result': slotSplitResult,
  'slot-owner-split-result': slotOwnerSplitResult,
  'event-photos': eventPhotos,
  'booking-confirmed': bookingConfirmed,
  'booking-cancelled': bookingCancelled,
  'event-cancelled': eventCancelled,
  'event-reminder-24h': eventReminder,
  'new-booking': newBooking,
  'organiser-approved': approvedTemplate,
  'organiser-rejected': rejectedTemplate,
  'organiser-application-new': applicationNewTemplate,
  'competition-entry': competitionEntry,
  'competition-entry-admin': competitionEntryAdminTemplate,
  'organiser-role-granted': grantedTemplate,
  'organiser-role-revoked': revokedTemplate,
}
