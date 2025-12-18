# Get configuration override

GET https://api.elevenlabs.io/v1/convai/mcp-servers/{mcp_server_id}/tool-configs/{tool_name}

Retrieve configuration overrides for a specific MCP tool.

Reference: https://elevenlabs.io/docs/api-reference/mcp/tool-configuration/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Mcp Tool Configuration Override
  version: endpoint_conversationalAi/mcpServers/toolConfigs.get
paths:
  /v1/convai/mcp-servers/{mcp_server_id}/tool-configs/{tool_name}:
    get:
      operationId: get
      summary: Get Mcp Tool Configuration Override
      description: Retrieve configuration overrides for a specific MCP tool.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/mcpServers
          - subpackage_conversationalAi/mcpServers/toolConfigs
      parameters:
        - name: mcp_server_id
          in: path
          description: ID of the MCP Server.
          required: true
          schema:
            type: string
        - name: tool_name
          in: path
          description: Name of the MCP tool to retrieve config overrides for.
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
                $ref: '#/components/schemas/MCPToolConfigOverride'
        '404':
          description: Tool config override not found
          content: {}
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
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

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.mcpServers.toolConfigs.get("mcp_server_id", "tool_name");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.mcp_servers.tool_configs.get(
    mcp_server_id="mcp_server_id",
    tool_name="tool_name"
)

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name"

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

url = URI("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tool-configs/tool_name")! as URL,
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