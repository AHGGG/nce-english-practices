# List workspace batch calling jobs

GET https://api.elevenlabs.io/v1/convai/batch-calling/workspace

Get all batch calls for the current workspace.

Reference: https://elevenlabs.io/docs/api-reference/batch-calling/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get All Batch Calls For A Workspace.
  version: endpoint_conversationalAi/batchCalls.list
paths:
  /v1/convai/batch-calling/workspace:
    get:
      operationId: list
      summary: Get All Batch Calls For A Workspace.
      description: Get all batch calls for the current workspace.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/batchCalls
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 100
        - name: last_doc
          in: query
          required: false
          schema:
            type:
              - string
              - 'null'
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
                $ref: '#/components/schemas/WorkspaceBatchCallsResponse'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    TelephonyProvider:
      type: string
      enum:
        - value: twilio
        - value: sip_trunk
    BatchCallWhatsAppParams:
      type: object
      properties:
        whatsapp_phone_number_id:
          type:
            - string
            - 'null'
        whatsapp_call_permission_request_template_name:
          type: string
        whatsapp_call_permission_request_template_language_code:
          type: string
      required:
        - whatsapp_call_permission_request_template_name
        - whatsapp_call_permission_request_template_language_code
    BatchCallStatus:
      type: string
      enum:
        - value: pending
        - value: in_progress
        - value: completed
        - value: failed
        - value: cancelled
    BatchCallResponse:
      type: object
      properties:
        id:
          type: string
        phone_number_id:
          type:
            - string
            - 'null'
        phone_provider:
          oneOf:
            - $ref: '#/components/schemas/TelephonyProvider'
            - type: 'null'
        whatsapp_params:
          oneOf:
            - $ref: '#/components/schemas/BatchCallWhatsAppParams'
            - type: 'null'
        name:
          type: string
        agent_id:
          type: string
        created_at_unix:
          type: integer
        scheduled_time_unix:
          type: integer
        total_calls_dispatched:
          type: integer
        total_calls_scheduled:
          type: integer
        last_updated_at_unix:
          type: integer
        status:
          $ref: '#/components/schemas/BatchCallStatus'
        retry_count:
          type: integer
          default: 0
        agent_name:
          type: string
      required:
        - id
        - name
        - agent_id
        - created_at_unix
        - scheduled_time_unix
        - total_calls_dispatched
        - total_calls_scheduled
        - last_updated_at_unix
        - status
        - agent_name
    WorkspaceBatchCallsResponse:
      type: object
      properties:
        batch_calls:
          type: array
          items:
            $ref: '#/components/schemas/BatchCallResponse'
        next_doc:
          type:
            - string
            - 'null'
          description: The next document, used to paginate through the batch calls
        has_more:
          type: boolean
          default: false
          description: Whether there are more batch calls to paginate through
      required:
        - batch_calls

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.batchCalls.list({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.batch_calls.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/batch-calling/workspace"

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

url = URI("https://api.elevenlabs.io/v1/convai/batch-calling/workspace")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/batch-calling/workspace")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/batch-calling/workspace', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/batch-calling/workspace");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/batch-calling/workspace")! as URL,
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