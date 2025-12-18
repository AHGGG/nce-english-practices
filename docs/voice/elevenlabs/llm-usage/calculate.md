# Calculate expected LLM usage

POST https://api.elevenlabs.io/v1/convai/llm-usage/calculate
Content-Type: application/json

Returns a list of LLM models and the expected cost for using them based on the provided values.

Reference: https://elevenlabs.io/docs/api-reference/llm-usage/calculate

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Calculate Expected Llm Usage
  version: endpoint_conversationalAi/llmUsage.calculate
paths:
  /v1/convai/llm-usage/calculate:
    post:
      operationId: calculate
      summary: Calculate Expected Llm Usage
      description: >-
        Returns a list of LLM models and the expected cost for using them based
        on the provided values.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/llmUsage
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
                $ref: '#/components/schemas/LLMUsageCalculatorResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LLMUsageCalculatorPublicRequestModel'
components:
  schemas:
    LLMUsageCalculatorPublicRequestModel:
      type: object
      properties:
        prompt_length:
          type: integer
          description: Length of the prompt in characters.
        number_of_pages:
          type: integer
          description: >-
            Pages of content in PDF documents or URLs in the agent's knowledge
            base.
        rag_enabled:
          type: boolean
          description: Whether RAG is enabled.
      required:
        - prompt_length
        - number_of_pages
        - rag_enabled
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
    LLMUsageCalculatorLLMResponseModel:
      type: object
      properties:
        llm:
          $ref: '#/components/schemas/LLM'
        price_per_minute:
          type: number
          format: double
      required:
        - llm
        - price_per_minute
    LLMUsageCalculatorResponseModel:
      type: object
      properties:
        llm_prices:
          type: array
          items:
            $ref: '#/components/schemas/LLMUsageCalculatorLLMResponseModel'
      required:
        - llm_prices

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.llmUsage.calculate({
        promptLength: 1,
        numberOfPages: 1,
        ragEnabled: true,
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.llm_usage.calculate(
    prompt_length=1,
    number_of_pages=1,
    rag_enabled=True
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

	url := "https://api.elevenlabs.io/v1/convai/llm-usage/calculate"

	payload := strings.NewReader("{\n  \"prompt_length\": 1,\n  \"number_of_pages\": 1,\n  \"rag_enabled\": true\n}")

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

url = URI("https://api.elevenlabs.io/v1/convai/llm-usage/calculate")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"prompt_length\": 1,\n  \"number_of_pages\": 1,\n  \"rag_enabled\": true\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/llm-usage/calculate")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"prompt_length\": 1,\n  \"number_of_pages\": 1,\n  \"rag_enabled\": true\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/llm-usage/calculate', [
  'body' => '{
  "prompt_length": 1,
  "number_of_pages": 1,
  "rag_enabled": true
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/llm-usage/calculate");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"prompt_length\": 1,\n  \"number_of_pages\": 1,\n  \"rag_enabled\": true\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "prompt_length": 1,
  "number_of_pages": 1,
  "rag_enabled": true
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/llm-usage/calculate")! as URL,
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