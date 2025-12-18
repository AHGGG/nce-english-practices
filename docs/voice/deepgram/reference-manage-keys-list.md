# List Project Keys

GET https://api.deepgram.com/v1/projects/{project_id}/keys

Retrieves all API keys associated with the specified project

Reference: https://developers.deepgram.com/reference/manage/keys/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Project Keys
  version: endpoint_manage/v1/projects/keys.list
paths:
  /v1/projects/{project_id}/keys:
    get:
      operationId: list
      summary: List Project Keys
      description: Retrieves all API keys associated with the specified project
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/projects
          - subpackage_manage/v1/projects/keys
      parameters:
        - name: project_id
          in: path
          required: true
          schema:
            type: string
        - name: status
          in: query
          description: Only return keys with a specific status
          required: false
          schema:
            $ref: '#/components/schemas/V1ProjectsProjectIdKeysGetParametersStatus'
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A list of API keys
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListProjectKeysV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    V1ProjectsProjectIdKeysGetParametersStatus:
      type: string
      enum:
        - value: active
        - value: expired
    ListProjectKeysV1ResponseApiKeysItemsMember:
      type: object
      properties:
        member_id:
          type: string
        email:
          type: string
    ListProjectKeysV1ResponseApiKeysItemsApiKey:
      type: object
      properties:
        api_key_id:
          type: string
        comment:
          type: string
        scopes:
          type: array
          items:
            type: string
        created:
          type: string
          format: date-time
    ListProjectKeysV1ResponseApiKeysItems:
      type: object
      properties:
        member:
          $ref: '#/components/schemas/ListProjectKeysV1ResponseApiKeysItemsMember'
        api_key:
          $ref: '#/components/schemas/ListProjectKeysV1ResponseApiKeysItemsApiKey'
    ListProjectKeysV1Response:
      type: object
      properties:
        api_keys:
          type: array
          items:
            $ref: '#/components/schemas/ListProjectKeysV1ResponseApiKeysItems'

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/keys"

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/keys';
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

	url := "https://api.deepgram.com/v1/projects/project_id/keys"

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

url = URI("https://api.deepgram.com/v1/projects/project_id/keys")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/keys")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/keys', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/keys");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/keys")! as URL,
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