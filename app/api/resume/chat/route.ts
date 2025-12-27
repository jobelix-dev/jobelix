import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { UIMessage } from 'ai'
import { validateField } from '@/lib/fieldValidation'

export const maxDuration = 30

/**
 * Get the next field to ask about from invalid/missing/uncertain lists
 * Priority: invalid > missing > uncertain
 */
function getNextFieldToAsk(invalid: any[], missing: any[], uncertain: any[]) {
  if (invalid.length > 0) {
    return { field: invalid[0], type: 'invalid' as const }
  }
  if (missing.length > 0) {
    return { field: missing[0], type: 'missing' as const }
  }
  if (uncertain.length > 0) {
    return { field: uncertain[0], type: 'uncertain' as const }
  }
  return null
}

/**
 * Update field value in education/experience array or top-level
 */
function updateFieldValue(draft: any, fieldPath: string, value: any) {
  const pathParts = fieldPath.split('.')
  
  // Top-level field (phone_number, email, address)
  if (pathParts.length === 1) {
    return { [fieldPath]: value }
  }
  
  // Nested field (education.0.starting_date)
  if (pathParts.length === 3) {
    const [collection, indexStr, fieldName] = pathParts
    const index = parseInt(indexStr)
    
    if (collection === 'education') {
      const updated = [...(draft.education || [])]
      if (updated[index]) {
        updated[index] = { ...updated[index], [fieldName]: value, confidence: 'high' }
        return { education: updated }
      }
    } else if (collection === 'experience') {
      const updated = [...(draft.experience || [])]
      if (updated[index]) {
        updated[index] = { ...updated[index], [fieldName]: value, confidence: 'high' }
        return { experience: updated }
      }
    }
  }
  
  return {}
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, draftId }: { messages: UIMessage[]; draftId: string } = await req.json()

    if (!draftId) {
      return new Response('Draft ID required', { status: 400 })
    }

    // Get the current draft data
    const { data: draft, error: draftError } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('id', draftId)
      .eq('student_id', user.id)
      .single()

    if (draftError || !draft) {
      console.error('Draft error:', draftError)
      return new Response('Draft not found', { status: 404 })
    }

    console.log('=== CHAT REQUEST ===')
    console.log('Draft ID:', draftId)
    console.log('Messages count:', messages.length)

    const invalidFields = draft.extraction_confidence?.invalid || []
    const missingFields = draft.extraction_confidence?.missing || []
    const uncertainFields = draft.extraction_confidence?.uncertain || []

    console.log('Current validation state:', {
      invalid: invalidFields.length,
      missing: missingFields.length,
      uncertain: uncertainFields.length,
      total: invalidFields.length + missingFields.length + uncertainFields.length
    })

    // Check if this is the first message
    const isFirstMessage = messages.length === 0 || 
      (messages.length === 1 && messages[0].role === 'user')

    // HARD CHECK: Profile is complete when all lists are empty
    const isComplete = invalidFields.length === 0 && 
                       missingFields.length === 0 && 
                       uncertainFields.length === 0

    if (isComplete) {
      console.log('✅ Profile is complete!')
      // Profile is complete - return hard-coded completion message
      const completionMessage = "Perfect! Your profile is complete. You can now click the 'Finalize Profile' button to save it to your account."
      
      // Save conversation
      await supabase
        .from('student_profile_draft')
        .update({
          chat_history: [...(draft.chat_history || []), { role: 'assistant' as const, text: completionMessage }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('student_id', user.id)

      console.log('=== END CHAT REQUEST (Complete) ===')
      return new Response(completionMessage, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }

    // Get the next field to ask about
    const nextField = getNextFieldToAsk(invalidFields, missingFields, uncertainFields)
    
    if (!nextField) {
      console.error('❌ No fields to ask about but profile marked as incomplete')
      return new Response('No more fields to validate', { status: 400 })
    }

    console.log('Next field to ask:', nextField)

    // If this is the first message, just greet and ask for the first field
    if (isFirstMessage) {
      const totalIssues = invalidFields.length + missingFields.length + uncertainFields.length
      const greeting = `Hi! Thanks for uploading your resume. I've extracted ${draft.education?.length || 0} education entries and ${draft.experience?.length || 0} work experiences.\n\nI need to verify ${totalIssues} detail${totalIssues > 1 ? 's' : ''} to complete your profile. Let's start with your ${nextField.field.display_name}. Could you please provide that?`
      
      // Save conversation
      await supabase
        .from('student_profile_draft')
        .update({
          chat_history: [{ role: 'assistant' as const, text: greeting }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('student_id', user.id)

      console.log('=== END CHAT REQUEST (First Message) ===')
      return new Response(greeting, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]
    if (!lastUserMessage) {
      return new Response('No user message found', { status: 400 })
    }

    // UIMessage has parts array, not content. Extract text from text parts.
    const textParts = lastUserMessage.parts.filter((p: any) => p.type === 'text') as Array<{type: 'text', text: string}>
    const userAnswer = textParts.length > 0 ? (textParts[0]?.text || '').trim() : ''
    console.log('User answer:', userAnswer)

    // Determine which field the user is answering about
    // We track this in a simple way: the next field to ask is the one they're answering
    let currentField = nextField.field
    let currentFieldType = nextField.type

    console.log('Validating answer for field:', currentField.field_path)

    // HARD VALIDATION on user's answer
    const fieldName = currentField.field_path.split('.').slice(-1)[0] // Get last part (e.g., "phone_number" or "ending_date")
    const validation = validateField(fieldName, userAnswer)

    console.log('Validation result:', validation)

    if (!validation.isValid) {
      // Answer is invalid - ask again with specific error message
      console.log('❌ Validation failed:', validation.errorMessage)
      
      const errorResponse = `${validation.errorMessage}\n\nPlease provide a valid ${currentField.display_name}.`
      
      // Save conversation
      await supabase
        .from('student_profile_draft')
        .update({
          chat_history: [...(draft.chat_history || []), 
            { role: 'user' as const, text: userAnswer },
            { role: 'assistant' as const, text: errorResponse }
          ],
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('student_id', user.id)

      console.log('=== END CHAT REQUEST (Validation Failed) ===')
      return new Response(errorResponse, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }

    // Answer is VALID - update the draft
    console.log('✅ Validation passed. Normalized value:', validation.normalizedValue)

    const fieldUpdates = updateFieldValue(draft, currentField.field_path, validation.normalizedValue)
    
    // Remove this field from the appropriate list
    let updatedInvalid = invalidFields.filter((f: any) => f.field_path !== currentField.field_path)
    let updatedMissing = missingFields.filter((f: any) => f.field_path !== currentField.field_path)
    let updatedUncertain = uncertainFields.filter((f: any) => f.field_path !== currentField.field_path)

    const updatedExtractionConfidence = {
      invalid: updatedInvalid,
      missing: updatedMissing,
      uncertain: updatedUncertain,
    }

    // Update draft in database
    const dbUpdates: any = {
      ...fieldUpdates,
      extraction_confidence: updatedExtractionConfidence,
      updated_at: new Date().toISOString(),
    }

    console.log('Updating database:', {
      fieldPath: currentField.field_path,
      value: validation.normalizedValue,
      remainingIssues: updatedInvalid.length + updatedMissing.length + updatedUncertain.length
    })

    const { error: updateError } = await supabase
      .from('student_profile_draft')
      .update(dbUpdates)
      .eq('id', draftId)
      .eq('student_id', user.id)

    if (updateError) {
      console.error('❌ Failed to update draft:', updateError)
      return new Response('Failed to update draft', { status: 500 })
    }

    console.log('✅ Database updated successfully')

    // HARD CHECK: Are there more fields to validate?
    const remainingInvalid = updatedInvalid.length
    const remainingMissing = updatedMissing.length
    const remainingUncertain = updatedUncertain.length
    const totalRemaining = remainingInvalid + remainingMissing + remainingUncertain

    console.log('Remaining fields:', {
      invalid: remainingInvalid,
      missing: remainingMissing,
      uncertain: remainingUncertain,
      total: totalRemaining
    })

    let responseMessage: string

    if (totalRemaining === 0) {
      // All fields validated - profile is complete!
      responseMessage = "Perfect! Your profile is complete. You can now click the 'Finalize Profile' button to save it to your account."
      console.log('✅ Profile complete!')
    } else {
      // More fields to validate - ask about the next one
      const next = getNextFieldToAsk(updatedInvalid, updatedMissing, updatedUncertain)
      if (next) {
        responseMessage = `Great, thanks! Next, could you please provide your ${next.field.display_name}?`
        console.log('➡️ Asking about next field:', next.field.field_path)
      } else {
        responseMessage = "Thank you! Processing your information..."
      }
    }

    // Save conversation with response
    await supabase
      .from('student_profile_draft')
      .update({
        chat_history: [...(draft.chat_history || []),
          { role: 'user' as const, text: userAnswer },
          { role: 'assistant' as const, text: responseMessage }
        ],
      })
      .eq('id', draftId)
      .eq('student_id', user.id)

    console.log('=== END CHAT REQUEST ===')

    return new Response(responseMessage, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (error: any) {
    console.error('Resume chat error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
