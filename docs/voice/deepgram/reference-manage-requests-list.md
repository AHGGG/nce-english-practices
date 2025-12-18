# List Project Requests

GET https://api.deepgram.com/v1/projects/{project_id}/requests

Generates a list of requests for a specific project

Reference: https://developers.deepgram.com/reference/manage/requests/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Project Requests
  version: endpoint_manage/v1/projects/requests.list
paths:
  /v1/projects/{project_id}/requests:
    get:
      operationId: list
      summary: List Project Requests
      description: Generates a list of requests for a specific project
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/projects
          - subpackage_manage/v1/projects/requests
      parameters:
        - name: project_id
          in: path
          required: true
          schema:
            type: string
        - name: start
          in: query
          description: >-
            Start date of the requested date range. Formats accepted are
            YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, or YYYY-MM-DDTHH:MM:SS+HH:MM
          required: false
          schema:
            type: string
            format: date-time
        - name: end
          in: query
          description: >-
            End date of the requested date range. Formats accepted are
            YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, or YYYY-MM-DDTHH:MM:SS+HH:MM
          required: false
          schema:
            type: string
            format: date-time
        - name: limit
          in: query
          description: Number of results to return per page. Default 10. Range [1,1000]
          required: false
          schema:
            type: number
            format: double
            default: 10
        - name: page
          in: query
          description: >-
            Navigate and return the results to retrieve specific portions of
            information of the response
          required: false
          schema:
            type: number
            format: double
        - name: accessor
          in: query
          description: Filter for requests where a specific accessor was used
          required: false
          schema:
            type: string
        - name: request_id
          in: query
          description: Filter for a specific request id
          required: false
          schema:
            type: string
        - name: deployment
          in: query
          description: Filter for requests where a specific deployment was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdRequestsGetParametersDeployment
        - name: endpoint
          in: query
          description: Filter for requests where a specific endpoint was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdRequestsGetParametersEndpoint
        - name: method
          in: query
          description: Filter for requests where a specific method was used
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdRequestsGetParametersMethod
        - name: status
          in: query
          description: >-
            Filter for requests that succeeded (status code < 300) or failed
            (status code >=400)
          required: false
          schema:
            $ref: >-
              #/components/schemas/V1ProjectsProjectIdRequestsGetParametersStatus
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A list of requests for a specific project
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListProjectRequestsV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    V1ProjectsProjectIdRequestsGetParametersDeployment:
      type: string
      enum:
        - value: hosted
        - value: beta
        - value: self-hosted
    V1ProjectsProjectIdRequestsGetParametersEndpoint:
      type: string
      enum:
        - value: listen
        - value: read
        - value: speak
        - value: agent
    V1ProjectsProjectIdRequestsGetParametersMethod:
      type: string
      enum:
        - value: sync
        - value: async
        - value: streaming
    V1ProjectsProjectIdRequestsGetParametersStatus:
      type: string
      enum:
        - value: succeeded
        - value: failed
    ProjectRequestResponseResponse:
      type: object
      properties: {}
    ProjectRequestResponse:
      type: object
      properties:
        request_id:
          type: string
          description: The unique identifier of the request
        project_uuid:
          type: string
          description: The unique identifier of the project
        created:
          type: string
          format: date-time
          description: The date and time the request was created
        path:
          type: string
          description: The API path of the request
        api_key_id:
          type: string
          description: The unique identifier of the API key
        response:
          $ref: '#/components/schemas/ProjectRequestResponseResponse'
          description: The response of the request
        code:
          type: number
          format: double
          description: The response code of the request
        deployment:
          type: string
          description: The deployment type
        callback:
          type: string
          description: The callback URL for the request
    ListProjectRequestsV1Response:
      type: object
      properties:
        page:
          type: number
          format: double
          description: The page number of the paginated response
        limit:
          type: number
          format: double
          description: The number of results per page
        requests:
          type: array
          items:
            $ref: '#/components/schemas/ProjectRequestResponse'

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/requests"

querystring = {"accessor":"12345678-1234-1234-1234-123456789012","request_id":"12345678-1234-1234-1234-123456789012","deployment":"hosted","endpoint":"listen","method":"async","status":"succeeded"}

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded';
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

	url := "https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded"

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

url = URI("https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/requests?accessor=12345678-1234-1234-1234-123456789012&request_id=12345678-1234-1234-1234-123456789012&deployment=hosted&endpoint=listen&method=async&status=succeeded")! as URL,
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