import { supabase } from '../plugins/supabase'
import { QueueState } from '@cms/shared'

export async function broadcastQueueUpdate(clinicId: string, payload: QueueState): Promise<void> {
  try {
    const channel = supabase.channel(`queue:${clinicId}`)
    await channel.send({
      type: 'broadcast',
      event: 'queue-updated',
      payload,
    })
  } catch (error) {
    console.error('Failed to broadcast queue update:', error)
  }
}
