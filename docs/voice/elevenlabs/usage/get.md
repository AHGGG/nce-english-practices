# Get character usage metrics

GET https://api.elevenlabs.io/v1/usage/character-stats

Returns the usage metrics for the current user or the entire workspace they are part of. The response provides a time axis based on the specified aggregation interval (default: day), with usage values for each interval along that axis. Usage is broken down by the selected breakdown type. For example, breakdown type "voice" will return the usage of each voice for each interval along the time axis.

Reference: https://elevenlabs.io/docs/api-reference/usage/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get character usage metrics
  version: endpoint_usage.get
paths:
  /v1/usage/character-stats:
    get:
      operationId: get
      summary: Get character usage metrics
      description: >-
        Returns the usage metrics for the current user or the entire workspace
        they are part of. The response provides a time axis based on the
        specified aggregation interval (default: day), with usage values for
        each interval along that axis. Usage is broken down by the selected
        breakdown type. For example, breakdown type "voice" will return the
        usage of each voice for each interval along the time axis.
      tags:
        - - subpackage_usage
      parameters:
        - name: start_unix
          in: query
          description: >-
            UTC Unix timestamp for the start of the usage window, in
            milliseconds. To include the first day of the window, the timestamp
            should be at 00:00:00 of that day.
          required: true
          schema:
            type: integer
        - name: end_unix
          in: query
          description: >-
            UTC Unix timestamp for the end of the usage window, in milliseconds.
            To include the last day of the window, the timestamp should be at
            23:59:59 of that day.
          required: true
          schema:
            type: integer
        - name: include_workspace_metrics
          in: query
          description: Whether or not to include the statistics of the entire workspace.
          required: false
          schema:
            type: boolean
            default: false
        - name: breakdown_type
          in: query
          description: >-
            How to break down the information. Cannot be "user" if
            include_workspace_metrics is False.
          required: false
          schema:
            $ref: '#/components/schemas/BreakdownTypes'
        - name: aggregation_interval
          in: query
          description: >-
            How to aggregate usage data over time. Can be "hour", "day", "week",
            "month", or "cumulative".
          required: false
          schema:
            $ref: '#/components/schemas/UsageAggregationInterval'
        - name: aggregation_bucket_size
          in: query
          description: >-
            Aggregation bucket size in seconds. Overrides the aggregation
            interval.
          required: false
          schema:
            type:
              - integer
              - 'null'
        - name: metric
          in: query
          description: Which metric to aggregate.
          required: false
          schema:
            $ref: '#/components/schemas/MetricType'
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
                $ref: '#/components/schemas/UsageCharactersResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    BreakdownTypes:
      type: string
      enum:
        - value: none
        - value: voice
        - value: voice_multiplier
        - value: user
        - value: groups
        - value: api_keys
        - value: all_api_keys
        - value: product_type
        - value: model
        - value: resource
        - value: request_queue
        - value: region
        - value: subresource_id
        - value: reporting_workspace_id
        - value: has_api_key
        - value: request_source
    UsageAggregationInterval:
      type: string
      enum:
        - value: hour
        - value: day
        - value: week
        - value: month
        - value: cumulative
    MetricType:
      type: string
      enum:
        - value: credits
        - value: tts_characters
        - value: minutes_used
        - value: request_count
        - value: ttfb_avg
        - value: ttfb_p95
        - value: fiat_units_spent
        - value: concurrency
        - value: concurrency_average
    UsageCharactersResponseModel:
      type: object
      properties:
        time:
          type: array
          items:
            type: integer
          description: The time axis with unix timestamps for each day.
        usage:
          type: object
          additionalProperties:
            type: array
            items:
              type: number
              format: double
          description: The usage of each breakdown type along the time axis.
      required:
        - time
        - usage

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.usage.get({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.usage.get(
    start_unix=,
    end_unix=
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

	url := "https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999"

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

url = URI("https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/usage/character-stats?start_unix=1685574000&end_unix=1688165999")! as URL,
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