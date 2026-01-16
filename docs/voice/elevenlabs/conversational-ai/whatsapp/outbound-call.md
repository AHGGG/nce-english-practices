# Make An Outbound Call Via Whatsapp

POST https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call
Content-Type: application/json

Make an outbound call via WhatsApp

Reference: https://elevenlabs.io/docs/api-reference/conversational-ai/whatsapp/outbound-call

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Make An Outbound Call Via Whatsapp
  version: endpoint_conversationalAi/whatsapp.outbound_call
paths:
  /v1/convai/whatsapp/outbound-call:
    post:
      operationId: outbound-call
      summary: Make An Outbound Call Via Whatsapp
      description: Make an outbound call via WhatsApp
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/whatsapp
      parameters:
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WhatsAppOutboundCallResponse'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Make_an_outbound_call_via_WhatsApp_v1_convai_whatsapp_outbound_call_post
components:
  schemas:
    SoftTimeoutConfigOverride:
      type: object
      properties:
        message:
          type:
            - string
            - 'null'
          description: >-
            Message to show when soft timeout is reached while waiting for LLM
            response
    TurnConfigOverride:
      type: object
      properties:
        soft_timeout_config:
          oneOf:
            - $ref: '#/components/schemas/SoftTimeoutConfigOverride'
            - type: 'null'
          description: >-
            Configuration for soft timeout functionality. Provides immediate
            feedback during longer LLM responses.
    TTSConversationalConfigOverride:
      type: object
      properties:
        voice_id:
          type:
            - string
            - 'null'
          description: The voice ID to use for TTS
        stability:
          type:
            - number
            - 'null'
          format: double
          description: The stability of generated speech
        speed:
          type:
            - number
            - 'null'
          format: double
          description: The speed of generated speech
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          description: The similarity boost for generated speech
    ConversationConfigOverride:
      type: object
      properties:
        text_only:
          type:
            - boolean
            - 'null'
          description: >-
            If enabled audio will not be processed and only text will be used,
            use to avoid audio pricing.
    LLM:
      type: string
      enum:
        - value: gpt-4o-mini
        - value: gpt-4o
        - value: gpt-4
        - value: gpt-4-turbo
        - value: gpt-4.1
        - value: gpt-4.1-mini
        - value: gpt-4.1-nano
        - value: gpt-5
        - value: gpt-5.1
        - value: gpt-5.2
        - value: gpt-5.2-chat-latest
        - value: gpt-5-mini
        - value: gpt-5-nano
        - value: gpt-3.5-turbo
        - value: gemini-1.5-pro
        - value: gemini-1.5-flash
        - value: gemini-2.0-flash
        - value: gemini-2.0-flash-lite
        - value: gemini-2.5-flash-lite
        - value: gemini-2.5-flash
        - value: gemini-3-pro-preview
        - value: claude-sonnet-4-5
        - value: claude-sonnet-4
        - value: claude-haiku-4-5
        - value: claude-3-7-sonnet
        - value: claude-3-5-sonnet
        - value: claude-3-5-sonnet-v1
        - value: claude-3-haiku
        - value: grok-beta
        - value: custom-llm
        - value: qwen3-4b
        - value: qwen3-30b-a3b
        - value: gpt-oss-20b
        - value: gpt-oss-120b
        - value: glm-45-air-fp8
        - value: gemini-2.5-flash-preview-09-2025
        - value: gemini-2.5-flash-lite-preview-09-2025
        - value: gemini-2.5-flash-preview-05-20
        - value: gemini-2.5-flash-preview-04-17
        - value: gemini-2.5-flash-lite-preview-06-17
        - value: gemini-2.0-flash-lite-001
        - value: gemini-2.0-flash-001
        - value: gemini-1.5-flash-002
        - value: gemini-1.5-flash-001
        - value: gemini-1.5-pro-002
        - value: gemini-1.5-pro-001
        - value: claude-sonnet-4@20250514
        - value: claude-sonnet-4-5@20250929
        - value: claude-haiku-4-5@20251001
        - value: claude-3-7-sonnet@20250219
        - value: claude-3-5-sonnet@20240620
        - value: claude-3-5-sonnet-v2@20241022
        - value: claude-3-haiku@20240307
        - value: gpt-5-2025-08-07
        - value: gpt-5.1-2025-11-13
        - value: gpt-5.2-2025-12-11
        - value: gpt-5-mini-2025-08-07
        - value: gpt-5-nano-2025-08-07
        - value: gpt-4.1-2025-04-14
        - value: gpt-4.1-mini-2025-04-14
        - value: gpt-4.1-nano-2025-04-14
        - value: gpt-4o-mini-2024-07-18
        - value: gpt-4o-2024-11-20
        - value: gpt-4o-2024-08-06
        - value: gpt-4o-2024-05-13
        - value: gpt-4-0613
        - value: gpt-4-0314
        - value: gpt-4-turbo-2024-04-09
        - value: gpt-3.5-turbo-0125
        - value: gpt-3.5-turbo-1106
        - value: watt-tool-8b
        - value: watt-tool-70b
    PromptAgentAPIModelOverride:
      type: object
      properties:
        prompt:
          type:
            - string
            - 'null'
          description: The prompt for the agent
        llm:
          oneOf:
            - $ref: '#/components/schemas/LLM'
            - type: 'null'
          description: >-
            The LLM to query with the prompt and the chat history. If using data
            residency, the LLM must be supported in the data residency
            environment
        native_mcp_server_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of Native MCP server ids to be used by the agent
    AgentConfigOverride-Input:
      type: object
      properties:
        first_message:
          type:
            - string
            - 'null'
          description: >-
            If non-empty, the first message the agent will say. If empty, the
            agent waits for the user to start the discussion.
        language:
          type:
            - string
            - 'null'
          description: Language of the agent - used for ASR and TTS
        prompt:
          oneOf:
            - $ref: '#/components/schemas/PromptAgentAPIModelOverride'
            - type: 'null'
          description: The prompt for the agent
    ConversationConfigClientOverride-Input:
      type: object
      properties:
        turn:
          oneOf:
            - $ref: '#/components/schemas/TurnConfigOverride'
            - type: 'null'
          description: Configuration for turn detection
        tts:
          oneOf:
            - $ref: '#/components/schemas/TTSConversationalConfigOverride'
            - type: 'null'
          description: Configuration for conversational text to speech
        conversation:
          oneOf:
            - $ref: '#/components/schemas/ConversationConfigOverride'
            - type: 'null'
          description: Configuration for conversational events
        agent:
          oneOf:
            - $ref: '#/components/schemas/AgentConfigOverride-Input'
            - type: 'null'
          description: Agent specific configuration
    ConversationInitiationClientDataRequestInputCustomLlmExtraBody:
      type: object
      properties: {}
    ConversationInitiationSource:
      type: string
      enum:
        - value: unknown
        - value: android_sdk
        - value: node_js_sdk
        - value: react_native_sdk
        - value: react_sdk
        - value: js_sdk
        - value: python_sdk
        - value: widget
        - value: sip_trunk
        - value: twilio
        - value: genesys
        - value: swift_sdk
        - value: whatsapp
        - value: flutter_sdk
    ConversationInitiationSourceInfo:
      type: object
      properties:
        source:
          oneOf:
            - $ref: '#/components/schemas/ConversationInitiationSource'
            - type: 'null'
          description: Source of the conversation initiation
        version:
          type:
            - string
            - 'null'
          description: The SDK version number
    ConversationInitiationClientDataRequestInputDynamicVariables:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    ConversationInitiationClientDataRequest-Input:
      type: object
      properties:
        conversation_config_override:
          $ref: '#/components/schemas/ConversationConfigClientOverride-Input'
        custom_llm_extra_body:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataRequestInputCustomLlmExtraBody
        user_id:
          type:
            - string
            - 'null'
          description: >-
            ID of the end user participating in this conversation (for agent
            owner's user identification)
        source_info:
          $ref: '#/components/schemas/ConversationInitiationSourceInfo'
        dynamic_variables:
          type: object
          additionalProperties:
            oneOf:
              - $ref: >-
                  #/components/schemas/ConversationInitiationClientDataRequestInputDynamicVariables
              - type: 'null'
    Body_Make_an_outbound_call_via_WhatsApp_v1_convai_whatsapp_outbound_call_post:
      type: object
      properties:
        whatsapp_phone_number_id:
          type: string
        whatsapp_user_id:
          type: string
        whatsapp_call_permission_request_template_name:
          type: string
        whatsapp_call_permission_request_template_language_code:
          type: string
        agent_id:
          type: string
        conversation_initiation_client_data:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationInitiationClientDataRequest-Input
            - type: 'null'
      required:
        - whatsapp_phone_number_id
        - whatsapp_user_id
        - whatsapp_call_permission_request_template_name
        - whatsapp_call_permission_request_template_language_code
        - agent_id
    WhatsAppOutboundCallResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        conversation_id:
          type:
            - string
            - 'null'
      required:
        - success
        - message
        - conversation_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.whatsapp.outboundCall({
        whatsappPhoneNumberId: "string",
        whatsappUserId: "string",
        whatsappCallPermissionRequestTemplateName: "string",
        whatsappCallPermissionRequestTemplateLanguageCode: "string",
        agentId: "string",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.whatsapp.outbound_call(
    whatsapp_phone_number_id="string",
    whatsapp_user_id="string",
    whatsapp_call_permission_request_template_name="string",
    whatsapp_call_permission_request_template_language_code="string",
    agent_id="string"
)

```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call"

	payload := strings.NewReader("{\n  \"whatsapp_phone_number_id\": \"string\",\n  \"whatsapp_user_id\": \"string\",\n  \"whatsapp_call_permission_request_template_name\": \"string\",\n  \"whatsapp_call_permission_request_template_language_code\": \"string\",\n  \"agent_id\": \"string\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("xi-api-key", "xi-api-key")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"whatsapp_phone_number_id\": \"string\",\n  \"whatsapp_user_id\": \"string\",\n  \"whatsapp_call_permission_request_template_name\": \"string\",\n  \"whatsapp_call_permission_request_template_language_code\": \"string\",\n  \"agent_id\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"whatsapp_phone_number_id\": \"string\",\n  \"whatsapp_user_id\": \"string\",\n  \"whatsapp_call_permission_request_template_name\": \"string\",\n  \"whatsapp_call_permission_request_template_language_code\": \"string\",\n  \"agent_id\": \"string\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call', [
  'body' => '{
  "whatsapp_phone_number_id": "string",
  "whatsapp_user_id": "string",
  "whatsapp_call_permission_request_template_name": "string",
  "whatsapp_call_permission_request_template_language_code": "string",
  "agent_id": "string"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"whatsapp_phone_number_id\": \"string\",\n  \"whatsapp_user_id\": \"string\",\n  \"whatsapp_call_permission_request_template_name\": \"string\",\n  \"whatsapp_call_permission_request_template_language_code\": \"string\",\n  \"agent_id\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "whatsapp_phone_number_id": "string",
  "whatsapp_user_id": "string",
  "whatsapp_call_permission_request_template_name": "string",
  "whatsapp_call_permission_request_template_language_code": "string",
  "agent_id": "string"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/whatsapp/outbound-call")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```