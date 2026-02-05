/**
 * Contact Information Extraction Prompt
 * Used for extracting basic contact details from resume
 */

export const contactPrompt = `Extract contact information from the resume. Update with resume data if provided, otherwise keep existing.

Phone number rules:
- Extract the phone number EXACTLY as written in the resume (preserve the original format)
- Do NOT skip the phone number if it lacks a country code - extract it anyway
- If the phone has an international prefix (e.g., +33, +1), include it in phone_number
- If the phone has NO prefix, extract the local number as-is

phone_country_code rules:
- Infer the ISO 3166-1 alpha-2 country code (2 uppercase letters)
- If phone has international prefix: +1 = US, +44 = GB, +49 = DE, +33 = FR, +91 = IN, +61 = AU
- If phone has NO prefix: infer country from the address/location in the resume
- If country cannot be determined, set phone_country_code to null (we'll default to FR later)

Examples:
- Phone: "+1 555-123-4567" → phone_number: "+1 555-123-4567", phone_country_code: "US"
- Phone: "+33 6 12 34 56 78" → phone_number: "+33 6 12 34 56 78", phone_country_code: "FR"
- Phone: "06 12 34 56 78" (French resume) → phone_number: "06 12 34 56 78", phone_country_code: "FR"
- Phone: "555-123-4567" (US address) → phone_number: "555-123-4567", phone_country_code: "US"

IMPORTANT: 
- Do NOT return null for phone_number if there is ANY phone number in the resume
- ALL extracted text MUST be translated to English (except phone numbers - keep as-is)`;
