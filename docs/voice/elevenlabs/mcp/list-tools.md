# List MCP server tools

GET https://api.elevenlabs.io/v1/convai/mcp-servers/{mcp_server_id}/tools

Retrieve all tools available for a specific MCP server configuration.

Reference: https://elevenlabs.io/docs/api-reference/mcp/list-tools

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Mcp Server Tools
  version: endpoint_conversationalAi/mcpServers/tools.list
paths:
  /v1/convai/mcp-servers/{mcp_server_id}/tools:
    get:
      operationId: list
      summary: List Mcp Server Tools
      description: Retrieve all tools available for a specific MCP server configuration.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/mcpServers
          - subpackage_conversationalAi/mcpServers/tools
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
                $ref: '#/components/schemas/ListMCPToolsResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ToolInputSchema:
      type: object
      properties: {}
    ToolOutputSchema:
      type: object
      properties: {}
    ToolAnnotations:
      type: object
      properties:
        title:
          type:
            - string
            - 'null'
        readOnlyHint:
          type:
            - boolean
            - 'null'
        destructiveHint:
          type:
            - boolean
            - 'null'
        idempotentHint:
          type:
            - boolean
            - 'null'
        openWorldHint:
          type:
            - boolean
            - 'null'
    ToolMeta:
      type: object
      properties: {}
    Tool:
      type: object
      properties:
        name:
          type: string
        title:
          type:
            - string
            - 'null'
        description:
          type:
            - string
            - 'null'
        inputSchema:
          $ref: '#/components/schemas/ToolInputSchema'
        outputSchema:
          oneOf:
            - $ref: '#/components/schemas/ToolOutputSchema'
            - type: 'null'
        annotations:
          oneOf:
            - $ref: '#/components/schemas/ToolAnnotations'
            - type: 'null'
        _meta:
          oneOf:
            - $ref: '#/components/schemas/ToolMeta'
            - type: 'null'
      required:
        - name
        - inputSchema
    ListMCPToolsResponseModel:
      type: object
      properties:
        success:
          type: boolean
          description: Indicates if the operation was successful.
        tools:
          type: array
          items:
            $ref: '#/components/schemas/Tool'
          description: A list of tools available on the MCP server.
        error_message:
          type:
            - string
            - 'null'
          description: Error message if the operation was not successful.
      required:
        - success
        - tools

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.mcpServers.tools.list("mcp_server_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.mcp_servers.tools.list(
    mcp_server_id="mcp_server_id"
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

	url := "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools"

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

url = URI("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/mcp-servers/mcp_server_id/tools")! as URL,
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