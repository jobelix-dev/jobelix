#!/bin/bash
# Test script for GPT token system
# Usage: ./test-token.sh <your-token-here>

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Please provide a token"
  echo "Usage: ./test-token.sh <your-token>"
  exit 1
fi

echo "🔑 Testing GPT token: ${TOKEN:0:16}..."
echo ""

# Make a test call to the GPT endpoint
echo "📡 Calling /api/autoapply/gpt4..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/autoapply/gpt4 \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say hello in one word\"}],
    \"model\": \"gpt-4\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Token call successful!"
  echo "💡 Check the UI - remaining uses should have decreased by 1"
else
  echo "❌ Token call failed"
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "Error: $ERROR"
fi
