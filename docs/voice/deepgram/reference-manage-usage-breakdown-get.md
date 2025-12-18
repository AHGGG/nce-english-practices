# Get Project Usage Breakdown

GET https://api.deepgram.com/v1/projects/{project_id}/usage/breakdown

Retrieves the usage breakdown for a specific project, with various filter options by API feature or by groupings. Setting a feature (e.g. diarize) to true includes requests that used that feature, while false excludes requests that used it. Multiple true filters are combined with OR logic, while false filters use AND logic.

Reference: https://developers.deepgram.com/reference/manage/usage/breakdown/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Project Usage Breakdown
  version: endpoint_manage/v1/projects/usage/breakdown.get
paths:
  /v1/projects/{project_id}/usage/breakdown:
    get:
      operationId: get
      summary: Get Project Usage Breakdown
      description: >-
        Retrieves the usage breakdown for a specific project, with various
        filter options by API feature or by groupings. Setting a feature (e.g.
        diarize) to true includes requests that used that feature, while false
        excludes requests that used it. Multiple true filters are combined with
        OR logic, while false filters use AND logic.
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/projects
          - subpackage_manage/v1/projects/usage
          - subpackage_manage/v1/projects/usage/breakdown
      parameters:
        - name: project_id
          in: path
          required: true
          schema:
            type: string
        - name: start
          in: query
          description: >-
            Start date of the requested date range. Format accepted is
            YYYY-MM-DD
          required: false
          schema:
            type: string
            format: date
        - name: end
          in: query
          description: End date of the requested date range. Format accepted is YYYY-MM-DD
          required: false
          schema:
            type: string
            format: date
        - name: grouping
          in: query
          description: Common usage grouping parameters
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdUsageBreakdownGetParametersGrouping
        - name: accessor
          in: query
          description: Filter for requests where a specific accessor was used
          required: false
          schema:
            type: string
        - name: alternatives
          in: query
          description: Filter for requests where alternatives were used
          required: false
          schema:
            type: boolean
        - name: callback_method
          in: query
          description: Filter for requests where callback method was used
          required: false
          schema:
            type: boolean
        - name: callback
          in: query
          description: Filter for requests where callback was used
          required: false
          schema:
            type: boolean
        - name: channels
          in: query
          description: Filter for requests where channels were used
          required: false
          schema:
            type: boolean
        - name: custom_intent_mode
          in: query
          description: Filter for requests where custom intent mode was used
          required: false
          schema:
            type: boolean
        - name: custom_intent
          in: query
          description: Filter for requests where custom intent was used
          required: false
          schema:
            type: boolean
        - name: custom_topic_mode
          in: query
          description: Filter for requests where custom topic mode was used
          required: false
          schema:
            type: boolean
        - name: custom_topic
          in: query
          description: Filter for requests where custom topic was used
          required: false
          schema:
            type: boolean
        - name: deployment
          in: query
          description: Filter for requests where a specific deployment was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdUsageBreakdownGetParametersDeployment
        - name: detect_entities
          in: query
          description: Filter for requests where detect entities was used
          required: false
          schema:
            type: boolean
        - name: detect_language
          in: query
          description: Filter for requests where detect language was used
          required: false
          schema:
            type: boolean
        - name: diarize
          in: query
          description: Filter for requests where diarize was used
          required: false
          schema:
            type: boolean
        - name: dictation
          in: query
          description: Filter for requests where dictation was used
          required: false
          schema:
            type: boolean
        - name: encoding
          in: query
          description: Filter for requests where encoding was used
          required: false
          schema:
            type: boolean
        - name: endpoint
          in: query
          description: Filter for requests where a specific endpoint was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdUsageBreakdownGetParametersEndpoint
        - name: extra
          in: query
          description: Filter for requests where extra was used
          required: false
          schema:
            type: boolean
        - name: filler_words
          in: query
          description: Filter for requests where filler words was used
          required: false
          schema:
            type: boolean
        - name: intents
          in: query
          description: Filter for requests where intents was used
          required: false
          schema:
            type: boolean
        - name: keyterm
          in: query
          description: Filter for requests where keyterm was used
          required: false
          schema:
            type: boolean
        - name: keywords
          in: query
          description: Filter for requests where keywords was used
          required: false
          schema:
            type: boolean
        - name: language
          in: query
          description: Filter for requests where language was used
          required: false
          schema:
            type: boolean
        - name: measurements
          in: query
          description: Filter for requests where measurements were used
          required: false
          schema:
            type: boolean
        - name: method
          in: query
          description: Filter for requests where a specific method was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdUsageBreakdownGetParametersMethod
        - name: model
          in: query
          description: Filter for requests where a specific model uuid was used
          required: false
          schema:
            type: string
        - name: multichannel
          in: query
          description: Filter for requests where multichannel was used
          required: false
          schema:
            type: boolean
        - name: numerals
          in: query
          description: Filter for requests where numerals were used
          required: false
          schema:
            type: boolean
        - name: paragraphs
          in: query
          description: Filter for requests where paragraphs were used
          required: false
          schema:
            type: boolean
        - name: profanity_filter
          in: query
          description: Filter for requests where profanity filter was used
          required: false
          schema:
            type: boolean
        - name: punctuate
          in: query
          description: Filter for requests where punctuate was used
          required: false
          schema:
            type: boolean
        - name: redact
          in: query
          description: Filter for requests where redact was used
          required: false
          schema:
            type: boolean
        - name: replace
          in: query
          description: Filter for requests where replace was used
          required: false
          schema:
            type: boolean
        - name: sample_rate
          in: query
          description: Filter for requests where sample rate was used
          required: false
          schema:
            type: boolean
        - name: search
          in: query
          description: Filter for requests where search was used
          required: false
          schema:
            type: boolean
        - name: sentiment
          in: query
          description: Filter for requests where sentiment was used
          required: false
          schema:
            type: boolean
        - name: smart_format
          in: query
          description: Filter for requests where smart format was used
          required: false
          schema:
            type: boolean
        - name: summarize
          in: query
          description: Filter for requests where summarize was used
          required: false
          schema:
            type: boolean
        - name: tag
          in: query
          description: Filter for requests where a specific tag was used
          required: false
          schema:
            type: string
        - name: topics
          in: query
          description: Filter for requests where topics was used
          required: false
          schema:
            type: boolean
        - name: utt_split
          in: query
          description: Filter for requests where utt split was used
          required: false
          schema:
            type: boolean
        - name: utterances
          in: query
          description: Filter for requests where utterances was used
          required: false
          schema:
            type: boolean
        - name: version
          in: query
          description: Filter for requests where version was used
          required: false
          schema:
            type: boolean
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Usage breakdown response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageBreakdownV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    V1ProjectsProjectIdUsageBreakdownGetParametersGrouping:
      type: string
      enum:
        - value: accessor
        - value: endpoint
        - value: feature_set
        - value: models
        - value: method
        - value: tags
        - value: deployment
    V1ProjectsProjectIdUsageBreakdownGetParametersDeployment:
      type: string
      enum:
        - value: hosted
        - value: beta
        - value: self-hosted
    V1ProjectsProjectIdUsageBreakdownGetParametersEndpoint:
      type: string
      enum:
        - value: listen
        - value: read
        - value: speak
        - value: agent
    V1ProjectsProjectIdUsageBreakdownGetParametersMethod:
      type: string
      enum:
        - value: sync
        - value: async
        - value: streaming
    UsageBreakdownV1ResponseResolution:
      type: object
      properties:
        units:
          type: string
          description: Time unit for the resolution
        amount:
          type: number
          format: double
          description: Amount of units
      required:
        - units
        - amount
    UsageBreakdownV1ResponseResultsItemsGrouping:
      type: object
      properties:
        start:
          type: string
          format: date
          description: Start date for this group
        end:
          type: string
          format: date
          description: End date for this group
        accessor:
          type:
            - string
            - 'null'
          description: Optional accessor identifier
        endpoint:
          type:
            - string
            - 'null'
          description: Optional endpoint identifier
        feature_set:
          type:
            - string
            - 'null'
          description: Optional feature set identifier
        models:
          type:
            - string
            - 'null'
          description: Optional models identifier
        method:
          type:
            - string
            - 'null'
          description: Optional method identifier
        tags:
          type:
            - string
            - 'null'
          description: Optional tags
        deployment:
          type:
            - string
            - 'null'
          description: Optional deployment identifier
    UsageBreakdownV1ResponseResultsItems:
      type: object
      properties:
        hours:
          type: number
          format: double
          description: Audio hours processed
        total_hours:
          type: number
          format: double
          description: Total hours including all processing
        agent_hours:
          type: number
          format: double
          description: Agent hours used
        tokens_in:
          type: number
          format: double
          description: Number of input tokens
        tokens_out:
          type: number
          format: double
          description: Number of output tokens
        tts_characters:
          type: number
          format: double
          description: Number of text-to-speech characters processed
        requests:
          type: number
          format: double
          description: Number of requests
        grouping:
          $ref: '#/components/schemas/UsageBreakdownV1ResponseResultsItemsGrouping'
      required:
        - hours
        - total_hours
        - agent_hours
        - tokens_in
        - tokens_out
        - tts_characters
        - requests
        - grouping
    UsageBreakdownV1Response:
      type: object
      properties:
        start:
          type: string
          format: date
          description: Start date of the usage period
        end:
          type: string
          format: date
          description: End date of the usage period
        resolution:
          $ref: '#/components/schemas/UsageBreakdownV1ResponseResolution'
        results:
          type: array
          items:
            $ref: '#/components/schemas/UsageBreakdownV1ResponseResultsItems'
      required:
        - start
        - end
        - resolution
        - results

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/usage/breakdown"

