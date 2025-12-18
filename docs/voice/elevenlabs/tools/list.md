# List tools

GET https://api.elevenlabs.io/v1/convai/tools

Get all available tools in the workspace.

Reference: https://elevenlabs.io/docs/api-reference/tools/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Tools
  version: endpoint_conversationalAi/tools.list
paths:
  /v1/convai/tools:
    get:
      operationId: list
      summary: Get Tools
      description: Get all available tools in the workspace.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/tools
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
                $ref: '#/components/schemas/ToolsResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    DynamicVariableAssignment:
      type: object
      properties:
        source:
          type: string
          enum:
            - type: stringLiteral
              value: response
          description: >-
            The source to extract the value from. Currently only 'response' is
            supported.
        dynamic_variable:
          type: string
          description: The name of the dynamic variable to assign the extracted value to
        value_path:
          type: string
          description: >-
            Dot notation path to extract the value from the source (e.g.,
            'user.name' or 'data.0.id')
      required:
        - dynamic_variable
        - value_path
    ToolCallSoundType:
      type: string
      enum:
        - value: typing
        - value: elevator1
        - value: elevator2
        - value: elevator3
        - value: elevator4
    ToolCallSoundBehavior:
      type: string
      enum:
        - value: auto
        - value: always
    DynamicVariablesConfigDynamicVariablePlaceholders:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    DynamicVariablesConfig:
      type: object
      properties:
        dynamic_variable_placeholders:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/DynamicVariablesConfigDynamicVariablePlaceholders
          description: A dictionary of dynamic variable placeholders and their values
    ToolExecutionMode:
      type: string
      enum:
        - value: immediate
        - value: post_tool_speech
        - value: async
    ConvAISecretLocator:
      type: object
      properties:
        secret_id:
          type: string
      required:
        - secret_id
    ConvAIDynamicVariable:
      type: object
      properties:
        variable_name:
          type: string
      required:
        - variable_name
    WebhookToolApiSchemaConfigOutputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    WebhookToolApiSchemaConfigOutputMethod:
      type: string
      enum:
        - value: GET
        - value: POST
        - value: PUT
        - value: PATCH
        - value: DELETE
      default: GET
    LiteralJsonSchemaPropertyType:
      type: string
      enum:
        - value: boolean
        - value: string
        - value: integer
        - value: number
    LiteralJsonSchemaPropertyConstantValue:
      oneOf:
        - type: string
        - type: integer
        - type: number
          format: double
        - type: boolean
    LiteralJsonSchemaProperty:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyType'
        description:
          type: string
          default: ''
          description: The description of the property
        enum:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of allowed string values for string type parameters
        is_system_provided:
          type: boolean
          default: false
          description: >-
            If true, the value will be populated by the system at runtime. Used
            by Api Integration Webhook tools for templating.
        dynamic_variable:
          type: string
          default: ''
          description: The dynamic variable of the property
        constant_value:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyConstantValue'
          description: The constant value of the property
      required:
        - type
    QueryParamsJsonSchema:
      type: object
      properties:
        properties:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        required:
          type: array
          items:
            type: string
      required:
        - properties
    ArrayJsonSchemaPropertyOutputItems:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Output'
    ArrayJsonSchemaProperty-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: array
        description:
          type: string
          default: ''
        items:
          $ref: '#/components/schemas/ArrayJsonSchemaPropertyOutputItems'
      required:
        - items
    ObjectJsonSchemaPropertyOutput:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Output'
    ObjectJsonSchemaProperty-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: object
        required:
          type: array
          items:
            type: string
        description:
          type: string
          default: ''
        properties:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/ObjectJsonSchemaPropertyOutput'
    WebhookToolApiSchemaConfigOutputContentType:
      type: string
      enum:
        - value: application/json
        - value: application/x-www-form-urlencoded
      default: application/json
    AuthConnectionLocator:
      type: object
      properties:
        auth_connection_id:
          type: string
      required:
        - auth_connection_id
    WebhookToolApiSchemaConfig-Output:
      type: object
      properties:
        request_headers:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/WebhookToolApiSchemaConfigOutputRequestHeaders
          description: Headers that should be included in the request
        url:
          type: string
          description: >-
            The URL that the webhook will be sent to. May include path
            parameters, e.g. https://example.com/agents/{agent_id}
        method:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigOutputMethod'
          description: The HTTP method to use for the webhook
        path_params_schema:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
          description: >-
            Schema for path parameters, if any. The keys should match the
            placeholders in the URL.
        query_params_schema:
          oneOf:
            - $ref: '#/components/schemas/QueryParamsJsonSchema'
            - type: 'null'
          description: >-
            Schema for any query params, if any. These will be added to end of
            the URL as query params. Note: properties in a query param must all
            be literal types
        request_body_schema:
          oneOf:
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
            - type: 'null'
          description: >-
            Schema for the body parameters, if any. Used for POST/PATCH/PUT
            requests. The schema should be an object which will be sent as the
            json body
        content_type:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigOutputContentType'
          description: >-
            Content type for the request body. Only applies to POST/PUT/PATCH
            requests.
        auth_connection:
          oneOf:
            - $ref: '#/components/schemas/AuthConnectionLocator'
            - type: 'null'
          description: Optional auth connection to use for authentication with this webhook
      required:
        - url
    WebhookToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: webhook
          description: The type of tool
        name:
          type: string
        description:
          type: string
          description: Description of when the tool should be used and what it does.
        response_timeout_secs:
          type: integer
          default: 20
          description: >-
            The maximum time in seconds to wait for the tool call to complete.
            Must be between 5 and 120 seconds (inclusive).
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how the tool executes: 'immediate' executes the
            tool right away when requested by the LLM, 'post_tool_speech' waits
            for the agent to finish speaking before executing, 'async' runs the
            tool in the background without blocking - best for long-running
            operations.
        api_schema:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfig-Output'
          description: >-
            The schema for the outgoing webhoook, including parameters and URL
            specification
      required:
        - name
        - description
        - api_schema
    ClientToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client
          description: The type of tool
        name:
          type: string
        description:
          type: string
          description: Description of when the tool should be used and what it does.
        response_timeout_secs:
          type: integer
          default: 20
          description: >-
            The maximum time in seconds to wait for the tool call to complete.
            Must be between 1 and 120 seconds (inclusive).
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        parameters:
          oneOf:
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
            - type: 'null'
          description: Schema for any parameters to pass to the client
        expects_response:
          type: boolean
          default: false
          description: >-
            If true, calling this tool should block the conversation until the
            client responds with some response which is passed to the llm. If
            false then we will continue the conversation without waiting for the
            client to respond, this is useful to show content to a user but not
            block the conversation
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how the tool executes: 'immediate' executes the
            tool right away when requested by the LLM, 'post_tool_speech' waits
            for the agent to finish speaking before executing, 'async' runs the
            tool in the background without blocking - best for long-running
            operations.
      required:
        - name
        - description
    EndCallToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: end_call
    LanguageDetectionToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: language_detection
    AgentTransfer:
      type: object
      properties:
        agent_id:
          type: string
        condition:
          type: string
        delay_ms:
          type: integer
          default: 0
        transfer_message:
          type:
            - string
            - 'null'
        enable_transferred_agent_first_message:
          type: boolean
          default: false
      required:
        - agent_id
        - condition
    TransferToAgentToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent
        transfers:
          type: array
          items:
            $ref: '#/components/schemas/AgentTransfer'
      required:
        - transfers
    PhoneNumberTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone
        phone_number:
          type: string
      required:
        - phone_number
    SIPUriTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: sip_uri
        sip_uri:
          type: string
      required:
        - sip_uri
    PhoneNumberDynamicVariableTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone_dynamic_variable
        phone_number:
          type: string
      required:
        - phone_number
    SIPUriDynamicVariableTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: sip_uri_dynamic_variable
        sip_uri:
          type: string
      required:
        - sip_uri
    PhoneNumberTransferTransferDestination:
      oneOf:
        - $ref: '#/components/schemas/PhoneNumberTransferDestination'
        - $ref: '#/components/schemas/SIPUriTransferDestination'
        - $ref: '#/components/schemas/PhoneNumberDynamicVariableTransferDestination'
        - $ref: '#/components/schemas/SIPUriDynamicVariableTransferDestination'
    TransferTypeEnum:
      type: string
      enum:
        - value: conference
        - value: sip_refer
    PhoneNumberTransfer:
      type: object
      properties:
        transfer_destination:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberTransferTransferDestination'
            - type: 'null'
        phone_number:
          type:
            - string
            - 'null'
        condition:
          type: string
        transfer_type:
          $ref: '#/components/schemas/TransferTypeEnum'
      required:
        - condition
    TransferToNumberToolConfig-Output:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number
        transfers:
          type: array
          items:
            $ref: '#/components/schemas/PhoneNumberTransfer'
        enable_client_message:
          type: boolean
          default: true
          description: >-
            Whether to play a message to the client while they wait for
            transfer. Defaults to true for backward compatibility.
      required:
        - transfers
    SkipTurnToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: skip_turn
    PlayDTMFToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_keypad_touch_tone
        use_out_of_band_dtmf:
          type: boolean
          default: false
          description: >-
            If true, send DTMF tones out-of-band using RFC 4733 (useful for SIP
            calls only). If false, send DTMF as in-band audio tones (default,
            works for all call types).
    VoicemailDetectionToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: voicemail_detection
        voicemail_message:
          type:
            - string
            - 'null'
          description: >-
            Optional message to leave on voicemail when detected. If not
            provided, the call will end immediately when voicemail is detected.
            Supports dynamic variables (e.g., {{system__time}},
            {{system__call_duration_secs}}, {{custom_variable}}).
    SystemToolConfigOutputParams:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolConfig'
        - $ref: '#/components/schemas/LanguageDetectionToolConfig'
        - $ref: '#/components/schemas/TransferToAgentToolConfig'
        - $ref: '#/components/schemas/TransferToNumberToolConfig-Output'
        - $ref: '#/components/schemas/SkipTurnToolConfig'
        - $ref: '#/components/schemas/PlayDTMFToolConfig'
        - $ref: '#/components/schemas/VoicemailDetectionToolConfig'
    SystemToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: system
          description: The type of tool
        name:
          type: string
        description:
          type: string
          default: ''
          description: >-
            Description of when the tool should be used and what it does. Leave
            empty to use the default description that's optimized for the
            specific tool type.
        response_timeout_secs:
          type: integer
          default: 20
          description: The maximum time in seconds to wait for the tool call to complete.
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        params:
          $ref: '#/components/schemas/SystemToolConfigOutputParams'
      required:
        - name
        - params
    ToolResponseModelToolConfig:
      oneOf:
        - $ref: '#/components/schemas/WebhookToolConfig-Output'
        - $ref: '#/components/schemas/ClientToolConfig-Output'
        - $ref: '#/components/schemas/SystemToolConfig-Output'
    ResourceAccessInfoRole:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    ResourceAccessInfo:
      type: object
      properties:
        is_creator:
          type: boolean
          description: Whether the user making the request is the creator of the agent
        creator_name:
          type: string
          description: Name of the agent's creator
        creator_email:
          type: string
          description: Email of the agent's creator
        role:
          $ref: '#/components/schemas/ResourceAccessInfoRole'
          description: The role of the user making the request
      required:
        - is_creator
        - creator_name
        - creator_email
        - role
    ToolUsageStatsResponseModel:
      type: object
      properties:
        total_calls:
          type: integer
          default: 0
          description: The total number of calls to the tool
        avg_latency_secs:
          type: number
          format: double
      required:
        - avg_latency_secs
    ToolResponseModel:
      type: object
      properties:
        id:
          type: string
        tool_config:
          $ref: '#/components/schemas/ToolResponseModelToolConfig'
          description: The type of tool
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
        usage_stats:
          $ref: '#/components/schemas/ToolUsageStatsResponseModel'
      required:
        - id
        - tool_config
        - access_info
        - usage_stats
    ToolsResponseModel:
      type: object
      properties:
        tools:
          type: array
          items:
            $ref: '#/components/schemas/ToolResponseModel'
      required:
        - tools

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.tools.list();
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.tools.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/tools"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("xi-api-key", "xi-api-key")

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

url = URI("https://api.elevenlabs.io/v1/convai/tools")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/tools")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/tools', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/tools");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/tools")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

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