# List conversations

GET https://api.elevenlabs.io/v1/convai/conversations

Get all conversations of agents that user owns. With option to restrict to a specific agent.

Reference: https://elevenlabs.io/docs/api-reference/conversations/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List conversations
  version: endpoint_conversationalAi/conversations.list
paths:
  /v1/convai/conversations:
    get:
      operationId: list
      summary: List conversations
      description: >-
        Get all conversations of agents that user owns. With option to restrict
        to a specific agent.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/conversations
      parameters:
        - name: cursor
          in: query
          description: Used for fetching next page. Cursor is returned in the response.
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: agent_id
          in: query
          description: The id of the agent you're taking the action on.
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: call_successful
          in: query
          description: The result of the success evaluation
          required: false
          schema:
            oneOf:
              - $ref: '#/components/schemas/EvaluationSuccessResult'
              - type: 'null'
        - name: call_start_before_unix
          in: query
          description: >-
            Unix timestamp (in seconds) to filter conversations up to this start
            date.
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: call_start_after_unix
          in: query
          description: >-
            Unix timestamp (in seconds) to filter conversations after to this
            start date.
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: call_duration_min_secs
          in: query
          description: Minimum call duration in seconds.
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: call_duration_max_secs
          in: query
          description: Maximum call duration in seconds.
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: rating_max
          in: query
          description: Maximum overall rating (1-5).
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: rating_min
          in: query
          description: Minimum overall rating (1-5).
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: has_feedback_comment
          in: query
          description: Filter conversations with user feedback comments.
          required: false
          schema:
            type:
              - boolean
              - 'null'
        - name: user_id
          in: query
          description: Filter conversations by the user ID who initiated them.
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: evaluation_params
          in: query
          description: >-
            Evaluation filters. Repeat param. Format: criteria_id:result.
            Example: eval=value_framing:success
          required: false
          schema:
            type:
              - array
              - 'null'
            items:
              type: string
        - name: data_collection_params
          in: query
          description: >-
            Data collection filters. Repeat param. Format: id:op:value where op
            is one of eq|neq|gt|gte|lt|lte|in|exists|missing. For in,
            pipe-delimit values.
          required: false
          schema:
            type:
              - array
              - 'null'
            items:
              type: string
        - name: tool_names
          in: query
          description: Filter conversations by tool names used during the call.
          required: false
          schema:
            type:
              - array
              - 'null'
            items:
              type: string
        - name: page_size
          in: query
          description: >-
            How many conversations to return at maximum. Can not exceed 100,
            defaults to 30.
          required: false
          schema:
            type: integer
            default: 30
        - name: summary_mode
          in: query
          description: Whether to include transcript summaries in the response.
          required: false
          schema:
            $ref: '#/components/schemas/V1ConvaiConversationsGetParametersSummaryMode'
        - name: search
          in: query
          description: Full-text or fuzzy search over transcript messages
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
                $ref: '#/components/schemas/GetConversationsPageResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    EvaluationSuccessResult:
      type: string
      enum:
        - value: success
        - value: failure
        - value: unknown
    V1ConvaiConversationsGetParametersSummaryMode:
      type: string
      enum:
        - value: exclude
        - value: include
      default: exclude
    ConversationSummaryResponseModelStatus:
      type: string
      enum:
        - value: initiated
        - value: in-progress
        - value: processing
        - value: done
        - value: failed
    ConversationSummaryResponseModelDirection:
      type: string
      enum:
        - value: inbound
        - value: outbound
    ConversationSummaryResponseModel:
      type: object
      properties:
        agent_id:
          type: string
        branch_id:
          type:
            - string
            - 'null'
        agent_name:
          type:
            - string
            - 'null'
        conversation_id:
          type: string
        start_time_unix_secs:
          type: integer
        call_duration_secs:
          type: integer
        message_count:
          type: integer
        status:
          $ref: '#/components/schemas/ConversationSummaryResponseModelStatus'
        call_successful:
          $ref: '#/components/schemas/EvaluationSuccessResult'
        transcript_summary:
          type:
            - string
            - 'null'
        call_summary_title:
          type:
            - string
            - 'null'
        direction:
          oneOf:
            - $ref: '#/components/schemas/ConversationSummaryResponseModelDirection'
            - type: 'null'
        rating:
          type:
            - number
            - 'null'
          format: double
      required:
        - agent_id
        - conversation_id
        - start_time_unix_secs
        - call_duration_secs
        - message_count
        - status
        - call_successful
    GetConversationsPageResponseModel:
      type: object
      properties:
        conversations:
          type: array
          items:
            $ref: '#/components/schemas/ConversationSummaryResponseModel'
        next_cursor:
          type:
            - string
            - 'null'
        has_more:
          type: boolean
      required:
        - conversations
        - has_more

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.conversations.list({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.conversations.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/conversations"

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

url = URI("https://api.elevenlabs.io/v1/convai/conversations")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/conversations")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/conversations', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/conversations");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/conversations")! as URL,
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