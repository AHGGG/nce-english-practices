# Update MCP server configuration

PATCH https://api.elevenlabs.io/v1/convai/mcp-servers/{mcp_server_id}
Content-Type: application/json

Update the configuration settings for an MCP server.

Reference: https://elevenlabs.io/docs/api-reference/mcp/update

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update Mcp Server Configuration
  version: endpoint_conversationalAi/mcpServers.update
paths:
  /v1/convai/mcp-servers/{mcp_server_id}:
    patch:
      operationId: update
      summary: Update Mcp Server Configuration
      description: Update the configuration settings for an MCP server.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/mcpServers
      parameters:
        - name: mcp_server_id
          in: path
          description: ID of the MCP Server.
          required: true
          schema:
            type: string
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
                $ref: '#/components/schemas/MCPServerResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MCPServerConfigUpdateRequestModel'
components:
  schemas:
    MCPApprovalPolicy:
      type: string
      enum:
        - value: auto_approve_all
        - value: require_approval_all
        - value: require_approval_per_tool
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
    McpServerConfigUpdateRequestModelRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    MCPServerConfigUpdateRequestModel:
      type: object
      properties:
        approval_policy:
          oneOf:
            - $ref: '#/components/schemas/MCPApprovalPolicy'
            - type: 'null'
          description: The approval mode to set for the MCP server
        force_pre_tool_speech:
          type:
            - boolean
            - 'null'
          description: >-
            If set, overrides the server's force_pre_tool_speech setting for
            this tool
        disable_interruptions:
          type:
            - boolean
            - 'null'
          description: >-
            If set, overrides the server's disable_interruptions setting for
            this tool
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution for
            all tools from this MCP server
        tool_call_sound_behavior:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundBehavior'
            - type: 'null'
          description: >-
            Determines when the tool call sound should play for all tools from
            this MCP server
        execution_mode:
          oneOf:
            - $ref: '#/components/schemas/ToolExecutionMode'
            - type: 'null'
          description: If set, overrides the server's execution_mode setting for this tool
        request_headers:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: >-
              #/components/schemas/McpServerConfigUpdateRequestModelRequestHeaders
          description: The headers to include in requests to the MCP server
    MCPToolApprovalPolicy:
      type: string
      enum:
        - value: auto_approved
        - value: requires_approval
    MCPToolApprovalHash:
      type: object
      properties:
        tool_name:
          type: string
          description: The name of the MCP tool
        tool_hash:
          type: string
          description: SHA256 hash of the tool's parameters and description
        approval_policy:
          $ref: '#/components/schemas/MCPToolApprovalPolicy'
          description: The approval policy for this tool
      required:
        - tool_name
        - tool_hash
    MCPServerTransport:
      type: string
      enum:
        - value: SSE
        - value: STREAMABLE_HTTP
    McpServerConfigOutputUrl:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
    ConvAIUserSecretDBModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        encrypted_value:
          type: string
        nonce:
          type: string
      required:
        - id
        - name
        - encrypted_value
        - nonce
    McpServerConfigOutputSecretToken:
      oneOf:
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIUserSecretDBModel'
    McpServerConfigOutputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
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
    MCPToolConfigOverride:
      type: object
      properties:
        tool_name:
          type: string
          description: The name of the MCP tool
        force_pre_tool_speech:
          type:
            - boolean
            - 'null'
          description: >-
            If set, overrides the server's force_pre_tool_speech setting for
            this tool
        disable_interruptions:
          type:
            - boolean
            - 'null'
          description: >-
            If set, overrides the server's disable_interruptions setting for
            this tool
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: If set, overrides the server's tool_call_sound setting for this tool
        tool_call_sound_behavior:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundBehavior'
            - type: 'null'
          description: >-
            If set, overrides the server's tool_call_sound_behavior setting for
            this tool
        execution_mode:
          oneOf:
            - $ref: '#/components/schemas/ToolExecutionMode'
            - type: 'null'
          description: If set, overrides the server's execution_mode setting for this tool
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: Dynamic variable assignments for this MCP tool
      required:
        - tool_name
    MCPServerConfig-Output:
      type: object
      properties:
        approval_policy:
          $ref: '#/components/schemas/MCPApprovalPolicy'
        tool_approval_hashes:
          type: array
          items:
            $ref: '#/components/schemas/MCPToolApprovalHash'
          description: >-
            List of tool approval hashes for per-tool approval when
            approval_policy is REQUIRE_APPROVAL_PER_TOOL
        transport:
          $ref: '#/components/schemas/MCPServerTransport'
          description: The transport type used to connect to the MCP server
        url:
          $ref: '#/components/schemas/McpServerConfigOutputUrl'
          description: >-
            The URL of the MCP server, if this contains a secret please store as
            a workspace secret, otherwise store as a plain string. Must use
            https
        secret_token:
          oneOf:
            - $ref: '#/components/schemas/McpServerConfigOutputSecretToken'
            - type: 'null'
          description: >-
            The secret token (Authorization header) stored as a workspace secret
            or in-place secret
        request_headers:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/McpServerConfigOutputRequestHeaders'
          description: The headers included in the request
        name:
          type: string
        description:
          type: string
          default: ''
        force_pre_tool_speech:
          type: boolean
          default: false
          description: >-
            If true, all tools from this MCP server will require pre-tool
            execution speech
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while any
            tool from this MCP server is running.
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution for
            all tools from this MCP server
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play for all tools from
            this MCP server
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how all tools from this MCP server execute:
            'immediate' executes the tool right away when requested by the LLM,
            'post_tool_speech' waits for the agent to finish speaking before
            executing, 'async' runs the tool in the background without blocking
            - best for long-running operations.
        tool_config_overrides:
          type: array
          items:
            $ref: '#/components/schemas/MCPToolConfigOverride'
          description: >-
            List of per-tool configuration overrides that override the
            server-level defaults for specific tools
      required:
        - url
        - name
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
    DependentAvailableAgentIdentifierAccessLevel:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    DependentAvailableAgentIdentifier:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: available
        created_at_unix_secs:
          type: integer
        access_level:
          $ref: '#/components/schemas/DependentAvailableAgentIdentifierAccessLevel'
      required:
        - id
        - name
        - created_at_unix_secs
        - access_level
    DependentUnknownAgentIdentifier:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: unknown
    McpServerResponseModelDependentAgentsItems:
      oneOf:
        - $ref: '#/components/schemas/DependentAvailableAgentIdentifier'
        - $ref: '#/components/schemas/DependentUnknownAgentIdentifier'
    MCPServerMetadataResponseModel:
      type: object
      properties:
        created_at:
          type: integer
        owner_user_id:
          type:
            - string
            - 'null'
      required:
        - created_at
    MCPServerResponseModel:
      type: object
      properties:
        id:
          type: string
        config:
          $ref: '#/components/schemas/MCPServerConfig-Output'
        access_info:
          oneOf:
            - $ref: '#/components/schemas/ResourceAccessInfo'
            - type: 'null'
          description: The access information of the MCP Server
        dependent_agents:
          type: array
          items:
            $ref: '#/components/schemas/McpServerResponseModelDependentAgentsItems'
          description: List of agents that depend on this MCP Server.
        metadata:
          $ref: '#/components/schemas/MCPServerMetadataResponseModel'
          description: The metadata of the MCP Server
      required:
        - id
        - config
        - metadata

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.mcpServers.update("mcp_server_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.mcp_servers.update(
    mcp_server_id="mcp_server_id"
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

	url := "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("PATCH", url, payload)

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

url = URI("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id");
var request = new RestRequest(Method.PATCH);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "PATCH"
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