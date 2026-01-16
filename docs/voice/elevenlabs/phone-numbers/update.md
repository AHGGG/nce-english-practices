# Update phone number

PATCH https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
Content-Type: application/json

Update assigned agent of a phone number

Reference: https://elevenlabs.io/docs/api-reference/phone-numbers/update

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update Phone Number
  version: endpoint_conversationalAi/phoneNumbers.update
paths:
  /v1/convai/phone-numbers/{phone_number_id}:
    patch:
      operationId: update
      summary: Update Phone Number
      description: Update assigned agent of a phone number
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/phoneNumbers
      parameters:
        - name: phone_number_id
          in: path
          description: The id of an agent. This is returned on agent creation.
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
                $ref: >-
                  #/components/schemas/conversational_ai_phone_numbers_update_Response_200
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePhoneNumberRequest'
components:
  schemas:
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
    LivekitStackType:
      type: string
      enum:
        - value: standard
        - value: static
    UpdatePhoneNumberRequest:
      type: object
      properties:
        agent_id:
          type:
            - string
            - 'null'
        inbound_trunk_config:
          oneOf:
            - $ref: '#/components/schemas/InboundSIPTrunkConfigRequestModel'
            - type: 'null'
        outbound_trunk_config:
          oneOf:
            - $ref: '#/components/schemas/OutboundSIPTrunkConfigRequestModel'
            - type: 'null'
        livekit_stack:
          oneOf:
            - $ref: '#/components/schemas/LivekitStackType'
            - type: 'null'
    PhoneNumberAgentInfo:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        agent_name:
          type: string
          description: The name of the agent
      required:
        - agent_id
        - agent_name
    GetPhoneNumberTwilioResponseModel:
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
        phone_number_id:
          type: string
          description: The ID of the phone number
        assigned_agent:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberAgentInfo'
            - type: 'null'
          description: The agent that is assigned to the phone number
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: twilio
          description: Phone provider
      required:
        - phone_number
        - label
        - phone_number_id
    GetPhoneNumberOutboundSIPTrunkConfigResponseModel:
      type: object
      properties:
        address:
          type: string
          description: Hostname or IP the SIP INVITE is sent to
        transport:
          $ref: '#/components/schemas/SIPTrunkTransportEnum'
          description: Protocol to use for SIP transport
        media_encryption:
          $ref: '#/components/schemas/SIPMediaEncryptionEnum'
          description: Whether or not to encrypt media (data layer).
        headers:
          type: object
          additionalProperties:
            type: string
          description: SIP headers for INVITE request
        has_auth_credentials:
          type: boolean
          description: Whether authentication credentials are configured
        username:
          type:
            - string
            - 'null'
          description: SIP trunk username (if available)
        has_outbound_trunk:
          type: boolean
          default: false
          description: Whether a LiveKit SIP outbound trunk is configured
      required:
        - address
        - transport
        - media_encryption
        - has_auth_credentials
    GetPhoneNumberInboundSIPTrunkConfigResponseModel:
      type: object
      properties:
        allowed_addresses:
          type: array
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
        has_auth_credentials:
          type: boolean
          description: Whether authentication credentials are configured
        username:
          type:
            - string
            - 'null'
          description: SIP trunk username (if available)
        remote_domains:
          type:
            - array
            - 'null'
          items:
            type: string
          description: Domains of remote SIP servers used to validate TLS certificates.
      required:
        - allowed_addresses
        - allowed_numbers
        - media_encryption
        - has_auth_credentials
    GetPhoneNumberSIPTrunkResponseModel:
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
        phone_number_id:
          type: string
          description: The ID of the phone number
        assigned_agent:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberAgentInfo'
            - type: 'null'
          description: The agent that is assigned to the phone number
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: sip_trunk
          description: Phone provider
        provider_config:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberOutboundSIPTrunkConfigResponseModel
            - type: 'null'
        outbound_trunk:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberOutboundSIPTrunkConfigResponseModel
            - type: 'null'
          description: Configuration of the Outbound SIP trunk - if configured.
        inbound_trunk:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberInboundSIPTrunkConfigResponseModel
            - type: 'null'
          description: Configuration of the Inbound SIP trunk - if configured.
        livekit_stack:
          $ref: '#/components/schemas/LivekitStackType'
          description: Type of Livekit stack used for this number.
      required:
        - phone_number
        - label
        - phone_number_id
        - livekit_stack
    conversational_ai_phone_numbers_update_Response_200:
      oneOf:
        - $ref: '#/components/schemas/GetPhoneNumberTwilioResponseModel'
        - $ref: '#/components/schemas/GetPhoneNumberSIPTrunkResponseModel'

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.phoneNumbers.update("phone_number_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.phone_numbers.update(
    phone_number_id="phone_number_id"
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

	url := "https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("PATCH", url, payload)

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

url = URI("https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id");
var request = new RestRequest(Method.PATCH);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/phone-numbers/phone_number_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "PATCH"
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