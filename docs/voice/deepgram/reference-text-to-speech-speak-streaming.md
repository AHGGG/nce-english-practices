# Continuous Text Stream

GET /v1/speak

Convert text into natural-sounding speech using Deepgram's TTS WebSocket

Reference: https://developers.deepgram.com/reference/text-to-speech/speak-streaming

## AsyncAPI Specification

```yaml
asyncapi: 2.6.0
info:
  title: speak.v1
  version: subpackage_speak/v1.speak.v1
  description: Convert text into natural-sounding speech using Deepgram's TTS WebSocket
channels:
  /v1/speak:
    description: Convert text into natural-sounding speech using Deepgram's TTS WebSocket
    bindings:
      ws:
        query:
          type: object
          properties:
            encoding:
              $ref: '#/components/schemas/SpeakV1Encoding'
            mip_opt_out:
              $ref: '#/components/schemas/SpeakV1MipOptOut'
            model:
              $ref: '#/components/schemas/SpeakV1Model'
            sample_rate:
              $ref: '#/components/schemas/SpeakV1SampleRate'
        headers:
          type: object
          properties:
            Authorization:
              type: string
    publish:
      operationId: speak-v-1-publish
      summary: Server messages
      message:
        oneOf:
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-server-0-SpeakV1Audio
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-server-1-SpeakV1Metadata
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-server-2-SpeakV1Flushed
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-server-3-SpeakV1Cleared
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-server-4-SpeakV1Warning
    subscribe:
      operationId: speak-v-1-subscribe
      summary: Client messages
      message:
        oneOf:
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-client-0-SpeakV1Text
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-client-1-SpeakV1Flush
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-client-2-SpeakV1Clear
          - $ref: >-
              #/components/messages/subpackage_speak/v1.speak.v1-client-3-SpeakV1Close
servers:
  Production:
    url: wss://api.deepgram.com/
    protocol: wss
    x-default: true
  Agent:
    url: wss://api.deepgram.com/
    protocol: wss
components:
  messages:
    subpackage_speak/v1.speak.v1-server-0-SpeakV1Audio:
      name: SpeakV1Audio
      title: SpeakV1Audio
      description: Receive audio chunks as they are generated
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Audio'
    subpackage_speak/v1.speak.v1-server-1-SpeakV1Metadata:
      name: SpeakV1Metadata
      title: SpeakV1Metadata
      description: Receive metadata about the audio generation
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Metadata'
    subpackage_speak/v1.speak.v1-server-2-SpeakV1Flushed:
      name: SpeakV1Flushed
      title: SpeakV1Flushed
      description: Receive metadata about the audio generation
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Flushed'
    subpackage_speak/v1.speak.v1-server-3-SpeakV1Cleared:
      name: SpeakV1Cleared
      title: SpeakV1Cleared
      description: Receive metadata about the audio generation
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Cleared'
    subpackage_speak/v1.speak.v1-server-4-SpeakV1Warning:
      name: SpeakV1Warning
      title: SpeakV1Warning
      description: Receive a warning about the audio generation
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Warning'
    subpackage_speak/v1.speak.v1-client-0-SpeakV1Text:
      name: SpeakV1Text
      title: SpeakV1Text
      description: Text to convert to audio
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Text'
    subpackage_speak/v1.speak.v1-client-1-SpeakV1Flush:
      name: SpeakV1Flush
      title: SpeakV1Flush
      description: Flush the buffer and receive the final audio for text sent so far
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Flush'
    subpackage_speak/v1.speak.v1-client-2-SpeakV1Clear:
      name: SpeakV1Clear
      title: SpeakV1Clear
      description: >-
        Clear the buffer and start a new audio generation. Potentially
        destructive operation for any text in the buffer
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Clear'
    subpackage_speak/v1.speak.v1-client-3-SpeakV1Close:
      name: SpeakV1Close
      title: SpeakV1Close
      description: >-
        Flush the buffer and close the connection gracefully after all audio is
        generated
      payload:
        $ref: '#/components/schemas/SpeakV1_SpeakV1Close'
  schemas:
    SpeakV1Encoding:
      type: string
      enum:
        - value: linear16
        - value: mulaw
        - value: alaw
      default: linear16
    SpeakV1MipOptOut:
      description: Any type
    SpeakV1Model:
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
    SpeakV1SampleRate:
      type: string
      enum:
        - value: '8000'
        - value: '16000'
        - value: '24000'
        - value: '32000'
        - value: '48000'
      default: '24000'
    SpeakV1_SpeakV1Audio:
      type: string
      format: binary
    ChannelsSpeakV1MessagesSpeakV1MetadataType:
      type: string
      enum:
        - value: Metadata
    SpeakV1_SpeakV1Metadata:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1MetadataType'
          description: Message type identifier
        request_id:
          type: string
          format: uuid
          description: Unique identifier for the request
        model_name:
          type: string
          description: Name of the model being used
        model_version:
          type: string
          description: Version of the model being used
        model_uuid:
          type: string
          format: uuid
          description: Unique identifier for the model
      required:
        - type
        - request_id
        - model_name
        - model_version
        - model_uuid
    ChannelsSpeakV1MessagesSpeakV1FlushedType:
      type: string
      enum:
        - value: Flushed
        - value: Cleared
    SpeakV1_SpeakV1Flushed:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1FlushedType'
          description: Message type identifier
        sequence_id:
          type: number
          format: double
          description: The sequence ID of the response
      required:
        - type
        - sequence_id
    ChannelsSpeakV1MessagesSpeakV1ClearedType:
      type: string
      enum:
        - value: Flushed
        - value: Cleared
    SpeakV1_SpeakV1Cleared:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1ClearedType'
          description: Message type identifier
        sequence_id:
          type: number
          format: double
          description: The sequence ID of the response
      required:
        - type
        - sequence_id
    ChannelsSpeakV1MessagesSpeakV1WarningType:
      type: string
      enum:
        - value: Warning
    SpeakV1_SpeakV1Warning:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1WarningType'
          description: Message type identifier
        description:
          type: string
          description: A description of what went wrong
        code:
          type: string
          description: Error code identifying the type of error
      required:
        - type
        - description
        - code
    ChannelsSpeakV1MessagesSpeakV1TextType:
      type: string
      enum:
        - value: Speak
    SpeakV1_SpeakV1Text:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1TextType'
          description: Message type identifier
        text:
          type: string
          description: The input text to be converted to speech
      required:
        - type
        - text
    ChannelsSpeakV1MessagesSpeakV1FlushType:
      type: string
      enum:
        - value: Flush
        - value: Clear
        - value: Close
    SpeakV1_SpeakV1Flush:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1FlushType'
          description: Message type identifier
      required:
        - type
    ChannelsSpeakV1MessagesSpeakV1ClearType:
      type: string
      enum:
        - value: Flush
        - value: Clear
        - value: Close
    SpeakV1_SpeakV1Clear:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1ClearType'
          description: Message type identifier
      required:
        - type
    ChannelsSpeakV1MessagesSpeakV1CloseType:
      type: string
      enum:
        - value: Flush
        - value: Clear
        - value: Close
    SpeakV1_SpeakV1Close:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/ChannelsSpeakV1MessagesSpeakV1CloseType'
          description: Message type identifier
      required:
        - type

```