querystring = {"accessor":"12345678-1234-1234-1234-123456789012","alternatives":"true","callback_method":"true","callback":"true","channels":"true","custom_intent_mode":"true","custom_intent":"true","custom_topic_mode":"true","custom_topic":"true","deployment":"hosted","detect_entities":"true","detect_language":"true","diarize":"true","dictation":"true","encoding":"true","endpoint":"listen","extra":"true","filler_words":"true","intents":"true","keyterm":"true","keywords":"true","language":"true","measurements":"true","method":"async","model":"6f548761-c9c0-429a-9315-11a1d28499c8","multichannel":"true","numerals":"true","paragraphs":"true","profanity_filter":"true","punctuate":"true","redact":"true","replace":"true","search":"true","sentiment":"true","smart_format":"true","summarize":"true","tag":"tag1","topics":"true","utt_split":"true","utterances":"true","version":"true"}

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true';
const options = {method: 'GET', headers: {Authorization: '<apiKey>'}};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("Authorization", "<apiKey>")

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

url = URI("https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/usage/breakdown?accessor=12345678-1234-1234-1234-123456789012&alternatives=true&callback_method=true&callback=true&channels=true&custom_intent_mode=true&custom_intent=true&custom_topic_mode=true&custom_topic=true&deployment=hosted&detect_entities=true&detect_language=true&diarize=true&dictation=true&encoding=true&endpoint=listen&extra=true&filler_words=true&intents=true&keyterm=true&keywords=true&language=true&measurements=true&method=async&model=6f548761-c9c0-429a-9315-11a1d28499c8&multichannel=true&numerals=true&paragraphs=true&profanity_filter=true&punctuate=true&redact=true&replace=true&search=true&sentiment=true&smart_format=true&summarize=true&tag=tag1&topics=true&utt_split=true&utterances=true&version=true")! as URL,
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