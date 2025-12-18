# Get history item

GET https://api.elevenlabs.io/v1/history/{history_item_id}

Retrieves a history item.

Reference: https://elevenlabs.io/docs/api-reference/history/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get history item
  version: endpoint_history.get
paths:
  /v1/history/{history_item_id}:
    get:
      operationId: get
      summary: Get history item
      description: Retrieves a history item.
      tags:
        - - subpackage_history
      parameters:
        - name: history_item_id
          in: path
          description: >-
            ID of the history item to be used. You can use the [Get generated
            items](/docs/api-reference/history/get-all) endpoint to retrieve a
            list of history items.
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
                $ref: '#/components/schemas/SpeechHistoryItemResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    SpeechHistoryItemResponseModelVoiceCategory:
      type: string
      enum:
        - value: premade
        - value: cloned
        - value: generated
        - value: professional
    SpeechHistoryItemResponseModelSettings:
      type: object
      properties: {}
    FeedbackResponseModel:
      type: object
      properties:
        thumbs_up:
          type: boolean
          description: Whether the user liked the generated item.
        feedback:
          type: string
          description: The feedback text provided by the user.
        emotions:
          type: boolean
          description: Whether the user provided emotions.
        inaccurate_clone:
          type: boolean
          description: Whether the user thinks the clone is inaccurate.
        glitches:
          type: boolean
          description: Whether the user thinks there are glitches in the audio.
        audio_quality:
          type: boolean
          description: Whether the user thinks the audio quality is good.
        other:
          type: boolean
          description: Whether the user provided other feedback.
        review_status:
          type: string
          default: not_reviewed
          description: The review status of the item. Defaults to 'not_reviewed'.
      required:
        - thumbs_up
        - feedback
        - emotions
        - inaccurate_clone
        - glitches
        - audio_quality
        - other
    SpeechHistoryItemResponseModelSource:
      type: string
      enum:
        - value: TTS
        - value: STS
        - value: Projects
        - value: PD
        - value: AN
        - value: Dubbing
        - value: PlayAPI
        - value: ConvAI
        - value: VoiceGeneration
    HistoryAlignmentResponseModel:
      type: object
      properties:
        characters:
          type: array
          items:
            type: string
          description: The characters in the alignment.
        character_start_times_seconds:
          type: array
          items:
            type: number
            format: double
          description: The start times of the characters in seconds.
        character_end_times_seconds:
          type: array
          items:
            type: number
            format: double
          description: The end times of the characters in seconds.
      required:
        - characters
        - character_start_times_seconds
        - character_end_times_seconds
    HistoryAlignmentsResponseModel:
      type: object
      properties:
        alignment:
          $ref: '#/components/schemas/HistoryAlignmentResponseModel'
          description: The alignment of the text.
        normalized_alignment:
          $ref: '#/components/schemas/HistoryAlignmentResponseModel'
          description: The normalized alignment of the text.
      required:
        - alignment
        - normalized_alignment
    DialogueInputResponseModel:
      type: object
      properties:
        text:
          type: string
          description: The text of the dialogue input line.
        voice_id:
          type: string
          description: The ID of the voice used for this dialogue input line.
        voice_name:
          type: string
          description: The name of the voice used for this dialogue input line.
      required:
        - text
        - voice_id
        - voice_name
    SpeechHistoryItemResponseModel:
      type: object
      properties:
        history_item_id:
          type: string
          description: The ID of the history item.
        request_id:
          type:
            - string
            - 'null'
          description: The ID of the request.
        voice_id:
          type:
            - string
            - 'null'
          description: The ID of the voice used.
        model_id:
          type:
            - string
            - 'null'
          description: The ID of the model.
        voice_name:
          type:
            - string
            - 'null'
          description: The name of the voice.
        voice_category:
          oneOf:
            - $ref: '#/components/schemas/SpeechHistoryItemResponseModelVoiceCategory'
            - type: 'null'
          description: >-
            The category of the voice. Either 'premade', 'cloned', 'generated'
            or 'professional'.
        text:
          type:
            - string
            - 'null'
          description: The text used to generate the audio item.
        date_unix:
          type: integer
          description: Unix timestamp of when the item was created.
        character_count_change_from:
          type: integer
          description: The character count change from.
        character_count_change_to:
          type: integer
          description: The character count change to.
        content_type:
          type: string
          description: The content type of the generated item.
        state:
          description: Any type
        settings:
          oneOf:
            - $ref: '#/components/schemas/SpeechHistoryItemResponseModelSettings'
            - type: 'null'
          description: The settings of the history item.
        feedback:
          oneOf:
            - $ref: '#/components/schemas/FeedbackResponseModel'
            - type: 'null'
          description: >-
            Feedback associated with the generated item. Returns null if no
            feedback has been provided.
        share_link_id:
          type:
            - string
            - 'null'
          description: The ID of the share link.
        source:
          oneOf:
            - $ref: '#/components/schemas/SpeechHistoryItemResponseModelSource'
            - type: 'null'
          description: >-
            The source of the history item. Either TTS (text to speech), STS
            (speech to text), AN (audio native), Projects, Dubbing, PlayAPI, PD
            (pronunciation dictionary) or ConvAI (Agents Platform).
        alignments:
          oneOf:
            - $ref: '#/components/schemas/HistoryAlignmentsResponseModel'
            - type: 'null'
          description: The alignments of the history item.
        dialogue:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/DialogueInputResponseModel'
          description: >-
            The dialogue (voice and text pairs) used to generate the audio item.
            If this is set then the top level `text` and `voice_id` fields will
            be empty.
      required:
        - history_item_id
        - date_unix
        - character_count_change_from
        - character_count_change_to
        - content_type
        - state

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.history.get("history_item_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.history.get(
    history_item_id="history_item_id"
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

	url := "https://api.elevenlabs.io/v1/history/history_item_id"

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

url = URI("https://api.elevenlabs.io/v1/history/history_item_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/history/history_item_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/history/history_item_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/history/history_item_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/history/history_item_id")! as URL,
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