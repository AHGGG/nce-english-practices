# Single Text Request

POST https://api.deepgram.com/v1/speak
Content-Type: application/json

Convert text into natural-sounding speech using Deepgram's TTS REST API

Reference: https://developers.deepgram.com/reference/text-to-speech/speak-request

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Text to Speech transformation
  version: endpoint_speak/v1/audio.generate
paths:
  /v1/speak:
    post:
      operationId: generate
      summary: Text to Speech transformation
      description: Convert text into natural-sounding speech using Deepgram's TTS REST API
      tags:
        - - subpackage_speak
          - subpackage_speak/v1
          - subpackage_speak/v1/audio
      parameters:
        - name: callback
          in: query
          description: URL to which we'll make the callback request
          required: false
          schema:
            type: string
        - name: callback_method
          in: query
          description: HTTP method by which the callback request will be made
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersCallbackMethod'
        - name: mip_opt_out
          in: query
          description: >-
            Opts out requests from the Deepgram Model Improvement Program. Refer
            to our Docs for pricing impacts before setting this to true.
            https://dpgr.am/deepgram-mip
          required: false
          schema:
            type: boolean
            default: false
        - name: tag
          in: query
          description: >-
            Label your requests for the purpose of identification during usage
            reporting
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersTag'
        - name: bit_rate
          in: query
          description: >-
            The bitrate of the audio in bits per second. Choose from predefined
            ranges or specific values based on the encoding type.
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersBitRate'
        - name: container
          in: query
          description: >-
            Container specifies the file format wrapper for the output audio.
            The available options depend on the encoding type.
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersContainer'
        - name: encoding
          in: query
          description: >-
            Encoding allows you to specify the expected encoding of your audio
            output
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersEncoding'
        - name: model
          in: query
          description: AI model used to process submitted text
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersModel'
        - name: sample_rate
          in: query
          description: >-
            Sample Rate specifies the sample rate for the output audio. Based on
            the encoding, different sample rates are supported. For some
            encodings, the sample rate is not configurable
          required: false
          schema:
            $ref: '#/components/schemas/V1SpeakPostParametersSampleRate'
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful text-to-speech transformation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/speak_v1_audio_generate_Response_200'
        '400':
          description: Invalid Request
          content: {}
      requestBody:
        description: Transform text to speech
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SpeakV1Request'
components:
  schemas:
    V1SpeakPostParametersCallbackMethod:
      type: string
      enum:
        - value: POST
        - value: PUT
      default: POST
    V1SpeakPostParametersTag:
      oneOf:
        - type: string
        - type: array
          items:
            type: string
    V1SpeakPostParametersBitRate0:
      type: string
      enum:
        - value: '32000'
        - value: '48000'
    V1SpeakPostParametersBitRate:
      oneOf:
        - $ref: '#/components/schemas/V1SpeakPostParametersBitRate0'
        - type: number
          format: double
        - type: number
          format: double
    V1SpeakPostParametersContainer0:
      type: string
      enum:
        - value: none
    V1SpeakPostParametersContainer1:
      type: string
      enum:
        - value: wav
    V1SpeakPostParametersContainer2:
      type: string
      enum:
        - value: wav
    V1SpeakPostParametersContainer3:
      type: string
      enum:
        - value: wav
    V1SpeakPostParametersContainer4:
      type: string
      enum:
        - value: ogg
    V1SpeakPostParametersContainer:
      oneOf:
        - $ref: '#/components/schemas/V1SpeakPostParametersContainer0'
        - $ref: '#/components/schemas/V1SpeakPostParametersContainer1'
        - $ref: '#/components/schemas/V1SpeakPostParametersContainer2'
        - $ref: '#/components/schemas/V1SpeakPostParametersContainer3'
        - $ref: '#/components/schemas/V1SpeakPostParametersContainer4'
    V1SpeakPostParametersEncoding0:
      type: string
      enum:
        - value: linear16
    V1SpeakPostParametersEncoding1:
      type: string
      enum:
        - value: flac
    V1SpeakPostParametersEncoding2:
      type: string
      enum:
        - value: mulaw
    V1SpeakPostParametersEncoding3:
      type: string
      enum:
        - value: alaw
    V1SpeakPostParametersEncoding4:
      type: string
      enum:
        - value: mp3
    V1SpeakPostParametersEncoding5:
      type: string
      enum:
        - value: opus
    V1SpeakPostParametersEncoding6:
      type: string
      enum:
        - value: aac
    V1SpeakPostParametersEncoding:
      oneOf:
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding0'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding1'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding2'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding3'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding4'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding5'
        - $ref: '#/components/schemas/V1SpeakPostParametersEncoding6'
    V1SpeakPostParametersModel:
      type: string
      enum:
        - value: aura-asteria-en
        - value: aura-luna-en
        - value: aura-stella-en
        - value: aura-athena-en
        - value: aura-hera-en
        - value: aura-orion-en
        - value: aura-arcas-en
        - value: aura-perseus-en
        - value: aura-angus-en
        - value: aura-orpheus-en
        - value: aura-helios-en
        - value: aura-zeus-en
        - value: aura-2-amalthea-en
        - value: aura-2-andromeda-en
        - value: aura-2-apollo-en
        - value: aura-2-arcas-en
        - value: aura-2-aries-en
        - value: aura-2-asteria-en
        - value: aura-2-athena-en
        - value: aura-2-atlas-en
        - value: aura-2-aurora-en
        - value: aura-2-callista-en
        - value: aura-2-cordelia-en
        - value: aura-2-cora-en
        - value: aura-2-delia-en
        - value: aura-2-draco-en
        - value: aura-2-electra-en
        - value: aura-2-harmonia-en
        - value: aura-2-helena-en
        - value: aura-2-hera-en
        - value: aura-2-hermes-en
        - value: aura-2-hyperion-en
        - value: aura-2-iris-en
        - value: aura-2-janus-en
        - value: aura-2-juno-en
        - value: aura-2-jupiter-en
        - value: aura-2-luna-en
        - value: aura-2-mars-en
        - value: aura-2-minerva-en
        - value: aura-2-neptune-en
        - value: aura-2-odysseus-en
        - value: aura-2-ophelia-en
        - value: aura-2-orion-en
        - value: aura-2-orpheus-en
        - value: aura-2-pandora-en
        - value: aura-2-phoebe-en
        - value: aura-2-pluto-en
        - value: aura-2-saturn-en
        - value: aura-2-selene-en
        - value: aura-2-thalia-en
        - value: aura-2-theia-en
        - value: aura-2-vesta-en
        - value: aura-2-zeus-en
        - value: aura-2-sirio-es
        - value: aura-2-nestor-es
        - value: aura-2-carina-es
        - value: aura-2-celeste-es
        - value: aura-2-alvaro-es
        - value: aura-2-diana-es
        - value: aura-2-aquila-es
        - value: aura-2-selena-es
        - value: aura-2-estrella-es
        - value: aura-2-javier-es
      default: aura-asteria-en
    V1SpeakPostParametersSampleRate0:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
        - value: '24000'
        - value: '32000'
        - value: '48000'
    V1SpeakPostParametersSampleRate1:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
    V1SpeakPostParametersSampleRate2:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
    V1SpeakPostParametersSampleRate3:
      type: string
      enum:
        - value: '22050'
    V1SpeakPostParametersSampleRate4:
      type: string
      enum:
        - value: '48000'
    V1SpeakPostParametersSampleRate:
      oneOf:
        - $ref: '#/components/schemas/V1SpeakPostParametersSampleRate0'
        - $ref: '#/components/schemas/V1SpeakPostParametersSampleRate1'
        - $ref: '#/components/schemas/V1SpeakPostParametersSampleRate2'
        - $ref: '#/components/schemas/V1SpeakPostParametersSampleRate3'
        - $ref: '#/components/schemas/V1SpeakPostParametersSampleRate4'
    SpeakV1Request:
      type: object
      properties:
        text:
          type: string
          description: The text content to be converted to speech
      required:
        - text
    speak_v1_audio_generate_Response_200:
      type: object
      properties: {}

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/speak"

querystring = {"model":"aura-2-thalia-en"}

payload = { "text": "Hello, welcome to Deepgram!" }
headers = {
    "Authorization": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers, params=querystring)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/speak?model=aura-2-thalia-en';
const options = {
  method: 'POST',
  headers: {Authorization: '<apiKey>', 'Content-Type': 'application/json'},
  body: '{"text":"Hello, welcome to Deepgram!"}'
};

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
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en"

	payload := strings.NewReader("{\n  \"text\": \"Hello, welcome to Deepgram!\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "<apiKey>")
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

url = URI("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"text\": \"Hello, welcome to Deepgram!\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en")
  .header("Authorization", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"text\": \"Hello, welcome to Deepgram!\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.deepgram.com/v1/speak?model=aura-2-thalia-en', [
  'body' => '{
  "text": "Hello, welcome to Deepgram!"
}',
  'headers' => [
    'Authorization' => '<apiKey>',
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en");
var request = new RestRequest(Method.POST);
request.AddHeader("Authorization", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"text\": \"Hello, welcome to Deepgram!\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Authorization": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = ["text": "Hello, welcome to Deepgram!"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en")! as URL,
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