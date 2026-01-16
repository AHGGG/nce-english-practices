# Get an Available Model

GET https://api.deepgram.com/v1/models/{model_id}

Returns metadata for a specific public model

Reference: https://developers.deepgram.com/reference/manage/models/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get a specific Model
  version: endpoint_manage/v1/models.get
paths:
  /v1/models/{model_id}:
    get:
      operationId: get
      summary: Get a specific Model
      description: Returns metadata for a specific public model
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/models
      parameters:
        - name: model_id
          in: path
          required: true
          schema:
            type: string
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A model object that can be either STT or TTS
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetModelV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    GetModelV1Response0:
      type: object
      properties:
        name:
          type: string
        canonical_name:
          type: string
        architecture:
          type: string
        languages:
          type: array
          items:
            type: string
        version:
          type: string
        uuid:
          type: string
          format: uuid
        batch:
          type: boolean
        streaming:
          type: boolean
        formatted_output:
          type: boolean
    GetModelV1ResponseOneOf1Metadata:
      type: object
      properties:
        accent:
          type: string
        age:
          type: string
        color:
          type: string
        image:
          type: string
          format: uri
        sample:
          type: string
          format: uri
        tags:
          type: array
          items:
            type: string
        use_cases:
          type: array
          items:
            type: string
    GetModelV1Response1:
      type: object
      properties:
        name:
          type: string
        canonical_name:
          type: string
        architecture:
          type: string
        languages:
          type: array
          items:
            type: string
        version:
          type: string
        uuid:
          type: string
          format: uuid
        metadata:
          $ref: '#/components/schemas/GetModelV1ResponseOneOf1Metadata'
    GetModelV1Response:
      oneOf:
        - $ref: '#/components/schemas/GetModelV1Response0'
        - $ref: '#/components/schemas/GetModelV1Response1'

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/models/model_id"

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/models/model_id';
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

	url := "https://api.deepgram.com/v1/models/model_id"

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

url = URI("https://api.deepgram.com/v1/models/model_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/models/model_id")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/models/model_id', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/models/model_id");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/models/model_id")! as URL,
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