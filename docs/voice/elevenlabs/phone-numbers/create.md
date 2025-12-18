# Import phone number

POST https://api.elevenlabs.io/v1/convai/phone-numbers
Content-Type: application/json

Import Phone Number from provider configuration (Twilio or SIP trunk)

Reference: https://elevenlabs.io/docs/api-reference/phone-numbers/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Import Phone Number
  version: endpoint_conversationalAi/phoneNumbers.create
paths:
  /v1/convai/phone-numbers:
    post:
      operationId: create
      summary: Import Phone Number
      description: Import Phone Number from provider configuration (Twilio or SIP trunk)
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/phoneNumbers
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
                $ref: '#/components/schemas/CreatePhoneNumberResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/conversational_ai_phone_numbers_create_Request
components:
  schemas:
    TwilioRegionId:
      type: string
      enum:
        - value: us1
        - value: ie1
        - value: au1
    TwilioEdgeLocation:
      type: string
      enum:
        - value: ashburn
        - value: dublin
        - value: frankfurt
        - value: sao-paulo
        - value: singapore
        - value: sydney
        - value: tokyo
        - value: umatilla
        - value: roaming
    RegionConfigRequest:
      type: object
      properties:
        region_id:
          $ref: '#/components/schemas/TwilioRegionId'
          description: Region ID
        token:
          type: string
          description: Auth Token for this region
        edge_location:
          $ref: '#/components/schemas/TwilioEdgeLocation'
          description: Edge location for this region
      required:
        - region_id
        - token
        - edge_location
    CreateTwilioPhoneNumberRequest:
      type: object
      properties:
        phone_number:
          type: string
          description: Phone number
        label:
          type: string
          description: Label for the phone number
        supports_inbound:
          type: boolean
          default: true
          description: Whether this phone number supports inbound calls
        supports_outbound:
          type: boolean
          default: true
          description: Whether this phone number supports outbound calls
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: twilio
        sid:
          type: string
          description: Twilio Account SID
        token:
          type: string
          description: Twilio Auth Token
        region_config:
          oneOf:
            - $ref: '#/components/schemas/RegionConfigRequest'
            - type: 'null'
          description: Twilio Additional Region Configuration
      required:
        - phone_number
        - label
        - sid
        - token
    SIPMediaEncryptionEnum:
      type: string
      enum:
        - value: disabled
        - value: allowed
        - value: required
    SIPTrunkCredentialsRequestModel:
      type: object
      properties:
        username:
          type: string
          description: SIP trunk username
        password:
          type:
            - string
            - 'null'
          description: SIP trunk password - if not specified, then remain unchanged
      required:
        - username
    InboundSIPTrunkConfigRequestModel:
      type: object
      properties:
        allowed_addresses:
          type:
            - array
            - 'null'
          items:
            type: string
          description: >-
            List of IP addresses that are allowed to use the trunk. Each item in
            the list can be an individual IP address or a Classless Inter-Domain
            Routing notation representing a CIDR block.
        allowed_numbers:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of phone numbers that are allowed to use the trunk.
        media_encryption:
          $ref: '#/components/schemas/SIPMediaEncryptionEnum'
          description: Whether or not to encrypt media (data layer).
        credentials:
          oneOf:
            - $ref: '#/components/schemas/SIPTrunkCredentialsRequestModel'
            - type: 'null'
          description: Optional digest authentication credentials (username/password).
        remote_domains:
          type:
            - array
            - 'null'
          items:
            type: string
          description: Domains of remote SIP servers used to validate TLS certificates.
    SIPTrunkTransportEnum:
      type: string
      enum:
        - value: auto
        - value: udp
        - value: tcp
        - value: tls
    OutboundSIPTrunkConfigRequestModel:
      type: object
      properties:
        address:
          type: string
          description: Hostname or IP the SIP INVITE is sent to.
        transport:
          $ref: '#/components/schemas/SIPTrunkTransportEnum'
          description: Protocol to use for SIP transport (signalling layer).
        media_encryption:
          $ref: '#/components/schemas/SIPMediaEncryptionEnum'
          description: Whether or not to encrypt media (data layer).
        headers:
          type: object
          additionalProperties:
            type: string
          description: >-
            SIP X-* headers for INVITE request. These headers are sent as-is and
            may help identify this call.
        credentials:
          oneOf:
            - $ref: '#/components/schemas/SIPTrunkCredentialsRequestModel'
            - type: 'null'
          description: >-
            Optional digest authentication credentials (username/password). If
            not provided, ACL authentication is assumed.
      required:
        - address
    CreateSIPTrunkPhoneNumberRequestV2:
      type: object
      properties:
        phone_number:
          type: string
          description: Phone number
        label:
          type: string
          description: Label for the phone number
        supports_inbound:
          type: boolean
          default: true
          description: Whether this phone number supports inbound calls
        supports_outbound:
          type: boolean
          default: true
          description: Whether this phone number supports outbound calls
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: sip_trunk
        inbound_trunk_config:
          oneOf:
            - $ref: '#/components/schemas/InboundSIPTrunkConfigRequestModel'
            - type: 'null'
        outbound_trunk_config:
          oneOf:
            - $ref: '#/components/schemas/OutboundSIPTrunkConfigRequestModel'
            - type: 'null'
      required:
        - phone_number
        - label
    conversational_ai_phone_numbers_create_Request:
      oneOf:
        - $ref: '#/components/schemas/CreateTwilioPhoneNumberRequest'
        - $ref: '#/components/schemas/CreateSIPTrunkPhoneNumberRequestV2'
    CreatePhoneNumberResponseModel:
      type: object
      properties:
        phone_number_id:
          type: string
          description: Phone entity ID
      required:
        - phone_number_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.phoneNumbers.create();
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.phone_numbers.create(
    request=
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

	url := "https://api.elevenlabs.io/v1/convai/phone-numbers"

	payload := strings.NewReader("{\n  \"phone_number\": \"string\",\n  \"label\": \"string\",\n  \"sid\": \"string\",\n  \"token\": \"string\"\n}")

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

url = URI("https://api.elevenlabs.io/v1/convai/phone-numbers")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"phone_number\": \"string\",\n  \"label\": \"string\",\n  \"sid\": \"string\",\n  \"token\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/phone-numbers")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"phone_number\": \"string\",\n  \"label\": \"string\",\n  \"sid\": \"string\",\n  \"token\": \"string\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/phone-numbers', [
  'body' => '{
  "phone_number": "string",
  "label": "string",
  "sid": "string",
  "token": "string"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/phone-numbers");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"phone_number\": \"string\",\n  \"label\": \"string\",\n  \"sid\": \"string\",\n  \"token\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "phone_number": "string",
  "label": "string",
  "sid": "string",
  "token": "string"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/phone-numbers")! as URL,
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